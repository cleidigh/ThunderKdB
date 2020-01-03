/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

window.addEventListener('load', function() {
  //aedump('load\n');

  var t;
  if ((t=document.getElementById('attachmentListContext'))) t.addEventListener('popupshowing',attachmentextractor.onShowAttachmentContextMenu,false);

}, true);
