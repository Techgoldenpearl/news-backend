import { Router, Request, Response } from "express";
import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import { db } from "../config/db.js";
import { users, userSubscriptions, membershipPlans } from "../../drizzle/schema.js";
import { eq, and, gte } from "drizzle-orm";
import { signUserToken, requireAuth } from "../middleware/auth.js";
import { cookieOptions } from "../utils/helpers.js";
import { registerSchema, loginSchema, profileUpdateSchema, changePasswordSchema } from "../validations/index.js";
import { validateBody } from "../middleware/validate.js";
import { sendPasswordResetEmail, sendVerificationEmail } from "../utils/email.js";
import { ENV } from "../config/env.js";

const SECRET = new TextEncoder().encode(ENV.jwtSecret);

const router = Router();

// POST /api/auth/register
router.post("/register", validateBody(registerSchema), async (req: Request, res: Response) => {
  try {
    const { name, email, phone, password, loginMethod } = req.body;

    const [existing] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (existing) {
      return res.status(409).json({ error: "Email already registered" });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const [newUser] = await db
      .insert(users)
      .values({
        name,
        email,
        phone,
        passwordHash,
        loginMethod: loginMethod || "email",
        role: "user",
      })
      .returning({ id: users.id, role: users.role });

    const token = await signUserToken(newUser.id, newUser.role);
    const isSecure = req.secure || req.headers["x-forwarded-proto"] === "https";

    res.cookie("token", token, cookieOptions(isSecure));
    res.status(201).json({
      success: true,
      token,
      user: { id: newUser.id, name, email, role: newUser.role },
    });
  } catch (err) {
    console.error("[Auth] Register error:", err);
    res.status(500).json({ error: "Registration failed" });
  }
});

// POST /api/auth/login
router.post("/login", validateBody(loginSchema), async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (!user || !user.passwordHash) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    if (user.deletedAt) {
      return res.status(403).json({ error: "Account has been deleted" });
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    await db
      .update(users)
      .set({ lastSignedIn: new Date() })
      .where(eq(users.id, user.id));

    const token = await signUserToken(user.id, user.role);
    const isSecure = req.secure || req.headers["x-forwarded-proto"] === "https";

    res.cookie("token", token, cookieOptions(isSecure));
    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatarUrl: user.avatarUrl,
      },
    });
  } catch (err) {
    console.error("[Auth] Login error:", err);
    res.status(500).json({ error: "Login failed" });
  }
});

// GET /api/auth/me
router.get("/me", requireAuth, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;

    // Check active subscription
    const [subscription] = await db
      .select({
        id: userSubscriptions.id,
        planId: userSubscriptions.planId,
        status: userSubscriptions.status,
        endDate: userSubscriptions.endDate,
        planName: membershipPlans.name,
        adFree: membershipPlans.adFree,
      })
      .from(userSubscriptions)
      .leftJoin(membershipPlans, eq(userSubscriptions.planId, membershipPlans.id))
      .where(
        and(
          eq(userSubscriptions.userId, user.id),
          eq(userSubscriptions.status, "active"),
          gte(userSubscriptions.endDate, new Date())
        )
      )
      .limit(1);

    res.json({
      ...user,
      subscription: subscription || null,
    });
  } catch (err) {
    console.error("[Auth] Me error:", err);
    res.status(500).json({ error: "Failed to fetch user" });
  }
});

// POST /api/auth/logout
router.post("/logout", (_req: Request, res: Response) => {
  res.clearCookie("token", { path: "/" });
  res.json({ success: true });
});

// PUT /api/auth/profile
router.put("/profile", requireAuth, validateBody(profileUpdateSchema), async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { name, phone, bio, avatarUrl, preferences } = req.body;

    await db
      .update(users)
      .set({
        ...(name && { name }),
        ...(phone && { phone }),
        ...(bio !== undefined && { bio }),
        ...(avatarUrl && { avatarUrl }),
        ...(preferences && { preferences }),
        updatedAt: new Date(),
      })
      .where(eq(users.id, user.id));

    res.json({ success: true });
  } catch (err) {
    console.error("[Auth] Profile update error:", err);
    res.status(500).json({ error: "Profile update failed" });
  }
});

// PUT /api/auth/change-password
router.put("/change-password", requireAuth, validateBody(changePasswordSchema), async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { currentPassword, newPassword } = req.body;

    const [fullUser] = await db
      .select({ passwordHash: users.passwordHash })
      .from(users)
      .where(eq(users.id, user.id))
      .limit(1);

    if (!fullUser?.passwordHash) {
      return res.status(400).json({ error: "No password set for this account" });
    }

    const valid = await bcrypt.compare(currentPassword, fullUser.passwordHash);
    if (!valid) {
      return res.status(400).json({ error: "Current password is incorrect" });
    }

    const newHash = await bcrypt.hash(newPassword, 12);
    await db.update(users).set({ passwordHash: newHash }).where(eq(users.id, user.id));

    res.json({ success: true });
  } catch (err) {
    console.error("[Auth] Change password error:", err);
    res.status(500).json({ error: "Password change failed" });
  }
});

