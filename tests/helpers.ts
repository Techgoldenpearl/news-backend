import fs from "fs";
import { fileURLToPath } from "url";
import path from "path";
import { Page } from "@playwright/test";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TOKEN_FILE = path.join(__dirname, ".auth-token");

export function getAdminToken(): string {
  return fs.readFileSync(TOKEN_FILE, "utf-8").trim();
}

export async function gotoAuthed(page: Page, pagePath: string) {
  const token = getAdminToken();
  await page.context().addCookies([{ name: "token", value: token, domain: "localhost", path: "/" }]);
  await page.goto(`http://localhost:3000${pagePath}`);
}
