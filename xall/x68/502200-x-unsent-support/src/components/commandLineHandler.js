/*
 * Implements a nsICommandLineHandler.
 * The handler will react to .eml files with the included header "X-Unsent: 1"
 *
 * Copyright (c) 2014-2020 Philippe Lieser
 *
 * This software is licensed under the terms of the MIT License.
 *
 * The above copyright and license notice shall be
 * included in all copies or substantial portions of the Software.
 */

// @ts-check
///<reference path="../mozilla.d.ts" />
///<reference path="./commandLineHandler.d.ts" />
/* eslint-env shared-node-browser */
/* global ChromeUtils, Components, ExtensionCommon */
/* exported NSGetFactory */

"use strict";

const Cc = Components.classes;
const Ci = Components.interfaces;

// a unique ID
const CLASS_ID = Components.ID("B19288D8-C285-11E3-9E49-91FC1C5D46B0");
// const CLASS_NAME = "xUnsentCLH";
const CLASS_DESCRIPTION = "X-Unsent support command line handler";
// id must be unique in application
const CONTRACT_ID = "@pl/X-Unsent_support/clh;1";
// category names are sorted alphabetically. Typical command-line handlers use a
// category that begins with the letter "m".
const CLD_CATEGORY = "w-xUnsent";

const PREF_BRANCH = "extensions.xUnsent_support.";

/** @type {{XPCOMUtils: XPCOMUtilsM}} */
const { XPCOMUtils } = ChromeUtils.import("resource://gre/modules/XPCOMUtils.jsm");
/** @type {{Services: ServicesM}} */
const { Services } = ChromeUtils.import("resource://gre/modules/Services.jsm");
// @ts-expect-error
// eslint-disable-next-line no-redeclare
const { setTimeout, clearTimeout } = ChromeUtils.import("resource://gre/modules/Timer.jsm");
/** @type {{MailServices: MailServicesM}} */
const { MailServices } = ChromeUtils.import("resource:///modules/MailServices.jsm");
/** @type {{MailUtils: MailUtilsM}} */
const { MailUtils } = ChromeUtils.import("resource:///modules/MailUtils.jsm");


const messenger = Cc["@mozilla.org/messenger;1"].createInstance(Ci.nsIMessenger);
const msgWindow = Cc["@mozilla.org/messenger/msgwindow;1"].createInstance(Ci.nsIMsgWindow);

const prefs = Services.prefs.getBranch(PREF_BRANCH);

/**
 * Try to get a the user value of a preference
 *
 * @param {string} prefName
 * @param {string} defaultValue - default value if no user value exists
 * @returns {string}
 */
function tryGetCharPref(prefName, defaultValue) {
	if (prefs.prefHasUserValue(prefName)) {
		return prefs.getCharPref(prefName);
	}
	return defaultValue;
}

/**
 * parse the message header
 *
 * @param {string} header
 * @return {Object.<string, string[]>}
 */
function parseHeader(header) {
	/** @type {Object.<string, string[]>} */
	const headerFields = {};

	// split header fields
	const headerArray = header.split(/\r\n(?=\S|$)/);
	let hName;
	for (let i = 0; i < headerArray.length; i++) {
		// store fields under header field name (in lower case) in an array
		hName = headerArray[i].match(/\S+(?=\s*:)/);
		if (hName !== null) {
			hName = hName[0].toLowerCase();
			if (headerFields[hName] === undefined) {
				headerFields[hName] = [];
			}
			headerFields[hName].push(`${headerArray[i]}\r\n`);
		}
	}

	return headerFields;
}

/**
 * Reads the message and parses the header
 *
 * @param {string} msgURI
 * @return {Object.<string, string[]>}
 */
