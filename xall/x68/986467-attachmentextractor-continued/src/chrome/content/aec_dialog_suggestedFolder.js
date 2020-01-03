/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

function onload() {
  let matches = window.arguments[0];
  let folderlist = document.getElementById('folderlist');
  if (folderlist.selectedItem !== null)
    return; //sometimes triggers twice. dont know why but stop it anyway.
  if (matches.length === 0) document.documentElement.getButton("accept")
    .disabled = true;
  for (let i = 0; i < matches.length; i++) {
    folderlist.appendItem("[" + matches[i].ct + "] " + matches[i].f.path,
      matches[i].f).crop = "center";
  }
  folderlist.selectedIndex = 0;
  setTimeout(function() {
    sizeToContent();
  }, 0);
}

function ondialogaccept() {
  let folderlist = document.getElementById('folderlist');
  window.arguments[1].selectedIndex = folderlist.selectedIndex;
  window.close();
}

function ondialogextra1() {
  window.arguments[1].browse = true;
  window.close();
}

window.addEventListener("load", function(event) {
  onload();
});

document.addEventListener("dialogaccept", function(event) {
  ondialogaccept();
  event.preventDefault();
});

document.addEventListener("dialogextra1", function(event) {
  ondialogextra1();
});
