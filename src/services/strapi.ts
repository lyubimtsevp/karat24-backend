import { MedusaContainer } from "@medusajs/medusa";
import axios, { AxiosInstance } from "axios";

/**
 * Конфигурация Strapi сервиса
 */
interface StrapiConfig {
  /** Internal URL для Docker network (http://strapi:1337) или локальный (http://localhost:1337) */
  internalUrl?: string;
  /** External URL для публичного доступа к медиа (https://strapi.yourdomain.com) */
  externalUrl?: string;
  /** API токен для защищенных эндпоинтов (опционально) */
  apiToken?: string;
}

/**
 * Strapi Article типы
 */
export interface StrapiArticle {
  id: number;
  attributes: {
    title: string;
    slug: string;
    description: string;
    content: string;
    author: string;
    publishedDate: string;
    coverImage?: {
      data: {
        attributes: {
          url: string;
          alternativeText: string;
        };
      };
    };
    category?: {
      data: {
        attributes: {
          name: string;
          slug: string;
        };
      };
    };
    tags?: {
      data: Array<{
        attributes: {
          name: string;
          slug: string;
        };
      }>;
    };
    seo?: {
      metaTitle: string;
      metaDescription: string;
      metaKeywords: string;
      ogTitle: string;
      ogDescription: string;
      ogImage?: {
        data: {
          attributes: {
            url: string;
          };
        };
      };
      canonicalURL: string;
      noIndex: boolean;
      noFollow: boolean;
      structuredData?: any;
    };
  };
}

/**
 * Strapi Page типы
 */
export interface StrapiPage {
  id: number;
  attributes: {
    title: string;
    slug: string;
    content: string;
    seo?: {
      metaTitle: string;
      metaDescription: string;
      metaKeywords: string;
      ogTitle: string;
      ogDescription: string;
      ogImage?: {
        data: {
          attributes: {
            url: string;
          };
        };
      };
      canonicalURL: string;
      noIndex: boolean;
      noFollow: boolean;
      structuredData?: any;
    };
  };
}

/**
 * Strapi Category типы
 */
export interface StrapiCategory {
  id: number;
  attributes: {
    name: string;
    slug: string;
    description?: string;
  };
}

/**
 * Strapi Tag типы
 */
export interface StrapiTag {
  id: number;
  attributes: {
    name: string;
    slug: string;
  };
}

/**
 * Strapi Response типы
 */
export interface StrapiResponse<T> {
  data: T;
  meta?: {
    pagination?: {
      page: number;
      pageSize: number;
      pageCount: number;
      total: number;
    };
  };
}

/**
 * Сервис для работы со Strapi CMS
 * 
 * Поддерживает:
 * - Internal URL для Docker network (backend-to-backend)
 * - External URL для публичных ресурсов (изображения, медиа)
 * - Кэширование и обработка ошибок
 */
class StrapiService {
  protected client: AxiosInstance;
  protected internalUrl: string;
  protected externalUrl: string;

  constructor() {
    // Internal URL - для API запросов между сервисами
    // В Docker: http://strapi:1337
    // Локально: http://localhost:1337
    this.internalUrl =
      process.env.STRAPI_INTERNAL_URL ||
      process.env.STRAPI_URL ||
      "http://localhost:1337";

    // External URL - для публичных ресурсов (изображения)
    // В production: https://strapi.yourdomain.com
    // Локально: http://localhost:1337
    this.externalUrl =
      process.env.STRAPI_EXTERNAL_URL ||
      process.env.STRAPI_URL ||
      "http://localhost:1337";

    // Создаем HTTP клиент для внутренних запросов
    this.client = axios.create({
      baseURL: this.internalUrl,
      timeout: 10000,
      headers: {
        "Content-Type": "application/json",
        ...(process.env.STRAPI_API_TOKEN
          ? { Authorization: `Bearer ${process.env.STRAPI_API_TOKEN}` }
          : {}),
      },
    });
  }

  /**
   * Получить список статей
   */
  async getArticles(
    locale = "ru",
    filters = {},
    pagination = { page: 1, pageSize: 25 }
  ): Promise<StrapiResponse<StrapiArticle[]>> {
    try {
      const response = await this.client.get("/api/articles", {
        params: {
          populate: "*",
          locale,
          ...filters,
          pagination,
        },
      });
      return response.data;
    } catch (error: any) {
      throw new Error(`Failed to fetch articles from Strapi: ${error.message}`);
    }
  }

  /**
   * Получить статью по slug
   */
  async getArticleBySlug(
    slug: string,
    locale = "ru"
  ): Promise<StrapiResponse<StrapiArticle>> {
    try {
      const response = await this.client.get(`/api/articles/${slug}`, {
        params: {
          populate: "*",
          locale,
        },
      });
      return response.data;
    } catch (error: any) {
      if (error.response?.status === 404) {
        return { data: null as any };
      }
      throw new Error(`Failed to fetch article "${slug}" from Strapi: ${error.message}`);
    }
  }

