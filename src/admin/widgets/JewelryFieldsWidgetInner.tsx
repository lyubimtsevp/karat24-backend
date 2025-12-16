import {
  Button,
  Container,
  Heading,
  Input,
  Label,
  Select,
  Text,
  usePrompt,
  Badge,
} from "@medusajs/ui"
import type { DetailWidgetProps, AdminProduct } from "@medusajs/framework/types"
import { useState, useEffect } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"

// Типы для ювелирных метаданных
interface JewelryMetadata {
  // Проба металла
  metal_purity?: string
  // Тип металла
  metal_type?: string
  // Цвет металла
  metal_color?: string
  // Вставка (камни)
  gemstone?: string
  // Вес камня (карат)
  gemstone_weight?: string
  // Покрытие
  coating?: string
  // Средний вес изделия (грамм)
  average_weight?: string
  // Доступные размеры (для колец)
  available_sizes?: string
  // Артикул
  sku_custom?: string
}

// Опции для выбора
const METAL_PURITY_OPTIONS = [
  { value: "", label: "Не указано" },
  { value: "375", label: "375 (9K)" },
  { value: "585", label: "585 (14K)" },
  { value: "750", label: "750 (18K)" },
  { value: "916", label: "916 (22K)" },
  { value: "999", label: "999 (24K)" },
  { value: "925", label: "925 (Серебро)" },
  { value: "950", label: "950 (Платина)" },
]

const METAL_TYPE_OPTIONS = [
  { value: "", label: "Не указано" },
  { value: "gold", label: "Золото" },
  { value: "silver", label: "Серебро" },
  { value: "platinum", label: "Платина" },
  { value: "palladium", label: "Палладий" },
  { value: "titanium", label: "Титан" },
]

const METAL_COLOR_OPTIONS = [
  { value: "", label: "Не указано" },
  { value: "yellow", label: "Жёлтое" },
  { value: "white", label: "Белое" },
  { value: "rose", label: "Розовое" },
  { value: "red", label: "Красное" },
  { value: "green", label: "Зелёное" },
  { value: "black", label: "Чёрное" },
]

const GEMSTONE_OPTIONS = [
  { value: "", label: "Без вставки" },
  { value: "diamond", label: "Бриллиант" },
  { value: "meteorite", label: "Метеорит" },
  { value: "ruby", label: "Рубин" },
  { value: "sapphire", label: "Сапфир" },
  { value: "emerald", label: "Изумруд" },
  { value: "amethyst", label: "Аметист" },
  { value: "topaz", label: "Топаз" },
  { value: "pearl", label: "Жемчуг" },
  { value: "cubic_zirconia", label: "Фианит" },
  { value: "other", label: "Другое" },
]

const COATING_OPTIONS = [
  { value: "", label: "Без покрытия" },
  { value: "rhodium", label: "Родий" },
  { value: "gold_plating", label: "Позолота" },
  { value: "rose_gold_plating", label: "Розовая позолота" },
  { value: "black_rhodium", label: "Чёрный родий" },
  { value: "ruthenium", label: "Рутений" },
]

// Размеры колец (российская система)
const RING_SIZES = [
  "14", "14.5", "15", "15.5", "16", "16.5", "17", "17.5", 
  "18", "18.5", "19", "19.5", "20", "20.5", "21", "21.5", 
  "22", "22.5", "23"
]

