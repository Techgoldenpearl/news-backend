import { Router, Request, Response } from "express";
import { db } from "../config/db.js";
import { membershipPlans, userSubscriptions, paymentHistory } from "../../drizzle/schema.js";
import { eq, and, desc, gte, asc } from "drizzle-orm";
import { requireAuth, requireAdmin } from "../middleware/auth.js";

const router = Router();

// ─── PUBLIC: List Plans ─────────────────────────────────────────────────────

// GET /api/membership/plans
router.get("/plans", async (_req: Request, res: Response) => {
  try {
    const plans = await db
      .select()
      .from(membershipPlans)
      .where(eq(membershipPlans.isActive, true))
      .orderBy(asc(membershipPlans.sortOrder));
    res.json(plans);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch plans" });
  }
});

// GET /api/membership/plans/:slug
router.get("/plans/:slug", async (req: Request, res: Response) => {
  try {
    const [plan] = await db
      .select()
      .from(membershipPlans)
      .where(eq(membershipPlans.slug, req.params.slug))
      .limit(1);
    if (!plan) return res.status(404).json({ error: "Plan not found" });
    res.json(plan);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch plan" });
  }
});

// ─── CUSTOMER: Subscribe ────────────────────────────────────────────────────

// POST /api/membership/subscribe
router.post("/subscribe", requireAuth, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { planId, paymentId, paymentProvider, paymentAmount } = req.body;

    // Get plan details
    const [plan] = await db
      .select()
      .from(membershipPlans)
      .where(eq(membershipPlans.id, planId))
      .limit(1);

    if (!plan) return res.status(404).json({ error: "Plan not found" });

    // Check for existing active subscription
    const [existing] = await db
      .select()
      .from(userSubscriptions)
      .where(
        and(
          eq(userSubscriptions.userId, user.id),
          eq(userSubscriptions.status, "active"),
          gte(userSubscriptions.endDate, new Date())
        )
      )
      .limit(1);

    if (existing) {
      return res.status(400).json({ error: "You already have an active subscription" });
    }

    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + plan.durationDays);

    const [subscription] = await db
      .insert(userSubscriptions)
      .values({
        userId: user.id,
        planId,
        status: "active",
        startDate,
        endDate,
        paymentId,
        paymentProvider: paymentProvider || "razorpay",
        paymentAmount,
        paymentCurrency: plan.currency,
      })
      .returning();

    // Record payment
    await db.insert(paymentHistory).values({
      userId: user.id,
      subscriptionId: subscription.id,
      amount: paymentAmount || plan.price,
      currency: plan.currency,
      paymentProvider: paymentProvider || "razorpay",
      paymentId,
      status: "success",
    });

    res.status(201).json({
      success: true,
      subscription: {
        id: subscription.id,
        planName: plan.name,
        startDate,
        endDate,
        status: "active",
      },
    });
  } catch (err) {
    console.error("[Membership] Subscribe error:", err);
    res.status(500).json({ error: "Subscription failed" });
  }
});

// GET /api/membership/my-subscription
router.get("/my-subscription", requireAuth, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;

    const [subscription] = await db
      .select({
        id: userSubscriptions.id,
        status: userSubscriptions.status,
        startDate: userSubscriptions.startDate,
        endDate: userSubscriptions.endDate,
        autoRenew: userSubscriptions.autoRenew,
        planName: membershipPlans.name,
        planSlug: membershipPlans.slug,
        adFree: membershipPlans.adFree,
        features: membershipPlans.features,
      })
      .from(userSubscriptions)
      .leftJoin(membershipPlans, eq(userSubscriptions.planId, membershipPlans.id))
      .where(eq(userSubscriptions.userId, user.id))
      .orderBy(desc(userSubscriptions.createdAt))
      .limit(1);

    res.json(subscription ?? null);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch subscription" });
  }
});

// POST /api/membership/cancel
router.post("/cancel", requireAuth, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;

    await db
      .update(userSubscriptions)
      .set({
        status: "cancelled",
        autoRenew: false,
        cancelledAt: new Date(),
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(userSubscriptions.userId, user.id),
          eq(userSubscriptions.status, "active")
        )
      );

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Cancellation failed" });
  }
});

// GET /api/membership/payment-history
router.get("/payment-history", requireAuth, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const items = await db
      .select()
      .from(paymentHistory)
      .where(eq(paymentHistory.userId, user.id))
      .orderBy(desc(paymentHistory.createdAt));
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch payment history" });
  }
});

// ─── ADMIN: Plan Management ────────────────────────────────────────────────

// POST /api/membership/admin/plans
router.post("/admin/plans", requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try {
    const [plan] = await db.insert(membershipPlans).values(req.body).returning();
    res.status(201).json(plan);
  } catch (err) {
    res.status(500).json({ error: "Failed to create plan" });
  }
});

// PUT /api/membership/admin/plans/:id
router.put("/admin/plans/:id", requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try {
    await db
      .update(membershipPlans)
      .set({ ...req.body, updatedAt: new Date() })
      .where(eq(membershipPlans.id, parseInt(req.params.id)));
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to update plan" });
  }
});

// DELETE /api/membership/admin/plans/:id
router.delete("/admin/plans/:id", requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try {
    await db
      .update(membershipPlans)
      .set({ isActive: false })
      .where(eq(membershipPlans.id, parseInt(req.params.id)));
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete plan" });
  }
});

// GET /api/membership/admin/subscriptions
router.get("/admin/subscriptions", requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try {
    const items = await db
      .select({
        id: userSubscriptions.id,
        status: userSubscriptions.status,
        startDate: userSubscriptions.startDate,
        endDate: userSubscriptions.endDate,
        planName: membershipPlans.name,
        paymentAmount: userSubscriptions.paymentAmount,
        createdAt: userSubscriptions.createdAt,
      })
      .from(userSubscriptions)
      .leftJoin(membershipPlans, eq(userSubscriptions.planId, membershipPlans.id))
      .orderBy(desc(userSubscriptions.createdAt))
      .limit(50);
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch subscriptions" });
  }
});

export default router;
