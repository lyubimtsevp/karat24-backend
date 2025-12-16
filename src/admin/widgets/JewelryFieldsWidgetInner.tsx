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
  Textarea,
  Switch,
  Tabs,
} from "@medusajs/ui"
import type { DetailWidgetProps, AdminProduct } from "@medusajs/framework/types"
import { useState, useEffect } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"

// =====================================================
// ТИПЫ для ювелирных метаданных по ТЗ (24 поля)
// =====================================================
interface JewelryMetadata {
  // 1. Наименование - уже есть в product.title
  // 1.1 Расширенный заголовок
  extended_title?: string
  // 1.2 Краткое описание (description)
  short_description?: string
  // 1.3 Аннотация (introtext)
  introtext?: string
  
  // 2. Артикул (sku_custom)
  sku_custom?: string
  
  // 3. Тип товарной позиции
  product_type?: string
  // 3.1 Для кого (М/Ж)
  target_gender?: string
  
  // 4. Категория/раздел - уже есть в Medusa categories
  
  // 5. Драгоценный металл
  metal_type?: string
  metal_color?: string
  
  // 6. Проба изделия
  metal_purity?: string
  
  // 7. Вес изделия (грамм)
  average_weight?: string
  
  // 8. Вставка/камни
  gemstone?: string
  gemstone_type?: string // природный/синтетический/имитация
  gemstone_cut?: string // форма огранки
  gemstone_weight?: string // вес в каратах
  gemstone_color?: string // цвет
  gemstone_clarity?: string // чистота (D/VVS1 и т.д.)
  gemstone_count?: string // количество
  
  // 9. Размер изделия
  available_sizes?: string
  chain_length?: string // для цепочек/браслетов
  earring_dimensions?: string // для серёг
  
  // 9.1 Плетение (для цепочек)
  chain_weave?: string
  
  // 9.2 Звенья браслета
  bracelet_links?: string // кол-во звеньев
  link_weight?: string // вес одного звена
  
  // 9.3 Таблица размер → вес
  weight_by_size?: string // JSON: {"16": 3.5, "17": 3.8, ...}
  
  // 10. Покрытие
  coating?: string
  
  // 11. Дизайн/особенности
  design_style?: string
  
  // 12. Упаковка
  packaging?: string
  
  // 13. Остаток (наличие)
  stock_status?: string
  
  // 14. Цена закупки (внутреннее)
  purchase_price?: string
  
  // 15. Отпускная цена - уже есть в variants
  // 16. НДС
  vat_rate?: string
  
  // 17. УИН ГИИС ДМДК
  uin_giis?: string
  
  // 19. Описание - уже есть в product.description
  
  // 20. Комплектация
  kit_contents?: string
  
  // 21. Ограничения
  restrictions?: string
  
  // 22. Статус публикации
  publication_status?: string
  
  // 24. Ответственный менеджер
  responsible_manager?: string
  
  // Видео URL
  video_url?: string
}

// =====================================================
// ОПЦИИ для селекторов
// =====================================================

// 3. Тип товарной позиции
const PRODUCT_TYPE_OPTIONS = [
  { value: "", label: "Не указано" },
  { value: "ring", label: "Кольцо" },
  { value: "jewelry", label: "Ювелирное изделие" },
  { value: "gift", label: "Подарок" },
  { value: "earrings", label: "Серьги" },
  { value: "pendant", label: "Подвеска" },
  { value: "bracelet", label: "Браслет" },
  { value: "chain", label: "Цепочка" },
  { value: "necklace", label: "Колье" },
  { value: "set", label: "Комплект" },
  { value: "box", label: "Шкатулка" },
  { value: "other", label: "Другое" },
]

// 3.1 Для кого
const TARGET_GENDER_OPTIONS = [
  { value: "", label: "Не указано" },
  { value: "male", label: "Для него (М)" },
  { value: "female", label: "Для неё (Ж)" },
  { value: "unisex", label: "Унисекс" },
]

// 5. Тип металла
const METAL_TYPE_OPTIONS = [
  { value: "", label: "Не указано" },
  { value: "gold", label: "Золото" },
  { value: "silver", label: "Серебро" },
  { value: "platinum", label: "Платина" },
  { value: "palladium", label: "Палладий" },
  { value: "titanium", label: "Титан" },
  { value: "wood", label: "Дерево" },
  { value: "other", label: "Другой" },
]

// 5. Цвет металла (для золота)
const METAL_COLOR_OPTIONS = [
  { value: "", label: "Не указано" },
  { value: "yellow", label: "Жёлтое" },
  { value: "white", label: "Белое" },
  { value: "rose", label: "Розовое" },
  { value: "red", label: "Красное" },
  { value: "green", label: "Зелёное" },
  { value: "black", label: "Чёрное" },
]

