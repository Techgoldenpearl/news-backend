import { Request, Response, NextFunction } from "express";
import { db } from "../config/db.js";
import { auditLogs } from "../../drizzle/schema.js";

export function auditAction(action: string, entityType: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const originalJson = res.json.bind(res);

    res.json = function (body: any) {
      if (res.statusCode < 400) {
        const user = (req as any).user;
        const entityId = req.params.id || body?.id?.toString() || null;
        const entityTitle = req.body?.title || req.body?.name || null;

        db.insert(auditLogs).values({
          userId: user?.id || null,
          userRole: user?.role || null,
          userName: user?.name || null,
          userEmail: user?.email || null,
          action,
          entityType,
          entityId: entityId?.toString() || null,
          entityTitle,
          details: JSON.stringify({
            method: req.method,
            path: req.originalUrl,
            body: sanitizeBody(req.body),
          }),
          ipAddress: (req.ip || req.socket.remoteAddress || "")?.slice(0, 50),
        }).catch(() => {});
      }

      return originalJson(body);
    };

    next();
  };
}

function sanitizeBody(body: any): any {
  if (!body) return null;
  const safe = { ...body };
  delete safe.password;
  delete safe.passwordHash;
  delete safe.currentPassword;
  delete safe.newPassword;
  delete safe.base64;
  delete safe.content;
  return safe;
}
