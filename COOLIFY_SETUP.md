# 🐳 Настройка в Coolify (Docker)

## 📋 Предварительные требования

- Два отдельных Git репозитория (или ветки):
  - `karat-24` - Medusa backend
  - `karat-24-strapi` - Strapi CMS

## 🚀 Деплой

### 1. Создать Strapi контейнер

**Настройки:**
- **Source:** Git репозиторий `karat-24-strapi`
- **Build Pack:** Node.js
- **Port:** 1337
- **Domain:** `strapi.yourdomain.com`

**Persistent Storage (критично для SQLite!):**
```
Host Path: /var/lib/coolify/strapi-{id}/database
Container Path: /app/.tmp
```

**Environment Variables:**
```env
HOST=0.0.0.0
PORT=1337

# SQLite база
DATABASE_FILENAME=.tmp/data.db

# Секреты (скопировать из локального .env)
APP_KEYS=...
API_TOKEN_SALT=...
ADMIN_JWT_SECRET=...
TRANSFER_TOKEN_SALT=...
JWT_SECRET=...

# Medusa URLs (будут доступны после создания Medusa контейнера)
MEDUSA_BACKEND_URL=https://api.yourdomain.com
MEDUSA_ADMIN_URL=https://admin.yourdomain.com
FRONTEND_URL=https://yourdomain.com
```

### 2. Создать Medusa контейнер

**Настройки:**
- **Source:** Git репозиторий `karat-24`
- **Build Pack:** Node.js
- **Port:** 9000
- **Domain:** `api.yourdomain.com`

**Network:** 
- ⚠️ **Важно:** Выбрать ту же Docker network, что и у Strapi контейнера

**Environment Variables:**
```env
# Database (PostgreSQL для Medusa)
DATABASE_URL=postgresql://user:pass@postgres:5432/medusa

# Redis
REDIS_URL=redis://redis:6379

# JWT & Cookies
JWT_SECRET=your-jwt-secret
COOKIE_SECRET=your-cookie-secret

# CORS
STORE_CORS=https://yourdomain.com,https://shop.yourdomain.com
ADMIN_CORS=https://admin.yourdomain.com
AUTH_CORS=https://admin.yourdomain.com

# Backend URL
MEDUSA_BACKEND_URL=https://api.yourdomain.com

# S3 Storage
S3_BUCKET=e52e01db-34753286-a744-4ecf-acd1-5303dbd3c54f
S3_ENDPOINT=https://s3.twcstorage.ru
S3_REGION=ru-1
S3_ACCESS_KEY_ID=...
S3_SECRET_ACCESS_KEY=...
S3_FILE_URL=https://s3.twcstorage.ru/e52e01db-34753286-a744-4ecf-acd1-5303dbd3c54f

# Strapi Integration
STRAPI_INTERNAL_URL=http://strapi:1337
STRAPI_EXTERNAL_URL=https://strapi.yourdomain.com
# STRAPI_API_TOKEN=  # Опционально
```

### 3. Проверить имя Strapi контейнера

В Coolify найдите имя Strapi контейнера в Docker network.

**Вариант 1:** Стандартное имя `strapi`
```env
STRAPI_INTERNAL_URL=http://strapi:1337
```

**Вариант 2:** Полное имя контейнера (если стандартное не работает)

В терминале Medusa контейнера выполните:
```bash
# Проверить доступность
curl http://strapi:1337/api/articles

# Если не работает, попробуйте полное имя
curl http://karat-24-strapi-{id}:1337/api/articles
```

Обновите `STRAPI_INTERNAL_URL` соответственно.

## ✅ Проверка после деплоя

### 1. Проверить Strapi

```bash
curl https://strapi.yourdomain.com/api/articles
```

Должен вернуть JSON с данными или пустой массив.

### 2. Проверить Medusa → Strapi

```bash
curl https://api.yourdomain.com/store/articles
```

Должен вернуть данные из Strapi через Medusa API.

### 3. Проверить изображения

```bash
curl https://api.yourdomain.com/store/articles/test-article
```

URL изображений должны содержать `https://strapi.yourdomain.com`.

## 🔧 Troubleshooting

### Ошибка: "ECONNREFUSED" или "ENOTFOUND"

