import { timingSafeEqual } from "node:crypto";
import type { Request, Response, NextFunction } from "express";

/**
 * Optional password protection for the deployed app (Phase 14).
 * If APP_PASSWORD is set, every request (except /health) needs HTTP Basic auth:
 * the browser shows a sign-in box once, then sends it automatically.
 * Any username works; only the password is checked. This stops strangers who
 * find the URL from spending your Claude API credits.
 */
export function requirePassword(req: Request, res: Response, next: NextFunction) {
  const password = process.env.APP_PASSWORD;
  if (!password || req.path === "/health") return next();

  const [scheme, encoded] = (req.headers.authorization ?? "").split(" ");
  if (scheme === "Basic" && encoded) {
    const given = Buffer.from(Buffer.from(encoded, "base64").toString().split(":").slice(1).join(":"));
    const expected = Buffer.from(password);
    if (given.length === expected.length && timingSafeEqual(given, expected)) return next();
  }
  res.set("WWW-Authenticate", 'Basic realm="AI Learning Coach", charset="UTF-8"').status(401).send("Sign in to use AI Learning Coach.");
}
