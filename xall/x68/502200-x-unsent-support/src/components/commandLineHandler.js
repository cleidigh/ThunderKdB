/*
 * commandLineHandler.js
 *
 * Implements a nsICommandLineHandler.
 * The handler will react to .eml files with the included header "X-Unsent: 1"
 *
 * Version: 1.2.0 (06 September 2019)
 *
 * Copyright (c) 2014-2019 Philippe Lieser
 *
 * This software is licensed under the terms of the MIT License.
 *
 * The above copyright and license notice shall be
 * included in all copies or substantial portions of the Software.
 */

// options for JSHint
/* eslint strict: ["warn", "function"] */
/* eslint no-magic-numbers: ["warn", { "ignoreArrayIndexes": true, "ignore": [-1, 0, 1, 2] }] */
/* global ChromeUtils, Components */
/* exported NSGetFactory */

const Cc = Components.classes;
const Ci = Components.interfaces;

// a unique ID
const CLASS_ID = Components.ID("B19288D8-C285-11E3-9E49-91FC1C5D46B0");
// const CLASS_NAME = "xUnsentCLH";
const CLASS_DESCRIPTION = "X-Unsent support commandline handler";
// id must be unique in application
const CONTRACT_ID = "@pl/X-Unsent_support/clh;1";
// category names are sorted alphabetically. Typical command-line handlers use a
// category that begins with the letter "m".
// const CLD_CATEGORY = "w-xUnsent";
const RESOURCE_URI = "resource://xUnsent_support/";
const PREF_BRANCH = "extensions.xUnsent_support.";

var { XPCOMUtils } = ChromeUtils.import("resource://gre/modules/XPCOMUtils.jsm");
var { Services } = ChromeUtils.import("resource://gre/modules/Services.jsm");
var { MailServices } = ChromeUtils.import("resource:///modules/MailServices.jsm");
var { MailUtils } = ChromeUtils.import("resource:///modules/MailUtils.jsm");

var { Logging } = ChromeUtils.import(RESOURCE_URI+"logging.jsm");


let messenger =Cc["@mozilla.org/messenger;1"].createInstance(Ci.nsIMessenger);
let msgWindow = Cc["@mozilla.org/messenger/msgwindow;1"].createInstance(Ci.nsIMsgWindow);
let log = Logging.getLogger("clh");
var prefs = Services.prefs.getBranch(PREF_BRANCH);

/**
 * Utility functions
 */

/**
 * parse the message header
 *
 * @param {String} header
 *
 * @return {Object}
 */
function parseHeader(header) {
	"use strict";

	let headerFields = {};

	// split header fields
	let headerArray = header.split(/\r\n(?=\S|$)/);
	let hName;
	for(let i = 0; i < headerArray.length; i++) {
		// store fields under header field name (in lower case) in an array
		hName = headerArray[i].match(/\S+(?=\s*:)/);
		if (hName !== null) {
			hName = hName[0].toLowerCase();
			if (headerFields[hName] === undefined) {
				headerFields[hName] = [];
			}
			headerFields[hName].push(headerArray[i]+"\r\n");
		}
	}

	return headerFields;
}

/**
 * Reads the message and parses the header
 *
 * @param {String} msgURI
 *
 * @return {Object}
 */
