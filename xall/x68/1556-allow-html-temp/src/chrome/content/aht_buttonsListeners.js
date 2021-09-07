var { Services } = ChromeUtils.import(
  "resource://gre/modules/Services.jsm"
);

var { MsgHdrToMimeMessage } = ChromeUtils.import(
  "resource:///modules/gloda/MimeMessage.jsm"
);

var ahtButtonSetIcon = {

  startup: function() {
    Services.prefs.addObserver("", this, false);

    this.setCurrentButtonIconLabel();
  },

  shutdown: function() {
    Services.prefs.removeObserver("", this);
  },

  observe: function(subject, topic, data) {
    if (topic != "nsPref:changed") {
      return;
    }

    switch (data) {
      case "extensions.allowhtmltemp.ButtonFunction":
        this.setCurrentButtonIconLabel();
        break;
      case "mailnews.message_display.disable_remote_image":
        this.setCurrentButtonIconLabel();
        break;
      case "extensions.allowhtmltemp.ForceRemoteContent":
        this.setCurrentButtonIconLabel();
        break;
    }
  },

  setCurrentButtonIconLabel: function() {
    let aht_pref_buttonfunction = Services.prefs.getIntPref(
      "extensions.allowhtmltemp.ButtonFunction");
    let aht_pref_app_remote = Services.prefs.getBoolPref(
      "mailnews.message_display.disable_remote_image");
    let aht_pref_forceremote = Services.prefs.getBoolPref(
      "extensions.allowhtmltemp.ForceRemoteContent");

    let ahtToolbarButton = document.getElementById("AllowHTMLtemp");
    let ahtHdrButton = document.getElementById("hdrAHTButton");

    if (ahtToolbarButton) {
      switch (aht_pref_buttonfunction) {
        case 0:
          if (!(aht_pref_app_remote) || (aht_pref_forceremote)) {
            ahtToolbarButton.setAttribute("AHT-htmlStatus", "Plus");
            ahtToolbarButton.setAttribute("label", ahtToolbarButton
              .getAttribute("labelAHT-htmlStatusPlus"));
          } else {
            ahtToolbarButton.setAttribute("AHT-htmlStatus", "Original");
            ahtToolbarButton.setAttribute("label", ahtToolbarButton
              .getAttribute("labelAHT-htmlStatusOriginal"));
          }
          break;
        case 1:
          ahtToolbarButton.setAttribute("AHT-htmlStatus", "Sanitized");
          ahtToolbarButton.setAttribute("label", ahtToolbarButton
            .getAttribute("labelAHT-htmlStatusSanitized"));
          break;
        case 2:
          ahtToolbarButton.setAttribute("AHT-htmlStatus", "Plaintext");
          ahtToolbarButton.setAttribute("label", ahtToolbarButton
            .getAttribute("labelAHT-htmlStatusPlaintext"));
          break;
      }
    }

    if (ahtHdrButton) {
      switch (aht_pref_buttonfunction) {
        case 0:
          if (!(aht_pref_app_remote) || (aht_pref_forceremote)) {
            ahtHdrButton.setAttribute("AHT-htmlStatus", "Plus");
            ahtHdrButton.setAttribute("label", ahtHdrButton.getAttribute(
              "labelAHT-htmlStatusPlus"));
          } else {
            ahtHdrButton.setAttribute("AHT-htmlStatus", "Original");
            ahtHdrButton.setAttribute("label", ahtHdrButton.getAttribute(
              "labelAHT-htmlStatusOriginal"));
          }
          break;
        case 1:
          ahtHdrButton.setAttribute("AHT-htmlStatus", "Sanitized");
          ahtHdrButton.setAttribute("label", ahtHdrButton.getAttribute(
            "labelAHT-htmlStatusSanitized"));
          break;
        case 2:
          ahtHdrButton.setAttribute("AHT-htmlStatus", "Plaintext");
          ahtHdrButton.setAttribute("label", ahtHdrButton.getAttribute(
            "labelAHT-htmlStatusPlaintext"));
          break;
      }
    }

  }
}

