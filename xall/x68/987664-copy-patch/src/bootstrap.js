/*
 * Copy Patch Thunderbird Add-On
 *
 * Copyright (c) Jan Kiszka, 2019
 *
 * Authors:
 *  Jan Kiszka <jan.kiszka@web.de>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

var { Services } = ChromeUtils.import("resource://gre/modules/Services.jsm");

var WindowListener = {
    async loadIntoWindow(window) {
        if (window.document.readyState != "complete") {
            // Make sure the window load has completed.
            await new Promise(resolve => {
                window.addEventListener("load", resolve, { once: true });
            });
        }

        copyPatchInit(window);
    },

    onOpenWindow: function(xulWindow)
    {
        let domWindow = xulWindow.QueryInterface(Ci.nsIInterfaceRequestor)
                                 .getInterface(Ci.nsIDOMWindow);
        this.loadIntoWindow(domWindow);
    },

    onCloseWindow: function(xulWindow)
    {
        let domWindow = xulWindow.QueryInterface(Ci.nsIInterfaceRequestor)
                                 .getInterface(Ci.nsIDOMWindow);
        copyPatchDestroy(domWindow);
    },

    onWindowTitleChange: function(xulWindow, newTitle) { },
};

function forEachOpenWindow(todo)
{
    var windows = Services.wm.getEnumerator(null);
    while (windows.hasMoreElements()) {
        let domWindow = windows.getNext().QueryInterface(Ci.nsIDOMWindow);
        todo(domWindow);
    }
}

function startup(data, reason)
{
    Components.utils.import("chrome://copypatch/content/copypatch.jsm");

    forEachOpenWindow(WindowListener.loadIntoWindow);
    Services.wm.addListener(WindowListener);
}

function shutdown(data,reason)
{
    if (reason == APP_SHUTDOWN)
        return;

    forEachOpenWindow(copyPatchDestroy);
    Services.wm.removeListener(WindowListener);

    Components.utils.unload("chrome://copypatch/content/copypatch.jsm");

    Services.obs.notifyObservers(null, "chrome-flush-caches", null);
}

function install(data, reason) { }
function uninstall(data, reason) { }
