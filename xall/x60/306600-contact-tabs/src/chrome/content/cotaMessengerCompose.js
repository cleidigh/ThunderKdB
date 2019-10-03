if (typeof contacttabs == "undefined") {
  var contacttabs = {};
};

contacttabs.MessengerCompose = new function() {
  var pub = {};
  var self = this;

  self.unload = function() {
    window.removeEventListener("load",
                               contacttabs.Main.init,
                               false);
    window.removeEventListener("unload",
                               self.unload,
                               false);
  }

  pub.init = function() {
    window.addEventListener("unload",
                            self.unload,
                            false);

    var cotaPrefs =
      Components.classes["@mozilla.org/preferences-service;1"]
                .getService(Components.interfaces.nsIPrefService)
                .getBranch("extensions.org.janek.cota.");
    cotaPrefs.QueryInterface(Components.interfaces.nsIPrefBranch);

    var xulAppInfo = Components.classes["@mozilla.org/xre/app-info;1"]
      .getService(Components.interfaces.nsIXULAppInfo);

    var versionComparator =
      Components.classes["@mozilla.org/xpcom/version-comparator;1"]
      .getService(Components.interfaces.nsIVersionComparator);

    //
    // Contact Tabs can install its own search engine as auto completion engine
    // for TBs message composer. Then, it autocompletes names and emails using
    // contains instead of begins-with. We do this only for TB < 27 because
    // in 27 TB switched to contains in it's own auto complete code.
    //
    if(versionComparator.compare(xulAppInfo.version, "27.0") < 0) {
      if(cotaPrefs.getBoolPref("enableAutocompleteInComposer")) {
        var addrTextBox = document.getElementById('addressCol2#1');
        var autoCompleteSearch = addrTextBox.getAttribute('autocompletesearch');
        addrTextBox.setAttribute('autocompletesearch',
                                 autoCompleteSearch.replace(/addrbook/g, 'cotaaddrbook'));
      }
    }
  }

  return pub;
}

// Init addin after window loaded
window.addEventListener("load",
                        contacttabs.MessengerCompose.init,
                        false);
