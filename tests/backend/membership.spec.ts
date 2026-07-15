import { test, expect } from "@playwright/test";

const API = "http://localhost:5000/api";

let adminToken: string;
let userToken: string;
let planId: number;
let planPrice: string;

test.beforeAll(async ({ request }) => {
  const adminRes = await request.post(`${API}/auth/login`, {
    data: { email: "admin@news.com", password: "admin123" },
  });
  adminToken = (await adminRes.json()).token;

  const email = `membership-test-${Date.now()}@example.com`;
  const registerRes = await request.post(`${API}/auth/register`, {
    data: { email, password: "testpass123" },
  });
  userToken = (await registerRes.json()).token;

  const plans = await (await request.get(`${API}/membership/plans`)).json();
  planId = plans[0].id;
  planPrice = plans[0].price;
});

function authHeaders(token: string) {
  return { Authorization: `Bearer ${token}` };
}

test.describe("Membership API — public plans", () => {
  test("GET /membership/plans returns plans", async ({ request }) => {
    const res = await request.get(`${API}/membership/plans`);
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(Array.isArray(body)).toBeTruthy();
    expect(body.length).toBeGreaterThan(0);
    expect(body[0].name).toBeTruthy();
    expect(body[0].price).toBeTruthy();
  });

  test("GET /membership/plans/:slug returns plan", async ({ request }) => {
    const res = await request.get(`${API}/membership/plans/basic`);
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.slug).toBe("basic");
  });

  test("GET /membership/plans/:slug with unknown slug returns 404", async ({ request }) => {
    const res = await request.get(`${API}/membership/plans/does-not-exist`);
    expect(res.status()).toBe(404);
  });
});

test.describe("Membership API — subscribe / cancel / my-subscription", () => {
  test("POST /membership/subscribe without auth returns 401", async ({ request }) => {
    const res = await request.post(`${API}/membership/subscribe`, {
      data: { planId },
    });
    expect(res.status()).toBe(401);
  });

  test("POST /membership/subscribe with invalid body returns validation error", async ({ request }) => {
    const res = await request.post(`${API}/membership/subscribe`, {
      headers: authHeaders(userToken),
      data: { planId: "not-a-number" },
    });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Validation failed");
  });

  test("POST /membership/subscribe with unknown planId returns 404", async ({ request }) => {
    const res = await request.post(`${API}/membership/subscribe`, {
      headers: authHeaders(userToken),
      data: { planId: 999999 },
    });
    expect(res.status()).toBe(404);
  });

  test("POST /membership/subscribe with paymentAmount below plan price is rejected", async ({ request }) => {
    const res = await request.post(`${API}/membership/subscribe`, {
      headers: authHeaders(userToken),
      data: { planId, paymentId: "pw-test-cheap-payment", paymentAmount: "1.00" },
    });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("does not match the plan price");
  });

  test("GET /membership/my-subscription without auth returns 401", async ({ request }) => {
    const res = await request.get(`${API}/membership/my-subscription`);
    expect(res.status()).toBe(401);
  });

  test("GET /membership/my-subscription with no subscription returns null", async ({ request }) => {
    const res = await request.get(`${API}/membership/my-subscription`, {
      headers: authHeaders(userToken),
    });
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body).toBeNull();
  });

  test("POST /membership/subscribe creates an active subscription", async ({ request }) => {
    const res = await request.post(`${API}/membership/subscribe`, {
      headers: authHeaders(userToken),
      data: { planId, paymentId: "pw-test-payment-1", paymentAmount: planPrice },
    });
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.subscription.status).toBe("active");
    expect(body.subscription.planName).toBeTruthy();
  });

  test("GET /membership/my-subscription reflects the new subscription", async ({ request }) => {
    const res = await request.get(`${API}/membership/my-subscription`, {
      headers: authHeaders(userToken),
    });
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.status).toBe("active");
    expect(body.planName).toBeTruthy();
  });

  test("POST /membership/subscribe again returns 400 (already subscribed)", async ({ request }) => {
    const res = await request.post(`${API}/membership/subscribe`, {
      headers: authHeaders(userToken),
      data: { planId, paymentId: "pw-test-payment-2" },
    });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("already have an active subscription");
  });

  test("GET /membership/payment-history lists the recorded payment", async ({ request }) => {
    const res = await request.get(`${API}/membership/payment-history`, {
      headers: authHeaders(userToken),
    });
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(Array.isArray(body)).toBeTruthy();
    expect(body.length).toBeGreaterThan(0);
    expect(body[0].status).toBe("success");
  });

  test("GET /membership/payment-history without auth returns 401", async ({ request }) => {
    const res = await request.get(`${API}/membership/payment-history`);
    expect(res.status()).toBe(401);
  });

  test("POST /membership/cancel without auth returns 401", async ({ request }) => {
    const res = await request.post(`${API}/membership/cancel`);
    expect(res.status()).toBe(401);
  });

  test("POST /membership/cancel cancels the active subscription", async ({ request }) => {
    const res = await request.post(`${API}/membership/cancel`, {
      headers: authHeaders(userToken),
    });
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.success).toBe(true);

    const check = await request.get(`${API}/membership/my-subscription`, {
      headers: authHeaders(userToken),
    });
    const sub = await check.json();
    expect(sub.status).toBe("cancelled");
  });

  test("POST /membership/subscribe after cancelling allows a new subscription", async ({ request }) => {
    const res = await request.post(`${API}/membership/subscribe`, {
      headers: authHeaders(userToken),
      data: { planId, paymentId: "pw-test-payment-3" },
    });
    expect(res.ok()).toBeTruthy();
  });
});

