// Mints a demo JWT signed with the same dummy HMAC secret configured on the
// jwt-auth-role-demo policy, for testing the rate-limit-by-role route.
// Not for production use — dummy secret only.
//
// Usage: node scripts/generate-demo-jwt.mjs [role] [subject]
//   node scripts/generate-demo-jwt.mjs admin
//   node scripts/generate-demo-jwt.mjs user alice

import { SignJWT } from "jose";

const DEMO_SECRET = "dummy-demo-hmac-secret-do-not-use-in-prod-1234567890";

const role = process.argv[2] ?? "user";
const subject = process.argv[3] ?? `demo-${role}`;

const secretKey = new TextEncoder().encode(DEMO_SECRET);

const jwt = await new SignJWT({ role })
  .setProtectedHeader({ alg: "HS256" })
  .setIssuer("https://demo.zuplo.io/")
  .setAudience("rate-limit-by-role-demo")
  .setSubject(subject)
  .setIssuedAt()
  .setExpirationTime("1h")
  .sign(secretKey);

console.log(jwt);
