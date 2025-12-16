import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import StrapiService from "../../../services/strapi";
import { asClass } from "awilix";

/**
 * GET /store/categories
 * Получить список категорий из Strapi
 * 
 * Query params:
 * - locale: язык (по умолчанию "ru")
 */
export async function GET(
  req: MedusaRequest,
  res: MedusaResponse
): Promise<void> {
  if (!req.scope.hasRegistration("strapiService")) {
    req.scope.register({ strapiService: asClass(StrapiService).singleton() });
  }
  const strapiService: StrapiService = req.scope.resolve("strapiService");

  try {
    const locale = (req.query.locale as string) || "ru";
    const categories = await strapiService.getCategories(locale);

    res.json(categories);
  } catch (error: any) {
    res.status(500).json({
      error: "Failed to fetch categories",
      message: error.message,
    });
  }
}
