// ticket from last notification
var gOldTicket;

registerGlobalObserver("LicenseChecked", UpdateLicenseNotification);

async function UpdateLicenseNotification(aEvent)
{
  let ticket = aEvent.detail;
  let oldTicket = gOldTicket;
  gOldTicket = ticket;
  let status = ticket.status;
  if (status == "normal" || status == "expiring") {
    browser.notificationbox.removeNotification("owl_license_expired", false);
  }
  if (status != "expiring") {
    browser.notificationbox.removeNotification("owl_license_expiring", false);
  }
  if (status == "normal") {
    if (ticket.licenseType == "paid" &&
        oldTicket &&
        status != oldTicket.status &&
        ticket.licenseType != oldTicket.licenseType) {
      showWelcomeBar(ticket);
    }
    return;
  }
  if ((status == "expired" || status == "missing") &&
      await browser.extPrefs.getBooleanValue("doNotShowExpiredBar")) {
    return;
  }
  showWarningBar(ticket);
}

/**
 * Thanks user for the new purchase.
 */
function showWelcomeBar(ticket) {
  let bundle = new StringBundle("settings");
  let label = bundle.getString("paidWelcome");
  browser.notificationbox.appendNotification(label, "owl_license_welcome",
    browser.runtime.getURL("ui/logo/owl-32.png"),
    browser.notificationbox.PRIORITY_INFO_HIGH,
    []);
}

/*
 * show bar warning that the license expired or is about to expire
 * and asks for purchase.
 */
function showWarningBar(ticket) {
  let status = ticket.status;
  let priority = browser.notificationbox.PRIORITY_CRITICAL_LOW;
  let id = "owl_license_expired";
  let daysLeft = Math.floor(ticket.expiredIn / 1000 / 3600 / 24);
  let bundle = new StringBundle("settings");
  let label = bundle.getString("noLicenseFound"); // status == missing or corrupt
  if (status == "expired") {
    label = bundle.getString(ticket.licenseType + "Expired");
  } else if (status == "expiring") {
    id = "owl_license_expiring";
    priority = browser.notificationbox.PRIORITY_WARNING_HIGH;
    label = bundle.getString(ticket.licenseType + "Expiring");
  }
  label = label.replace("%days%", daysLeft);

  browser.notificationbox.appendNotification(label, id,
    browser.runtime.getURL("ui/logo/owl-32.png"),
    priority, [{
      label: bundle.getString("getLicense"),
      value: "owl_purchase_license",
    }]);
}

browser.notificationbox.onClosed.addListener(async notification => {
  // persist only for expired, not expiring
  if (notification == "owl_license_expired") {
    browser.extPrefs.setBooleanValue("doNotShowExpiredBar", true);
  }
});

browser.notificationbox.onButton.addListener(async (notification, button) => {
  if (notification == "owl_license_expiring" ||
      notification == "owl_license_expired") {
    if (button == "owl_purchase_license") {
      OpenPurchasePage(); // license.js
    }
  }
});

browser.notificationbox.addStyleSheet(browser.runtime.getURL("ui/license-bar/license-bar.css"));
