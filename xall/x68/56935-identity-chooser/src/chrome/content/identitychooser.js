if(!org) var org={};
if(!org.janek) org.janek={};

if (typeof identitychooser == "undefined") {
  var identitychooser = {};
};

Components.utils.import("chrome://identitychooser/content/identitychooser-storage.js",
                        identitychooser);

org.janek.identitychooser = new function() {
  // Objekt zum Zugriff auf die Logkonsole.
  var consoleService =
    Components.classes["@mozilla.org/consoleservice;1"]
              .getService(Components.interfaces.nsIConsoleService);

  var self = this;
  var pub = {};

  self.createHdrReplyAllIdentitiesPopup = function() {
    var identitiesPopup = document.getElementById("hdrReplyAllDropdown");

    var hdrReplyAllButton = document.getElementById("hdrReplyAllSubButton");
    if(hdrReplyAllButton == null) {
      hdrReplyAllButton = document.getElementById("hdrReplyAll_ReplyAllSubButton");
    }

    var hdrReplyAllLabel = hdrReplyAllButton.getAttribute("label");
    var hdrReplyLabel =
      document
        .getElementById("hdrReplySubButton")
          .getAttribute("label");

    self.buttonHelper.removeMessageChildrenFromNode(identitiesPopup,
                                                    [ "hdrReplyAllSubButton",
                                                      "hdrReplyAllSubButtonSep",
                                                      "hdrReplyAllSubSeparator",
                                                      "hdrReplyAll_ReplyAllSubButton",
                                                      "hdrReplySubButton" ]);

    var disabledReplyAllMenuItem = document.createElement("menuitem");
    disabledReplyAllMenuItem.setAttribute("id",
                                          "hdrReplyAllSubButton");
    disabledReplyAllMenuItem.setAttribute("label",
                                          hdrReplyAllLabel);
    disabledReplyAllMenuItem.setAttribute(
      "value",
      "identitychooser-hdrReplyAllSubButton");
    disabledReplyAllMenuItem.setAttribute("disabled", true);
    identitiesPopup.appendChild(disabledReplyAllMenuItem);

    var separator = document.createElement("menuseparator");
    separator.setAttribute('value', 'identitychooser-separator');
    identitiesPopup.appendChild(separator);

    self.buttonHelper.addIdentitiesToPopup2(
      identitiesPopup,
      null,
      function(event, src) {
        pub.replyAllMessage(event, this);
        RestoreFocusAfterHdrButton();
      });


    var separator = document.createElement("menuseparator");
    separator.setAttribute('value', 'identitychooser-separator-2');
    identitiesPopup.appendChild(separator);

    var disabledReplyMenuItem = document.createElement("menuitem");
    disabledReplyMenuItem.setAttribute("id",
                                       "hdrReplySubButton");
    disabledReplyMenuItem.setAttribute("label",
                                       hdrReplyLabel);
    disabledReplyMenuItem.setAttribute(
      "value",
      "identitychooser-hdrReplySubButton");
    disabledReplyMenuItem.setAttribute("disabled", true);
    identitiesPopup.appendChild(disabledReplyMenuItem);

    var separator = document.createElement("menuseparator");
    separator.setAttribute('value', 'identitychooser-separator-3');
    identitiesPopup.appendChild(separator);

    self.buttonHelper.addIdentitiesToPopup2(
      identitiesPopup,
      null,
      function(event, src) {
       pub.replyMessage(event, this);
        RestoreFocusAfterHdrButton();
      });
  }

  self.createHdrReplyListIdentitiesPopup = function() {
    var identitiesPopup = document.getElementById("hdrReplyListDropdown");

    var hdrReplyListLabel =
      document
        .getElementById("hdrReplyList_ReplyListSubButton")
          .getAttribute("label");
    var hdrReplyAllLabel =
      document
        .getElementById("hdrRelplyList_ReplyAllSubButton")
          .getAttribute("label");
    var hdrReplyLabel =
      document
        .getElementById("hdrReplyList_ReplySubButton")
          .getAttribute("label");

    self.buttonHelper.removeMessageChildrenFromNode(identitiesPopup,
                                                    [ "hdrReplyList_ReplyListSubButton",
                                                      "hdrReplyAllSubButton",
                                                      "hdrRelplyList_ReplyAllSubButton",
                                                      "hdrReplyList_ReplySubButton" ]);

    var disabledReplyListMenuItem = document.createElement("menuitem");
    disabledReplyListMenuItem.setAttribute("id",
                                           "hdrReplyListSubButton");
    disabledReplyListMenuItem.setAttribute("label",
                                           hdrReplyListLabel);
    disabledReplyListMenuItem.setAttribute(
      "value",
      "identitychooser-hdrReplyListSubButton");
    disabledReplyListMenuItem.setAttribute("disabled", true);
    identitiesPopup.appendChild(disabledReplyListMenuItem);

    var separator = document.createElement("menuseparator");
    separator.setAttribute('value', 'identitychooser-separator');
    identitiesPopup.appendChild(separator);

    self.buttonHelper.addIdentitiesToPopup2(
      identitiesPopup,
      null,
      function(event) {
        pub.replyListMessage(event, this);
        RestoreFocusAfterHdrButton()
      });

    var separator = document.createElement("menuseparator");
    separator.setAttribute('value', 'identitychooser-separator');
    identitiesPopup.appendChild(separator);

    var disabledReplyAllMenuItem = document.createElement("menuitem");
    disabledReplyAllMenuItem.setAttribute("id",
                                          "hdrReplyAllSubButton");

    disabledReplyAllMenuItem.setAttribute("label",
                                          hdrReplyAllLabel);
    disabledReplyAllMenuItem.setAttribute(
      "value",
      "identitychooser-hdrReplyAllSubButton");
    disabledReplyAllMenuItem.setAttribute("disabled", true);
    identitiesPopup.appendChild(disabledReplyAllMenuItem);

    var separator = document.createElement("menuseparator");
    separator.setAttribute('value', 'identitychooser-separator-2');
    identitiesPopup.appendChild(separator);

    self.buttonHelper.addIdentitiesToPopup2(
      identitiesPopup,
      null,
      function(event) {
        pub.replyAllMessage(event, this);
        RestoreFocusAfterHdrButton()
      });


    var separator = document.createElement("menuseparator");
    separator.setAttribute('value', 'identitychooser-separator-3');
    identitiesPopup.appendChild(separator);

    var disabledReplyMenuItem = document.createElement("menuitem");
    disabledReplyMenuItem.setAttribute("id",
                                       "hdrReplySubButton");

    disabledReplyMenuItem.setAttribute("label",
                                       hdrReplyLabel);
    disabledReplyMenuItem.setAttribute(
      "value",
      "identitychooser-hdrReplySubButton");
    disabledReplyMenuItem.setAttribute("disabled", true);
    identitiesPopup.appendChild(disabledReplyMenuItem);

    var separator = document.createElement("menuseparator");
    separator.setAttribute('value', 'identitychooser-separator-4');
    identitiesPopup.appendChild(separator);

    self.buttonHelper.addIdentitiesToPopup2(
      identitiesPopup,
      null,
      function(event) {
        pub.replyMessage(event, this);
        RestoreFocusAfterHdrButton();
      });
  }

  self.getForwardType = function() {
    var forwardType = Components.interfaces.nsIMsgCompType.ForwardAsAttachment;
    var prefBranch = Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefService).getBranch(null);

    try
      {
        var forwardTypePref =
          prefBranch.getIntPref("mail.forward_message_mode");

        if(forwardTypePref == 0)
          {
            forwardType =
              Components.interfaces.nsIMsgCompType.ForwardAsAttachment;
          }
        else
          {
            forwardType = Components.interfaces.nsIMsgCompType.ForwardInline;
          }
      }
    catch (ex)
      {
        dump("failed to retrieve pref mail.forward_message_mode");
      }

    return forwardType;
  }

  self.getMessageFormat = function(event) {
    var msgFormat = Components.interfaces.nsIMsgCompFormat.Default;

    if (event && event.shiftKey)
      {
        msgFormat = Components.interfaces.nsIMsgCompFormat.OppositeOfDefault;
      }
    else
      {
        msgFormat = Components.interfaces.nsIMsgCompFormat.Default;
      }

    return msgFormat;
  }

  self.sendSelectedMessagesFromIdentity = function(identity,
                                                   composeType,
                                                   msgFormat) {
    var msgCompService = self.createMsgComposeService();
    messenger.setWindow(window, msgWindow);
    var msgUris = gFolderDisplay ? gFolderDisplay.selectedMessageUris : null;

    var uri = "";
    if(msgUris && msgUris.length > 0)
      {
        for(var i = 0; i < msgUris.length; i++)
          {
            var msgUri = msgUris[i];
            var msgHdr = messenger.msgHdrFromURI(msgUris[i]);

            if(composeType == Components.interfaces.nsIMsgCompType.ForwardInline ||
               composeType == Components.interfaces.nsIMsgCompType.Reply ||
               composeType == Components.interfaces.nsIMsgCompType.ReplyAll ||
               composeType == Components.interfaces.nsIMsgCompType.ReplyToList ||
               composeType == Components.interfaces.nsIMsgCompType.ReplyToGroup ||
               composeType == Components.interfaces.nsIMsgCompType.ReplyToSender ||
               composeType == Components.interfaces.nsIMsgCompType.ReplyToSenderAndGroup ||
               composeType == Components.interfaces.nsIMsgCompType.Template)
              {
                if(composeType == Components.interfaces.nsIMsgCompType.ForwardInline) {
                  identitychooser.identitychooserStorage.set("org.janek.ic.internalforward", true);
                }

                msgCompService.OpenComposeWindow(null,
                                                    msgHdr,
                                                    msgUri,
                                                    composeType,
                                                    msgFormat,
                                                    identity,
                                                    msgWindow);

                // Limit the number of new compose windows to 8. Why
                // 8? Because thats the default in
                // mailCommands.js#ComposeMessage(...)
                if (i == 7)
                  {
                    break;
                  }
              }
            else
              {
                if(i > 0)
                  {
                    uri += ",";
                  }

                uri += msgUri;
              }
          }

        // If we have more than one ForwardAsAttachment then pass null
        // instead of the header to tell the compose service to work
        // out the attachment subjects from the URIs.
        if (composeType == Components.interfaces.nsIMsgCompType.ForwardAsAttachment && uri)
          {
            identitychooser.identitychooserStorage.set("org.janek.ic.internalforward", true);

            msgCompService.OpenComposeWindow(
              null,
              msgUris.length > 1 ? null : msgHdr,
              uri,
              composeType,
              msgFormat,
              identity,
              msgWindow);
          }
      }
  }

  pub.setUpToolbarButtons = function(uri) {
    self.seaMonkeySetUpToolbarButtons();

    if(typeof gReplyButton != 'undefined') {
      gReplyButton.setAttribute("type", "menu");
    }

    if(typeof gReplyAllButton != 'undefined') {
      gReplyAllButton.setAttribute("type", "menu");
    }
  }

  //
  // Initialisiere das Addin
  //
  pub.init = function() {
    console.log('identitychooser#init');

    var accountsPrefsObserver = {
      observe: function(subject, topic, data) {
        if(data.match(/identities$/)) {
          // The identities pref of one of the accounts changed.
          // If the user deleted an identity we remove its associated
          // Identity Chooser prefs.


          // Find all configured Identity Chooser identities by enumerating
          // over the IC prefs.
          var children = self.prefsHelper.getPrefsBranch().getChildList("",  {});
          var identityChooserIdentities = [];
          for(var i = 0; i < children.length; i++) {
            var pref = children[i];
            if(pref.match(/^id[0-9]+.*/)) {
              var id = children[i].split('.', 1)[0];
              if(identityChooserIdentities.indexOf(id) == -1) {
                identityChooserIdentities.push(id);
              }
            }
          }

          // For every configured Identity Chooser identity check if there's
          // a TB identity defined. If not, delete the IC branch for that
          // identity.
          for(var i = 0; i < identityChooserIdentities.length; i++) {
            var id = identityChooserIdentities[i];
            if(self.identitiesHelper.findIdentity(id) == null) {
              self.prefsHelper.getPrefsBranch().deleteBranch(id);
            }
          }
        }
      }
    };

    self.accountsBranchPrefs.QueryInterface(Components.interfaces.nsIPrefBranch);
    self.accountsBranchPrefs.addObserver("", accountsPrefsObserver, false);

    //
    // Migrate the old org.janek.IdentityChooser.identityColoring pref
    // to the new indivual prefs
    //
    if(self.prefsHelper.getPrefsBranch().prefHasUserValue("identityColoring"))
      {
        var colorizeIdentityEnabled =
          self.prefsHelper.getBoolPref("identityColoring");
        var allIdentities = self.identitiesHelper.getAllIdentities();
        for(var i = 0; i < allIdentities.length; i++)
          {
            var identity = allIdentities[i];
            self.prefsHelper.setPrefColorizeIdentity(identity,
                                                     colorizeIdentityEnabled);
          }

        self.prefsHelper.getPrefsBranch().clearUserPref("identityColoring");
      }

    //
    // Migrate prefs from org.janek.IdentityChooser to
    // extensions.org.janek.IdentityChooser
    //
    var deprBranch = self.prefsHelper.getDeprecatedPrefsBranch();
    var deprChildren = deprBranch.getChildList("",  {});
    for(var i = 0; i < deprChildren.length; i++) {
      var prefName = deprChildren[i];

      if(32 === deprBranch.getPrefType(prefName)) {
        var prefVal = deprBranch.getCharPref(prefName);
        self.prefsHelper.getPrefsBranch().setCharPref(prefName, prefVal);
      }
      else if(64 === deprBranch.getPrefType(prefName)) {
        var prefVal = deprBranch.getIntPref(prefName);
        self.prefsHelper.getPrefsBranch().setIntPref(prefName, prefVal);
      }
      else if(128 === deprBranch.getPrefType(prefName)) {
        var prefVal = deprBranch.getBoolPref(prefName);
        self.prefsHelper.getPrefsBranch().setBoolPref(prefName, prefVal);
      }
    }
    deprBranch.deleteBranch("");


    var headerViewToolBox = document.getElementById("header-view-toolbox");
    if(headerViewToolBox)
      {
        headerViewToolBox.setAttribute("labelalign", "end");
      }

    var extendButtonNew = self.prefsHelper.getBoolPref("extendButtonNewmsg");
    if(extendButtonNew)
      {
        //
        // ExternalTemplateLoader
        //   (http://nic-nac-project.de/~kaosmos/templateloader-en.html)
        // defines it's own menu for button-newmsg.
        //
        // Some users ask to suppress this menu and show Identity
        // Chooser's menu instead. We'll do it but don't expose a UI for
        // it, the suppression is triggered through a pref.
        //
        var suppressExtTemplateLoaderMenu =
          self.prefsHelper.getBoolPref("suppressExtTemplateLoaderMenu");

        if(suppressExtTemplateLoaderMenu)
          {
            var newButton = document.getElementById("button-newmsg");
            var extTemplateLoaderMenu = document.getElementById("templateMenu");

            if(extTemplateLoaderMenu != null)
              {
                newButton.removeChild(extTemplateLoaderMenu);
              }
          }

        //
        // Convert the default new message button into a menu of identities.
        //
        self.buttonHelper.extendButton("button-newmsg",
                                       "button-newMsgPopup",
                                       pub.createMessageSendPopup);

        // Redefine keyboard shortcut Ctrl-N: Instead of opening a new
        // message with the default identity, open the identity menu
        // and let the user choose the identity.
        var button = document.getElementById("button-newmsg");

        // Shortcut in Thunderbird
        var key = document.getElementById("key_newMessage2");
        if(key == null)
          {
            // Shortcut in Seamonkey
            key = document.getElementById("key_newMessage");
          }

        if(key != null)
          {
            key.setAttribute("command", 'identitychooser-open-new-msg-popup');
          }

        // SeaMonkey
        var xulAppInfo = Components.classes["@mozilla.org/xre/app-info;1"]
          .getService(Components.interfaces.nsIXULAppInfo);
        if(xulAppInfo.name == "SeaMonkey")
          {
            var newMsgHtmlMenuItem = document.getElementById("button-newMsgHTML");
            newMsgHtmlMenuItem.addEventListener("command",
                                                MsgNewMessage,
                                                false);

            var newMsgPlainMenuItem = document.getElementById("button-newMsgPlain");
            newMsgPlainMenuItem.addEventListener("command",
                                                 MsgNewMessage,
                                                 false);
          }
      }

    var extendButtonForward = self.prefsHelper.getBoolPref("extendButtonForward");
    if(extendButtonForward)
      {
        //
        // Convert the default forward message button into a menu of identities.
        //
        self.buttonHelper.extendButton("button-forward",
                                       "button-ForwardPopup",
                                       pub.createMessageForwardPopup);

        //
        // Convert the default message pane forward message button
        // into a menu of identities.
        //
        self.buttonHelper.extendButton("hdrForwardButton",
                                       "identitychooser-hdrforward-identitiespopup",
                                       pub.createMessageHdrForwardPopup);

        var key = document.getElementById("key_forward");
        if(key != null)
          {
            key.setAttribute("command", "identitychooser-open-forward-popup");
          }
      }

    var extendButtonReply = self.prefsHelper.getBoolPref("extendButtonReply");
    if(extendButtonReply)
      {
        var versionComparator =
          Components.classes["@mozilla.org/xpcom/version-comparator;1"]
          .getService(Components.interfaces.nsIVersionComparator);

        //
        // SeaMonkey 2: SeaMonkey uses a function enable/disable the
        // popup menu for the reply buttons. We need to replace this
        // function with our own to make sure the identities are displayed
        //
        var xulAppInfo = Components.classes["@mozilla.org/xre/app-info;1"]
          .getService(Components.interfaces.nsIXULAppInfo);
        if(xulAppInfo.name == "SeaMonkey")
          {
            self.seaMonkeySetUpToolbarButtons = SetUpToolbarButtons;
            SetUpToolbarButtons = pub.setUpToolbarButtons;
          }

        //
        // Convert the default reply message button into a menu of identities.
        //
        self.buttonHelper.extendButton("button-reply",
                                       "button-replyPopup",
                                       pub.createMessageReplyPopup);

        //
        // Convert the default reply to all message button into a menu
        // of identities.
        //
        self.buttonHelper.extendButton("button-replyall",
                                       "button-replyallPopup",
                                       pub.createMessageReplyAllPopup);

        //
        // Convert the default reply to list message button into a menu
        // of identities.
        //
        self.buttonHelper.extendButton("button-replylist",
                                       "replylist-identitiespopup",
                                       pub.createMessageReplyListPopup);

        //
        // Convert the default message pane reply message button
        // into a menu of identities. (Thunderbird 3.0)
        self.buttonHelper.extendButton("hdrReplyButton",
                                       "hdrReplyDropdown",
                                       pub.createMessageHdrReplyPopup);

        // TB 3: There's something completely weird with the CSS rules
        // for hdrReplyButton and I don't understand them well enough.
        // For the time being, I'll replace them with the one from
        // hdrForwardButton
        var button = document.getElementById("hdrReplyButton");
        if(button != null &&
           versionComparator.compare(xulAppInfo.version, "5.0b1") < 0)
          {
            button.className =
              'toolbarbutton-1 msgHeaderView-button hdrForwardButton';
          }

        //
        // Convert the default message pane reply message button
        // into a menu of identities. (Thunderbird 3.1)
        self.buttonHelper.extendButton("hdrReplyToSenderButton",
                                       "hdrReplyToSenderDropdown",
                                       pub.createMessageHdrReplyToSenderPopup);

        self.buttonHelper.extendButton("hdrReplyOnlyButton",
                                       "hdrReplyOnlyDropdown",
                                       pub.createMessageHdrReplyOnlyPopup);

        // TB 3: There's something completely weird with the CSS rules
        // for hdrReplyButton and I don't understand them well enough.
        // For the time being, I'll replace them with the one from
        // hdrForwardButton
        var button = document.getElementById("hdrReplyToSenderButton");
        if(button != null &&
           versionComparator.compare(xulAppInfo.version, "5.0b1") < 0)
          {
            button.className =
              'toolbarbutton-1 msgHeaderView-button hdrForwardButton';
          }

        //
        // Convert the default message pane reply to all message button
        // into a menu of identities.
        self.buttonHelper.extendButton("hdrReplyAllButton",
                                       "hdrReplyAllDropdown",
                                       pub.createMessageHdrReplyAllPopup);

        // TB 3: There's something completely weird with the CSS rules
        // for hdrReplyAllButton and I don't understand them well enough.
        // For the time being, I'll replace them with the one from
        // hdrForwardButton
        var button = document.getElementById("hdrReplyAllButton");
        if(button != null &&
           versionComparator.compare(xulAppInfo.version, "5.0b1") < 0)
          {
            button.className =
              'toolbarbutton-1 msgHeaderView-button hdrForwardButton';
          }

        //
        // Convert the default message pane reply to list message button
        // into a menu of identities.
        self.buttonHelper.extendButton("hdrReplyListButton",
                                       "hdrReplyListDropdown",
                                       pub.createMessageHdrReplyListPopup);
        // TB 3: There's something completely weird with the CSS rules
        // for hdrReplyListButton and I don't understand them well enough.
        // For the time being, I'll replace them with the one from
        // hdrForwardButton
        var button = document.getElementById("hdrReplyListButton");
        if(button != null &&
           versionComparator.compare(xulAppInfo.version, "5.0b1") < 0)
          {
            button.className =
              'toolbarbutton-1 msgHeaderView-button hdrForwardButton';
          }

        var key = document.getElementById("key_reply");
        if(key != null)
          {
            key.setAttribute("command", "identitychooser-open-reply-popup");
          }

        key = document.getElementById("key_replyall");
        if(key != null)
          {
            key.setAttribute("command", "identitychooser-open-replyall-popup");
          }

        key = document.getElementById("key_replylist");
        if(key != null)
          {
            key.setAttribute("command", "identitychooser-open-replylist-popup");
          }
      }

    var extendEmailAddress = self.prefsHelper.getBoolPref("extendEmailAddress");
    if(extendEmailAddress)
      {
        // Prepare extension of emailAddressPopup, the popup that
        // is displayed when the user left-clicks on an email adress in the
        // message header.
        var emailAddressPopup = document.getElementById("emailAddressPopup");
        if(emailAddressPopup) {
          emailAddressPopup.addEventListener('popupshowing',
                                             pub.extendEmailAddressPopup,
                                             false);
        }
      }

    var extendMailtoLinks = self.prefsHelper.getBoolPref("extendMailtoLinks");
    if(extendMailtoLinks)
      {
        // Prepare extension of mailto-links
        var messagePane = document.getElementById("messagepane");
        messagePane.addEventListener("click",
                                     self.mailtoHelper.mailtoHandler,
                                     false);

        messagePane.addEventListener("mousedown",
                                     self.mailtoHelper.onMouseDown,
                                     false);

        messagePane.addEventListener("mouseup",
                                     self.mailtoHelper.onMouseUp,
                                     false);
      }

    var replacableMainMenues = [
      // File -> New -> New Message
      { 'pref' : 'extendButtonNewmsg',
        'popup' : 'appmenu_newMenupopup',
        'menuitem' : 'newNewMsgCmd',
        'identities_popup' : 'identitychooser-newnewmsg-popupmenu',
        'ops' : pub.createNewNewMsgMenu
      },
      // Message -> New Message
      { 'pref' : 'extendButtonNewmsg',
        'popup' : 'messageMenuPopup',
        'menuitem' : 'newMsgCmd',
        'identities_popup' : 'identitychooser-message-newmsg-popupmenu',
        'ops' : pub.createMessageNewMsgMenu
      },
      // Message -> Reply
      { 'pref' : 'extendButtonReply',
        'popup' : 'messageMenuPopup',
        'menuitem' : 'replyMainMenu',
        'identities_popup' : 'message-reply-popupmenu',
        'ops' : pub.createMessageReplyMsgMenu
      },
      // Message -> Reply To All (Thunderbird)
      { 'pref' : 'extendButtonReply',
        'popup' : 'messageMenuPopup',
        'menuitem' : 'menu_replyToAll',
        'identities_popup' : 'message-replytoall-popupmenu',
        'ops' : pub.createMessageReplyToAllMsgMenu
      },
      // Message -> Reply To All (Seamonkey)
      { 'pref' : 'extendButtonReply',
        'popup' : 'messageMenuPopup',
        'menuitem' : 'replyallMainMenu',
        'identities_popup' : 'message-replytoall-popupmenu',
        'ops' : pub.createMessageReplyToAllMsgMenu
      },
      // Message -> Reply To List
      { 'pref' : 'extendButtonReply',
        'popup' : 'messageMenuPopup',
        'menuitem' : 'menu_replyToList',
        'identities_popup' : 'message-replytolist-popupmenu',
        'ops' : pub.createMessageReplyToListMsgMenu
      },
      // Message -> Forward
      { 'pref' : 'extendButtonForward',
        'popup' : 'messageMenuPopup',
        'menuitem' : 'menu_forwardMsg',
        'identities_popup' : 'identitychooser-message-forward-popupmenu',
        'ops' : pub.createMessageForwardMsgMenu
      },
      // Message -> Forward As -> Inline
      { 'pref' : 'extendButtonForward',
        'popup' : 'menu_forwardAsPopup',
        'menuitem' : 'menu_forwardAsInline',
        'identities_popup' : 'identitychooser-message-forwardasinline-popupmenu',
        'ops' : pub.createMessageForwardAsInlineMsgMenu
      },
      // Message -> Forward As -> Attachment
      { 'pref' : 'extendButtonForward',
        'popup' : 'menu_forwardAsPopup',
        'menuitem' : 'menu_forwardAsAttachment',
        'identities_popup' : 'identitychooser-message-forwardasattachment-popupmenu',
        'ops' : pub.createMessageForwardAsAttachmentMsgMenu
      },
      // Message -> Edit as New ...
      { 'pref' : 'extendEditAsNew',
        'popup' : 'messageMenuPopup',
        'menuitem' : 'menu_editMsgAsNew',
        'identities_popup' : 'identitychooser-message-editasnew-popupmenu',
        'ops' : pub.createMessageEditAsNewMsgMenu
      },
      // Appmenu -> Message -> New Message
      { 'pref' : 'extendButtonNewmsg',
        'popup' : 'appmenu_messageMenuPopup',
        'menuitem' : 'appmenu_newMsgCmd',
        'identities_popup' : 'appmenu-identitychooser-message-newmsg-popupmenu',
        'ops' : pub.createAppmenuMessageNewMsgMenu
      },
      // Appmenu -> Message -> Reply
      { 'pref' : 'extendButtonReply',
        'popup' : 'appmenu_messageMenuPopup',
        'menuitem' : 'appmenu_replyMainMenu',
        'identities_popup' : 'appmenu-message-reply-popupmenu',
        'ops' : pub.createAppmenuMessageReplyMsgMenu
      },
      // Appmenu -> Message -> Reply To All (Thunderbird)
      { 'pref' : 'extendButtonReply',
        'popup' : 'appmenu_messageMenuPopup',
        'menuitem' : 'appmenu_replyToAll',
        'identities_popup' : 'appmenu-message-replytoall-popupmenu',
        'ops' : pub.createAppmenuMessageReplyToAllMsgMenu
      },
      // Appmenu -> Message -> Reply To List
      { 'pref' : 'extendButtonReply',
        'popup' : 'appmenu_messageMenuPopup',
        'menuitem' : 'appmenu_replyToList',
        'identities_popup' : 'appmenu-message-replytolist-popupmenu',
        'ops' : pub.createAppmenuMessageReplyToListMsgMenu
      },
      // Appmenu -> Message -> Forward
      { 'pref' : 'extendButtonForward',
        'popup' : 'appmenu_messageMenuPopup',
        'menuitem' : 'appmenu_forwardMsg',
        'identities_popup' : 'appmenu-identitychooser-message-forward-popupmenu',
        'ops' : pub.createAppmenuMessageForwardMsgMenu
      },
      // Appmenu -> Message -> Forward As -> Inline
      { 'pref' : 'extendButtonForward',
        'popup' : 'appmenu_forwardAsPopup',
        'menuitem' : 'appmenu_forwardAsInline',
        'identities_popup' : 'appmenu-identitychooser-message-forwardasinline-popupmenu',
        'ops' : pub.createAppmenuMessageForwardAsInlineMsgMenu
      },
      // Appmenu -> Message -> Forward As -> Attachment
      { 'pref' : 'extendButtonForward',
        'popup' : 'appmenu_forwardAsPopup',
        'menuitem' : 'appmenu_forwardAsAttachment',
        'identities_popup' : 'appmenu-identitychooser-message-forwardasattachment-popupmenu',
        'ops' : pub.createAppmenuMessageForwardAsAttachmentMsgMenu
      },
      // Appmenu -> Message -> Edit as New ...
      { 'pref' : 'extendEditAsNew',
        'popup' : 'appmenu_messageMenuPopup',
        'menuitem' : 'appmenu_editMsgAsNew',
        'identities_popup' : 'appmenu-identitychooser-message-editasnew-popupmenu',
        'ops' : pub.createAppmenuMessageEditAsNewMsgMenu
      }
    ];

    var replacableMessagePaneMenues = [
      // Message pane context menu -> Reply To Sender
      { 'pref' : 'extendButtonReply',
        'popup' : 'mailContext',
        'menuitem' : 'mailContext-replySender',
        'identities_popup' : 'context-replytosender-popupmenu',
        'ops' : pub.createContextReplyToSenderMsgMenu
      },
      // Message pane context menu -> Reply All
      { 'pref' : 'extendButtonReply',
        'popup' : 'mailContext',
        'menuitem' : 'mailContext-replyAll',
        'identities_popup' : 'context-replyall-popupmenu',
        'ops' : pub.createContextReplyAllMsgMenu
      },
      // Message pane context menu -> Reply To List
      { 'pref' : 'extendButtonReply',
        'popup' : 'mailContext',
        'menuitem' : 'mailContext-replyList',
        'identities_popup' : 'context-replylist-popupmenu',
        'ops' : pub.createContextReplyListMsgMenu
      },
      // Message pane context menu -> Forward
      { 'pref' : 'extendButtonForward',
        'popup' : 'mailContext',
        'menuitem' : 'mailContext-forward',
        'identities_popup' : 'identitychooser-context-forward-popupmenu',
        'ops' : pub.createContextForwardMsgMenu
      },
      // Message -> Edit as New ...
      { 'pref' : 'extendEditAsNew',
        'popup' : 'mailContext',
        'menuitem' : 'mailContext-editAsNew',
        'identities_popup' : 'identitychooser-context-editasnew-popupmenu',
        'ops' : pub.createContextEditAsNewMsgMenu
      }
    ];

    var xulRuntime = Components.classes["@mozilla.org/xre/app-info;1"]
      .getService(Components.interfaces.nsIXULRuntime);

    var replacableMenues;
    if(xulRuntime.OS == "Darwin")
      {
        replacableMenues = replacableMessagePaneMenues;
      }
    else
      {
        replacableMenues = replacableMainMenues.concat(replacableMessagePaneMenues);
      }

    for(var i = 0; i < replacableMenues.length; i++)
      {
        var m = replacableMenues[i];
        var menuPref = m['pref'];

        if(self.prefsHelper.getBoolPref(menuPref) &&
           self.prefsHelper.getBoolPref('extendMenus'))
          {
            var popup = document.getElementById(m['popup']);
            var menuitem = document.getElementById(m['menuitem']);

            if(popup != null && menuitem != null) {
              self.replaceMenuItemWithSubmenu(popup,
                                              menuitem,
                                              m['identities_popup'],
                                              m['ops']);
            }
          }
      }

    if(self.prefsHelper.getBoolPref('extendEditAsNew') &&
       self.prefsHelper.getBoolPref('extendMenus')) {
      var editAsNewKey = document.getElementById("key_editAsNew");
      if(editAsNewKey) {
        editAsNewKey.setAttribute("command", 'identitychooser-open-edit-as-new-popup');
      }
    }

    // Register with Contact Tabs
    var cotaSearchResultsPanel =
      document.getElementById("cota-results-list-container");
    if(cotaSearchResultsPanel) {
      cotaSearchResultsPanel.addEventListener('click',
                                              self.handleClickOnCotaEmailAddress,
                                              false);
    }
    // Register event listener for shutdown
    window.addEventListener("unload", self.onUnload, false);
  };

  self.handleClickOnCotaEmailAddress = function(e) {
    if(e) {
      self.mailtoHelper.mailtoHandler(e);
    }
  }

  self.replaceMenuItemWithSubmenu = function(popupMenu,
                                             replacableMenuItem,
                                             subMenuId,
                                             subMenuShowing)
  {
    var subMenuLabel = replacableMenuItem.label;
    var subMenu = document.createElement("menu");
    subMenu.setAttribute("label", subMenuLabel);
    subMenu.setAttribute("id", replacableMenuItem.getAttribute("id"));
    var subMenuPopup = document.createElement("menupopup");
    subMenuPopup.setAttribute("id",
                              subMenuId);
    subMenuPopup.addEventListener('popupshowing',
                                  subMenuShowing,
                                  false);
    subMenu.appendChild(subMenuPopup);
    popupMenu.replaceChild(subMenu, replacableMenuItem);
  }

  pub.createNewNewMsgMenu = function() {
    return self.buttonHelper.createIdentitiesPopup2(
      "identitychooser-newnewmsg-popupmenu",
      [],
      pub.composeMessage);
  }

  pub.createMessageNewMsgMenu = function() {
    return self.buttonHelper.createIdentitiesPopup2(
      "identitychooser-message-newmsg-popupmenu",
      [],
      pub.composeMessage);
  }

  pub.createMessageReplyMsgMenu = function() {
    return self.buttonHelper.createIdentitiesPopup2(
      "message-reply-popupmenu",
      [],
      pub.replyMessage);
  }

  pub.createMessageReplyToAllMsgMenu = function() {
    return self.buttonHelper.createIdentitiesPopup2(
      "message-replytoall-popupmenu",
      [],
      pub.replyAllMessage);
  }

  pub.createMessageReplyToListMsgMenu = function() {
    return self.buttonHelper.createIdentitiesPopup2(
      "message-replytolist-popupmenu",
      [],
      pub.replyListMessage);
  }

  pub.createMessageForwardMsgMenu = function() {
    return self.buttonHelper.createIdentitiesPopup2(
      "identitychooser-message-forward-popupmenu",
      [],
      pub.forwardMessage);
  }

  pub.createMessageForwardAsInlineMsgMenu = function() {
    return self.buttonHelper.createIdentitiesPopup2(
      "identitychooser-message-forwardasinline-popupmenu",
      [],
      pub.forwardAsInlineMessage);
  }

  pub.createMessageForwardAsAttachmentMsgMenu = function() {
    return self.buttonHelper.createIdentitiesPopup2(
      "identitychooser-message-forwardasattachment-popupmenu",
      [],
      pub.forwardAsAttachmentMessage);
  }

  pub.createMessageEditAsNewMsgMenu = function() {
    return self.buttonHelper.createIdentitiesPopup2(
      "identitychooser-message-editasnew-popupmenu",
      [],
      pub.editAsNewMessage);
  }

  pub.createContextReplyToSenderMsgMenu = function() {
    return self.buttonHelper.createIdentitiesPopup2(
      "context-replytosender-popupmenu",
      [],
      pub.replyMessage);
  }

  pub.createContextReplyAllMsgMenu = function() {
    return self.buttonHelper.createIdentitiesPopup2(
      "context-replyall-popupmenu",
      [],
      pub.replyAllMessage);
  }

  pub.createContextReplyListMsgMenu = function() {
    return self.buttonHelper.createIdentitiesPopup2(
      "context-replylist-popupmenu",
      [],
      pub.replyListMessage);
  }

  pub.createContextForwardMsgMenu = function() {
    return self.buttonHelper.createIdentitiesPopup2(
      "identitychooser-context-forward-popupmenu",
      [],
      pub.forwardMessage);
  }

  pub.createContextEditAsNewMsgMenu = function() {
    return self.buttonHelper.createIdentitiesPopup2(
      "identitychooser-context-editasnew-popupmenu",
      [],
      pub.editAsNewMessage);
  }

  pub.createAppmenuMessageNewMsgMenu = function() {
    return self.buttonHelper.createIdentitiesPopup2(
      "appmenu-identitychooser-message-newmsg-popupmenu",
      [],
      pub.composeMessage);
  }

  pub.createAppmenuMessageReplyMsgMenu = function() {
    return self.buttonHelper.createIdentitiesPopup2(
      "appmenu-message-reply-popupmenu",
      [],
      pub.replyMessage);
  }

  pub.createAppmenuMessageReplyToAllMsgMenu = function() {
    return self.buttonHelper.createIdentitiesPopup2(
      "appmenu-message-replytoall-popupmenu",
      [],
      pub.replyAllMessage);
  }

  pub.createAppmenuMessageReplyToListMsgMenu = function() {
    return self.buttonHelper.createIdentitiesPopup2(
      "appmenu-message-replytolist-popupmenu",
      [],
      pub.replyListMessage);
  }

  pub.createAppmenuMessageForwardMsgMenu = function() {
    return self.buttonHelper.createIdentitiesPopup2(
      "appmenu-identitychooser-message-forward-popupmenu",
      [],
      pub.forwardMessage);
  }

  pub.createAppmenuMessageForwardAsInlineMsgMenu = function() {
    return self.buttonHelper.createIdentitiesPopup2(
      "appmenu-identitychooser-message-forwardasinline-popupmenu",
      [],
      pub.forwardAsInlineMessage);
  }

  pub.createAppmenuMessageForwardAsAttachmentMsgMenu = function() {
    return self.buttonHelper.createIdentitiesPopup2(
      "appmenu-identitychooser-message-forwardasattachment-popupmenu",
      [],
      pub.forwardAsAttachmentMessage);
  }

  pub.createAppmenuMessageEditAsNewMsgMenu = function() {
    return self.buttonHelper.createIdentitiesPopup2(
      "appmenu-identitychooser-message-editasnew-popupmenu",
      [],
      pub.editAsNewMessage);
  }

  self.onUnload = function() {
    var extendMailtoLinks = self.prefsHelper.getBoolPref("extendMailtoLinks");
    if(extendMailtoLinks)
      {
        var messagePane = document.getElementById("messagepane");
        messagePane.removeEventListener("click",
                                        self.mailtoHelper.mailtoHandler,
                                        false);

        messagePane.removeEventListener("mousedown",
                                        self.mailtoHelper.onMouseDown,
                                        false);

        messagePane.removeEventListener("mouseup",
                                        self.mailtoHelper.onMouseUp,
                                        false);
      }

    window.removeEventListener("load",
                               org.janek.identitychooser.init,
                               false);
    window.removeEventListener("unload", self.onUnload, false);
  }

  pub.openNewMessagePopup = function() {
    document.getElementById('button-newmsg').open = true;
  }

  pub.openReplyPopup = function() {
    var replyButton = document.getElementById('button-reply');

    if(replyButton == null ||
       replyButton.hidden == true) {
      replyButton = document.getElementById('hdrReplyToSenderButton');
    }

    if(replyButton == null ||
       replyButton.hidden == true) {
      replyButton = document.getElementById('hdrReplyButton');
    }

    if(replyButton == null ||
       replyButton.hidden == true) {
      replyButton = document.getElementById('hdrReplyOnlyButton');
    }

    if(replyButton != null &&
       replyButton.disabled == false) {
      replyButton.open = true;
    }
  }

  pub.openReplyAllPopup = function() {
    var replyAllButton = document.getElementById('button-replyall');

    if(replyAllButton == null) {
      replyAllButton = document.getElementById('hdrReplyAllButton');
    }

    if(replyAllButton != null &&
       replyAllButton.disabled == false) {
      replyAllButton.open = true;
    }
  }

  pub.openReplyListPopup = function() {
    var replyListButton = document.getElementById('button-replylist');

    if(replyListButton == null) {
      replyListButton = document.getElementById('hdrReplyListButton');
    }

    if(replyListButton != null &&
       replyListButton.disabled == false) {
      replyListButton.open = true;
    }
  }

  pub.openForwardPopup = function() {
    var forwardButton = document.getElementById('button-forward');

    if(forwardButton == null) {
      forwardButton = document.getElementById('hdrForwardButton');
    }

    if(forwardButton != null &&
       forwardButton.disabled == false) {
      forwardButton.open = true;
    }
  }

  pub.openMessageEditAsNewPopup = function() {
    var messageMenu = document.getElementById("messageMenu");
    var doShowAsEdit = function() {
      var editAsNew =
        document.getElementById("menu_editMsgAsNew");
      editAsNew.open = true;

      messageMenu.removeEventListener("popupshown", doShowAsEdit, false);
    }

    messageMenu.addEventListener("popupshown",
                                 doShowAsEdit,
                                 false);

    messageMenu.open = true;
  }

  pub.createMessageSendPopup = function() {
    return self.buttonHelper.createIdentitiesPopup2(
      "button-newMsgPopup",
      [ "newMsgButton-mail-menuitem" ],
      pub.composeMessage);
  }

  pub.createMessageHdrForwardPopup = function() {
    return self.buttonHelper.createIdentitiesPopup2(
      "identitychooser-hdrforward-identitiespopup",
      [],
      function(event) {
        pub.forwardMessage(event, this);
        RestoreFocusAfterHdrButton();
      });
  }

  pub.createMessageForwardPopup = function() {
    return self.buttonHelper.createIdentitiesPopup2(
      "button-ForwardPopup",
      [],
      pub.forwardMessage);
  }

  pub.createMessageReplyPopup = function() {
    return self.buttonHelper.createIdentitiesPopup2(
      "button-replyPopup",
      [],
      pub.replyMessage);
  }

  pub.createMessageReplyAllPopup = function() {
    return self.buttonHelper.createIdentitiesPopup2(
      "button-replyallPopup",
      [],
      pub.replyAllMessage);
  }

  pub.createMessageReplyListPopup = function() {
    return self.buttonHelper.createIdentitiesPopup2(
      "replylist-identitiespopup",
      [],
      pub.replyListMessage);
  }

  pub.createMessageHdrReplyPopup = function() {
    return self.buttonHelper.createIdentitiesPopup2(
      "hdrReplyDropdown",
      [ "hdrReplySubButton",
        "hdrReplyAllSubButtonSep",
        "hdrReplyAllSubButton" ],
      function(event) {
        pub.replyMessage(event, this);
        RestoreFocusAfterHdrButton();
      });
  }

  pub.createMessageHdrReplyToSenderPopup = function() {
    return self.buttonHelper.createIdentitiesPopup2(
      "hdrReplyToSenderDropdown",
      [ "hdrReplySubButton",
        "hdrReplyAllSubButtonSep",
        "hdrReplyAllSubButton" ],
      function(event) {
        pub.replyMessage(event, this);
        RestoreFocusAfterHdrButton()
      });
  }

  pub.createMessageHdrReplyOnlyPopup = function() {
    return self.buttonHelper.createIdentitiesPopup2(
      "hdrReplyOnlyDropdown",
      [],
      function(event) {
        pub.replyMessage(event, this);
        RestoreFocusAfterHdrButton();
      });
  }

  pub.createMessageHdrReplyAllPopup = function() {
    return self.createHdrReplyAllIdentitiesPopup();
  }

  pub.createMessageHdrReplyListPopup = function() {
    return self.createHdrReplyListIdentitiesPopup();
  }

  pub.createMailtoPopup = function() {
    return self.buttonHelper.createIdentitiesPopup2(
      "mailto-popupmenu",
      [],
      pub.composeMessageMailTo);
  }

  pub.extendEmailAddressPopup = function() {
    // Now prepare our menuitems
    var identitiesPopup = document.getElementById("emailAddressPopup");
    var sendMailToItem = document.getElementById("sendMailToItem");
    if(sendMailToItem == null)
      {
        sendMailToItem =
          self.findMenuItemByAttribute(identitiesPopup,
                                       'oncommand',
                                       'SendMailToNode(document.popupNode)');
      }

    self.buttonHelper.removeMessageChildrenFromNode(identitiesPopup, []);

    var allIdentities =
      self.identitiesHelper.getIdentitiesAccountListUserSorted();
    if(allIdentities.length > 0)
      {
        if(sendMailToItem.previousSibling.tagName != 'menuseparator')
          {
            var separator = document.createElement("menuseparator");
            separator.setAttribute("value", "identitychooser-separator");
            identitiesPopup.insertBefore(separator, sendMailToItem);
          }

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
            identityMenuItem.addEventListener(
              'command',
              function(event) {
                pub.composeMessageTo(event, this, 'emailAddressPopup');
              },
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

  self.findMenuItemByAttribute = function(popup, attribute, value) {
    for (var i = 0; i < popup.childNodes.length; i++)
      {
        var child = popup.childNodes[i];

        if(child.hasAttribute(attribute) &&
           child.getAttribute(attribute) == value)
          {
            return child;
          }
      };


    return popup.childNodes[0];
  }

  pub.forwardAsInlineMessage = function(event, src) {
    if(src == null) {
      src = event.currentTarget;
    }

    var forwardType = Components.interfaces.nsIMsgCompType.ForwardInline;
    var messageFormat = self.getMessageFormat(event);

    self.doForwardMessage(forwardType,
                          messageFormat,
                          src);

    event.stopPropagation();
  }

  pub.forwardAsAttachmentMessage = function(event, src) {
    if(src == null) {
      src = event.currentTarget;
    }

    var forwardType = Components.interfaces.nsIMsgCompType.ForwardAsAttachment;
    var messageFormat = self.getMessageFormat(event);

    self.doForwardMessage(forwardType,
                          messageFormat,
                          src);

    event.stopPropagation();
  }

  pub.forwardMessage = function(event, src) {
    if(src == null) {
      src = event.currentTarget;
    }

    var forwardType = self.getForwardType();
    if(event &&
       (event.ctrlKey || event.metaKey)) {
      if(forwardType == Components.interfaces.nsIMsgCompType.ForwardAsAttachment) {
        forwardType = Components.interfaces.nsIMsgCompType.ForwardInline;
      }
      else if(forwardType == Components.interfaces.nsIMsgCompType.ForwardInline) {
        forwardType = Components.interfaces.nsIMsgCompType.ForwardAsAttachment;
      }
    }

    var messageFormat = self.getMessageFormat(event);

    self.doForwardMessage(forwardType,
                          messageFormat,
                          src);

    event.stopPropagation();
  }

  self.doForwardMessage = function(forwardType, messageFormat, src) {
    // value="identitychooser-id1"
    var identityId = src.value.split("-")[1];
    var allIdentities = self.identitiesHelper.getAllIdentities();
    for(var i = 0; i < allIdentities.length; i++)
      {
        var identity = allIdentities[i];

        if(identity.key == identityId)
          {
            self.sendSelectedMessagesFromIdentity(identity,
                                                  forwardType,
                                                  messageFormat);
            break;
          }
      }
  }

  pub.editAsNewMessage = function(event, src) {
    if(src == null) {
      src = event.currentTarget;
    }

    // value="identitychooser-id1"
    var identityId = src.value.split("-")[1];
    var identity = self.identitiesHelper.findIdentity(identityId);

    if(identity != null) {
      self.sendSelectedMessagesFromIdentity(
        identity,
        Components.interfaces.nsIMsgCompType.Template,
        self.getMessageFormat(event));
    }
  }

  pub.replyMessage = function(event, src) {
    if(src == null) {
      src = event.currentTarget;
    }

    var loadedFolder = gFolderDisplay.displayedFolder;
    if (loadedFolder)
      {
        var server = loadedFolder.server;
        if(server && server.type == "nntp")
          {
            self.commonReplyMessage(Components.interfaces.nsIMsgCompType.ReplyToGroup,
                                    event,
                                    src);

            return;
          }
      }

    self.commonReplyMessage(Components.interfaces.nsIMsgCompType.ReplyToSender,
                            event,
                            src);
  }

  pub.replyAllMessage = function(event, src) {
    if(src == null) {
      src = event.currentTarget;
    }

    self.commonReplyMessage(Components.interfaces.nsIMsgCompType.ReplyAll,
                            event,
                            src);
  }

  pub.replyListMessage = function(event, src) {
    if(src == null) {
      src = event.currentTarget;
    }

    self.commonReplyMessage(Components.interfaces.nsIMsgCompType.ReplyToList,
                            event,
                            src);
  }

  self.commonReplyMessage = function(replyType, event, src) {
    if(src == null) {
      src = event.currentTarget;
    }

    var messageFormat = self.getMessageFormat(event);

    // value="identitychooser-id1"
    var identityId = src.value.split("-")[1];
    var allIdentities = self.identitiesHelper.getAllIdentities();
    for(var i = 0; i < allIdentities.length; i++)
      {
        var identity = allIdentities[i];

        if(identity.key == identityId)
          {
            self.sendSelectedMessagesFromIdentity(
              identity,
              replyType,
              messageFormat);
            break;
          }
      }

    if(event) {
      event.stopPropagation();
    }
  }

  pub.composeMessageMailTo = function(event, src) {
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

        if(identity != null)
          {
            var msgCompService = self.createMsgComposeService();

            var params = msgCompService.getParamsForMailto(mailtoUri);
            params.type = Components.interfaces.nsIMsgCompType.New;
            params.format = self.getMessageFormat(event);
            params.identity = identity;

            msgCompService.OpenComposeWindowWithParams(null, params);
          }
      }
  }

  self.createParamsWithFields = function() {
    var params =
      Components.classes["@mozilla.org/messengercompose/composeparams;1"]
        .createInstance(Components.interfaces.nsIMsgComposeParams);

    var fields =
      Components.classes["@mozilla.org/messengercompose/composefields;1"]
        .createInstance(Components.interfaces.nsIMsgCompFields);
    params.composeFields = fields;

    return params;

  }

  self.openMessageWindowWithParams = function(params) {
    var msgCompService = self.createMsgComposeService();

    msgCompService.OpenComposeWindowWithParams(null, params);
  }

  self.createMsgComposeService = function() {
    var msgCompService =
      Components.classes["@mozilla.org/messengercompose;1"].getService();
    msgCompService =
      msgCompService.QueryInterface(
        Components.interfaces.nsIMsgComposeService);

    return msgCompService;
  }

  pub.composeMessageTo = function(event, src, popupId) {
    if(src == null) {
      src = event.currentTarget;
    }

    var addressNode = null;

    if(typeof findEmailNodeFromPopupNode == 'function')
      {
        addressNode = findEmailNodeFromPopupNode(document.popupNode, popupId);
      }
    else if(typeof fillEmailAddressPopup == 'function')
      {
        addressNode = document.popupNode;
      }

    // value="identitychooser-id1"
    var identityId = src.value.split("-")[1];
    var identity = self.identitiesHelper.findIdentity(identityId);

    if(identity != null)
      {
        var params = self.createParamsWithFields();
        params.type = Components.interfaces.nsIMsgCompType.New;
        params.format = self.getMessageFormat(event);
        params.identity = identity;

        params.composeFields.newsgroups = addressNode.getAttribute("newsgroup");
        params.composeFields.to = addressNode.getAttribute("fullAddress");

        self.openMessageWindowWithParams(params);
      }
  }

  pub.composeMessage = function(event, src) {
    if(src == null) {
      src = event.currentTarget;
    }

    // value="identitychooser-id1"
    var identityId = src.value.split("-")[1];
    var identity = self.identitiesHelper.findIdentity(identityId);

    if(identity != null)
      {
        var params = self.createParamsWithFields();
        params.type = Components.interfaces.nsIMsgCompType.New;
        params.format = self.getMessageFormat(event);
        params.identity = identity;

        self.openMessageWindowWithParams(params);
      }

    event.stopPropagation();
  }

  self.identitiesHelper = org.janek.identitychooser_identitieshelper();
  self.prefsHelper = org.janek.identitychooser_prefshelper();
  self.mailtoHelper =
    org.janek.identitychooser_mailtohelper(
      "mailto-popupmenu",
      pub.createMailtoPopup,
      "messagepanebox");
  self.buttonHelper = org.janek.identitychooser_buttonhelper();

  self.seaMonkeySetUpToolbarButtons = null;

  self.accountsBranchPrefs =
    Components.classes["@mozilla.org/preferences-service;1"]
      .getService(Components.interfaces.nsIPrefService)
      .getBranch('mail.account.');


  return pub;
};


// Init addin after window loaded
window.addEventListener("load",
                        org.janek.identitychooser.init,
                        false);