export const JewelryFieldsWidgetInner = ({ data: product }: DetailWidgetProps<AdminProduct>) => {
  const queryClient = useQueryClient()
  const prompt = usePrompt()
  
  // Извлекаем текущие метаданные
  const currentMetadata = (product.metadata || {}) as JewelryMetadata
  
  // Локальное состояние формы
  const [formData, setFormData] = useState<JewelryMetadata>({
    metal_purity: currentMetadata.metal_purity || "",
    metal_type: currentMetadata.metal_type || "",
    metal_color: currentMetadata.metal_color || "",
    gemstone: currentMetadata.gemstone || "",
    gemstone_weight: currentMetadata.gemstone_weight || "",
    coating: currentMetadata.coating || "",
    average_weight: currentMetadata.average_weight || "",
    available_sizes: currentMetadata.available_sizes || "",
    sku_custom: currentMetadata.sku_custom || "",
  })
  
  const [selectedSizes, setSelectedSizes] = useState<string[]>(
    currentMetadata.available_sizes ? currentMetadata.available_sizes.split(",") : []
  )
  
  const [isDirty, setIsDirty] = useState(false)

  // Синхронизация с серверными данными
  useEffect(() => {
    setFormData({
      metal_purity: currentMetadata.metal_purity || "",
      metal_type: currentMetadata.metal_type || "",
      metal_color: currentMetadata.metal_color || "",
      gemstone: currentMetadata.gemstone || "",
      gemstone_weight: currentMetadata.gemstone_weight || "",
      coating: currentMetadata.coating || "",
      average_weight: currentMetadata.average_weight || "",
      available_sizes: currentMetadata.available_sizes || "",
      sku_custom: currentMetadata.sku_custom || "",
    })
    setSelectedSizes(
      currentMetadata.available_sizes ? currentMetadata.available_sizes.split(",") : []
    )
    setIsDirty(false)
  }, [product.id, currentMetadata])

  // Мутация для обновления метаданных
  const { mutate: updateProduct, isPending: isUpdating } = useMutation({
    mutationFn: async (metadata: JewelryMetadata) => {
      const res = await fetch(`/admin/products/${product.id}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          metadata: {
            ...product.metadata,
            ...metadata,
          },
        }),
      })

      if (!res.ok) {
        throw new Error("Failed to update product metadata")
      }

      return res.json()
    },
    onSuccess: () => {
      prompt({ title: "Успех", description: "Характеристики сохранены" })
      setIsDirty(false)
      queryClient.invalidateQueries({ queryKey: ["product_details", product.id] })
    },
    onError: () => {
      prompt({ title: "Ошибка", description: "Не удалось сохранить характеристики", variant: "danger" })
    },
  })

  const handleInputChange = (field: keyof JewelryMetadata, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    setIsDirty(true)
  }

  const handleSizeToggle = (size: string) => {
    setSelectedSizes(prev => {
      const newSizes = prev.includes(size) 
        ? prev.filter(s => s !== size)
        : [...prev, size].sort((a, b) => parseFloat(a) - parseFloat(b))
      
      setFormData(f => ({ ...f, available_sizes: newSizes.join(",") }))
      setIsDirty(true)
      return newSizes
    })
  }

  const handleSave = () => {
    updateProduct(formData)
  }

  return (
    <Container>
      <div className="flex flex-col gap-y-6">
        <div className="flex items-center justify-between">
          <Heading level="h2">Характеристики изделия</Heading>
          {isDirty && (
            <Badge color="orange">Есть несохранённые изменения</Badge>
          )}
        </div>

        {/* Металл */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Label htmlFor="metal_type">Тип металла</Label>
            <Select
              value={formData.metal_type}
              onValueChange={(value) => handleInputChange("metal_type", value)}
            >
              <Select.Trigger>
                <Select.Value placeholder="Выберите металл" />
              </Select.Trigger>
              <Select.Content>
                {METAL_TYPE_OPTIONS.map((opt) => (
                  <Select.Item key={opt.value} value={opt.value}>
                    {opt.label}
                  </Select.Item>
                ))}
              </Select.Content>
            </Select>
          </div>

          <div>
            <Label htmlFor="metal_purity">Проба</Label>
            <Select
              value={formData.metal_purity}
              onValueChange={(value) => handleInputChange("metal_purity", value)}
            >
              <Select.Trigger>
                <Select.Value placeholder="Выберите пробу" />
              </Select.Trigger>
              <Select.Content>
                {METAL_PURITY_OPTIONS.map((opt) => (
                  <Select.Item key={opt.value} value={opt.value}>
                    {opt.label}
                  </Select.Item>
                ))}
              </Select.Content>
            </Select>
          </div>

          <div>
            <Label htmlFor="metal_color">Цвет металла</Label>
            <Select
              value={formData.metal_color}
              onValueChange={(value) => handleInputChange("metal_color", value)}
            >
              <Select.Trigger>
                <Select.Value placeholder="Выберите цвет" />
              </Select.Trigger>
              <Select.Content>
                {METAL_COLOR_OPTIONS.map((opt) => (
                  <Select.Item key={opt.value} value={opt.value}>
                    {opt.label}
                  </Select.Item>
                ))}
              </Select.Content>
            </Select>
          </div>
        </div>

        {/* Вставка и покрытие */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Label htmlFor="gemstone">Вставка</Label>
            <Select
              value={formData.gemstone}
              onValueChange={(value) => handleInputChange("gemstone", value)}
            >
              <Select.Trigger>
                <Select.Value placeholder="Выберите вставку" />
              </Select.Trigger>
              <Select.Content>
                {GEMSTONE_OPTIONS.map((opt) => (
                  <Select.Item key={opt.value} value={opt.value}>
                    {opt.label}
                  </Select.Item>
                ))}
              </Select.Content>
            </Select>
          </div>

          <div>
            <Label htmlFor="gemstone_weight">Вес камня (кар.)</Label>
            <Input
              id="gemstone_weight"
              type="text"
              placeholder="0.5"
              value={formData.gemstone_weight}
              onChange={(e) => handleInputChange("gemstone_weight", e.target.value)}
              disabled={!formData.gemstone || formData.gemstone === "meteorite"}
            />
          </div>

          <div>
            <Label htmlFor="coating">Покрытие</Label>
            <Select
              value={formData.coating}
              onValueChange={(value) => handleInputChange("coating", value)}
            >
              <Select.Trigger>
                <Select.Value placeholder="Выберите покрытие" />
              </Select.Trigger>
              <Select.Content>
                {COATING_OPTIONS.map((opt) => (
                  <Select.Item key={opt.value} value={opt.value}>
                    {opt.label}
                  </Select.Item>
                ))}
              </Select.Content>
            </Select>
          </div>
        </div>

        {/* Вес и артикул */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="average_weight">Средний вес (г)</Label>
            <Input
              id="average_weight"
              type="text"
              placeholder="5.5"
              value={formData.average_weight}
              onChange={(e) => handleInputChange("average_weight", e.target.value)}
            />
          </div>

          <div>
            <Label htmlFor="sku_custom">Артикул</Label>
            <Input
              id="sku_custom"
              type="text"
              placeholder="K24-001"
              value={formData.sku_custom}
              onChange={(e) => handleInputChange("sku_custom", e.target.value)}
            />
          </div>
        </div>

        {/* Размеры колец */}
        <div>
          <Label>Доступные размеры (для колец)</Label>
          <Text className="text-ui-fg-subtle text-sm mb-2">
            Выберите размеры, которые доступны для заказа
          </Text>
          <div className="flex flex-wrap gap-2">
            {RING_SIZES.map((size) => (
              <button
                key={size}
                type="button"
                onClick={() => handleSizeToggle(size)}
                className={`
                  px-3 py-1.5 rounded-md text-sm font-medium transition-colors
                  ${selectedSizes.includes(size)
                    ? "bg-ui-bg-interactive text-ui-fg-on-color"
                    : "bg-ui-bg-subtle text-ui-fg-subtle hover:bg-ui-bg-subtle-hover"
                  }
                `}
              >
                {size}
              </button>
            ))}
          </div>
          {selectedSizes.length > 0 && (
            <Text className="text-ui-fg-muted text-xs mt-2">
              Выбрано: {selectedSizes.join(", ")}
            </Text>
          )}
        </div>

        {/* Кнопка сохранения */}
        <div className="flex justify-end pt-4 border-t">
          <Button 
            onClick={handleSave} 
            isLoading={isUpdating}
            disabled={!isDirty}
          >
            Сохранить характеристики
          </Button>
        </div>
      </div>
    </Container>
  )
}

