// Assume that gBitmaskEncryptionState is true; if we detect a recipient
// whose public key we don't know, we will set it to false, indicating
// that the message will not be encrypted.
var gBitmaskEncryptionState = true;

var composeStateListener = {
  NotifyComposeBodyReady: function() {
  }
};

function insertEncryptionHeaders(event) {
  // let msgComposeWindow = document.getElementById("msgcomposeWindow");
  // let msgType = msgComposeWindow.getAttribute("msgType");

  // // We only care about an actual send event.
  // if (!(msgType == nsIMsgCompDeliverMode.Now || msgType == nsIMsgCompDeliverMode.Later))
  //   return;

  // // If gBitmaskEncryptionState is true that means that we know the public key
  // // of all the recipients (see updateEncryptionStatus) and therefore we
  // // manually add the encryption headers so that when we later call msg_status
  // // from Bitmask, Thunderbird will know that the message was sent as
  // // encrypted. This however does not work for older messages; see
  // // https://0xacab.org/leap/bitmask-dev/issues/9202
  // if (gBitmaskEncryptionState === true) {
  //   gMsgCompose.compFields.setHeader("X-Leap-Encryption", "decrypted");
  //   gMsgCompose.compFields.setHeader("X-Leap-Signature", "valid");
  // }
}

// From addressingWidgetOverlay.js; we use this to call the function to update
// the status of the encryption keys for the various "To" fields.  This is for
// the case where the user presses "Return" or "Tab" and Thunderbird inserts a
// new "To" row, and we then update the encryption key status for each row.
function awRecipientKeyPress(event, element)
{
  switch(event.keyCode) {
  case KeyEvent.DOM_VK_RETURN:
  case KeyEvent.DOM_VK_TAB:
    // if the user text contains a comma or a line return, ignore
    if (element.value.includes(','))
    {
      var addresses = element.value;
      element.value = ""; // clear out the current line so we don't try to autocomplete it..
      parseAndAddAddresses(addresses, awGetPopupElement(awGetRowByInputElement(element)).value);
    }
    else if (event.keyCode == KeyEvent.DOM_VK_TAB)
      awTabFromRecipient(element, event);

    // Bitmask: update the encryption status.
    checkToField.updateEncryptionStatus();
    break;
  }
}

var checkToField = {
  // It is possible to enter all "To" addresses in a single field but since we
  // are displaying the encryption key per field (per row), we need to split a
  // single field into multiple fields if it contains a "," and then check
  // the encryption status for each field.
  splitInput: function(event) {
    let id = event.target.id;
    id = id.slice(id.lastIndexOf('#')+1);

    let toFieldInput = document.getElementById("addressCol2#" + id);

    if (toFieldInput.value.includes(",")) {
      let addresses = toFieldInput.value;
      toFieldInput.value = "";
      parseAndAddAddresses(addresses, awGetPopupElement(awGetRowByInputElement(toFieldInput)).value);
      checkToField.updateEncryptionStatus();
    }
  },

  updateEncryptionStatus: function() {
    for (let i = 1; i <= awGetNumberOfRecipients(); i++) {
      // Get the "To" field which has the email address.
      let toField = document.getElementById("addressCol2#" + i);
      // gCurrentIdentity.email returns the current identity.
      let promise = bitmask.keys.exprt(gCurrentIdentity.email, toField.value);

      if (toField.value) {
        let image = document.createElement("image");
        toField.appendChild(image);

        promise.then(function(data) {
          toField.getElementsByTagName("image")[0].setAttribute("src",
            "chrome://bitmask/skin/lock.png");
        }).catch(function(error) {
          // We detected a missing public key; message will be unencrypted.
          gBitmaskEncryptionState = false;
          toField.getElementsByTagName("image")[0].setAttribute("src",
            "chrome://bitmask/skin/unlock.png");
        });
      }
      else {
        toField.getElementsByTagName("image")[0].setAttribute("src", "");
      }
    }
  }
};

window.addEventListener("compose-window-init", function(event) {
  gMsgCompose.RegisterStateListener(composeStateListener);
}, true);

window.addEventListener("compose-send-message", insertEncryptionHeaders, true);
