import { isHeic, outputHeight, outputWidths } from "./photo-file-check";
import { MAX_PHOTO_DIMENSION, MAX_UPLOAD_BYTES, PHOTO_CONTENT_TYPES } from "./photo-limits";
import type { PhotoExt } from "./photo-limits";

/**
 * Browser-only: decodes a picked file (EXIF orientation applied), draws it at 480 / 960 / 1600 px wide
 * (never upscaled, each step from the previous one) and encodes WebP, or JPEG where WebP can't be encoded.
 */

export type ResizedOutput = { width: number; height: number; blob: Blob };
/** `width` / `height` of the largest output; outputs narrowest first. */
export type ResizedPhoto = { ext: PhotoExt; width: number; height: number; outputs: readonly ResizedOutput[] };
export type ResizeResult = { ok: true; photo: ResizedPhoto } | { ok: false; message: string; canRetry: boolean };

const HEIC_MESSAGE = "Цей формат браузер не відкриває. Збережіть фото як JPEG і спробуйте знову";
const BROKEN_MESSAGE = "Не вдалося відкрити фото. Можливо, файл пошкоджений.";
const FAILED_MESSAGE = "Не вдалося обробити фото. Спробуйте ще раз.";
const TOO_BIG_MESSAGE = "Фото не вдалося стиснути до 5 МБ. Виберіть інше.";
const SHAPE_MESSAGE = "Фото надто вузьке й високе. Обріжте його й спробуйте знову.";

/** First try, then one lower quality if a file comes out over MAX_UPLOAD_BYTES. */
const QUALITIES: Record<PhotoExt, readonly number[]> = { webp: [0.8, 0.65], jpg: [0.82, 0.7] };

/** Lets the browser paint between heavy steps. */
export const yieldToBrowser = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 0));

type Decoded = { source: CanvasImageSource; width: number; height: number; release: () => void };

const decodeWithBitmap = async (file: File): Promise<Decoded | null> => {
  if (typeof createImageBitmap !== "function") return null;
  try {
    const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
    return { source: bitmap, width: bitmap.width, height: bitmap.height, release: () => bitmap.close() };
  } catch {
    return null;
  }
};

/** Fallback for browsers whose createImageBitmap can't take the file or the options. */
const decodeWithImage = async (file: File): Promise<Decoded | null> => {
  const url = URL.createObjectURL(file);
  const image = new Image();
  image.decoding = "async";
  image.src = url;
  try {
    await image.decode();
    if (image.naturalWidth === 0 || image.naturalHeight === 0) throw new Error("empty image");
    return {
      source: image,
      width: image.naturalWidth,
      height: image.naturalHeight,
      release: () => URL.revokeObjectURL(url),
    };
  } catch {
    URL.revokeObjectURL(url);
    return null;
  }
};

type Surface = {
  source: CanvasImageSource;
  context: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;
  toBlob: (type: string, quality: number) => Promise<Blob | null>;
  /** Frees the pixels right away (Safari has a small total canvas budget). */
  release: () => void;
};

const createSurface = (width: number, height: number): Surface | null => {
  if (typeof OffscreenCanvas === "function") {
    const canvas = new OffscreenCanvas(width, height);
    const context = canvas.getContext("2d");
    if (context) {
      return {
        source: canvas,
        context,
        toBlob: (type, quality) => canvas.convertToBlob({ type, quality }).catch(() => null),
        release: () => {
          canvas.width = 0;
          canvas.height = 0;
        },
      };
    }
  }
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) return null;
  return {
    source: canvas,
    context,
    toBlob: (type, quality) => new Promise((resolve) => canvas.toBlob(resolve, type, quality)),
    release: () => {
      canvas.width = 0;
      canvas.height = 0;
    },
  };
};

let extPromise: Promise<PhotoExt> | null = null;

/** WebP when the browser really encodes it (Safari quietly returns PNG), else JPEG. Detected once. */
export const detectPhotoExt = (): Promise<PhotoExt> => {
  extPromise ??= (async (): Promise<PhotoExt> => {
    const surface = createSurface(2, 2);
    if (!surface) return "jpg";
    try {
      const blob = await surface.toBlob(PHOTO_CONTENT_TYPES.webp, 0.8);
      return blob?.type === PHOTO_CONTENT_TYPES.webp ? "webp" : "jpg";
    } finally {
      surface.release();
    }
  })();
  return extPromise;
};

type Encoded = { ok: true; blob: Blob } | { ok: false; message: string };

const encode = async (surface: Surface, ext: PhotoExt): Promise<Encoded> => {
  const type = PHOTO_CONTENT_TYPES[ext];
  for (const quality of QUALITIES[ext]) {
    const blob = await surface.toBlob(type, quality);
    if (!blob || blob.type !== type) return { ok: false, message: FAILED_MESSAGE };
    if (blob.size <= MAX_UPLOAD_BYTES) return { ok: true, blob };
  }
  return { ok: false, message: TOO_BIG_MESSAGE };
};

const resizeDecoded = async (decoded: Decoded, ext: PhotoExt): Promise<ResizeResult> => {
  // Widest first: each smaller size is drawn from the previous one (sharper and faster than from the source).
  const widths = outputWidths(decoded.width).reverse();
  const largest = widths[0];
  const largestHeight = outputHeight(decoded.width, decoded.height, largest);
  if (largestHeight > MAX_PHOTO_DIMENSION) return { ok: false, message: SHAPE_MESSAGE, canRetry: false };

  const surfaces: Surface[] = [];
  const outputs: ResizedOutput[] = [];
  try {
    let previous: Surface | null = null;
    for (const width of widths) {
      const height = outputHeight(decoded.width, decoded.height, width);
      const surface = createSurface(width, height);
      if (!surface) return { ok: false, message: FAILED_MESSAGE, canRetry: true };
      surfaces.push(surface);
      const { context } = surface;
      context.imageSmoothingEnabled = true;
      context.imageSmoothingQuality = "high";
      if (ext === "jpg") {
        // JPEG has no transparency: PNG cut-outs get a white background instead of black.
        context.fillStyle = "#ffffff";
        context.fillRect(0, 0, width, height);
      }
      context.drawImage(previous?.source ?? decoded.source, 0, 0, width, height);
      const encoded = await encode(surface, ext);
      if (!encoded.ok) return { ok: false, message: encoded.message, canRetry: true };
      outputs.push({ width, height, blob: encoded.blob });
      previous?.release();
      previous = surface;
      await yieldToBrowser();
    }
  } finally {
    for (const surface of surfaces) surface.release();
  }
  return { ok: true, photo: { ext, width: largest, height: largestHeight, outputs: outputs.reverse() } };
};

/** Never throws; the message is plain Ukrainian. */
export const resizePhoto = async (file: File): Promise<ResizeResult> => {
  try {
    const ext = await detectPhotoExt();
    const decoded = (await decodeWithBitmap(file)) ?? (await decodeWithImage(file));
    if (!decoded) return { ok: false, message: isHeic(file) ? HEIC_MESSAGE : BROKEN_MESSAGE, canRetry: false };
    try {
      await yieldToBrowser();
      return await resizeDecoded(decoded, ext);
    } finally {
      decoded.release();
    }
  } catch {
    // Out of memory or a canvas the browser refused: worth another try once other work is done.
    return { ok: false, message: FAILED_MESSAGE, canRetry: true };
  }
};
