/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

function add_to_pattern(button) {
  let fnpbox = document.getElementById('filenamepatternbox');
  let postindex = fnpbox.selectionStart + button.label.length;
  fnpbox.value = fnpbox.value.substring(0, fnpbox.selectionStart) + button
    .label + fnpbox.value.substring(fnpbox.selectionEnd);
  fnpbox.setSelectionRange(postindex, postindex);
}

function onload() {
  document.getElementById('filenamepatternbox').value = window.arguments[0].value;
  document.getElementById('savecheck').checked = window.arguments[1].value;
  document.getElementById('askalwaysfnp').checked = window.arguments[2].value;
}

function onaccept() {
  window.arguments[0].value = document.getElementById('filenamepatternbox').value;
  window.arguments[1].value = document.getElementById('savecheck').checked;
  window.arguments[2].value = document.getElementById('askalwaysfnp').checked;
  window.arguments[3].value = true;
  window.close();
}

window.addEventListener("load", function(event) {
  onload();
});

document.addEventListener("dialogaccept", function(event) {
  onaccept();
  event.preventDefault();
});
