/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict"; // use strict mode

var keynav = {
  prefs : null,
  MailFolderKeyNavMenuItem : null,

  startup : function(e) {
  	var MailFolderKeyNav, GoMenuMailFolderKeyNavToggle;
    // get the keynav stringbundle
    // The following technique was only available up to version 60.*.
    var keynavBundle = document.getElementById("keynav.keynav.strings");
    // The following is an alternative way of getting access to the string 
    // bundle service. It seems to be available in 68, but the next method 
    // is neater imho.
//    var sbs = Components.classes["@mozilla.org/intl/stringbundle;1"]
//    .getService(Components.interfaces.nsIStringBundleService);
    // The next line shows how to access string bundles in version 68 and later.
//    var keynavBundle  = sbs.strings.createBundle("chrome://keynav/locale/keynav.properties");
  	// Get preference machinery for keynav
    this.prefs = Components.classes["@mozilla.org/preferences-service;1"]
    .getService(Components.interfaces.nsIPrefService)
    .getBranch("extensions.keynav.");
    // Add keynav prefs observer to keynav
    this.prefs.addObserver("", this, false);
    // Create the MailFolderKeynav menuitem
    const XULNS = "http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul"; // xml namespace
    this.MailFolderKeyNavMenuItem = document.createElementNS(XULNS, "menuitem");
    this.MailFolderKeyNavMenuItem.setAttribute("id", "appmenu_goMailFolderKeyNavMenuItem");
    this.MailFolderKeyNavMenuItem.setAttribute("label", 
      keynavBundle.getString("menu_EnableMailFolderKeyNav.label"));
    this.MailFolderKeyNavMenuItem.setAttribute("type", "checkbox");
    this.MailFolderKeyNavMenuItem.setAttribute("accesskey", 
      keynavBundle.getString("menu_EnableMailFolderKeyNav.accesskey"));
    this.MailFolderKeyNavMenuItem.setAttribute("autocheck", "false");
    this.MailFolderKeyNavMenuItem.setAttribute("checked", "false");
    this.MailFolderKeyNavMenuItem.addEventListener("command",
      function(e) {keynav.toggleMailFolderKeyNavOption();}
    );
//    this.MailFolderKeyNavMenuItem.setAttribute("oncommand", "keynav.toggleMailFolderKeyNavOption()");
    // Get stored values of preferences
    MailFolderKeyNav = this.prefs.getBoolPref("MailFolderKeyNav");
    GoMenuMailFolderKeyNavToggle = this.prefs.getBoolPref("GoMenuMailFolderKeyNavToggle");
    // Add the MailFolderKeynav menuitem to the Go menu according to the GoMenuMailFolderKeyNavToggle option
      this.displayGoMenuQuickToggle(GoMenuMailFolderKeyNavToggle);
/*    if (GoMenuMailFolderKeyNavToggle)
      document.getElementById("menu_GoPopup").appendChild(this.MailFolderKeyNavMenuItem);*/
    // Set the checked/unchecked state of the MailFolderKeynav Go menu item
    this.MailFolderKeyNavMenuItem.setAttribute("checked", MailFolderKeyNav.toString());
    // Set the key navigation state on the mail folder tree
    this.setMailFolderKeyNav(MailFolderKeyNav);
  },

  shutdown : function() {
  	// Remove the MailFolderKeyNav menu item from the Go menu if it is currently attached
  	  this.displayGoMenuQuickToggle(false);
    // Remove the observer
    this.prefs.removeObserver("", this);
    // Release memory held by keynav properties
    this.MailFolderKeyNavMenuItem = null;
    this.prefs = null;
  },

  observe : function(subject, topic, data) {
  	var val;
  	// If the preference has not been changed, bail
    if (topic != "nsPref:changed") {return;}
    // Respond to change in preference
    switch (data) {
    	case "MailFolderKeyNav":
        val = this.prefs.getBoolPref("MailFolderKeyNav"); // get current preference value
        this.MailFolderKeyNavMenuItem.setAttribute("checked", val.toString()); // update state of quick toggle menu item
        this.setMailFolderKeyNav(val); // enable/disable key navigation in the folder pane
    	  break;
    	case "GoMenuMailFolderKeyNavToggle":
        val= this.prefs.getBoolPref("GoMenuMailFolderKeyNavToggle"); // get current preference value
        this.displayGoMenuQuickToggle(val); // add/remove quick toggle from Go menu
    	  break;
    }
  },

  displayGoMenuQuickToggle : function(val) {
  	var goPopup = document.getElementById("menu_GoPopup");
    if (val && this.MailFolderKeyNavMenuItem.parentNode==null)
      goPopup.appendChild(this.MailFolderKeyNavMenuItem); // add menu item to Go menu
    else if (!val && this.MailFolderKeyNavMenuItem.parentNode==goPopup)
      goPopup.removeChild(this.MailFolderKeyNavMenuItem); // delete menu item from Go menu
  },

  setMailFolderKeyNav : function(val) {
    if (val) {
  	  document.getElementById("folderTree").removeAttribute("disableKeyNavigation"); // activate key navigation
	  } else {
  	  document.getElementById("folderTree").setAttribute("disableKeyNavigation", "true");  // deactivate key navigation
    }
  },

  toggleMailFolderKeyNavOption : function() {
    /* This function is called by the oncommand event when the user activates 
  	the MailFolderKeyNav menuitem on the Go menu.  It is not necessary to 
  	update the checked/unchecked state of the menuitem as this will be done 
  	by the observer. */
    var val = this.prefs.getBoolPref("MailFolderKeyNav"); // get current value of MailFolderKeyNav
    this.prefs.setBoolPref("MailFolderKeyNav", !val); // flip it and write it back to preferences
  }
}; // keynav


// Set up event listeners for starting and stopping the extension

window.addEventListener("load", 
  function(e) {
    keynav.startup();
  })

window.addEventListener("unload",
    function(e) {
  keynav.shutdown();
  })

