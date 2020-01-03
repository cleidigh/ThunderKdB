function loadPrefs() {

  document.addEventListener("dialogaccept", function(event) {
    let ret = savePrefs();
    if (ret === false) { 
      event.preventDefault(); // do not close dialog
    }
  });

  var prefs = Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefService).getBranch("extensions.refwdformatter.");
  var ret = true; try { ret = (prefs.getBoolPref("replytext.on") !== false); } catch(error) { prefs.setBoolPref("replytext.on", true); }
  var reh = true; try { reh = (prefs.getBoolPref("replyhtml.on") !== false); } catch(error) { prefs.setBoolPref("replyhtml.on", true); }
  var lit = true; try { lit = (prefs.getBoolPref("listtext.on") !== false); } catch(error) { prefs.setBoolPref("listtext.on", true); }
  var lih = true; try { lih = (prefs.getBoolPref("listhtml.on") !== false); } catch(error) { prefs.setBoolPref("listhtml.on", true); }
  document.getElementById("replytext").checked = ret;
  document.getElementById("replyhtml").checked = reh;
  document.getElementById("listtext").checked = lit;
  document.getElementById("listhtml").checked = lih;
}

function savePrefs() {
  console.log("4");
  var prefs = Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefService).getBranch("extensions.refwdformatter.");
  console.log("5");
  prefs.setBoolPref("replytext.on", (document.getElementById("replytext").checked === true));
  prefs.setBoolPref("replyhtml.on", (document.getElementById("replyhtml").checked === true));
  prefs.setBoolPref("listtext.on", (document.getElementById("listtext").checked === true));
  prefs.setBoolPref("listhtml.on", (document.getElementById("listhtml").checked === true));
  console.log("6");
  return true;
}