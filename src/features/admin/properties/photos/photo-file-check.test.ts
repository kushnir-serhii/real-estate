import { describe, expect, it } from "vitest";
import { checkPhotoFile, freeSlots, outputHeight, outputWidths } from "./photo-file-check";

const MB = 1024 * 1024;

describe("checkPhotoFile", () => {
  it("accepts photos by type or by extension", () => {
    expect(checkPhotoFile({ name: "a.jpg", type: "image/jpeg", size: MB })).toBeNull();
    expect(checkPhotoFile({ name: "IMG_1.HEIC", type: "", size: MB })).toBeNull();
  });
  it("rejects other files, empty and too large ones", () => {
    expect(checkPhotoFile({ name: "a.pdf", type: "application/pdf", size: MB })).toMatch(/не фото/);
    expect(checkPhotoFile({ name: "a.png", type: "image/png", size: 0 })).toMatch(/порожній/);
    expect(checkPhotoFile({ name: "a.png", type: "image/png", size: 31 * MB })).toMatch(/до 30 МБ/);
  });
});

describe("output sizes", () => {
  it("never upscales", () => {
    expect(outputWidths(6000)).toEqual([480, 960, 1600]);
    expect(outputWidths(1200)).toEqual([480, 960, 1200]);
    expect(outputWidths(700)).toEqual([480, 700]);
    expect(outputWidths(300)).toEqual([300]);
  });
  it("keeps proportions", () => {
    expect(outputHeight(6000, 4000, 1600)).toBe(1067);
    expect(outputHeight(4000, 1, 480)).toBe(1);
  });
  it("counts free slots", () => {
    expect(freeSlots(38, 1)).toBe(1);
    expect(freeSlots(40, 3)).toBe(0);
  });
});
