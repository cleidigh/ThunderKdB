/*
# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.
*/
'use strict';

browser.runtime.sendMessage({ type: 'compose-started' });

function onCopy(_event) {
  browser.runtime.sendMessage({ type: 'compose-something-copied' });
}

function onPaste(event) {
  browser.runtime.sendMessage({ type: 'compose-something-pasted' });
}

document.addEventListener('copy', onCopy);
document.addEventListener('cut', onCopy);
document.addEventListener('paste', onPaste);
