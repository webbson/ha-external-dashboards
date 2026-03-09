import crypto from "node:crypto";

export const JWT_SECRET = process.env.JWT_SECRET ?? (() => {
  console.warn("[WARN] JWT_SECRET not set — using random secret. Dashboard tokens will not survive restarts.");
  return crypto.randomBytes(32).toString("hex");
})();
