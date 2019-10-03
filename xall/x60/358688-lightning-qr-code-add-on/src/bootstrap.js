/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

const {classes: Cc, interfaces: Ci, utils: Cu} = Components;
Cu.import("resource://gre/modules/Services.jsm");


/* Includes a javascript file with loadSubScript
* http://erikvold.com/blog/index.cfm/2011/6/14/restartless-firefox-addons-part-6-better-includes
*
* @param src (String)
* The url of a javascript file to include.
*/
(function(global) {
    global.include = function include(src) {
	    var o = {};
	    Cu.import("resource://gre/modules/Services.jsm", o);
	    var uri = o.Services.io.newURI(
		    src, null, o.Services.io.newURI(__SCRIPT_URI_SPEC__, null, null));
	    o.Services.scriptloader.loadSubScript(uri.spec, global, "utf-8");
    }
})(this);

/* Include library for creating QR codes */
include("lib/qrcode.js");

/* Include add-on code */
include("lib/lightning-qrcode.js");


/**
 * Apply a callback to each open and new messenger windows.
 *
 * @usage watchWindows(callback): Apply a callback to each messenger window.
 * @param [function] callback: 1-parameter function that gets a messenger window.
 */
function watchWindows(callback) {
	// Wrap the callback in a function that ignores failures
	function watcher(window) {
		try {
			// Now that the window has loaded, only handle messenger windows
			// that have the calendar showToolTip() function
			let {documentElement} = window.document;
			if (documentElement.getAttribute("id") == "messengerWindow") {
				if (!(window.document.defaultView === undefined)
					&& !(window.document.defaultView.showToolTip === undefined))
					callback(window);
			}
		}
		catch(ex) {}
	}

	// Wait for the window to finish loading before running the callback
	function runOnLoad(window) {
		// Listen for one load event before checking the window type
		window.addEventListener("load", function runOnce() {
			window.removeEventListener("load", runOnce, false);
			watcher(window);
		}, false);
	}

	// Add functionality to existing windows
	let windows = Services.wm.getEnumerator(null);
	while (windows.hasMoreElements()) {
		// Only run the watcher immediately if the window is completely loaded
		let window = windows.getNext();
		if (window.document.readyState == "complete")
			watcher(window);
		// Wait for the window to load before continuing
		else
			runOnLoad(window);
	}

	// Watch for new messenger windows opening then wait for it to load
	function windowWatcher(subject, topic) {
		if (topic == "domwindowopened")
			runOnLoad(subject);
	}
	Services.ww.registerNotification(windowWatcher);

	// Make sure to stop watching for windows if we're unloading
	unload(function() { Services.ww.unregisterNotification(windowWatcher) });
}


/**
 * Save callbacks to run when unloading. Optionally scope the callback to a
 * container, e.g., window. Provide a way to run all the callbacks.
 *
 * @usage unload(): Run all callbacks and release them.
 *
 * @usage unload(callback): Add a callback to run on unload.
 * @param [function] callback: 0-parameter function to call on unload.
 * @return [function]: A 0-parameter function that undoes adding the callback.
 *
 * @usage unload(callback, container) Add a scoped callback to run on unload.
 * @param [function] callback: 0-parameter function to call on unload.
 * @param [node] container: Remove the callback when this container unloads.
 * @return [function]: A 0-parameter function that undoes adding the callback.
 */
function unload(callback, container) {
	// Initialize the array of unloaders on the first usage
	let unloaders = unload.unloaders;
	if (unloaders == null)
		unloaders = unload.unloaders = [];

	// Calling with no arguments runs all the unloader callbacks
	if (callback == null) {
		unloaders.slice().forEach(function(unloader) { unloader() });
		unloaders.length = 0;
		return;
	}

	// The callback is bound to the lifetime of the container if we have one
	if (container != null) {
		// Remove the unloader when the container unloads
		container.addEventListener("unload", removeUnloader, false);

		// Wrap the callback to additionally remove the unload listener
		let origCallback = callback;
		callback = function() {
			container.removeEventListener("unload", removeUnloader, false);
			origCallback();
		}
	}

	// Wrap the callback in a function that ignores failures
	function unloader() {
		try {
			callback();
		}
		catch(ex) {}
	}
	unloaders.push(unloader);

	// Provide a way to remove the unloader
	function removeUnloader() {
		let index = unloaders.indexOf(unloader);
		if (index != -1)
			unloaders.splice(index, 1);
	}
	return removeUnloader;
}


