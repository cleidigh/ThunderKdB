/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

try {
  if (typeof Cc === "undefined") var Cc = Components.classes;
  if (typeof Ci === "undefined") var Ci = Components.interfaces;
  if (typeof Cr === "undefined") var Cr = Components.results;
} catch (e) {}

try {
  var aepfs=Cc["@mozilla.org/preferences-service;1"].getService(Ci.nsIPrefBranch);
  aepfs.setBoolPref("extensions.attachextract_cont.debug",aepfs.getBoolPref("extensions.attachextract_cont.debugonstart"));
  aepfs=null;
} catch (e) {}
