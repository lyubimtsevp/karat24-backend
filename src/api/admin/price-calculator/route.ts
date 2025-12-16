import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { getSheetRates, clearRatesCache } from "../../../utils/google-sheets"

/**
 * Локальные курсы металлов (₽ за грамм)
 * Используются как fallback если Google Sheets недоступен
 */
const LOCAL_METAL_RATES: Record<string, number> = {
    // Золото (базовая цена за грамм 999 пробы)
    "gold_999": 7500,
    "gold_958": 7200,
    "gold_916": 6900,
    "gold_875": 6600,
    "gold_750": 5700,
    "gold_585": 4500,
    "gold_583": 4450,
    "gold_500": 3800,
    "gold_375": 2900,
    "gold_333": 2600,

    // Серебро
    "silver_999": 95,
    "silver_960": 92,
    "silver_925": 89,
    "silver_875": 84,
    "silver_830": 80,
    "silver_800": 77,

    // Платина
    "platinum_950": 3200,
    "platinum_900": 3050,
    "platinum_850": 2900,
    "platinum_585": 2000,

    // Палладий
    "palladium_850": 3800,
    "palladium_500": 2300,
}

// Локальные наценки для камней (₽ за карат)
const LOCAL_GEMSTONE_RATES: Record<string, number> = {
    "diamond": 150000,
    "ruby": 80000,
    "sapphire": 60000,
    "emerald": 70000,
    "amethyst": 3000,
    "topaz": 5000,
    "pearl": 2000,
    "garnet": 4000,
    "aquamarine": 8000,
    "opal": 6000,
    "turquoise": 2500,
    "cubic_zirconia": 500,
    "meteorite": 10000, // за грамм
    "other": 1000,
}

// Наценки за работу
const WORK_COEFFICIENTS: Record<string, number> = {
    "ring": 1.3,
    "earrings": 1.4,
    "pendant": 1.2,
    "bracelet": 1.35,
    "chain": 1.25,
    "necklace": 1.4,
    "set": 1.5,
    "box": 1.1,
    "jewelry": 1.3,
    "gift": 1.2,
    "other": 1.2,
}

interface PriceRequest {
    metal_type: string
    metal_purity: string
    weight: number
    gemstone?: string
    gemstone_weight?: number
    product_type?: string
    margin?: number // % наценки
}

interface PriceResponse {
    metal_cost: number
    gemstone_cost: number
    work_cost: number
    base_price: number
    margin: number
    final_price: number
    breakdown: {
        metal_rate: number
        gemstone_rate: number
        work_coefficient: number
    }
    source: string // "google_sheets" или "local"
}

/**
 * Получить курс металла (из Google Sheets или локальный)
 */
async function getMetalRate(metalType: string, purity: string): Promise<{ rate: number; source: string }> {
    const localKey = `${metalType}_${purity}`
    
    try {
        const sheetRates = await getSheetRates()
        
        if (sheetRates.last_updated !== "local") {
            const sheetRate = sheetRates.metals.find(
                m => m.metal === metalType && m.purity === purity
            )
            if (sheetRate) {
                return { rate: sheetRate.price_per_gram, source: "google_sheets" }
            }
        }
    } catch (error) {
        console.warn("Ошибка получения курсов из Google Sheets, используем локальные:", error)
    }
    
    return { rate: LOCAL_METAL_RATES[localKey] || 0, source: "local" }
}

/**
 * Получить курс камня (из Google Sheets или локальный)
 */
async function getGemstoneRate(gemstone: string): Promise<{ rate: number; source: string }> {
    try {
        const sheetRates = await getSheetRates()
        
        if (sheetRates.last_updated !== "local") {
            const sheetRate = sheetRates.gemstones.find(
                g => g.name === gemstone.toLowerCase()
            )
            if (sheetRate) {
                return { rate: sheetRate.price_per_carat, source: "google_sheets" }
            }
        }
    } catch (error) {
        console.warn("Ошибка получения курсов камней из Google Sheets, используем локальные:", error)
    }
    
    return { rate: LOCAL_GEMSTONE_RATES[gemstone] || 0, source: "local" }
}

/**
 * POST /admin/price-calculator
 * Рассчитать цену товара по параметрам
 */