// 6. Проба - зависит от металла
const GOLD_PURITY_OPTIONS = [
  { value: "", label: "Не указано" },
  { value: "333", label: "333" },
  { value: "375", label: "375 (9K)" },
  { value: "500", label: "500" },
  { value: "583", label: "583" },
  { value: "585", label: "585 (14K)" },
  { value: "750", label: "750 (18K)" },
  { value: "875", label: "875" },
  { value: "916", label: "916 (22K)" },
  { value: "958", label: "958" },
  { value: "999", label: "999 (24K)" },
]

const SILVER_PURITY_OPTIONS = [
  { value: "", label: "Не указано" },
  { value: "800", label: "800" },
  { value: "830", label: "830" },
  { value: "875", label: "875" },
  { value: "925", label: "925 (Стерлинг)" },
  { value: "960", label: "960" },
  { value: "999", label: "999" },
]

const PLATINUM_PURITY_OPTIONS = [
  { value: "", label: "Не указано" },
  { value: "585", label: "585" },
  { value: "850", label: "850" },
  { value: "900", label: "900" },
  { value: "950", label: "950" },
]

const PALLADIUM_PURITY_OPTIONS = [
  { value: "", label: "Не указано" },
  { value: "500", label: "500" },
  { value: "850", label: "850" },
]

// 8. Вставка/камни
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
  { value: "garnet", label: "Гранат" },
  { value: "aquamarine", label: "Аквамарин" },
  { value: "opal", label: "Опал" },
  { value: "turquoise", label: "Бирюза" },
  { value: "cubic_zirconia", label: "Фианит" },
  { value: "other", label: "Другое" },
]

const GEMSTONE_TYPE_OPTIONS = [
  { value: "", label: "Не указано" },
  { value: "natural", label: "Природный" },
  { value: "synthetic", label: "Синтетический" },
  { value: "imitation", label: "Имитация" },
]

const GEMSTONE_CUT_OPTIONS = [
  { value: "", label: "Не указано" },
  { value: "round", label: "Круглая" },
  { value: "princess", label: "Принцесса" },
  { value: "oval", label: "Овал" },
  { value: "marquise", label: "Маркиз" },
  { value: "pear", label: "Груша" },
  { value: "cushion", label: "Кушон" },
  { value: "emerald", label: "Изумрудная" },
  { value: "asscher", label: "Ашер" },
  { value: "radiant", label: "Радиант" },
  { value: "heart", label: "Сердце" },
  { value: "baguette", label: "Багет" },
  { value: "cabochon", label: "Кабошон" },
]

// Плетение для цепочек
const CHAIN_WEAVE_OPTIONS = [
  { value: "", label: "Не указано" },
  { value: "bismarck", label: "Бисмарк" },
  { value: "anchor", label: "Якорное" },
  { value: "armor", label: "Панцирное" },
  { value: "rope", label: "Верёвочка (корда)" },
  { value: "snake", label: "Снейк (змейка)" },
  { value: "figaro", label: "Фигаро" },
  { value: "venetian", label: "Венецианское" },
  { value: "singapore", label: "Сингапур" },
  { value: "curb", label: "Картье" },
  { value: "love", label: "Лав" },
  { value: "rombo", label: "Ромбо" },
  { value: "nonna", label: "Нонна" },
  { value: "wheat", label: "Колос" },
  { value: "box", label: "Венецианка (коробочка)" },
  { value: "ball", label: "Шарики (перлина)" },
  { value: "other", label: "Другое" },
]

// 10. Покрытие
const COATING_OPTIONS = [
  { value: "", label: "Без покрытия" },
  { value: "rhodium", label: "Родиевое" },
  { value: "gold_plating", label: "Позолота" },
  { value: "oxidation", label: "Оксидирование" },
  { value: "rose_gold_plating", label: "Розовая позолота" },
  { value: "black_rhodium", label: "Чёрный родий" },
  { value: "ruthenium", label: "Рутений" },
  { value: "other", label: "Другое" },
]

// 11. Дизайн/особенности
const DESIGN_STYLE_OPTIONS = [
  { value: "", label: "Не указано" },
  { value: "openwork", label: "Ажурный" },
  { value: "enamel", label: "С эмалью" },
  { value: "inlay", label: "Инкрустация" },
  { value: "engraving", label: "Гравировка" },
  { value: "vintage", label: "Винтажный стиль" },
  { value: "minimalist", label: "Минимализм" },
  { value: "classic", label: "Классика" },
  { value: "modern", label: "Современный" },
  { value: "other", label: "Другое" },
]

