/*
  * This file is part of CardBook, contributed by John Bieling.
  *
  * This Source Code Form is subject to the terms of the Mozilla Public
  * License, v. 2.0. If a copy of the MPL was not distributed with this
  * file, You can obtain one at http://mozilla.org/MPL/2.0/.
*/
"use strict";

var EXPORTED_SYMBOLS = ["CardbookHttpRequest"];

var { Services } = ChromeUtils.import("resource://gre/modules/Services.jsm");

var containers = [];
var sandboxes = {};

function CardbookHttpRequest(url, username = "") {
	let sandbox = getSandboxForOrigin(username, url);
	return new sandbox.XMLHttpRequest();
}

function getSandboxForOrigin(username, url) {
	let options = {};
	let uri = Services.io.newURI(url);
	let origin = uri.hostPort;

	if (username) {
		options.userContextId = getContainerIdForUser(username);
		origin = options.userContextId + "@" + origin;
	}

	if (!sandboxes.hasOwnProperty(origin)) {
		let principal = Services.scriptSecurityManager.createContentPrincipal(uri, options);    
		sandboxes[origin] = Components.utils.Sandbox(principal, {
			wantXrays: true,
			wantGlobalProperties: ["XMLHttpRequest"],
		});
	}

	return sandboxes[origin];
}

function getContainerIdForUser(username) {
	// Define the allowed range of container ids to be used
	// TbSync is using 10000 - 19999
	// Lightning is using 20000- 29999
	let min = 30000;
	let max = 39999;

	//reset if adding an entry will exceed allowed range
	if (containers.length > (max-min) && containers.indexOf(username) == -1) {
		for (let i=0; i < containers.length; i++) {
			Services.clearData.deleteDataFromOriginAttributesPattern({ userContextId: i + min });
		}
		containers = [];
	}

	let idx = containers.indexOf(username);
	return (idx == -1) ? containers.push(username) - 1 + min : (idx + min);
}
