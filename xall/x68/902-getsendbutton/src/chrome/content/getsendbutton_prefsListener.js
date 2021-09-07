var { Services } = ChromeUtils.import(
  "resource://gre/modules/Services.jsm"
);

var GetSendButton_label = {

  startup: function() {
    Services.prefs.addObserver("", this, false);

    this.setButtonLabel();
  },

  shutdown: function() {
    Services.prefs.removeObserver("", this);
  },

  observe: function(subject, topic, data) {
    if (topic != "nsPref:changed") {
      return;
    }

    switch (data) {
      case "extensions.getsendbutton.GetSendButton_SendYes":
        this.setButtonLabel();
        break;
    }
  },

  setButtonLabel: function() {
    // console.debug("GetSendButton: setButtonLabel");

    let GetSendButton_getsendButton = 
      document.getElementById("button-getsendbutton");

    if (GetSendButton_getsendButton) {

      let GetSetButton_bundle = Services.strings.createBundle(
        "chrome://getsendbutton/locale/getsendbutton.properties");

      if (Services.prefs.getBoolPref(
        "extensions.getsendbutton.GetSendButton_SendYes", true)) {

        // console.debug("GetSendButton: setButtonLabel: Get & Send");

        GetSendButton_getsendButton.setAttribute("label",
          GetSetButton_bundle.GetStringFromName("getsendbutton.buttonGetsend.label"));

      } else {

        // console.debug("GetSendButton: setButtonLabel: Get - not send");

        GetSendButton_getsendButton.setAttribute("label",
          GetSendButton_getsendButton.getAttribute("label-getMsg"));

      }
    }
  }
}

/* eventListeners are now called from WindowListener API *
window.addEventListener("load", function(e) {
  GetSendButton_label.startup();
}, false);
window.addEventListener("unload", function(e) {
  GetSendButton_label.shutdown();
}, false);
**********************************************************/
