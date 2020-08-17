/*
  This Source Code Form is subject to the terms of the Mozilla Public
  License, v. 2.0. If a copy of the MPL was not distributed with this
  file, You can obtain one at http://mozilla.org/MPL/2.0/.
*/

"use strict";

// Localise page
function localisePage() {
  for (let el of window.document.querySelectorAll("[data-l10n-id]")) {
    let id = el.getAttribute("data-l10n-id");
    el.textContent = browser.i18n.getMessage(id);
  }
}

function setupListeners() {
  let OKButton = document.querySelector("#whatsnew_button");
  OKButton.addEventListener("click", (event) => {
  	window.close();
  });
}

document.addEventListener("DOMContentLoaded", localisePage, {once: true});
document.addEventListener("DOMContentLoaded", setupListeners, {once: true});

