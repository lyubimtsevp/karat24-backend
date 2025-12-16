import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import StrapiService from "../../../services/strapi";
import { asClass } from "awilix";

/**
 * GET /store/tags
 * Получить список тегов из Strapi
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
    const tags = await strapiService.getTags(locale);

    res.json(tags);
  } catch (error: any) {
    res.status(500).json({
      error: "Failed to fetch tags",
      message: error.message,
    });
  }
}