// 12. Упаковка
const PACKAGING_OPTIONS = [
  { value: "", label: "Не указано" },
  { value: "branded_box", label: "Фирменная коробка" },
  { value: "pouch", label: "Мешочек" },
  { value: "blister", label: "Блистер" },
  { value: "none", label: "Без упаковки" },
  { value: "other", label: "Другое" },
]

// 13. Остаток (наличие)
const STOCK_STATUS_OPTIONS = [
  { value: "", label: "Не указано" },
  { value: "in_stock", label: "В наличии" },
  { value: "on_order", label: "Под заказ" },
  { value: "out_of_stock", label: "Нет в наличии" },
]

// 16. НДС
const VAT_RATE_OPTIONS = [
  { value: "", label: "Не указано" },
  { value: "0", label: "0%" },
  { value: "10", label: "10%" },
  { value: "20", label: "20%" },
]

// 21. Ограничения
const RESTRICTIONS_OPTIONS = [
  { value: "", label: "Нет ограничений" },
  { value: "18+", label: "18+" },
  { value: "not_for_children", label: "Не для детей" },
  { value: "special_care", label: "Требует особого ухода" },
]

// 22. Статус публикации
const PUBLICATION_STATUS_OPTIONS = [
  { value: "", label: "Не указано" },
  { value: "moderation", label: "На модерации" },
  { value: "published", label: "Опубликован" },
  { value: "removed", label: "Снят с продажи" },
]

// Размеры колец (российская система)
const RING_SIZES = [
  "14", "14.5", "15", "15.5", "16", "16.5", "17", "17.5", 
  "18", "18.5", "19", "19.5", "20", "20.5", "21", "21.5", 
  "22", "22.5", "23"
]

// Длины цепочек/браслетов
const CHAIN_LENGTHS = [
  "16", "17", "18", "19", "20", "21", "22", "38", "40", "42", "45", "50", "55", "60"
]

// =====================================================
// КОМПОНЕНТ
// =====================================================

