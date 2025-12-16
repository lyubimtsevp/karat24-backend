import { defineConfig, loadEnv, Modules } from "@medusajs/framework/utils";
import path from "path";

loadEnv(process.env.NODE_ENV || "development", process.cwd());

export default defineConfig({
  projectConfig: {
    databaseUrl: process.env.DATABASE_URL,
    databaseDriverOptions: {
      connection: {
        ssl: false,
      },
    },
    redisUrl: process.env.REDIS_URL,
    http: {
      storeCors: process.env.STORE_CORS!,
      adminCors: process.env.ADMIN_CORS!,
      authCors: process.env.AUTH_CORS!,
      jwtSecret: process.env.JWT_SECRET!,
      cookieSecret: process.env.COOKIE_SECRET!,
    },
  },
  modules: {
    [Modules.PRICING]: {
      resolve: "@medusajs/pricing",
    },
    [Modules.FILE]: {
      resolve: "@medusajs/file",
      options: {
        providers: [
          {
            resolve: "@medusajs/file-s3",
            id: "s3",
            options: {
              bucket: process.env.S3_BUCKET!,
              access_key_id: process.env.S3_ACCESS_KEY_ID!,
              secret_access_key: process.env.S3_SECRET_ACCESS_KEY!,
              region: process.env.S3_REGION!,
              endpoint: process.env.S3_ENDPOINT!,
              file_url: process.env.S3_FILE_URL!,
              download_url_duration: 60 * 60 * 24,
              force_path_style: true,
              cache_control: "max-age=31536000",
            },
          },
        ],
      },
    },
  },
  admin: {
    vite: () => ({
      resolve: {
        alias: {
          "/src": path.resolve(process.cwd(), "src"),
          "/app": process.cwd(),
        },
      },
      server: {
        allowedHosts: [
          "app.dewpanelrc.ru",
          "jvvbebywdv.a.pinggy.link",
          "localhost",
          "127.0.0.1",
          "0.0.0.0",
          "::1",
        ],
      },
    }),
  },
});
