import path from "node:path";
import { defineConfig } from "prisma/config";
import "./src/config/load-env.js";

export default defineConfig({
  schema: path.join("prisma", "schema.prisma"),
  migrations: { path: path.join("prisma", "migrations") },
  datasource: { url: process.env.DATABASE_URL || "file:./data/coach.db" },
});