function parseMsg(msgURI) {
	let headerPlain = "";
	let c;

	// get inputStream for msg
	const messageService = messenger.messageServiceFromURI(msgURI);
	const nsIInputStream = Cc["@mozilla.org/network/sync-stream-listener;1"].
		createInstance(Ci.nsIInputStream);
	const inputStream = Cc["@mozilla.org/scriptableinputstream;1"].
		createInstance(Ci.nsIScriptableInputStream);
	inputStream.init(nsIInputStream);
	messageService.CopyMessage(msgURI, nsIInputStream, false, null /* aUrlListener */, null /* aMsgWindow */, {});

	// read header
	// eslint-disable-next-line no-constant-condition
	while (true) {
		// read one character
		c = inputStream.read(1);
		if (c === "") {
			throw new Error("End of file reached before end of header");
		}

		// control char reached
		if (c === "\r" || c === "\n") {
			c = c + inputStream.read(1);

			if (c === "\r\n") {
				// CRLF ending
				headerPlain += c;
				c = inputStream.read(2);
				if (c === "\r\n") {
					// empty line found, stop
					break;
				}
			} else {
				// CR or LF ending
				if (c === "\r\r" || c === "\n\n") {
					// empty line found, stop
					break;
				}
			}
		}

		headerPlain += c;
	}

	// close inputStream
	inputStream.close();
	nsIInputStream.close();

	// convert all EOLs to CRLF
	headerPlain = headerPlain.replace(/(\r\n|\n|\r)/g, "\r\n");

	return parseHeader(headerPlain);
}

/**
 * A dummy nsIMsgDBHdr for .eml files.
 *
 * from https://mxr.mozilla.org/comm-central/source/mail/base/content/msgHdrViewOverlay.js
 *
 * @implements {nsIMsgDBHdr}
 * @return {void}
 */
// @ts-expect-error
// eslint-disable-next-line no-empty-function
function nsDummyMsgHeader() {
}
nsDummyMsgHeader.prototype =
{
	mProperties: new Array,
	getStringProperty: function (aProperty) {
		if (aProperty in this.mProperties) {
			return this.mProperties[aProperty];
		}
		return "";
	},
	setStringProperty: function (aProperty, aVal) {
		this.mProperties[aProperty] = aVal;
	},
	getUint32Property: function (aProperty) {
		if (aProperty in this.mProperties) {
			return parseInt(this.mProperties[aProperty], 10);
		}
		return 0;
	},
	setUint32Property: function (aProperty, aVal) {
		this.mProperties[aProperty] = aVal.toString();
	},
	// eslint-disable-next-line no-empty-function
	markHasAttachments: function (/*hasAttachments*/) { },
	messageSize: 0,
	recipients: null,
	/** @type {string?} */
	author: null,
	subject: "",
	get mime2DecodedSubject() {
		return this.subject;
	},
	ccList: null,
	listPost: null,
	messageId: null,
	date: 0,
	accountKey: "",
	flags: 0,
	// If you change us to return a fake folder, please update
	// folderDisplay.js's FolderDisplayWidget's selectedMessageIsExternal getter.
	folder: null
};

/**
 * Command Line Handler.
 *
 * Reacts to the opening of an .eml file with the "X-Unsent" header set to 1.
 *
 * @implements {nsICommandLineHandler}
 * @return {Void}
 */
// @ts-expect-error
// eslint-disable-next-line no-empty-function
function CommandLineHandler() {
}

