import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

/**
 * Verifies Authorization: Bearer <token> using MCP_JWT_SECRET.
 * Easiest path: if MCP_JWT_SECRET is not set, auth is bypassed (dev mode).
 */
export function verifyMcpJwt(req: Request, res: Response, next: NextFunction) {
  const secret = process.env.MCP_JWT_SECRET;

  // Bypass when no secret configured (e.g., local dev or simplest setup)
  if (!secret) {
    return next();
  }

  const authHeader = req.headers["authorization"] || "";
  const token = Array.isArray(authHeader)
    ? authHeader[0]?.split(" ")[1]
    : authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ error: "Missing bearer token" });
  }

  try {
    const decoded = jwt.verify(token, secret);
    // @ts-expect-error attach minimal identity
    req.user = decoded;
    return next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}
