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
 
// This file defines components used as the Colonial-layer calendar
//  for ExQuilla.
 
const { classes: Cc, Constructor: CC, interfaces: Ci, utils: Cu, Exception: CE, results: Cr, } = Components;
var { XPCOMUtils } = ChromeUtils.import("resource://gre/modules/XPCOMUtils.jsm");
ChromeUtils.defineModuleGetter(this, "Utils",
  "resource://exquilla/ewsUtils.jsm");
ChromeUtils.defineModuleGetter(this, "Services",
  "resource://gre/modules/Services.jsm");
ChromeUtils.defineModuleGetter(this, "MailServices",
  "resource:///modules/MailServices.jsm");
var _log = null;
XPCOMUtils.defineLazyGetter(this, "log", () => {
  if (!_log) _log = Utils.configureLogging("calendar");
  return _log;
});

let global = this;
function Calendar()
{ 
  if (typeof (safeGetJS) == "undefined")
    Utils.importLocally(global);
  try {
  let { EwsCalendar } = ChromeUtils.import("resource://exquilla/ewsCalendar.jsm");
  this.__proto__ = EwsCalendar.prototype;
  EwsCalendar.call(this);
} catch(e) {Cu.reportError(e);}}

Calendar.prototype = {
  classID:          Components.ID("{A91EBE7F-DD10-428d-AE1D-988DD1F84492}"),
}

var components = [Calendar];
var NSGetFactory = XPCOMUtils.generateNSGetFactory(components);
var EXPORTED_SYMBOLS = ["NSGetFactory"];
