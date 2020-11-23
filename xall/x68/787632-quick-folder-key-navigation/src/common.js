/*
  This Source Code Form is subject to the terms of the Mozilla Public
  License, v. 2.0. If a copy of the MPL was not distributed with this
  file, You can obtain one at http://mozilla.org/MPL/2.0/.
*/

"use strict";


// getSavedSettings: for fetching all the settings and initialising any that are
// missing with default values.
// If there are missing settings, save their default values.
async function getSavedSettings() {
  let settings = {};
  let save = false;
  for (let key of Object.keys(defaultSettings)) {
    let option = await messenger.storage.local.get(key);
    if (option.hasOwnProperty(key)) {
      settings[key] = option[key];
    } else {
      settings[key] = defaultSettings[key];
      save = true;
    }
  } // for
  if (save) {
    await messenger.storage.local.set(settings);
  }
  return(settings);
}


// Localise page
function localisePage() {
  for (let el of window.document.querySelectorAll("[data-l10n-id]")) {
    let id = el.getAttribute("data-l10n-id");
    el.textContent = messenger.i18n.getMessage(id);
  }
}
