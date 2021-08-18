try {
  if (typeof Cc === "undefined") var Cc = Components.classes;
  if (typeof Ci === "undefined") var Ci = Components.interfaces;
  if (typeof Cr === "undefined") var Cr = Components.results;
} catch (e) {}

var {
  Services
} = ChromeUtils.import("resource://gre/modules/Services.jsm");

/*
  window.addEventListener("load", function(e) {
    aecMenuItemStatus.startup();
  }, false);
  window.addEventListener("unload", function(e) {
    aecMenuItemStatus.shutdown();
  }, false);
*/

var aecMenuItemStatus = {

  startup: function() {
    this.observerService = Components.classes[
        "@mozilla.org/observer-service;1"]
      .getService(Ci.nsIObserverService);
    this.observerService.addObserver(this, "mail:updateToolbarItems", false);
  },

  shutdown: function() {
    this.observerService.removeObserver(this, "mail:updateToolbarItems");
  },

  observe: function(subject, topic, data) {
    switch (topic) {
      case "mail:updateToolbarItems":
        this.setMenuItemStatus();
        break;
    }
  },

  setMenuItemStatus: function() {
    try {
      if ((gFolderDisplay.selectedCount < 1) ||        // disable if no message is selected
          (gFolderDisplay.selectedMessageIsFeed) ||    // disable in case of rss feeds
          (gFolderDisplay.selectedMessageIsNews)) {    // disable in case of newsgroups
        // console.debug("AEC selected Message is RSS or News or gFolderDisplay.selectedCount < 1");
        aecMenuItemStatus.disableMenuItems();
      } else {
        aecMenuItemStatus.enableMenuItems();
      }
    } catch (e) {
      // console.debug("AEC catch error");
      aecMenuItemStatus.enableMenuItems();
    }
  },

  enableMenuItems: function() {
    // console.debug("aec ----------------");
    // console.debug("aec enableMenuItems");

    // we MUST use removeAttribute("disabled")

    // ------ Menu 'Message' ------
    let aecMenuSeparator = document.getElementById("aec-messageMenuPopup-separator");
    if (aecMenuSeparator)
      aecMenuSeparator.removeAttribute("disabled");

    let aecMenuItem = document.getElementById("aec-messageMenuPopup-menu");
    if (aecMenuItem)
      aecMenuItem.removeAttribute("disabled");
  },

  disableMenuItems: function() {
    // console.debug("aec ----------------");
    // console.debug("aec disableMenuItems");

    // ------ Menu 'Message' ------
    let aecMenuSeparator = document.getElementById("aec-messageMenuPopup-separator");
    if (aecMenuSeparator)
      aecMenuSeparator.setAttribute("disabled", true);

    let aecMenuItem = document.getElementById("aec-messageMenuPopup-menu");
    if (aecMenuItem)
      aecMenuItem.setAttribute("disabled", true);
  },

}
