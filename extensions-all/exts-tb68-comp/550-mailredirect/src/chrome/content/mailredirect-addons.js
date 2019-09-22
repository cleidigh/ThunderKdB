"use strict";

var MailredirectAddonOptions = {
  guid: "{CC3C233D-6668-41bc-AAEB-F3A1D1D594F5}",
  handleEvent: function(aEvent) {
    // Global variables
    var gListView;

    if (gListView === undefined)
      return;

    var item = gListView.getListItemForID(this.guid);
    if (!item)
      return;

    item.showPreferences = this.showPreferences;
  },
  showPreferences: function() {
    var win = Services.wm.getMostRecentWindow("mail:3pane") ||
            Services.wm.getMostRecentWindow("mail:messageWindow");
    // If openOptionsDialog() exists, we are in Thunderbird.
    if (win && typeof win.openOptionsDialog === "function") {
      win.openOptionsDialog("paneRedirect");
    } else {
      win = Services.wm.getMostRecentWindow("mozilla:preferences");
      if (win) {
        win.focus();
        var doc = win.document;
        var pane = doc.getElementById("mailredirect_pane");
        doc.documentElement.syncTreeWithPane(pane, true);
      } else {
        openDialog("chrome://mailredirect/content/mailredirect-prefs.xul",
                   "PrefWindow",
                   "non-private,chrome,titlebar,dialog=no,resizable",
                   "mailredirect_pane");
      }
    }
  }
};

window.addEventListener("ViewChanged", MailredirectAddonOptions, false);
