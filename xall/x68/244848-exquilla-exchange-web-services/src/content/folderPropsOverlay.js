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

if (typeof(exquilla) == 'undefined')
  var exquilla = {};

exquilla.fpOverlay = (function _fpOverlay()
{
  const Cc = Components.classes;
  const Ci = Components.interfaces;
  const Cu = Components.utils;
  const Cr = Components.results;
  Object.assign(exquilla, ChromeUtils.import("resource://exquilla/ewsUtils.jsm"));
  Object.assign(exquilla, ChromeUtils.import("resource:///modules/MailServices.jsm"));
  let pub = {};
  let log = exquilla.Utils.ewsLog;

  function onLoad()
  {
    log.debug("exquilla.fpOverlay.onLoad");
    // We'll hide non-imap controls plus a few extra
    hideShowControls("imap");
    let hideme = ["SharingTab",
                  "QuotaTab",
                 ];
    hideme.forEach(function(id) {
      document.getElementById(id).hidden = true;
    });

    // We also have to hide the character set override, which we are not using.
    //  But it has no id, so we have to kludge this, locating it by its sibling
    let overrideVbox = document.getElementById("folderCheckForNewMessages")
                               .nextElementSibling;
    overrideVbox.hidden = true;

    // We don't support sizeOnDisk, remove it and its label
    let sizeOnDisk = document.getElementById("sizeOnDisk");
    sizeOnDisk.hidden = true;
    sizeOnDisk.previousElementSibling.hidden = true;

    if (gMsgFolder.flags & Ci.nsMsgFolderFlags.Offline)
      document.getElementById("offline.selectForOfflineFolder").checked = true;
  }

  // publically available symbols
  pub.onLoad = onLoad;

  return pub;
})();

window.addEventListener("load", function()
  { if (window.arguments[0].serverType == "exquilla")
      exquilla.fpOverlay.onLoad();
  }, false);
