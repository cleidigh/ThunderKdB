/*
 ***** BEGIN LICENSE BLOCK *****
 * This file is part of ExQuilla by Mesquilla.
 *
 * Copyright 2020 Beonex
 *
 * All Rights Reserved
 *
 * ***** END LICENSE BLOCK *****
 */

if (typeof(exquilla) == 'undefined')
  var exquilla = {};

exquilla.cloneSetupButton = function _cloneSetupButton() {
  let setupEmail = document.getElementById("setupEmail");
  if (!setupEmail) { // COMPAT for TB68
    return;
  }
  let setupExquilla = setupEmail.cloneNode(false);
  setupExquilla.id = "setupExquilla";
  setupExquilla.textContent = "ExQuilla";
  setupExquilla.removeAttribute("data-l10n-id");
  setupExquilla.setAttribute("onclick", "ChromeUtils.import('resource://exquilla/ewsUtils.jsm').Utils.openAccountWizard();");
  setupEmail.parentElement.appendChild(setupExquilla);
}

window.addEventListener("DOMContentLoaded", function(e) { exquilla.cloneSetupButton(e); }, false);
