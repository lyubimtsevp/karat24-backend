import {
  Button,
  Container,
  Heading,
  Text,
  usePrompt,
  Badge,
  IconButton,
} from "@medusajs/ui"
import { XMark, ArrowUpTray, Photo, ArrowUpMini, ArrowDownMini } from "@medusajs/icons"
import type { DetailWidgetProps, AdminProduct } from "@medusajs/framework/types"
import { useState, useCallback, useRef, useEffect } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"

interface UploadedFile {
  url: string
  key: string
  name: string
  originalSize: number
  processedSize: number
  isWebP: boolean
  compressionRatio?: number
}

interface UploadResponse {
  files: UploadedFile[]
}

interface PreviewFile {
  file: File
  preview: string
  status: "pending" | "uploading" | "done" | "error"
  progress: number
  result?: UploadedFile
}

export const ImageUploaderWidgetInner = ({ data: product }: DetailWidgetProps<AdminProduct>) => {
  const queryClient = useQueryClient()
  const prompt = usePrompt()
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  const [isDragging, setIsDragging] = useState(false)
  const [uploadedImages, setUploadedImages] = useState<UploadedFile[]>([])
  const [previewFiles, setPreviewFiles] = useState<PreviewFile[]>([])
  const [uploadProgress, setUploadProgress] = useState(0)
  const [totalStats, setTotalStats] = useState({ original: 0, compressed: 0 })

  // Очистка превью при размонтировании
  useEffect(() => {
    return () => {
      previewFiles.forEach((p) => URL.revokeObjectURL(p.preview))
    }
  }, [])

  // Мутация для загрузки файлов с прогрессом
  const { mutate: uploadFiles, isPending: isUploading } = useMutation({
    mutationFn: async (files: File[]) => {
      const formData = new FormData()
      files.forEach((file) => {
        formData.append("files", file)
      })

      return new Promise<UploadResponse>((resolve, reject) => {
        const xhr = new XMLHttpRequest()
        
        xhr.upload.addEventListener("progress", (e) => {
          if (e.lengthComputable) {
            const percent = Math.round((e.loaded / e.total) * 100)
            setUploadProgress(percent)
            
            // Обновляем статус файлов
            setPreviewFiles((prev) =>
              prev.map((p) =>
                p.status === "uploading" ? { ...p, progress: percent } : p
              )
            )
          }
        })

        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              const response = JSON.parse(xhr.responseText)
              resolve(response)
            } catch {
              reject(new Error("Invalid response"))
            }
          } else {
            reject(new Error(`Upload failed: ${xhr.status}`))
          }
        }

        xhr.onerror = () => reject(new Error("Network error"))
        
        xhr.open("POST", "/admin/uploads")
        xhr.send(formData)
      })
    },
    onSuccess: (data) => {
      // Обновляем статус файлов
      setPreviewFiles((prev) =>
        prev.map((p, i) => ({
          ...p,
          status: "done" as const,
          progress: 100,
          result: data.files[i],
        }))
      )

      setUploadedImages((prev) => [...prev, ...data.files])
      
      // Статистика
      const totalOriginal = data.files.reduce((sum, f) => sum + f.originalSize, 0)
      const totalProcessed = data.files.reduce((sum, f) => sum + f.processedSize, 0)
      setTotalStats((prev) => ({
        original: prev.original + totalOriginal,
        compressed: prev.compressed + totalProcessed,
      }))

      // Очищаем превью через 1 секунду
      setTimeout(() => {
        setPreviewFiles([])
        setUploadProgress(0)
      }, 1000)
      
      prompt({
        title: "Готово!",
        description: `${data.files.length} изображений загружено`,
      })
    },
    onError: (error) => {
      console.error("Upload error:", error)
      setPreviewFiles((prev) =>
        prev.map((p) => ({ ...p, status: "error" as const }))
      )
      prompt({
        title: "Ошибка загрузки",
        description: "Не удалось загрузить файлы",
        variant: "danger",
      })
    },
  })

  // Мутация для добавления изображений к товару
  const { mutate: addImagesToProduct, isPending: isAddingImages } = useMutation({
    mutationFn: async (imageUrls: string[]) => {
      const currentImages = product.images?.map((img) => ({ url: img.url })) || []
      const newImages = imageUrls.map((url) => ({ url }))

      const res = await fetch(`/admin/products/${product.id}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          images: [...currentImages, ...newImages],
        }),
      })

      if (!res.ok) {
        throw new Error("Failed to add images to product")
      }

      return res.json()
    },
    onSuccess: () => {
      prompt({ title: "Успех", description: "Изображения добавлены к товару" })
      setUploadedImages([])
      setTotalStats({ original: 0, compressed: 0 })
      queryClient.invalidateQueries({ queryKey: ["product_details", product.id] })
    },
    onError: () => {
      prompt({
        title: "Ошибка",
        description: "Не удалось добавить изображения к товару",
        variant: "danger",
      })
    },
  })

  // Обработка drag & drop
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)

    const files = Array.from(e.dataTransfer.files).filter((file) =>
      file.type.startsWith("image/")
    )

    if (files.length > 0) {
      processFiles(files)
    }
  }, [])

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length > 0) {
      processFiles(files)
    }
    // Reset input
    e.target.value = ""
  }

  const processFiles = (files: File[]) => {
    // Создаём превью со статусами
    const previews: PreviewFile[] = files.map((file) => ({
      file,
      preview: URL.createObjectURL(file),
      status: "uploading",
      progress: 0,
    }))
    setPreviewFiles(previews)
    setUploadProgress(0)

    // Загружаем файлы
    uploadFiles(files)
  }

  const removeUploaded = (index: number) => {
    const removed = uploadedImages[index]
    setUploadedImages((prev) => prev.filter((_, i) => i !== index))
    setTotalStats((prev) => ({
      original: prev.original - removed.originalSize,
      compressed: prev.compressed - removed.processedSize,
    }))
  }

  // Сортировка изображений
  const moveImage = (index: number, direction: "up" | "down") => {
    setUploadedImages((prev) => {
      const newArr = [...prev]
      const targetIndex = direction === "up" ? index - 1 : index + 1
      if (targetIndex < 0 || targetIndex >= newArr.length) return prev
      ;[newArr[index], newArr[targetIndex]] = [newArr[targetIndex], newArr[index]]
      return newArr
    })
  }

  const handleAddToProduct = () => {
    const urls = uploadedImages.map((img) => img.url)
    addImagesToProduct(urls)
  }

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  const savedPercent = totalStats.original > 0
    ? Math.round((1 - totalStats.compressed / totalStats.original) * 100)
    : 0

  return (
    <Container>
      <div className="flex flex-col gap-y-4">
        <div className="flex items-center justify-between">
          <Heading level="h2">Загрузка изображений</Heading>
          {totalStats.original > 0 && (
            <Badge color="green">
              Сжато: -{savedPercent}% ({formatSize(totalStats.original - totalStats.compressed)})
            </Badge>
          )}
        </div>
        
        <Text className="text-ui-fg-subtle text-sm">
          Перетащите изображения или нажмите для выбора • Автоконвертация в WebP
        </Text>

        {/* Зона drag & drop */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => !isUploading && fileInputRef.current?.click()}
          className={`
            relative border-2 border-dashed rounded-lg p-6 text-center transition-all duration-200
            ${isUploading ? "cursor-wait" : "cursor-pointer"}
            ${isDragging
              ? "border-amber-500 bg-amber-50"
              : "border-gray-300 hover:border-amber-400 hover:bg-gray-50"
            }
          `}
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/jpeg,image/png,image/webp,image/gif"
            onChange={handleFileSelect}
            className="hidden"
            disabled={isUploading}
          />
          
          <div className="flex flex-col items-center gap-2">
            {isDragging ? (
              <ArrowUpTray className="w-10 h-10 text-amber-500" />
            ) : (
              <Photo className="w-10 h-10 text-gray-400" />
            )}
            <Text className={isDragging ? "text-amber-600 font-medium" : "text-gray-500"}>
              {isDragging ? "Отпустите файлы" : "Перетащите изображения сюда"}
            </Text>
            <Text className="text-gray-400 text-xs">
              JPG, PNG, WebP, GIF • до 10 файлов • макс. 10MB каждый
            </Text>
          </div>
        </div>

        {/* Прогресс загрузки */}
        {isUploading && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <Text className="text-gray-600">Загрузка и конвертация...</Text>
              <Text className="font-medium">{uploadProgress}%</Text>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-amber-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          </div>
        )}

        {/* Превью загружаемых файлов */}
        {previewFiles.length > 0 && (
          <div className="grid grid-cols-4 gap-2">
            {previewFiles.map((item, index) => (
              <div 
                key={index} 
                className={`
                  relative aspect-square rounded-lg overflow-hidden
                  ${item.status === "done" ? "ring-2 ring-green-500" : ""}
                  ${item.status === "error" ? "ring-2 ring-red-500" : ""}
                `}
              >
                <img
                  src={item.preview}
                  alt={item.file.name}
                  className={`w-full h-full object-cover ${item.status === "uploading" ? "opacity-60" : ""}`}
                />
                {item.status === "uploading" && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                    <div className="w-8 h-8 border-3 border-white border-t-transparent rounded-full animate-spin" />
                  </div>
                )}
                {item.status === "done" && (
                  <div className="absolute bottom-0 left-0 right-0 bg-green-500 text-white text-xs text-center py-0.5">
                    ✓ {formatSize(item.result?.processedSize || 0)}
                  </div>
                )}
                {item.status === "error" && (
                  <div className="absolute inset-0 flex items-center justify-center bg-red-500/80">
                    <XMark className="w-6 h-6 text-white" />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Загруженные изображения */}
        {uploadedImages.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Text className="font-medium">
                Готово к добавлению: {uploadedImages.length}
              </Text>
              <Button variant="secondary" size="small" onClick={() => {
                setUploadedImages([])
                setTotalStats({ original: 0, compressed: 0 })
              }}>
                Очистить
              </Button>
            </div>
            
            <div className="grid grid-cols-3 gap-2">
              {uploadedImages.map((img, index) => (
                <div
                  key={img.key}
                  className="relative aspect-square rounded-lg overflow-hidden bg-gray-100 group"
                >
                  <img
                    src={img.url}
                    alt={img.name}
                    className="w-full h-full object-cover"
                  />
                  
                  {/* Оверлей с действиями */}
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1">
                    {/* Кнопки сортировки */}
                    <div className="flex gap-1">
                      <IconButton
                        variant="transparent"
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation()
                          moveImage(index, "up")
                        }}
                        disabled={index === 0}
                      >
                        <ArrowUpMini className="text-white" />
                      </IconButton>
                      <IconButton
                        variant="transparent"
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation()
                          moveImage(index, "down")
                        }}
                        disabled={index === uploadedImages.length - 1}
                      >
                        <ArrowDownMini className="text-white" />
                      </IconButton>
                      <IconButton
                        variant="transparent"
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation()
                          removeUploaded(index)
                        }}
                      >
                        <XMark className="text-red-400" />
                      </IconButton>
                    </div>
                    <Text className="text-white text-xs">#{index + 1}</Text>
                  </div>

                  {/* Бейдж WebP */}
                  {img.isWebP && (
                    <Badge
                      className="absolute bottom-1 left-1"
                      color="green"
                      size="small"
                    >
                      -{img.compressionRatio}%
                    </Badge>
                  )}
                </div>
              ))}
            </div>

            <Button
              onClick={handleAddToProduct}
              isLoading={isAddingImages}
              className="w-full"
            >
              Добавить к товару ({uploadedImages.length} изображений)
            </Button>
          </div>
        )}
      </div>
    </Container>
  )
}
