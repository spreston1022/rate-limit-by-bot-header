import { ZoneCache, ZuploContext, ZuploRequest } from "@zuplo/runtime";

const OVERALL_THRESHOLD = 5; // overall req/min before bot score filtering kicks in
const BOT_SCORE_THRESHOLD = 50;

export default async function (request: ZuploRequest, context: ZuploContext) {
  const cache = new ZoneCache("overall-rate-bot-score", context);

  // Fixed 1-minute window key — resets naturally each minute
  const bucket = Math.floor(Date.now() / 60000);
  const countKey = `overall-count:${bucket}`;

  const current = (await cache.get<number>(countKey)) ?? 0;

  // Increment counter — TTL of 90s ensures it outlives the window
  cache.put(countKey, current + 1, 90);

  if (current >= OVERALL_THRESHOLD) {
    const botInfo = request.headers.get("Akamai-Bot");
    if (botInfo) {
      const parts = botInfo.split(":");
      const score = parseInt(parts[3]?.trim(), 10);
      if (!isNaN(score) && score > BOT_SCORE_THRESHOLD) {
        context.log.info({ score, current }, "blocking high bot score under elevated traffic");
        return new Response(
          JSON.stringify({ error: "Too Many Requests", retryAfter: 60 }),
          { status: 429, headers: { "Content-Type": "application/json", "Retry-After": "60" } }
        );
      }
    }
  }

  return request;
}
