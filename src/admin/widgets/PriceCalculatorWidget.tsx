import { defineWidgetConfig } from "@medusajs/admin-sdk"
import {
  Container,
  Heading,
  Text,
  Input,
  Select,
  Button,
  Badge,
} from "@medusajs/ui"
import { CurrencyDollar } from "@medusajs/icons"
import type { DetailWidgetProps, AdminProduct } from "@medusajs/framework/types"
import { useState, useEffect } from "react"

// Опции металлов
const METAL_OPTIONS = [
  { value: "gold", label: "Золото" },
  { value: "silver", label: "Серебро" },
  { value: "platinum", label: "Платина" },
  { value: "palladium", label: "Палладий" },
]

// Пробы по металлам
const PURITY_BY_METAL: Record<string, { value: string; label: string }[]> = {
  gold: [
    { value: "999", label: "999" },
    { value: "958", label: "958" },
    { value: "916", label: "916 (22K)" },
    { value: "875", label: "875" },
    { value: "750", label: "750 (18K)" },
    { value: "585", label: "585 (14K)" },
    { value: "583", label: "583" },
    { value: "500", label: "500" },
    { value: "375", label: "375 (9K)" },
    { value: "333", label: "333" },
  ],
  silver: [
    { value: "999", label: "999" },
    { value: "960", label: "960" },
    { value: "925", label: "925 (Стерлинг)" },
    { value: "875", label: "875" },
    { value: "830", label: "830" },
    { value: "800", label: "800" },
  ],
  platinum: [
    { value: "950", label: "950" },
    { value: "900", label: "900" },
    { value: "850", label: "850" },
    { value: "585", label: "585" },
  ],
  palladium: [
    { value: "850", label: "850" },
    { value: "500", label: "500" },
  ],
}

// Типы товаров
const PRODUCT_TYPE_OPTIONS = [
  { value: "ring", label: "Кольцо" },
  { value: "earrings", label: "Серьги" },
  { value: "pendant", label: "Подвеска" },
  { value: "bracelet", label: "Браслет" },
  { value: "chain", label: "Цепочка" },
  { value: "necklace", label: "Колье" },
  { value: "set", label: "Комплект" },
  { value: "jewelry", label: "Другое изделие" },
]

// Камни
const GEMSTONE_OPTIONS = [
  { value: "", label: "Без камня" },
  { value: "diamond", label: "Бриллиант" },
  { value: "ruby", label: "Рубин" },
  { value: "sapphire", label: "Сапфир" },
  { value: "emerald", label: "Изумруд" },
  { value: "amethyst", label: "Аметист" },
  { value: "topaz", label: "Топаз" },
  { value: "pearl", label: "Жемчуг" },
  { value: "meteorite", label: "Метеорит" },
  { value: "cubic_zirconia", label: "Фианит" },
  { value: "other", label: "Другой" },
]

interface PriceResult {
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
}

