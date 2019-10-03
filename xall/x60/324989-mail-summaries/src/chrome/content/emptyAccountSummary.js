/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const Cc = Components.classes;
const Ci = Components.interfaces;
const Cu = Components.utils;

Cu.import("resource:///modules/mailServices.js");

var global = window.top;

window.addEventListener("DOMContentLoaded", function() {
  let createAccount = document.getElementById("create_account");
  createAccount.addEventListener("click", () => {
    global.NewMailAccount(global);
  }, false);

  let showTroubleshooting = document.getElementById("show_troubleshooting");
  showTroubleshooting.addEventListener("click", () => {
    global.AboutSupportOverlay.openInNewTab();
  }, false);
}, false);
