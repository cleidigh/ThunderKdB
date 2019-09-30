/*
 ***** BEGIN LICENSE BLOCK *****
 * This file is part of ExQuilla by Mesquilla.
 *
 * Copyright 2012 R. Kent James
 *
 * All Rights Reserved
 *
 * ***** END LICENSE BLOCK *****
 */

if (typeof(exquilla) == 'undefined')
  var exquilla = {};

exquilla.ammOverlay = (function _ammOverlay()
{
  let pub = {};

  function checkHideOrganization(account)
  {
    let type = account.incomingServer.type;
    // hide the Organization row
    if (type == "exquilla")
      document.getElementById("identity.organization").parentElement.hidden = true;
    else
      document.getElementById("identity.organization").parentElement.hidden = false;
  }

  function onLoad()
  {
    exquilla.ammOnPreInit = onPreInit;
    onPreInit = function _onPreInit(account, accountValues)
    {
      exquilla.ammOnPreInit(account, accountValues);
      checkHideOrganization(account);
      loadSMTPServerList();
    }
    checkHideOrganization(parent.getCurrentAccount());
  }

  // publically available symbols
  pub.onLoad = onLoad;

  return pub;
})();

window.addEventListener("load", function() { exquilla.ammOverlay.onLoad();}, false);
