import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import StrapiService from "../../../../services/strapi";
import { asClass } from "awilix";

/**
 * GET /store/articles/search?q=query
 * Поиск статей в Strapi
 * 
 * Query params:
 * - q: поисковый запрос (обязательно)
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
    const query = req.query.q as string;

    if (!query) {
      return res.status(400).json({
        error: "Query parameter 'q' is required",
      }) as any;
    }

    const locale = (req.query.locale as string) || "ru";
    const results = await strapiService.searchArticles(query, locale);

    res.json(results);
  } catch (error: any) {
    res.status(500).json({
      error: "Failed to search articles",
      message: error.message,
    });
  }
}
