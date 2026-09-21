import { ZuploContext, ZuploRequest } from "@zuplo/runtime";

// Demo-only limits — deliberately low so rate limiting is easy to trigger live.
const ROLE_LIMITS: Record<string, { requestsAllowed: number; timeWindowMinutes: number }> = {
  admin: { requestsAllowed: 5, timeWindowMinutes: 1 },
  user: { requestsAllowed: 2, timeWindowMinutes: 1 },
};
const DEFAULT_LIMIT = { requestsAllowed: 1, timeWindowMinutes: 1 };

export function rateLimitKey(request: ZuploRequest, context: ZuploContext) {
  const role = (request.user?.data as { role?: string } | undefined)?.role ?? "anonymous";
  const limit = ROLE_LIMITS[role] ?? DEFAULT_LIMIT;

  context.log.info({ role, limit }, "rate limiting by JWT role claim");

  return {
    key: `role:${role}`,
    requestsAllowed: limit.requestsAllowed,
    timeWindowMinutes: limit.timeWindowMinutes,
  };
}
