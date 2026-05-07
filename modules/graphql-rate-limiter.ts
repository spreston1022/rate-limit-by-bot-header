/**
 * GraphQL Operation Rate Limiter — Zuplo / Web Fetch API
 *
 * Inbound policy that rate limits based on GraphQL operationName in the POST body.
 * Uses a sliding window per operation per identifier (user sub or IP).
 *
 * Policy options:
 *   operationLimits: { [operationName]: { limit: number, windowMs: number } }
 */

// ====================================================================
// STEP 1: Define which GraphQL operations to rate limit and their rules
// "UserLogin" is capped at 10 requests per minute
// "GetPricing" is capped at 20 requests per minute
// These are the operationName values we expect in the POST body
// ====================================================================
const OPERATION_LIMITS = {
  UserLogin: { limit: 10, windowMs: 60 * 1000 },
  GetPricing: { limit: 20, windowMs: 60 * 1000 },
};

// ====================================================================
// STEP 2: In-memory store to track request timestamps per user/operation
// Key format: "<operationName>:<identifier>" e.g. "UserLogin:user-123"
// Value: array of timestamps (ms) for requests within the current window
// ====================================================================
const requestLog = new Map();

// ====================================================================
// STEP 3: Sliding window rate limit check
// - Prunes timestamps outside the current window
// - If requests >= limit, deny and return time until oldest entry expires
// - Otherwise, record this request and allow it through
// ====================================================================
function checkRateLimit(key, limit, windowMs) {
  const now = Date.now();
  const windowStart = now - windowMs;

  // Keep only timestamps within the current rolling window
  const timestamps = (requestLog.get(key) || []).filter(
    (ts) => ts > windowStart
  );

  // If we've hit the limit, calculate how long until the window resets
  if (timestamps.length >= limit) {
    const resetInMs = timestamps[0] + windowMs - now;
    return { allowed: false, remaining: 0, resetInMs };
  }

  // Under the limit — record this request and allow it
  timestamps.push(now);
  requestLog.set(key, timestamps);

  return { allowed: true, remaining: limit - timestamps.length, resetInMs: windowMs };
}

export default async function (request, context, options) {

  // ====================================================================
  // STEP 4: Load operation limits from policy options (routes.oas.json)
  // Falls back to the hardcoded OPERATION_LIMITS if no options provided
  // ====================================================================
  const limits = options?.operationLimits ?? OPERATION_LIMITS;

  // ====================================================================
  // STEP 5: Parse the GraphQL POST body
  // We clone the request so the original body stream is still available
  // for the next policy or handler in the pipeline
  // ====================================================================
  const body = await request.clone().json().catch(() => null);

  // If we can't parse the body, pass the request through unchanged
  if (!body) return request;

  // ====================================================================
  // STEP 6: Extract the operationName from the POST body
  // This is the key field that tells us WHICH GraphQL operation is being called
  // e.g. { "operationName": "UserLogin", "query": "mutation UserLogin..." }
  // Handles both single operations and batched requests (arrays)
  // ====================================================================
  const operationName = Array.isArray(body)
    ? body[0]?.operationName  // batched request — check the first operation
    : body?.operationName;    // standard single operation

  // ====================================================================
  // STEP 7: Match the operationName against our rate-limited operations
  // If operationName is missing or not in our limits config (e.g. it's
  // "GetUser" which we don't rate limit), pass the request through
  // ====================================================================
  if (!operationName || !limits[operationName]) return request;

  // ====================================================================
  // STEP 8: Build a unique rate limit key per operation per user
  // Prefers authenticated user ID (sub), falls back to IP address
  // This ensures limits are enforced per-user, not globally
  // e.g. "UserLogin:user-abc123" or "UserLogin:203.0.113.42"
  // ====================================================================
  const { limit, windowMs } = limits[operationName];
  const identifier =
    request.user?.sub ??
    request.headers.get("true-client-ip") ??
    "anonymous";
  const key = `${operationName}:${identifier}`;

  // ====================================================================
  // STEP 9: Run the rate limit check against the sliding window store
  // ====================================================================
  const { allowed, remaining, resetInMs } = checkRateLimit(key, limit, windowMs);

  // Always attach rate limit headers so the client can track their usage
  const headers = {
    "Content-Type": "application/json",
    "X-RateLimit-Operation": operationName,
    "X-RateLimit-Limit": String(limit),
    "X-RateLimit-Remaining": String(remaining),
    "X-RateLimit-Reset": String(Math.ceil(resetInMs / 1000)),
  };

  // ====================================================================
  // STEP 10: If rate limit exceeded, return a 429 with a GraphQL-shaped
  // error response — matches the format GraphQL clients expect
  // ====================================================================
  if (!allowed) {
    return new Response(
      JSON.stringify({
        errors: [
          {
            message: `Rate limit exceeded for operation "${operationName}". Retry in ${Math.ceil(resetInMs / 1000)}s.`,
            extensions: {
              code: "RATE_LIMITED",
              operationName,
              retryAfterSeconds: Math.ceil(resetInMs / 1000),
            },
          },
        ],
      }),
      { status: 429, headers }
    );
  }

  // ====================================================================
  // STEP 11: Request is within the rate limit — pass it through to the
  // next policy or handler in the Zuplo pipeline
  // NOTE: Zuplo requires inbound policies to explicitly return the
  // request object to continue — returning undefined causes a 500
  // ====================================================================
  return request;
}