test.describe("Membership API — admin plan management", () => {
  let createdPlanId: number;

  test("POST /membership/admin/plans without auth returns 401", async ({ request }) => {
    const res = await request.post(`${API}/membership/admin/plans`, {
      data: { name: "Should fail", slug: "should-fail" },
    });
    expect(res.status()).toBe(401);
  });

  test("POST /membership/admin/plans as regular user returns 403", async ({ request }) => {
    const res = await request.post(`${API}/membership/admin/plans`, {
      headers: authHeaders(userToken),
      data: {
        name: "Should fail",
        slug: `should-fail-${Date.now()}`,
        price: "1.00",
        interval: "monthly",
        durationDays: 30,
      },
    });
    expect(res.status()).toBe(403);
  });

  test("POST /membership/admin/plans with invalid body returns validation error", async ({ request }) => {
    const res = await request.post(`${API}/membership/admin/plans`, {
      headers: authHeaders(adminToken),
      data: { name: "X" },
    });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Validation failed");
  });

  test("POST /membership/admin/plans creates a plan", async ({ request }) => {
    const res = await request.post(`${API}/membership/admin/plans`, {
      headers: authHeaders(adminToken),
      data: {
        name: "Playwright Test Plan",
        slug: `pw-test-plan-${Date.now()}`,
        price: "149.00",
        interval: "monthly",
        durationDays: 30,
      },
    });
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.id).toBeGreaterThan(0);
    createdPlanId = body.id;
  });

  test("PUT /membership/admin/plans/:id updates a plan", async ({ request }) => {
    const res = await request.put(`${API}/membership/admin/plans/${createdPlanId}`, {
      headers: authHeaders(adminToken),
      data: { name: "Playwright Test Plan Updated" },
    });
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.success).toBe(true);
  });

  test("PUT /membership/admin/plans/:id can toggle isActive", async ({ request }) => {
    const res = await request.put(`${API}/membership/admin/plans/${createdPlanId}`, {
      headers: authHeaders(adminToken),
      data: { isActive: false },
    });
    expect(res.ok()).toBeTruthy();

    const plans = await (await request.get(`${API}/membership/admin/plans`, {
      headers: authHeaders(adminToken),
    })).json();
    const plan = plans.find((p: any) => p.id === createdPlanId);
    expect(plan.isActive).toBe(false);

    // restore for subsequent tests
    await request.put(`${API}/membership/admin/plans/${createdPlanId}`, {
      headers: authHeaders(adminToken),
      data: { isActive: true },
    });
  });

  test("GET /membership/admin/plans includes the new plan", async ({ request }) => {
    const res = await request.get(`${API}/membership/admin/plans`, {
      headers: authHeaders(adminToken),
    });
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.some((p: any) => p.id === createdPlanId)).toBe(true);
  });

  test("GET /membership/admin/plans without auth returns 401", async ({ request }) => {
    const res = await request.get(`${API}/membership/admin/plans`);
    expect(res.status()).toBe(401);
  });

  test("DELETE /membership/admin/plans/:id soft-deletes a plan", async ({ request }) => {
    const res = await request.delete(`${API}/membership/admin/plans/${createdPlanId}`, {
      headers: authHeaders(adminToken),
    });
    expect(res.ok()).toBeTruthy();

    const plans = await (await request.get(`${API}/membership/plans`)).json();
    expect(plans.some((p: any) => p.id === createdPlanId)).toBe(false);
  });

  test("GET /membership/admin/plans still includes soft-deleted plan (inactive)", async ({ request }) => {
    const res = await request.get(`${API}/membership/admin/plans`, {
      headers: authHeaders(adminToken),
    });
    const body = await res.json();
    const found = body.find((p: any) => p.id === createdPlanId);
    expect(found).toBeTruthy();
    expect(found.isActive).toBe(false);
  });

  test("GET /membership/admin/subscriptions returns subscriptions with user info", async ({ request }) => {
    const res = await request.get(`${API}/membership/admin/subscriptions`, {
      headers: authHeaders(adminToken),
    });
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(Array.isArray(body.items)).toBeTruthy();
    expect(typeof body.uniqueSubscribers).toBe("number");
    if (body.items.length > 0) {
      expect(body.items[0]).toHaveProperty("userEmail");
      expect(body.items[0]).toHaveProperty("userName");
    }
  });

  test("GET /membership/admin/subscriptions without auth returns 401", async ({ request }) => {
    const res = await request.get(`${API}/membership/admin/subscriptions`);
    expect(res.status()).toBe(401);
  });
});

