import { nanoid } from "nanoid";

export function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim()
    .replace(/^-|-$/g, "");
}

export function generateUniqueSlug(text: string): string {
  return `${generateSlug(text)}-${nanoid(6)}`;
}

export function parsePagination(query: any): { limit: number; offset: number } {
  const limit = Math.min(Math.max(parseInt(query.limit || "20", 10), 1), 100);
  const page = Math.max(parseInt(query.page || "1", 10), 1);
  const offset = (page - 1) * limit;
  return { limit, offset };
}

export function cookieOptions(secure: boolean = false) {
  return {
    httpOnly: true,
    secure,
    // Cross-site deployments (e.g. Vercel frontend + Render backend) require
    // SameSite=None for the browser to send the cookie at all; that value is
    // only valid when Secure is also set, so fall back to Lax for plain-HTTP
    // local dev.
    sameSite: (secure ? "none" : "lax") as "none" | "lax",
    path: "/",
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
  };
}

export function sanitizeForLike(input: string): string {
  return input.replace(/[%_\\]/g, "\\$&");
}
