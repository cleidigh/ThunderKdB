(function() {
  var gOldTicket;
  var gNotificationBox = null;
  var pub;
  var settingsStrings = Services.strings
                                .createBundle("chrome://exquilla/locale/settings.properties");

  function onLoad()
  {
    MailServices.accounts.ReactivateAccounts();
    Services.obs.addObserver(UpdateLicenseNotification, "LicenseChecked");
    pub = ChromeUtils.import("resource://exquilla/License.jsm");
  }

  function onUnload()
  {
    Services.obs.removeObserver(UpdateLicenseNotification, "LicenseChecked");
  }

  function UpdateLicenseNotification(aSubject, aTopic, aData)
  {
    let ticket = JSON.parse(aData);
    let oldTicket = gOldTicket;
    gOldTicket = ticket;
    let status = ticket.status;
    if (gNotificationBox) {
      if (status == "normal" || status == "expiring") {
        let notification = gNotificationBox.getNotificationWithValue("exquilla_license_expired");
        if (notification) {
          gNotificationBox.removeNotification(notification);
        }
      }
      if (status != "expiring") {
        let notification = gNotificationBox.getNotificationWithValue("exquilla_license_expiring");
        if (notification) {
          gNotificationBox.removeNotification(notification);
        }
      }
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
        Services.prefs.getBoolPref("extensions.exquilla.doNotShowExpiredBar", false)) {
      return;
    }
    showWarningBar(ticket);
  }

  /**
   * Thanks user for the new purchase.
   */
  function showWelcomeBar(ticket) {
    ensureNotificationBox();
    if (!gNotificationBox.getNotificationWithValue("exquilla_license_welcome")) {
      let label = settingsStrings.GetStringFromName("paidWelcome");
      gNotificationBox.appendNotification(label, "exquilla_license_welcome",
        "chrome://exquilla/skin/letter-x-icon-16.png",
        gNotificationBox.PRIORITY_INFO_HIGH,
        []);
    }
  }

  /*
   * show bar warning that the license expired or is about to expire
   * and asks for purchase.
   */
  function showWarningBar(ticket) {
    ensureNotificationBox();
    let status = ticket.status;
    let priority = gNotificationBox.PRIORITY_CRITICAL_LOW;
    let id = "exquilla_license_expired";
    let daysLeft = Math.floor(ticket.expiredIn / 1000 / 3600 / 24);
    let label = settingsStrings.GetStringFromName("noLicenseFound"); // status == missing or corrupt
    let callback = null;
    if (status == "expired") {
      label = settingsStrings.GetStringFromName(ticket.licenseType + "Expired");
      callback = function(event) {
        if (event == "dismissed") {
          Services.prefs.setBoolPref("extensions.exquilla.doNotShowExpiredBar", true);
        }
      }
    } else if (status == "expiring") {
      id = "exquilla_license_expiring";
      priority = gNotificationBox.PRIORITY_WARNING_HIGH;
      label = settingsStrings.GetStringFromName(ticket.licenseType + "Expiring");
    }
    label = label.replace("%days%", daysLeft);

    if (!gNotificationBox.getNotificationWithValue(id)) {
      gNotificationBox.appendNotification(label, id,
        "chrome://exquilla/skin/letter-x-icon-16.png",
        priority, [{
          label: settingsStrings.GetStringFromName("getLicense"),
          value: "exquilla_purchase_license",
          callback: pub.OpenPurchasePage,
        }], callback);
    }
  }

  /*
   * Lazily create the notificationbox custom element.
   */
  function ensureNotificationBox() {
    if (gNotificationBox) {
      return;
    }
    let boxEl = document.getElementById("exquilla-notification-box");
    gNotificationBox = boxEl ? boxEl._notificationBox : new MozElements.NotificationBox(element => {
      element.id = "exquilla-notification-box";
      element.setAttribute("notificationside", "top");
      document.documentElement.insertBefore(element,
        document.getElementById("navigation-toolbox").nextSibling);
    });
  }

  window.addEventListener("load", onLoad);
  window.addEventListener("unload", onUnload);
})();
