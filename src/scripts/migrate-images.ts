/**
 * Скрипт миграции изображений из Битрикс в S3
 * 
 * - Скачивает изображения со старого сайта
 * - Конвертирует в WebP
 * - Загружает в S3
 * - Обновляет URL в товарах Medusa
 * 
 * Использование:
 * npx medusa exec ./src/scripts/migrate-images.ts
 */

import { ExecArgs } from "@medusajs/framework/types"
import { Modules, ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3"
import sharp from "sharp"
import * as fs from "fs"
import * as path from "path"

// Конфигурация
const OLD_SITE_URL = "https://24-karat.ru"
const S3_BUCKET = process.env.S3_BUCKET || "e52e01db-34753286-a744-4ecf-acd1-5303dbd3c54f"
const S3_FILE_URL = process.env.S3_FILE_URL || "https://s3.twcstorage.ru/" + S3_BUCKET

// S3 клиент
const s3Client = new S3Client({
  region: process.env.S3_REGION || "ru-1",
  endpoint: process.env.S3_ENDPOINT || "https://s3.twcstorage.ru",
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY_ID!,
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY!,
  },
  forcePathStyle: true,
})

// Путь к папке с экспортом
const EXPORT_DIR = path.join(process.cwd(), "bitrix-export")

interface BitrixFile {
  id: number
  path: string
  original_name: string
  content_type: string
}

// Загрузка JSON
function loadJson<T>(filename: string): T[] {
  const filepath = path.join(EXPORT_DIR, filename)
  if (!fs.existsSync(filepath)) {
    return []
  }
  return JSON.parse(fs.readFileSync(filepath, "utf-8"))
}

// Скачивание файла
async function downloadFile(url: string): Promise<Buffer | null> {
  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; MigrationBot/1.0)",
      },
    })
    
    if (!response.ok) {
      return null
    }
    
    return Buffer.from(await response.arrayBuffer())
  } catch (error) {
    return null
  }
}

// Конвертация в WebP
async function convertToWebP(buffer: Buffer): Promise<Buffer> {
  return sharp(buffer)
    .webp({ quality: 85 })
    .toBuffer()
}

// Загрузка в S3
async function uploadToS3(buffer: Buffer, key: string, contentType: string): Promise<string> {
  await s3Client.send(new PutObjectCommand({
    Bucket: S3_BUCKET,
    Key: key,
    Body: buffer,
    ContentType: contentType,
  }))
  
  return `${S3_FILE_URL}/${key}`
}

// Генерация ключа для S3
function generateS3Key(originalPath: string, isWebP: boolean): string {
  const basename = path.basename(originalPath, path.extname(originalPath))
  const ext = isWebP ? ".webp" : path.extname(originalPath)
  const timestamp = Date.now()
  return `products/${timestamp}-${basename}${ext}`
}

