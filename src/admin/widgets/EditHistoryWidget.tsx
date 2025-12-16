import { defineWidgetConfig } from "@medusajs/admin-sdk"
import { Container, Heading, Text, Badge } from "@medusajs/ui"
import { ClockSolid } from "@medusajs/icons"
import type { DetailWidgetProps, AdminProduct } from "@medusajs/framework/types"

interface HistoryEntry {
  date: string
  manager: string
  action: "created" | "updated"
  changes?: string[]
}

const EditHistoryWidgetInner = ({ data: product }: DetailWidgetProps<AdminProduct>) => {
  const metadata = (product.metadata || {}) as Record<string, any>
  
  // Получаем историю из metadata
  const history: HistoryEntry[] = metadata.edit_history 
    ? JSON.parse(metadata.edit_history) 
    : []
  
  // Добавляем запись о создании если история пустая
  const displayHistory = history.length > 0 ? history : [{
    date: product.created_at,
    manager: metadata.responsible_manager || "Не указан",
    action: "created" as const,
  }]

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("ru-RU", {
      day: "2-digit",
      month: "2-digit", 
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  return (
    <Container>
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <ClockSolid className="text-ui-fg-subtle" />
          <Heading level="h2">История изменений</Heading>
        </div>

        <div className="space-y-2">
          {/* Создание */}
          <div className="flex items-start gap-3 p-2 rounded bg-green-50 border border-green-200">
            <Badge color="green" size="small">Создано</Badge>
            <div className="flex-1">
              <Text className="text-sm font-medium">
                {metadata.responsible_manager || "Менеджер не указан"}
              </Text>
              <Text className="text-xs text-ui-fg-muted">
                {formatDate(product.created_at)}
              </Text>
            </div>
          </div>

          {/* Последнее обновление */}
          {product.updated_at !== product.created_at && (
            <div className="flex items-start gap-3 p-2 rounded bg-blue-50 border border-blue-200">
              <Badge color="blue" size="small">Изменено</Badge>
              <div className="flex-1">
                <Text className="text-sm font-medium">
                  {metadata.last_editor || metadata.responsible_manager || "Менеджер не указан"}
                </Text>
                <Text className="text-xs text-ui-fg-muted">
                  {formatDate(product.updated_at)}
                </Text>
              </div>
            </div>
          )}

          {/* История из metadata */}
          {history.slice(0, 5).map((entry, idx) => (
            <div 
              key={idx}
              className={`flex items-start gap-3 p-2 rounded ${
                entry.action === "created" 
                  ? "bg-green-50 border border-green-200"
                  : "bg-gray-50 border border-gray-200"
              }`}
            >
              <Badge 
                color={entry.action === "created" ? "green" : "grey"} 
                size="small"
              >
                {entry.action === "created" ? "Создано" : "Изменено"}
              </Badge>
              <div className="flex-1">
                <Text className="text-sm font-medium">{entry.manager}</Text>
                <Text className="text-xs text-ui-fg-muted">
                  {formatDate(entry.date)}
                </Text>
                {entry.changes && entry.changes.length > 0 && (
                  <Text className="text-xs text-ui-fg-subtle mt-1">
                    Изменено: {entry.changes.join(", ")}
                  </Text>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="pt-2 border-t">
          <Text className="text-xs text-ui-fg-muted">
            ID товара: {product.id}
          </Text>
        </div>
      </div>
    </Container>
  )
}

export const config = defineWidgetConfig({
  zone: "product.details.side.after",
})

export default EditHistoryWidgetInner

