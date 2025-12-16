import { Button, Container, Heading, Input, Label, Text, usePrompt } from "@medusajs/ui"
import type { DetailWidgetProps, AdminProduct } from "@medusajs/framework/types"
import { useState, useEffect, useRef } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"

export const ProductVideoWidgetInner = ({ data: product }: DetailWidgetProps<AdminProduct>) => {
  const queryClient = useQueryClient()
  const prompt = usePrompt()
  const [videoUrl, setVideoUrl] = useState<string | null | undefined>(undefined)
  const [videoFile, setVideoFile] = useState<File | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isIframeLoading, setIsIframeLoading] = useState(false)

  const currentVideoUrl = product.metadata?.video_url as string || ""
  const effectiveUrl = videoUrl === undefined ? currentVideoUrl : (videoUrl ?? "")

  useEffect(() => {
    // Следуем серверному состоянию, пока пользователь явно не задал своё
    setVideoUrl(undefined)
    // при смене серверного URL считаем, что iframe нужно перезагрузить
    if (currentVideoUrl) {
      setIsIframeLoading(true)
    }
  }, [currentVideoUrl])

  const { mutate: updateProduct, isPending: isUpdating } = useMutation({
    mutationFn: async (url: string | null) => {
      const res = await fetch(`/admin/products/${product.id}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ metadata: { video_url: url } }),
      });

      if (!res.ok) {
        throw new Error("Failed to update product metadata");
      }

      return res.json();
    },
    onSuccess: (data: { product: { metadata: { video_url: string | null } } }) => {
      const newUrl = data.product.metadata.video_url;
      // Обновляем локальное состояние, чтобы UI обновился мгновенно
      setVideoUrl(newUrl ?? null);
      if (newUrl) {
        prompt({ title: "Успех", description: "Видео сохранено" });
        console.log("URL в метаданных после сохранения:", newUrl);
      } else {
        prompt({ title: "Успех", description: "Видео удалено" });
        console.log("Метаданные видео очищены.");
      }
      // Точечная инвалидация деталей продукта (без общей инвалидации списка)
      queryClient.invalidateQueries({ queryKey: ["product_details", product.id] });
    },
    onError: () => {
      prompt({ title: "Ошибка", description: "Не удалось сохранить видео", variant: "danger" })
    },
  })

  const { mutate: uploadFile, isPending: isUploading } = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData()
      formData.append("files", file)

      const res = await fetch(`/admin/uploads`, {
        method: "POST",
        body: formData,
      })

      if (!res.ok) {
        throw new Error("Upload failed")
      }

      return res.json()
    },
    onSuccess: (data: { files: { url: string }[] }) => {
      if (data.files && data.files.length > 0) {
        const uploadedUrl = data.files[0].url;
        console.log("Ссылка на загруженное видео:", uploadedUrl);
        // Мгновенный локальный апдейт UI
        setVideoUrl(uploadedUrl)
        setIsIframeLoading(true)
        // Оптимистичный апдейт кэша деталей продукта
        queryClient.setQueriesData(
          { queryKey: ["product_details", product.id] },
          (old: any) => {
            if (!old) return old
            return {
              ...old,
              product: {
                ...old.product,
                metadata: {
                  ...old.product?.metadata,
                  video_url: uploadedUrl,
                },
              },
            }
          }
        )
        // очищаем выбранный файл и отправляем апдейт на сервер
        setVideoFile(null)
        updateProduct(uploadedUrl);
      } else {
        console.error("Ответ API не содержит ожидаемого поля 'files':", data);
        prompt({
          title: "Ошибка обработки ответа",
          description: "Не удалось извлечь URL из ответа сервера.",
          variant: "danger"
        });
      }
    },
    onError: (error: Error) => {
      console.error("Ошибка при загрузке файла:", error);
      prompt({
        title: "Ошибка загрузки",
        description: "Не удалось загрузить файл. Подробности в консоли.",
        variant: "danger"
      })
    },
  })

  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setVideoUrl(e.target.value)
    if (videoFile) setVideoFile(null)
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setVideoFile(file)
      if (videoUrl) setVideoUrl("")
    }
  }

  const { mutate: deleteFile } = useMutation({
    mutationFn: async (fileKey: string) => {
      const res = await fetch(`/admin/uploads/delete`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ file_key: fileKey }),
      });

      if (!res.ok) {
        const errorBody = await res.text();
        console.error("Ошибка ответа сервера при удалении файла:", res.status, errorBody);
        throw new Error(`Failed to delete file. Server responded with ${res.status}`);
      }

      return res.json();
    },
    onSuccess: (data) => {
      console.log("Ответ сервера на удаление файла:", data);
    },
    onError: (error) => {
      console.error("Ошибка при выполнении запроса на удаление файла:", error);
      prompt({ title: "Ошибка", description: "Не удалось удалить файл из хранилища.", variant: "danger" });
    },
  });

  const handleDelete = async () => {
    const confirm = await prompt({
      title: "Подтвердите удаление",
      description: "Вы уверены, что хотите удалить это видео? Это действие необратимо.",
      confirmText: "Удалить",
      cancelText: "Отмена",
    });

    if (!confirm) {
      return;
    }

    // Скрываем UI немедленно, независимо от исхода (будет подтверждено успешным апдейтом)
    setVideoUrl(null)
    setIsIframeLoading(false)

    // Check if the URL is from our S3 bucket
    if (currentVideoUrl.includes("s3.twcstorage.ru")) {
      const fileKey = currentVideoUrl.split("/").pop();
      if (fileKey) {
        console.log("Попытка удалить файл с ключом:", fileKey);
        deleteFile(fileKey, {
          onSuccess: () => {
            updateProduct(null);
          },
          onError: () => {
            // Возвращаем отображение, если удаление не удалось
            setVideoUrl(undefined)
          }
        });
        return;
      }
    }

    // If it's an external URL or something went wrong with parsing, just clear the metadata
    updateProduct(null);
  };

  const handleSave = () => {
    if (videoFile) {
      uploadFile(videoFile)
    } else {
      const payload = (videoUrl === undefined ? (currentVideoUrl || null) : (videoUrl || null))
      updateProduct(payload)
    }
  }

  return (
    <Container>
      <div className="flex flex-col gap-y-4">
        <Heading level="h2">Видео товара</Heading>
        {effectiveUrl && (
          <div className="mt-4">
            <Label>Текущее видео</Label>
            <div className="relative aspect-video w-full overflow-hidden rounded-lg">
              {isIframeLoading && (
                <div className="absolute inset-0 animate-pulse bg-ui-bg-subtle" />
              )}
              <iframe
                src={effectiveUrl.replace("watch?v=", "embed/")} // Basic embed conversion for YouTube
                className="h-full w-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                onLoad={() => setIsIframeLoading(false)}
                allowFullScreen
              ></iframe>
              <div className="absolute top-2 right-2">
                <Button variant="danger" size="small" onClick={handleDelete}>
                  Удалить
                </Button>
              </div>
            </div>
          </div>
        )}
        <div>
          <Label htmlFor="video-url">URL видео (например, с YouTube)</Label>
          <Input
            id="video-url"
            type="url"
            placeholder="https://..."
            value={videoUrl ?? ""}
            onChange={handleUrlChange}
            disabled={!!videoFile}
          />
        </div>
        <div className="text-center">
          <Text className="text-ui-fg-subtle">ИЛИ</Text>
        </div>
        <div>
          <Label>Загрузить видео файлом</Label>
          <div className="flex items-center gap-x-4">
            <Button
              variant="secondary"
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={!!videoUrl}
            >
              Выберите файл
            </Button>
            {videoFile && <Text>{videoFile.name}</Text>}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              className="hidden"
              accept="video/*"
              disabled={!!videoUrl}
            />
          </div>
        </div>
        <div className="mt-4 flex justify-end">
          <Button onClick={handleSave} isLoading={isUpdating || isUploading}>
            Сохранить
          </Button>
        </div>
      </div>
    </Container>
  )
}