export async function POST(
    req: MedusaRequest,
    res: MedusaResponse
): Promise<void> {
    try {
        const body = req.body as PriceRequest

        const {
            metal_type,
            metal_purity,
            weight,
            gemstone,
            gemstone_weight = 0,
            product_type = "jewelry",
            margin = 50, // 50% наценка по умолчанию
        } = body

        // Валидация
        if (!metal_type || !metal_purity || !weight) {
            res.status(400).json({
                message: "Необходимо указать metal_type, metal_purity и weight",
            })
            return
        }

        // Получаем курс металла
        const { rate: metalRate, source: metalSource } = await getMetalRate(metal_type, metal_purity)

        if (metalRate === 0) {
            res.status(400).json({
                message: `Неизвестная комбинация металла: ${metal_type}_${metal_purity}`,
                available_metals: Object.keys(LOCAL_METAL_RATES),
            })
            return
        }

        // Стоимость металла
        const metalCost = weight * metalRate

        // Стоимость камня
        let gemstoneRate = 0
        let gemstoneSource = "local"
        if (gemstone) {
            const gemResult = await getGemstoneRate(gemstone)
            gemstoneRate = gemResult.rate
            gemstoneSource = gemResult.source
        }
        const gemstoneCost = gemstone_weight * gemstoneRate

        // Коэффициент работы
        const workCoefficient = WORK_COEFFICIENTS[product_type] || 1.2

        // Базовая цена (металл + камень) × работа
        const basePrice = (metalCost + gemstoneCost) * workCoefficient

        // Наценка
        const marginAmount = basePrice * (margin / 100)

        // Финальная цена
        const finalPrice = Math.round(basePrice + marginAmount)

        const response: PriceResponse = {
            metal_cost: Math.round(metalCost),
            gemstone_cost: Math.round(gemstoneCost),
            work_cost: Math.round((metalCost + gemstoneCost) * (workCoefficient - 1)),
            base_price: Math.round(basePrice),
            margin: Math.round(marginAmount),
            final_price: finalPrice,
            breakdown: {
                metal_rate: metalRate,
                gemstone_rate: gemstoneRate,
                work_coefficient: workCoefficient,
            },
            source: metalSource === "google_sheets" ? "google_sheets" : "local",
        }

        res.status(200).json(response)
    } catch (error) {
        console.error("Price calculation error:", error)
        res.status(500).json({
            message: "Ошибка расчёта цены",
            error: error instanceof Error ? error.message : "Неизвестная ошибка",
        })
    }
}

/**
 * GET /admin/price-calculator
 * Получить текущие курсы металлов (из Google Sheets если настроено)
 */
export async function GET(
    req: MedusaRequest,
    res: MedusaResponse
): Promise<void> {
    try {
        const sheetRates = await getSheetRates()
        
        // Преобразуем массив в объект для удобства
        const metalRates: Record<string, number> = {}
        const gemstoneRates: Record<string, number> = {}
        
        if (sheetRates.last_updated !== "local") {
            for (const m of sheetRates.metals) {
                metalRates[`${m.metal}_${m.purity}`] = m.price_per_gram
            }
            for (const g of sheetRates.gemstones) {
                gemstoneRates[g.name] = g.price_per_carat
            }
        }
        
        res.status(200).json({
            metal_rates: Object.keys(metalRates).length > 0 ? metalRates : LOCAL_METAL_RATES,
            gemstone_rates: Object.keys(gemstoneRates).length > 0 ? gemstoneRates : LOCAL_GEMSTONE_RATES,
            work_coefficients: WORK_COEFFICIENTS,
            source: sheetRates.last_updated !== "local" ? "google_sheets" : "local",
            updated_at: sheetRates.last_updated || new Date().toISOString(),
            config: {
                sheets_id_configured: !!process.env.GOOGLE_SHEETS_ID,
                instruction: "Для работы с Google Sheets установите GOOGLE_SHEETS_ID в переменных окружения",
            },
        })
    } catch (error) {
        console.error("Error fetching rates:", error)
        res.status(200).json({
            metal_rates: LOCAL_METAL_RATES,
            gemstone_rates: LOCAL_GEMSTONE_RATES,
            work_coefficients: WORK_COEFFICIENTS,
            source: "local",
            updated_at: new Date().toISOString(),
            error: "Не удалось загрузить курсы из Google Sheets",
        })
    }
}

/**
 * DELETE /admin/price-calculator
 * Сбросить кэш курсов
 */
export async function DELETE(
    req: MedusaRequest,
    res: MedusaResponse
): Promise<void> {
    clearRatesCache()
    res.status(200).json({
        message: "Кэш курсов сброшен",
    })
}
