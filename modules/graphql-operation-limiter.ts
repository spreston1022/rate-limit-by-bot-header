import { ZuploContext, ZuploRequest } from "@zuplo/runtime";

const OPERATION_LIMITS: Record<string, { requestsAllowed: number; timeWindowMinutes: number }> = {
  UserLogin: { requestsAllowed: 10, timeWindowMinutes: 1 },
  GetPricing: { requestsAllowed: 20, timeWindowMinutes: 1 },
};

export async function rateLimitKey(request: ZuploRequest, context: ZuploContext) {
  const body = await request.clone().json().catch(() => null);

  const operationName = Array.isArray(body)
    ? body[0]?.operationName
    : body?.operationName;

  const identifier =
    request.user?.sub ??
    request.headers.get("true-client-ip") ??
    "anonymous";

  const limits = operationName && OPERATION_LIMITS[operationName];

  if (!limits) {
    return {
      key: identifier,
      requestsAllowed: 1000,
      timeWindowMinutes: 1,
    };
  }

  return {
    key: `${operationName}:${identifier}`,
    requestsAllowed: limits.requestsAllowed,
    timeWindowMinutes: limits.timeWindowMinutes,
  };
}
