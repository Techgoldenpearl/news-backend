import fs from "fs";
import { fileURLToPath } from "url";
import path from "path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TOKEN_FILE = path.join(__dirname, ".auth-token");

async function globalSetup() {
  const res = await fetch("http://localhost:5000/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "admin@news.com", password: "admin123" }),
  });
  const { token } = await res.json();
  fs.writeFileSync(TOKEN_FILE, token);
}

export default globalSetup;