**Проблема:** Medusa не может подключиться к Strapi

**Решение:**
1. Проверьте, что оба контейнера в одной Docker network
2. Проверьте имя Strapi контейнера:
   ```bash
   # В терминале Medusa контейнера
   ping strapi
   ```
3. Обновите `STRAPI_INTERNAL_URL` на правильное имя контейнера

### База данных SQLite пустая после перезапуска

**Проблема:** Не настроен Persistent Volume

**Решение:**
1. В Coolify → Strapi контейнер → Storage
2. Добавить Volume:
   - Container Path: `/app/.tmp`
   - Host Path: автоматически создастся

### Изображения не загружаются

**Проблема:** Неправильный `STRAPI_EXTERNAL_URL`

**Решение:**
1. Проверьте переменную в Medusa контейнере
2. Должна быть: `https://strapi.yourdomain.com` (публичный URL)

### CORS ошибки

**Проблема:** Неправильно настроены CORS в Strapi

**Решение:**
1. Проверьте переменные окружения в Strapi:
   - `MEDUSA_BACKEND_URL`
   - `MEDUSA_ADMIN_URL`
   - `FRONTEND_URL`
2. Перезапустите Strapi контейнер

## 📊 Архитектура

```
┌─────────────────────┐
│  Medusa Storefront  │
│   yourdomain.com    │
│   (Port 8000 dev)   │
└──────────┬──────────┘
           │
           │ HTTPS
           ▼
┌─────────────────────┐      Docker Network      ┌─────────────────────┐
│   Medusa Backend    │◄────────────────────────►│    Strapi CMS       │
│  api.yourdomain.com │   http://strapi:1337     │ strapi.yourdomain.com│
│                     │                           │                     │
│ - API Endpoints     │   Internal Communication  │ - Content Types     │
│ - Products          │                           │ - Articles          │
│ - Orders            │                           │ - Pages             │
│ - Strapi Proxy      │                           │ - Media Library     │
└─────────────────────┘                           └─────────────────────┘
           │                                                 │
           │                                                 │
           ▼                                                 ▼
┌─────────────────────┐                           ┌─────────────────────┐
│   PostgreSQL DB     │                           │   SQLite DB         │
│   (Medusa data)     │                           │   (Strapi content)  │
└─────────────────────┘                           └─────────────────────┘
           │                                                 │
           ▼                                                 ▼
┌─────────────────────┐                           ┌─────────────────────┐
│   S3 Storage        │                           │  Persistent Volume  │
│   (Product images)  │                           │   /app/.tmp/        │
└─────────────────────┘                           └─────────────────────┘
```

**Ключевые моменты:**
- Medusa и Strapi общаются через внутреннюю Docker сеть (`http://strapi:1337`)
- Публичный доступ к изображениям через external URL (`https://strapi.yourdomain.com`)
- SQLite база Strapi хранится в Persistent Volume
- PostgreSQL для Medusa (для production данных)

## 📝 Checklist деплоя

- [ ] Strapi контейнер создан
- [ ] Persistent Volume настроен для `/app/.tmp`
- [ ] Strapi доступен по публичному URL
- [ ] Medusa контейнер создан
- [ ] Оба контейнера в одной Docker network
- [ ] `STRAPI_INTERNAL_URL` настроен в Medusa
- [ ] `STRAPI_EXTERNAL_URL` настроен в Medusa
- [ ] CORS настроен в Strapi
- [ ] Переменные `MEDUSA_BACKEND_URL` и т.д. в Strapi
- [ ] Тестовый контент создан в Strapi
- [ ] API эндпоинты работают
- [ ] Изображения загружаются корректно

## 🔐 Безопасность

### Рекомендации:

1. **API Tokens:** Создайте API token в Strapi для дополнительной защиты
2. **Rate Limiting:** Настройте в Coolify или через middleware
3. **Backup SQLite:** Настройте регулярные бэкапы файла `.tmp/data.db`
4. **Environment Variables:** Используйте Secrets в Coolify для чувствительных данных
5. **HTTPS:** Убедитесь, что все соединения используют HTTPS

## 📚 Дополнительно

- Основная документация: `STRAPI_INTEGRATION.md`
- Примеры кода: `/examples/`
- Локальная разработка: `README.md`
