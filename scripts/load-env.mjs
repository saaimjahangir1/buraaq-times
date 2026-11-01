// Loads .env, .env.production and .env.local (in that order, later wins) for
// the small admin scripts in this folder, the way Next.js does for the site.
import fs from "fs";
import path from "path";

export function loadEnv(dir = process.cwd()) {
  for (const name of [".env", ".env.production", ".env.local"]) {
    const file = path.join(dir, name);
    if (!fs.existsSync(file)) continue;
    for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
      const m = line.match(/^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
      if (!m) continue;
      let value = m[2];
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
      process.env[m[1]] = value;
    }
  }
}
