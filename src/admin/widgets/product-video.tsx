import { defineWidgetConfig } from "@medusajs/admin-sdk"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { ProductVideoWidgetInner } from "./ProductVideoWidgetInner"
import type { DetailWidgetProps, AdminProduct } from "@medusajs/framework/types"

const queryClient = new QueryClient()

const ProductVideoWidget = (props: DetailWidgetProps<AdminProduct>) => {
  return (
    <QueryClientProvider client={queryClient}>
      <ProductVideoWidgetInner {...props} />
    </QueryClientProvider>
  )
}

export const config = defineWidgetConfig({
  zone: "product.details.after",
})

export default ProductVideoWidget
