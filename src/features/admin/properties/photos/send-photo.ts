import { z } from "zod";

import type { UploadedPhoto } from "./photo-limits";
import type { ResizedPhoto } from "./photo-resize";

/** Browser-only: posts a resized photo to the upload route with XHR (fetch has no upload progress). */

export const PHOTO_UPLOAD_URL = "/api/admin/photos";
const TIMEOUT_MS = 120_000;

export type SendPhotoResult = { ok: true; photo: UploadedPhoto } | { ok: false; message: string; canRetry: boolean };

const responseSchema = z.discriminatedUnion("ok", [
  z.object({
    ok: z.literal(true),
    photo: z.object({
      id: z.string(),
      position: z.number().int(),
      r2_key: z.string(),
      sizes: z.record(z.string(), z.string()),
      width: z.number().int().nullable(),
      height: z.number().int().nullable(),
    }),
  }),
  z.object({ ok: z.literal(false), error: z.string() }),
]);

const OFFLINE = "Немає зв'язку з сервером. Перевірте інтернет і спробуйте ще раз.";
const TIMEOUT = "Завантаження триває задовго. Перевірте інтернет і спробуйте ще раз.";
const GENERIC = "Не вдалося завантажити фото. Спробуйте ще раз.";
const SIGNED_OUT = "Сесія закінчилась. Увійдіть знову в іншій вкладці й натисніть «Повторити».";

/** Statuses after which the same request can succeed later. */
const RETRYABLE = new Set([401, 408, 429, 500, 502, 503, 504]);

const parse = (text: string): z.infer<typeof responseSchema> | null => {
  try {
    const parsed = responseSchema.safeParse(JSON.parse(text));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
};

type SendPhotoInput = {
  propertyId: string;
  photo: ResizedPhoto;
  /** 0..99 while sending; the result replaces it. */
  onProgress: (percent: number) => void;
};

export const sendPhoto = ({ propertyId, photo, onProgress }: SendPhotoInput): Promise<SendPhotoResult> =>
  new Promise((resolve) => {
    const form = new FormData();
    form.set("property_id", propertyId);
    form.set("ext", photo.ext);
    form.set("width", String(photo.width));
    form.set("height", String(photo.height));
    for (const output of photo.outputs) {
      form.append(`w${output.width}`, output.blob, `w${output.width}.${photo.ext}`);
    }

    const xhr = new XMLHttpRequest();
    xhr.open("POST", PHOTO_UPLOAD_URL);
    xhr.timeout = TIMEOUT_MS;
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && event.total > 0) {
        onProgress(Math.min(99, Math.round((event.loaded / event.total) * 100)));
      }
    };
    xhr.onload = () => {
      const body = parse(xhr.responseText);
      if (body?.ok && xhr.status >= 200 && xhr.status < 300) {
        resolve({ ok: true, photo: body.photo });
        return;
      }
      const message = xhr.status === 401 ? SIGNED_OUT : body && !body.ok ? body.error : GENERIC;
      resolve({ ok: false, message, canRetry: RETRYABLE.has(xhr.status) });
    };
    xhr.onerror = () => resolve({ ok: false, message: OFFLINE, canRetry: true });
    xhr.ontimeout = () => resolve({ ok: false, message: TIMEOUT, canRetry: true });
    xhr.send(form);
  });