// DELETE /api/auth/account
router.delete("/account", requireAuth, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    await db
      .update(users)
      .set({ deletedAt: new Date(), email: null, name: "Deleted User" })
      .where(eq(users.id, user.id));
    res.clearCookie("token", { path: "/" });
    res.json({ success: true });
  } catch (err) {
    console.error("[Auth] Delete account error:", err);
    res.status(500).json({ error: "Account deletion failed" });
  }
});

// POST /api/auth/forgot-password
router.post("/forgot-password", async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: "Email is required" });

    const [user] = await db
      .select({ id: users.id, email: users.email })
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (!user) {
      return res.json({ success: true, message: "If the email exists, a reset link has been sent" });
    }

    const token = await new SignJWT({ userId: user.id, type: "password_reset" })
      .setProtectedHeader({ alg: "HS256" })
      .setExpirationTime("1h")
      .sign(SECRET);

    await sendPasswordResetEmail(email, token).catch((e) => console.warn("[Auth] Email send failed:", e.message));
    res.json({ success: true, message: "If the email exists, a reset link has been sent" });
  } catch (err) {
    console.error("[Auth] Forgot password error:", err);
    res.json({ success: true, message: "If the email exists, a reset link has been sent" });
  }
});

// POST /api/auth/reset-password
router.post("/reset-password", async (req: Request, res: Response) => {
  try {
    const { token, newPassword } = req.body;
    if (!token || !newPassword || newPassword.length < 8) {
      return res.status(400).json({ error: "Token and new password (min 8 chars) required" });
    }

    const { payload } = await jwtVerify(token, SECRET);
    if ((payload as any).type !== "password_reset") {
      return res.status(400).json({ error: "Invalid reset token" });
    }

    const userId = (payload as any).userId as number;
    const passwordHash = await bcrypt.hash(newPassword, 12);
    await db.update(users).set({ passwordHash }).where(eq(users.id, userId));

    res.json({ success: true });
  } catch (err: any) {
    if (err.code === "ERR_JWT_EXPIRED") {
      return res.status(400).json({ error: "Reset link has expired" });
    }
    console.error("[Auth] Reset password error:", err);
    res.status(400).json({ error: "Invalid or expired reset token" });
  }
});

// POST /api/auth/send-verification
router.post("/send-verification", requireAuth, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    if (user.isVerified) {
      return res.json({ success: true, message: "Already verified" });
    }

    const [fullUser] = await db
      .select({ email: users.email })
      .from(users)
      .where(eq(users.id, user.id))
      .limit(1);

    if (!fullUser?.email) return res.status(400).json({ error: "No email on account" });

    const token = await new SignJWT({ userId: user.id, type: "email_verify" })
      .setProtectedHeader({ alg: "HS256" })
      .setExpirationTime("24h")
      .sign(SECRET);

    await sendVerificationEmail(fullUser.email, token);
    res.json({ success: true, message: "Verification email sent" });
  } catch (err) {
    console.error("[Auth] Send verification error:", err);
    res.status(500).json({ error: "Failed to send verification email" });
  }
});

// POST /api/auth/verify-email
router.post("/verify-email", async (req: Request, res: Response) => {
  try {
    const { token } = req.body;
    if (!token) return res.status(400).json({ error: "Token is required" });

    const { payload } = await jwtVerify(token, SECRET);
    if ((payload as any).type !== "email_verify") {
      return res.status(400).json({ error: "Invalid verification token" });
    }

    const userId = (payload as any).userId as number;
    await db.update(users).set({ isVerified: true }).where(eq(users.id, userId));

    res.json({ success: true });
  } catch (err: any) {
    if (err.code === "ERR_JWT_EXPIRED") {
      return res.status(400).json({ error: "Verification link has expired" });
    }
    res.status(400).json({ error: "Invalid or expired verification token" });
  }
});

// POST /api/auth/google — login/register via Google ID token
router.post("/google", async (req: Request, res: Response) => {
  try {
    const { idToken } = req.body;
    if (!idToken) return res.status(400).json({ error: "ID token is required" });

    const response = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${idToken}`);
    if (!response.ok) return res.status(401).json({ error: "Invalid Google token" });

    const payload = await response.json();
    const { email, name, picture, email_verified } = payload;

    if (!email) return res.status(400).json({ error: "No email in Google token" });

    let [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);

    if (user) {
      if (user.deletedAt) return res.status(403).json({ error: "Account has been deleted" });
      await db.update(users).set({
        lastSignedIn: new Date(),
        avatarUrl: user.avatarUrl || picture || null,
        isVerified: true,
      }).where(eq(users.id, user.id));
    } else {
      const [newUser] = await db.insert(users).values({
        name: name || email.split("@")[0],
        email,
        avatarUrl: picture || null,
        loginMethod: "google",
        role: "user",
        isVerified: email_verified === "true" || email_verified === true,
      }).returning();
      user = newUser as any;
    }

    const token = await signUserToken(user.id, user.role);
    const isSecure = req.secure || req.headers["x-forwarded-proto"] === "https";
    res.cookie("token", token, cookieOptions(isSecure));

    res.json({
      success: true,
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role, avatarUrl: user.avatarUrl },
    });
  } catch (err) {
    console.error("[Auth] Google login error:", err);
    res.status(500).json({ error: "Google login failed" });
  }
});

export default router;
