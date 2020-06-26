/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/* Adapted from the Reply as Original extension (v1.0) and Reply to All as Cc extension (v1.4) */

ChromeUtils.import("resource://msgHdrUtils/misc.js");
ChromeUtils.import("resource://msgHdrUtils/msgHdrUtils.jsm");

var StopIgnoringReplyTo = {
  isReply: function() {
    /* Is this a reply, only to sender? */
    composeType = gMsgCompose.type;
    availableComposeTypes = Components.interfaces.nsIMsgCompType
    return (composeType == availableComposeTypes.ReplyToSender) // reply to sender only
  },

  getMessageHeaderFromURI: function(aURI) {
    return Components.classes['@mozilla.org/messenger;1']
                     .getService(Components.interfaces.nsIMessenger)
                     .msgHdrFromURI(aURI);
  },

  extractAddresses: function(aAddressesWithComments) {
    var parser = Components.classes['@mozilla.org/messenger/headerparser;1']
                   .getService(Components.interfaces.nsIMsgHeaderParser);
    var addresses = {};
    var names = {};
    var fullNames = {};
    var count = {};
    parser.parseHeadersWithArray(aAddressesWithComments, addresses, names, fullNames, count);
    return addresses.value;
  },

  init: function() {
    if (!this.isReply())
      return;

    /* Get original recipient */
    originalHeader = this.getMessageHeaderFromURI(gMsgCompose.originalMsgURI);
    msgHdrGetHeaders(originalHeader, function (aHeaders) {  
      if (!aHeaders.has("reply-to")) {
        console.log("no reply-to");
      	return; // there is no reply-to, we don't care
      }
      else {
        var replyToAddress = aHeaders.get("reply-to");
        for(var row = 1; row <= top.MAX_RECIPIENTS; row++)
        {
          var input = awGetInputElement(row);
          var popup = awGetPopupElement(row);
          if(row > 1) // keep the first one otherwise we get into trouble
          {
            awDeleteRow(row);
          }
          else // if this is the first row, just make it blank
          {
            awSetInputAndPopupValue(input, "", popup, "addr_to", row, true);
          }
        }
        for (var row = 1; row <= top.MAX_RECIPIENTS; row ++)
        {
          if (awGetInputElement(row).value == "")
            break;
        }

        if (row > top.MAX_RECIPIENTS)
          awAppendNewRow(false);

        awSetInputAndPopupValue(awGetInputElement(row), replyToAddress, awGetPopupElement(row), "addr_to", row);

      }
    });  
    return;
  },

  handleEvent: function(aEvent) {
    switch (aEvent.type) {
      case 'compose-window-init':
        document.documentElement.addEventListener('compose-window-close', this, false);
        window.addEventListener('unload', this, false);
        gMsgCompose.RegisterStateListener(this);
        return;

      case 'compose-window-close':
        gMsgCompose.UnregisterStateListener(this);
        return;

      case 'unload':
        document.documentElement.removeEventListener('compose-window-init', this, false);
        document.documentElement.removeEventListener('compose-window-close', this, false);
        window.removeEventListener('unload', this, false);       
        return;
    }
  },

  // nsIMsgComposeStateListener
  NotifyComposeFieldsReady: function() {
    // do it after all fields are constructed completely.
    this.init();
  },
  NotifyComposeBodyReady: function() {
  	var editor = GetCurrentEditor();
  	editor.beginTransaction();
  	editor.endTransaction();
  },
  ComposeProcessDone: function() {},
  SaveInFolderDone: function() {}
};

document.documentElement.addEventListener('compose-window-init', StopIgnoringReplyTo, false);
