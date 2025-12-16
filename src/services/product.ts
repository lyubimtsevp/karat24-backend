// src/services/product-handle-service.ts
import { MedusaContainer } from "@medusajs/medusa"
import type { ProductTypes } from "@medusajs/types"
import slugify from "slugify"

class ProductHandleService {
  private readonly productService: any

  constructor(container: MedusaContainer) {
    this.productService = container.resolve("productModuleService")
  }

  async create(productObject: ProductTypes.CreateProductDTO) {
    if (productObject.title && (!productObject.handle || productObject.handle === "")) {
      productObject.handle = slugify(productObject.title, {
        lower: true,
        strict: true,
        locale: "ru",
      })
    }

    return await this.productService.createProducts([productObject])
  }

  async update(id: string, update: ProductTypes.UpdateProductDTO) {
    if (update.title && (!update.handle || update.handle === "")) {
      update.handle = slugify(update.title, {
        lower: true,
        strict: true,
        locale: "ru",
      })
    }

    return await this.productService.updateProducts([{ id, ...update }])
  }
}

export default ProductHandleService
