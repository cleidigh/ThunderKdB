'use strict';

var EXPORTED_SYMBOLS = ["startupmaster"];

const {classes: Cc, interfaces: Ci, utils: Cu} = Components;
Cu.import("resource://gre/modules/Services.jsm");

var startupmaster = {

  core: {

    /*
     * Sets default preferences.
     */
    setdefaults: function() {
      var branch = Services.prefs.getDefaultBranch("extensions.startupmaster.");
      branch.setBoolPref("enable", true);
      branch.setBoolPref("delay", true);
      branch.setBoolPref("block", false);
    },

    /*
     * Forces the main application to quit.
     */
    forcequit: function() {
      try {
        Services.startup.quit(Services.startup.eForceQuit);
      } catch(err) {
        Services.prompt.alert(null, "StartupMaster Error", err);
      }
    },

    /*
     * Logs in to the software security device, displaying a master password
     * prompt if not already logged in. Calls this.forcequit() on failure if
     * the "block" preference is enabled.
     */
    pk11login: function() {
      try {
        var pk11db = Cc["@mozilla.org/security/pk11tokendb;1"].getService(Ci.nsIPK11TokenDB);
        var token = pk11db.getInternalKeyToken();
        token.login(false);
      } catch(err) {
        try {
          var block = Services.prefs.getBoolPref("extensions.startupmaster.block");
        } catch(err) {
          var block = false;
        }
        if(block) this.forcequit();
      }
    },

    /*
     * Called on app startup, displays a password prompt using this.pk11login().
     * If the "delay" preference is enabled, this call is deferred until the
     * profile-after-change notification. The "enable" preference is also
     * respected for compatibility with previous versions of the add-on.
     */
    init: function() {
      try {
        var enable = Services.prefs.getBoolPref("extensions.startupmaster.enable");
      } catch(err) {
        var enable = true;
      }
      if(enable) {
        try {
          var delay = Services.prefs.getBoolPref("extensions.startupmaster.delay");
        } catch(err) {
          var delay = true;
        }
        if(delay) {
          Services.obs.addObserver(this.observer, "profile-after-change", false);
        } else {
          this.pk11login();
        }
      }
    },

    /*
     * nsIObserver instance for the delayed call to this.pk11login().
     * Cleans up itself after a single notification.
     */
    observer: {
      observe: function(aSubject, aTopic, aData) {
        startupmaster.core.pk11login();
        Services.tm.mainThread.dispatch({
          run: function() {
            Services.obs.removeObserver(startupmaster.core.observer, "profile-after-change");
          }
        }, Ci.nsIThread.DISPATCH_NORMAL);
      }
    },

    /*
     * Returns whether there is a non-empty master password.
     */
    ismpset: function() {
      try {
        var pk11db = Cc["@mozilla.org/security/pk11tokendb;1"].getService(Ci.nsIPK11TokenDB);
        var token = pk11db.getInternalKeyToken();
        if('hasPassword' in token) {
            // version 53 and later
            return token.hasPassword;
        } else {
            // version 52 and earlier
            var secmoddb = Cc["@mozilla.org/security/pkcs11moduledb;1"].getService(Ci.nsIPKCS11ModuleDB);
            var status = secmoddb.findSlotByName("").status;
            return !(status == Ci.nsIPKCS11Slot.SLOT_UNINITIALIZED || status == Ci.nsIPKCS11Slot.SLOT_READY);
        }
      } catch(err) {
        return false;
      }
    }

  },

  inst: {

    /*
     * Called on add-on install, guides the user through setting up a master password.
     */
    setupmp: function() {
      if(!startupmaster.core.ismpset()) {
        if(Services.prompt.confirm(null, "StartupMaster", "Would you like to set up a master password?")) {
          Services.ww.openWindow(null, "chrome://mozapps/content/preferences/changemp.xul", "", "modal,centerscreen", null);
          if(startupmaster.core.ismpset()) {
            var block = Services.prompt.confirm(null, "StartupMaster", "Would you like to quit " + Services.appinfo.name + " if the password dialog is canceled?");
            Services.prefs.setBoolPref("extensions.startupmaster.enable", true);
            Services.prefs.setBoolPref("extensions.startupmaster.block", block);
          }
        }
      }
      if(!startupmaster.core.ismpset()) {
        Services.prompt.alert(null, "StartupMaster", "No master password was set up. StartupMaster will do nothing until you set one in the extension preferences.");
      }
    },

    /*
     * Called on add-on uninstall, asks the user whether to remove the master password.
     */
    removemp: function() {
      if(startupmaster.core.ismpset()) {
        if(Services.prompt.confirm(null, "StartupMaster", "Would you like to remove the master password?")) {
          Services.ww.openWindow(null, "chrome://mozapps/content/preferences/removemp.xul", "", "modal,centerscreen", null);
        }
      }
      if(startupmaster.core.ismpset()) {
        Services.prompt.alert(null, "StartupMaster", "The master password wasn't removed. Therefore, you will still be asked for it when accessing stored passwords, even without StartupMaster.");
      }
    }

  },

  ui: function() {

    /*
     * A collection of functions to set up, change or remove the master password
     * from the add-on preferences page. Currently setting up and changing share
     * the same implementation.
     */

    function changemp(event) {
      var container = event.target.ownerDocument;
      container.defaultView.openDialog("chrome://mozapps/content/preferences/changemp.xul", "", "modal");
      updatebuttons(container);
    };

    function removemp(event) {
      var container = event.target.ownerDocument;
      container.defaultView.openDialog("chrome://mozapps/content/preferences/removemp.xul", "", "modal");
      updatebuttons(container);
    };

    /*
     * Facilities to only show the relevant buttons depending on whether the
     * master password is currently set or not.
     */

    function addbuttonevents(container) {
      container.getElementById("setupmp").addEventListener("command", changemp, false);
      container.getElementById("changemp").addEventListener("command", changemp, false);
      container.getElementById("removemp").addEventListener("command", removemp, false);
    };

    function removebuttonevents(container) {
      container.getElementById("setupmp").removeEventListener("command", changemp);
      container.getElementById("changemp").removeEventListener("command", changemp);
      container.getElementById("removemp").removeEventListener("command", removemp);
    };
    
    function updatebuttons(container) {
      var ismpset = startupmaster.core.ismpset();
      container.getElementById("setupmp").hidden = ismpset;
      container.getElementById("changemp").hidden = !ismpset;
      container.getElementById("removemp").hidden = !ismpset;
    };

    /*
     * nsIObserver instance to initialize buttons when preferences are opened.
     */
    var observer = {
      observe: function(aSubject, aTopic, aData) {
        if (aTopic == "addon-options-displayed" && aData == "{506d044e-41fa-4cc8-9dc6-9ff70e96eebf}") {
          addbuttonevents(aSubject);
          updatebuttons(aSubject);
        }
        if (aTopic == "addon-options-hidden" && aData == "{506d044e-41fa-4cc8-9dc6-9ff70e96eebf}") {
          removebuttonevents(aSubject);          
        }
      }
    }

    return {

      /*
       * Public functions that attach and detach the aforementioned observer
       * on add-on startup and shutdown respectively.
       */
    
      init: function() {
        Services.obs.addObserver(observer, "addon-options-displayed", false);
        Services.obs.addObserver(observer, "addon-options-hidden", false);
      },

      cleanup: function() {
        Services.obs.removeObserver(observer, "addon-options-displayed");
        Services.obs.removeObserver(observer, "addon-options-hidden");
      }

    };

  }()

}

