/*
  This Source Code Form is subject to the terms of the Mozilla Public
  License, v. 2.0. If a copy of the MPL was not distributed with this
  file, You can obtain one at http://mozilla.org/MPL/2.0/.
*/

"use strict";

// For holding the input fields on the page
var MailFolderKeyNavInput  = null;
var MailFolderKeyNavMenuItemInput  = null;

// Save the currently selected settings using storage.local.
function saveSettings() {
  messenger.storage.local.set({
      MailFolderKeyNav: MailFolderKeyNavInput.checked,
      MailFolderKeyNavMenuItem: MailFolderKeyNavMenuItemInput.checked
  });
}

// Update the options UI with the settings values retrieved from storage
function updateUI(settings) {
  MailFolderKeyNavInput.checked = settings.MailFolderKeyNav;
  MailFolderKeyNavMenuItemInput.checked = settings.MailFolderKeyNavMenuItem;
}

// When the saved settings change, update the values displayed in the options dialog
function updateUIOnSettingChange(changes, areaName) {
  if (areaName!="local") {
	  return;
  }
  if (changes.hasOwnProperty("MailFolderKeyNav")) {
    MailFolderKeyNavInput.checked = changes.MailFolderKeyNav.newValue;
  }
  if (changes.hasOwnProperty("MailFolderKeyNavMenuItem")) {
    MailFolderKeyNavMenuItemInput.checked = changes.MailFolderKeyNavMenuItem.newValue;
  }
}

async function setupListeners() {
  MailFolderKeyNavInput = document.querySelector("#MailFolderKeyNav");
  MailFolderKeyNavMenuItemInput = document.querySelector("#MailFolderKeyNavMenuItem");
  let settings = await messenger.storage.local.get();
  updateUI(settings);
  MailFolderKeyNavInput.addEventListener("change", saveSettings);
  MailFolderKeyNavMenuItemInput.addEventListener("change", saveSettings);
  messenger.storage.onChanged.addListener(updateUIOnSettingChange);
  document.addEventListener("unload", (event) => {
    messenger.storage.onChanged.removeListener(updateUIOnSettingChange);
  });
  MailFolderKeyNavInput.focus();
}

document.addEventListener("DOMContentLoaded", localisePage, {once: true});
document.addEventListener("DOMContentLoaded", setupListeners, {once: true});