  /**
   * Получить статьи по категории
   */
  async getArticlesByCategory(
    categorySlug: string,
    locale = "ru"
  ): Promise<StrapiResponse<StrapiArticle[]>> {
    try {
      const response = await this.client.get("/api/articles", {
        params: {
          populate: "*",
          locale,
          filters: {
            category: {
              slug: {
                $eq: categorySlug,
              },
            },
          },
        },
      });
      return response.data;
    } catch (error: any) {
      throw new Error(
        `Failed to fetch articles by category "${categorySlug}": ${error.message}`
      );
    }
  }

  /**
   * Получить статьи по тегу
   */
  async getArticlesByTag(
    tagSlug: string,
    locale = "ru"
  ): Promise<StrapiResponse<StrapiArticle[]>> {
    try {
      const response = await this.client.get("/api/articles", {
        params: {
          populate: "*",
          locale,
          filters: {
            tags: {
              slug: {
                $eq: tagSlug,
              },
            },
          },
        },
      });
      return response.data;
    } catch (error: any) {
      throw new Error(`Failed to fetch articles by tag "${tagSlug}": ${error.message}`);
    }
  }

  /**
   * Получить список страниц
   */
  async getPages(locale = "ru"): Promise<StrapiResponse<StrapiPage[]>> {
    try {
      const response = await this.client.get("/api/pages", {
        params: {
          populate: "*",
          locale,
        },
      });
      return response.data;
    } catch (error: any) {
      throw new Error(`Failed to fetch pages from Strapi: ${error.message}`);
    }
  }

  /**
   * Получить страницу по slug
   */
  async getPageBySlug(
    slug: string,
    locale = "ru"
  ): Promise<StrapiResponse<StrapiPage>> {
    try {
      const response = await this.client.get(`/api/pages/${slug}`, {
        params: {
          populate: "*",
          locale,
        },
      });
      return response.data;
    } catch (error: any) {
      if (error.response?.status === 404) {
        return { data: null as any };
      }
      throw new Error(`Failed to fetch page "${slug}" from Strapi: ${error.message}`);
    }
  }

  /**
   * Получить список категорий
   */
  async getCategories(locale = "ru"): Promise<StrapiResponse<StrapiCategory[]>> {
    try {
      const response = await this.client.get("/api/categories", {
        params: {
          populate: "*",
          locale,
        },
      });
      return response.data;
    } catch (error: any) {
      throw new Error(`Failed to fetch categories from Strapi: ${error.message}`);
    }
  }

  /**
   * Получить список тегов
   */
  async getTags(locale = "ru"): Promise<StrapiResponse<StrapiTag[]>> {
    try {
      const response = await this.client.get("/api/tags", {
        params: {
          populate: "*",
          locale,
        },
      });
      return response.data;
    } catch (error: any) {
      throw new Error(`Failed to fetch tags from Strapi: ${error.message}`);
    }
  }

  /**
   * Поиск статей по тексту
   */
  async searchArticles(
    query: string,
    locale = "ru"
  ): Promise<StrapiResponse<StrapiArticle[]>> {
    try {
      const response = await this.client.get("/api/articles", {
        params: {
          populate: "*",
          locale,
          filters: {
            $or: [
              { title: { $containsi: query } },
              { description: { $containsi: query } },
              { content: { $containsi: query } },
            ],
          },
        },
      });
      return response.data;
    } catch (error: any) {
      throw new Error(`Failed to search articles with query "${query}": ${error.message}`);
    }
  }

  /**
   * Получить полный URL изображения
   * Использует externalUrl для публичного доступа
   */
  getImageUrl(url: string): string {
    if (!url) return "";
    if (url.startsWith("http")) {
      return url;
    }
    return `${this.externalUrl}${url}`;
  }

  /**
   * Форматировать SEO данные для frontend
   */
  formatSEO(seo: any, defaultTitle: string, defaultDescription: string) {
    if (!seo) {
      return {
        title: defaultTitle,
        description: defaultDescription,
        keywords: "",
        canonical: "",
        noIndex: false,
        noFollow: false,
        openGraph: {
          title: defaultTitle,
          description: defaultDescription,
          image: null,
        },
        structuredData: null,
      };
    }

    return {
      title: seo.metaTitle || defaultTitle,
      description: seo.metaDescription || defaultDescription,
      keywords: seo.metaKeywords || "",
      canonical: seo.canonicalURL || "",
      noIndex: seo.noIndex || false,
      noFollow: seo.noFollow || false,
      openGraph: {
        title: seo.ogTitle || seo.metaTitle || defaultTitle,
        description: seo.ogDescription || seo.metaDescription || defaultDescription,
        image: seo.ogImage?.data
          ? this.getImageUrl(seo.ogImage.data.attributes.url)
          : null,
      },
      structuredData: seo.structuredData || null,
    };
  }
}

export default StrapiService;
