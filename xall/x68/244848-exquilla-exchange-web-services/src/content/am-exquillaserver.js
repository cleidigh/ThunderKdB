/*
 ***** BEGIN LICENSE BLOCK *****
 * This file is part of ExQuilla by Mesquilla.
 *
 * Copyright 2010 R. Kent James
 *
 * All Rights Reserved
 *
 * ***** END LICENSE BLOCK *****
 */

 /*
 * This file is derived from am-server.js
 */

var gServer;
var gEwsServer;
var gObserver;
const { classes: Cc, Constructor: CC, interfaces: Ci,
        utils: Cu, Exception: CE, results: Cr, } = Components;

if (typeof(exquilla) == 'undefined')
  var exquilla = {};

if (typeof (exquilla.Utils) == "undefined")
  Object.assign(exquilla, ChromeUtils.import("resource://exquilla/ewsUtils.jsm"));

var { XPCOMUtils } = ChromeUtils.import("resource://gre/modules/XPCOMUtils.jsm");
var _log = null;
XPCOMUtils.defineLazyGetter(this, "log", () => {
  if (!_log) _log = Utils.configureLogging("account");
  return _log;
});


function onSave()
{
  let logEws = document.getElementById("server.logEws")
                       .checked;
  gServer.setBoolValue("logEws", logEws);
  gEwsServer.setupSoapLogging(gEwsServer.nativeMailbox);
  let oldEwsURL = gEwsServer.ewsURL;
  gEwsServer.ewsURL = document.getElementById("server.ewsURL").value;
  if (gEwsServer.ewsURL != oldEwsURL)
  {
    // force update of mailbox info
    let realHostName = gServer.realHostName;
    gServer.onUserOrHostNameChanged(realHostName, realHostName, true);
    exquilla.Utils.manageNtlmUri(gEwsServer.ewsURL, true);
  }
  let oldDomain = gEwsServer.domain;
  gEwsServer.domain = document.getElementById("server.domain").value;
  if (gEwsServer.domain != oldDomain)
  {
    // force update of mailbox info
    log.config("New domain: " + document.getElementById("server.domain").value +
              " Old domain: " + oldDomain);
    let realHostName = gServer.realHostName;
    gServer.onUserOrHostNameChanged(realHostName, realHostName, true);
  }
}

function onInit(aPageId, aServerId)
{
  let { Services } = ChromeUtils.import("resource://gre/modules/Services.jsm");

  initServerType();

  onCheckItem("server.biffMinutes", ["server.doBiff"]);
  document.getElementById("server.logEws").checked = gServer.getBoolValue("logEws");
  document.getElementById("server.check_all_folders_for_new").checked = gServer.getBoolValue("check_all_folders_for_new");
  document.getElementById("server.ewsURL").value = gServer.getCharValue("ewsURL");
  document.getElementById("server.domain").value = gServer.getCharValue("domain");
  document.getElementById("server.useAB").value = gServer.getBoolValue("useAB");
  document.getElementById("server.useMail").value = gServer.getBoolValue("useMail");
  document.getElementById("server.useCalendar").value = gServer.getBoolValue("useCalendar");
  document.getElementById("server.useCalendar").hidden = Services.prefs.getBoolPref("extensions.exquilla.disableCalendar");
}

function onPreInit(account, accountValues)
{
  var type = parent.getAccountValue(account, accountValues, "server", "type", null, false);
  hideShowControls(type);

  gObserver= Components.classes["@mozilla.org/observer-service;1"].
             getService(Components.interfaces.nsIObserverService);
  gObserver.notifyObservers(null, "charsetmenu-selected", "other");

  gServer = account.incomingServer;
  gEwsServer = exquilla.Utils.safeGetJS(gServer);
}

function dumpStack(offset, max_depth) {
   if (!offset || offset<0) offset = 0;
   if (!max_depth) max_depth = 10;
   var frame = Components.stack;
   while(--max_depth && (frame=frame.caller)) {
     if (!offset)
       dump(frame+"\n");
     else
       --offset;
   }
}

function initServerType()
{
  var serverType = document.getElementById("server.type").getAttribute("value");
  var propertyName = "serverType-" + serverType;

  /*
  var messengerBundle = document.getElementById("bundle_messenger");
  try {
    var verboseName = messengerBundle.getString(propertyName);
  } catch (e) {dump(e);}
  */
  var verboseName = "EWS";

  setDivText("servertype.verbose", verboseName);

}

function setDivText(divname, value)
{
  var div = document.getElementById(divname);
  if (!div)
    return;
  div.setAttribute("value", value);
}

function onCheckItem(changeElementId, checkElementId)
{
  /**/
    var element = document.getElementById(changeElementId);
    var notify = document.getElementById(checkElementId);
    var checked = notify.checked;

    if(checked && !getAccountValueIsLocked(notify))
      element.removeAttribute("disabled");
    else
      element.setAttribute("disabled", "true");
}

/**
 * Called when someone changes the biff-minutes value.  We'll check whether it's
 * zero, and if so, disable the biff checkbox as well, otherwise enable the box
 *
 * @param aValue  the new value for the textbox
 */
function onBiffMinChange(aValue)
{
  document.getElementById("server.doBiff").checked = (aValue != 0);
}

// open the log file
function onOpenLog()
{
  gEwsServer.soapLogFile.launch();
}
