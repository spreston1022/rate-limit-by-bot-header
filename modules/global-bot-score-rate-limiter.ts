import { ZuploContext, ZuploRequest } from "@zuplo/runtime";

export async function rateLimitKey(request: ZuploRequest, context: ZuploContext) {
  const botInfo = request.headers.get("Akamai-Bot");

  if (botInfo) {
    const parts = botInfo.split(":");
    const score = parseInt(parts[3]?.trim(), 10);

    if (!isNaN(score) && score >= 50 && score <= 90) {
      context.log.info({ botInfo, score }, "bot score in limited range");
      return {
        key: "bot-score-50-90",
        requestsAllowed: 20,
        timeWindowMinutes: 1,
      };
    }
  }

  return undefined;
}
