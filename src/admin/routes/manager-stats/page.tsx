import { defineRouteConfig } from "@medusajs/admin-sdk"
import { Container, Heading, Text, Table, Badge, Select, Button } from "@medusajs/ui"
import { ChartBar } from "@medusajs/icons"
import { useState, useEffect } from "react"

type ProductStats = {
  id: string
  title: string
  created_at: string
  updated_at: string
  manager?: string
  status?: string
}

type ManagerStats = {
  manager: string
  created_count: number
  updated_count: number
  products: ProductStats[]
}

const ManagerStatsPage = () => {
  const [stats, setStats] = useState<ManagerStats[]>([])
  const [allProducts, setAllProducts] = useState<ProductStats[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedPeriod, setSelectedPeriod] = useState("all")
  const [selectedManager, setSelectedManager] = useState("all")

  useEffect(() => {
    fetchStats()
  }, [selectedPeriod])

  const fetchStats = async () => {
    setLoading(true)
    try {
      // Получаем все товары
      const res = await fetch("/admin/products?limit=1000&fields=id,title,created_at,updated_at,metadata")
      const data = await res.json()
      
      const products: ProductStats[] = (data.products || []).map((p: any) => ({
        id: p.id,
        title: p.title,
        created_at: p.created_at,
        updated_at: p.updated_at,
        manager: p.metadata?.responsible_manager || "Не указан",
        status: p.metadata?.publication_status || "Не указан",
      }))

      // Фильтруем по периоду
      const now = new Date()
      const filteredProducts = products.filter(p => {
        if (selectedPeriod === "all") return true
        const createdDate = new Date(p.created_at)
        const diffDays = Math.floor((now.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24))
        
        if (selectedPeriod === "today") return diffDays === 0
        if (selectedPeriod === "week") return diffDays <= 7
        if (selectedPeriod === "month") return diffDays <= 30
        return true
      })

      setAllProducts(filteredProducts)

      // Группируем по менеджерам
      const managerMap = new Map<string, ManagerStats>()
      
      for (const product of filteredProducts) {
        const manager = product.manager || "Не указан"
        
        if (!managerMap.has(manager)) {
          managerMap.set(manager, {
            manager,
            created_count: 0,
            updated_count: 0,
            products: [],
          })
        }
        
        const stats = managerMap.get(manager)!
        stats.created_count++
        stats.products.push(product)
        
        // Если товар был обновлён после создания
        if (product.updated_at !== product.created_at) {
          stats.updated_count++
        }
      }

      setStats(Array.from(managerMap.values()).sort((a, b) => b.created_count - a.created_count))
    } catch (error) {
      console.error("Failed to fetch stats:", error)
    }
    setLoading(false)
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("ru-RU", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const managers = ["all", ...new Set(allProducts.map(p => p.manager || "Не указан"))]

  const displayProducts = selectedManager === "all" 
    ? allProducts 
    : allProducts.filter(p => p.manager === selectedManager)

  return (
    <Container>
      <div className="flex flex-col gap-6">
        {/* Заголовок */}
        <div className="flex items-center justify-between">
          <div>
            <Heading level="h1">📊 Статистика менеджеров</Heading>
            <Text className="text-ui-fg-subtle">
              Отчёты по созданию и редактированию товаров
            </Text>
          </div>
          <Button variant="secondary" onClick={fetchStats}>
            Обновить
          </Button>
        </div>

        {/* Фильтры */}
        <div className="flex gap-4">
          <div className="w-48">
            <Text className="text-sm mb-1">Период</Text>
            <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
              <Select.Trigger>
                <Select.Value />
              </Select.Trigger>
              <Select.Content>
                <Select.Item value="all">Всё время</Select.Item>
                <Select.Item value="today">Сегодня</Select.Item>
                <Select.Item value="week">За неделю</Select.Item>
                <Select.Item value="month">За месяц</Select.Item>
              </Select.Content>
            </Select>
          </div>
          <div className="w-48">
            <Text className="text-sm mb-1">Менеджер</Text>
            <Select value={selectedManager} onValueChange={setSelectedManager}>
              <Select.Trigger>
                <Select.Value />
              </Select.Trigger>
              <Select.Content>
                <Select.Item value="all">Все менеджеры</Select.Item>
                {managers.filter(m => m !== "all").map(m => (
                  <Select.Item key={m} value={m}>{m}</Select.Item>
                ))}
              </Select.Content>
            </Select>
          </div>
        </div>

        {/* Сводка по менеджерам */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.slice(0, 4).map((s) => (
            <div 
              key={s.manager} 
              className="p-4 rounded-lg border bg-ui-bg-subtle cursor-pointer hover:bg-ui-bg-subtle-hover transition-colors"
              onClick={() => setSelectedManager(s.manager)}
            >
              <Text className="text-ui-fg-subtle text-sm">{s.manager}</Text>
              <div className="flex items-baseline gap-2 mt-1">
                <Heading level="h2" className="text-2xl">{s.created_count}</Heading>
                <Text className="text-ui-fg-muted text-sm">товаров</Text>
              </div>
              <div className="flex gap-2 mt-2">
                <Badge color="green" size="small">+{s.created_count} создано</Badge>
                {s.updated_count > 0 && (
                  <Badge color="blue" size="small">{s.updated_count} изменено</Badge>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Общая статистика */}
        <div className="p-4 rounded-lg border bg-amber-50">
          <div className="flex items-center gap-4">
            <div>
              <Text className="text-amber-800 font-medium">Всего товаров</Text>
              <Heading level="h2" className="text-amber-900">{allProducts.length}</Heading>
            </div>
            <div className="border-l border-amber-200 pl-4">
              <Text className="text-amber-800 font-medium">Менеджеров</Text>
              <Heading level="h2" className="text-amber-900">{stats.length}</Heading>
            </div>
          </div>
        </div>

        {/* Таблица товаров */}
        <div>
          <Heading level="h2" className="mb-4">
            Товары {selectedManager !== "all" && `(${selectedManager})`}
          </Heading>
          
          {loading ? (
            <div className="text-center py-8">
              <Text>Загрузка...</Text>
            </div>
          ) : displayProducts.length === 0 ? (
            <div className="text-center py-8">
              <Text className="text-ui-fg-muted">Нет данных за выбранный период</Text>
            </div>
          ) : (
            <Table>
              <Table.Header>
                <Table.Row>
                  <Table.HeaderCell>Товар</Table.HeaderCell>
                  <Table.HeaderCell>Менеджер</Table.HeaderCell>
                  <Table.HeaderCell>Создан</Table.HeaderCell>
                  <Table.HeaderCell>Изменён</Table.HeaderCell>
                  <Table.HeaderCell>Статус</Table.HeaderCell>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {displayProducts.slice(0, 50).map((product) => (
                  <Table.Row key={product.id}>
                    <Table.Cell>
                      <a 
                        href={`/app/products/${product.id}`}
                        className="text-ui-fg-interactive hover:underline"
                      >
                        {product.title}
                      </a>
                    </Table.Cell>
                    <Table.Cell>
                      <Badge color={product.manager === "Не указан" ? "grey" : "purple"}>
                        {product.manager}
                      </Badge>
                    </Table.Cell>
                    <Table.Cell>{formatDate(product.created_at)}</Table.Cell>
                    <Table.Cell>
                      {product.updated_at !== product.created_at 
                        ? formatDate(product.updated_at)
                        : "—"
                      }
                    </Table.Cell>
                    <Table.Cell>
                      <Badge 
                        color={
                          product.status === "published" ? "green" :
                          product.status === "moderation" ? "orange" :
                          product.status === "removed" ? "red" : "grey"
                        }
                      >
                        {product.status === "published" ? "Опубликован" :
                         product.status === "moderation" ? "На модерации" :
                         product.status === "removed" ? "Снят" : product.status}
                      </Badge>
                    </Table.Cell>
                  </Table.Row>
                ))}
              </Table.Body>
            </Table>
          )}
          
          {displayProducts.length > 50 && (
            <Text className="text-ui-fg-muted text-sm mt-2">
              Показано 50 из {displayProducts.length} товаров
            </Text>
          )}
        </div>
      </div>
    </Container>
  )
}

export const config = defineRouteConfig({
  label: "Статистика менеджеров",
  icon: ChartBar,
})

export default ManagerStatsPage

