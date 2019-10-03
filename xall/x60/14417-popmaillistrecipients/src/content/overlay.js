var popmaillistrecipients = {
  onLoad: function() {
    // initialization code
    this.initialized = true;
    this.strings = document.getElementById("popmaillistrecipients-strings");
    document.getElementById("threadPaneContext")
            .addEventListener("popupshowing", function(e) { this.showContextMenu(e); }, false);
  },

  showContextMenu: function(event) {
    // show or hide the menuitem based on what the context menu is on
    // see http://kb.mozillazine.org/Adding_items_to_menus
    document.getElementById("context-popmaillistrecipients").hidden = (GetNumSelectedMessages() > 0);
  },
  expandRecipients: function(e) {
    Recipients2CompFields(gMsgCompose.compFields);
    expandRecipients();
    CompFields2Recipients(gMsgCompose.compFields);
  },
  onToolbarButtonCommand: function(e) {
    // just reuse the function above.  you can change this, obviously!
    popmaillistrecipients.expandRecipients(e);
  }

};

document.addEventListener("load", function(e) { popmaillistrecipients.onLoad(e); }, false);
