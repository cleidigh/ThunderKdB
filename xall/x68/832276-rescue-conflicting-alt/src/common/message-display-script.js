/*
# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.
*/
'use strict';

function sanitizeForHTMLText(text) {
  return String(text || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// eslint-disable-next-line no-unused-vars
function renderExtraBodies(bodies) {
  const range = document.createRange();
  range.selectNodeContents(document.body);
  range.collapse(false);

  const extraBodies = document.createDocumentFragment();

  const header = browser.i18n.getMessage('extraBodies_header', [bodies.length]);
  extraBodies.appendChild(range.createContextualFragment(`<hr><p><strong>${sanitizeForHTMLText(header)}</strong></p>`));

  for (const body of bodies) {
    if (body.html) {
      extraBodies.appendChild(range.createContextualFragment(`<hr><div>${body.html}</div>`));
    }
    else {
      extraBodies.appendChild(range.createContextualFragment(`<hr><pre>${sanitizeForHTMLText(body.plaintext)}</pre>`));
    }
  }
  range.insertNode(extraBodies);

  range.detach();
}
