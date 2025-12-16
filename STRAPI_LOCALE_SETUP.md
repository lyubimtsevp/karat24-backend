# Настройка русской локали в Strapi

## Проблема
По умолчанию в Strapi используется только английский язык (en), но нам нужен русский (ru) как основной.

## Решение: Изменение дефолтной локали с English на Russian

### Шаг 1: Установить плагин i18n (если не установлен)

Плагин Internationalization обычно установлен по умолчанию. Проверьте:

```bash
# В директории karat-24-strapi
npm list @strapi/plugin-i18n
```

Если не установлен:
```bash
npm install @strapi/plugin-i18n
```

### Шаг 2: Изменить дефолтную локаль в конфигурации

Откройте файл конфигурации плагина i18n:

**Файл:** `karat-24-strapi/config/plugins.js` (или создайте если нет)

```javascript
module.exports = {
  // Другие плагины...
  
  i18n: {
    enabled: true,
    config: {
      defaultLocale: 'ru', // Изменяем с 'en' на 'ru'
      locales: ['ru', 'en'], // Доступные локали
    },
  },
};
```

### Шаг 3: Добавить русскую локаль через админку

1. Откройте **Strapi Admin** → `http://localhost:1337/admin`

2. Перейдите в **Settings** (⚙️ Настройки)

3. В разделе **GLOBAL SETTINGS** → **Internationalization**

4. Нажмите **Add new locale** (Добавить новую локаль)

5. Выберите:
   - **Locales:** Russian (ru)
   - **Display name:** Русский
   - Нажмите **Save**

6. Теперь у вас есть две локали: English (en) и Russian (ru)

### Шаг 4: Создать русские версии контента

Для каждого существующего контента (статьи, страницы):

1. Откройте **Content Manager** → **Article** (или другой тип)

2. Откройте существующую запись (например, "Тестовая статья")

3. В правом верхнем углу увидите **Locales**

4. Кликните на **English (en)** → выберите **Create new locale**

5. Выберите **Russian (ru)**

6. Заполните содержимое на русском языке

7. Нажмите **Save** и **Publish**

### Шаг 5: Настроить права доступа для русской локали

1. **Settings** → **Users & Permissions Plugin** → **Roles** → **Public**

2. Убедитесь, что разрешения включены для всех локалей:
   - ✅ Article → find
   - ✅ Article → findOne
   - ✅ Page → find
   - ✅ Page → findOne
   - И так далее

3. Нажмите **Save**

### Шаг 6: Обновить запросы в Medusa (опционально)

Если хотите использовать русский по умолчанию, измените в файле сервиса:

**Файл:** `src/services/strapi.ts`

Найдите методы с `locale = "ru"` - они уже используют русский! ✅

**Файл:** `src/api/store/articles/route.ts`

```typescript
const locale = (req.query.locale as string) || "ru"; // Уже настроено ✅
```

### Шаг 7: Перезапустить Strapi

```bash
# В директории karat-24-strapi
npm run develop
```

## Проверка

Теперь запросы работают с русской локалью:

```bash
# С русским (теперь должен вернуть данные)
curl "https://localhost:8443/store/articles?locale=ru"

# С английским (если есть английские версии)
curl "https://localhost:8443/store/articles?locale=en"
```

## Альтернатива: Миграция базы данных

Если у вас уже много контента на английском и нужно массово изменить локаль:

### Вариант A: Через SQL (PostgreSQL/SQLite)

```sql
-- ВНИМАНИЕ: Сделайте бakcup БД перед выполнением!

-- Изменить локаль всех статей с 'en' на 'ru'
UPDATE articles SET locale = 'ru' WHERE locale = 'en';

-- То же для страниц
UPDATE pages SET locale = 'ru' WHERE locale = 'en';
```

### Вариант B: Через Strapi API (скрипт)

Создайте скрипт `karat-24-strapi/scripts/migrate-locales.js`:

```javascript
const axios = require('axios');

const STRAPI_URL = 'http://localhost:1337';
const API_TOKEN = 'your-api-token'; // Создайте в Settings → API Tokens

async function migrateLocales() {
  // Получить все статьи на английском
  const { data: articles } = await axios.get(
    `${STRAPI_URL}/api/articles?locale=en`,
    {
      headers: { Authorization: `Bearer ${API_TOKEN}` }
    }
  );

  // Для каждой статьи создать русскую версию
  for (const article of articles.data) {
    await axios.post(
      `${STRAPI_URL}/api/articles`,
      {
        data: {
          ...article.attributes,
          locale: 'ru'
        }
      },
      {
        headers: { Authorization: `Bearer ${API_TOKEN}` }
      }
    );
    console.log(`Migrated: ${article.attributes.title}`);
  }
}

migrateLocales();
```

Запустить:
```bash
node scripts/migrate-locales.js
```

## Итог

После настройки:
- ✅ Русский язык доступен в Strapi
- ✅ Можно создавать контент на русском
- ✅ API Medusa использует `locale=ru` по умолчанию
- ✅ Админка Medusa имеет ссылки на редактирование контента
