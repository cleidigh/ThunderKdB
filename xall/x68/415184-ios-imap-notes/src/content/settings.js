var prefs = Components.classes["@mozilla.org/preferences-service;1"]
  .getService(Components.interfaces.nsIPrefBranch);

document.addEventListener("dialogaccept", function() {savePrefs()});

  function savePrefs() {
	prefs.setBoolPref("extensions.iOSNotes.putOriginalInTrash",document.getElementById("delOrig").checked);
	prefs.setBoolPref("extensions.iOSNotes.keep_Date", document.getElementById("keepDate").checked);	
	if (document.getElementById("shortcutBox").value.length > 0)
		prefs.setCharPref("extensions.iOSNotes.editNote_shortcut", document.getElementById("shortcutBox").value);
	else
		prefs.deleteBranch("extensions.iOSNotes.editNote_shortcut");
	prefs.setIntPref("extensions.iOSNotes.editNote_maxchars", document.getElementById("maxNoteChars").value);	
  }

  function onLoad() {
	document.getElementById("delOrig").checked = prefs.getBoolPref("extensions.iOSNotes.putOriginalInTrash");
	document.getElementById("keepDate").checked = prefs.getBoolPref("extensions.iOSNotes.keep_Date");
	try {		
		document.getElementById("shortcutBox").value = prefs.getCharPref("extensions.iOSNotes.editNote_shortcut");
	}
	catch(e) {}
	document.getElementById("maxNoteChars").value = prefs.getIntPref("extensions.iOSNotes.editNote_maxchars");

   }