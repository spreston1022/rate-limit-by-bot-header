//Akamai-Bot: Unknown Bot (7B0E3E55A5C82C70F90BCAD94E19866A):monitor:Behavior Anomaly:60:strict

import { ZuploContext, ZuploRequest } from "@zuplo/runtime";

export async function rateLimitKey (request: ZuploRequest, context: ZuploContext) {

  let tlsFingerprint = request.headers.get('client-tls-fingerprint')

  // check to see if the header exists, otherwise return back full access
  if (request.headers.has('Akamai-Bot')) {
    // parse out the header to find the segment the request should be bucketed in
    const botInfo = request.headers.get('Akamai-Bot');
    let botid = botInfo.split(":")[0]  
    context.log.info({botInfo: botInfo, tlsFingerprint: tlsFingerprint})
    // extract out the text after the last colon in the string
    const segment = botInfo.substring(botInfo.lastIndexOf(':') + 1).trim();
    context.log.info("segment: " + segment)
    let requestsAllowed = 50
    if (segment === 'cautious') {
      requestsAllowed = 15
    } else if (segment === 'strict') {
      requestsAllowed = 10
    } else if (segment === 'aggressive') {
      context.log.info("I'm an aggressive bot")
      requestsAllowed = 5
    }
      return {
        key: `${botid}-${tlsFingerprint}`,
        requestsAllowed: requestsAllowed,
        timeWindowMinutes: 1
      };
  }

  // either no Akamai-Bot header or header does not indicate a bot
  return {
    key: tlsFingerprint,
    requestsAllowed: 50,
    timeWindowMinutes: 1
  }
}
