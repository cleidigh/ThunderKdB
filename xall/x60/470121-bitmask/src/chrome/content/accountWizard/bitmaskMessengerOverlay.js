var { interfaces: Ci, utils: Cu, classes: Cc } = Components;

Cu.import("resource:///modules/imServices.jsm");
Cu.import("resource:///modules/imXPCOMUtils.jsm");

XPCOMUtils.defineLazyGetter(this, "_", () =>
  l10nHelper("chrome://bitmask/locale/bitmaskMessengerOverlay.properties")
);

var gNotified = false;

var notificationBar = {
  onStartHeaders: function() {
    let currentFolder = gFolderDisplay.displayedFolder.name;
    if (currentFolder === "Inbox") {
      let promise = bitmask.mail.msg_status(gFolderDisplay.displayedFolder.username,
                                            currentFolder.toUpperCase(),
                                            gFolderDisplay.selectedMessage.messageId);
      promise.then(function(data) {
        // If the message was encrypted, display the notification bar.
        let result = data["secured"];
        if (result === true) {
          document.getElementById("msgNotificationBar").collapsed = false;
          document.getElementById("bitmaskDescription").value = _("bitmaskMsgEncrypted");
        } else {
          document.getElementById("msgNotificationBar").collapsed = true;
        }
      }, function(error) {
        // Something went wrong, like the message was not found.
        document.getElementById("msgNotificationBar").collapsed = true;
      });
    }
  },

  onEndHeaders: function() {
  },

  load: function() {
    // Update the notification bar when the selected message changes.
    gMessageListeners.push(notificationBar);
    // This is borrowed from Lightning so that we can hide the notification
    // bar in case the folder is changed.
    notificationBar.tbHideMessageHeaderPane = HideMessageHeaderPane;
    HideMessageHeaderPane = function() {
      document.getElementById("msgNotificationBar").collapsed = true;
      notificationBar.tbHideMessageHeaderPane.apply(null, arguments);
    };
  }
}

function displayAlert(image, title, text) {
  try {
    let alertsService = Cc["@mozilla.org/alerts-service;1"]
                          .getService(Ci.nsIAlertsService)
    alertsService.showAlertNotification(image, title, text, false, '', null);
  } catch (e) {
    console.log(text);
  }
}

function overlayStartup() {
  let myPanel = document.getElementById("bitmaskStatusBarPanel");

  // We just need to check if bitmaskd is running and if we were able to
  // authorize with it using the token from bitmask.js
  let promise = bitmask.core.status();
  promise.then(function(data) {
    myPanel.label = _("bitmaskStatusOn", data["mail"]);
    myPanel.style.color = "green";
    myPanel.src = "chrome://bitmask/skin/on.png";
    gNotified = false;
  }, function(error) {
    myPanel.label = _("bitmaskStatusOff");
    myPanel.style.color = "red";
    myPanel.src = "chrome://bitmask/skin/off.png";
    if (!gNotified) {
      displayAlert("chrome://bitmask/skin/off.png", "Bitmask", _("bitmaskRefreshInbox"));
      gNotified = true;
    }
    console.log(error);
  });
}

window.addEventListener("load", function() {
  overlayStartup();
}, false);

window.setInterval(function() { overlayStartup(); }, 3000);

window.addEventListener("messagepane-loaded", notificationBar.load, true);
