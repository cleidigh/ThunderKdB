const kMinimumRenew = 14 * 24 * 60 * 60 * 1000; // 2 weeks

let { FetchTicket, AddTicketFromString, CheckLicense, OpenPurchasePage, registerGlobalObserver, logError } = browser.extension.getBackgroundPage();

let gBundle = null;

async function onInit() {
  try {
    gBundle = new StringBundle("settings");
    translateElements(document, gBundle);

    automatic.onclick = openTBAccountCreation;
    manual.onclick = openManualAccountCreation;
    checkLicenseButton.onclick = checkLicense;
    getLicenseButton.onclick = () => OpenPurchasePage(); // license.js

    //let info = await browser.runtime.getBrowserInfo();
    //let versions = info.version.split(".");
    //automatic.hidden = parseInt(versions[0]) == 60 && parseInt(versions[1]) < 5;
    // wait for #206
    automatic.hidden = true;

    UpdateLicenseStatus();

    registerGlobalObserver("LicenseChecked", UpdateLicenseStatus);
  } catch (ex) {
    logError(ex);
  }
}
document.addEventListener("DOMContentLoaded", onInit);

function onUnload() {
  unregisterGlobalObserver("LicenseChecked", UpdateLicenseStatus);
}
document.addEventListener("unload", onUnload);

function openTBAccountCreation() {
  try {
    browser.webAccount.wizard();
  } catch (ex) {
    showError(ex);
  }
}

function openManualAccountCreation() {
  try {
    browser.tabs.create({ url: "/ui/manual-setup/manual-setup.html" });
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

    await AddTicketFromString(atob(ticket));
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
    await FetchTicket();
    UpdateLicenseStatus();
  } catch (ex) {
    showLicenseError(ex);
  }
}

async function UpdateLicenseStatus() {
  try {
    let ticket = await CheckLicense();
    let licenseType = ticket.licenseType;
    if (licenseType && licenseType != "trial") {
      licenseType = "paid"; // treat "lifetime" or other unknown types same as paid
    }

    let servers = await browser.incomingServer.getServersOfTypes(["owl", "owl-ews"]);
    if (servers.length) {
      let identities = await browser.incomingServer.getIdentities(servers[0]);
      if (identities.length) {
        email.textContent = identities[0].email;
      }
    }

    getLicenseButton.hidden =
      ticket.end > Date.now() + kMinimumRenew &&
      licenseType == "paid";
    checkLicenseButton.hidden = !servers.length ||
      ticket.refresh > Date.now() &&
      ticket.end > Date.now() + kMinimumRenew &&
      licenseType != "trial";

    let msg;
    if (!servers.length) {
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
