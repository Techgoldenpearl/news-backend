import { test, expect } from "@playwright/test";

const API = "http://localhost:5000/api";

let token: string;

test.beforeAll(async ({ request }) => {
  const res = await request.post(`${API}/auth/login`, {
    data: { email: "admin@news.com", password: "admin123" },
  });
  const body = await res.json();
  token = body.token;
});

function authHeaders() {
  return { Authorization: `Bearer ${token}` };
}

test.describe("Categories API", () => {
  test("GET /categories returns list", async ({ request }) => {
    const res = await request.get(`${API}/categories`);
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(Array.isArray(body)).toBeTruthy();
    expect(body.length).toBeGreaterThan(0);
    expect(body[0].name).toBeTruthy();
    expect(body[0].slug).toBeTruthy();
  });

  test("GET /categories/:slug returns category", async ({ request }) => {
    const res = await request.get(`${API}/categories/politics`);
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.slug).toBe("politics");
    expect(body.nameHindi).toBeTruthy();
  });

  test("GET /categories/nonexistent returns 404", async ({ request }) => {
    const res = await request.get(`${API}/categories/nonexistent-slug`);
    expect(res.status()).toBe(404);
  });
});

test.describe("Articles API", () => {
  let createdArticleId: number;

  test("GET /articles returns paginated list", async ({ request }) => {
    const res = await request.get(`${API}/articles?limit=5`);
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.items).toBeDefined();
    expect(body.total).toBeDefined();
    expect(typeof body.total).toBe("number");
  });

  test("POST /articles creates article (editor+)", async ({ request }) => {
    const categories = await (await request.get(`${API}/categories`)).json();
    const categoryId = categories[0].id;

    const res = await request.post(`${API}/articles`, {
      headers: authHeaders(),
      data: {
        title: "Playwright Test Article",
        slug: `playwright-test-${Date.now()}`,
        summary: "This is a test article created by Playwright",
        content: "<p>Test content for Playwright automated testing.</p>",
        categoryId,
        status: "draft",
      },
    });
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.id).toBeGreaterThan(0);
    createdArticleId = body.id;
  });

  test("GET /articles/admin/list returns admin list", async ({ request }) => {
    const res = await request.get(`${API}/articles/admin/list`, {
      headers: authHeaders(),
    });
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.items.length).toBeGreaterThan(0);
    expect(body.items[0].title).toBeTruthy();
  });

  test("PATCH /articles/:id/toggle-breaking works", async ({ request }) => {
    if (!createdArticleId) return;
    const res = await request.patch(`${API}/articles/${createdArticleId}/toggle-breaking`, {
      headers: authHeaders(),
      data: { isBreaking: true },
    });
    expect(res.ok()).toBeTruthy();
  });

  test("DELETE /articles/:id deletes article", async ({ request }) => {
    if (!createdArticleId) return;
    const res = await request.delete(`${API}/articles/${createdArticleId}`, {
      headers: authHeaders(),
    });
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.success).toBe(true);
  });

  test("POST /articles without auth returns 401", async ({ request }) => {
    const res = await request.post(`${API}/articles`, {
      data: { title: "Should fail", slug: "fail", content: "x", categoryId: 1 },
    });
    expect(res.status()).toBe(401);
  });
});

test.describe("Sites API", () => {
  test("GET /sites returns list", async ({ request }) => {
    const res = await request.get(`${API}/sites`);
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(Array.isArray(body)).toBeTruthy();
    expect(body.length).toBeGreaterThan(0);
    expect(body[0].name).toBeTruthy();
    expect(body[0].slug).toBeTruthy();
  });

  test("GET /sites/:id returns site with settings", async ({ request }) => {
    const sites = await (await request.get(`${API}/sites`)).json();
    const res = await request.get(`${API}/sites/${sites[0].id}`);
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.name).toBeTruthy();
  });
});

test.describe("Membership API", () => {
  test("GET /membership/plans returns plans", async ({ request }) => {
    const res = await request.get(`${API}/membership/plans`);
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(Array.isArray(body)).toBeTruthy();
    expect(body.length).toBeGreaterThan(0);
    expect(body[0].name).toBeTruthy();
    expect(body[0].price).toBeTruthy();
  });
});

test.describe("Features API", () => {
  test("GET /features/tags returns tags", async ({ request }) => {
    const res = await request.get(`${API}/features/tags`);
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(Array.isArray(body)).toBeTruthy();
  });

  test("GET /features/search returns results", async ({ request }) => {
    const res = await request.get(`${API}/features/search?q=test`);
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.items).toBeDefined();
  });

  test("GET /features/utility-data returns data", async ({ request }) => {
    const res = await request.get(`${API}/features/utility-data`);
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(Array.isArray(body)).toBeTruthy();
  });

  test("GET /features/locations/states returns states", async ({ request }) => {
    const res = await request.get(`${API}/features/locations/states`);
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(Array.isArray(body)).toBeTruthy();
    expect(body.length).toBeGreaterThan(0);
  });
});

test.describe("SEO & Feeds", () => {
  test("GET /sitemap.xml returns valid XML", async ({ request }) => {
    const res = await request.get("http://localhost:5000/sitemap.xml");
    expect(res.ok()).toBeTruthy();
    const text = await res.text();
    expect(text).toContain("<?xml");
    expect(text).toContain("<urlset");
  });

  test("GET /robots.txt returns valid content", async ({ request }) => {
    const res = await request.get("http://localhost:5000/robots.txt");
    expect(res.ok()).toBeTruthy();
    const text = await res.text();
    expect(text).toContain("User-agent");
    expect(text).toContain("Sitemap");
  });

  test("GET /feed/rss returns valid RSS", async ({ request }) => {
    const res = await request.get("http://localhost:5000/feed/rss");
    expect(res.ok()).toBeTruthy();
    const text = await res.text();
    expect(text).toContain("<?xml");
    expect(text).toContain("<rss");
    expect(text).toContain("<channel>");
  });

  test("GET /api/seo/site returns JSON-LD", async ({ request }) => {
    const res = await request.get(`${API}/seo/site`);
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body["@context"]).toBe("https://schema.org");
    expect(body["@type"]).toBe("WebSite");
  });
});

test.describe("Admin Stats", () => {
  test("GET /admin/stats returns dashboard data", async ({ request }) => {
    const res = await request.get(`${API}/admin/stats`, { headers: authHeaders() });
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(typeof body.totalArticles).toBe("number");
    expect(typeof body.totalUsers).toBe("number");
    expect(typeof body.activeAds).toBe("number");
  });

  test("GET /admin/stats without auth returns 401", async ({ request }) => {
    const res = await request.get(`${API}/admin/stats`);
    expect(res.status()).toBe(401);
  });
});
