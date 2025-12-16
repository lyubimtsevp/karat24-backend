import { defineWidgetConfig } from "@medusajs/admin-sdk"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { JewelryFieldsWidgetInner } from "./JewelryFieldsWidgetInner"
import type { DetailWidgetProps, AdminProduct } from "@medusajs/framework/types"

const queryClient = new QueryClient()

/**
 * Виджет расширенных полей для ювелирных изделий
 * Отображается на странице редактирования товара
 */
const ProductJewelryFieldsWidget = (props: DetailWidgetProps<AdminProduct>) => {
  return (
    <QueryClientProvider client={queryClient}>
      <JewelryFieldsWidgetInner {...props} />
    </QueryClientProvider>
  )
}

export const config = defineWidgetConfig({
  zone: "product.details.after",
})

export default ProductJewelryFieldsWidget

