import { defineConfig, loadEnv, Modules } from "@medusajs/framework/utils";

loadEnv(process.env.NODE_ENV || "development", process.cwd());

export default defineConfig({
  projectConfig: {
    databaseUrl: process.env.DATABASE_URL,
    databaseDriverOptions: {
      connection: {
        ssl: false,
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
    // Используем локальное хранилище для разработки
    [Modules.FILE]: {
      resolve: "@medusajs/file",
      options: {
        providers: [
          {
            resolve: "@medusajs/file-local",
            id: "local",
            options: {
              upload_dir: "uploads",
              backend_url: "http://localhost:9000",
            },
          },
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

