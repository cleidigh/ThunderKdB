/*
 ***** BEGIN LICENSE BLOCK *****
 * This file is part of ExQuilla by Mesquilla.
 *
 * Copyright 2013 R. Kent James
 *
 * All Rights Reserved
 *
 * ***** END LICENSE BLOCK *****
 */

if (typeof(exquilla) == 'undefined')
  var exquilla = {};

if (typeof(MailServices) == 'undefined')
  var { MailServices } = ChromeUtils.import("resource:///modules/MailServices.jsm");

if (typeof (exquilla.Utils) == "undefined")
  Object.assign(exquilla, ChromeUtils.import("resource://exquilla/ewsUtils.jsm"));

exquilla.amiOverlay = (function _amiOverlay()
{
  let pub = {};
  let log = exquilla.Utils.ewsLog;

  function addEWSServerList()
  { try {
    let smtpServerList = document.getElementById("identity.smtpServerKey");
    let servers = MailServices.accounts.allServers;
    let smtpPopup = document.getElementById("smtpPopup");

    for (let server of /* COMPAT for TB 68 */exquilla.Utils.toArray(servers, Components.interfaces.nsIMsgIncomingServer))
    {
      if (server.type == "exquilla")
        smtpServerList.appendItem(server.prettyName, server.key);
    }

    // This also happen too late to use normal initialization, so do it outself
    let identity = gIdentity;
    if (!identity)
    {
      try {identity = parent.getCurrentAccount().defaultIdentity;} catch(e) {}
    }
    let value = identity ? identity.smtpServerKey
                         : null;
    smtpServerList.selectedItem = value ? smtpPopup.getElementsByAttribute("value", value)[0]
                                        : smtpPopup.firstChild;
    
  } catch (e) {exquilla.Utils.re(e);}}
    
  function onLoad()
  {
    // Override loadSMTPServerList to add EWS servers
    exquilla.amiLoadSMTPServerList = loadSMTPServerList;
    loadSMTPServerList = function _loadSMTPServerList()
    {
      exquilla.amiLoadSMTPServerList();
      addEWSServerList();
    } 
    loadSMTPServerList();
  }

  // publically available symbols
  pub.onLoad = onLoad;

  return pub;
})();

window.addEventListener("load", function() { exquilla.amiOverlay.onLoad();}, false);
