"use strict";

var { Services } = ChromeUtils.import("resource://gre/modules/Services.jsm");

var ArchiveThisPrefs = {

prefs: null,
language: "en-US",
preset: new Array(),
keys: new Array(),
keySymbols: new Array(),
accel: "control",
debug: false,
overrideKeys: false,
at_addon: null,
at_version: null,
extensions: new Array(),
console: Components.classes["@mozilla.org/consoleservice;1"].
           getService(Components.interfaces.nsIConsoleService),
s: null,
ms: null,
keyNames :
[
  "archive-this-preset-key-0",
  "archive-this-preset-key-1",
  "archive-this-preset-key-2",
  "archive-this-preset-key-3",
  "archive-this-preset-key-4",
  "archive-this-preset-key-5",
  "archive-this-preset-key-6",
  "archive-this-preset-key-7",
  "archive-this-preset-key-8",
  "archive-this-preset-key-9",
  "archive-this-move-key",
  "archive-this-copy-key",
  "archive-this-goto-key"
],

defaultKeys :
{
  "archive-this-move-key" : "M",
  "archive-this-copy-key" : "C",
  "archive-this-goto-key" : "G"
},

modifierNames :
[
  "archive-this-preset-modifier-0",
  "archive-this-preset-modifier-1",
  "archive-this-preset-modifier-2",
  "archive-this-preset-modifier-3",
  "archive-this-preset-modifier-4",
  "archive-this-preset-modifier-5",
  "archive-this-preset-modifier-6",
  "archive-this-preset-modifier-7",
  "archive-this-preset-modifier-8",
  "archive-this-preset-modifier-9",
  "archive-this-move-modifier",
  "archive-this-copy-modifier",
  "archive-this-goto-modifier"
],

compText: ['is','contains','begins with'],

apple_command: null,
setAppleCommand : function(ch) { this.apple_command = ch },

setPickerElement : function(pickerID,uri)
{
  if (ArchiveThisPrefs.debug)
  {
    ArchiveThisPrefs.console.logStringMessage("Archive This: " +
      "Setting picker " + pickerID + " to " + uri);
  }

  if (!uri) uri = '';

  var picker = document.getElementById(pickerID);
  if (!picker) {
    ArchiveThisPrefs.console.logStringMessage("Archive This: " +
      "Could not find picker " + pickerID);
    return;
  }
  let item = null;
  let items = picker.menupopup.children;
  let id = uri.replace(/ /g,"%20");
  for (let i = 0; i < items.length; i++) {
    if (items[i].id == id || items[i].id == uri) {
      if (ArchiveThisPrefs.debug)
      {
        ArchiveThisPrefs.console.logStringMessage("Archive This: " +
          "Item " + i + " matches");
      }
      item = items[i];
    }
  }

  if (item) {
    picker.selectedItem = item;
  }
  return;

  if (uri && uri.indexOf("special:") == 0)
  {
    if (this.ms == null) { this.ms = document.getElementById("bundle_messenger"); }
    var specialName = uri.substr(8);
    var label = this.ms ? this.ms.getString(specialName.toLowerCase()+"FolderName") : specialName;
    picker.setAttribute("label", label);
    picker.setAttribute("uri",uri);
    picker.setAttribute("tooltiptext", label);
    return;
  }

  if (uri)
  {
    var msgfolder = MailUtils.getExistingFolder(uri, true);
    if (msgfolder && msgfolder.canFileMessages)
    {
      // This is now not defined, and I have no idea where it went --jl
      //picker.menupopup.selectFolder(msgfolder);
      picker.setAttribute("uri",uri);
      return;
    }
  }

  picker.setAttribute("uri",null);
  picker.setAttribute("label","-");
},

initPicker : function(pickerID)
{
  if (ArchiveThisPrefs.debug)
  {
    ArchiveThisPrefs.console.logStringMessage( "Archive This: " +
      "Initializing picker " + pickerID);
  }
  if (this.ms == null) { this.ms = document.getElementById("bundle_messenger"); }
  var picker = document.getElementById(pickerID);
  if (!picker)
    return;

  var folders = ['Inbox', 'Trash', 'Sent', 'Drafts', 'Templates'];
  var menupopup = picker.menupopup;
  if (!menupopup) {
    ArchiveThisPrefs.console.logStringMessage("Archive This: " +
      "Could not find menupopup for picker " + pickerID);
    return;
  }

  // The folder picker appears to be gone (!?!), so we just make a list of all
  // available folders. This is the opposite of awesome, but it appears to be
  // the best we can do without writing our own picker.
  let accountManager = Components.classes ["@mozilla.org/messenger/account-manager;1"].getService(Components.interfaces.nsIMsgAccountManager);
  let servers = accountManager.allServers;
  let numServers = servers.length;
  for (var i = 0; i <numServers; i++)
  {
    let rootFolder = servers.queryElementAt(i,Components.interfaces.nsIMsgIncomingServer,null).rootFolder;
    if (rootFolder)
    {
      var allFolders = rootFolder.descendants;
      var numFolders = allFolders.length;
      for (var folderIndex = 0; folderIndex < numFolders; folderIndex++)
      {
        var folder = allFolders.queryElementAt(folderIndex,Components.interfaces.nsIMsgFolder,null);
        let menuitem = document.createElement('menuitem');
        let folderName = folder.prettyName;
        var p = folder.parent;
        while (p && p.parent)
        {
          folderName = p.name+'/'+folderName;
          p = p.parent;
        }
        menuitem.setAttribute("id", folder.folderURL);
        menuitem.setAttribute("label", folder.server.prettyName + "/" + folderName);
        menuitem.oncommand = function () { ArchiveThisPrefs.onFolderPicked(event.target,pickerID); };
        menupopup.appendChild(menuitem);
      }
    }

  }

  menupopup.appendChild(document.createElement('menuseparator'));

  for (var i in folders)
  {
    var label = folders[i];
    if (this.ms) {
      label = this.ms.getString(folders[i].toLowerCase()+"FolderName");
    }
    var menuitem = document.createElement('menuitem');
    menuitem.setAttribute("class","folderMenuItem");
    menuitem.setAttribute("SpecialFolder",folders[i]);
    menuitem.setAttribute("id","special:"+folders[i]);
    menuitem.setAttribute("label", label);
    menuitem.oncommand = function () { ArchiveThisPrefs.onFolderPicked(event.target,pickerID); };
    menupopup.appendChild(menuitem);
  }
},

initKeyValues : function()
{
  var pf = navigator.platform.toLowerCase();
  if (pf.indexOf("win") != -1) { var os = "win"; }
  else if (pf.indexOf("mac") != -1) { var os = "mac"; }
  else { var os = "other" }

  this.keys = this.prefs.getCharPref("keys").split("|");

  var id;
  var menu;
  for (var i in this.keyNames)
  {
    // ----------
    id = this.modifierNames[i];
    menu = document.getElementById(id);

    switch (os)
    {
      case "mac":
        menu.appendItem(this.modifierLabel("control"),"control");
        // menu.appendItem(this.modifierLabel("alt"),"alt");
        menu.appendItem(this.modifierLabel("shift"),"shift");
        menu.appendItem(this.modifierLabel("meta"),"meta");
        menu.appendItem(this.modifierLabel("control alt"),"control alt");
        menu.appendItem(this.modifierLabel("control shift"),"control shift");
        // menu.appendItem(this.modifierLabel("alt shift"),"alt shift");
        menu.appendItem(this.modifierLabel("control alt shift"),"control alt shift");
        menu.appendItem(this.modifierLabel("control meta"),"control meta");
        menu.appendItem(this.modifierLabel("alt meta"),"alt meta");
        menu.appendItem(this.modifierLabel("control alt meta"),"control alt meta");
        menu.appendItem(this.modifierLabel("shift meta"),"shift meta");
        menu.appendItem(this.modifierLabel("control shift meta"),"control shift meta");
        menu.appendItem(this.modifierLabel("alt shift meta"),"alt shift meta");
        menu.appendItem(this.modifierLabel("control alt shift meta"),"control alt shift meta");
        menu.appendItem("-","");
        break;

      case "win":
        menu.appendItem(this.modifierLabel("control"),"control");
        menu.appendItem(this.modifierLabel("alt"),"alt");
        menu.appendItem(this.modifierLabel("shift"),"shift");
        // menu.appendItem(this.modifierLabel("meta"),"meta");
        menu.appendItem(this.modifierLabel("control alt"),"control alt");
        menu.appendItem(this.modifierLabel("control shift"),"control shift");
        menu.appendItem(this.modifierLabel("alt shift"),"alt shift");
        menu.appendItem(this.modifierLabel("control alt shift"),"control alt shift");
        // menu.appendItem(this.modifierLabel("control meta"),"control meta");
        // menu.appendItem(this.modifierLabel("alt meta"),"alt meta");
        // menu.appendItem(this.modifierLabel("control alt meta"),"control alt meta");
        // menu.appendItem(this.modifierLabel("shift meta"),"shift meta");
        // menu.appendItem(this.modifierLabel("control shift meta"),"control shift meta");
        // menu.appendItem(this.modifierLabel("alt shift meta"),"alt shift meta");
        // menu.appendItem(this.modifierLabel("control alt shift meta"),"control alt shift meta");
        menu.appendItem("-","");
        break;

      case "other":
        menu.appendItem(this.modifierLabel("control"),"control");
        menu.appendItem(this.modifierLabel("alt"),"alt");
        menu.appendItem(this.modifierLabel("shift"),"shift");
        menu.appendItem(this.modifierLabel("meta"),"meta");
        menu.appendItem(this.modifierLabel("control alt"),"control alt");
        menu.appendItem(this.modifierLabel("control shift"),"control shift");
        menu.appendItem(this.modifierLabel("alt shift"),"alt shift");
        menu.appendItem(this.modifierLabel("control alt shift"),"control alt shift");
        menu.appendItem(this.modifierLabel("control meta"),"control meta");
        menu.appendItem(this.modifierLabel("alt meta"),"alt meta");
        menu.appendItem(this.modifierLabel("control alt meta"),"control alt meta");
        menu.appendItem(this.modifierLabel("shift meta"),"shift meta");
        menu.appendItem(this.modifierLabel("control shift meta"),"control shift meta");
        menu.appendItem(this.modifierLabel("alt shift meta"),"alt shift meta");
        menu.appendItem(this.modifierLabel("control alt shift meta"),"control alt shift meta");
        menu.appendItem("-","");
        break;
    }

/*
//    menu.appendItem("Menu","access");
//    menu.appendItem("Default","accel");
*/
    var defaultKey;
    if (os == "mac") { defaultKey = 'control'; }
    else { defaultKey = 'alt'; }

    if (i > 9) { defaultKey = 'control alt'; }

    if (!(this.keys[i*2+1]) || (this.keys[i*2+1].length == 0))
    {
      this.keys[i*2] = defaultKey;
    }

    var items = menu.getElementsByTagName("*");
    for (var j = 0; j < items.length; j++)
    {
      if (items[j].value == this.keys[i*2])
      {
        menu.selectedItem = items[j];
      }
    }

    // ----------
    id = this.keyNames[i];
    menu = document.getElementById(id);

    menu.appendItem("0","0");
    menu.appendItem("1","1");
    menu.appendItem("2","2");
    menu.appendItem("3","3");
    menu.appendItem("4","4");
    menu.appendItem("5","5");
    menu.appendItem("6","6");
    menu.appendItem("7","7");
    menu.appendItem("8","8");
    menu.appendItem("9","9");
    menu.appendItem("A","A");
    menu.appendItem("B","B");
    menu.appendItem("C","C");
    menu.appendItem("D","D");
    menu.appendItem("E","E");
    menu.appendItem("F","F");
    menu.appendItem("G","G");
    menu.appendItem("H","H");
    menu.appendItem("I","I");
    menu.appendItem("J","J");
    menu.appendItem("K","K");
    menu.appendItem("L","L");
    menu.appendItem("M","M");
    menu.appendItem("N","N");
    menu.appendItem("O","O");
    menu.appendItem("P","P");
    menu.appendItem("Q","Q");
    menu.appendItem("R","R");
    menu.appendItem("S","S");
    menu.appendItem("T","T");
    menu.appendItem("U","U");
    menu.appendItem("V","V");
    menu.appendItem("W","W");
    menu.appendItem("X","X");
    menu.appendItem("Y","Y");
    menu.appendItem("Z","Z");

/* These don't seem to work.
    menu.appendItem("Numpad 0","VK_NUMPAD0");
    menu.appendItem("Numpad 1","VK_NUMPAD1");
    menu.appendItem("Numpad 2","VK_NUMPAD2");
    menu.appendItem("Numpad 3","VK_NUMPAD3");
    menu.appendItem("Numpad 4","VK_NUMPAD4");
    menu.appendItem("Numpad 5","VK_NUMPAD5");
    menu.appendItem("Numpad 6","VK_NUMPAD6");
    menu.appendItem("Numpad 7","VK_NUMPAD7");
    menu.appendItem("Numpad 8","VK_NUMPAD8");
    menu.appendItem("Numpad 9","VK_NUMPAD9");
    menu.appendItem("Numpad *","VK_MULTIPLY");
    menu.appendItem("Numpad +","VK_ADD");
    //menu.appendItem("Numpad Seperator","VK_SEPARATOR");
    menu.appendItem("Numpad -","VK_SUBTRACT");
    menu.appendItem("Numpad .","VK_DECIMAL");
    menu.appendItem("Numpad /","VK_DIVIDE");
*/

    menu.appendItem("F1","VK_F1");
    menu.appendItem("F2","VK_F2");
    menu.appendItem("F3","VK_F3");
    menu.appendItem("F4","VK_F4");
    menu.appendItem("F5","VK_F5");
    menu.appendItem("F6","VK_F6");
    menu.appendItem("F7","VK_F7");
    menu.appendItem("F8","VK_F8");
    menu.appendItem("F9","VK_F9");
    menu.appendItem("F10","VK_F10");
    menu.appendItem("F11","VK_F11");
    menu.appendItem("F12","VK_F12");
    menu.appendItem("F13","VK_F13");
    menu.appendItem("F14","VK_F14");
    menu.appendItem("F15","VK_F15");
    menu.appendItem("F16","VK_F16");
    menu.appendItem("F17","VK_F17");
    menu.appendItem("F18","VK_F18");
    menu.appendItem("F19","VK_F19");
    menu.appendItem("F20","VK_F20");
    menu.appendItem("F21","VK_F21");
    menu.appendItem("F22","VK_F22");
    menu.appendItem("F23","VK_F23");
    menu.appendItem("F24","VK_F24");

    menu.appendItem(";",";");
    menu.appendItem("=","=");
    menu.appendItem(",",",");
    menu.appendItem(".",".");
    menu.appendItem("/","/");
    menu.appendItem("`","`");
    menu.appendItem("[","[");
    menu.appendItem("\\","\\");
    menu.appendItem("]","]");
    menu.appendItem('"','"');

    menu.appendItem("Space"," ");
    menu.appendItem("Tab","VK_TAB");
    menu.appendItem("Return","VK_RETURN");
    menu.appendItem("Enter","VK_ENTER");
    menu.appendItem("Escape","VK_ESCAPE");
    menu.appendItem("Pg Up","VK_PAGE_UP");
    menu.appendItem("Pg Down","VK_PAGE_DOWN");
    menu.appendItem("End","VK_END");
    menu.appendItem("Home","VK_HOME");
    menu.appendItem("Left","VK_LEFT");
    menu.appendItem("Up","VK_UP");
    menu.appendItem("Right","VK_RIGHT");
    menu.appendItem("Down","VK_DOWN");
    menu.appendItem("Pause","VK_PAUSE");
    menu.appendItem("PrScr","VK_PRINTSCREEN");
    menu.appendItem("Insert","VK_INSERT");
    menu.appendItem("Delete","VK_DELETE");

    menu.appendItem("Help","VK_HELP");
    menu.appendItem("Cancel","VK_CANCEL");
    menu.appendItem("Back","VK_BACK");
    menu.appendItem("Clear","VK_CLEAR");

    menu.appendItem("Shift","VK_SHIFT");
    menu.appendItem("Control","VK_CONTROL");
    menu.appendItem("Alt","VK_ALT");

    menu.appendItem("Numlock","VK_NUM_LOCK");
    menu.appendItem("ScrLock","VK_SCROLL_LOCK");
    menu.appendItem("CapLock","VK_CAPS_LOCK");

    if (i < 10)
    {
      defaultKey = i;
    }
    else
    {
      defaultKey = this.defaultKeys[id];
    }

    if (!(this.keys[i*2+1]) || (this.keys[i*2+1].length == 0))
    {
      this.keys[(i*2)+1] = defaultKey;
    }

    items = menu.getElementsByTagName("*");
    for (var j = 0; j < items.length; j++)
    {
      if (items[j].value == this.keys[(i*2)+1])
      {
        menu.selectedItem = items[j];
      }
    }
  }

  this.setPresetLabels();
  this.validateKeyBindings();
},

modifierLabel : function(modifier)
{
  var label = modifier.split(/[\s,]+/g).join(this.keySymbols["sep"]);
  for (var i in this.keySymbols)
  {
    label = label.replace(i,this.keySymbols[i]);
  }
  return label;
},

onLoad : function()
{
  //////////////////////////////////////////////////////////////////////
  // Get the UI language
  this.language = Components.classes["@mozilla.org/chrome/chrome-registry;1"]
                  .getService(Components.interfaces.nsIXULChromeRegistry)
                  .getSelectedLocale("global");

  ArchiveThisKeyUtils.init();


  //////////////////////////////////////////////////////////////////////
  // Bind accept button
  let dialog = document.getElementById("archive-this-prefs");
  dialog.addEventListener("dialogaccept", ArchiveThisPrefs.onAccept.bind(this));

  //////////////////////////////////////////////////////////////////////
  // Collect plugin information
  var MY_ID = "archive-this@roach.at";
  try
  {
    var em = Components.classes["@mozilla.org/extensions/manager;1"].
           getService(Components.interfaces.nsIExtensionManager);
    this.extensions = em.getItemList(Components.interfaces.nsIUpdateItem.TYPE_ANY, { });
    this.at_version = em.getItemForID(MY_ID).version;
    this.at_addon = em.getItemForID(MY_ID);
  }
  catch (err)
  {
    var { AddonManager } = ChromeUtils.import("resource://gre/modules/AddonManager.jsm");
    AddonManager.getAddonByID(MY_ID,function(addon) {
      ArchiveThisPrefs.at_addon = addon;

      ArchiveThisPrefs.at_version = addon.version;

      if (ArchiveThisPrefs.debug)
      {
        ArchiveThisPrefs.console.logStringMessage(
          "Archive This: version "+ArchiveThisPrefs.at_version +
          ", URI: "+ArchiveThisPrefs.at_addon.getResourceURI("").spec);
      }
    });
    AddonManager.getAllAddons(function(aAddons) {
      ArchiveThisPrefs.extensions = aAddons;
    });
  }


  //////////////////////////////////////////////////////////////////////
  // Read the preferences

  this.prefs = Services.prefs.getBranch("archive-this.");
//  this.prefs.QueryInterface(Components.interfaces.nsIPrefBranch);
  this.prefs.addObserver("", this, false);

  this.debug = this.prefs.getBoolPref("debug");
  document.getElementById("archive-this-debug").checked = this.debug;

  this.preset = this.prefs.getCharPref("presets").split("|",9);

  //////////////////////////////////////////////////////////////////////
  // Extract the correct labels for the various modifiers
  var platformKeys = document.getElementById("platformKeys");
  this.keySymbols["shift"] = platformKeys.getString("VK_SHIFT");
  this.keySymbols["meta"] = platformKeys.getString("VK_META");
  this.keySymbols["alt"] = platformKeys.getString("VK_ALT");
  this.keySymbols["control"] = platformKeys.getString("VK_CONTROL");
  this.keySymbols["sep"] = platformKeys.getString("MODIFIER_SEPARATOR");
  switch (Services.prefs.getIntPref("ui.key.accelKey"))
  {
    case 17: this.accel = "control"; break;
    case 18: this.accel = "alt"; break;
    case 224: this.accel = "meta"; break;
    default: this.accel = (window.navigator.platform.search("Mac") == 0 ? "meta":"control");
  }
  this.keySymbols["accel"] = this.keySymbols[this.accel];

  if (this.debug)
  {
    this.console.logStringMessage("Archive This: Opening prefs with language = " + this.language);

    this.console.logStringMessage("Archive This: Keysymbols: shift = "
      + this.keySymbols["shift"]
      + "; meta = " + this.keySymbols["meta"]
      + "; alt = " + this.keySymbols["alt"]
      + "; control = " + this.keySymbols["control"]
      + "; accel = " + this.keySymbols["accel"]
      + "; sep = " + this.keySymbols["sep"]);
  }
  //////////////////////////////////////////////////////////////////////


  this.initKeyValues();

  for (i = 0; i < 9; i++)
  {
    this.initPicker("archive-this-folder-"+(i+1));
    this.setPickerElement("archive-this-folder-"+(i+1),this.preset[i]);
  }

  var filters = this.prefs.getCharPref("filters").split("||");
  var list = document.getElementById('archive-this-filter-list');

  for (var i=0; i < filters.length; i++)
  {
    if (filters[i].length > 0)
    {
      var rule = list.appendItem(filters[i],filters[i]);
      this.decorateRule(rule);
    }
  }

  let firstItem = list.getItemAtIndex(0);
  list.selectItem(firstItem);
  list.ensureElementIsVisible(firstItem);

  var languages = document.getElementById('archive-this-translate-language');
  if (languages)
  {
    var baseLanguage = this.language.split('-');
    var found = false;
    if (this.debug)
     {
       this.console.logStringMessage("Archive This: Finding entry for language: "
         + baseLanguage[0] + " / " + this.language);
     }

    for (var i = 0; i < languages.itemCount; i++)
    {
      var item = languages.getItemAtIndex(i);
      if (item.value == this.language || item.value == baseLanguage[0])
      {
        languages.selectedIndex = i;
        found = true;
      }
    }
    if (!found)
    {
        languages.selectedIndex = 0; // languages.itemCount - 1;
    }
  }
  else
  {
    if (this.debug)
     {
       this.console.logStringMessage("Archive This: Translation submission disabled in this version");
     }
  }
},

onAccept : function()
{
  if (this.debug)
  {
    this.console.logStringMessage("Archive This: Saving prefs");
  }
  this.prefs.setCharPref("presets",this.preset.join('|'));
  this.prefs.setCharPref("keys",this.keys.join('|'));
  this.prefs.setBoolPref("debug",this.debug);

  var list = document.getElementById('archive-this-filter-list');
  var filters = new Array();
  for (var i=0; i<list.getRowCount(); i++)
  {
    filters.push(list.getItemAtIndex(i).value);
  }

  this.prefs.setCharPref("filters",filters.join('||'));
},

shutdown: function()
{
  this.prefs.removeObserver("", this);
},

observe: function(subject, topic, data)
{
  if (this.debug)
  {
    this.console.logStringMessage("Archive This: Pref observe: " + topic);
  }
  if (topic != "nsPref:changed")
  {
    return;
  }

  switch(data)
  {
    case "presets":
      this.preset = this.prefs.getCharPref("presets").split("|",9);
      break;
    case "filters":
      break;
    case "keys":
      this.keys = this.prefs.getCharPref("keys").split("|");
      break;
    case "debug":
      this.debug = this.prefs.getBoolPref("debug");
  }
},

onFolderPicked : function (selection,pickerID)
{
  var selectedUri = null;
  if (selection)
  {
    selectedUri = selection.getAttribute('id');

    // For some reason, the folder picker returns multiple
    // events when you use "select this folder"
    if (selectedUri.length == 0) { return; }
  }

  var ordinal = pickerID.substr(-1,1) - 1;
  this.preset[ordinal] = selectedUri;
  this.setPickerElement(pickerID,selectedUri);
},

validateKeyBindings : function ()
{
  for (var i in this.keyNames)
  {
    var modifier = document.getElementById(this.modifierNames[i]);
    var key = document.getElementById(this.keyNames[i]);
    var info = document.getElementById(this.keyNames[i]+"-info");

    var conflict = ArchiveThisKeyUtils.findBinding(modifier.value, key.value);

    while (info.hasChildNodes()) { info.removeChild(info.firstChild); }

    if (conflict)
    {
      // Put up a notice for the user.
      if (this.s == null) { this.s = document.getElementById("archive-this-string-bundle"); }
      info.setAttribute("align","center");
      info.setAttribute("pack","begin");
      var image = document.createElement("image");
      image.setAttribute("width","16");
      image.setAttribute("height","16");
      image.setAttribute("style","margin:0;padding:0");
      info.appendChild(image);
      var label = document.createElement("label");
      if (this.overrideKeys)
      {
        image.setAttribute("src","info.png");
        label.setAttribute('value',
          this.s.getFormattedString("overrideString", [conflict]));
        modifier.removeAttribute("style");
        key.removeAttribute("style");
      }
      else
      {
        image.setAttribute("class","alert-icon");
        label.setAttribute('value',
          this.s.getFormattedString("conflictString", [conflict]));

        label.setAttribute('style', "color:red");

        modifier.setAttribute('style','color:red');
        key.setAttribute('style','color:red');
      }
      info.appendChild(label);
    }
    else
    {
      modifier.removeAttribute("tooltiptext");
      key.removeAttribute("tooltiptext");
      modifier.removeAttribute("style");
      key.removeAttribute("style");
    }
  }
},

setPresetLabels : function()
{
  var label;
  var modifier;
  var key;
  var folder;

  for (var i = 1; i <= 9; i++)
  {
    label = document.getElementById("archive-this-preset-label-"+i);
    modifier = document.getElementById("archive-this-preset-modifier-"+i);
    key = document.getElementById("archive-this-preset-key-"+i);
    folder = document.getElementById("archive-this-folder-"+i);

    if (modifier.value == "")
    {
      label.setAttribute('value',i+": " +key.label);
    }
    else
    {
      label.setAttribute('value',i+": "+modifier.label + this.keySymbols["sep"] + key.label);
    }

    var conflict = ArchiveThisKeyUtils.findBinding(modifier.value, key.value);
    if (conflict && !this.overrideKeys)
    {
      folder.setAttribute('disabled','true');
    }
    else
    {
      folder.setAttribute('disabled','false');
    }
  }
},

setDebugValue : function()
{
  this.debug = document.getElementById("archive-this-debug").checked;
},

setOverrideKeysValue : function()
{
  this.overrideKeys = document.getElementById("archive-this-override-keys").checked;
  if (this.debug)
  {
    this.console.logStringMessage("Archive This: key override " +
      (this.overrideKeys?'on':'off'));
  }
  this.setPresetLabels();
  this.validateKeyBindings();
},

onKeyChange : function(selection, index)
{
  this.keys[index] = selection.value;
  this.setPresetLabels();
  this.validateKeyBindings();
  window.sizeToContent();
},

openNewFilter : function()
{
  window.openDialog('chrome://archive-this/content/filter.xul','filter',
                    'chrome,modal', 'To or Cc',1,'','',
                     ArchiveThisPrefs['addRule']);
},

decorateRule : function (rule)
{
  if (this.s == null) { this.s = document.getElementById("archive-this-string-bundle"); }

  var list = document.getElementById('archive-this-filter-list');
  list.ensureElementIsVisible(rule);
  try
  {
    var val = rule.value.split('|',4);
  }
  catch (err)
  {
    this.console.logStringMessage("Archive This: " + err);
    return;
  }

  var msgfolder = MailUtils.getExistingFolder(val[3], true);
  var folderName;
  if (msgfolder)
  {
    folderName = msgfolder.name;
    var p = msgfolder.parent;
    while (p && p.parent)
    {
      folderName = p.name+'/'+folderName;
      p = p.parent;
    }

    if (msgfolder.server.prettyName)
    {
      //folderName = '"' + folderName + '" on ' + msgfolder.server.prettyName;
      folderName = this.s.getFormattedString("prettyNameString",
                     [folderName, msgfolder.server.prettyName]);
    }
  }
  else
  {
    folderName = this.s.getString("invalidFolderString");
    rule.setAttribute('style','color:red');
  }

//  var tooltip = "If " + val[0] + " " + this.compText[val[1]] + ' "' +
//                val[2] + '", move to folder ' + folderName;

  var tooltip = this.s.getFormattedString ("ruleString"+val[1],
                  [val[0], val[2], folderName]);

  rule.firstChild.setAttribute('value', val[0] + ": " + val[2]);
  rule.setAttribute("tooltiptext", tooltip);
  if (false && this.debug)
  {
    this.console.logStringMessage("Archive This: Decorated rule = " +
      new XMLSerializer().serializeToString(rule));
  }
  rule.ondblclick=this.openEditFilter;
},

addRule : function (headerName,comparitor,headerValue,folder)
{
  var list = document.getElementById('archive-this-filter-list');
  var rule = list.appendItem(headerValue,
                  headerName + "|" + comparitor + "|" + headerValue + "|" + folder);

  ArchiveThisPrefs.decorateRule(rule);
},

openEditFilter : function()
{
  var rule = document.getElementById('archive-this-filter-list').selectedItem;
  if (!rule) {return; }
  var val = rule.value.split('|',4);
  window.openDialog('chrome://archive-this/content/filter.xul','filter','chrome,modal',
                    val[0],val[1],val[2],val[3],ArchiveThisPrefs['changeCurrentRule']);
},

changeCurrentRule : function (headerName,comparitor,headerValue,folder)
{
  // Modify current entry in list box
  var rule = document.getElementById('archive-this-filter-list').selectedItem;
  if (!rule) {return; }
  rule.setAttribute('value', headerName + "|" + comparitor + "|" +
                             headerValue + "|" + folder) ;
  ArchiveThisPrefs.decorateRule(rule);
},

deleteCurrentRule : function ()
{
  // Should we ask for confirmation?
  var list = document.getElementById('archive-this-filter-list');
  var victimIndex = list.currentIndex;
  var selecteeIndex;

  if (victimIndex == (list.getRowCount() - 1))
  {
    selecteeIndex = victimIndex - 1;
  }
  else
  {
    selecteeIndex = victimIndex + 1;
  }

  var selectee = null;
  if (selecteeIndex > 0)
  {
    selectee = list.getItemAtIndex(selecteeIndex);
  }

  list.getItemAtIndex(victimIndex).remove();

  if (selectee)
  {
    list.selectItem(selectee);
  }
},

copyCurrentRule : function ()
{
  var list = document.getElementById('archive-this-filter-list');
  var rule = list.getItemAtIndex(list.currentIndex);

  let clone = document.createElement("richlistitem");
  clone.value = rule.value;
  let newLabel = document.createElement("label");
  newLabel.value = rule.label;
  clone.appendChild(newLabel);

  if (list.currentIndex < list.getRowCount() - 1)
  {
    clone = list.insertBefore(clone, rule);
  }
  else
  {
    clone = list.appendChild(clone);
  }

  this.decorateRule(clone);
  list.selectItem(clone);
  this.openEditFilter();
},

moveRuleUp : function ()
{
  this.moveRule(-1);
},

moveRuleDown : function ()
{
  this.moveRule(1);
},

moveRule : function(distance)
{
  var list = document.getElementById('archive-this-filter-list');
  var curItem = list.getItemAtIndex(list.currentIndex);
  var swapItem = list.getItemAtIndex(list.currentIndex + distance);

  var tempLabel = swapItem.label;
  var tempValue = swapItem.value;
  var tempTooltipText = swapItem.tooltipText;

  swapItem.firstChild.setAttribute('value', curItem.label);
  swapItem.value = curItem.value;
  swapItem.tooltipText = curItem.tooltipText;

  curItem.firstChild.setAttribute('value', tempLabel);
  curItem.value = tempValue;
  curItem.tooltipText = tempTooltipText;

  list.selectItem(swapItem);
},

selectionChanged : function ()
{
  // Change active state of buttons to reflect selection
  var list = document.getElementById('archive-this-filter-list');
  var edit = document.getElementById('archive-this-edit-button');
  var copy = document.getElementById('archive-this-copy-button');
  var remove = document.getElementById('archive-this-remove-button');
  var up = document.getElementById('archive-this-up-button');
  var down = document.getElementById('archive-this-down-button');

  if (list.currentIndex < 0)
  {
    edit.disabled=true;
    copy.disabled=true;
    remove.disabled=true;
    up.disabled=true;
    down.disabled=true;
    return;
  }

  edit.disabled=false;
  remove.disabled=false;
  copy.disabled=false;
  up.disabled = (list.currentIndex == 0);
  down.disabled = (list.currentIndex == (list.getRowCount() - 1));
},

submitTranslation : function ()
{
  var versionChecker = Components.classes["@mozilla.org/xpcom/version-comparator;1"]
                       .getService(Components.interfaces.nsIVersionComparator);

  if (this.s == null) { this.s = document.getElementById("archive-this-string-bundle"); }
  var files = [ 'archive-this.properties', 'common.dtd',
                'context.dtd', 'filter.dtd', 'move-copy.dtd', 'prefs.dtd' ];

  var languages = document.getElementById('archive-this-translate-language');
  var language = languages.selectedItem.value;

  var l = language;
  if (l == 'en-US') { l = 'xx'; }

  var body = this.s.getString("translateInstructionsString") +"\n\n";
  var subject = "New 'Archive This' localization: " + l;

  for (var i in files)
  {
    var URI = this.at_addon.getResourceURI("chrome/locale/"+language+"/"+files[i]);

    if (this.debug)
    {
      this.console.logStringMessage("Archive This: Reading " + URI.spec);
    }

    var data = "";

    var ioService=Components.classes["@mozilla.org/network/io-service;1"]
        .getService(Components.interfaces.nsIIOService);
    var channel = ioService.newChannelFromURI(URI);
    var istream = channel.open();

    var cstream =
      Components.classes["@mozilla.org/intl/converter-input-stream;1"].
      createInstance(Components.interfaces.nsIConverterInputStream);
    cstream.init(istream, "UTF-8", 0, 0);

    var str = {};
    cstream.readString(-1, str);
    data = str.value;
    cstream.close(); // this closes fstream

    body = body + "\n\n+++ chrome/locale/" + l + "/" + files[i] + "\n\n"
                + data;

   }

   // Tb 2.0 did HTML bodies
  var appInfo = Components.classes["@mozilla.org/xre/app-info;1"]
                          .getService(Components.interfaces.nsIXULAppInfo);
  if(versionChecker.compare(appInfo.version, "3.0b3") < 0)
  {
    body = body.replace(/</g,'&lt;');
  }

   var sURL="mailto:Archive%20This%20Support%20<tb-archive-this@nostrum.com>?subject="
       + encodeURIComponent(subject)
       + "&body=" + encodeURIComponent(body);

   var msgComposeService=
     Components.classes["@mozilla.org/messengercompose;1"]
     .getService(Components.interfaces.nsIMsgComposeService);

   // make the URI
   var ioService =
     Components.classes["@mozilla.org/network/io-service;1"]
       .getService(Components.interfaces.nsIIOService);

   var aURI = ioService.newURI(sURL, null, null);

   // open new message
   msgComposeService.OpenComposeWindowWithURI (null, aURI);
},

fileBugReport : function ()
{
  var versionChecker = Components.classes["@mozilla.org/xpcom/version-comparator;1"]
                       .getService(Components.interfaces.nsIVersionComparator);
   if (this.s == null) { this.s = document.getElementById("archive-this-string-bundle"); }
   if (!ArchiveThisKeyUtils.functionName) { ArchiveThisKeyUtils.findBoundKeys(); }


   var subject = '"Archive This" Bug Report';

   var appInfo = Components.classes["@mozilla.org/xre/app-info;1"]
                             .getService(Components.interfaces.nsIXULAppInfo);

   var extensions = this.extensions;

   var extNames = [];

   var extPrefs = Services.prefs.getBranch("extensions.");

   var enabledIds = [];

   try
   {
     enabledIds = extPrefs.getCharPref("enabledItems").split(',');
   }
   catch (err)
   {
     enabledIds = [];
   }

   var i;
   var enabledHash = {};

   for (i in enabledIds)
   {
     var idVersion = (enabledIds[i].split(':'));
     var id = idVersion[0];
     enabledHash[id] = true;
   }

   for (i in extensions)
   {
     var ext;
     if(versionChecker.compare(appInfo.version, "5.0") < 0)
     {
       ext = extensions[i].QueryInterface(Components.interfaces.nsIUpdateItem);
     }
     else
     {
       ext = extensions[i];
     }
     if (enabledIds.length > 0)
     {
       extNames.push(ext.name + " " + ext.version +
                     (enabledHash[ext.id]?" (enabled)":" (disabled)"));
     }
     else
     {
       extNames.push(ext.name + " " + ext.version);
     }
   }

   var body = this.s.getString("bugInstructionsString") +"\n\n\n\n\n\n"+
              "----------------------------------------------------------------------\n" +
              this.s.getString("bugConfigurationString") +"\n\n"+
              "\n\n" +
              "keys:     " + this.prefs.getCharPref("keys") + "\n\n" +
              "presets:  " + this.prefs.getCharPref("presets") + "\n\n" +
              "filters:  " + this.prefs.getCharPref("filters") + "\n\n"+
              "----------------------------------------------------------------------\n" +
              this.s.getString("bugEnvironmentString") +"\n\n"+
              "appinfo:  " +
                //appInfo.vendor + " " +
                appInfo.name + " " +
                //appInfo.ID + " " +
                appInfo.version + " " +
                "(build " + appInfo.appBuildID + ") " +
                "/ Gecko " +appInfo.platformVersion + "\n" +
              "platform: " + navigator.oscpu + "\n" +
              "language: " + this.language + "\n" +
              "add-on:   " + "Archive This " + this.at_version + "\n" +
              "extensions:" + extNames.join(", ") + "\n\nKeybindings:\n\n";

   for (var i in ArchiveThisKeyUtils.functionName)
   {
     body = body + "  " + i + ": " + ArchiveThisKeyUtils.functionName[i] + "\n";
   }

   var sURL="mailto:Archive%20This%20Support%20<tb-archive-this@nostrum.com>?subject=" +
            encodeURIComponent(subject) + "&body=" + encodeURIComponent(body);

   var msgComposeService=
     Components.classes["@mozilla.org/messengercompose;1"]
     .getService(Components.interfaces.nsIMsgComposeService);

   // make the URI
   var ioService =
     Components.classes["@mozilla.org/network/io-service;1"]
       .getService(Components.interfaces.nsIIOService);

   var aURI = ioService.newURI(sURL, null, null);

   // open new message
   msgComposeService.OpenComposeWindowWithURI (null, aURI);
}

}