const PriceCalculatorWidgetInner = ({ data: product }: DetailWidgetProps<AdminProduct>) => {
  const metadata = (product.metadata || {}) as Record<string, string>
  
  const [metalType, setMetalType] = useState(metadata.metal_type || "gold")
  const [metalPurity, setMetalPurity] = useState(metadata.metal_purity || "585")
  const [weight, setWeight] = useState(metadata.average_weight || "5")
  const [productType, setProductType] = useState(metadata.product_type || "ring")
  const [gemstone, setGemstone] = useState(metadata.gemstone || "")
  const [gemstoneWeight, setGemstoneWeight] = useState(metadata.gemstone_weight || "0")
  const [margin, setMargin] = useState("50")
  
  const [result, setResult] = useState<PriceResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  // Обновить пробу при смене металла
  useEffect(() => {
    const purities = PURITY_BY_METAL[metalType]
    if (purities && !purities.find(p => p.value === metalPurity)) {
      setMetalPurity(purities[0]?.value || "")
    }
  }, [metalType])

  const calculatePrice = async () => {
    setLoading(true)
    setError("")
    
    try {
      const res = await fetch("/admin/price-calculator", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          metal_type: metalType,
          metal_purity: metalPurity,
          weight: parseFloat(weight) || 0,
          product_type: productType,
          gemstone: gemstone || undefined,
          gemstone_weight: parseFloat(gemstoneWeight) || 0,
          margin: parseFloat(margin) || 50,
        }),
      })
      
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.message || "Ошибка расчёта")
      }
      
      const data = await res.json()
      setResult(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Неизвестная ошибка")
    }
    
    setLoading(false)
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("ru-RU", {
      style: "currency",
      currency: "RUB",
      maximumFractionDigits: 0,
    }).format(price)
  }

  const purities = PURITY_BY_METAL[metalType] || []

  return (
    <Container>
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <CurrencyDollar className="text-amber-500" />
          <Heading level="h2">Калькулятор цены</Heading>
        </div>
        
        <Text className="text-ui-fg-subtle text-sm">
          Расчёт розничной цены на основе веса, металла и наценки
        </Text>

        {/* Параметры */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <div>
            <Text className="text-xs text-ui-fg-muted mb-1">Металл</Text>
            <Select value={metalType} onValueChange={setMetalType}>
              <Select.Trigger>
                <Select.Value />
              </Select.Trigger>
              <Select.Content>
                {METAL_OPTIONS.map(opt => (
                  <Select.Item key={opt.value} value={opt.value}>
                    {opt.label}
                  </Select.Item>
                ))}
              </Select.Content>
            </Select>
          </div>

          <div>
            <Text className="text-xs text-ui-fg-muted mb-1">Проба</Text>
            <Select value={metalPurity} onValueChange={setMetalPurity}>
              <Select.Trigger>
                <Select.Value />
              </Select.Trigger>
              <Select.Content>
                {purities.map(opt => (
                  <Select.Item key={opt.value} value={opt.value}>
                    {opt.label}
                  </Select.Item>
                ))}
              </Select.Content>
            </Select>
          </div>

          <div>
            <Text className="text-xs text-ui-fg-muted mb-1">Вес (г)</Text>
            <Input
              type="number"
              step="0.1"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              placeholder="5.0"
            />
          </div>

          <div>
            <Text className="text-xs text-ui-fg-muted mb-1">Тип изделия</Text>
            <Select value={productType} onValueChange={setProductType}>
              <Select.Trigger>
                <Select.Value />
              </Select.Trigger>
              <Select.Content>
                {PRODUCT_TYPE_OPTIONS.map(opt => (
                  <Select.Item key={opt.value} value={opt.value}>
                    {opt.label}
                  </Select.Item>
                ))}
              </Select.Content>
            </Select>
          </div>

          <div>
            <Text className="text-xs text-ui-fg-muted mb-1">Камень</Text>
            <Select value={gemstone} onValueChange={setGemstone}>
              <Select.Trigger>
                <Select.Value placeholder="Без камня" />
              </Select.Trigger>
              <Select.Content>
                {GEMSTONE_OPTIONS.map(opt => (
                  <Select.Item key={opt.value} value={opt.value}>
                    {opt.label}
                  </Select.Item>
                ))}
              </Select.Content>
            </Select>
          </div>

          {gemstone && (
            <div>
              <Text className="text-xs text-ui-fg-muted mb-1">Вес камня (кар.)</Text>
              <Input
                type="number"
                step="0.01"
                value={gemstoneWeight}
                onChange={(e) => setGemstoneWeight(e.target.value)}
                placeholder="0.5"
              />
            </div>
          )}

          <div>
            <Text className="text-xs text-ui-fg-muted mb-1">Наценка (%)</Text>
            <Input
              type="number"
              value={margin}
              onChange={(e) => setMargin(e.target.value)}
              placeholder="50"
            />
          </div>
        </div>

        <Button 
          onClick={calculatePrice} 
          isLoading={loading}
          className="bg-amber-500 hover:bg-amber-600"
        >
          💰 Рассчитать цену
        </Button>

        {error && (
          <div className="p-3 rounded-lg bg-red-50 text-red-700 text-sm">
            {error}
          </div>
        )}

        {result && (
          <div className="p-4 rounded-lg bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200">
            <div className="flex items-baseline gap-2 mb-3">
              <Text className="text-amber-800">Рекомендуемая цена:</Text>
              <Heading level="h1" className="text-amber-900">
                {formatPrice(result.final_price)}
              </Heading>
            </div>
            
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="flex justify-between">
                <Text className="text-ui-fg-muted">Металл:</Text>
                <Text>{formatPrice(result.metal_cost)}</Text>
              </div>
              {result.gemstone_cost > 0 && (
                <div className="flex justify-between">
                  <Text className="text-ui-fg-muted">Камень:</Text>
                  <Text>{formatPrice(result.gemstone_cost)}</Text>
                </div>
              )}
              <div className="flex justify-between">
                <Text className="text-ui-fg-muted">Работа:</Text>
                <Text>{formatPrice(result.work_cost)}</Text>
              </div>
              <div className="flex justify-between">
                <Text className="text-ui-fg-muted">Наценка ({margin}%):</Text>
                <Text>{formatPrice(result.margin)}</Text>
              </div>
            </div>

            <div className="mt-3 pt-3 border-t border-amber-200 text-xs text-amber-700">
              <div>Курс металла: {formatPrice(result.breakdown.metal_rate)}/г</div>
              <div>Коэф. работы: ×{result.breakdown.work_coefficient}</div>
            </div>
          </div>
        )}
      </div>
    </Container>
  )
}

export const config = defineWidgetConfig({
  zone: "product.details.side.after",
})

export default PriceCalculatorWidgetInner

