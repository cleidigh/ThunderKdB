// Feedly Synchronizer AddOn for Mozilla Thunderbird
// Developed by Antonio Miras Aróstegui
// Published under Mozilla Public License, version 2.0 (https://www.mozilla.org/MPL/2.0/)

const NS_XUL = "http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul";

// BEGIN: Code taken from Bitcoin Venezuela Add-On. (c) Alexander Salas
(function(global) {
	var modules = {};
	global.require = function require(src) {
		if (modules[src])
			return modules[src];
		var scope = { require : global.require, exports : {} };
		var tools = {};
		Components.utils.import("resource://gre/modules/Services.jsm", tools);
		var baseURI = tools.Services.io.newURI(__SCRIPT_URI_SPEC__, null, null);
		try {
			var uri = tools.Services.io.newURI(
					"packages/" + src + ".js", null, baseURI);
			tools.Services.scriptloader.loadSubScript(uri.spec, scope);
		} catch (e) {
			var uri = tools.Services.io.newURI(src, null, baseURI);
			tools.Services.scriptloader.loadSubScript(uri.spec, scope);
		}
		return modules[src] = scope.exports;
	};
})(this);

(function(global) {
	global.include = function include(src) {
		let o = {};
		Components.utils.import("resource://gre/modules/Services.jsm", o);
		let uri = o.Services.io.newURI(src, null, o.Services.io.newURI(__SCRIPT_URI_SPEC__, null, null));
		o.Services.scriptloader.loadSubScript(uri.spec, global);
	};
})(this);

var { unload } = require("unload");

// END: Code taken from Bitcoin Venezuela Add-On. (c) Alexander Salas

var win = null;
var addonId = "FeedlySync@AMArostegui";
var uriResolver;

function install(data) {
	// Order of includes matter
	include("src/fsprefs.js");
	include("packages/prefs.js");
	include("src/utils.js");
	include("src/guiElements.js");
	include("src/feedevents.js");
	include("packages/l10n.js");
	include("packages/unload.js");
	include("packages/window-utils.js");
	include("src/auth.js");
	include("src/tests.js");

	log.writeLn("Install");
}

function uninstall() {
}

var { runOnLoad, runOnWindows, watchWindows } = require("window-utils");

function startup(data, reason) {
	log.writeLn("Startup. Reason = " + reason);

	uriResolver = {
		getResourceURI: function(filePath) {
			return __SCRIPT_URI_SPEC__ + "/../" + filePath;
		}
	};

	l10n(uriResolver, "FeedlySync.properties");
	unload(l10n.unload);

	setDefaultPrefs();
	watchWindows(main, "mail:3pane");
}

function shutdown(data, reason) {
	log.writeLn("Shutdown. Reason = " + reason);
	feedEvents.removeListener();
	unload();
}

function main(window) {
	win = window;

	guiElements.startup(syncTBFeedly, runTests, uriResolver);
	synch.startup();
	feedEvents.addListener();
	syncTBFeedly();
}

function syncTBFeedly() {
	// Uncomment this line to try against the sandbox
	// auth.testing = true;
	let action = function() {
		synch.begin();
	};
	synch.authAndRun(action);
}

function runTests() {
	tests.begin();
}