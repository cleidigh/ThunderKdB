
// Copied from ./errorLog.js
//TODO merge the two implementations

// MailServices already imported from webaccount.js

// https://developer.mozilla.org/en-US/docs/Mozilla/Tech/XPCOM/Language_Bindings/Components.utils.importGlobalProperties
Cu.importGlobalProperties(["fetch"]);

const kErrorLogURL = "https://api.beonex.com/error/log";
const kExtPrefBranch = "extensions.owl.";

function logError(ex) {
  if (ex instanceof Ci.nsIException) {
    Cu.reportError(ex);
  } else {
    console.error(ex);
  }
  noAwait(logErrorToServer(ex), console.error);
}

/**
 * Error that is expected, but shouldn't be completely dropped on the floor.
 * Log locally, but do not log to server.
 */
function logExpectedError(ex) {
  console.error(ex);
}

/**
 * Logs errors at our server. This serves 2 purposes:
 * - We can track the errors that users actually encounter, and fix them.
 *   We can sort them by occurance.
 * - We can support users better that send us emails. Many just tell us
 *   "so and so doesn't work", but no details. Our questions to copy the
 *   Error Console contents often go unanswered, presumably because it's
 *   too complicated for them.
 *   By associating the errors with the user, we can look them up on our side
 *   and help the user immediately. It makes user support more useful and
 *   much smoother.
 */
async function logErrorToServer(ex) {
  try {
    if (ex.report === false) { // default true
      return;
    }
    var shouldSendLogs = Services.prefs.getBranch(kExtPrefBranch).getBoolPref("sendErrorLogs", true);
    if (!shouldSendLogs) {
      return;
    }

    let type = ex.type || ex.code || ex.name;
    if (!type && ex instanceof Ci.nsIException) {
      type = "0x" + ex.result.toString(16);
    }
    let body = {
      message: ex.message || String(ex),
      type: type,
      stack: getStack(ex),
      app: "owl",
      version: await getExtensionVersion(),
      user: getEmailAddressForUser(),
      exchangeURL: getLoginURLForUser(),
      parameters: ex.parameters,
    }
    console.log("sending to server:");
    console.log(body);
    await fetch(kErrorLogURL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
  } catch (ex) {
    console.error(ex);
  }
}

function getStack(ex) {
  var stack = ex.stack || new Error().stack;
  return stack
    .replace(/jar:file:[^!]*xpi!/g, "")
    .replace(/->/g, "\n");
}

/**
 * Returns the email address of the first Owl account,
 * or failing that, the primary email address in TB
 */
function getEmailAddressForUser() {
  try {
    const kTypes = ["owl", "owl-ews"];
    let allAccounts = MailServices.accounts.accounts;
    for (let i = 0; i < allAccounts.length; i++) {
      let account = allAccounts.queryElementAt(i, Ci.nsIMsgAccount);
      if (kTypes.includes(account.incomingServer.type)) {
        return account.defaultIdentity.email;
      }
    }
  } catch (ex) {
    console.error(ex);
  }
  try {
    return MailServices.accounts.defaultAccount.defaultIdentity.email;
  } catch (ex) {
    console.error(ex);
    return "unknown";
  }
}

/**
 * Returns the OWA or EWS URL of the first Owl account.
 */
function getLoginURLForUser() {
  try {
    const kTypes = ["owl", "owl-ews"];
    let allAccounts = MailServices.accounts.accounts;
    for (let i = 0; i < allAccounts.length; i++) {
      let account = allAccounts.queryElementAt(i, Ci.nsIMsgAccount);
      if (kTypes.includes(account.incomingServer.type)) {
        return account.incomingServer.getUnicharValue(
            account.incomingServer.type == "owl-ews" ? "ews_url" : "owa_url");
      }
    }
  } catch (ex) {
    console.error(ex);
    return null;
  }
}

async function getExtensionVersion() {
  //console.log(extensions);
  //console.log(extensions.modules);
  //console.log(extensions.modules.get("webAccount"));
  //console.log(extensions.ExtensionAPI.getAPI("runtime").getManifest().version); -- not working
  let extBaseURL = extensions.modules.get("webAccount").url;
  extBaseURL = extBaseURL.slice(0, extBaseURL.lastIndexOf("/") + 1);
  let response = await fetch(extBaseURL + "../../manifest.json");
  let manifest = await response.json();
  return manifest.version;
}
