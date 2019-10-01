/**
 * This sets the useragent header for domains only.
 *
 * This is a workaround for a Microsoft bug in Office 365, introduced around 2019-08-27,
 * where the login page fails with "OpenIdConnect" "ArgumentNullException".
 * #536 #537
 */

"use strict";

/**
 * Where we want to rewrite the User-Agent header.
 */
var targetURLs = [ "https://outlook.office.com/*" ];

var userAgentString = "Mozilla/5.0 (X11; Linux; rv:68.0; Gecko/20100101 Firefox/68.0";

/*
Rewrite the User-Agent header".
*/
function rewriteUserAgentHeader(req) {
  for (var header of req.requestHeaders) {
    if (header.name.toLowerCase() === "user-agent") {
      header.value = userAgentString;
    }
  }
  return { requestHeaders: req.requestHeaders };
}

/**
 * "blocking" needed to modify the headers
 */
browser.webRequest.onBeforeSendHeaders.addListener(
    rewriteUserAgentHeader,
    { urls: targetURLs },
    ["blocking", "requestHeaders"]);
