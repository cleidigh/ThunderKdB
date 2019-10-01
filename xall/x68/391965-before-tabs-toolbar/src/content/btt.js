if ("undefined" == typeof(btt)) {
  var btt = {};
};

var prefs = Components.classes['@mozilla.org/preferences-service;1']
                      .getService(Components.interfaces.nsIPrefBranch);
var prefServiceBranch = Components.classes["@mozilla.org/preferences-service;1"]
                                  .getService(Components.interfaces.nsIPrefService)
                                  .getBranch("");

if (!(prefServiceBranch.getPrefType('extensions.btt.styleButton'))) {
  prefs.setBoolPref('extensions.btt.styleButton',true);
};

btt = {
  loadBtt: function() {
    Services.prefs.addObserver("extensions.btt.styleButton", this, false);
    Services.ww.registerNotification(this);
    this.observe(null, "nsPref:changed", "extensions.btt.styleButton");
  },

  observe: function (aSubject, aTopic, aData) {
    let bttToolbar = document.getElementById("before-tab-toolbar");
    if (aTopic == "nsPref:changed") {
      switch (aData) {
        case "extensions.btt.styleButton": {
          let attributeValue = prefs.getBoolPref("extensions.btt.styleButton", false) && "true";
          for (let win of fixIterator(Services.ww.getWindowEnumerator())) {
            document.documentElement.setAttribute("bttStyleButton", attributeValue);
          }
          break;
        }
      }
    } else if (aTopic == "domwindowopened") {
      let win = aSubject.QueryInterface(Components.interfaces.nsIDOMWindow);
      win.addEventListener("load", function() {
        let attributeValue = prefs.getBoolPref("extensions.btt.styleButton", false) && "true";
        document.documentElement.setAttribute("bttStyleButton", attributeValue);
      }, false);
    }
  },
};

btt.loadBtt();
