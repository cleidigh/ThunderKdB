var EXPORTED_SYMBOLS = ["applyRequestFixes"];

Components.utils.import('resource://gre/modules/Services.jsm');

/**
 * Call this after xhr.open(...) to prevent the Jira browser session from invalidating.
 *
 * Problem seems to be caused by xhr sending cookies. Setting LOAD_ANONYMOUS flag will prevent cookies being sent.
 *
 * https://answers.atlassian.com/questions/11465280/web-user-is-logged-out-when-using-the-rest-api
 * https://developer.mozilla.org/en/docs/nsIXMLHttpRequest
 * http://www.michael-noll.com/tutorials/cookie-monster-for-xmlhttprequest/
 */
function applyJiraLogoutFix(xhr) {
    xhr.channel.loadFlags |= Components.interfaces.nsIRequest.LOAD_ANONYMOUS;
}

/**
* As of 21.09.2015 Jira seems to apply selective XSRF checks based on User-Agent headers. This also cannot be
* bypassed with the 'X-Atlassian-Token: no-check' header.
*
* Workaround: Override User-Agent
*/
function applyXSRFCheckFix(xhr) {
    //xhr.setRequestHeader("User-Agent", "epoqcreatejiraissue; (Totally not Thunderbird, don't XSRF check me, bro. Also why does X-Atlassian-Token: no-check no longer work?)");
    xhr.setRequestHeader("User-Agent", "xx");
    xhr.setRequestHeader("X-Atlassian-Token", "no-check");
}

function applyRequestFixes(xhr) {
    applyJiraLogoutFix(xhr);
    applyXSRFCheckFix(xhr);
}
