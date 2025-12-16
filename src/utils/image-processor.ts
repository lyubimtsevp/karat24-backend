import sharp from "sharp";

/**
 * Настройки обработки изображений
 */
export interface ImageProcessingOptions {
  /** Качество WebP (1-100), по умолчанию 85 */
  quality?: number;
  /** Максимальная ширина, сохраняя пропорции */
  maxWidth?: number;
  /** Максимальная высота, сохраняя пропорции */
  maxHeight?: number;
  /** Создавать ли миниатюру */
  createThumbnail?: boolean;
  /** Размер миниатюры */
  thumbnailSize?: number;
}

/**
 * Результат обработки изображения
 */
export interface ProcessedImage {
  /** Обработанное изображение в формате WebP */
  buffer: Buffer;
  /** Оригинальный размер файла */
  originalSize: number;
  /** Размер после обработки */
  processedSize: number;
  /** Ширина изображения */
  width: number;
  /** Высота изображения */
  height: number;
  /** MIME-тип */
  mimeType: string;
  /** Процент сжатия */
  compressionRatio: number;
}

/**
 * Результат обработки с миниатюрой
 */
export interface ProcessedImageWithThumbnail extends ProcessedImage {
  thumbnail?: Buffer;
  thumbnailWidth?: number;
  thumbnailHeight?: number;
}

/**
 * Класс для обработки изображений
 * Конвертация в WebP, ресайз, создание миниатюр
 */
export class ImageProcessor {
  private defaultOptions: Required<ImageProcessingOptions> = {
    quality: 85,
    maxWidth: 2560,
    maxHeight: 2560,
    createThumbnail: false,
    thumbnailSize: 300,
  };

  /**
   * Проверяет, является ли MIME-тип изображением
   */
  static isImage(mimeType: string): boolean {
    return mimeType.startsWith("image/");
  }

  /**
   * Проверяет, нужно ли конвертировать изображение в WebP
   * SVG и GIF не конвертируются
   */
  static shouldConvertToWebP(mimeType: string): boolean {
    return (
      this.isImage(mimeType) &&
      !mimeType.includes("svg") &&
      !mimeType.includes("gif") &&
      !mimeType.includes("webp")
    );
  }

  /**
   * Обрабатывает изображение: конвертирует в WebP и оптимизирует
   */
  async processImage(
    input: Buffer,
    options: ImageProcessingOptions = {}
  ): Promise<ProcessedImage> {
    const opts = { ...this.defaultOptions, ...options };
    const originalSize = input.length;

    // Получаем метаданные оригинала
    const metadata = await sharp(input).metadata();

    // Определяем, нужен ли ресайз
    let pipeline = sharp(input);

    if (
      metadata.width &&
      metadata.height &&
      (metadata.width > opts.maxWidth || metadata.height > opts.maxHeight)
    ) {
      pipeline = pipeline.resize(opts.maxWidth, opts.maxHeight, {
        fit: "inside",
        withoutEnlargement: true,
      });
    }

    // Конвертируем в WebP
    const processedBuffer = await pipeline
      .webp({
        quality: opts.quality,
        effort: 4, // Баланс между скоростью и сжатием
      })
      .toBuffer();

    // Получаем метаданные обработанного изображения
    const processedMetadata = await sharp(processedBuffer).metadata();

    const processedSize = processedBuffer.length;
    const compressionRatio =
      originalSize > 0
        ? Math.round((1 - processedSize / originalSize) * 100)
        : 0;

    return {
      buffer: processedBuffer,
      originalSize,
      processedSize,
      width: processedMetadata.width || 0,
      height: processedMetadata.height || 0,
      mimeType: "image/webp",
      compressionRatio,
    };
  }

  /**
   * Обрабатывает изображение и создает миниатюру
   */
  async processImageWithThumbnail(
    input: Buffer,
    options: ImageProcessingOptions = {}
  ): Promise<ProcessedImageWithThumbnail> {
    const opts = { ...this.defaultOptions, ...options, createThumbnail: true };

    // Обрабатываем основное изображение
    const processed = await this.processImage(input, opts);

    // Создаем миниатюру
    const thumbnail = await sharp(input)
      .resize(opts.thumbnailSize, opts.thumbnailSize, {
        fit: "cover",
        position: "center",
      })
      .webp({
        quality: 80,
      })
      .toBuffer();

    const thumbnailMetadata = await sharp(thumbnail).metadata();

    return {
      ...processed,
      thumbnail,
      thumbnailWidth: thumbnailMetadata.width,
      thumbnailHeight: thumbnailMetadata.height,
    };
  }

  /**
   * Генерирует несколько размеров изображения (responsive images)
   */
  async generateResponsiveSizes(
    input: Buffer,
    sizes: number[] = [320, 640, 1024, 1920]
  ): Promise<Map<number, Buffer>> {
    const result = new Map<number, Buffer>();
    const metadata = await sharp(input).metadata();

    for (const size of sizes) {
      // Пропускаем размеры больше оригинала
      if (metadata.width && size > metadata.width) {
        continue;
      }

      const resized = await sharp(input)
        .resize(size, undefined, {
          fit: "inside",
          withoutEnlargement: true,
        })
        .webp({ quality: 85 })
        .toBuffer();

      result.set(size, resized);
    }

    return result;
  }

  /**
   * Оптимизирует изображение без изменения формата
   * Полезно для GIF и SVG
   */
  async optimizeWithoutFormatChange(
    input: Buffer,
    mimeType: string
  ): Promise<Buffer> {
    if (mimeType === "image/gif") {
      // GIF оптимизируем, сохраняя анимацию
      return await sharp(input, { animated: true })
        .gif({ effort: 7 })
        .toBuffer();
    }

    if (mimeType === "image/svg+xml") {
      // SVG возвращаем как есть (можно добавить SVGO)
      return input;
    }

    // Для остальных форматов просто возвращаем оригинал
    return input;
  }
}

// Экспортируем singleton экземпляр
export const imageProcessor = new ImageProcessor();

// Экспортируем по умолчанию для удобства
export default imageProcessor;

