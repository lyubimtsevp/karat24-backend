import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"

// Префиксы категорий для артикула
const CATEGORY_PREFIXES: Record<string, string> = {
  ring: "RING",
  rings: "RING",
  earrings: "EAR",
  pendant: "PEND",
  pendants: "PEND",
  bracelet: "BRAC",
  bracelets: "BRAC",
  chain: "CHAIN",
  chains: "CHAIN",
  necklace: "NECK",
  necklaces: "NECK",
  set: "SET",
  sets: "SET",
  box: "BOX",
  boxes: "BOX",
  gift: "GIFT",
  gifts: "GIFT",
  jewelry: "JEW",
  // Русские названия
  кольца: "RING",
  кольцо: "RING",
  серьги: "EAR",
  подвески: "PEND",
  подвеска: "PEND",
  браслеты: "BRAC",
  браслет: "BRAC",
  цепочки: "CHAIN",
  цепочка: "CHAIN",
  колье: "NECK",
  комплекты: "SET",
  комплект: "SET",
  шкатулки: "BOX",
  шкатулка: "BOX",
  подарки: "GIFT",
  подарок: "GIFT",
}

/**
 * GET /admin/generate-sku
 * Генерирует уникальный артикул для товара
 * 
 * Query params:
 * - category: название категории (опционально)
 * - product_type: тип товара (опционально)
 */
export async function GET(
  req: MedusaRequest,
  res: MedusaResponse
): Promise<void> {
  try {
    const productService = req.scope.resolve(Modules.PRODUCT)
    
    const category = (req.query.category as string)?.toLowerCase() || ""
    const productType = (req.query.product_type as string)?.toLowerCase() || ""
    
    // Определяем префикс
    let prefix = "K24" // По умолчанию КАРАТ 24
    
    if (category && CATEGORY_PREFIXES[category]) {
      prefix = CATEGORY_PREFIXES[category]
    } else if (productType && CATEGORY_PREFIXES[productType]) {
      prefix = CATEGORY_PREFIXES[productType]
    }
    
    // Получаем все товары чтобы найти максимальный номер
    const { products } = await productService.listProducts(
      {},
      { select: ["id", "metadata"], take: 10000 }
    )
    
    // Ищем максимальный номер для данного префикса
    let maxNumber = 0
    
    for (const product of products) {
      const sku = (product.metadata?.sku_custom as string) || ""
      
      if (sku.startsWith(prefix + "-")) {
        const numPart = sku.replace(prefix + "-", "")
        const num = parseInt(numPart, 10)
        
        if (!isNaN(num) && num > maxNumber) {
          maxNumber = num
        }
      }
    }
    
    // Генерируем новый артикул
    const nextNumber = maxNumber + 1
    const paddedNumber = nextNumber.toString().padStart(4, "0")
    const generatedSku = `${prefix}-${paddedNumber}`
    
    res.status(200).json({
      sku: generatedSku,
      prefix,
      number: nextNumber,
      total_in_category: maxNumber,
    })
  } catch (error) {
    console.error("SKU generation error:", error)
    res.status(500).json({
      message: "Ошибка генерации артикула",
      error: error instanceof Error ? error.message : "Неизвестная ошибка",
    })
  }
}

