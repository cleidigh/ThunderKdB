/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

// I don't think this is needed any more.

var exquilla;
if (typeof(exquilla) == 'undefined')
  exquilla = {};

exquilla.mwoOverlay = (function _mwoOverlay()
{
  const Cc = Components.classes;
  const Ci = Components.interfaces;
  const Cu = Components.utils;
  const Cr = Components.results;

  let pub = {};
  if (typeof (exquilla.Utils) == "undefined")
    Object.assign(exquilla, ChromeUtils.import("resource://exquilla/ewsUtils.jsm"));

  // local shorthands
  let re = exquilla.Utils.re;
  let dl = exquilla.Utils.dl;
  let log = exquilla.Utils.ewsLog;

  function onLoad()
  {
    log.debug("mwoOverlay onLoad()");
  }

  // publically available symbols
  pub.onLoad = onLoad;

  return pub;
})();

window.addEventListener("load", function() { exquilla.mwoOverlay.onLoad();}, false);
