import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import StrapiService from "../../../../../services/strapi";
import { asClass } from "awilix";

/**
 * GET /store/articles/category/:slug
 * Получить статьи по категории из Strapi
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
  const { slug } = req.params;

  try {
    const locale = (req.query.locale as string) || "ru";
    const articles = await strapiService.getArticlesByCategory(slug, locale);

    res.json(articles);
  } catch (error: any) {
    res.status(500).json({
      error: "Failed to fetch articles by category",
      message: error.message,
    });
  }
}
