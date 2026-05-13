import { randomUUID } from "node:crypto";

export function nowIso(): string {
  return new Date().toISOString();
}

export function slugify(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

export function createId(prefix: string): string {
  return `${prefix}-${randomUUID().slice(0, 8)}`;
}

export function ensurePositiveInteger(value: number, fallback = 1): number {
  if (!Number.isFinite(value) || value < 1) {
    return fallback;
  }

  return Math.floor(value);
}
