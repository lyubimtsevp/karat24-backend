import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { Modules } from "@medusajs/framework/utils";
import { imageProcessor, ImageProcessor } from "../../utils/image-processor";
import * as fs from "fs";
import * as path from "path";

// Типы для файлового сервиса
type FileServiceUploadResult = {
  url: string;
  key: string;
};

// Путь к файлу бэкапа медиа
const BACKUP_FILE = path.join(process.cwd(), "data", "media-backup.json");

// Функция для добавления записи в бэкап
function addToMediaBackup(entry: {
  url: string;
  s3_key: string;
  original_filename: string;
  mime_type: string;
  file_size: number;
  is_webp: boolean;
  product_id?: string;
}) {
  try {
    const dir = path.dirname(BACKUP_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    let backup = { version: "1.0", updated_at: "", entries: [] as any[] };
    if (fs.existsSync(BACKUP_FILE)) {
      backup = JSON.parse(fs.readFileSync(BACKUP_FILE, "utf-8"));
    }

    backup.entries.push({
      id: `media_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      product_id: entry.product_id || null,
      url: entry.url,
      s3_key: entry.s3_key,
      original_filename: entry.original_filename,
      mime_type: entry.mime_type,
      file_size: entry.file_size,
      is_webp: entry.is_webp,
      uploaded_at: new Date().toISOString(),
    });

    backup.updated_at = new Date().toISOString();
    fs.writeFileSync(BACKUP_FILE, JSON.stringify(backup, null, 2), "utf-8");
    
    console.log(`[MediaBackup] Добавлена запись: ${entry.original_filename}`);
  } catch (error) {
    console.error("[MediaBackup] Ошибка записи в бэкап:", error);
  }
}

// Типы для ответа
type UploadResponse = {
  files: Array<{
    url: string;
    key: string;
    name: string;
    originalSize: number;
    processedSize: number;
    mimeType: string;
    isWebP: boolean;
    compressionRatio?: number;
    width?: number;
    height?: number;
  }>;
};

/**
 * POST /admin/uploads
 * Загрузка файлов с автоматической конвертацией изображений в WebP
 */
export async function POST(
  req: MedusaRequest,
  res: MedusaResponse
): Promise<void> {
  try {
    const fileService = req.scope.resolve(Modules.FILE);

    // Получаем файлы из запроса (multipart/form-data)
    const files = (req as any).files;

    if (!files || files.length === 0) {
      res.status(400).json({
        message: "Файлы не найдены в запросе",
      });
      return;
    }

    const uploadedFiles: UploadResponse["files"] = [];

    for (const file of files) {
      let fileBuffer = file.buffer;
      let fileName = file.originalname;
      let mimeType = file.mimetype;
      let isWebP = false;
      let compressionRatio: number | undefined;
      let width: number | undefined;
      let height: number | undefined;
      const originalSize = file.buffer.length;

      // Конвертируем изображения в WebP (кроме SVG и GIF)
      if (ImageProcessor.shouldConvertToWebP(mimeType)) {
        try {
          // Используем ImageProcessor для конвертации
          const processed = await imageProcessor.processImage(file.buffer, {
            quality: 85,
            maxWidth: 2560,
            maxHeight: 2560,
          });

          fileBuffer = processed.buffer;
          mimeType = processed.mimeType;
          isWebP = true;
          compressionRatio = processed.compressionRatio;
          width = processed.width;
          height = processed.height;

          // Обновляем имя файла
          const nameWithoutExt = fileName.replace(/\.[^/.]+$/, "");
          fileName = `${nameWithoutExt}.webp`;

          console.log(
            `[Upload] Конвертировано: ${file.originalname} -> ${fileName}, сжатие: ${compressionRatio}%`
          );
        } catch (conversionError) {
          console.error("Ошибка конвертации в WebP:", conversionError);
          // Если конвертация не удалась, загружаем оригинал
        }
      }

      // Генерируем уникальный ключ файла
      const timestamp = Date.now();
      const randomStr = Math.random().toString(36).substring(7);
      const fileKey = `uploads/${timestamp}-${randomStr}-${fileName}`;

      // Загружаем файл в хранилище
      const uploadResult = (await fileService.uploadFiles({
        files: [
          {
            filename: fileKey,
            mimeType: mimeType,
            content: fileBuffer,
          },
        ],
      })) as FileServiceUploadResult[];

      if (uploadResult && uploadResult.length > 0) {
        uploadedFiles.push({
          url: uploadResult[0].url,
          key: uploadResult[0].key,
          name: fileName,
          originalSize,
          processedSize: fileBuffer.length,
          mimeType,
          isWebP,
          compressionRatio,
          width,
          height,
        });

        // Записываем в бэкап медиа
        addToMediaBackup({
          url: uploadResult[0].url,
          s3_key: uploadResult[0].key,
          original_filename: file.originalname,
          mime_type: mimeType,
          file_size: fileBuffer.length,
          is_webp: isWebP,
        });
      }
    }

    res.status(200).json({
      files: uploadedFiles,
    } as UploadResponse);
  } catch (error) {
    console.error("Ошибка загрузки файлов:", error);
    res.status(500).json({
      message: "Ошибка при загрузке файлов",
      error: error instanceof Error ? error.message : "Неизвестная ошибка",
    });
  }
}

/**
 * GET /admin/uploads
 * Получение информации о загруженных файлах (опционально)
 */
export async function GET(
  req: MedusaRequest,
  res: MedusaResponse
): Promise<void> {
  res.status(200).json({
    message: "Используйте POST для загрузки файлов",
    supported_formats: ["jpg", "jpeg", "png", "gif", "webp", "svg"],
    auto_convert_to_webp: true,
    max_file_size: "10MB",
  });
}

