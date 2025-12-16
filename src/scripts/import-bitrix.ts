/**
 * Скрипт импорта данных из Битрикс в Medusa
 * 
 * Использование:
 * 1. Положите JSON файлы экспорта в папку ./bitrix-export/
 * 2. Запустите: npx medusa exec ./src/scripts/import-bitrix.ts
 */

import { ExecArgs } from "@medusajs/framework/types"
import { Modules, ContainerRegistrationKeys } from "@medusajs/framework/utils"
import * as fs from "fs"
import * as path from "path"

// Типы данных из Битрикс
interface BitrixProduct {
  id: number
  name: string
  code: string
  active: boolean
  sort: number
  section_id: number
  preview_text: string
  detail_text: string
  price: number
  currency: string
  quantity: number
  weight: number
  images: number[]
  properties: Record<string, string | string[]>
  xml_id: string
  created_at: string
  updated_at: string
}

interface BitrixCategory {
  id: number
  name: string
  code: string
  parent_id: number | null
  description: string
  picture: number | null
  sort: number
  active: boolean
  depth: number
}

interface BitrixFile {
  id: number
  path: string
  original_name: string
  content_type: string
  size: number
  width: number
  height: number
}

interface BitrixReview {
  id: number
  title: string
  text: string
  active: boolean
  created_at: string
  properties: Record<string, string>
}

// Путь к папке с экспортом
const EXPORT_DIR = path.join(process.cwd(), "bitrix-export")

// Загрузка JSON файла
function loadJson<T>(filename: string): T[] {
  const filepath = path.join(EXPORT_DIR, filename)
  if (!fs.existsSync(filepath)) {
    console.log(`⚠️ Файл не найден: ${filename}`)
    return []
  }
  const data = fs.readFileSync(filepath, "utf-8")
  return JSON.parse(data)
}

// Генерация handle из названия
function generateHandle(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-zа-яё0-9]+/gi, "-")
    .replace(/^-+|-+$/g, "")
    .substring(0, 100)
}

// Маппинг свойств Битрикс на метаданные Medusa
function mapBitrixProperties(props: Record<string, string | string[]>): Record<string, string> {
  const metadata: Record<string, string> = {}
  
  // Стандартные свойства ювелирки
  const propMapping: Record<string, string> = {
    "METAL": "metal_type",
    "PROBA": "metal_purity",
    "COLOR": "metal_color",
    "VSTAVKA": "gemstone",
    "KARAT": "gemstone_weight",
    "POKRYTIE": "coating",
    "VES": "average_weight",
    "RAZMER": "available_sizes",
    "ARTICUL": "sku_custom",
    "VIDEO": "video_url",
  }
  
  for (const [bitrixKey, medusaKey] of Object.entries(propMapping)) {
    if (props[bitrixKey]) {
      const value = props[bitrixKey]
      metadata[medusaKey] = Array.isArray(value) ? value.join(",") : value
    }
  }
  
  return metadata
}

