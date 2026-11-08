import path from "node:path";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import { PrismaClient } from "../generated/prisma/client.js";
import { projectRoot } from "../config/load-env.js";

// Resolve "file:./data/coach.db" against the project root so the API and the
// MCP server (which may start in another folder) share the same database file.
function databaseUrl() {
  const url = process.env.DATABASE_URL || "file:./data/coach.db";
  return url.startsWith("file:./") ? `file:${path.join(projectRoot, url.slice("file:".length))}` : url;
}

export const prisma = new PrismaClient({ adapter: new PrismaLibSql({ url: databaseUrl() }) });
