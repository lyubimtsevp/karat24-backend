import { defineMiddlewares } from "@medusajs/medusa";
import { asClass } from "awilix";
import multer from "multer";
import StrapiService from "../services/strapi";

/**
 * Глобальные middleware для приложения
 * 
 * Регистрируем кастомные сервисы в контейнере зависимостей
 */

let isServiceRegistered = false;

// Настройка multer для загрузки файлов в память
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB максимальный размер файла
    files: 10, // Максимум 10 файлов за раз
  },
  fileFilter: (req, file, cb) => {
    // Разрешаем изображения и видео
    const allowedMimeTypes = [
      "image/jpeg",
      "image/png",
      "image/gif",
      "image/webp",
      "image/svg+xml",
      "video/mp4",
      "video/webm",
      "video/quicktime",
    ];

    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Недопустимый тип файла: ${file.mimetype}`));
    }
  },
});

export default defineMiddlewares({
  routes: [
    {
      matcher: "*",
      middlewares: [
        (req, res, next) => {
          // Регистрируем сервис только один раз при первом запросе
          if (!isServiceRegistered) {
            try {
              req.scope.register({
                strapiService: asClass(StrapiService).singleton(),
              });
              isServiceRegistered = true;
              console.log("[Middleware] StrapiService зарегистрирован");
            } catch (error) {
              console.error("[Middleware] Ошибка регистрации StrapiService:", error);
            }
          }
          next();
        },
      ],
    },
    // Middleware для загрузки файлов
    {
      matcher: "/admin/uploads",
      method: ["POST"],
      middlewares: [
        upload.array("files", 10),
      ],
    },
  ],
});
