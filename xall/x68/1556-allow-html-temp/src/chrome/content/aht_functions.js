var { Services } = ChromeUtils.import(
  "resource://gre/modules/Services.jsm"
);

var ahtFunctions = {

  // 4 variables for the original settings
  // html and remote content settings
  prefer_plaintext: false,
  html_as: 0,
  disallow_classes: 0,
  // inline attachment setting
  mail_inline_attachments: false,

  block: false,

  startup: function() {
    // console.debug("AHT: startup");

    this.observerService = Components.classes[
        "@mozilla.org/observer-service;1"]
      .getService(Components.interfaces.nsIObserverService);
      /*
      this.observerService.addObserver(this, "MsgMsgDisplayed");
      // console.debug("AHT: addObserver MsgMsgDisplayed");
      */
  
    // if not existing, set addons default settings
    try {
      if (Services.prefs.getIntPref(
          "extensions.allowhtmltemp.ButtonFunction")) {
        // console.debug("AHT: default setting ButtonFunction existing:");
        // console.debug(Services.prefs.getIntPref("extensions.allowhtmltemp.ButtonFunction"));
      }
    } catch (e) {
      // console.debug("AHT: default setting ButtonFunction doesn't exist");
      Services.prefs.setIntPref(
        "extensions.allowhtmltemp.ButtonFunction", 0)
    }
    try {
      if (Services.prefs.getBoolPref(
          "extensions.allowhtmltemp.ForceRemoteContent")) {
        // console.debug("AHT: default setting ForceRemoteContent existing and true");
      } else {
        // console.debug("AHT: default setting ForceRemoteContent existing but false");
      }
    } catch (e) {
      // console.debug("AHT: default setting ForceRemoteContent doesn't exist");
      Services.prefs.setBoolPref(
        "extensions.allowhtmltemp.ForceRemoteContent", false)
    }
    try {
      if (Services.prefs.getBoolPref(
          "extensions.allowhtmltemp.InlineAttachmentsTemp")) {
        // console.debug("AHT: default setting InlineAttachmentsTemp existing and true");
      } else {
        // console.debug("AHT: default setting InlineAttachmentsTemp existing but false");
      }
    } catch (e) {
      // console.debug("AHT: default setting InlineAttachmentsTemp doesn't exist");
      Services.prefs.setBoolPref(
        "extensions.allowhtmltemp.InlineAttachmentsTemp", false)
    }
  },

  registerListener: function() {
    // console.debug("AHT: add Listener MsgMsgDisplayed");
    this.observerService.addObserver(this, "MsgMsgDisplayed");
  },

  removeListener: function() {
    // console.debug("AHT: remove Listener MsgMsgDisplayed");
    this.observerService.removeObserver(this, "MsgMsgDisplayed");
  },

  shutdown: function() {
    /*
    // console.debug("AHT: removeObserver MsgMsgDisplayed");
    this.observerService.removeObserver(this, "MsgMsgDisplayed");
    */
  },

  observe: function(subject, topic, data) {
    switch (topic) {
      case "MsgMsgDisplayed":
        // console.debug("AHT: MsgMsgDisplayed");
        if (this.block) {
          // Revert to the users default settings
          // after the message is reloaded.
          this.RestoreHTMLcontentPrefs();
        }
        break;
    }
  },

  AllowHTMLtemp: function(ahtKeyboardEvent, ahtTriggeredBy) {
    // console.debug("AHT: fired");
    // console.debug("AHT: ahtKeyboardEvent: " + ahtKeyboardEvent);
    // console.debug("AHT: ahtTriggeredBy: " + ahtTriggeredBy);

    // ahtButtons should be disabled, if no msg or multiple msgs are selected,
    // but sometimes we nevertheless could land here.
    // So we check if only one email is selected, otherwise we do nothing.
    if (gFolderDisplay.selectedCount == 1) {
      // Save users applications default settings
      this.SaveHTMLcontentPrefs();

      // Get users pref for the buttons function
      // 0 = Original HTML; 1 = Sanitized HTML; 2 = Plaintext
      let ahtPrefButtonFunction = Services.prefs.getIntPref(
        "extensions.allowhtmltemp.ButtonFunction");
      // Get users pref to force remote content
      // true = force; false = no remote content
      let ahtPrefForceRemoteContent = Services.prefs.getBoolPref(
        "extensions.allowhtmltemp.ForceRemoteContent");

      // RemoteContent popupmenu item clicked in remote content bar in a HTML message
      if (ahtTriggeredBy == "remoteButton") {
        this.ShowRemote();
      }

      // Keyboard shortcut invokes the same function as a simple click on the addon button
      else if (ahtTriggeredBy == "keyboard") {
        switch (ahtPrefButtonFunction) {
          case 0:
            if (ahtPrefForceRemoteContent) {
              this.ShowRemote();
            } else {
              this.ShowOriginalHTML();
            }
            break;
          case 1:
            this.ShowSanitizedHTML();
            break;
          case 2:
            this.ShowPlaintext();
            break;
        }
      }

      // If we land here, the trigger must be a click on the addon button.
      // We must now differ the choosen function by modifier key (ahtKeyboardEvent).

      // Addon button clicked + both CTRL and SHIFT key
      else if (ahtKeyboardEvent.shiftKey && (ahtKeyboardEvent.ctrlKey ||
          ahtKeyboardEvent.metaKey)) {
        this.ShowSanitizedHTML();
      }

      // Addon button clicked + only CTRL key
      else if ((ahtKeyboardEvent.ctrlKey || ahtKeyboardEvent.metaKey) && !(
          ahtKeyboardEvent.shiftKey)) {
        this.ShowRemote();
      }

      // Addon button clicked + only SHIFT key
      else if ((ahtKeyboardEvent.shiftKey) && !(ahtKeyboardEvent.ctrlKey ||
          ahtKeyboardEvent.metaKey)) {
        this.ShowPlaintext();
      }

      // Addon button clicked - no key pressed
      else if (!(ahtKeyboardEvent.ctrlKey || ahtKeyboardEvent.metaKey ||
          ahtKeyboardEvent.shiftKey)) {
        switch (ahtPrefButtonFunction) {
          case 0:
            if (ahtPrefForceRemoteContent) {
              this.ShowRemote();
            } else {
              this.ShowOriginalHTML();
            }
            break;
          case 1:
            this.ShowSanitizedHTML();
            break;
          case 2:
            this.ShowPlaintext();
            break;
        }
      }

    }
  },

  ShowPlaintext: function() {
    // console.debug("AHT: ShowPlaintext");
    try {
      // reload message in plaintext:
      MsgBodyAsPlaintext();
    } catch (e) {
      // console.debug("AHT: Plaintext error");
    }
  },

  ShowSanitizedHTML: function() {
    // console.debug("AHT: ShowSanitizedHTML");
    try {
      // reload message in sanitized HTML:
      MsgBodySanitized();
    } catch (e) {
      // console.debug("AHT: ShowSanitizedHTML error");
    }
  },

  ShowOriginalHTML: function() {
    // console.debug("AHT: ShowOriginalHTML");
    try {
      // enable temporarily InlineAttachments if temp option is set
      if (Services.prefs.getBoolPref(
          "extensions.allowhtmltemp.InlineAttachmentsTemp") == true)
        Services.prefs.setBoolPref("mail.inline_attachments", true);

      // reload message with original HTML:
      MsgBodyAllowHTML();
      // show own RemoteContentPopupmenuItem to allow HTML again in case of event
      ahtButtonStatus.changeRemoteContentPopupmenuItem();
    } catch (e) {
      // console.debug("AHT: ShowOriginalHTML error");
    }
  },

  ShowRemote: function() {
    // console.debug("AHT: ShowRemote");
    try {
      // enable temporarily HTML
      Services.prefs.setBoolPref("mailnews.display.prefer_plaintext",
      false);
      Services.prefs.setIntPref("mailnews.display.html_as", 0);
      Services.prefs.setIntPref("mailnews.display.disallow_mime_handlers",
        0);

      // enable temporarily InlineAttachments if temp option is set
      if (Services.prefs.getBoolPref(
          "extensions.allowhtmltemp.InlineAttachmentsTemp") == true)
        Services.prefs.setBoolPref("mail.inline_attachments", true);

      // now HTML is allowed, so we can reload the message with remote content:
      LoadMsgWithRemoteContent();
    } catch (e) {
      // console.debug("AHT: ShowRemote error");
    }
  },

  SaveHTMLcontentPrefs: function() {
    // console.debug("AHT: SaveHTMLcontentPrefs");

    if (!this.block) // we need this block to prevent from
    // starting AHT again before the return
    // to the original settings! Otherwise we would loose
    // original settings -> 'Security leak'!
    {
      this.block = true;
      this.registerListener();

      this.prefer_plaintext = Services.prefs.getBoolPref(
        "mailnews.display.prefer_plaintext");
      this.html_as = Services.prefs.getIntPref("mailnews.display.html_as");
      this.disallow_classes = Services.prefs.getIntPref(
        "mailnews.display.disallow_mime_handlers");
      this.mail_inline_attachments = Services.prefs.getBoolPref(
        "mail.inline_attachments");
    }
  },

  RestoreHTMLcontentPrefs: function() {
    // console.debug("AHT: RestoreHTMLcontentPrefs");
    if (this.block) {
      Services.prefs.setBoolPref("mailnews.display.prefer_plaintext", this
        .prefer_plaintext);
      Services.prefs.setIntPref("mailnews.display.html_as", this.html_as);
      Services.prefs.setIntPref("mailnews.display.disallow_mime_handlers",
        this.disallow_classes);
      Services.prefs.setBoolPref("mail.inline_attachments", this
        .mail_inline_attachments);

      this.removeListener();
      this.block = false;
    }
  },

  InitPrefs: function() {
    // console.debug("AHT: InitPrefs");
    let html_as = Services.prefs.getIntPref("mailnews.display.html_as");
    let prefer_plaintext = Services.prefs.getBoolPref(
      "mailnews.display.prefer_plaintext");
    let disallow_classes = Services.prefs.getIntPref(
      "mailnews.display.disallow_mime_handlers");
    const menuIDs = ["ahtAppHtmlBodyAllowHTML",
      "ahtAppHtmlBodySanitized",
      "ahtAppHtmlBodyAsPlaintext",
      "ahtAppHtmlBodyAllParts"
    ];

    if (disallow_classes > 0)
      gDisallow_classes_no_html = disallow_classes;
    // else gDisallow_classes_no_html keeps its inital value

    let HtmlBody_Radiogroup = document.getElementById(
      "ahtAppHtmlRadiogroup");
    let AllowHTML_menuitem = document.getElementById(menuIDs[0]);
    let Sanitized_menuitem = document.getElementById(menuIDs[1]);
    let AsPlaintext_menuitem = document.getElementById(menuIDs[2]);
    let AllBodyParts_menuitem = menuIDs[3] ? document.getElementById(
      menuIDs[3]) : null;

    document.getElementById("ahtAppHtmlBodyAllParts").hidden = !Services
      .prefs.getBoolPref("mailnews.display.show_all_body_parts_menu");

    if (!prefer_plaintext && !html_as && !disallow_classes &&
      AllowHTML_menuitem && HtmlBody_Radiogroup)
      HtmlBody_Radiogroup.selectedIndex = 0;
    else if (!prefer_plaintext && html_as == 3 && disallow_classes > 0 &&
      Sanitized_menuitem && HtmlBody_Radiogroup)
      HtmlBody_Radiogroup.selectedIndex = 1;
    else if (prefer_plaintext && html_as == 1 && disallow_classes > 0 &&
      AsPlaintext_menuitem && HtmlBody_Radiogroup)
      HtmlBody_Radiogroup.selectedIndex = 2;
    else if (!prefer_plaintext && html_as == 4 && !disallow_classes &&
      AllBodyParts_menuitem && HtmlBody_Radiogroup)
      HtmlBody_Radiogroup.selectedIndex = 3;
    // else (the user edited prefs/user.js) select none of the radio items

    document.getElementById("ahtForceRemoteContentPrefCheckbox")
      .disabled = !Services.prefs.getBoolPref(
        "mailnews.message_display.disable_remote_image");
    document.getElementById("ahtInlineAttachmentsTempPrefCheckbox")
      .disabled =
      Services.prefs.getBoolPref("mail.inline_attachments");
  },

  RefreshPrefsOption: function() {
    document.getElementById("ahtForceRemoteContentPrefCheckbox").disabled =
      (document.getElementById("ahtRemoteContentPrefCheckbox").checked ==
        true);
    document.getElementById("ahtInlineAttachmentsTempPrefCheckbox")
      .disabled =
      (document.getElementById("ahtInlineAttachmentsPrefCheckbox")
        .checked == true);
  },

  AhtSetMsgBodyAllowHTML: function() {
    Services.prefs.setBoolPref("mailnews.display.prefer_plaintext", false);
    Services.prefs.setIntPref("mailnews.display.html_as", 0);
    Services.prefs.setIntPref("mailnews.display.disallow_mime_handlers", 0);
  },

  AhtSetMsgBodySanitized: function() {
    Services.prefs.setBoolPref("mailnews.display.prefer_plaintext", false);
    Services.prefs.setIntPref("mailnews.display.html_as", 3);
    Services.prefs.setIntPref("mailnews.display.disallow_mime_handlers",
      gDisallow_classes_no_html);
  },

  AhtSetMsgBodyAsPlaintext: function() {
    Services.prefs.setBoolPref("mailnews.display.prefer_plaintext", true);
    Services.prefs.setIntPref("mailnews.display.html_as", 1);
    Services.prefs.setIntPref("mailnews.display.disallow_mime_handlers",
      gDisallow_classes_no_html);
  },

  AhtSetMsgBodyAllParts: function() {
    Services.prefs.setBoolPref("mailnews.display.prefer_plaintext", false);
    Services.prefs.setIntPref("mailnews.display.html_as", 4);
    Services.prefs.setIntPref("mailnews.display.disallow_mime_handlers", 0);
  },

  // The following function re-enables JavaScript and shows a prompt to inform the user about this.
  // This will be only done once.
  // If the user changes the pref in future again by about:config, it will not be reset again.
  ahtResetJavaScriptToDefaultOnce: function() {
    // console.debug("AHT: ahtResetJavaScriptToDefaultOnce");

    // Reset javascript.enabled to true (default) only once
    try {
      if (!Services.prefs.getBoolPref(
        "extensions.allowhtmltemp.reset_javascript_default_done_once")) {
        // console.debug("AHT: JS Reset pref is false or not yet existing");

        // Remove the AHT temp option for JavaScript
        if (!Services.prefs.getBoolPref(
          "extensions.allowhtmltemp.JavaScriptTemp")) {
          // console.debug("AHT: default setting JavaScriptTemp is false or not existing");
        } else {
          // console.debug("AHT: default setting JavaScriptTemp existing and true - will be set to false");
          Services.prefs.setBoolPref(
            "extensions.allowhtmltemp.JavaScriptTemp", false);
        }

        // Re-enable JavaScript default pref
        if (!Services.prefs.getBoolPref(
          "javascript.enabled")) {

          // console.debug("AHT: javascript.enabled is false - will be reset to true");
          Services.prefs.setBoolPref(
            "javascript.enabled", true);

          // get title and message for the prompt
          var aht_bundle = Services.strings.createBundle("chrome://allowhtmltemp/locale/allowhtmltemp.properties");

          // get a reference to the prompt service component.
          var promptService = Components.classes["@mozilla.org/embedcomp/prompt-service;1"]
            .getService(Components.interfaces.nsIPromptService);
          // show an alert. For the first argument, supply the parent window. The second
          // argument is the dialog title and the third argument is the message
          // to display.
          promptService.alert(window, 
            aht_bundle.GetStringFromName("reset_javascript_to_default.title"), 
            aht_bundle.GetStringFromName("reset_javascript_to_default.message"));

          // Indicate the one time reset by a pref, to prevent future run
          Services.prefs.setBoolPref(
            "extensions.allowhtmltemp.reset_javascript_default_done_once", true);
  
        } else {
          // console.debug("AHT: javascript.enabled is true (default)");
        }

      } else {
        // console.debug("AHT: JS Reset done in the past - pref is true");
      }
    } catch (e) {
    }
  }

}

/* eventListeners are now called from WindowListener API *
window.addEventListener("load", function(e) {
  ahtFunctions.startup();
}, false);
window.addEventListener("unload", function(e) {
  ahtFunctions.shutdown();
}, false);
**********************************************************/
