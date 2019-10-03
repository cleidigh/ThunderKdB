var path = {
  init: function() {
    if (document.getElementById("mailContext"))
      document.getElementById("mailContext").addEventListener("popupshowing", path.popup, false);
    else if (document.getElementById("msgComposeContext"))
      document.getElementById("msgComposeContext").addEventListener("popupshowing", path.popup, false);
  }
, 
  popup: function() {
    var selection = path.getSelectedText();
    var strbundle = document.getElementById("path-bundle");
    var menuItem = document.getElementById("pathItem");
    if(selection != "" && (document.getElementById("msgComposeContext") || gContextMenu.inMessageArea)) {
      if (selection.length > 15)
        selection = selection.substr(0, 15) + "...";
      var menuLabel = strbundle.getFormattedString("label", [selection]);
      menuItem.hidden = false;
      menuItem.setAttribute("label", menuLabel);
    }
    else menuItem.hidden = true;
    if(document.getElementById("msgComposeContext") == null)
      gContextMenu.initSeparators();
  }
, 
  launchExplorer: function() {
    var file = Components.classes["@mozilla.org/file/directory_service;1"].getService(Components.interfaces.nsIProperties).get("WinD", Components.interfaces.nsIFile);
    file.append("explorer.exe");
    if(file.exists() == false) {
      var strbundle = document.getElementById("path-bundle");
      var msg = strbundle.getFormattedString("err", [file.path]);
      alert(msg);
    }
    else {
      var args = [];
      var process = Components.classes["@mozilla.org/process/util;1"].createInstance(Components.interfaces.nsIProcess);
      var localfile = Components.classes["@mozilla.org/file/local;1"].createInstance(Components.interfaces.nsIFile);
      var environment = Components.classes["@mozilla.org/process/environment;1"].getService(Components.interfaces.nsIEnvironment);
      var prefbranch = Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefBranch);
      var selection = path.getSelectedText();
      selection = selection.replace(/\"/g, "");
      selection = selection.replace(/%(.+?)%/g, function(match, submatch) {
        if(environment.exists(submatch) == true)
          return environment.get(submatch);
        else
          return match;
      });
      selection = selection.replace(/\\$/, "");
      if (selection.length > 260)
        selection = selection.substring(0, 260);
      while(true) {
        try {
          localfile.initWithPath(selection);
          if(localfile.isFile() == true && prefbranch.getBoolPref("extensions.path.directopen") == false)
            args.push("\/select,");
        }
        catch(e) {
          if(e.name == "NS_ERROR_FILE_NOT_FOUND" || e.name == "NS_ERROR_FILE_ACCESS_DENIED") {
            localfile = localfile.parent;
            if(localfile != null) {
              selection = localfile.path;
              continue;
            }
          }
          else if(e.name == "NS_ERROR_FAILURE") {
            if(selection.match(/^(\\\\.+)\\.*$/)) {
              selection = RegExp.$1;
              continue;
            }
          }
        }
        selection += " "; // Append a space to avoid a bug that occurs when the target path includes ",".
        args.push(path.encodeText(selection));
        break;
      }
      process.init(file);
      process.run(false, args, args.length);
    }
  }
,
  encodeText: function(src) {
    var dst = "";
    var acp = "";
    var regkey = Components.classes["@mozilla.org/windows-registry-key;1"].createInstance(Components.interfaces.nsIWindowsRegKey);
    var converter = Components.classes["@mozilla.org/intl/scriptableunicodeconverter"].createInstance(Components.interfaces.nsIScriptableUnicodeConverter);
    var codepage = {
      "874"   : "Windows-874",
      "932"   : "Windows-31J",
      "936"   : "GBK",
      "949"   : "Windows-949",
      "950"   : "Big5",
      "1200"  : "UTF-16",
      "1201"  : "UTF-16BE",
      "1250"  : "Windows-1250",
      "1251"  : "Windows-1251",
      "1252"  : "Windows-1252",
      "1253"  : "Windows-1253",
      "1254"  : "Windows-1254",
      "1255"  : "Windows-1255",
      "1256"  : "Windows-1256",
      "1257"  : "Windows-1257",
      "1258"  : "Windows-1258",
      "54936" : "GB18030",
      "65001" : "UTF-8"
    };
    try {
      regkey.open(regkey.ROOT_KEY_LOCAL_MACHINE, "SYSTEM\\CurrentControlSet\\Control\\Nls\\CodePage", regkey.ACCESS_READ);
      acp = regkey.readStringValue("ACP");
    }
    catch(e) {
    }
    regkey.close();
    if(acp in codepage == false)
      acp = "1252";
    converter.charset = codepage[acp];
    dst = converter.ConvertFromUnicode(src) + converter.Finish();
    return dst;
  }
, 
  getSelectedText: function() {
    var selection = document.commandDispatcher.focusedWindow.getSelection().toString();
    selection = selection.replace(/^\s+/, "");
    selection = selection.replace(/(\n|\r|\t|\v)+/g, "");
    selection = selection.replace(/\s*\\\s*/g, "\\");
    selection = selection.replace(/\s+$/, "");
    return selection;
  }
};
window.addEventListener("load", path.init, true);
