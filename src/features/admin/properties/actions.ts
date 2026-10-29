"use server";

import { z } from "zod";
import { requireAdmin } from "@/lib/auth/admin-session";
import {
  createAdminProperty,
  deleteAdminDraft,
  getAdminProperty,
  hideAdminProperty,
  publishAdminProperty,
  updateAdminProperty,
  updateAdminPropertySeo,
  type AdminProperty,
} from "@/lib/db/admin-properties";
import { canCreateProperty, canEditProperty, type PropertyPermissions } from "@/lib/db/property-permissions";
import { revalidateProperty } from "@/lib/db/revalidate-property";
import { getSettings, type Settings } from "@/lib/db/settings";
import { parsePropertyFormRaw, parsePropertySeoForm, readPropertyFormRaw } from "./property-form-schema";
import type { PropertyActionState, PropertyFormState } from "./property-form-state";

const GENERIC_ERROR = "Не вдалося зберегти. Спробуйте ще раз.";
const NO_ACCESS = "Немає доступу";
const NOT_FOUND = "Об’єкт не знайдено. Можливо, його вже видалено.";
const AGENT_NOT_FOUND = "Агента не знайдено. Оберіть іншого.";

const idSchema = z.uuid();

const readId = (formData: FormData): string | null => {
  const parsed = idSchema.safeParse(formData.get("id"));
  return parsed.success ? parsed.data : null;
};

const logFailure = (action: string, error: unknown): void => {
  // The message only: no form values, no personal data.
  console.error(`${action} failed: ${error instanceof Error ? error.message : "unknown error"}`);
};

type Context =
  | { ok: false; message: string }
  | { ok: true; settings: Settings };

const adminContext = async (): Promise<Context> => {
  const admin = await requireAdmin();
  if (!admin.ok) return { ok: false, message: NO_ACCESS };
  return { ok: true, settings: await getSettings() };
};

type Loaded =
  | { ok: false; message: string }
  | { ok: true; property: AdminProperty; permissions: PropertyPermissions };

/** The stored row + what the current mode allows for it. Every action calls this before writing. */
const loadForWrite = async (formData: FormData, settings: Settings): Promise<Loaded> => {
  const id = readId(formData);
  if (id === null) return { ok: false, message: NOT_FOUND };
  const property = await getAdminProperty(id);
  if (property === null) return { ok: false, message: NOT_FOUND };
  return { ok: true, property, permissions: canEditProperty(settings.properties_source, property.source) };
};

/**
 * Create (no `id` in the form) or save (`id` = uuid). Admin only; the mode is read on the server:
 * `admin` mode saves every field; `plektan` mode refuses to create and saves only `seo_title` /
 * `seo_description` (the other inputs are disabled in the form, so they are not even posted).
 * Form fields: see `PROPERTY_FORM_FIELDS`, plus the hidden `id` when editing.
 */
export const saveProperty = async (_prev: PropertyFormState, formData: FormData): Promise<PropertyFormState> => {
  const raw = readPropertyFormRaw(formData);
  try {
    const context = await adminContext();
    if (!context.ok) return { status: "error", message: context.message, values: raw };
    const { settings } = context;

    if (formData.get("id") === null || formData.get("id") === "") {
      if (!canCreateProperty(settings.properties_source)) {
        return {
          status: "error",
          message: "Створення об’єктів вимкнено: каталог зараз веде Plektan. Змінити це можна в налаштуваннях.",
          values: raw,
        };
      }
      const parsed = parsePropertyFormRaw(raw);
      if (!parsed.ok) return { status: "invalid", errors: parsed.errors, values: raw };
      const created = await createAdminProperty(parsed.values);
      if (!created.ok) return { status: "invalid", errors: { agent_id: AGENT_NOT_FOUND }, values: raw };
      revalidateProperty(created.id, [created.slug]);
      return { status: "created", id: created.id, geocode: created.geocode };
    }

    const loaded = await loadForWrite(formData, settings);
    if (!loaded.ok) return { status: "error", message: loaded.message, values: raw };
    const { property, permissions } = loaded;

    if (permissions.fields === "seo") {
      const seo = parsePropertySeoForm(formData);
      if (!seo.ok) return { status: "invalid", errors: seo.errors, values: raw };
      const saved = await updateAdminPropertySeo(property.id, seo.values);
      if (!saved.ok) return { status: "error", message: NOT_FOUND, values: raw };
      revalidateProperty(property.id, [saved.slug]);
      return { status: "seo_saved" };
    }

    const parsed = parsePropertyFormRaw(raw);
    if (!parsed.ok) return { status: "invalid", errors: parsed.errors, values: raw };
    const saved = await updateAdminProperty(property.id, parsed.values, property);
    if (!saved.ok) {
      return saved.reason === "agent_not_found"
        ? { status: "invalid", errors: { agent_id: AGENT_NOT_FOUND }, values: raw }
        : { status: "error", message: NOT_FOUND, values: raw };
    }
    revalidateProperty(property.id, [saved.previousSlug, saved.slug]);
    return {
      status: "saved",
      slug: saved.slug,
      slugChanged: saved.slug !== saved.previousSlug,
      geocode: saved.geocode,
    };
  } catch (error) {
    logFailure("saveProperty", error);
    return { status: "error", message: GENERIC_ERROR, values: raw };
  }
};

