/*
  This Source Code Form is subject to the terms of the Mozilla Public
  License, v. 2.0. If a copy of the MPL was not distributed with this
  file, You can obtain one at http://mozilla.org/MPL/2.0/.
*/

"use strict";

var { ExtensionCommon } = ChromeUtils.import("resource://gre/modules/ExtensionCommon.jsm");

var FolderUIAPI = class extends ExtensionCommon.ExtensionAPI {

  onShutdown(isAppShutdown) {
    console.debug("FolderUI.onShutdown: disabling key navigation everywhere");
    const {Services} = ChromeUtils.import("resource://gre/modules/Services.jsm");
    // Disable key navigation on all mail folder trees
    let enumerator = Services.wm.getEnumerator("mail:3pane");
    while (enumerator.hasMoreElements()) {
     let win = enumerator.getNext();
     if (!win) continue; // in case there's no window, don't do anything
     let folder = win.document.getElementById("folderTree");
     if (!folder) continue; // no element with id folderTree, so skip this window
      folder.setAttribute("disableKeyNavigation", "true"); // disable key navigation on the element
    } // while
    // Clear caches that could prevent upgrades from working properly
    Services.obs.notifyObservers(null, "startupcache-invalidate", null);
    console.debug("FolderUI.onShutdown: Done");
  } // onShutdown function

  getAPI(context) {
    // Return the experimental API
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
        } // enableKeyNavigation

      } // FolderUI
    } // return object holding experiment APIs
  } // getAPI function

}; // FolderUIAPI class