export const JewelryFieldsWidgetInner = ({ data: product }: DetailWidgetProps<AdminProduct>) => {
  const queryClient = useQueryClient()
  const prompt = usePrompt()
  
  const currentMetadata = (product.metadata || {}) as JewelryMetadata
  
  const [formData, setFormData] = useState<JewelryMetadata>({
    extended_title: currentMetadata.extended_title || "",
    short_description: currentMetadata.short_description || "",
    introtext: currentMetadata.introtext || "",
    sku_custom: currentMetadata.sku_custom || "",
    product_type: currentMetadata.product_type || "",
    target_gender: currentMetadata.target_gender || "",
    metal_type: currentMetadata.metal_type || "",
    metal_color: currentMetadata.metal_color || "",
    metal_purity: currentMetadata.metal_purity || "",
    average_weight: currentMetadata.average_weight || "",
    gemstone: currentMetadata.gemstone || "",
    gemstone_type: currentMetadata.gemstone_type || "",
    gemstone_cut: currentMetadata.gemstone_cut || "",
    gemstone_weight: currentMetadata.gemstone_weight || "",
    gemstone_color: currentMetadata.gemstone_color || "",
    gemstone_clarity: currentMetadata.gemstone_clarity || "",
    gemstone_count: currentMetadata.gemstone_count || "",
    available_sizes: currentMetadata.available_sizes || "",
    chain_length: currentMetadata.chain_length || "",
    earring_dimensions: currentMetadata.earring_dimensions || "",
    chain_weave: currentMetadata.chain_weave || "",
    bracelet_links: currentMetadata.bracelet_links || "",
    link_weight: currentMetadata.link_weight || "",
    weight_by_size: currentMetadata.weight_by_size || "",
    coating: currentMetadata.coating || "",
    design_style: currentMetadata.design_style || "",
    packaging: currentMetadata.packaging || "",
    stock_status: currentMetadata.stock_status || "on_order",
    purchase_price: currentMetadata.purchase_price || "",
    vat_rate: currentMetadata.vat_rate || "20",
    uin_giis: currentMetadata.uin_giis || "",
    kit_contents: currentMetadata.kit_contents || "",
    restrictions: currentMetadata.restrictions || "",
    publication_status: currentMetadata.publication_status || "",
    responsible_manager: currentMetadata.responsible_manager || "",
    video_url: currentMetadata.video_url || "",
  })
  
  const [selectedSizes, setSelectedSizes] = useState<string[]>(
    currentMetadata.available_sizes ? currentMetadata.available_sizes.split(",") : []
  )
  
  const [isDirty, setIsDirty] = useState(false)

  // Определяем пробы в зависимости от металла
  const getPurityOptions = () => {
    switch (formData.metal_type) {
      case "gold": return GOLD_PURITY_OPTIONS
      case "silver": return SILVER_PURITY_OPTIONS
      case "platinum": return PLATINUM_PURITY_OPTIONS
      case "palladium": return PALLADIUM_PURITY_OPTIONS
      default: return GOLD_PURITY_OPTIONS
    }
  }

  // Показывать цвет металла только для золота
  const showMetalColor = formData.metal_type === "gold"
  
  // Показывать размеры колец
  const showRingSizes = ["ring", "jewelry"].includes(formData.product_type || "")
  
  // Показывать длину цепочки/браслета
  const showChainLength = ["chain", "bracelet", "necklace"].includes(formData.product_type || "")
  
  // Показывать габариты серёг
  const showEarringDimensions = formData.product_type === "earrings"
  
  // Показывать поля камней
  const showGemstoneFields = formData.gemstone && formData.gemstone !== ""

  useEffect(() => {
    setFormData({
      extended_title: currentMetadata.extended_title || "",
      short_description: currentMetadata.short_description || "",
      introtext: currentMetadata.introtext || "",
      sku_custom: currentMetadata.sku_custom || "",
      product_type: currentMetadata.product_type || "",
      target_gender: currentMetadata.target_gender || "",
      metal_type: currentMetadata.metal_type || "",
      metal_color: currentMetadata.metal_color || "",
      metal_purity: currentMetadata.metal_purity || "",
      average_weight: currentMetadata.average_weight || "",
      gemstone: currentMetadata.gemstone || "",
      gemstone_type: currentMetadata.gemstone_type || "",
      gemstone_cut: currentMetadata.gemstone_cut || "",
      gemstone_weight: currentMetadata.gemstone_weight || "",
      gemstone_color: currentMetadata.gemstone_color || "",
      gemstone_clarity: currentMetadata.gemstone_clarity || "",
      gemstone_count: currentMetadata.gemstone_count || "",
      available_sizes: currentMetadata.available_sizes || "",
      chain_length: currentMetadata.chain_length || "",
      earring_dimensions: currentMetadata.earring_dimensions || "",
      chain_weave: currentMetadata.chain_weave || "",
      bracelet_links: currentMetadata.bracelet_links || "",
      link_weight: currentMetadata.link_weight || "",
      weight_by_size: currentMetadata.weight_by_size || "",
      coating: currentMetadata.coating || "",
      design_style: currentMetadata.design_style || "",
      packaging: currentMetadata.packaging || "",
      stock_status: currentMetadata.stock_status || "on_order",
      purchase_price: currentMetadata.purchase_price || "",
      vat_rate: currentMetadata.vat_rate || "20",
      uin_giis: currentMetadata.uin_giis || "",
      kit_contents: currentMetadata.kit_contents || "",
      restrictions: currentMetadata.restrictions || "",
      publication_status: currentMetadata.publication_status || "",
      responsible_manager: currentMetadata.responsible_manager || "",
      video_url: currentMetadata.video_url || "",
    })
    setSelectedSizes(
      currentMetadata.available_sizes ? currentMetadata.available_sizes.split(",") : []
    )
    setIsDirty(false)
  }, [product.id])

  const { mutate: updateProduct, isPending: isUpdating } = useMutation({
    mutationFn: async (metadata: JewelryMetadata) => {
      // Добавляем запись в историю изменений
      const existingHistory = product.metadata?.edit_history 
        ? JSON.parse(product.metadata.edit_history as string)
        : []
      
      const newHistoryEntry = {
        date: new Date().toISOString(),
        manager: metadata.responsible_manager || "Не указан",
        action: existingHistory.length === 0 ? "created" : "updated",
      }
      
      const updatedHistory = [newHistoryEntry, ...existingHistory].slice(0, 50) // Храним последние 50 записей
      
      const res = await fetch(`/admin/products/${product.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          metadata: { 
            ...product.metadata, 
            ...metadata,
            edit_history: JSON.stringify(updatedHistory),
            last_editor: metadata.responsible_manager,
            last_edit_date: new Date().toISOString(),
          },
        }),
      })
      if (!res.ok) throw new Error("Failed to update product metadata")
      return res.json()
    },
    onSuccess: () => {
      prompt({ title: "Успех", description: "Характеристики сохранены" })
      setIsDirty(false)
      queryClient.invalidateQueries({ queryKey: ["product_details", product.id] })
    },
    onError: () => {
      prompt({ title: "Ошибка", description: "Не удалось сохранить", variant: "danger" })
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

  // Генерация артикула
  const generateSku = () => {
    const prefix = formData.product_type ? formData.product_type.substring(0, 2).toUpperCase() : "XX"
    const metal = formData.metal_type ? formData.metal_type.substring(0, 1).toUpperCase() : "X"
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, "0")
    const sku = `K24-${prefix}${metal}-${random}`
    handleInputChange("sku_custom", sku)
  }

  return (
    <Container>
      <div className="flex flex-col gap-y-4">
        <div className="flex items-center justify-between">
          <Heading level="h2">🏷️ Характеристики изделия</Heading>
          {isDirty && <Badge color="orange">Несохранённые изменения</Badge>}
        </div>

        <Tabs defaultValue="basic">
          <Tabs.List>
            <Tabs.Trigger value="basic">Основное</Tabs.Trigger>
            <Tabs.Trigger value="metal">Металл</Tabs.Trigger>
            <Tabs.Trigger value="stones">Камни</Tabs.Trigger>
            <Tabs.Trigger value="sizes">Размеры</Tabs.Trigger>
            <Tabs.Trigger value="extra">Дополнительно</Tabs.Trigger>
            <Tabs.Trigger value="internal">Внутреннее</Tabs.Trigger>
          </Tabs.List>

          {/* ==================== ОСНОВНОЕ ==================== */}
          <Tabs.Content value="basic" className="pt-4">
            <div className="flex flex-col gap-4">
              {/* Артикул */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="sku_custom">2. Артикул *</Label>
                  <div className="flex gap-2">
                    <Input
                      id="sku_custom"
                      placeholder="K24-RIG-0001"
                      value={formData.sku_custom}
                      onChange={(e) => handleInputChange("sku_custom", e.target.value)}
                    />
                    <Button variant="secondary" onClick={generateSku} type="button">
                      Сгенерировать
                    </Button>
                  </div>
                  <Text className="text-ui-fg-muted text-xs mt-1">
                    Уникальный идентификатор товара
                  </Text>
                </div>

                <div>
                  <Label htmlFor="product_type">3. Тип товара *</Label>
                  <Select
                    value={formData.product_type}
                    onValueChange={(v) => handleInputChange("product_type", v)}
                  >
                    <Select.Trigger>
                      <Select.Value placeholder="Выберите тип" />
                    </Select.Trigger>
                    <Select.Content>
                      {PRODUCT_TYPE_OPTIONS.map((opt) => (
                        <Select.Item key={opt.value} value={opt.value}>
                          {opt.label}
                        </Select.Item>
                      ))}
                    </Select.Content>
                  </Select>
                </div>
              </div>

              {/* Для кого */}
              <div>
                <Label htmlFor="target_gender">3.1 Для кого</Label>
                <Select
                  value={formData.target_gender}
                  onValueChange={(v) => handleInputChange("target_gender", v)}
                >
                  <Select.Trigger>
                    <Select.Value placeholder="Выберите" />
                  </Select.Trigger>
                  <Select.Content>
                    {TARGET_GENDER_OPTIONS.map((opt) => (
                      <Select.Item key={opt.value} value={opt.value}>
                        {opt.label}
                      </Select.Item>
                    ))}
                  </Select.Content>
                </Select>
              </div>

              {/* Расширенный заголовок */}
              <div>
                <Label htmlFor="extended_title">1.1 Расширенный заголовок</Label>
                <Input
                  id="extended_title"
                  placeholder="Дополнительное название для SEO"
                  value={formData.extended_title}
                  onChange={(e) => handleInputChange("extended_title", e.target.value)}
                />
              </div>

              {/* Краткое описание */}
              <div>
                <Label htmlFor="short_description">1.2 Краткое описание</Label>
                <Textarea
                  id="short_description"
                  placeholder="Краткое описание товара (до 300 символов)"
                  value={formData.short_description}
                  onChange={(e) => handleInputChange("short_description", e.target.value)}
                  rows={2}
                />
              </div>

              {/* Аннотация */}
              <div>
                <Label htmlFor="introtext">1.3 Аннотация (introtext)</Label>
                <Textarea
                  id="introtext"
                  placeholder="Текст для превью товара"
                  value={formData.introtext}
                  onChange={(e) => handleInputChange("introtext", e.target.value)}
                  rows={3}
                />
              </div>

              {/* Видео */}
              <div>
                <Label htmlFor="video_url">Видео (URL)</Label>
                <Input
                  id="video_url"
                  placeholder="https://youtube.com/watch?v=..."
                  value={formData.video_url}
                  onChange={(e) => handleInputChange("video_url", e.target.value)}
                />
              </div>
            </div>
          </Tabs.Content>

          {/* ==================== МЕТАЛЛ ==================== */}
          <Tabs.Content value="metal" className="pt-4">
            <div className="flex flex-col gap-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label>5. Тип металла *</Label>
                  <Select
                    value={formData.metal_type}
                    onValueChange={(v) => {
                      handleInputChange("metal_type", v)
                      // Сбросить пробу при смене металла
                      handleInputChange("metal_purity", "")
                    }}
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

                {showMetalColor && (
                  <div>
                    <Label>Цвет металла</Label>
                    <Select
                      value={formData.metal_color}
                      onValueChange={(v) => handleInputChange("metal_color", v)}
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
                )}

                <div>
                  <Label>6. Проба *</Label>
                  <Select
                    value={formData.metal_purity}
                    onValueChange={(v) => handleInputChange("metal_purity", v)}
                  >
                    <Select.Trigger>
                      <Select.Value placeholder="Выберите пробу" />
                    </Select.Trigger>
                    <Select.Content>
                      {getPurityOptions().map((opt) => (
                        <Select.Item key={opt.value} value={opt.value}>
                          {opt.label}
                        </Select.Item>
                      ))}
                    </Select.Content>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>7. Вес изделия (г) *</Label>
                  <Input
                    type="text"
                    placeholder="3.25"
                    value={formData.average_weight}
                    onChange={(e) => handleInputChange("average_weight", e.target.value)}
                  />
                  <Text className="text-ui-fg-muted text-xs mt-1">
                    С точностью до 2 знаков после запятой
                  </Text>
                </div>

                <div>
                  <Label>10. Покрытие</Label>
                  <Select
                    value={formData.coating}
                    onValueChange={(v) => handleInputChange("coating", v)}
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
            </div>
          </Tabs.Content>

          {/* ==================== КАМНИ ==================== */}
          <Tabs.Content value="stones" className="pt-4">
            <div className="flex flex-col gap-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label>8. Вставка/камни</Label>
                  <Select
                    value={formData.gemstone}
                    onValueChange={(v) => handleInputChange("gemstone", v)}
                  >
                    <Select.Trigger>
                      <Select.Value placeholder="Выберите камень" />
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

                {showGemstoneFields && (
                  <>
                    <div>
                      <Label>Тип камня</Label>
                      <Select
                        value={formData.gemstone_type}
                        onValueChange={(v) => handleInputChange("gemstone_type", v)}
                      >
                        <Select.Trigger>
                          <Select.Value placeholder="Выберите тип" />
                        </Select.Trigger>
                        <Select.Content>
                          {GEMSTONE_TYPE_OPTIONS.map((opt) => (
                            <Select.Item key={opt.value} value={opt.value}>
                              {opt.label}
                            </Select.Item>
                          ))}
                        </Select.Content>
                      </Select>
                    </div>

                    <div>
                      <Label>Форма огранки</Label>
                      <Select
                        value={formData.gemstone_cut}
                        onValueChange={(v) => handleInputChange("gemstone_cut", v)}
                      >
                        <Select.Trigger>
                          <Select.Value placeholder="Выберите огранку" />
                        </Select.Trigger>
                        <Select.Content>
                          {GEMSTONE_CUT_OPTIONS.map((opt) => (
                            <Select.Item key={opt.value} value={opt.value}>
                              {opt.label}
                            </Select.Item>
                          ))}
                        </Select.Content>
                      </Select>
                    </div>
                  </>
                )}
              </div>

              {showGemstoneFields && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <Label>Вес (карат)</Label>
                    <Input
                      type="text"
                      placeholder="0.5"
                      value={formData.gemstone_weight}
                      onChange={(e) => handleInputChange("gemstone_weight", e.target.value)}
                    />
                  </div>

                  <div>
                    <Label>Цвет</Label>
                    <Input
                      type="text"
                      placeholder="D, E, F..."
                      value={formData.gemstone_color}
                      onChange={(e) => handleInputChange("gemstone_color", e.target.value)}
                    />
                  </div>

                  <div>
                    <Label>Чистота</Label>
                    <Input
                      type="text"
                      placeholder="VVS1, VS2..."
                      value={formData.gemstone_clarity}
                      onChange={(e) => handleInputChange("gemstone_clarity", e.target.value)}
                    />
                  </div>

                  <div>
                    <Label>Количество</Label>
                    <Input
                      type="text"
                      placeholder="1"
                      value={formData.gemstone_count}
                      onChange={(e) => handleInputChange("gemstone_count", e.target.value)}
                    />
                  </div>
                </div>
              )}
            </div>
          </Tabs.Content>

          {/* ==================== РАЗМЕРЫ ==================== */}
          <Tabs.Content value="sizes" className="pt-4">
            <div className="flex flex-col gap-4">
              {showRingSizes && (
                <div>
                  <Label>9. Размеры колец (российские)</Label>
                  <Text className="text-ui-fg-subtle text-sm mb-2">
                    Выберите доступные размеры
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
                            ? "bg-amber-500 text-white"
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
                  
                  {/* Таблица размер → вес */}
                  {selectedSizes.length > 0 && (
                    <div className="mt-4 p-3 bg-amber-50 rounded-lg border border-amber-200">
                      <Label className="text-amber-800">Таблица размер → вес (г)</Label>
                      <Text className="text-xs text-amber-700 mb-2">
                        Укажите вес для каждого размера. Цена пересчитается автоматически.
                      </Text>
                      <div className="grid grid-cols-4 gap-2">
                        {selectedSizes.map((size) => {
                          const weightMap = formData.weight_by_size 
                            ? JSON.parse(formData.weight_by_size || "{}") 
                            : {}
                          return (
                            <div key={size} className="flex items-center gap-1">
                              <span className="text-xs font-medium w-8">{size}:</span>
                              <Input
                                type="number"
                                step="0.01"
                                placeholder="г"
                                className="h-7 text-xs"
                                value={weightMap[size] || ""}
                                onChange={(e) => {
                                  const newMap = { ...weightMap, [size]: e.target.value }
                                  handleInputChange("weight_by_size", JSON.stringify(newMap))
                                }}
                              />
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {showChainLength && (
                <>
                  <div>
                    <Label>Длина цепочки/браслета (см)</Label>
                    <div className="flex flex-wrap gap-2">
                      {CHAIN_LENGTHS.map((len) => (
                        <button
                          key={len}
                          type="button"
                          onClick={() => handleInputChange("chain_length", len)}
                          className={`
                            px-3 py-1.5 rounded-md text-sm font-medium transition-colors
                            ${formData.chain_length === len
                              ? "bg-amber-500 text-white"
                              : "bg-ui-bg-subtle text-ui-fg-subtle hover:bg-ui-bg-subtle-hover"
                            }
                          `}
                        >
                          {len} см
                        </button>
                      ))}
                    </div>
                  </div>
                  
                  {/* Плетение для цепочек */}
                  {(formData.product_type === "chain" || formData.product_type === "necklace") && (
                    <div>
                      <Label>Тип плетения</Label>
                      <Select
                        value={formData.chain_weave || ""}
                        onValueChange={(v) => handleInputChange("chain_weave", v)}
                      >
                        <Select.Trigger>
                          <Select.Value placeholder="Выберите плетение" />
                        </Select.Trigger>
                        <Select.Content>
                          {CHAIN_WEAVE_OPTIONS.map((opt) => (
                            <Select.Item key={opt.value} value={opt.value}>
                              {opt.label}
                            </Select.Item>
                          ))}
                        </Select.Content>
                      </Select>
                    </div>
                  )}
                  
                  {/* Звенья для браслетов */}
                  {formData.product_type === "bracelet" && (
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label>Количество звеньев</Label>
                        <Input
                          type="number"
                          placeholder="18"
                          value={formData.bracelet_links}
                          onChange={(e) => handleInputChange("bracelet_links", e.target.value)}
                        />
                        <Text className="text-ui-fg-muted text-xs mt-1">
                          Базовое кол-во звеньев
                        </Text>
                      </div>
                      <div>
                        <Label>Вес одного звена (г)</Label>
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="0.5"
                          value={formData.link_weight}
                          onChange={(e) => handleInputChange("link_weight", e.target.value)}
                        />
                        <Text className="text-ui-fg-muted text-xs mt-1">
                          Для пересчёта при добавлении
                        </Text>
                      </div>
                    </div>
                  )}
                </>
              )}

              {showEarringDimensions && (
                <div>
                  <Label>Габариты серёг (мм)</Label>
                  <Input
                    type="text"
                    placeholder="Длина x Ширина (напр. 25x15)"
                    value={formData.earring_dimensions}
                    onChange={(e) => handleInputChange("earring_dimensions", e.target.value)}
                  />
                </div>
              )}

              {!showRingSizes && !showChainLength && !showEarringDimensions && (
                <Text className="text-ui-fg-muted">
                  Выберите тип товара для отображения размеров
                </Text>
              )}
            </div>
          </Tabs.Content>

          {/* ==================== ДОПОЛНИТЕЛЬНО ==================== */}
          <Tabs.Content value="extra" className="pt-4">
            <div className="flex flex-col gap-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>11. Дизайн/особенности</Label>
                  <Select
                    value={formData.design_style}
                    onValueChange={(v) => handleInputChange("design_style", v)}
                  >
                    <Select.Trigger>
                      <Select.Value placeholder="Выберите стиль" />
                    </Select.Trigger>
                    <Select.Content>
                      {DESIGN_STYLE_OPTIONS.map((opt) => (
                        <Select.Item key={opt.value} value={opt.value}>
                          {opt.label}
                        </Select.Item>
                      ))}
                    </Select.Content>
                  </Select>
                </div>

                <div>
                  <Label>12. Упаковка</Label>
                  <Select
                    value={formData.packaging}
                    onValueChange={(v) => handleInputChange("packaging", v)}
                  >
                    <Select.Trigger>
                      <Select.Value placeholder="Выберите упаковку" />
                    </Select.Trigger>
                    <Select.Content>
                      {PACKAGING_OPTIONS.map((opt) => (
                        <Select.Item key={opt.value} value={opt.value}>
                          {opt.label}
                        </Select.Item>
                      ))}
                    </Select.Content>
                  </Select>
                </div>
              </div>

              <div>
                <Label>20. Комплектация</Label>
                <Textarea
                  placeholder="Изделие, фирменная бирка, сертификат подлинности..."
                  value={formData.kit_contents}
                  onChange={(e) => handleInputChange("kit_contents", e.target.value)}
                  rows={2}
                />
              </div>

              <div>
                <Label>21. Ограничения</Label>
                <Select
                  value={formData.restrictions}
                  onValueChange={(v) => handleInputChange("restrictions", v)}
                >
                  <Select.Trigger>
                    <Select.Value placeholder="Нет ограничений" />
                  </Select.Trigger>
                  <Select.Content>
                    {RESTRICTIONS_OPTIONS.map((opt) => (
                      <Select.Item key={opt.value} value={opt.value}>
                        {opt.label}
                      </Select.Item>
                    ))}
                  </Select.Content>
                </Select>
              </div>
            </div>
          </Tabs.Content>

          {/* ==================== ВНУТРЕННЕЕ ==================== */}
          <Tabs.Content value="internal" className="pt-4">
            <div className="flex flex-col gap-4">
              <div className="p-3 bg-amber-50 rounded-lg border border-amber-200">
                <Text className="text-amber-800 text-sm">
                  ⚠️ Эти поля видны только администраторам
                </Text>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label>13. Наличие</Label>
                  <Select
                    value={formData.stock_status}
                    onValueChange={(v) => handleInputChange("stock_status", v)}
                  >
                    <Select.Trigger>
                      <Select.Value placeholder="Статус" />
                    </Select.Trigger>
                    <Select.Content>
                      {STOCK_STATUS_OPTIONS.map((opt) => (
                        <Select.Item key={opt.value} value={opt.value}>
                          {opt.label}
                        </Select.Item>
                      ))}
                    </Select.Content>
                  </Select>
                </div>

                <div>
                  <Label>14. Цена закупки (₽)</Label>
                  <Input
                    type="text"
                    placeholder="10000"
                    value={formData.purchase_price}
                    onChange={(e) => handleInputChange("purchase_price", e.target.value)}
                  />
                </div>

                <div>
                  <Label>16. НДС</Label>
                  <Select
                    value={formData.vat_rate}
                    onValueChange={(v) => handleInputChange("vat_rate", v)}
                  >
                    <Select.Trigger>
                      <Select.Value placeholder="Ставка" />
                    </Select.Trigger>
                    <Select.Content>
                      {VAT_RATE_OPTIONS.map((opt) => (
                        <Select.Item key={opt.value} value={opt.value}>
                          {opt.label}
                        </Select.Item>
                      ))}
                    </Select.Content>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>17. УИН ГИИС ДМДК</Label>
                  <Input
                    type="text"
                    placeholder="Номер для отслеживания"
                    value={formData.uin_giis}
                    onChange={(e) => handleInputChange("uin_giis", e.target.value)}
                  />
                </div>

                <div>
                  <Label>22. Статус публикации</Label>
                  <Select
                    value={formData.publication_status}
                    onValueChange={(v) => handleInputChange("publication_status", v)}
                  >
                    <Select.Trigger>
                      <Select.Value placeholder="Статус" />
                    </Select.Trigger>
                    <Select.Content>
                      {PUBLICATION_STATUS_OPTIONS.map((opt) => (
                        <Select.Item key={opt.value} value={opt.value}>
                          {opt.label}
                        </Select.Item>
                      ))}
                    </Select.Content>
                  </Select>
                </div>
              </div>

              <div>
                <Label>24. Ответственный менеджер</Label>
                <Input
                  type="text"
                  placeholder="ФИО сотрудника"
                  value={formData.responsible_manager}
                  onChange={(e) => handleInputChange("responsible_manager", e.target.value)}
                />
              </div>
            </div>
          </Tabs.Content>
        </Tabs>

        {/* Кнопка сохранения */}
        <div className="flex justify-end pt-4 border-t">
          <Button 
            onClick={handleSave} 
            isLoading={isUpdating}
            disabled={!isDirty}
            className="bg-amber-500 hover:bg-amber-600"
          >
            💾 Сохранить характеристики
          </Button>
        </div>
      </div>
    </Container>
  )
}
