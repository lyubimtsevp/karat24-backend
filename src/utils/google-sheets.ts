/**
 * Утилита для работы с Google Sheets
 * 
 * Для работы необходимо:
 * 1. Создать Service Account в Google Cloud Console
 * 2. Сохранить credentials.json
 * 3. Поделиться таблицей с email Service Account
 * 4. Установить переменные окружения:
 *    - GOOGLE_SHEETS_ID: ID таблицы из URL
 *    - GOOGLE_SERVICE_ACCOUNT_EMAIL: email из credentials
 *    - GOOGLE_PRIVATE_KEY: private_key из credentials
 */

interface MetalRate {
  metal: string
  purity: string
  price_per_gram: number
  currency: string
  updated_at: string
}

interface GemstoneRate {
  name: string
  price_per_carat: number
  currency: string
  updated_at: string
}

interface SheetRates {
  metals: MetalRate[]
  gemstones: GemstoneRate[]
  last_updated: string
}

// Кэш курсов (обновляется каждые 5 минут)
let cachedRates: SheetRates | null = null
let cacheTimestamp = 0
const CACHE_TTL = 5 * 60 * 1000 // 5 минут

/**
 * Получить курсы металлов и камней из Google Sheets
 */
export async function getSheetRates(): Promise<SheetRates> {
  // Проверяем кэш
  if (cachedRates && Date.now() - cacheTimestamp < CACHE_TTL) {
    return cachedRates
  }

  const sheetId = process.env.GOOGLE_SHEETS_ID
  
  if (!sheetId) {
    console.warn("GOOGLE_SHEETS_ID не установлен, используем локальные курсы")
    return getDefaultRates()
  }

  try {
    // Публичный доступ к таблице через CSV export
    // Формат URL: https://docs.google.com/spreadsheets/d/{SHEET_ID}/gviz/tq?tqx=out:csv&sheet={SHEET_NAME}
    
    // Получаем курсы металлов
    const metalsUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&sheet=Metals`
    const metalsResponse = await fetch(metalsUrl)
    
    if (!metalsResponse.ok) {
      throw new Error(`Ошибка загрузки курсов металлов: ${metalsResponse.status}`)
    }
    
    const metalsCSV = await metalsResponse.text()
    const metals = parseMetalsCSV(metalsCSV)
    
    // Получаем курсы камней
    const gemstonesUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&sheet=Gemstones`
    const gemstonesResponse = await fetch(gemstonesUrl)
    
    let gemstones: GemstoneRate[] = []
    if (gemstonesResponse.ok) {
      const gemstonesCSV = await gemstonesResponse.text()
      gemstones = parseGemstonesCSV(gemstonesCSV)
    }
    
    cachedRates = {
      metals,
      gemstones,
      last_updated: new Date().toISOString(),
    }
    cacheTimestamp = Date.now()
    
    return cachedRates
  } catch (error) {
    console.error("Ошибка загрузки курсов из Google Sheets:", error)
    return getDefaultRates()
  }
}

/**
 * Парсинг CSV с курсами металлов
 * Ожидаемый формат: Металл, Проба, Цена за грамм, Валюта
 */
function parseMetalsCSV(csv: string): MetalRate[] {
  const lines = csv.trim().split("\n")
  const metals: MetalRate[] = []
  
  // Пропускаем заголовок
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i]
    const values = parseCSVLine(line)
    
    if (values.length >= 3) {
      metals.push({
        metal: values[0]?.toLowerCase() || "",
        purity: values[1] || "",
        price_per_gram: parseFloat(values[2]) || 0,
        currency: values[3] || "RUB",
        updated_at: new Date().toISOString(),
      })
    }
  }
  
  return metals
}

/**
 * Парсинг CSV с курсами камней
 * Ожидаемый формат: Название, Цена за карат, Валюта
 */
function parseGemstonesCSV(csv: string): GemstoneRate[] {
  const lines = csv.trim().split("\n")
  const gemstones: GemstoneRate[] = []
  
  // Пропускаем заголовок
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i]
    const values = parseCSVLine(line)
    
    if (values.length >= 2) {
      gemstones.push({
        name: values[0]?.toLowerCase() || "",
        price_per_carat: parseFloat(values[1]) || 0,
        currency: values[2] || "RUB",
        updated_at: new Date().toISOString(),
      })
    }
  }
  
  return gemstones
}

/**
 * Парсинг строки CSV с учётом кавычек
 */
function parseCSVLine(line: string): string[] {
  const result: string[] = []
  let current = ""
  let inQuotes = false
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    
    if (char === '"') {
      inQuotes = !inQuotes
    } else if (char === "," && !inQuotes) {
      result.push(current.trim())
      current = ""
    } else {
      current += char
    }
  }
  
  result.push(current.trim())
  return result
}

/**
 * Курсы по умолчанию (локальные)
 */
function getDefaultRates(): SheetRates {
  return {
    metals: [
      { metal: "gold", purity: "999", price_per_gram: 7500, currency: "RUB", updated_at: "" },
      { metal: "gold", purity: "958", price_per_gram: 7200, currency: "RUB", updated_at: "" },
      { metal: "gold", purity: "750", price_per_gram: 5700, currency: "RUB", updated_at: "" },
      { metal: "gold", purity: "585", price_per_gram: 4500, currency: "RUB", updated_at: "" },
      { metal: "gold", purity: "375", price_per_gram: 2900, currency: "RUB", updated_at: "" },
      { metal: "silver", purity: "999", price_per_gram: 95, currency: "RUB", updated_at: "" },
      { metal: "silver", purity: "925", price_per_gram: 89, currency: "RUB", updated_at: "" },
      { metal: "platinum", purity: "950", price_per_gram: 3200, currency: "RUB", updated_at: "" },
      { metal: "palladium", purity: "850", price_per_gram: 3800, currency: "RUB", updated_at: "" },
    ],
    gemstones: [
      { name: "diamond", price_per_carat: 150000, currency: "RUB", updated_at: "" },
      { name: "ruby", price_per_carat: 80000, currency: "RUB", updated_at: "" },
      { name: "sapphire", price_per_carat: 60000, currency: "RUB", updated_at: "" },
      { name: "emerald", price_per_carat: 70000, currency: "RUB", updated_at: "" },
      { name: "amethyst", price_per_carat: 3000, currency: "RUB", updated_at: "" },
    ],
    last_updated: "local",
  }
}

/**
 * Получить курс металла
 */
export async function getMetalRate(metal: string, purity: string): Promise<number> {
  const rates = await getSheetRates()
  const rate = rates.metals.find(
    r => r.metal === metal.toLowerCase() && r.purity === purity
  )
  return rate?.price_per_gram || 0
}

/**
 * Получить курс камня
 */
export async function getGemstoneRate(name: string): Promise<number> {
  const rates = await getSheetRates()
  const rate = rates.gemstones.find(r => r.name === name.toLowerCase())
  return rate?.price_per_carat || 0
}

/**
 * Сбросить кэш
 */
export function clearRatesCache(): void {
  cachedRates = null
  cacheTimestamp = 0
}

