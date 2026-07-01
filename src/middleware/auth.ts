import { Request, Response, NextFunction } from "express";
import { jwtVerify, SignJWT } from "jose";
import { ENV } from "../config/env.js";
import { db } from "../config/db.js";
import { users, reporters, advertisers } from "../../drizzle/schema.js";
import { eq } from "drizzle-orm";

const SECRET = new TextEncoder().encode(ENV.jwtSecret);

// ─── Token Helpers ───────────────────────────────────────────────────────────

export async function signUserToken(userId: number, role: string): Promise<string> {
  return new SignJWT({ userId, role, type: "user" })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("30d")
    .sign(SECRET);
}

export async function signReporterToken(reporterId: number): Promise<string> {
  return new SignJWT({ reporterId, type: "reporter" })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("30d")
    .sign(SECRET);
}

export async function signAdvertiserToken(advertiserId: number): Promise<string> {
  return new SignJWT({ advertiserId, type: "advertiser" })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("30d")
    .sign(SECRET);
}

// ─── Middleware: Authenticate User (optional — attaches user if token present) ─

export async function optionalAuth(req: Request, _res: Response, next: NextFunction) {
  try {
    const token = req.cookies?.token || extractBearerToken(req);
    if (!token) return next();

    const { payload } = await jwtVerify(token, SECRET);
    if ((payload as any).type !== "user") return next();

    const userId = (payload as any).userId as number;
    const [user] = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        phone: users.phone,
        role: users.role,
        avatarUrl: users.avatarUrl,
        isVerified: users.isVerified,
        deletedAt: users.deletedAt,
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (user && !user.deletedAt) (req as any).user = user;
  } catch {
    // Invalid token — continue as unauthenticated
  }
  next();
}

// ─── Middleware: Require Authenticated User ──────────────────────────────────

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  await optionalAuth(req, res, () => {});
  if (!(req as any).user) {
    return res.status(401).json({ error: "Authentication required" });
  }
  next();
}

// ─── Middleware: Require Role ────────────────────────────────────────────────

export function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = (req as any).user;
    if (!user) return res.status(401).json({ error: "Authentication required" });
    if (!roles.includes(user.role)) {
      return res.status(403).json({ error: "Insufficient permissions" });
    }
    next();
  };
}

export const requireEditor = requireRole("editor", "admin", "super_admin");
export const requireAdmin = requireRole("admin", "super_admin");
export const requireSuperAdmin = requireRole("super_admin");

// ─── Middleware: Require Reporter Auth ──────────────────────────────────────

export async function requireReporterAuth(req: Request, res: Response, next: NextFunction) {
  try {
    const token = req.cookies?.reporter_token || extractBearerToken(req);
    if (!token) return res.status(401).json({ error: "Reporter authentication required" });

    const { payload } = await jwtVerify(token, SECRET);
    if ((payload as any).type !== "reporter") {
      return res.status(401).json({ error: "Invalid reporter token" });
    }

    const reporterId = (payload as any).reporterId as number;
    const [reporter] = await db
      .select({
        id: reporters.id,
        employeeId: reporters.employeeId,
        name: reporters.name,
        nameHindi: reporters.nameHindi,
        email: reporters.email,
        phone: reporters.phone,
        photoUrl: reporters.photoUrl,
        designation: reporters.designation,
        beat: reporters.beat,
        city: reporters.city,
        state: reporters.state,
        status: reporters.status,
        submissionsCount: reporters.submissionsCount,
        approvedCount: reporters.approvedCount,
        totalViewsCount: reporters.totalViewsCount,
        idCardExpiry: reporters.idCardExpiry,
        siteId: reporters.siteId,
      })
      .from(reporters)
      .where(eq(reporters.id, reporterId))
      .limit(1);

    if (!reporter) return res.status(401).json({ error: "Reporter not found" });
    if (reporter.status === "suspended") return res.status(403).json({ error: "Account suspended" });

    (req as any).reporter = reporter;
    next();
  } catch {
    return res.status(401).json({ error: "Invalid reporter token" });
  }
}

// ─── Middleware: Require Advertiser Auth ─────────────────────────────────────

export async function requireAdvertiserAuth(req: Request, res: Response, next: NextFunction) {
  try {
    const token = req.cookies?.advertiser_token || extractBearerToken(req);
    if (!token) return res.status(401).json({ error: "Advertiser authentication required" });

    const { payload } = await jwtVerify(token, SECRET);
    if ((payload as any).type !== "advertiser") {
      return res.status(401).json({ error: "Invalid advertiser token" });
    }

    const advertiserId = (payload as any).advertiserId as number;
    const [adv] = await db
      .select({
        id: advertisers.id,
        companyName: advertisers.companyName,
        contactName: advertisers.contactName,
        email: advertisers.email,
        phone: advertisers.phone,
        gstNumber: advertisers.gstNumber,
        website: advertisers.website,
        status: advertisers.status,
      })
      .from(advertisers)
      .where(eq(advertisers.id, advertiserId))
      .limit(1);

    if (!adv) return res.status(401).json({ error: "Advertiser not found" });
    if (adv.status === "suspended") return res.status(403).json({ error: "Account suspended" });

    (req as any).advertiser = adv;
    next();
  } catch {
    return res.status(401).json({ error: "Invalid advertiser token" });
  }
}

// ─── Helper ─────────────────────────────────────────────────────────────────

function extractBearerToken(req: Request): string | null {
  const header = req.headers.authorization;
  if (header?.startsWith("Bearer ")) return header.slice(7);
  return null;
}
