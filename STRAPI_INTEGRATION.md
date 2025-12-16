# 📚 Интеграция Strapi CMS с Medusa.js

## 🎯 Обзор

Проект интегрирует Strapi CMS для управления контентом (статьи, страницы) с Medusa.js backend.

Strapi и Medusa запускаются как **отдельные процессы**:
- **Локально**: оба на localhost
- **Production**: раздельные Docker контейнеры в Coolify

## 📁 Структура

```
src/
├── services/
│   └── strapi.ts              # Сервис для работы со Strapi API
└── api/store/
    ├── articles/
    │   ├── route.ts           # GET /store/articles
    │   ├── [slug]/route.ts    # GET /store/articles/:slug
    │   ├── category/[slug]/   # GET /store/articles/category/:slug
    │   ├── tag/[slug]/        # GET /store/articles/tag/:slug
    │   └── search/route.ts    # GET /store/articles/search?q=query
    ├── pages/
    │   └── [slug]/route.ts    # GET /store/pages/:slug
    ├── categories/route.ts    # GET /store/categories
    └── tags/route.ts          # GET /store/tags
```

## ⚙️ Настройка переменных окружения

### Локальная разработка

```env
# .env
STRAPI_URL=http://localhost:1337
```

Одной переменной достаточно для локальной разработки.

### Production (Coolify/Docker)

```env
# .env для Medusa контейнера
STRAPI_INTERNAL_URL=http://strapi:1337
STRAPI_EXTERNAL_URL=https://strapi.yourdomain.com
STRAPI_API_TOKEN=your-optional-token
```

**Важно:**
- `STRAPI_INTERNAL_URL` - для API запросов между контейнерами (Docker network)
  - Формат: `http://имя-контейнера:порт`
  - Пример: `http://strapi:1337`
  
- `STRAPI_EXTERNAL_URL` - для публичных ресурсов (изображения, медиа)
  - Формат: `https://публичный-домен`
  - Пример: `https://strapi.yourdomain.com`

## 🐳 Docker/Coolify настройка

### Контейнер 1: Strapi

```yaml
Настройки:
  Port: 1337
  Domain: strapi.yourdomain.com
  Persistent Volume: .tmp → /var/lib/coolify/strapi/database

Environment:
  HOST=0.0.0.0
  PORT=1337
  DATABASE_FILENAME=.tmp/data.db
  MEDUSA_BACKEND_URL=https://api.yourdomain.com
  MEDUSA_ADMIN_URL=https://admin.yourdomain.com
```

### Контейнер 2: Medusa

```yaml
Настройки:
  Port: 9000
  Domain: api.yourdomain.com
  Network: Shared с Strapi

Environment:
  # ... другие переменные
  STRAPI_INTERNAL_URL=http://strapi:1337
  STRAPI_EXTERNAL_URL=https://strapi.yourdomain.com
```

**Критично:** Оба контейнера должны быть в одной Docker network!

## 🔌 API Endpoints

### Статьи

**GET** `/store/articles`
```bash
curl "http://localhost:9000/store/articles?locale=ru&page=1&pageSize=25"
```

**GET** `/store/articles/:slug`
```bash
curl "http://localhost:9000/store/articles/my-article?locale=ru"
```

**GET** `/store/articles/category/:slug`
```bash
curl "http://localhost:9000/store/articles/category/news?locale=ru"
```

**GET** `/store/articles/tag/:slug`
```bash
curl "http://localhost:9000/store/articles/tag/technology?locale=ru"
```

**GET** `/store/articles/search`
```bash
curl "http://localhost:9000/store/articles/search?q=медуза&locale=ru"
```

### Страницы

**GET** `/store/pages/:slug`
```bash
curl "http://localhost:9000/store/pages/about?locale=ru"
```

### Категории и теги

**GET** `/store/categories`
```bash
curl "http://localhost:9000/store/categories?locale=ru"
```

**GET** `/store/tags`
```bash
curl "http://localhost:9000/store/tags?locale=ru"
```

## 🔧 Настройка Strapi

### 1. Создать контент-типы

В Strapi Admin (`http://localhost:1337/admin`):

**Collection Types:**
- **Article** - статьи блога
- **Page** - статические страницы
- **Category** - категории
- **Tag** - теги

**Component:**
- **seo.seo** - SEO поля

Подробная структура: см. `/examples/README.md`

### 2. Настроить публичный доступ

Settings → Users & Permissions → Public → Permissions:
- ✅ Article: `find`, `findOne`
- ✅ Page: `find`, `findOne`
- ✅ Category: `find`, `findOne`
- ✅ Tag: `find`, `findOne`

### 3. Обновить CORS

Файл: `karat-24-strapi/config/middlewares.js`

```javascript
{
  name: 'strapi::cors',
  config: {
    enabled: true,
    origin: [
      'http://localhost:9000',
      'http://localhost:7001',
      'http://localhost:3000',
      'https://localhost:8443',
      process.env.MEDUSA_BACKEND_URL,
      process.env.MEDUSA_ADMIN_URL,
      process.env.FRONTEND_URL,
    ].filter(Boolean),
    credentials: true,
  },
}
```

## 🚀 Запуск

### Локально

**Терминал 1 - Strapi:**
```bash
cd /Users/vadimplutahin/Проекты/karat-24/karat-24-strapi
npm run dev
```

**Терминал 2 - Medusa:**
```bash
cd /Users/vadimplutahin/Проекты/karat-24/karat-24
npm run dev
```

### Production (Coolify)

Оба контейнера запускаются автоматически через Coolify.

## 📝 Использование в коде

```typescript
import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import StrapiService from "../services/strapi";

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const strapiService: StrapiService = req.scope.resolve("strapiService");
  
  // Получить статьи
  const articles = await strapiService.getArticles("ru");
  
  // Получить статью
  const article = await strapiService.getArticleBySlug("my-article", "ru");
  
  // Форматировать изображение
  const imageUrl = strapiService.getImageUrl(article.data.attributes.coverImage?.data?.attributes.url);
  
  // Форматировать SEO
  const seo = strapiService.formatSEO(
    article.data.attributes.seo,
    article.data.attributes.title,
    article.data.attributes.description
  );
  
  res.json({ article, imageUrl, seo });
}
```

## 🔍 Диагностика

### Проверить доступность Strapi

**Из Medusa контейнера:**
```bash
# В локальной разработке
curl http://localhost:1337/api/articles

# В Docker контейнере
curl http://strapi:1337/api/articles
```

### Проверить URL изображений

```typescript
// Internal URL для API запросов
console.log(strapiService.internalUrl); 
// => http://strapi:1337

// External URL для публичных ресурсов
console.log(strapiService.externalUrl);
// => https://strapi.yourdomain.com

// Полный URL изображения
const imageUrl = strapiService.getImageUrl('/uploads/image.jpg');
// => https://strapi.yourdomain.com/uploads/image.jpg
```

## 🛠 Troubleshooting

### Ошибка: "Failed to fetch articles from Strapi"

1. Проверьте, запущен ли Strapi
2. Проверьте переменные окружения
3. В Docker: убедитесь, что контейнеры в одной сети

### Ошибка CORS

1. Обновите `middlewares.js` в Strapi
2. Добавьте нужные домены в `origin`
3. Перезапустите Strapi

### Изображения не загружаются

1. Проверьте `STRAPI_EXTERNAL_URL`
2. Убедитесь, что используется публичный URL
3. Проверьте настройки CORS в Strapi

## 📚 Дополнительно

- Strapi документация: https://docs.strapi.io
- Medusa документация: https://docs.medusajs.com
- Примеры кода: `/examples/`
