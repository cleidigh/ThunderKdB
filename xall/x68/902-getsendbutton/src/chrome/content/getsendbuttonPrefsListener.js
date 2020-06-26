var {
  Services
} = ChromeUtils.import("resource://gre/modules/Services.jsm");

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
    var GetSendButton_getsendButton = document.getElementById(
      "button-getmsg");

    if (GetSendButton_getsendButton) {
      if (Services.prefs.getBoolPref(
        "extensions.getsendbutton.GetSendButton_SendYes", true))
        GetSendButton_getsendButton.setAttribute("label",
          GetSendButton_getsendButton.getAttribute("labelgetsend"));
      else
        GetSendButton_getsendButton.setAttribute("label",
          GetSendButton_getsendButton.getAttribute("labelgetmsg"));
    }
  }
}

window.addEventListener("load", function(e) {
  GetSendButton_label.startup();
}, false);
window.addEventListener("unload", function(e) {
  GetSendButton_label.shutdown();
}, false);