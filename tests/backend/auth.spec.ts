import { test, expect } from "@playwright/test";

const API = "http://localhost:5000/api";

test.describe("Auth API", () => {
  test("GET /health returns ok", async ({ request }) => {
    const res = await request.get(`${API}/health`);
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.status).toBe("ok");
    expect(body.uptime).toBeGreaterThanOrEqual(0);
  });

  test("GET /health/deep returns healthy", async ({ request }) => {
    const res = await request.get(`${API}/health/deep`);
    const body = await res.json();
    expect(body.checks.database).toBe("ok");
    expect(body.checks.redis).toBe("ok");
  });

  test("POST /auth/login with valid credentials", async ({ request }) => {
    const res = await request.post(`${API}/auth/login`, {
      data: { email: "admin@news.com", password: "admin123" },
    });
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.token).toBeTruthy();
    expect(body.user.email).toBe("admin@news.com");
    expect(body.user.role).toBe("super_admin");
  });

  test("POST /auth/login with wrong password returns 401", async ({ request }) => {
    const res = await request.post(`${API}/auth/login`, {
      data: { email: "admin@news.com", password: "wrongpassword" },
    });
    expect(res.status()).toBe(401);
    const body = await res.json();
    expect(body.error).toContain("Invalid");
  });

  test("POST /auth/register with invalid email returns validation error", async ({ request }) => {
    const res = await request.post(`${API}/auth/register`, {
      data: { email: "notanemail", password: "short" },
    });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Validation failed");
    expect(body.details.length).toBeGreaterThan(0);
    expect(body.details.some((d: any) => d.path === "email")).toBeTruthy();
    expect(body.details.some((d: any) => d.path === "password")).toBeTruthy();
  });

  test("GET /auth/me without token returns 401", async ({ request }) => {
    const res = await request.get(`${API}/auth/me`);
    expect(res.status()).toBe(401);
  });

  test("GET /auth/me with valid token returns user", async ({ request }) => {
    const loginRes = await request.post(`${API}/auth/login`, {
      data: { email: "admin@news.com", password: "admin123" },
    });
    const { token } = await loginRes.json();

    const res = await request.get(`${API}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.email).toBe("admin@news.com");
  });

  test("POST /auth/forgot-password returns success", async ({ request }) => {
    const res = await request.post(`${API}/auth/forgot-password`, {
      data: { email: "admin@news.com" },
    });
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.success).toBe(true);
  });

  test("POST /auth/logout clears session", async ({ request }) => {
    const res = await request.post(`${API}/auth/logout`);
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.success).toBe(true);
  });

  test("GET /csrf-token returns token", async ({ request }) => {
    const res = await request.get(`${API}/csrf-token`);
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.csrfToken).toBeTruthy();
    expect(body.csrfToken.length).toBeGreaterThan(20);
  });
});
