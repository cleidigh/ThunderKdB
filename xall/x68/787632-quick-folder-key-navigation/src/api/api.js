/*
  This Source Code Form is subject to the terms of the Mozilla Public
  License, v. 2.0. If a copy of the MPL was not distributed with this
  file, You can obtain one at http://mozilla.org/MPL/2.0/.
*/

"use strict";

var { ExtensionCommon } = ChromeUtils.import("resource://gre/modules/ExtensionCommon.jsm");

var FolderUIAPI = class extends ExtensionCommon.ExtensionAPI {
  getAPI(context) {
    return {
      FolderUI: {

        async enableKeyNavigation(windowId, value) {
          let win = context.extension.windowManager.get(windowId, context).window;
          if (!win) {
            console.debug("keynav.enableKeyNavigation: failed to get window object");
            return;
          }
          let folder = win.document.getElementById("folderTree");
          if (!folder) {
            console.debug("keynav.enableKeyNavigation: failed to find a folderTree element");
            return;
          }
          if (value) {
            folder.removeAttribute("disableKeyNavigation");
            console.debug("keynav.enableKeyNavigation: successfully enabled key navigation");
          } else {
            folder.setAttribute("disableKeyNavigation", "true");
            console.debug("keynav.enableKeyNavigation: successfully disabled key navigation");
          }
        } // function

      } // FolderUI namespace
    } // return object holding experiment namespaces
  } // getAPI
}; // class
