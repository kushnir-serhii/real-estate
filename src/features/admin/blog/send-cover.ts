import { z } from "zod";

import type { ResizedOutput } from "@/features/admin/properties/photos/photo-resize";
import type { PhotoExt } from "@/features/admin/properties/photos/photo-limits";
import { POST_COVER_URL } from "./post-cover-contract";

/** Browser-only: posts the resized cover to the upload route with XHR (fetch has no upload progress). */

const TIMEOUT_MS = 120_000;

export type SendCoverResult = { ok: true; key: string; alt: string } | { ok: false; message: string };

const responseSchema = z.discriminatedUnion("ok", [
  z.object({ ok: z.literal(true), key: z.string(), alt: z.string() }),
  z.object({ ok: z.literal(false), error: z.string() }),
]);

const OFFLINE = "Немає зв'язку з сервером. Перевірте інтернет і спробуйте ще раз.";
const TIMEOUT = "Завантаження триває задовго. Перевірте інтернет і спробуйте ще раз.";
const GENERIC = "Не вдалося завантажити фото. Спробуйте ще раз.";
const SIGNED_OUT = "Сесія закінчилась. Увійдіть знову в іншій вкладці й спробуйте ще раз.";

const parse = (text: string): z.infer<typeof responseSchema> | null => {
  try {
    const parsed = responseSchema.safeParse(JSON.parse(text));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
};

type SendCoverInput = {
  postId: string;
  alt: string;
  ext: PhotoExt;
  output: ResizedOutput;
  /** 0..99 while sending. */
  onProgress: (percent: number) => void;
};

export const sendCover = ({ postId, alt, ext, output, onProgress }: SendCoverInput): Promise<SendCoverResult> =>
  new Promise((resolve) => {
    const form = new FormData();
    form.set("post_id", postId);
    form.set("ext", ext);
    form.set("width", String(output.width));
    form.set("height", String(output.height));
    form.set("alt", alt);
    form.set("cover", output.blob, `cover.${ext}`);

    const xhr = new XMLHttpRequest();
    xhr.open("POST", POST_COVER_URL);
    xhr.timeout = TIMEOUT_MS;
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && event.total > 0) {
        onProgress(Math.min(99, Math.round((event.loaded / event.total) * 100)));
      }
    };
    xhr.onload = () => {
      const body = parse(xhr.responseText);
      if (body?.ok && xhr.status >= 200 && xhr.status < 300) {
        resolve({ ok: true, key: body.key, alt: body.alt });
        return;
      }
      resolve({ ok: false, message: xhr.status === 401 ? SIGNED_OUT : body && !body.ok ? body.error : GENERIC });
    };
    xhr.onerror = () => resolve({ ok: false, message: OFFLINE });
    xhr.ontimeout = () => resolve({ ok: false, message: TIMEOUT });
    xhr.send(form);
  });