function parseMsg(msgURI) {
	"use strict";

	let headerPlain = "";
	let c;

	// get inputStream for msg
	let messageService = messenger.messageServiceFromURI(msgURI);
	let nsIInputStream = Cc["@mozilla.org/network/sync-stream-listener;1"].
		createInstance(Ci.nsIInputStream);
	let inputStream = Cc["@mozilla.org/scriptableinputstream;1"].
		createInstance(Ci.nsIScriptableInputStream);
	inputStream.init(nsIInputStream);
	messageService.CopyMessage(msgURI, nsIInputStream, false, null /* aUrlListener */, null /* aMsgWindow */, {});

	// read header
	// eslint-disable-next-line no-constant-condition
	while(true) {
		// read one character
		c = inputStream.read(1);

		// control char reached
		if (c === "\r" || c === "\n") {
			c = c+inputStream.read(1);

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
 * @return {Void}
 */
function nsDummyMsgHeader()
{
	"use strict";
}
nsDummyMsgHeader.prototype =
{
	mProperties : new Array,
	getStringProperty : function(aProperty) {
		"use strict";

		if (aProperty in this.mProperties) {
			return this.mProperties[aProperty];
		}
		return "";
	},
	setStringProperty : function(aProperty, aVal) {
		"use strict";

		this.mProperties[aProperty] = aVal;
	},
	getUint32Property : function(aProperty) {
		"use strict";

		if (aProperty in this.mProperties) {
			return parseInt(this.mProperties[aProperty], 10);
		}
		return 0;
	},
	setUint32Property: function(aProperty, aVal) {
		"use strict";

		this.mProperties[aProperty] = aVal.toString();
	},
	markHasAttachments : function(/*hasAttachments*/) {"use strict";},
	messageSize : 0,
	recipients : null,
	author: null,
	subject : "",
	get mime2DecodedSubject() {
		"use strict";

		return this.subject;
	},
	ccList : null,
	listPost : null,
	messageId : null,
	date : 0,
	accountKey : "",
	flags : 0,
	// If you change us to return a fake folder, please update
	// folderDisplay.js's FolderDisplayWidget's selectedMessageIsExternal getter.
	folder : null
};

/**
 * Observes the opening of a toplevel window and calls
 * Services.appShell.exitLastWindowClosingSurvivalArea().
 * Unregisters itself after first call.
 *
 * used to prevent shutdown on app start
 *
 * @return {Void}
 */
function DocumentOpendObserver()
{
	"use strict";

	/*jshint validthis:true */
	this.register();
}

DocumentOpendObserver.prototype = {
	observe: function(/*subject, topic, data*/) {
		"use strict";

		log.debug("exitLastWindowClosingSurvivalArea");
		Services.startup.exitLastWindowClosingSurvivalArea();
		this.unregister();
	},
	register: function() {
		"use strict";

		let observerService = Components.classes["@mozilla.org/observer-service;1"].
			getService(Components.interfaces.nsIObserverService);
		observerService.addObserver(this, "toplevel-window-ready", false);
	},
	unregister: function() {
		"use strict";

		let observerService = Components.classes["@mozilla.org/observer-service;1"].
			getService(Components.interfaces.nsIObserverService);
		observerService.removeObserver(this, "toplevel-window-ready");
	}
};

/**
 * Command Line Handler.
 *
 * Reacts to the opening of an .eml file with the "X-Unsent" header set to 1.
 *
 * @return {Void}
 */
function CommandLineHandler() {
	"use strict";
}

CommandLineHandler.prototype = {
	classDescription: CLASS_DESCRIPTION,
	classID: CLASS_ID,
	contractID: CONTRACT_ID,

	QueryInterface: ChromeUtils.generateQI([
		Ci.nsICommandLineHandler
	]),

	/* nsICommandLineHandler */
	handle : function clh_handle(cmdLine)
	{
		"use strict";

		let uri;

		// most copied from
		// https://mxr.mozilla.org/comm-central/source/mail/components/nsMailDefaultHandler.js

		// The URI might be passed as the argument to the file parameter
		let fileFlagPos = cmdLine.findFlag("file", false);
		if (fileFlagPos !== -1) {
			uri = cmdLine.getArgument(fileFlagPos+1);
		}

		let count = cmdLine.length;
		let i;
		if (count && fileFlagPos === -1) {
			i = 0;
			while (i < count) {
				let curarg = cmdLine.getArgument(i);
				if (!curarg.startsWith("-")) {
					break;
				}

				log.debug("Warning: unrecognized command line flag " + curarg + "\n");
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
				let file = cmdLine.resolveFile(uri);
				// No point in trying to open a file if it doesn't exist or is empty
				if (file.exists() && file.fileSize > 0) {
					// Get the URL for this file
					let fileURL = Services.io.newFileURI(file).
						QueryInterface(Components.interfaces.nsIFileURL);
					if (Services.vc.compare(Services.appinfo.platformVersion, "59.0-1") >= 0) {
						fileURL = fileURL.mutate().setQuery("type=application/x-message-display").finalize();
					} else {
						fileURL.query = "?type=application/x-message-display";
					}

					try {
						let msgURI = fileURL.spec;
						let msgHdr = new nsDummyMsgHeader();

						// get headers
						let header = parseMsg(msgURI);
						// only continue if X-Unsent header exist
						if (!header["x-unsent"]) {
							return;
						}
						// only continue if X-Unsent header is set to 1
						let x = header["x-unsent"][0];
						if (x.substr(x.indexOf(":")+1).trim() !== "1") {
							return;
						}

						let msgCompType = Components.interfaces.nsIMsgCompType[
							prefs.getCharPref("default.msgCompType")];

						// set author
						if (header["from"] && header["from"][0]) {
							msgHdr.author = header["from"][0].
								replace(/\S+\s*:\s*/, "");
						}
						// get identity
						let identity = MailUtils.getIdentityForHeader(msgHdr, msgCompType);

						log.debug("before compose");
						MailServices.compose.OpenComposeWindow(
							null, // string msgComposeWindowURL
							msgHdr, // nsIMsgDBHdr msgHdr
							msgURI, // string originalMsgURI
							msgCompType, // nsIMsgCompType
							Components.interfaces.nsIMsgCompFormat.Default,
							identity, // nsIMsgIdentity identity
							msgWindow);
						log.debug("after compose");
					} catch (e) {
						log.error(e);
						return;
					}

					// remove argument so it is not handled by nsMailDefaultHandler
					if (fileFlagPos !== -1) {
						// remove file flag and uri parameter
						cmdLine.removeArguments(fileFlagPos, fileFlagPos+1);
					} else {
						// remove uri
						cmdLine.removeArguments(i, i);
					}
					cmdLine.preventDefault = true;

					// if now window is currently open
					if (!Services.wm.getMostRecentWindow(null)) {
						log.debug("no open window");
						// prevent shutdown
						log.debug("enterLastWindowClosingSurvivalArea");
						Services.startup.enterLastWindowClosingSurvivalArea();
						// eslint-disable-next-line no-new
						new DocumentOpendObserver();
					}
				}
			}
		}
	},
};

var NSGetFactory = XPCOMUtils.generateNSGetFactory([CommandLineHandler]);
