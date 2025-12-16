import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { Modules } from "@medusajs/framework/utils";
import * as fs from "fs";
import * as path from "path";

// Путь к файлу бэкапа
const BACKUP_FILE = path.join(process.cwd(), "data", "media-backup.json");

// Тип записи бэкапа
interface MediaBackupEntry {
  id: string;
  product_id: string | null;
  url: string;
  s3_key: string;
  original_filename: string;
  mime_type: string;
  file_size: number;
  is_webp: boolean;
  uploaded_at: string;
  metadata?: Record<string, any>;
}

interface MediaBackup {
  version: string;
  updated_at: string;
  entries: MediaBackupEntry[];
}

// Убедимся что директория существует
function ensureBackupDir() {
  const dir = path.dirname(BACKUP_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

// Загрузка бэкапа
function loadBackup(): MediaBackup {
  ensureBackupDir();
  if (fs.existsSync(BACKUP_FILE)) {
    const data = fs.readFileSync(BACKUP_FILE, "utf-8");
    return JSON.parse(data);
  }
  return {
    version: "1.0",
    updated_at: new Date().toISOString(),
    entries: [],
  };
}

// Сохранение бэкапа
function saveBackup(backup: MediaBackup) {
  ensureBackupDir();
  backup.updated_at = new Date().toISOString();
  fs.writeFileSync(BACKUP_FILE, JSON.stringify(backup, null, 2), "utf-8");
}

/**
 * GET /admin/media-backup
 * Получение списка всех медиа-файлов из бэкапа
 */
export async function GET(
  req: MedusaRequest,
  res: MedusaResponse
): Promise<void> {
  try {
    const backup = loadBackup();
    
    // Параметры пагинации и фильтрации
    const { product_id, limit = "100", offset = "0", format } = req.query;
    
    let entries = backup.entries;
    
    // Фильтр по product_id
    if (product_id && typeof product_id === "string") {
      entries = entries.filter((e) => e.product_id === product_id);
    }
    
    // Пагинация
    const limitNum = parseInt(limit as string, 10);
    const offsetNum = parseInt(offset as string, 10);
    const paginatedEntries = entries.slice(offsetNum, offsetNum + limitNum);
    
    // Экспорт в CSV
    if (format === "csv") {
      const csv = generateCSV(entries);
      res.setHeader("Content-Type", "text/csv");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="media-backup-${Date.now()}.csv"`
      );
      res.status(200).send(csv);
      return;
    }
    
    res.status(200).json({
      version: backup.version,
      updated_at: backup.updated_at,
      total: entries.length,
      limit: limitNum,
      offset: offsetNum,
      entries: paginatedEntries,
    });
  } catch (error) {
    console.error("Ошибка получения бэкапа:", error);
    res.status(500).json({
      message: "Ошибка при получении бэкапа",
      error: error instanceof Error ? error.message : "Неизвестная ошибка",
    });
  }
}

/**
 * POST /admin/media-backup
 * Добавление записи в бэкап (вызывается при загрузке файла)
 */
export async function POST(
  req: MedusaRequest,
  res: MedusaResponse
): Promise<void> {
  try {
    const body = req.body as Partial<MediaBackupEntry> | Partial<MediaBackupEntry>[];
    
    const backup = loadBackup();
    
    // Поддержка массива записей
    const entries = Array.isArray(body) ? body : [body];
    
    for (const entry of entries) {
      if (!entry.url || !entry.s3_key) {
        continue;
      }
      
      const newEntry: MediaBackupEntry = {
        id: `media_${Date.now()}_${Math.random().toString(36).substring(7)}`,
        product_id: entry.product_id || null,
        url: entry.url,
        s3_key: entry.s3_key,
        original_filename: entry.original_filename || "unknown",
        mime_type: entry.mime_type || "application/octet-stream",
        file_size: entry.file_size || 0,
        is_webp: entry.is_webp || false,
        uploaded_at: new Date().toISOString(),
        metadata: entry.metadata,
      };
      
      backup.entries.push(newEntry);
    }
    
    saveBackup(backup);
    
    res.status(201).json({
      message: "Записи добавлены в бэкап",
      added: entries.length,
      total: backup.entries.length,
    });
  } catch (error) {
    console.error("Ошибка добавления в бэкап:", error);
    res.status(500).json({
      message: "Ошибка при добавлении в бэкап",
      error: error instanceof Error ? error.message : "Неизвестная ошибка",
    });
  }
}

/**
 * DELETE /admin/media-backup
 * Удаление записи из бэкапа
 */
export async function DELETE(
  req: MedusaRequest,
  res: MedusaResponse
): Promise<void> {
  try {
    const { id, s3_key } = req.query;
    
    const backup = loadBackup();
    const initialCount = backup.entries.length;
    
    if (id && typeof id === "string") {
      backup.entries = backup.entries.filter((e) => e.id !== id);
    } else if (s3_key && typeof s3_key === "string") {
      backup.entries = backup.entries.filter((e) => e.s3_key !== s3_key);
    } else {
      res.status(400).json({ message: "Укажите id или s3_key для удаления" });
      return;
    }
    
    const deletedCount = initialCount - backup.entries.length;
    saveBackup(backup);
    
    res.status(200).json({
      message: "Записи удалены",
      deleted: deletedCount,
      remaining: backup.entries.length,
    });
  } catch (error) {
    console.error("Ошибка удаления из бэкапа:", error);
    res.status(500).json({
      message: "Ошибка при удалении из бэкапа",
      error: error instanceof Error ? error.message : "Неизвестная ошибка",
    });
  }
}

// Генерация CSV
function generateCSV(entries: MediaBackupEntry[]): string {
  const headers = [
    "id",
    "product_id",
    "url",
    "s3_key",
    "original_filename",
    "mime_type",
    "file_size",
    "is_webp",
    "uploaded_at",
  ];
  
  const rows = entries.map((e) =>
    headers
      .map((h) => {
        const value = e[h as keyof MediaBackupEntry];
        if (value === null || value === undefined) return "";
        if (typeof value === "string" && value.includes(",")) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return String(value);
      })
      .join(",")
  );
  
  return [headers.join(","), ...rows].join("\n");
}

