//Thankyou for cool patch!!  http://easy-small-world.com/2010/07/thunderbird_confirmaddress_fix.html

//overlay
//C:\Program Files\Mozilla Thunderbird\chrome\messenger\content\messenger\messengercompose\MsgComposeCommands.js

var EXPORTED_SYMBOLS = ["SendMessage", "SendMessageWithCheck", "SendMessageLater"];

let global = this;
let { Services } = ChromeUtils.import("resource://gre/modules/Services.jsm");
ChromeUtils.import("chrome://confirm-address/content/confirm-address.js", global);

var SendMessage = function () {
  if( !global.ConfirmAddress.checkAddress() ) {
    return;
  }

  // Copied from MsgComposeCommands.js.
  let sendInBackground = Services.prefs.getBoolPref(
    "mailnews.sendInBackground"
  );
  if (sendInBackground && AppConstants.platform != "macosx") {
    let enumerator = Services.wm.getEnumerator(null);
    let count = 0;
    while (enumerator.hasMoreElements() && count < 2) {
      enumerator.getNext();
      count++;
    }
    if (count == 1) {
      sendInBackground = false;
    }
  }

  var window = Services.wm.getMostRecentWindow("msgcompose");
  window.GenericSendMessage(sendInBackground ?
                            Ci.nsIMsgCompDeliverMode.Background :
                            Ci.nsIMsgCompDeliverMode.Now);
  window.ExitFullscreenMode();
}

//overlay
//C:\Program Files\Mozilla Thunderbird\chrome\messenger\content\messenger\messengercompose\MsgComposeCommands.js
var SendMessageWithCheck = function () {
  //add start
  if(!global.ConfirmAddress.checkAddress()){
    return;
  }
  //add end
  // Copied and modified from MsgComposeCommands.js.
  var warn = Services.prefs.getBoolPref("mail.warn_on_send_accel_key");

  var window = Services.wm.getMostRecentWindow("msgcompose");
  if (warn) {
    let bundle = window.getComposeBundle();
    let checkValue = { value: false };
    let buttonPressed = Services.prompt.confirmEx(
      window,
      bundle.getString("sendMessageCheckWindowTitle"),
      bundle.getString("sendMessageCheckLabel"),
      Services.prompt.BUTTON_TITLE_IS_STRING * Services.prompt.BUTTON_POS_0 +
        Services.prompt.BUTTON_TITLE_CANCEL * Services.prompt.BUTTON_POS_1,
      bundle.getString("sendMessageCheckSendButtonLabel"),
      null,
      null,
      bundle.getString("CheckMsg"),
      checkValue
    );
    if (buttonPressed != 0) {
      return;
    }
    if (checkValue.value) {
      Services.prefs.setBoolPref("mail.warn_on_send_accel_key", false);
    }
  }

  let sendInBackground = Services.prefs.getBoolPref(
    "mailnews.sendInBackground"
  );

  let mode;
  if (Services.io.offline) {
    mode = Ci.nsIMsgCompDeliverMode.Later;
  } else {
    mode = sendInBackground
      ? Ci.nsIMsgCompDeliverMode.Background
      : Ci.nsIMsgCompDeliverMode.Now;
  }
  window.GenericSendMessage(mode);
  window.ExitFullscreenMode();
};


var SendMessageLater = function () {
  //add start
  if(!global.ConfirmAddress.checkAddress()){
    return;
  }
  //add end

  // Copied from MsgComposeCommands.js.
  var window = Services.wm.getMostRecentWindow("msgcompose");
  window.GenericSendMessage(Ci.nsIMsgCompDeliverMode.Later);
  window.ExitFullscreenMode();
};
