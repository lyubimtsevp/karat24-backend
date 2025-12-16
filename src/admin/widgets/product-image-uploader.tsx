import { defineWidgetConfig } from "@medusajs/admin-sdk"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { ImageUploaderWidgetInner } from "./ImageUploaderWidgetInner"
import type { DetailWidgetProps, AdminProduct } from "@medusajs/framework/types"

const queryClient = new QueryClient()

/**
 * Виджет для загрузки изображений товара с drag-n-drop
 * Автоматическая конвертация в WebP
 */
const ProductImageUploaderWidget = (props: DetailWidgetProps<AdminProduct>) => {
  return (
    <QueryClientProvider client={queryClient}>
      <ImageUploaderWidgetInner {...props} />
    </QueryClientProvider>
  )
}

export const config = defineWidgetConfig({
  zone: "product.details.side.before",
})

export default ProductImageUploaderWidget

