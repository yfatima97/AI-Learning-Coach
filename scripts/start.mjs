// Production start (Azure App Service runs `npm start`):
// make sure the database folder exists, apply migrations, then start the API.
import { execSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import path from "node:path";

const url = process.env.DATABASE_URL || "file:./data/coach.db";
if (url.startsWith("file:")) mkdirSync(path.dirname(path.resolve(url.slice("file:".length))), { recursive: true });

// Call the Prisma CLI file directly: zip deploys can turn node_modules/.bin links into broken copies.
execSync(`"${process.execPath}" node_modules/prisma/build/index.js migrate deploy`, { stdio: "inherit" });
await import("../dist/server.js");
