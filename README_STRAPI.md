# 🚀 Быстрый старт: Medusa + Strapi

## ✅ Что уже настроено

- ✅ Axios установлен
- ✅ Strapi сервис создан (`src/services/strapi.ts`)
- ✅ API эндпоинты созданы (`src/api/store/`)
- ✅ CORS настроен в Strapi
- ✅ Поддержка Docker/Coolify network

## 📋 Следующие шаги

### 1. Настроить переменные окружения

**Локально:**

Добавьте в `.env`:
```env
STRAPI_URL=http://localhost:1337
```

**Production (Coolify):**

Добавьте в `.env` Medusa контейнера:
```env
STRAPI_INTERNAL_URL=http://strapi:1337
STRAPI_EXTERNAL_URL=https://strapi.yourdomain.com
```

### 2. Создать контент-типы в Strapi

Запустите Strapi:
```bash
cd /Users/vadimplutahin/Проекты/karat-24/karat-24-strapi
npm run dev
```

Откройте http://localhost:1337/admin и создайте:

1. **Collection Type: Article**
   - title (Text, Required)
   - slug (UID, Required, Target: title)
   - description (Text, Required)
   - content (Rich Text, Required)
   - author (Text, Default: "Admin")
   - publishedDate (Date, Required)
   - coverImage (Media - Single)
   - category (Relation: Many-to-One → Category)
   - tags (Relation: Many-to-Many → Tag)
   - seo (Component: seo.seo)

2. **Collection Type: Page**
   - title (Text, Required)
   - slug (UID, Required)
   - content (Rich Text, Required)
   - seo (Component: seo.seo)

3. **Collection Type: Category**
   - name (Text, Required)
   - slug (UID, Required)
   - description (Text)

4. **Collection Type: Tag**
   - name (Text, Required)
   - slug (UID, Required)

5. **Component: seo.seo** (в категории "seo")
   - metaTitle (Text)
   - metaDescription (Text)
   - metaKeywords (Text)
   - ogTitle (Text)
   - ogDescription (Text)
   - ogImage (Media - Single)
   - canonicalURL (Text)
   - noIndex (Boolean)
   - noFollow (Boolean)
   - structuredData (JSON)

### 3. Настроить публичный доступ

Settings → Users & Permissions → Public → Permissions:
- ✅ Article: `find`, `findOne`
- ✅ Page: `find`, `findOne`
- ✅ Category: `find`, `findOne`
- ✅ Tag: `find`, `findOne`

### 4. Создать тестовый контент

1. Создайте 1-2 категории
2. Создайте 2-3 тега
3. Создайте 2-3 статьи с контентом
4. **Важно:** Опубликуйте весь контент!

### 5. Запустить и протестировать

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

**Тестовые запросы:**
```bash
# Список статей (через Medusa backend на порту 9000)
curl http://localhost:9000/store/articles

# Статья по slug
curl http://localhost:9000/store/articles/my-first-article

# Поиск
curl "http://localhost:9000/store/articles/search?q=test"

# Категории
curl http://localhost:9000/store/categories

# Теги
curl http://localhost:9000/store/tags
```

## 🔌 Доступные API эндпоинты

| Метод | Эндпоинт | Описание |
|-------|----------|----------|
| GET | `/store/articles` | Список статей |
| GET | `/store/articles/:slug` | Статья по slug |
| GET | `/store/articles/category/:slug` | Статьи категории |
| GET | `/store/articles/tag/:slug` | Статьи по тегу |
| GET | `/store/articles/search?q=query` | Поиск статей |
| GET | `/store/pages/:slug` | Страница по slug |
| GET | `/store/categories` | Список категорий |
| GET | `/store/tags` | Список тегов |

**Query параметры:**
- `locale` - язык (по умолчанию "ru")
- `page` - номер страницы (для articles)
- `pageSize` - кол-во на странице (для articles)

## 🐳 Деплой в Coolify

Смотрите подробную инструкцию: **`COOLIFY_SETUP.md`**

**Ключевые моменты:**
1. Strapi и Medusa в одной Docker network
2. `STRAPI_INTERNAL_URL=http://strapi:1337` для internal запросов
3. `STRAPI_EXTERNAL_URL=https://strapi.yourdomain.com` для изображений
4. Persistent Volume для SQLite базы Strapi

## 📚 Документация

- **STRAPI_INTEGRATION.md** - полная документация по интеграции
- **COOLIFY_SETUP.md** - настройка в Coolify/Docker
- **.env.example** - пример переменных окружения
- **examples/** - примеры использования

## 🔧 Использование в коде

```typescript
import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import StrapiService from "../services/strapi";

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const strapiService: StrapiService = req.scope.resolve("strapiService");
  
  // Получить все статьи
  const articles = await strapiService.getArticles("ru");
  
  // Получить статью по slug
  const article = await strapiService.getArticleBySlug("my-article", "ru");
  
  // Поиск статей
  const results = await strapiService.searchArticles("медуза", "ru");
  
  // Получить URL изображения
  const imageUrl = strapiService.getImageUrl("/uploads/image.jpg");
  // => https://strapi.yourdomain.com/uploads/image.jpg
  
  // Форматировать SEO
  const seo = strapiService.formatSEO(
    article.data.attributes.seo,
    article.data.attributes.title,
    article.data.attributes.description
  );
  
  res.json({ articles, article, results, imageUrl, seo });
}
```

## ⚠️ Важные замечания

### Docker Network

В production контейнеры **обязательно** должны быть в одной Docker network!

Проверка в Medusa контейнере:
```bash
curl http://strapi:1337/api/articles
```

Если не работает, проверьте имя контейнера:
```bash
ping strapi
# или
curl http://karat-24-strapi-xxx:1337/api/articles
```

### Переменные окружения

**Локально** достаточно одной переменной:
```env
STRAPI_URL=http://localhost:1337
```

**Production** нужны обе:
```env
STRAPI_INTERNAL_URL=http://strapi:1337              # Для API запросов
STRAPI_EXTERNAL_URL=https://strapi.yourdomain.com   # Для изображений
```

### SQLite Persistent Volume

В Coolify **обязательно** настройте Persistent Volume для Strapi:
```
Container Path: /app/.tmp
```

Иначе база данных будет очищаться при каждом перезапуске!

## 🆘 Troubleshooting

### Ошибка: "strapiService is not defined"

**Решение:** Перезапустите Medusa (сервис регистрируется автоматически)

### Ошибка: "Failed to fetch articles from Strapi"

**Решение:**
1. Проверьте, что Strapi запущен
2. Проверьте переменные окружения
3. Проверьте публичный доступ в Strapi

### Ошибка: "Article not found"

**Решение:** Убедитесь, что статья **опубликована** в Strapi

### Пустой ответ от API

**Решение:** Создайте контент в Strapi и опубликуйте его

## ✨ Готово!

Интеграция настроена. Теперь вы можете:
- ✅ Создавать контент в Strapi
- ✅ Получать его через Medusa API
- ✅ Использовать на фронтенде
- ✅ Деплоить в Coolify

**Удачи! 🚀**
