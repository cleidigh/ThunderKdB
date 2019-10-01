const kPassword = 3;
const kOAuth2 = 10; // from MailNewsTypes2.idl

let { logError } = browser.extension.getBackgroundPage();

var gStringBundle;

async function onInit() {
  try {
    gStringBundle = new StringBundle("manual-setup");
    translateElements(document, gStringBundle);

    fullname.value = await browser.userInfo.getFullName();
    email.oninput = updateUsername;
    fullname.oninput = username.oninput = password.oninput = url.oninput = doEnabling;
    protocol_ews.onclick = protocol_owa.onclick = onProtocol;
    create.onclick = onCreate;
    cancel.onclick = onCancel;
    onProtocol();
  } catch (ex) {
    logError(ex);
  }
}
document.addEventListener("DOMContentLoaded", onInit);

function doEnabling() {
  create.disabled = !form.checkValidity();
}

function updateUsername() {
  username.value = email.value;
  doEnabling();
}

function onProtocol() {
  if (protocol_ews.checked) {
    authentication_label.setAttribute("disabled", "");
  } else {
    authentication_label.removeAttribute("disabled");
  }
  authentication.disabled = protocol_ews.checked;
  authentication.selectedIndex = protocol_ews.checked ? 1 : 0;
}

async function onCreate() {
  try {
    let current = await browser.tabs.getCurrent();
    let oauth = true;
    let protocol = document.querySelector("input[name=\"protocol\"]:checked").value;
    let urlObj = checkURL(new URL(url.value), protocol);
    let hostname = urlObj.hostname;
    for (let input of form.elements) {
      input.disabled = true;
    }
    message.classList.remove("error");
    let error;
    for (let authMethod of authentication.value.split(",").map(Number)) {
      message.textContent = gStringBundle.get("authMethodStatus" + authMethod, [hostname]);
      console.log(message.textContent);
      error = await browser.webAccount.verifyLogin(protocol, hostname, authMethod, username.value, password.value);
      if (!error.message) {
        await browser.webAccount.createAccount(protocol, fullname.value, email.value, hostname, authMethod, username.value, password.value);
        deck.classList.add("success");
        setTimeout(() => browser.tabs.remove(current.id), 3000);
        return;
      }
      switch (error.code) {
      case "password-form-not-detected":
      case "server-refused":
      case "auth-method-failed":
        continue;
      }
      break;
    }
    throw error;
  } catch (ex) {
    logError(ex);
    message.textContent = ex.message;
    message.classList.add("error");
    for (let input of form.elements) {
      input.disabled = false;
    }
    authentication.disabled = protocol_ews.checked;
  }
}

/**
 * Checks the OWA or EWS URL for validity.
 * Something like regexp https://[\-a-z0-9.]+/(owa|ews)/.*
 *
 * @param {URL} url
 * @param {string} "owl" or "owl-ews"
 * @returns {URL} may be a different one than passed in
 * @throws Error if the check fails
 */
function checkURL(url, protocol) {
  url = new URL(url.href.toLowerCase());
  if (url.protocol != "https:") {
    throw new Error(gStringBundle.get("url.error"));
  }
  // Office365 needs special handling
  if (url.hostname.endsWith(".office.com") || url.hostname.endsWith(".office365.com")) {
    return new URL(protocol.includes("ews")
        ? "https://outlook.office365.com/ews/"
        : "https://outlook.office.com/owa/");
  }
  if (url.pathname.startsWith("/owa") || url.pathname.startsWith("/ews")) {
    url.pathname = url.pathname.substr(0, 4) + "/";
    return url;
  }
  throw new Error(gStringBundle.get("url.error"));
}

async function onCancel() {
  try {
    let current = await browser.tabs.getCurrent();
    await browser.tabs.remove(current.id);
  } catch (ex) {
    logError(ex);
  }
}
