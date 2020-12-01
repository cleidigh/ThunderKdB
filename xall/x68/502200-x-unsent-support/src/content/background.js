// @ts-check
///<reference path="../components/commandLineHandler.d.ts" />
/* eslint-env shared-node-browser, webextensions */

"use strict";

browser.commandLineHandler.init().catch(
	error => console.log("init failed with", error),
);
