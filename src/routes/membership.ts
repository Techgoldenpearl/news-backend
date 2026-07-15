import { Router, Request, Response } from "express";
import { db } from "../config/db.js";
import { membershipPlans, userSubscriptions, paymentHistory, users } from "../../drizzle/schema.js";
import { eq, and, desc, gte, asc, sql } from "drizzle-orm";
import { requireAuth, requireAdmin } from "../middleware/auth.js";
import { validateBody } from "../middleware/validate.js";
import { membershipSubscribeSchema, membershipPlanSchema } from "../validations/index.js";

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
router.post("/subscribe", requireAuth, validateBody(membershipSubscribeSchema), async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { planId, paymentId, paymentProvider, paymentAmount } = req.body;

    const result = await db.transaction(async (tx) => {
      const [plan] = await tx
        .select()
        .from(membershipPlans)
        .where(eq(membershipPlans.id, planId))
        .limit(1);

      if (!plan) return { error: "not_found" as const };

      if (paymentAmount !== undefined && Number(paymentAmount) !== Number(plan.price)) {
        return { error: "amount_mismatch" as const };
      }

      // Check for existing active subscription
      const [existing] = await tx
        .select()
        .from(userSubscriptions)
        .where(
          and(
            eq(userSubscriptions.userId, user.id),
            eq(userSubscriptions.status, "active"),
            gte(userSubscriptions.endDate, new Date())
          )
        )
        .limit(1)
        .for("update");

      if (existing) return { error: "already_subscribed" as const };

      const startDate = new Date();
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + plan.durationDays);

      const [subscription] = await tx
        .insert(userSubscriptions)
        .values({
          userId: user.id,
          planId,
          status: "active",
          startDate,
          endDate,
          paymentId,
          paymentProvider: paymentProvider || "razorpay",
          paymentAmount: plan.price,
          paymentCurrency: plan.currency,
        })
        .returning();

      // Record payment
      await tx.insert(paymentHistory).values({
        userId: user.id,
        subscriptionId: subscription.id,
        amount: plan.price,
        currency: plan.currency,
        paymentProvider: paymentProvider || "razorpay",
        paymentId,
        status: "success",
      });

      return { subscription, plan, startDate, endDate };
    });

    if (result.error === "not_found") return res.status(404).json({ error: "Plan not found" });
    if (result.error === "amount_mismatch") {
      return res.status(400).json({ error: "Payment amount does not match the plan price" });
    }
    if (result.error === "already_subscribed") {
      return res.status(400).json({ error: "You already have an active subscription" });
    }

    const { subscription, plan, startDate, endDate } = result;
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

// GET /api/membership/admin/plans — all plans, including inactive
router.get("/admin/plans", requireAuth, requireAdmin, async (_req: Request, res: Response) => {
  try {
    const plans = await db
      .select()
      .from(membershipPlans)
      .orderBy(asc(membershipPlans.sortOrder));
    res.json(plans);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch plans" });
  }
});

// POST /api/membership/admin/plans
router.post("/admin/plans", requireAuth, requireAdmin, validateBody(membershipPlanSchema), async (req: Request, res: Response) => {
  try {
    const [plan] = await db.insert(membershipPlans).values(req.body).returning();
    res.status(201).json(plan);
  } catch (err) {
    res.status(500).json({ error: "Failed to create plan" });
  }
});

// PUT /api/membership/admin/plans/:id
router.put("/admin/plans/:id", requireAuth, requireAdmin, validateBody(membershipPlanSchema.partial()), async (req: Request, res: Response) => {
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
router.get("/admin/subscriptions", requireAuth, requireAdmin, async (_req: Request, res: Response) => {
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
        userId: users.id,
        userName: users.name,
        userEmail: users.email,
      })
      .from(userSubscriptions)
      .leftJoin(membershipPlans, eq(userSubscriptions.planId, membershipPlans.id))
      .leftJoin(users, eq(userSubscriptions.userId, users.id))
      .orderBy(desc(userSubscriptions.createdAt))
      .limit(50);

    const [{ count: uniqueSubscribers }] = await db
      .select({ count: sql<number>`count(distinct ${userSubscriptions.userId})::int` })
      .from(userSubscriptions);

    res.json({ items, uniqueSubscribers });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch subscriptions" });
  }
});

// PATCH /api/membership/admin/subscriptions/:id — activate or deactivate a user's subscription
router.patch("/admin/subscriptions/:id", requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { active } = req.body;
    if (typeof active !== "boolean") {
      return res.status(400).json({ error: "'active' must be a boolean" });
    }

    const id = parseInt(req.params.id);
    const [existing] = await db
      .select()
      .from(userSubscriptions)
      .where(eq(userSubscriptions.id, id))
      .limit(1);

    if (!existing) return res.status(404).json({ error: "Subscription not found" });

    if (active) {
      if (existing.endDate < new Date()) {
        return res.status(400).json({ error: "Cannot activate an expired subscription — extend the end date first" });
      }
      await db
        .update(userSubscriptions)
        .set({ status: "active", cancelledAt: null, updatedAt: new Date() })
        .where(eq(userSubscriptions.id, id));
    } else {
      await db
        .update(userSubscriptions)
        .set({ status: "cancelled", autoRenew: false, cancelledAt: new Date(), updatedAt: new Date() })
        .where(eq(userSubscriptions.id, id));
    }

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to update subscription" });
  }
});

export default router;
