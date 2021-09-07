var { Services } = ChromeUtils.import(
  "resource://gre/modules/Services.jsm"
);

var ahtStatusbarSetLabelIcon = {

  startup: function() {
    Services.prefs.addObserver("", this, false);

    this.setCurrentButtonIconLabel(false);
    this.setCurrentButtonIconLabel(true);
  },

  shutdown: function() {
    Services.prefs.removeObserver("", this);
  },

  observe: function(subject, topic, data) {
    if (topic != "nsPref:changed") {
      return;
    }

    switch (data) {
      case "mailnews.display.prefer_plaintext":
        this.setCurrentButtonIconLabel(false);
        break;
      case "mailnews.display.html_as":
        this.setCurrentButtonIconLabel(false);
        break;
      case "mailnews.display.disallow_mime_handlers":
        this.setCurrentButtonIconLabel(false);
        break;
      case "rss.display.prefer_plaintext":
        this.setCurrentButtonIconLabel(true);
        break;
      case "rss.display.html_as":
        this.setCurrentButtonIconLabel(true);
        break;
      case "rss.display.disallow_mime_handlers":
        this.setCurrentButtonIconLabel(true);
        break;
      case "rss.show.summary":
        this.setCurrentButtonIconLabel(true);
        break;
    }
  },

  setCurrentButtonIconLabel: function(isFeedOption) {
    if (!isFeedOption) {
      let prefer_plaintext = false;
      let html_as = 0;
      let disallow_classes = 0;

      prefer_plaintext = Services.prefs.getBoolPref(
        "mailnews.display.prefer_plaintext");
      html_as = Services.prefs.getIntPref("mailnews.display.html_as");
      disallow_classes = Services.prefs.getIntPref(
        "mailnews.display.disallow_mime_handlers");

      let ahtStatusbarpanelText = document.getElementById(
        "AHT-statusbarpanel-text");
      let ahtStatusbarpanelIcon = document.getElementById(
        "AHT-statusbarpanel-icon");

      if (ahtStatusbarpanelText && ahtStatusbarpanelIcon) {
        if (!prefer_plaintext && !html_as && !disallow_classes) {
          ahtStatusbarpanelText.setAttribute("value", ahtStatusbarpanelText
            .getAttribute("labelAHT-htmlStatusOriginal"));
          ahtStatusbarpanelIcon.setAttribute("AHT-htmlStatus", "Original");
        } else if (!prefer_plaintext && html_as == 3 && disallow_classes >
          0) {
          ahtStatusbarpanelText.setAttribute("value", ahtStatusbarpanelText
            .getAttribute("labelAHT-htmlStatusSanitized"));
          ahtStatusbarpanelIcon.setAttribute("AHT-htmlStatus", "Sanitized");
        } else if (prefer_plaintext && html_as == 1 && disallow_classes >
          0) {
          ahtStatusbarpanelText.setAttribute("value", ahtStatusbarpanelText
            .getAttribute("labelAHT-htmlStatusPlaintext"));
          ahtStatusbarpanelIcon.setAttribute("AHT-htmlStatus", "Plaintext");
        }
      }
    } else {
      let feed_summary = 0;
      feed_summary = Services.prefs.getIntPref("rss.show.summary");

      let ahtFeedStatusbarpanelText = document.getElementById(
        "AHT-feed-statusbarpanel-text");

      if (ahtFeedStatusbarpanelText) {
        switch (feed_summary) {
          case 0:
            ahtFeedStatusbarpanelText.setAttribute("value",
              ahtFeedStatusbarpanelText.getAttribute(
                "labelAHT-viewFeedWebPage"));
            break;
          case 1:
            ahtFeedStatusbarpanelText.setAttribute("value",
              ahtFeedStatusbarpanelText.getAttribute(
                "labelAHT-viewFeedSummary"));
            break;
          case 2:
            ahtFeedStatusbarpanelText.setAttribute("value",
              ahtFeedStatusbarpanelText.getAttribute(
                "labelAHT-viewFeedSummaryFeedPropsPref"));
            break;
        }
      }
    }
  }
}

var ahtHideAndShowStatusbarElements = {

  startup: function() {
    this.observerService = Components.classes[
        "@mozilla.org/observer-service;1"]
      .getService(Components.interfaces.nsIObserverService);
    this.observerService.addObserver(this, "mail:updateToolbarItems",
    false);
    this.observerService.addObserver(this, "MsgMsgDisplayed", false);

    this.showCurrentStatusbarElement();
  },

  shutdown: function() {
    this.observerService.removeObserver(this, "mail:updateToolbarItems");
    this.observerService.removeObserver(this, "MsgMsgDisplayed");
  },

  observe: function(subject, topic, data) {
    switch (topic) {
      case "MsgMsgDisplayed":
        // console.debug("AHT: MsgMsgDisplayed");
        this.showCurrentStatusbarElement();
        break;
      case "mail:updateToolbarItems":
        // console.debug("AHT: mail:updateToolbarItems");
        this.showCurrentStatusbarElement();
        break;
    }
  },

  showCurrentStatusbarElement: function() {
    let ahtStatusbarMessage = 
      document.getElementById("AHT-statusbarpanel");
    let ahtStatusbarFeed = 
      document.getElementById("AHT-feed-statusbarpanel");

    try {
      // call InitViewBodyMenu() to set the checked attribute in the popupmenu
      InitViewBodyMenu();
      if (gFolderDisplay && (FeedUtils.isFeedFolder(gFolderDisplay.displayedFolder) ||
        gFolderDisplay.selectedMessageIsFeed)) {
        // if feed mode = website, then disable the AHT html mode statusbar element to prevent user confusion
        let feed_summary = 0;
        feed_summary = Services.prefs.getIntPref("rss.show.summary");
        if (feed_summary == 0) {
          // console.debug("AHT: [showCurrentStatusbarElement]: feed_summary == 0");
          ahtStatusbarMessage.setAttribute("hidden", true);
        } else {
          // console.debug("AHT: [showCurrentStatusbarElement]: feed_summary == 1");
          ahtStatusbarMessage.removeAttribute("hidden");
        }
        ahtStatusbarFeed.removeAttribute("hidden");
      } else {
        ahtStatusbarMessage.removeAttribute("hidden");
        ahtStatusbarFeed.setAttribute("hidden", true);
      }
    } catch (e) {
      // console.debug("AHT: [catch(e)]: " + e);
      // instead of hiding both elements, it seems to be better to show the none feed element as fallback
      //  ahtStatusbarMessage.setAttribute("hidden", true);
      ahtStatusbarMessage.removeAttribute("hidden");
      ahtStatusbarFeed.setAttribute("hidden", true);
    }
  }
}

/* eventListeners are now called from WindowListener API *
window.addEventListener("load", function(e) {
  ahtStatusbarSetLabelIcon.startup();
}, false);
window.addEventListener("unload", function(e) {
  ahtStatusbarSetLabelIcon.shutdown();
}, false);

window.addEventListener("load", function(e) {
  ahtHideAndShowStatusbarElements.startup();
}, false);
window.addEventListener("unload", function(e) {
  ahtHideAndShowStatusbarElements.shutdown();
}, false);
**********************************************************/
