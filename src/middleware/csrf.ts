import { Request, Response, NextFunction } from "express";
import crypto from "crypto";

const SAFE_METHODS = ["GET", "HEAD", "OPTIONS"];
const CSRF_COOKIE = "csrf_token";
const CSRF_HEADER = "x-csrf-token";

export function csrfProtection(req: Request, res: Response, next: NextFunction) {
  if (SAFE_METHODS.includes(req.method)) {
    ensureCsrfCookie(req, res);
    return next();
  }

  const cookieToken = req.cookies?.[CSRF_COOKIE];
  const headerToken = req.headers[CSRF_HEADER] as string;

  if (!cookieToken || !headerToken || cookieToken !== headerToken) {
    return res.status(403).json({ error: "CSRF token mismatch" });
  }

  next();
}

function ensureCsrfCookie(req: Request, res: Response) {
  if (!req.cookies?.[CSRF_COOKIE]) {
    const token = crypto.randomBytes(32).toString("hex");
    res.cookie(CSRF_COOKIE, token, {
      httpOnly: false,
      sameSite: "lax",
      path: "/",
      maxAge: 24 * 60 * 60 * 1000,
    });
  }
}

export function csrfTokenEndpoint(req: Request, res: Response) {
  let token = req.cookies?.[CSRF_COOKIE];
  if (!token) {
    token = crypto.randomBytes(32).toString("hex");
    res.cookie(CSRF_COOKIE, token, {
      httpOnly: false,
      sameSite: "lax",
      path: "/",
      maxAge: 24 * 60 * 60 * 1000,
    });
  }
  res.json({ csrfToken: token });
}
