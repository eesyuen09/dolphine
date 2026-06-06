import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const backendDir = path.dirname(__filename);
const repoRoot = path.join(backendDir, "..");
const protectedKeys = new Set(Object.keys(process.env));
const loadedKeys = new Set();

for (const envFile of [
  path.join(repoRoot, ".env"),
  path.join(repoRoot, ".env.local"),
  path.join(backendDir, ".env"),
  path.join(backendDir, ".env.local")
]) {
  loadEnvFile(envFile);
}

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;

  const lines = fs.readFileSync(filePath, "utf8").split(/\r?\n/);

  for (const line of lines) {
    const trimmedLine = line.trim();
    if (!trimmedLine || trimmedLine.startsWith("#")) continue;

    const match = trimmedLine.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (!match) continue;

    const [, key, rawValue] = match;
    if (protectedKeys.has(key) && !loadedKeys.has(key)) continue;

    process.env[key] = parseEnvValue(rawValue);
    loadedKeys.add(key);
  }
}

function parseEnvValue(rawValue) {
  const value = rawValue.trim();
  const quote = value[0];

  if ((quote === "\"" || quote === "'") && value.at(-1) === quote) {
    return value.slice(1, -1);
  }

  return value.replace(/\s+#.*$/, "").trim();
}
