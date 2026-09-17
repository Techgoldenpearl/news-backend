import "dotenv/config";
import { db } from "../src/config/db.js";
import { categories } from "../drizzle/schema.js";

async function main() {
  const rows = await db.select({ id: categories.id, name: categories.name, slug: categories.slug }).from(categories);
  console.log(rows.map((r) => `${r.id}:${r.slug}`).join(", "));
}
main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