/** Publishes after checking deal, type, locality and title. Needs `permissions.publish`. Form field: `id`. */
export const publishProperty = async (_prev: PropertyActionState, formData: FormData): Promise<PropertyActionState> => {
  try {
    const context = await adminContext();
    if (!context.ok) return { status: "error", message: context.message };
    const loaded = await loadForWrite(formData, context.settings);
    if (!loaded.ok) return { status: "error", message: loaded.message };
    if (!loaded.permissions.publish) {
      return { status: "error", message: "Публікувати цей об’єкт зараз не можна: каталог веде Plektan." };
    }

    const result = await publishAdminProperty(loaded.property.id);
    if (!result.ok) {
      switch (result.reason) {
        case "not_found":
          return { status: "error", message: NOT_FOUND };
        case "incomplete":
          return { status: "incomplete", missing: result.missing };
        default: {
          const unreachable: never = result;
          return unreachable;
        }
      }
    }
    revalidateProperty(loaded.property.id, [result.slug]);
    return { status: "published" };
  } catch (error) {
    logFailure("publishProperty", error);
    return { status: "error", message: "Не вдалося опублікувати. Спробуйте ще раз." };
  }
};

/** Hides a property (the site shows a «sold» page for 7 days, then 404). Needs `permissions.publish`. Field: `id`. */
export const hideProperty = async (_prev: PropertyActionState, formData: FormData): Promise<PropertyActionState> => {
  try {
    const context = await adminContext();
    if (!context.ok) return { status: "error", message: context.message };
    const loaded = await loadForWrite(formData, context.settings);
    if (!loaded.ok) return { status: "error", message: loaded.message };
    if (!loaded.permissions.publish) {
      return { status: "error", message: "Сховати цей об’єкт зараз не можна: каталог веде Plektan." };
    }

    const result = await hideAdminProperty(loaded.property.id);
    if (!result.ok) return { status: "error", message: NOT_FOUND };
    revalidateProperty(loaded.property.id, [result.slug]);
    return { status: "hidden" };
  } catch (error) {
    logFailure("hideProperty", error);
    return { status: "error", message: "Не вдалося сховати. Спробуйте ще раз." };
  }
};

/** Deletes a never-published draft (row + its R2 photos). Needs full edit rights (`admin` mode). Field: `id`. */
export const deleteDraft = async (_prev: PropertyActionState, formData: FormData): Promise<PropertyActionState> => {
  try {
    const context = await adminContext();
    if (!context.ok) return { status: "error", message: context.message };
    const loaded = await loadForWrite(formData, context.settings);
    if (!loaded.ok) return { status: "error", message: loaded.message };
    if (loaded.permissions.fields !== "all") {
      return { status: "error", message: "Видаляти об’єкти зараз не можна: каталог веде Plektan." };
    }

    const result = await deleteAdminDraft(loaded.property.id);
    if (!result.ok) {
      switch (result.reason) {
        case "not_found":
          return { status: "error", message: NOT_FOUND };
        case "published":
          return { status: "error", message: "Опублікований об’єкт видалити не можна, його можна лише сховати." };
        default: {
          const unreachable: never = result;
          return unreachable;
        }
      }
    }
    revalidateProperty(loaded.property.id, [result.slug]);
    return { status: "deleted" };
  } catch (error) {
    logFailure("deleteDraft", error);
    return { status: "error", message: "Не вдалося видалити. Спробуйте ще раз." };
  }
};