var ahtButtonStatus = {

  startup: function() {
    this.observerService = Components.classes[
        "@mozilla.org/observer-service;1"]
      .getService(Components.interfaces.nsIObserverService);
    this.observerService.addObserver(this, "mail:updateToolbarItems",
    false);

    this.checkMailForHtmlpart();
  },

  shutdown: function() {
    this.observerService.removeObserver(this, "mail:updateToolbarItems");
  },

  observe: function(subject, topic, data) {
    switch (topic) {
      case "mail:updateToolbarItems":
        ahtButtonStatus.checkMailForHtmlpart();
        // ahtButtonStatus.resetRemoteContentPopupmenuItem();
        ahtButtonSetIcon.setCurrentButtonIconLabel();
        break;
    }
  },

  enableButtons: function() {
    // console.debug("AHT: enableButtons");

    // we MUST use removeAttribute("disabled")
    // setAttribute to false leads to problems in tabbar-toolbar

    let ahtHdrButton = document.getElementById("hdrAHTButton");
    if (ahtHdrButton)
      ahtHdrButton.removeAttribute("disabled");

    let ahtToolbarButton = document.getElementById("AllowHTMLtemp");
    if (ahtToolbarButton)
      ahtToolbarButton.removeAttribute("disabled");

    let ahtKey = document.getElementById("ahtButton-key");
    if (ahtKey)
      ahtKey.removeAttribute("disabled");
  },

  disableButtons: function() {
    // console.debug("AHT: disableButtons");

    let ahtHdrButton = document.getElementById("hdrAHTButton");
    if (ahtHdrButton)
      ahtHdrButton.setAttribute("disabled", true);

    let ahtToolbarButton = document.getElementById("AllowHTMLtemp");
    if (ahtToolbarButton)
      ahtToolbarButton.setAttribute("disabled", true);

    let ahtKey = document.getElementById("ahtButton-key");
    if (ahtKey)
      ahtKey.setAttribute("disabled", true);
  },

  changeRemoteContentPopupmenuItem: function() {
    // console.debug("AHT: changeRemoteContentPopupmenuItem");

    // Tb 31, 38, 45, 52, ... popupmenu item has ID "remoteContentOptionAllowForMsg"

    // hide original popupmenu item
    if (document.getElementById("remoteContentOptionAllowForMsg"))
      aht_originalRemoteContentItem = document.getElementById(
        "remoteContentOptionAllowForMsg");
    if (aht_originalRemoteContentItem)
      aht_originalRemoteContentItem.setAttribute("hidden", true);

    // show the aht version of the popupmenu item
    if (document.getElementById("aht_remoteContentOptionAllowForMsg"))
      aht_tempRemoteContentItem = document.getElementById(
        "aht_remoteContentOptionAllowForMsg");
    if (aht_tempRemoteContentItem)
      aht_tempRemoteContentItem.removeAttribute("hidden");
  },

  resetRemoteContentPopupmenuItem: function() {
    // console.debug("AHT: resetRemoteContentPopupmenuItem");

    // Tb 31, 38, 45, 52, ... popupmenu item has ID "remoteContentOptionAllowForMsg"

    // show original popupmenu item
    if (document.getElementById("remoteContentOptionAllowForMsg"))
      aht_originalRemoteContentItem = document.getElementById(
        "remoteContentOptionAllowForMsg");
    if (aht_originalRemoteContentItem)
      aht_originalRemoteContentItem.removeAttribute("hidden");

    // hide the aht version of the popupmenu item
    if (document.getElementById("aht_remoteContentOptionAllowForMsg"))
      aht_tempRemoteContentItem = document.getElementById(
        "aht_remoteContentOptionAllowForMsg");
    if (aht_tempRemoteContentItem)
      aht_tempRemoteContentItem.setAttribute("hidden", true);
  },

  checkMailForHtmlpart: function() {
    // console.debug("AHT: run checkMailForHtmlpart ----------------");
    try {
      if (gFolderDisplay.selectedCount != 1) {
        // console.debug("AHT: selectedCount != 1");
        ahtButtonStatus.disableButtons();
      } else {
        // get the msg header (to ask for junk status and 'Body: text/html')
        let ahtMsgHdr = gFolderDisplay.selectedMessage;
        // ask for selected messages junk status
        let ahtMsgJunkScore = ahtMsgHdr.getStringProperty("junkscore");
        let ahtMsgIsJunk = (ahtMsgJunkScore == Components.interfaces.nsIJunkMailPlugin.IS_SPAM_SCORE);

        // if msg is junk disable the ahtButtons
        if (ahtMsgIsJunk) {
          // console.debug("AHT: message is Junk");
          ahtButtonStatus.disableButtons();
        } else if (gFolderDisplay.selectedMessageIsNews) { 
          // console.debug("AHT: message is News");
          ahtButtonStatus.disableButtons();
        } else if (gFolderDisplay.selectedMessageIsFeed) { 
          // console.debug("AHT: message is Feed");
          ahtButtonStatus.enableButtons();
        } else {
          // First check MsgHdr without decrypting to prevent an additional passphrase dialog in case of PGP/MIME
          MsgHdrToMimeMessage(ahtMsgHdr, null, function(aMsgHdr, aMimeMsg) {
            // multipart/encrypted enables the button for encrypted PGP/MIME messages
            // in this case we don't check for HTML, because the check seems not to be possible for PGP/MIME
            if (aMimeMsg.prettyString().search("multipart/encrypted") != -1) {
              // console.debug("AHT: message is PGP/MIME multipart/encrypted");
              ahtButtonStatus.enableButtons();
            } else {
              // search for 'Body: text/html' in MIME parts,
              // it seems this is only working if messages are downloaded for offline reading?
              MsgHdrToMimeMessage(ahtMsgHdr, null, function(aMsgHdr, aMimeMsg) {
                // console.debug("AHT: Check for html part ----------------");
                // console.debug("AHT: Body: text/html " + aMimeMsg.prettyString().search("Body: text/html"));
                // console.debug("AHT: text/html " + aMimeMsg.prettyString().search("text/html"));
                // console.debug("AHT: Body: plain/html " + aMimeMsg.prettyString().search("Body: plain/html"));
                // console.debug("AHT: plain/html " + aMimeMsg.prettyString().search("plain/html"));
                // console.debug("AHT: multipart/alternative " + aMimeMsg.prettyString().search("multipart/alternative"));
                // console.debug("AHT: multipart/signed " + aMimeMsg.prettyString().search("multipart/signed"));
                // console.debug("AHT: multipart/encrypted " + aMimeMsg.prettyString().search("multipart/encrypted"));

                // 'Body: text/html' is found, enable ahtButtons
                if (aMimeMsg.prettyString().search("Body: text/html") != -1) {
                  // console.debug("AHT: message contains HTML body part");
                  ahtButtonStatus.enableButtons();
                }
                // no 'Body: text/html', disable ahtButtons
                else {
                  ahtButtonStatus.disableButtons();
                }
              }, true, {
                examineEncryptedParts: true
              }); // examineEncryptedParts=true is necessary for encrypted S/MIME messages
            }
          }, true, {
            examineEncryptedParts: false
          }); // examineEncryptedParts=false to prevent an additional passphrase dialog in case of PGP/MIME
        }
      }
    } catch (e) {
      // console.debug("AHT: catch error in checkMailForHtmlpart");
      ahtButtonStatus.disableButtons();
    }
  }
}

/* eventListeners are now called from WindowListener API *
window.addEventListener("load", function(e) {
  ahtButtonSetIcon.startup();
}, false);
window.addEventListener("unload", function(e) {
  ahtButtonSetIcon.shutdown();
}, false);

window.addEventListener("load", function(e) {
  ahtButtonStatus.startup();
}, false);
window.addEventListener("unload", function(e) {
  ahtButtonStatus.shutdown();
}, false);
**********************************************************/
