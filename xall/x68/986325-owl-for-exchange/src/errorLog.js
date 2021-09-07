
// Copied to webapi/webaccount/errorLog.js
//TODO merge the two implementations

const kErrorLogURL = "https://api.beonex.com/error/log";

function logError(ex) {
  console.error(ex);
  //noAwait(logErrorToServer(ex), console.error);
  logErrorToServer(ex);
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
    var doNotSend = await browser.extPrefs.getBooleanValue("doNotSendErrorLogs");
    if (doNotSend) {
      return;
    }

    let body = {
      message: ex.message || String(ex),
      type: ex.code || ex.name,
      stack: getStack(ex),
      app: "owl",
      version: browser.runtime.getManifest().version,
      hostAppVersion: (await browser.runtime.getBrowserInfo()).version,
      user: await getEmailAddressForUser(),
      exchangeURL: await getLoginURLForUser(),
    }
    if (ex instanceof ParameterError) {
      body.type = ex.type;
      body.parameters = ex.parameters;
    }
    await fetch(kErrorLogURL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body, sanitiseExchangeData),
    });
  } catch (ex2) {
    console.error(ex2);
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
async function getEmailAddressForUser() {
  try {
    let serverIds = await browser.incomingServer.getServersOfTypes(["owl", "owl-ews", "owl-eas"]);
    if (serverIds.length) {
      let serverId = serverIds[0];
      let identities = await browser.incomingServer.getIdentities(serverId);
      if (identities.length) {
        return identities[0].email;
      } else { // verifyLogin doesn't create an identity
        let username = await browser.incomingServer.getUsername(serverId);
        if (!username.includes("@")) {
          let hostname = await browser.incomingServer.getHostName(serverId);
          // make up something unique
          // deliberately not using "@", to distinguish from real email address
          username += " server " + hostname;
        }
        return username;
      }
    }
  } catch (ex) {
    console.error(ex);
  }
  try {
    return await browser.incomingServer.getGlobalPrimaryIdentity().email;
  } catch (ex) {
    console.error(ex);
    return "unknown";
  }
}

/**
 * Returns the OWA or EWS URL of the first Owl account.
 */
async function getLoginURLForUser() {
  try {
    let serverIds = await browser.incomingServer.getServersOfTypes(["owl", "owl-ews", "owl-eas"]);
    if (serverIds.length) {
      let type = await browser.incomingServer.getStringValue(serverIds[0], "type");
      return await browser.incomingServer.getStringValue(serverIds[0], (type.slice(4) || "owa") + "_url");
    }
  } catch (ex) {
    console.error(ex);
    return null;
  }
}

/**
 * Pass to JSON.stringify to sanitise sensitive values.
 * Id, ChangeKey and RecurrenceId are trimmed to 23 characters.
 * Name and EmailAddress properties are replaced with placeholders.
 */
function sanitiseExchangeData(aKey, aValue) {
  switch (aKey) {
  case "EmailAddress":
  case "Name":
    return "***";
  case "ChangeKey":
  case "Id":
  case "RecurrenceId":
    if (typeof aValue == "string" && aValue.length > 22) {
      return aValue.slice(0, 10) + "..." + aValue.slice(-10);
    }
  }
  return aValue;
}
