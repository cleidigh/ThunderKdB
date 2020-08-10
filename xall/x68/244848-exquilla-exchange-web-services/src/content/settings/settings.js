const kMinimumRenew = 14 * 24 * 60 * 60 * 1000; // 2 weeks

let logError = console.error; // XXX TODO
let gBundle = null;

async function onInit() {
  try {
    gBundle = new StringBundle("settings");
    translateElements(document, gBundle);
    if (window.location.protocol == "chrome:") {
      window.browser = ChromeUtils.import("resource://exquilla/License.jsm");
      var { AppConstants } = ChromeUtils.import("resource://gre/modules/AppConstants.jsm");

      document.title = title.textContent = gBundle.get(AppConstants.XP_UNIX ? "windowTitle" : "windowTitleWin");
    } else {
      window.browser = window.browser.extension.getBackgroundPage().browser; // XXX Hack for Thunderbird 78
      title.remove();
    }

    manual.onclick = openManualAccountCreation;
    checkLicenseButton.onclick = checkLicense;
    getLicenseButton.onclick = openPurchasePage;

    updateLicenseStatus();

    browser.exquillaSettings.onLicenseChecked.addListener(updateLicenseStatus);
  } catch (ex) {
    logError(ex);
  }
}
document.addEventListener("DOMContentLoaded", onInit);

function onUnload() {
  try {
    browser.exquillaSettings.onLicenseChecked.removeListener(updateLicenseStatus);
  } catch (ex) {
    logError(ex);
  }
}
document.addEventListener("unload", onUnload);

function openPurchasePage() {
  try {
    browser.exquillaSettings.openPurchasePage();
  } catch (ex) {
    showError(ex);
  }
}

function openManualAccountCreation() {
  try {
    browser.exquillaSettings.openManualAccountCreation();
  } catch (ex) {
    showError(ex);
  }
}

async function manuallyEnterLicense() {
  try {
    let ticket = prompt(gBundle.get("enterLicenseKey"));
    if (!ticket) {
      return;
    }
    await browser.exquillaSettings.addTicketFromString(atob(ticket));
    updateLicenseStatus();
  } catch (ex) {
    showLicenseError(ex);
  }
}

async function checkLicense(aEvent) {
  try {
    licenseFetchError.textContent = "";
    if (aEvent.shiftKey) {
      manuallyEnterLicense();
      return;
    }
    licenseMessage.textContent = gBundle.get("checkStatus");
    await browser.exquillaSettings.fetchTicket();
    updateLicenseStatus();
  } catch (ex) {
    showLicenseError(ex);
  }
}

async function updateLicenseStatus() {
  try {
    let ticket = await browser.exquillaSettings.checkLicense();
    let licenseType = ticket.licenseType;
    if (licenseType && licenseType != "trial") {
      licenseType = "paid"; // treat "lifetime" or other unknown types same as paid
    }

    let licensedEmail = await browser.exquillaSettings.getLicensedEmail();
    email.textContent = licensedEmail;

    getLicenseButton.hidden =
      ticket.end > Date.now() + kMinimumRenew &&
      licenseType == "paid";
    checkLicenseButton.hidden = !licensedEmail ||
      ticket.refresh > Date.now() &&
      ticket.end > Date.now() + kMinimumRenew &&
      licenseType != "trial";

    let msg;
    if (!licensedEmail) {
      msg = gBundle.get("noAccountsConfigured");
    } else if (!licenseType) {
      msg = gBundle.get("noLicenseFound");
    } else if (ticket.refresh > Date.now()) {
      msg = gBundle.get(licenseType + "Valid", [new Date(ticket.end).toLocaleDateString()]);
    } else if (ticket.end > Date.now()) {
      msg = gBundle.get("ticketExpiredLicenseValid");
    } else {
      msg = gBundle.get(licenseType + "Expired");
    }
    licenseMessage.textContent = msg;
  } catch (ex) {
    showLicenseError(ex);
  }
}

function showLicenseError(ex) {
  licenseFetchError.textContent = ex.message || ex;
  showError(ex);
}

function showError(ex) {
  logError(ex);
  alert(ex.message || ex);
}
