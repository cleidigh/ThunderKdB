/* ***** BEGIN LICENSE BLOCK *****
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 * ***** END LICENSE BLOCK ***** */

/* Frame script for multiprocess Firefox
 * https://developer.mozilla.org/en-US/Add-ons/Working_with_multiprocess_Firefox
 */

let elem = content.document.getElementById("toggleprewrap");

if (elem) {
  elem.parentNode.removeChild(elem);
} else {
  let headElem = content.document.getElementsByTagName("head")[0];
  if (headElem) {
    elem = content.document.createElement("style");
    elem.id = "toggleprewrap";
    elem.type = "text/css";
    elem.innerHTML = "pre { white-space: pre-wrap !important; word-break: break-all !important; } /* inserted by the Toggle Word Wrap extension */";
    headElem.appendChild(elem);
  }
}
