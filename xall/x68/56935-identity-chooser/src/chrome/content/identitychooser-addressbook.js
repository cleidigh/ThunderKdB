if(!org) var org={};
if(!org.janek) org.janek={};

org.janek.identitychooser_addressbook = new function(){
  var self = this;
  var pub = {};

  //
  // Initialize class
  //
  pub.init = function() {
    var composeButton = document.getElementById("button-newmessage");

    var extendButtonNew = self.prefsHelper.getBoolPref("extendButtonNewmsg");
    if(extendButtonNew)
      {
        //
        // Convert the default new message button into a menu of identities.
        //
        self.buttonHelper.extendButton("button-newmessage",
                                       "identitychooser-button-newMsgPopup",
                                       pub.createMessageSendPopupABook);
      }

    var extendMailtoLinks = self.prefsHelper.getBoolPref("extendMailtoLinks");
    if(extendMailtoLinks)
      {
        // Prepare extension of mailto-links
        var messagePane = document.getElementById("cvbContact");
        messagePane.addEventListener("click",
                                     self.mailtoHelper.mailtoHandler,
                                     false);
      }

    var emailPopup = document.getElementById("abResultsTreeContext");
    if(emailPopup)
      {
        emailPopup.addEventListener('popupshowing',
                                    pub.extendEmailAddressPopup);
      }
  }

  pub.createMailtoPopup = function() {
    return self.buttonHelper.createIdentitiesPopup2(
      "mailto-popupmenu",
      [],
      pub.composeMessageABookTo);
  }

  pub.createMessageSendPopupABook = function() {
    return self.buttonHelper.createIdentitiesPopup2(
      "identitychooser-button-newMsgPopup",
      [ "newMsgButton-mail-menuitem" ],
      pub.composeMessageABook);
  }

  pub.extendEmailAddressPopup = function() {
    var identitiesPopup =
      document.getElementById("abResultsTreeContext");
    var sendMailToItem =
      document.getElementById("abResultsTreeContext-newmessage");

    self.buttonHelper.removeMessageChildrenFromNode(identitiesPopup, []);

    var allIdentities =
      self.identitiesHelper.getIdentitiesAccountListUserSorted();
    if(allIdentities.length > 0)
      {
        for(var i = 0; i < allIdentities.length; i++)
          {
            var identity = allIdentities[i].identity;

            var includeInMenu = self.prefsHelper.getPrefIncludeInMenu(identity);
            if(!includeInMenu)
              {
                continue;
              }

            var identityMenuItem  = document.createElement("menuitem");
            identityMenuItem.setAttribute("label", identity.identityName);
            identityMenuItem.setAttribute("value",
                                          "identitychooser-" + identity.key);

            identityMenuItem.addEventListener('command',
                                              pub.composeMessageABook,
                                              false);
            identitiesPopup.insertBefore(identityMenuItem,
                                         sendMailToItem);
          }

        var separator2 = document.createElement("menuseparator");
        separator2.setAttribute("value", "identitychooser-separator2");
        identitiesPopup.insertBefore(separator2, sendMailToItem);

        sendMailToItem.hidden = true;
      }
  }

  pub.composeMessageABook = function(event, src) {
    if(src == null) {
      src = event.target;
    }

    // value="identitychooser-id1"
    var identityId = src.value.split("-")[1];
    var identity = self.identitiesHelper.findIdentity(identityId);

    var msgComposeType = Components.interfaces.nsIMsgCompType;
    var msgComposFormat = Components.interfaces.nsIMsgCompFormat;
    var msgCompService = Components.classes["@mozilla.org/messengercompose;1"].getService();
    msgCompService = msgCompService.QueryInterface(Components.interfaces.nsIMsgComposeService);

    var params = Components.classes["@mozilla.org/messengercompose/composeparams;1"].createInstance(Components.interfaces.nsIMsgComposeParams);
    if (params)
      {
        params.identity = identity;
        params.type = msgComposeType.New;
        params.format = msgComposFormat.Default;
        var composeFields = Components.classes["@mozilla.org/messengercompose/composefields;1"].createInstance(Components.interfaces.nsIMsgCompFields);
        if (composeFields)
          {
            if (DirPaneHasFocus())
              composeFields.to = GetSelectedAddressesFromDirTree();
            else
              composeFields.to = GetSelectedAddresses();
            params.composeFields = composeFields;
            msgCompService.OpenComposeWindowWithParams(null, params);
          }
      }
  }

  pub.composeMessageABookTo = function(event, src) {
    if(src == null) {
      src = event.currentTarget;
    }

    var ioService =
      Components.classes["@mozilla.org/network/io-service;1"]
        .getService(Components.interfaces.nsIIOService);

    var mailtoUri = ioService.newURI(self.mailtoHelper.mailtoTarget,
                                     null,
                                     null);
    self.mailtoHelper.mailtoTarget = null;

    if(mailtoUri.scheme == "mailto")
      {
        // value="identitychooser-id1"
        var identityId = src.value.split("-")[1];
        var identity = self.identitiesHelper.findIdentity(identityId);

        var msgComposeType = Components.interfaces.nsIMsgCompType;
        var msgComposFormat = Components.interfaces.nsIMsgCompFormat;
        var msgCompService = Components.classes["@mozilla.org/messengercompose;1"].getService();
        msgCompService = msgCompService.QueryInterface(Components.interfaces.nsIMsgComposeService);

        var params = Components.classes["@mozilla.org/messengercompose/composeparams;1"].createInstance(Components.interfaces.nsIMsgComposeParams);
        if (params)
          {
            params.identity = identity;
            params.type = msgComposeType.New;
            params.format = msgComposFormat.Default;
            var composeFields = Components.classes["@mozilla.org/messengercompose/composefields;1"].createInstance(Components.interfaces.nsIMsgCompFields);
            if (composeFields)
              {
                params.composeFields = composeFields;
                params.composeFields.to = mailtoUri.path;
              }

            msgCompService.OpenComposeWindowWithParams(null, params);
          }
      }
  }

  self.prefsHelper = org.janek.identitychooser_prefshelper();
  self.identitiesHelper = org.janek.identitychooser_identitieshelper();
  self.buttonHelper = org.janek.identitychooser_buttonhelper();
  self.mailtoHelper =
    org.janek.identitychooser_mailtohelper(
      "mailto-popupmenu",
      pub.createMailtoPopup,
      "cvbContact");

  return pub;
};


// Initialize class on window load
window.addEventListener("load",
                        org.janek.identitychooser_addressbook.init,
                        false);
