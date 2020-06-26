var prefs = Components.classes["@mozilla.org/preferences-service;1"]
  .getService(Components.interfaces.nsIPrefBranch);

document.addEventListener("dialogaccept", function() {savePrefs()});

function savePrefs() {
  prefs.setBoolPref("extensions.hdrtoolslite.putOriginalInTrash",document.getElementById("delOrig").checked);
  prefs.setBoolPref("extensions.hdrtoolslite.use_imap_fix", document.getElementById("imapFix").checked);
  prefs.setBoolPref("extensions.hdrtoolslite.add_htl_header", document.getElementById("addHTLheader").checked);
  if (document.getElementById("shortcutBox1").value.length > 0)
    prefs.setCharPref("extensions.hdrtoolslite.edit_shortcut", document.getElementById("shortcutBox1").value);
  else
    prefs.deleteBranch("extensions.hdrtoolslite.edit_shortcut");
  if (document.getElementById("shortcutBox2").value.length > 0)
    prefs.setCharPref("extensions.hdrtoolslite.editFS_shortcut", document.getElementById("shortcutBox2").value);
  else
    prefs.deleteBranch("extensions.hdrtoolslite.editFS_shortcut");
  var maxChars =  document.getElementById("maxFSchars").value;
  if (maxChars == -1 || maxChars > 50)
    prefs.setIntPref("extensions.hdrtoolslite.fullsource_maxchars", maxChars);
  else
    prefs.setIntPref("extensions.hdrtoolslite.fullsource_maxchars", 50);
}

function onLoad() {
  document.getElementById("delOrig").checked = prefs.getBoolPref("extensions.hdrtoolslite.putOriginalInTrash");
  document.getElementById("imapFix").checked = prefs.getBoolPref("extensions.hdrtoolslite.use_imap_fix");
  document.getElementById("addHTLheader").checked = prefs.getBoolPref("extensions.hdrtoolslite.add_htl_header");
  try {
    document.getElementById("shortcutBox1").value = prefs.getCharPref("extensions.hdrtoolslite.edit_shortcut");
    document.getElementById("shortcutBox2").value = prefs.getCharPref("extensions.hdrtoolslite.editFS_shortcut");
  }
  catch(e) {}
  document.getElementById("maxFSchars").value = prefs.getIntPref("extensions.hdrtoolslite.fullsource_maxchars");
}
