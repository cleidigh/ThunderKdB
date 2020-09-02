var prefs = Components.classes["@mozilla.org/preferences-service;1"]
  .getService(Components.interfaces.nsIPrefBranch);

window.addEventListener("load", function() {iOSNotesKeys.init()}, false);

var iOSNotesKeys = {
  init : function() {
        var shortcut = null;
		try {			
			shortcut = iOSNotesObj.prefs.getCharPref("extensions.iOSNotes.editNote_shortcut");			
		}
		catch(e) {}
		if (shortcut) {			
			var key1 = document.createElement("key");
			key1.setAttribute("key", shortcut);
			key1.setAttribute("modifiers", "control");
			key1.setAttribute("id", "iOSNotesKey");
			key1.setAttribute("command", "iOSIMAPNotesModifyContent");
			document.getElementById("iOSIMAPNotesKeyset").appendChild(key1);
			document.getElementById("iOSIMAPNotesModify1").setAttribute("key", "iOSNotesKey");
		}
  }
};