export default async function importBitrix({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  
  logger.info("🚀 Начало импорта из Битрикс")
  
  // Проверяем наличие папки с экспортом
  if (!fs.existsSync(EXPORT_DIR)) {
    logger.error(`❌ Папка с экспортом не найдена: ${EXPORT_DIR}`)
    logger.info("Создайте папку и положите туда JSON файлы экспорта из Битрикс")
    return
  }
  
  // Загружаем данные
  const products = loadJson<BitrixProduct>("products.json")
  const categories = loadJson<BitrixCategory>("categories.json")
  const files = loadJson<BitrixFile>("files_map.json")
  const reviews = loadJson<BitrixReview>("reviews.json")
  
  logger.info(`📦 Загружено: ${products.length} товаров, ${categories.length} категорий, ${files.length} файлов`)
  
  // Создаём карту файлов для быстрого доступа
  const filesMap = new Map(files.map(f => [f.id, f]))
  
  // Получаем сервисы Medusa
  const productService = container.resolve(Modules.PRODUCT)
  const pricingService = container.resolve(Modules.PRICING)
  const regionService = container.resolve(Modules.REGION)
  
  // Получаем регион и валюту
  const regions = await regionService.listRegions()
  const region = regions.find(r => r.currency_code === "rub") || regions[0]
  
  if (!region) {
    logger.error("❌ Не найден регион. Создайте регион с валютой RUB в админке.")
    return
  }
  
  logger.info(`🌍 Используем регион: ${region.name} (${region.currency_code})`)
  
  // Статистика
  const stats = {
    categoriesCreated: 0,
    productsCreated: 0,
    productsSkipped: 0,
    errors: 0,
  }
  
  // 1. Импорт категорий
  logger.info("\n📁 Импорт категорий...")
  const categoryMap = new Map<number, string>() // bitrix_id -> medusa_id
  
  // Сортируем по глубине для правильного порядка создания
  const sortedCategories = [...categories].sort((a, b) => a.depth - b.depth)
  
  for (const cat of sortedCategories) {
    if (!cat.active) continue
    
    try {
      const handle = cat.code || generateHandle(cat.name)
      
      // Проверяем, существует ли категория
      const existing = await productService.listProductCategories({
        handle: [handle],
      })
      
      if (existing.length > 0) {
        categoryMap.set(cat.id, existing[0].id)
        logger.info(`  ⏭️ Категория уже существует: ${cat.name}`)
        continue
      }
      
      // Определяем родительскую категорию
      let parentId: string | undefined
      if (cat.parent_id && categoryMap.has(cat.parent_id)) {
        parentId = categoryMap.get(cat.parent_id)
      }
      
      // Создаём категорию
      const created = await productService.createProductCategories([{
        name: cat.name,
        handle,
        description: cat.description || undefined,
        is_active: true,
        is_internal: false,
        rank: cat.sort,
        parent_category_id: parentId,
        metadata: {
          bitrix_id: cat.id.toString(),
        },
      }])
      
      categoryMap.set(cat.id, created[0].id)
      stats.categoriesCreated++
      logger.info(`  ✅ Создана категория: ${cat.name}`)
      
    } catch (error) {
      stats.errors++
      logger.error(`  ❌ Ошибка при создании категории ${cat.name}: ${error}`)
    }
  }
  
  // 2. Импорт товаров
  logger.info("\n📦 Импорт товаров...")
  
  for (const product of products) {
    if (!product.active) {
      stats.productsSkipped++
      continue
    }
    
    try {
      const handle = product.code || generateHandle(product.name)
      
      // Проверяем, существует ли товар
      const existing = await productService.listProducts({
        handle: [handle],
      })
      
      if (existing.length > 0) {
        logger.info(`  ⏭️ Товар уже существует: ${product.name}`)
        stats.productsSkipped++
        continue
      }
      
      // Получаем URL изображений
      const imageUrls: string[] = []
      for (const imageId of product.images) {
        const file = filesMap.get(imageId)
        if (file) {
          // Здесь нужно заменить на реальный URL старого сайта или S3
          imageUrls.push(`https://24-karat.ru${file.path}`)
        }
      }
      
      // Маппим свойства
      const metadata = mapBitrixProperties(product.properties)
      metadata.bitrix_id = product.id.toString()
      
      // Определяем категорию
      const categoryIds: string[] = []
      if (product.section_id && categoryMap.has(product.section_id)) {
        categoryIds.push(categoryMap.get(product.section_id)!)
      }
      
      // Создаём товар
      const created = await productService.createProducts([{
        title: product.name,
        handle,
        description: product.detail_text || product.preview_text || undefined,
        subtitle: product.preview_text?.substring(0, 200) || undefined,
        status: "published",
        is_giftcard: false,
        discountable: true,
        weight: product.weight || undefined,
        metadata,
        categories: categoryIds.map(id => ({ id })),
        images: imageUrls.map(url => ({ url })),
        options: [
          {
            title: "Вариант",
            values: ["По умолчанию"],
          },
        ],
        variants: [
          {
            title: "По умолчанию",
            sku: product.xml_id || `BX-${product.id}`,
            manage_inventory: true,
            inventory_quantity: product.quantity || 0,
            options: {
              "Вариант": "По умолчанию",
            },
          },
        ],
      }])
      
      // Устанавливаем цену
      if (product.price > 0) {
        const createdProduct = created[0]
        const variant = createdProduct.variants?.[0]
        
        if (variant) {
          await pricingService.createPriceLists([{
            title: `Import Price - ${createdProduct.title}`,
            description: "Imported from Bitrix",
            status: "active",
            type: "sale",
            prices: [
              {
                variant_id: variant.id,
                amount: product.price * 100, // Medusa хранит в копейках
                currency_code: "rub",
                min_quantity: 1,
              },
            ],
          }])
        }
      }
      
      stats.productsCreated++
      logger.info(`  ✅ Создан товар: ${product.name} (${product.price} ₽)`)
      
    } catch (error) {
      stats.errors++
      logger.error(`  ❌ Ошибка при создании товара ${product.name}: ${error}`)
    }
  }
  
  // Итоги
  logger.info("\n" + "=".repeat(50))
  logger.info("📊 ИТОГИ ИМПОРТА:")
  logger.info(`   Категорий создано: ${stats.categoriesCreated}`)
  logger.info(`   Товаров создано: ${stats.productsCreated}`)
  logger.info(`   Товаров пропущено: ${stats.productsSkipped}`)
  logger.info(`   Ошибок: ${stats.errors}`)
  logger.info("=".repeat(50))
  
  if (stats.errors > 0) {
    logger.warn("⚠️ Были ошибки при импорте. Проверьте логи выше.")
  } else {
    logger.info("✅ Импорт завершён успешно!")
  }
}

