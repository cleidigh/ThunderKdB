/*
  This Source Code Form is subject to the terms of the Mozilla Public
  License, v. 2.0. If a copy of the MPL was not distributed with this
  file, You can obtain one at http://mozilla.org/MPL/2.0/.
*/

"use strict";

document.addEventListener("DOMContentLoaded", localisePage, {once: true});

document.addEventListener("DOMContentLoaded", function() {
  let OKButton = document.querySelector("#whatsnew_button");
  OKButton.addEventListener("click", (event) => {
  	window.close();
  });
}, {once: true});

