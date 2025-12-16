import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import StrapiService from "../../../services/strapi";
import { asClass } from "awilix";

/**
 * GET /store/articles
 * Получить список статей из Strapi
 * 
 * Query params:
 * - locale: язык (по умолчанию "ru")
 * - page: номер страницы (по умолчанию 1)
 * - pageSize: кол-во на странице (по умолчанию 25)
 */

export async function GET(
  req: MedusaRequest,
  res: MedusaResponse
): Promise<void> {
  try {
    // Проверяем, зарегистрирован ли сервис, если нет - регистрируем
    if (!req.scope.hasRegistration("strapiService")) {
      req.scope.register({
        strapiService: asClass(StrapiService).singleton(),
      });
      console.log("[Route] StrapiService зарегистрирован");
    }

    const strapiService: StrapiService = req.scope.resolve("strapiService");
    
    const locale = (req.query.locale as string) || "ru";
    const page = parseInt((req.query.page as string) || "1");
    const pageSize = parseInt((req.query.pageSize as string) || "25");

    console.log(`[Route] Запрос статей: locale=${locale}, page=${page}, pageSize=${pageSize}`);

    const articles = await strapiService.getArticles(locale, {}, { page, pageSize });

    res.json(articles);
  } catch (error: any) {
    console.error("[Route] Ошибка:", error);
    res.status(500).json({
      error: "Failed to fetch articles",
      message: error.message,
    });
  }
}
