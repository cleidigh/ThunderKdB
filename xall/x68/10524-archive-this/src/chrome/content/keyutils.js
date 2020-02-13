"use strict";

Components.utils.import("resource://gre/modules/Services.jsm");

var ArchiveThisKeyUtils = {

messengerWindow : null,
functionName: null,
keyElement: null,
accel: "control",
console: Components.classes["@mozilla.org/consoleservice;1"].
           getService(Components.interfaces.nsIConsoleService),

init : function()
{
  //////////////////////////////////////////////////////////////////////
  // Find the messenger window
  var winEnum = Components
         .classes["@mozilla.org/appshell/window-mediator;1"]
         .getService(Components.interfaces.nsIWindowMediator)
         .getXULWindowEnumerator(null);
  while(winEnum.hasMoreElements())
     try {
       this.messengerWindow = winEnum.getNext()
               .QueryInterface(Components.interfaces.nsIXULWindow).docShell
               .QueryInterface(Components.interfaces.nsIInterfaceRequestor)
               .getInterface(Components.interfaces.nsIDOMWindow);
       //here do checks... I check for mase XUL file name
       if(this.messengerWindow.location == 'chrome://messenger/content/messenger.xul') {
         break;
       }
     } catch(e){ alert(e); } 

  //////////////////////////////////////////////////////////////////////
  // Figure out our accel key
  var accelKey = 0;
  try {
    accelKey = Services.prefs.getIntPref("ui.key.accelKey");
  } catch (e) {
    this.console.logStringMessage(e.message);
  }
  switch(accelKey)
  {
    case 17: this.accel = "control"; break;
    case 18: this.accel = "alt"; break;
    case 224: this.accel = "meta"; break;
    default: this.accel = (window.navigator.platform.search("Mac") == 0 ? "meta"
:"control");
  }
},

findBoundKeys : function()
{
  this.functionName = new Array();
  this.keyElement = new Array();
  var keys = this.messengerWindow.document.getElementsByTagName("key");
  for (var j in keys)
  {
    try
    {
      if (keys[j].id.indexOf("archive-this") != 0)
      {

        var key = keys[j].hasAttribute("key")?keys[j].getAttribute("key"):
                  keys[j].hasAttribute("keycode")?
                    keys[j].getAttribute("keycode"):null;

        var keyname = this.normalize(keys[j].getAttribute("modifiers"),key);

        var keyFunction = this.getNameForKey(keys[j]);

        this.functionName[keyname] = keyFunction;
        this.keyElement[keyname] = keys[j];
      }

    } catch (err) {}
  }
},

/* Borrowed largely from keyconfig add-on */
getNameForKey : function(aKey)
{
 var val;

 if(aKey.hasAttribute("label")) return aKey.getAttribute("label");

 if(aKey.hasAttribute("command") || aKey.hasAttribute("observes")) {
  var command = aKey.getAttribute("command") || aKey.getAttribute("observes");
  var node = this.messengerWindow.document.getElementById(command);
  if(node && node.hasAttribute("label")) return node.getAttribute("label");
  val = this.getLabel("command", command);
  if(!val) val = this.getLabel("observes", command);
 }

 if(!val) val = this.getLabel("key", aKey.id);

 if(val) return val;

 var id = aKey.id.replace(/xxx_key.+?_/,"");
 var unicodeConverter = Components.classes['@mozilla.org/intl/scriptableunicodeconverter']
                        .createInstance(Components.interfaces.nsIScriptableUnicodeConverter);
 try {id = unicodeConverter.ConvertToUnicode(id);} catch(err) { }
 return id;
},

/* Borrowed largely from keyconfig add-on */
getLabel : function(attr, value) 
{
 var Users = this.messengerWindow.document.getElementsByAttribute(attr,value);
 var User;

 for(var i = 0, l = Users.length; i < l; i++)
  if(Users[i].hasAttribute("label") && (!User || User.localName == "menuitem")) User = Users[i];

 if(!User) return null;

 if(User.localName == "menuitem" && User.parentNode.parentNode.parentNode.localName == "menupopup") {
   return User.parentNode.parentNode.getAttribute("label") + " > " + User.getAttribute("label");
 } else return User.getAttribute("label");
},

normalize : function(modifiers, key)
{
  var name = modifiers.replace("accel",this.accel)
                      .replace(/^ */,'')
                      .replace(/ *$/,'')
                      .replace(/^.*any/,'')
                      .split(/[ ,]+/).sort();
  name.push(key.toLowerCase());
  return name.join('-').replace(/^-/,''); 
},

findBinding : function(modifiers, key)
{
  if (!this.functionName) { this.findBoundKeys(); }

  var keyname = this.normalize(modifiers, key);

  if (this.functionName[keyname]) 
  { 
    return this.functionName[keyname]; 
  }

  return null;
},


disableKey : function(modifiers, key)
{
  if (!this.keyElement) { this.findBoundKeys(); }

  var keyname = this.normalize(modifiers, key);
  var keyNode = this.keyElement[keyname];
  if (!keyNode)
  {
    return;
  }

  this.console.logStringMessage("Archive This: Overriding "
      + keyname + " (" + this.functionName[keyname] + ")");

  var win = this.messengerWindow.document.
                    getElementById("messengerWindow");
  var disabled = this.messengerWindow.document.
                    getElementById("archive-this-disabled-keys");
  var oldParent = keyNode.parentNode;
  var oldGrandparent = keyNode.parentNode.parentNode;

  if (!oldGrandparent)
  {
    oldGrandparent = this.messengerWindow.document;
  }

  /* REMOVE KEY HERE: 
         (1) Move from parent to disabled keys
         (2) Mark key as "disabled"
         (3) Detatch and reattach parent */

  oldGrandparent.removeChild(oldParent);
  oldParent.removeChild(keyNode);
  keyNode.disabled=true;
  disabled.appendChild(keyNode.cloneNode(true));
  oldGrandparent.appendChild(oldParent.cloneNode(true));
},

reEnableKeys : function()
{
  var win = this.messengerWindow.document.
                    getElementById("messengerWindow");
  var disabled = this.messengerWindow.document.
                    getElementById("archive-this-disabled-keys");
  var keys = disabled.childNodes;

  /* This interface changed in Thunderbird 53 or thereabouts */
  if ('forEach' in keys) {
    keys.forEach((key) => {
      key.disabled = false;
    });
  } else {
    for (var i in keys)
    {
      keys[i].disabled=false;
    }
  }

  // Detatch and re-attach to remove the cached values
  win.removeChild(disabled);
  win.appendChild(disabled.cloneNode(true));
}

}
