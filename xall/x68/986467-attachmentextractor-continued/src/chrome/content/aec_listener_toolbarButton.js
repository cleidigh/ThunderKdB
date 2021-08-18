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
  aecButtonStatus.startup();
}, false);
window.addEventListener("unload", function(e) {
  aecButtonStatus.shutdown();
}, false);
*/

var aecButtonStatus = {

  startup: function() {
    this.observerService = Components.classes[
        "@mozilla.org/observer-service;1"]
      .getService(Ci.nsIObserverService);
    this.observerService.addObserver(this, "mail:updateToolbarItems",
    false);
  },

  shutdown: function() {
    this.observerService.removeObserver(this, "mail:updateToolbarItems");
  },

  observe: function(subject, topic, data) {
    switch (topic) {
      case "mail:updateToolbarItems":
        this.setButtonStatus();
        break;
    }
  },

  setButtonStatus: function() {
    try {
      if ((gFolderDisplay.selectedCount < 1) || 
          (gFolderDisplay.selectedMessageIsFeed) ||    // disable in case of rss feeds
          (gFolderDisplay.selectedMessageIsNews)) {    // disable in case of newsgroups
        // console.debug("AEC selected Message is RSS or News or gFolderDisplay.selectedCount < 1");
        aecButtonStatus.disableButtons();
      } else {
        aecButtonStatus.enableButtons();
      }
    } catch (e) {
      // console.debug("AEC catch error");
      aecButtonStatus.enableButtons();
    }
  },

  enableButtons: function() {
    // console.debug("aec ----------------");
    // console.debug("aec enableButtons");

    let aecToolbarButton = document.getElementById("aec-toolbarButton");
    if (aecToolbarButton)
      aecToolbarButton.removeAttribute("disabled");
  },

  disableButtons: function() {
    // console.debug("aec ----------------");
    // console.debug("aec disableButtons");

    let aecToolbarButton = document.getElementById("aec-toolbarButton");
    if (aecToolbarButton)
      aecToolbarButton.setAttribute("disabled", true);
  },

}