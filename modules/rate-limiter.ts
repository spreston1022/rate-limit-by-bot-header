//module - ./modules/rate-limiter.ts


import {
  CustomRateLimitDetails,
  ZuploRequest,
  ZuploContext,
} from "@zuplo/runtime";


export function rateLimitKey(
  request: ZuploRequest,
  context: ZuploContext,
  policyName: string,
): CustomRateLimitDetails | undefined {

  context.log.debug("here")
  context.log.error(request.headers.get("x-id"));

  const details: CustomRateLimitDetails = {
    key: request.headers.get("x-id"),
  };

  return details;
}
