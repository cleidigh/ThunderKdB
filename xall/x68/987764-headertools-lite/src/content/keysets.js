var prefs = Components.classes["@mozilla.org/preferences-service;1"]
  .getService(Components.interfaces.nsIPrefBranch);

window.addEventListener("load", function() {HeaderToolsLiteKeys.init()}, false);

var HeaderToolsLiteKeys = {
  init : function() {
    var shortcut1, shortcut2 = null;
    try {
      shortcut1 = prefs.getCharPref("extensions.hdrtoolslite.edit_shortcut");
      shortcut2 = prefs.getCharPref("extensions.hdrtoolslite.editFS_shortcut");
    }
    catch(e) {console.log("shortcut error")}
    if (shortcut1) {
      var key1 = document.createXULElement("key");
      key1.setAttribute("key", shortcut1);
      key1.setAttribute("modifiers", "control");
      key1.setAttribute("id", "headerToolsLightkey1");
      key1.setAttribute("command", "headerToolsLightedit");
      document.getElementById("headerToolsLightkeyset").appendChild(key1);
      document.getElementById("headerToolsLightModify1").setAttribute("key", "headerToolsLightkey1");
      document.getElementById("headerToolsLightModify3").setAttribute("key", "headerToolsLightkey1");
    }
    if (shortcut2) {
      var key2 = document.createXULElement("key");
      key2.setAttribute("key", shortcut2);
      key2.setAttribute("modifiers", "control");
      key2.setAttribute("id", "headerToolsLightkey2");
      key2.setAttribute("command", "headerToolsLighteditFS");
      document.getElementById("headerToolsLightkeyset").appendChild(key2);
      document.getElementById("headerToolsLightModify2").setAttribute("key", "headerToolsLightkey2");
      document.getElementById("headerToolsLightModify4").setAttribute("key", "headerToolsLightkey2");
    }
  }
};
