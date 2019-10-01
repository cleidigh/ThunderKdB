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
  browser.exquillaSettings.onLicenseChecked.removeListener(updateLicenseStatus);
}
document.addEventListener("unload", onUnload);

function openPurchasePage() {
  browser.exquillaSettings.openPurchasePage();
}

function openManualAccountCreation() {
  browser.exquillaSettings.openManualAccountCreation();
}

async function manuallyEnterLicense() {
  let ticket = prompt(gBundle.get("enterLicenseKey"));
  try {
    await browser.exquillaSettings.addTicketFromString(atob(ticket));
    updateLicenseStatus();
  } catch (ex) {
    showError(ex);
    return false;
  }
}

async function checkLicense(aEvent) {
  if (aEvent.shiftKey) {
    manuallyEnterLicense();
    return;
  }
  licenseMessage.textContent = gBundle.get("checkStatus");
  await browser.exquillaSettings.fetchTicket();
  updateLicenseStatus();
}

async function updateLicenseStatus() {
  try {
    let ticket = await browser.exquillaSettings.checkLicense();
    let licenseType = ticket.licenseType;
    if (licenseType && licenseType != "trial") {
      licenseType = "paid"; // treat "lifetime" or other unknown types same as paid
    }

    let hasServers = await browser.exquillaSettings.anyExQuillaAccountConfigured();
    getLicenseButton.hidden =
      ticket.end > Date.now() + kMinimumRenew &&
      licenseType == "paid";
    checkLicenseButton.hidden = !hasServers ||
      ticket.refresh > Date.now() &&
      ticket.end > Date.now() + kMinimumRenew &&
      licenseType != "trial";

    let msg;
    if (!hasServers) {
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
    logError(ex);
  }
}

function showError(ex) {
  alert(ex.message || ex);
  console.error(ex);
}