CommandLineHandler.prototype = {
	classDescription: CLASS_DESCRIPTION,
	classID: CLASS_ID,
	contractID: CONTRACT_ID,

	QueryInterface: ChromeUtils.generateQI([
		Ci.nsICommandLineHandler
	]),

	// eslint-disable-next-line valid-jsdoc
	/** @type {nsICommandLineHandler["handle"]} */
	handle: function (cmdLine) {
		let uri;

		// most copied from
		// https://mxr.mozilla.org/comm-central/source/mail/components/nsMailDefaultHandler.js

		// The URI might be passed as the argument to the file parameter
		const fileFlagPos = cmdLine.findFlag("file", false);
		if (fileFlagPos !== -1) {
			uri = cmdLine.getArgument(fileFlagPos + 1);
		}

		const count = cmdLine.length;
		let i;
		if (count && fileFlagPos === -1) {
			i = 0;
			while (i < count) {
				const curarg = cmdLine.getArgument(i);
				if (!curarg.startsWith("-")) {
					break;
				}

				console.log(`X-Unsent support: Warning: unrecognized command line flag ${curarg}\n`);
				// To emulate the pre-nsICommandLine behavior, we ignore the
				// argument after an unrecognized flag.
				i += 2;
				// xxxbsmedberg: make me use the console service!
			}

			if (i < count) {
				uri = cmdLine.getArgument(i);

				// mailto: URIs are frequently passed with spaces in them. They should be
				// escaped into %20, but we hack around bad clients, see bug 231032
				if (uri.startsWith("mailto:")) {
					// we do not handle mailto:
					return;
				}
			}
		}

		if (uri) {
			if (uri.toLowerCase().endsWith(".eml")) {
				// Open this eml in a new message window
				const file = cmdLine.resolveFile(uri);
				// No point in trying to open a file if it doesn't exist or is empty
				if (file.exists() && file.fileSize > 0) {
					// Get the URL for this file
					let fileURL = Services.io.newFileURI(file).
						QueryInterface(Components.interfaces.nsIFileURL);
					fileURL = fileURL.mutate().setQuery("type=application/x-message-display").finalize();

					try {
						const msgURI = fileURL.spec;
						const msgHdr = new nsDummyMsgHeader();

						// get headers
						const header = parseMsg(msgURI);
						// only continue if X-Unsent header exist
						if (!header["x-unsent"]) {
							return;
						}
						// only continue if X-Unsent header is set to 1
						const x = header["x-unsent"][0];
						if (x.substr(x.indexOf(":") + 1).trim() !== "1") {
							return;
						}

						const msgCompType = Components.interfaces.nsIMsgCompType[
							tryGetCharPref("default.msgCompType", "Template")];

						// set author
						if (header.from && header.from[0]) {
							msgHdr.author = header.from[0].
								replace(/\S+\s*:\s*/, "");
						}
						// get identity
						const [identity] = MailUtils.getIdentityForHeader(msgHdr, msgCompType);

						MailServices.compose.OpenComposeWindow(
							null, // string msgComposeWindowURL
							msgHdr, // nsIMsgDBHdr msgHdr
							msgURI, // string originalMsgURI
							msgCompType, // nsIMsgCompType
							Components.interfaces.nsIMsgCompFormat.Default,
							identity, // nsIMsgIdentity identity
							null, // AUTF8String from
							msgWindow, // nsIMsgWindow
						);
					} catch (e) {
						console.error("X-Unsent support:", e);
						return;
					}

					// remove argument so it is not handled by nsMailDefaultHandler
					if (fileFlagPos !== -1) {
						// remove file flag and uri parameter
						cmdLine.removeArguments(fileFlagPos, fileFlagPos + 1);
					} else {
						// remove uri
						cmdLine.removeArguments(i, i);
					}
					cmdLine.preventDefault = true;
				}
			}
		}
	},
};

// eslint-disable-next-line no-invalid-this
this.commandLineHandler = class extends ExtensionCommon.ExtensionAPI {
	/**
	 * Sleep for <ms> milliseconds.
	 *
	 * @param {number} ms
	 * @return {Promise<void>}
	 */
	_sleep(ms) {
		return new Promise(resolve => setTimeout(resolve, ms));
	}

	/**
	 * Wait until Components.manager.registerFactory will be available,
	 * as it can be unavailable for a few milliseconds after startup.
	 *
	 * @returns {Promise<void>}
	 */
	async _waitForRegisterFactory() {
		const overallTimeout = 15000;
		let retrySleepTime = 100;
		const retrySleepTimeIncrease = 50;
		const retrySleepTimeMax = 500;

		let timeout = false;
		const timeoutId = setTimeout(() => {
			timeout = true;
		}, overallTimeout);
		// eslint-disable-next-line no-unmodified-loop-condition
		while (!timeout) {
			if (Components.manager.registerFactory) {
				clearTimeout(timeoutId);
				return;
			}
			console.log("Components.manager.registerFactory not ready (will wait)");
			await this._sleep(retrySleepTime);
			retrySleepTime = Math.max(retrySleepTime + retrySleepTimeIncrease, retrySleepTimeMax);
		}
		throw Error("Components.manager.registerFactory not available");
	}

	/**
	 * @param {ExtensionCommon.Context} context
	 * @returns {{commandLineHandler: browser.commandLineHandler}}
	 */
	getAPI(context) {
		return {
			commandLineHandler: {
				init: async () => {
					// @ts-expect-error
					const factory = XPCOMUtils.generateNSGetFactory([CommandLineHandler])(CLASS_ID);
					await this._waitForRegisterFactory();
					Components.manager.registerFactory(CLASS_ID, "exampleComponent", CONTRACT_ID,
						factory);

					Services.catMan.addCategoryEntry(
						"command-line-handler",
						CLD_CATEGORY,
						CONTRACT_ID,
						false,
						false,
					);

					context.callOnClose({
						close() {
							Components.manager.unregisterFactory(CLASS_ID, factory);

							Services.catMan.deleteCategoryEntry(
								"command-line-handler",
								CLD_CATEGORY,
								false,
							);
						}
					});
				},
			},
		};
	}
};
