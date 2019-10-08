if(!org) var org={};
if(!org.janek) org.janek={};

if (typeof identitychooser == "undefined") {
  var identitychooser = {};
};

Components.utils.import("chrome://identitychooser/content/identitychooser-storage.js",
                        identitychooser);

Components.utils.import("resource://gre/modules/Services.jsm");
Components.utils.import("resource:///modules/MailServices.jsm");

org.janek.identitychooser_messengercompose = new function() {
  var self = this;
  var pub = {};

  self.prefsHelper = org.janek.identitychooser_prefshelper();
  self.identitiesHelper = org.janek.identitychooser_identitieshelper();
  self.originalBackgroundColor = null;
  self.thunderbirdComposeStartup = null;
  self.composeStartupParams = null;
  self.sendWarningRemindLater = null;
  self.sendWarningAcceptRecipient = false;

  //
  // Initialize class
  //
  pub.init = function() {
    console.log("messengercompose#init");

    self.thunderbirdComposeStartup = ComposeStartup;
    ComposeStartup = self.composeStartup;

    self.thunderbirdSetComposeWindowTitle = SetComposeWindowTitle;
    SetComposeWindowTitle = self.setComposeWindowTitle;

    self.identityWidget = document.getElementById('msgIdentity');
    self.addressesBox = document.getElementById('addresses-box');
    if(self.addressesBox == null)
      {
        self.addressesBox = document.getElementById('MsgHeadersToolbar');
      }

    self.originalBackgroundColor = self.addressesBox.style.backgroundColor;

    self.prefsHelper.getPrefsBranch().addObserver("", pub, false);

    // Register event listener on the identity combo box. When its value
    // changes, we need to apply the chosen identity's color
    self.identityWidget.addEventListener("command",
                                         self.identityChanged,
                                         true);

    self.identityWidget.menupopup.addEventListener("popupshowing",
                                                   self.onIdentityMenuShowing,
                                                   true);

    var key = document.getElementById("key_newMessage");
    if(key != null)
      {
        key.setAttribute("command", "identitychooser-open-composer");
      }

    var key2 = document.getElementById("key_newMessage2");
    if(key2 != null)
      {
        key2.setAttribute("command", "identitychooser-open-composer");
      }

    // Update the identity color when the window is initialized
    document.getElementById("msgcomposeWindow")
      .addEventListener("compose-window-init", self.onComposeWindowInit, false);

    window.addEventListener("compose-window-close",
                            self.onComposeWindowClose,
                            true );

    // Register event listener for shutdown
    window.addEventListener("unload", self.onUnload, false);

    window.addEventListener("compose-send-message",
                            self.onComposeSendMessage,
                            true );

    self.onComposeWindowInit();
  }

  self.onIdentityMenuShowing = function(e) {
    var popup = this;

    for(var i = popup.childNodes.length - 1; i >= 0; i--)
      {
        var child = popup.childNodes.item(i)

        popup.removeChild(child);
      }

    var allIdentities =
      self.identitiesHelper.getIdentitiesAccountListUserSorted();
    for(var i = 0; i < allIdentities.length; i++)
      {
        var identity = allIdentities[i].identity;
        var account = allIdentities[i].account;

        var includeInMenu = self.prefsHelper.getPrefIncludeInMenu(identity);

        if(!includeInMenu)
          {
            continue;
          }

        var menuItem = document.createElement("menuitem");

        menuItem.setAttribute("label", identity.identityName);
        menuItem.setAttribute("value", identity.identityName);
        menuItem.setAttribute("identitykey", identity.key);
        menuItem.setAttribute("description", account.incomingServer.prettyName);
        menuItem.setAttribute("accountkey", account.key);

        popup.appendChild(menuItem);
      }
  }

  self.composeStartup = function(recycled, params) {
    if(params)
      {
        self.composeStartupParams = params;
      }

    if(self.thunderbirdComposeStartup)
      {
        self.thunderbirdComposeStartup(recycled, params);
      }
  }

  self.getSelectedIdentityKey = function() {
    var idKey = self.identityWidget.selectedItem.getAttribute("identitykey");
    if(idKey == null) {
      idKey = self.identityWidget.selectedItem.getAttribute("value");
    }

    return idKey;
  }

  self.setComposeWindowTitle = function() {
    self.thunderbirdSetComposeWindowTitle();

    var identityKey = self.getSelectedIdentityKey();
    var identity =
      self.identitiesHelper.findIdentity(identityKey);
    var readableIdentity = self.identitiesHelper.identityToString(identity);

    document.title = document.title + ' - ' + readableIdentity;
  }

  self.addEmailAddressToAddressBook = function(event) {
    var emailAddress = event.target.getAttribute("href");

    var identityKey = self.getSelectedIdentityKey();
    var identity =
      self.identitiesHelper.findIdentity(identityKey);
    var identityWarnIfUsed = self.prefsHelper.getPrefWarnIfUsed(identity);
    var warnIfUsedMode = self.prefsHelper.getPrefWarnIfUsedMode(identity);

    if(identityWarnIfUsed &&
       warnIfUsedMode != null &&
       warnIfUsedMode != 'always') {
      var nBox = document.getElementById("identitychooser-sendwarning-box");
      var bundle = document.getElementById("identitychooser-strings");

      var abookUri = warnIfUsedMode;
      window.openDialog("chrome://messenger/content/addressbook/abNewCardDialog.xul",
                        "",
                        "chrome,modal,resizable=no,centerscreen",
                        {selectedAB:abookUri, primaryEmail:emailAddress});
    }

    event.preventDefault();
  }

  self.getEmailAddress = function(fieldValue) {
    var mimeHeaderParser = MailServices.headerParser;
    var mailboxAddress = mimeHeaderParser.extractHeaderAddressMailboxes(fieldValue);

    return mailboxAddress;
  }

  self.checkRecipientEmailAddress = function(fieldValue,
                                             recipientType,
                                             abookUri) {
    var recipient = null;
    var shouldWarn = false;

    switch (recipientType) {
    case "addr_to"    :
    case "addr_cc"    :
    case "addr_bcc"   :
    case "addr_reply" :
      try {
        recipient = self.getEmailAddress(fieldValue);
      }
      catch (ex) {
        recipient = fieldValue;
      }

      break;
    }

    var abCard = self.searchCard(recipient, abookUri);

    // If abCard == null, the address book did not contain the email adress
    // ==> we should warn the user

    return (abCard == null);
  }

  self.onComposeWindowInit = function() {
    self.identityChanged();

    var extendButtonForward = self.prefsHelper.getBoolPref("extendButtonForward");
    if(extendButtonForward &&
       identitychooser.identitychooserStorage.get("org.janek.ic.internalforward", false) == false) {
      if(window.arguments && window.arguments[0] &&
         !(window.arguments[0] instanceof Components.interfaces.nsIMsgComposeParams))
        {
          self.openIdentityWidget();
        }
      else if(window.arguments && window.arguments[0] &&
              window.arguments[0] instanceof Components.interfaces.nsIMsgComposeParams)
        {
          if(self.isComposerOpenedThroughSendToMailRecipient(window.arguments[0]))
            {
              self.openIdentityWidget();
            }
        }
      else if(self.composeStartupParams)
        {
          if(self.isComposerOpenedThroughSendToMailRecipient(self.composeStartupParams))
            {
              self.openIdentityWidget();
            }
        }
    }
  };

  self.onComposeWindowClose = function(e) {
  }

  self.onComposeSendMessage = function(e) {
    var msgcomposeWindow = document.getElementById( "msgcomposeWindow" );
    var msgType = msgcomposeWindow.getAttribute( "msgtype" );

    // do not continue unless this is an actual send event
    if(!(msgType == nsIMsgCompDeliverMode.Now ||
         msgType == nsIMsgCompDeliverMode.Later)) {
      return;
    }

    var identityKey = self.getSelectedIdentityKey();
    var identity =
      self.identitiesHelper.findIdentity(identityKey);
    var identityWarnIfUsed = self.prefsHelper.getPrefWarnIfUsed(identity);
    var warnIfUsedMode = self.prefsHelper.getPrefWarnIfUsedMode(identity);
    var result = null;

    if(identityWarnIfUsed && warnIfUsedMode == 'always')
      {
        try
          {
            var bundle = document.getElementById("identitychooser-strings");
            var warnIfUsedDialogTitle = bundle.getString("alwaysWarnIfUsedDialog.title");

            var warnIfUsedDialogMessage = bundle.getString("alwaysWarnIfUsedDialog.message");
            var sendButtonLabel = bundle.getString("alwaysWarnIfUsedDialog.sendButtonLabel");

            result =
              Services.prompt.confirmEx(
                window,
                warnIfUsedDialogTitle,
                warnIfUsedDialogMessage,
                (Services.prompt.BUTTON_TITLE_IS_STRING*Services.prompt.BUTTON_POS_0) +
                (Services.prompt.BUTTON_TITLE_CANCEL*Services.prompt.BUTTON_POS_1),
                sendButtonLabel, null, null, null, {value:0});

            if(result == 1)
              {
                e.preventDefault();
                return false;
              }
          }
        catch(ex)
          {
            alert(ex);
            e.preventDefault();
            return false;
          }
      }
    else if(identityWarnIfUsed &&
            warnIfUsedMode != null &&
            (self.sendWarningRemindLater == null ||
             self.sendWarningRemindLater == true) &&
            self.sendWarningAcceptRecipient == false)
      {
        var abookUri = warnIfUsedMode;

        var gMimeHeaderParser = MailServices.headerParser;
        var i = 1;
        var recipientType;
        var inputField;
        var fieldValue;
        var recipient;

        var shouldWarn = false;
        while ((inputField = self.awGetInputElement(i)))
          {
            inputField = self.awGetInputElement(i);

            fieldValue = inputField.value;

            if (fieldValue == null)
              fieldValue = inputField.getAttribute("value");

            if (fieldValue != "")
              {
                recipientType = awGetPopupElement(i).selectedItem.getAttribute("value");
                recipient = null;

                switch (recipientType)
                  {
                  case "addr_to"    :
                  case "addr_cc"    :
                  case "addr_bcc"   :
                  case "addr_reply" :
                      try {
                          recipient =
                              gMimeHeaderParser.reformatUnquotedAddresses(fieldValue);

                          // remove everything that is not the email address
                          recipient =
                              gMimeHeaderParser.extractHeaderAddressMailboxes(recipient);

                      } catch (ex) {recipient = fieldValue;}
                      break;
                  }

                  var abCard = self.searchCard(recipient, abookUri);
                  if(abCard == null) {
                      shouldWarn = true;
                  }
              }

              i++;
          }

          if(shouldWarn) {
              var abook = self.getAbook(abookUri);
              var bundle = document.getElementById("identitychooser-strings");
              var warnIfUsedDialogTitle = bundle.getString("abookWarnIfUsedDialog.title");
              var warnIfUsedDialogMessage = bundle.getString("abookWarnIfUsedDialog.message");
              warnIfUsedDialogMessage = warnIfUsedDialogMessage.replace(/@S/g,
                                                                        abook.dirName);
              var sendButtonLabel = bundle.getString("abookWarnIfUsedDialog.sendButtonLabel");

              result =
                  Services.prompt.confirmEx(
                      window,
                      warnIfUsedDialogTitle,
                      warnIfUsedDialogMessage,
                      (Services.prompt.BUTTON_TITLE_IS_STRING*Services.prompt.BUTTON_POS_0) +
                      (Services.prompt.BUTTON_TITLE_CANCEL*Services.prompt.BUTTON_POS_1),
                      sendButtonLabel, null, null, null, {value:0});

              if(result == 1) {
                  e.preventDefault();
                  return false;
              }
          }
      }
  }

    self.getAbook = function(abookUri) {
      try {
        var abManager = Components.classes["@mozilla.org/abmanager;1"]
          .getService(Components.interfaces.nsIAbManager);

        return abManager.getDirectory(abookUri);
      }
      catch(e) {
        return null;
      }
    }

    self.searchCard = function(searchValue, abookUri) {
        var abManager = Components.classes["@mozilla.org/abmanager;1"]
          .getService(Components.interfaces.nsIAbManager);
        var addressBook = abManager.getDirectory(abookUri);

        var searchQuery = "?(or(PrimaryEmail,c,@V)(SecondEmail,c,@V))";
        searchQuery = searchQuery.replace(/@V/g, encodeURIComponent(searchValue));

        var card = null;
        if(addressBook != null &&
           addressBook instanceof Components.interfaces.nsIAbDirectory &&
           !addressBook.isRemote) {
            var searchResults =
                abManager.getDirectory(addressBook.URI + searchQuery).childCards;

            while(searchResults.hasMoreElements()) {
                var r = searchResults.getNext();

                if(r instanceof Components.interfaces.nsIAbCard) {
                    return r;
                }
            }
        }

        return null;
    }

  self.awGetInputElement = function(row) {
    return document.getElementById("addressCol2#" + row);
  }

  self.openIdentityWidget = function() {
    window.setTimeout(function() {
        self.identityWidget.open = true;
      }, 500);
  }

  self.onUnload = function() {
    self.identityWidget.removeEventListener("command",
                                            self.identityChanged,
                                            false);

    window.removeEventListener("load",
                               org.janek.identitychooser_messengercompose.init,
                               false);

    document.getElementById("msgcomposeWindow")
      .removeEventListener("compose-window-init", self.onComposeWindowInit, false);
    window.removeEventListener("compose-window-close", self.onComposeWindowClose, false);

    document.getElementById("msgcomposeWindow")
      .removeEventListener("compose-send-message", self.onComposeSendMessage, false);

    window.removeEventListener("unload", self.onUnload, false);
  }

  self.isComposerOpenedThroughSendToMailRecipient = function(params) {
    // We assume that the editor window was opened via Windows' send
    // to mail recipient mechanism if:
    // - the to field is empty
    // - the subject contains text
    // - the body contains text
    // - there exist an attachment

    return params.composeFields.to == "" &&
      params.composeFields.subject != "" &&
      params.composeFields.body != "" &&
      params.composeFields.attachments.hasMoreElements();
  }

  self.identityChanged = function() {
    var identityKey = self.getSelectedIdentityKey();
    var identity =
      self.identitiesHelper.findIdentity(identityKey);
    var identityColoring = self.prefsHelper.getPrefColorizeIdentity(identity);

    if(identityColoring)
      {
        self.colorizeIdentity(identity);
      }
    else
      {
        self.unColorizeIdentity();
      }

    self.setComposeWindowTitle();
  }

  self.colorizeIdentity = function(identity) {
    var identityColor = self.prefsHelper.getPrefColor(identity);
    self.addressesBox.style.backgroundColor = identityColor;
  }

  self.unColorizeIdentity = function() {
    self.addressesBox.style.backgroundColor = self.originalBackgroundColor;
  }

  pub.observe = function(subject, topic, data) {
     if (topic == "nsPref:changed" &&
         data == "identityColoring")
       {
         self.identityChanged();
       }
   }

  pub.openNewMessage = function(event) {
    var identityId = self.identityWidget.selectedItem.value;
    var identity = self.identitiesHelper.findIdentity(identityId);

    if(identity != null)
      {
        var params =
          Components.classes["@mozilla.org/messengercompose/composeparams;1"]
            .createInstance(Components.interfaces.nsIMsgComposeParams);

        var fields =
          Components.classes["@mozilla.org/messengercompose/composefields;1"]
            .createInstance(Components.interfaces.nsIMsgCompFields);
        params.composeFields = fields;

        params.type = Components.interfaces.nsIMsgCompType.New;
        params.format = Components.interfaces.nsIMsgCompFormat.Default;
        params.identity = identity;

        var msgCompService =
          Components.classes["@mozilla.org/messengercompose;1"].getService();
        msgCompService =
          msgCompService.QueryInterface(
            Components.interfaces.nsIMsgComposeService);

        msgCompService.OpenComposeWindowWithParams(null, params);
      }

  }

  return pub;
};


// Initialize class on window load
window.addEventListener("load",
                        org.janek.identitychooser_messengercompose.init,
                        false);

Services.console.log("messengercompose.js");
