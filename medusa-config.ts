import { defineConfig, loadEnv, Modules } from "@medusajs/framework/utils";

loadEnv(process.env.NODE_ENV || "development", process.cwd());

// Определяем провайдеры файлового хранилища в зависимости от окружения
const isProduction = process.env.NODE_ENV === "production";
const useS3 = process.env.S3_ACCESS_KEY_ID && process.env.S3_SECRET_ACCESS_KEY;

// Провайдер S3 для продакшена (twcstorage.ru)
const s3Provider = {
  resolve: "@medusajs/file-s3",
  id: "s3",
  options: {
    file_url: process.env.S3_FILE_URL || "https://s3.twcstorage.ru",
    access_key_id: process.env.S3_ACCESS_KEY_ID!,
    secret_access_key: process.env.S3_SECRET_ACCESS_KEY!,
    region: process.env.S3_REGION || "ru-central1",
    bucket: process.env.S3_BUCKET || "karat24",
    endpoint: process.env.S3_ENDPOINT || "https://s3.twcstorage.ru",
    // Дополнительные настройки для совместимости с S3-compatible хранилищами
    additional_client_config: {
      forcePathStyle: true,
    },
  },
};

// Провайдер локального хранилища для разработки
const localProvider = {
  resolve: "@medusajs/file-local",
  id: "local",
  options: {
    upload_dir: "uploads",
    backend_url: process.env.BACKEND_URL || "http://localhost:9000",
  },
};

export default defineConfig({
  projectConfig: {
    databaseUrl: process.env.DATABASE_URL,
    databaseDriverOptions: {
      connection: {
        ssl: isProduction ? { rejectUnauthorized: false } : false,
      },
    },
    databaseLogging: false,
    redisUrl: process.env.REDIS_URL,
    http: {
      storeCors: process.env.STORE_CORS!,
      adminCors: process.env.ADMIN_CORS!,
      authCors: process.env.AUTH_CORS!,
      jwtSecret: process.env.JWT_SECRET || "supersecret",
      cookieSecret: process.env.COOKIE_SECRET || "supersecret",
    },
  },
  modules: {
    [Modules.PRICING]: {
      resolve: "@medusajs/pricing",
    },
    // Выбираем провайдер в зависимости от окружения
    [Modules.FILE]: {
      resolve: "@medusajs/file",
      options: {
        providers: [
          useS3 ? s3Provider : localProvider,
        ],
      },
    },
  },
  admin: {
    disable: false,
    vite: () => ({
      server: {
        allowedHosts: ["localhost", "127.0.0.1", "0.0.0.0"],
      },
    }),
  },
});

