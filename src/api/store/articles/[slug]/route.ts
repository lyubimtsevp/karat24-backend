import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import StrapiService from "../../../../services/strapi";
import { asClass } from "awilix";

/**
 * GET /store/articles/:slug
 * Получить статью по slug из Strapi
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
    const article = await strapiService.getArticleBySlug(slug, locale);

    if (!article.data) {
      return res.status(404).json({
        error: "Article not found",
        slug,
      }) as any;
    }

    res.json(article);
  } catch (error: any) {
    res.status(500).json({
      error: "Failed to fetch article",
      message: error.message,
    });
  }
}
