import { defineRouteConfig } from "@medusajs/admin-sdk"
import { Container, Heading, Button, Text, Table, Badge } from "@medusajs/ui"
import { useState, useEffect } from "react"
import { DocumentText, ArrowDownTray } from "@medusajs/icons"

type MediaEntry = {
  id: string
  product_id: string | null
  url: string
  s3_key: string
  original_filename: string
  mime_type: string
  file_size: number
  is_webp: boolean
  uploaded_at: string
}

type BackupData = {
  version: string
  updated_at: string
  total: number
  entries: MediaEntry[]
}

const MediaBackupPage = () => {
  const [data, setData] = useState<BackupData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = async () => {
    setLoading(true)
    try {
      const res = await fetch("/admin/media-backup?limit=500")
      if (!res.ok) throw new Error("Ошибка загрузки данных")
      const json = await res.json()
      setData(json)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Неизвестная ошибка")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const handleExportCSV = () => {
    window.open("/admin/media-backup?format=csv", "_blank")
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString("ru-RU", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  return (
    <Container className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <Heading level="h1" className="mb-2">
            Резервные копии медиа
          </Heading>
          <Text className="text-ui-fg-subtle">
            Таблица для восстановления связей медиа-файлов с товарами
          </Text>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={fetchData} disabled={loading}>
            Обновить
          </Button>
          <Button onClick={handleExportCSV} disabled={!data || data.total === 0}>
            <ArrowDownTray className="mr-2" />
            Экспорт CSV
          </Button>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <Text className="text-red-700">{error}</Text>
        </div>
      )}

      {data && (
        <div className="mb-4 flex gap-4">
          <Badge color="grey">Версия: {data.version}</Badge>
          <Badge color="blue">Всего файлов: {data.total}</Badge>
          <Badge color="green">
            Обновлено: {data.updated_at ? formatDate(data.updated_at) : "—"}
          </Badge>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Text className="text-ui-fg-subtle">Загрузка...</Text>
        </div>
      ) : data && data.entries.length > 0 ? (
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <Table.Header>
              <Table.Row>
                <Table.HeaderCell>Превью</Table.HeaderCell>
                <Table.HeaderCell>Файл</Table.HeaderCell>
                <Table.HeaderCell>Тип</Table.HeaderCell>
                <Table.HeaderCell>Размер</Table.HeaderCell>
                <Table.HeaderCell>WebP</Table.HeaderCell>
                <Table.HeaderCell>Загружен</Table.HeaderCell>
                <Table.HeaderCell>Действия</Table.HeaderCell>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {data.entries.map((entry) => (
                <Table.Row key={entry.id}>
                  <Table.Cell>
                    {entry.mime_type.startsWith("image/") ? (
                      <img
                        src={entry.url}
                        alt={entry.original_filename}
                        className="w-12 h-12 object-cover rounded"
                      />
                    ) : (
                      <div className="w-12 h-12 bg-gray-100 rounded flex items-center justify-center">
                        <DocumentText className="text-gray-400" />
                      </div>
                    )}
                  </Table.Cell>
                  <Table.Cell>
                    <div className="max-w-[200px]">
                      <Text className="truncate font-medium">
                        {entry.original_filename}
                      </Text>
                      <Text className="text-xs text-ui-fg-subtle truncate">
                        {entry.s3_key}
                      </Text>
                    </div>
                  </Table.Cell>
                  <Table.Cell>
                    <Badge color="grey" className="text-xs">
                      {entry.mime_type.split("/")[1]?.toUpperCase() || "?"}
                    </Badge>
                  </Table.Cell>
                  <Table.Cell>{formatFileSize(entry.file_size)}</Table.Cell>
                  <Table.Cell>
                    {entry.is_webp ? (
                      <Badge color="green">Да</Badge>
                    ) : (
                      <Badge color="grey">Нет</Badge>
                    )}
                  </Table.Cell>
                  <Table.Cell>
                    <Text className="text-xs">
                      {formatDate(entry.uploaded_at)}
                    </Text>
                  </Table.Cell>
                  <Table.Cell>
                    <a
                      href={entry.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline text-sm"
                    >
                      Открыть
                    </a>
                  </Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-12 border rounded-lg bg-gray-50">
          <DocumentText className="w-12 h-12 text-gray-300 mb-4" />
          <Text className="text-ui-fg-subtle">Нет записей в бэкапе</Text>
          <Text className="text-xs text-ui-fg-muted mt-1">
            Записи появятся после загрузки медиа-файлов через админку
          </Text>
        </div>
      )}
    </Container>
  )
}

export const config = defineRouteConfig({
  label: "Бэкап медиа",
  icon: DocumentText,
})

export default MediaBackupPage