function startup({webExtension}) {
	// Register CSS
	var sss = Cc["@mozilla.org/content/style-sheet-service;1"]
		.getService(Ci.nsIStyleSheetService);
	if (!sss.sheetRegistered(lightningQRCode.cssURI, sss.USER_SHEET))
		sss.loadAndRegisterSheet(lightningQRCode.cssURI, sss.USER_SHEET);

	// Setup prefs
	try {
		lightningQRCode.logging = lightningQRCode.prefs.getBoolPref("logging");
	} catch(ex) {
		lightningQRCode.prefs.setBoolPref("logging", lightningQRCode.logging);
	}
	try {
		lightningQRCode.techinfo = lightningQRCode.prefs.getBoolPref("techinfo");
	} catch(ex) {
		lightningQRCode.prefs.setBoolPref("techinfo", lightningQRCode.techinfo);
	}
	try {
		lightningQRCode.copydelay = lightningQRCode.prefs.getIntPref("copydelay");
	} catch(ex) {
		lightningQRCode.prefs.setIntPref("copydelay", lightningQRCode.copydelay);
	}
	try {
		lightningQRCode.copycolor = lightningQRCode.prefs.getCharPref("copycolor");
	} catch(ex) {
		lightningQRCode.prefs.setCharPref("copycolor", lightningQRCode.copycolor);
	}
	try {
		lightningQRCode.padding = lightningQRCode.prefs.getIntPref("padding");
	} catch(ex) {
		lightningQRCode.prefs.setIntPref("padding", lightningQRCode.padding);
	}
	try {
		lightningQRCode.usedesc = lightningQRCode.prefs.getBoolPref("usedesc");
	} catch(ex) {
		lightningQRCode.prefs.setBoolPref("usedesc", lightningQRCode.usedesc);
	}
	try {
		lightningQRCode.useorganizer = lightningQRCode.prefs.getBoolPref("useorganizer");
	} catch(ex) {
		lightningQRCode.prefs.setBoolPref("useorganizer", lightningQRCode.useorganizer);
	}
	try {
		lightningQRCode.useattendees = lightningQRCode.prefs.getBoolPref("useattendees");
	} catch(ex) {
		lightningQRCode.prefs.setBoolPref("useattendees", lightningQRCode.useattendees);
	}
	try {
		lightningQRCode.usealarms = lightningQRCode.prefs.getBoolPref("usealarms");
	} catch(ex) {
		lightningQRCode.prefs.setBoolPref("usealarms", lightningQRCode.usealarms);
	}
	lightningQRCode.prefs.addObserver("", lightningQRCode.observer, false);

    // startup the inline options WebExtension
    webExtension.startup().then(api => {
        const {browser} = api;
        browser.runtime.onMessage.addListener((msg, sender, sendReply) => {
            if (msg.type == "import-legacy-data") {
                // When the embedded webextension asks for the legacy data,
                // dump the data which needs to be preserved and send it back to the
                // embedded extension.
                sendReply({
                    "logging": lightningQRCode.logging,
                    "techinfo": lightningQRCode.techinfo,
                    "copydelay": lightningQRCode.copydelay,
                    "copycolor": lightningQRCode.copycolor,
                    "padding": lightningQRCode.padding,
                    "usedesc": lightningQRCode.usedesc,
                    "useorganizer": lightningQRCode.useorganizer,
                    "useattendees": lightningQRCode.useattendees,
                    "usealarms": lightningQRCode.usealarms,
                });
            }
            if (msg.type == "update-legacy-setting") {
                switch (msg.setting) {
                case "logging":
                    lightningQRCode.prefs.setBoolPref("logging", msg.value);
                    break;
                case "techinfo":
                    lightningQRCode.prefs.setBoolPref("techinfo", msg.value);
                    break;
                case "copydelay":
                    lightningQRCode.prefs.setIntPref("copydelay", msg.value);
                    break;
                case "copycolor":
                    lightningQRCode.prefs.setCharPref("copycolor", msg.value);
                    break;
                case "padding":
                    lightningQRCode.prefs.setIntPref("padding", msg.value);
                    break;
                case "usedesc":
                    lightningQRCode.prefs.setBoolPref("usedesc", msg.value);
                    break;
                case "useorganizer":
                    lightningQRCode.prefs.setBoolPref("useorganizer", msg.value);
                    break;
                case "useattendees":
                    lightningQRCode.prefs.setBoolPref("useattendees", msg.value);
                    break;
                case "usealarms":
                    lightningQRCode.prefs.setBoolPref("usealarms", msg.value);
                }
            }
        });
    });

	watchWindows(lightningQRCode.main);
}


function shutdown(data, reason) {
	// Remove functionality from existing windows
	let windows = Services.wm.getEnumerator(null);
	while (windows.hasMoreElements()) {
		// Only run the watcher immediately if the window is completely loaded
		let window = windows.getNext();
		if (!(window.document.defaultView === undefined)) {
			let view = window.document.defaultView;

			if (!(view.showToolTip === undefined)
				&& !(view.calShowToolTip === undefined)) {
				view.showToolTip = view.calShowToolTip;
				view.calShowToolTip = null;
				delete view.calShowToolTip;
			}
		}
	}

	// Unregister CSS
	var sss = Cc["@mozilla.org/content/style-sheet-service;1"]
		.getService(Ci.nsIStyleSheetService);
	if (sss.sheetRegistered(lightningQRCode.cssURI, sss.USER_SHEET))
		sss.unregisterSheet(lightningQRCode.cssURI, sss.USER_SHEET);

	// Remove translation strings
	l10n.unload;

	// Remove preferences observer
	lightningQRCode.prefs.removeObserver("", lightningQRCode.observer);

	// Clean up with unloaders when we're deactivating
	if (reason != APP_SHUTDOWN)
		unload();
}

function uninstall(data, reason) {
	shutdown(data, reason);
}