export default async function migrateImages({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  
  logger.info("🖼️ Начало миграции изображений")
  
  // Проверяем S3 креды
  if (!process.env.S3_ACCESS_KEY_ID || !process.env.S3_SECRET_ACCESS_KEY) {
    logger.error("❌ S3 credentials not configured!")
    return
  }
  
  // Загружаем карту файлов
  const files = loadJson<BitrixFile>("files_map.json")
  
  if (files.length === 0) {
    logger.error("❌ files_map.json не найден или пуст")
    return
  }
  
  logger.info(`📁 Найдено ${files.length} файлов для миграции`)
  
  // Получаем сервис продуктов
  const productService = container.resolve(Modules.PRODUCT)
  
  // Создаём карту старых URL -> новых URL
  const urlMap = new Map<string, string>()
  
  // Статистика
  const stats = {
    downloaded: 0,
    converted: 0,
    uploaded: 0,
    skipped: 0,
    errors: 0,
  }
  
  // Обрабатываем файлы пачками
  const BATCH_SIZE = 10
  
  for (let i = 0; i < files.length; i += BATCH_SIZE) {
    const batch = files.slice(i, i + BATCH_SIZE)
    
    await Promise.all(batch.map(async (file) => {
      const oldUrl = `${OLD_SITE_URL}${file.path}`
      
      try {
        // Проверяем, не обработан ли уже
        if (urlMap.has(oldUrl)) {
          stats.skipped++
          return
        }
        
        // Пропускаем не-изображения
        if (!file.content_type?.startsWith("image/")) {
          stats.skipped++
          return
        }
        
        // Скачиваем
        const buffer = await downloadFile(oldUrl)
        if (!buffer) {
          logger.warn(`  ⚠️ Не удалось скачать: ${file.path}`)
          stats.errors++
          return
        }
        stats.downloaded++
        
        // Конвертируем в WebP (если не GIF и не SVG)
        let processedBuffer = buffer
        let isWebP = false
        
        if (!file.content_type.includes("gif") && !file.content_type.includes("svg")) {
          processedBuffer = await convertToWebP(buffer)
          isWebP = true
          stats.converted++
        }
        
        // Загружаем в S3
        const s3Key = generateS3Key(file.path, isWebP)
        const newUrl = await uploadToS3(
          processedBuffer, 
          s3Key, 
          isWebP ? "image/webp" : file.content_type
        )
        stats.uploaded++
        
        // Сохраняем маппинг
        urlMap.set(oldUrl, newUrl)
        
        // Показываем прогресс
        const compressionRatio = isWebP 
          ? Math.round((1 - processedBuffer.length / buffer.length) * 100)
          : 0
        
        logger.info(`  ✅ ${file.original_name} -> ${s3Key} ${isWebP ? `(-${compressionRatio}%)` : ""}`)
        
      } catch (error) {
        stats.errors++
        logger.error(`  ❌ Ошибка: ${file.path} - ${error}`)
      }
    }))
    
    // Пауза между батчами
    await new Promise(resolve => setTimeout(resolve, 500))
    
    // Прогресс
    const progress = Math.min(i + BATCH_SIZE, files.length)
    logger.info(`📊 Прогресс: ${progress}/${files.length} (${Math.round(progress / files.length * 100)}%)`)
  }
  
  // Сохраняем маппинг URL для последующего использования
  const mappingPath = path.join(EXPORT_DIR, "url_mapping.json")
  fs.writeFileSync(
    mappingPath, 
    JSON.stringify(Object.fromEntries(urlMap), null, 2)
  )
  logger.info(`💾 Маппинг URL сохранён: ${mappingPath}`)
  
  // Обновляем URL в товарах Medusa
  logger.info("\n🔄 Обновление URL в товарах...")
  
  const products = await productService.listProducts({}, { relations: ["images"] })
  let updatedProducts = 0
  
  for (const product of products) {
    if (!product.images || product.images.length === 0) continue
    
    const updatedImages = product.images.map(img => {
      const newUrl = urlMap.get(img.url)
      return newUrl ? { url: newUrl } : { url: img.url }
    })
    
    // Проверяем, есть ли изменения
    const hasChanges = product.images.some((img, idx) => 
      img.url !== updatedImages[idx].url
    )
    
    if (hasChanges) {
      await productService.updateProducts([{
        id: product.id,
        images: updatedImages,
      }])
      updatedProducts++
    }
  }
  
  logger.info(`  ✅ Обновлено товаров: ${updatedProducts}`)
  
  // Итоги
  logger.info("\n" + "=".repeat(50))
  logger.info("📊 ИТОГИ МИГРАЦИИ ИЗОБРАЖЕНИЙ:")
  logger.info(`   Скачано: ${stats.downloaded}`)
  logger.info(`   Конвертировано в WebP: ${stats.converted}`)
  logger.info(`   Загружено в S3: ${stats.uploaded}`)
  logger.info(`   Пропущено: ${stats.skipped}`)
  logger.info(`   Ошибок: ${stats.errors}`)
  logger.info(`   Товаров обновлено: ${updatedProducts}`)
  logger.info("=".repeat(50))
}