test.describe("Membership API — admin subscription activate/deactivate", () => {
  let subUserToken: string;
  let subscriptionId: number;

  test.beforeAll(async ({ request }) => {
    const email = `membership-sub-toggle-${Date.now()}@example.com`;
    const registerRes = await request.post(`${API}/auth/register`, {
      data: { email, password: "testpass123" },
    });
    subUserToken = (await registerRes.json()).token;

    const plans = await (await request.get(`${API}/membership/plans`)).json();
    const subscribeRes = await request.post(`${API}/membership/subscribe`, {
      headers: authHeaders(subUserToken),
      data: { planId: plans[0].id, paymentId: "pw-toggle-test" },
    });
    subscriptionId = (await subscribeRes.json()).subscription.id;
  });

  test("PATCH /membership/admin/subscriptions/:id without auth returns 401", async ({ request }) => {
    const res = await request.patch(`${API}/membership/admin/subscriptions/${subscriptionId}`, {
      data: { active: false },
    });
    expect(res.status()).toBe(401);
  });

  test("PATCH /membership/admin/subscriptions/:id as regular user returns 403", async ({ request }) => {
    const res = await request.patch(`${API}/membership/admin/subscriptions/${subscriptionId}`, {
      headers: authHeaders(subUserToken),
      data: { active: false },
    });
    expect(res.status()).toBe(403);
  });

  test("PATCH /membership/admin/subscriptions/:id with non-boolean active returns 400", async ({ request }) => {
    const res = await request.patch(`${API}/membership/admin/subscriptions/${subscriptionId}`, {
      headers: authHeaders(adminToken),
      data: { active: "yes" },
    });
    expect(res.status()).toBe(400);
  });

  test("PATCH /membership/admin/subscriptions/:id with unknown id returns 404", async ({ request }) => {
    const res = await request.patch(`${API}/membership/admin/subscriptions/999999`, {
      headers: authHeaders(adminToken),
      data: { active: false },
    });
    expect(res.status()).toBe(404);
  });

  test("admin can deactivate a user's active subscription", async ({ request }) => {
    const res = await request.patch(`${API}/membership/admin/subscriptions/${subscriptionId}`, {
      headers: authHeaders(adminToken),
      data: { active: false },
    });
    expect(res.ok()).toBeTruthy();

    const mine = await request.get(`${API}/membership/my-subscription`, {
      headers: authHeaders(subUserToken),
    });
    const body = await mine.json();
    expect(body.status).toBe("cancelled");
  });

  test("admin can reactivate a user's deactivated subscription", async ({ request }) => {
    const res = await request.patch(`${API}/membership/admin/subscriptions/${subscriptionId}`, {
      headers: authHeaders(adminToken),
      data: { active: true },
    });
    expect(res.ok()).toBeTruthy();

    const mine = await request.get(`${API}/membership/my-subscription`, {
      headers: authHeaders(subUserToken),
    });
    const body = await mine.json();
    expect(body.status).toBe("active");
  });
});
