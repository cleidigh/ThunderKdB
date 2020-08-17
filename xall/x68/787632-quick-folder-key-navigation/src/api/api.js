/*
  This Source Code Form is subject to the terms of the Mozilla Public
  License, v. 2.0. If a copy of the MPL was not distributed with this
  file, You can obtain one at http://mozilla.org/MPL/2.0/.
*/

"use strict";

var { ExtensionCommon } = ChromeUtils.import("resource://gre/modules/ExtensionCommon.jsm");
var { Services } = ChromeUtils.import("resource://gre/modules/Services.jsm");

var KeyNavigationAPI = class extends ExtensionCommon.ExtensionAPI {
  getAPI(context) {
    return {
      KeyNavigationAPI: {
        async enableKeyNavigation(value) {
          let enumerator = Services.wm.getEnumerator("mail:3pane");
          while (enumerator.hasMoreElements()) {
        	  let win = enumerator.getNext();
        	  if (!win) continue;
       		  let folder = win.document.getElementById("folderTree");
       		  if (!folder) return;
            if (value) {
              folder.removeAttribute("disableKeyNavigation");
            } else {
              folder.setAttribute("disableKeyNavigation", "true");
            }
          } // while
        } // function
      } // KeyNavigation namespace
    } // object
  } // getAPI
}; // class
