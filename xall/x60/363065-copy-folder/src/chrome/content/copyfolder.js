/**
 * Copy Folder Thunderbird Plugin
 *
 * @version copyfolder.js v2.1
 * @copyright Copyright(c) 2014 Jonathan Wolinsky
 * @author Jonathan Wolinsky <jwolinsky@gmail.com>
 * @author Steven Hartland <steven.hartland@multiplay.co.uk>
 */

if(!com) var com = {};
if(!com.crunchmod) com.crunchmod = {};

Components.utils.import('resource:///modules/mailServices.js');
Components.utils.import("resource:///modules/MailUtils.js");
Components.utils.import('resource:///modules/iteratorUtils.jsm');
Components.utils.import("resource:///modules/folderUtils.jsm");

com.crunchmod.copyfolder = {
	logLevel: 4, // 1: Error, 2: Warn, 3: Info, 4+: Debug

	/**
	 * Initiates plugin
	 *
	 * @return void
	 */
	init: function() {
		// remove onLoad listener and set attributes
		window.removeEventListener('load', com.crunchmod.copyfolder.init, false);
		com.crunchmod.copyfolder.statusBar = document.getElementById('statusbar-progresspanel');
		com.crunchmod.copyfolder.progressMeter = document.getElementById('statusbar-icon');
		com.crunchmod.copyfolder.copyfolderStatus = document.getElementById('copyfolder-status');

		// create datasources for "Copy To" menuitem
		let menu = document.getElementById('folderPaneContext-copyfolder');
		if (menu) {
			let prefix = "@mozilla.org/rdf/datasource;1?name=";
			let nsIRDFDataSource = Components.interfaces.nsIRDFDataSource;
			let accountManagerDataSource = Components.classes[prefix + "msgaccountmanager"].getService(nsIRDFDataSource);
			let folderDataSource = Components.classes[prefix + "mailnewsfolders"].getService(nsIRDFDataSource);

			menu.database.AddDataSource(accountManagerDataSource);
			menu.database.AddDataSource(folderDataSource);
			menu.setAttribute('ref', 'msgaccounts:/');
		}
	},

	/**
	 * Backward compatibility for old getMsgFolderFromUri global function
	 *
	 * @param uri the URI to convert into a folder
	 * @param checkFolderAttributes whether to check that the folder either has
	 *								a parent or isn't a server
	 * @returns the nsIMsgFolder corresponding to this URI, or null if
	 *			aCheckFolderAttributes is true and the folder doesn't have a
	 *			parent or is a server
	 */
	getMsgFolderFromUri: function(uri, checkFolderAttributes) {
		let msgfolder = null;

		if (typeof MailUtils != 'undefined' && MailUtils.getFolderForURI) {
			return MailUtils.getFolderForURI(uri, checkFolderAttributes);
		}

		try {
			let resource = GetResourceFromUri(uri);
			msgfolder = resource.QueryInterface(Components.interfaces.nsIMsgFolder);
			if (checkFolderAttributes) {
				if (!(msgfolder && (msgfolder.parent || msgfolder.isServer))) {
					msgfolder = null;
				}
			}
		} catch (ex) {
			com.crunchmod.copyfolder.logError('Failed to get the folder resource: ' + ex);
		}

		return msgfolder;
	},

	/**
	 * Log an error with a timestamp
	 *
	 * @param string msg the message to log
	 * @return void
	 */
	logError: function(msg) {
		com.crunchmod.copyfolder.logAtLevel(1, msg);
	},

	/**
	 * Log a warning with a timestamp
	 *
	 * @param string msg the message to log
	 * @return void
	 */
	logWarn: function(msg) {
		com.crunchmod.copyfolder.logAtLevel(2, msg);
	},

	/**
	 * Log a message with a timestamp
	 *
	 * @param string msg the message to log
	 * @return void
	 */
	logInfo: function(msg) {
		com.crunchmod.copyfolder.logAtLevel(3, msg);
	},

	/**
	 * Log a debug message with a timestamp
	 *
	 * @param int lvl debug level
	 * @param string msg the message to log
	 * @return void
	 */
	logDebug: function(lvl, msg) {
		com.crunchmod.copyfolder.logAtLevel(lvl + 3, msg);
	},

	/**
	 * Log a message at a level with a timestamp
	 *
	 * @param int lvl debug level
	 * @param string msg the message to log
	 * @return void
	 */
	logAtLevel: function(lvl, msg) {
		if (lvl > com.crunchmod.copyfolder.logLevel) {
			return;
		}

		let logFunc;
		
		switch(lvl) {
			case 1: // Error
				logFunc = Components.utils.reportError;
				break;
			case 2: // Warning
				// TODO(steve): Should be a warning but that doesn't seem possible.
				// FALLTHROUGH
			case 3: // Info
				// FALLTHROUGH
			default: // Debug
				// TODO(steve): Should be a debug but that doesn't seem possible.
				logFunc = Application.console.log;
				break;
		}

		logFunc(new Date().toUTCString() + ': ' + msg);
	},

	/**
	 * Shows confirmation dialog for a copy
	 *
	 * @param nsIMsgFolder Destination folder.
	 * @return void
	 */
	copyDialog: function(destFolderSelected) {
		return com.crunchmod.copyfolder.transferDialog(destFolderSelected, false);
	},

	/**
	 * Shows confirmation dialog for a move
	 *
	 * @param nsIMsgFolder Destination folder.
	 * @return void
	 */
	moveDialog: function(destFolderSelected) {
		return com.crunchmod.copyfolder.transferDialog(destFolderSelected, true);
	},

	/**
	 * Shows confirmation dialog for a move or copy
	 *
	 * @param nsIMsgFolder Destination folder.
	 * @param boolean is the transfer a move operation.
	 * @return void
	 */
	transferDialog: function(destFolderSelected, move) {
		let transfer = new com.crunchmod.copyfolder.transfer(
			gFolderTreeView.getSelectedFolders()[0],
			com.crunchmod.copyfolder.getMsgFolderFromUri(destFolderSelected.getAttribute('id')),
			move
		);

		transfer.calculateAndConfirm();
	},

	/**
	 * Sets status message
	 *
	 * @param string Status message text.
	 * @return void
	 */
	setStatus: function(text) {
		if (text === null) {
			com.crunchmod.copyfolder.copyfolderStatus.setAttribute('collapsed', true);
			return;
		}
		com.crunchmod.copyfolder.copyfolderStatus.setAttribute('collapsed', false);
		com.crunchmod.copyfolder.copyfolderStatus.setAttribute('label', text);
	},

	/**
	 * Creates a transfer
	 *
	 * @param nsIMsgFolder srcFolder Folder to copy messages from.
	 * @param nsIMsgFolder destFolder Folder to copy messages to.
	 * @param boolean is the transfer a move operation.
	 * @return transfer object
	 */
	transfer: function(srcFolder, destParent, move) {
		var oSrcFolder = srcFolder;
		var oDestParent = destParent;
		var bMove = move;
		var iSuccessCount = 0;
		var iFailedCount = 0;
		var iInflightCount = 0;
		var iCopyCount = 0
		var iSrcNewCount = 0;
		var iSrcTotalCount = 0;
		var iDestTotalCount = 0;
		var iRef = 0;
		var iCompareFolderMissing = 0;
		var copyService = null;
		var notifyService = null;
		var pendingFolderCreates = {};
		var createdFolders = {};
		var pendingFolders = [];
		var inflightMsgs = {};
		var failedTransfers = {};
		var srcFolderEnumerator = null;
		var destFolderEnumerator = null;
		var lastSrcFolder = null;
		var iHashSeed = 92562;
		var transferWatchdogInterval = null;
		var dLastTransferCallback = null;
		var dLastTransferCallbackComplete = null;
		var bAborted = false;
		var bRetried = false;
		var batchTimeout = null;
		var folderTotals = {
			copies: 0,
			successes: 0,
			failures: 0,
			retries: 0
		};

		// TODO(steve): make these settings extension preferences
		var iInflightMin = 5;
		var iInflightMax = 10;
		var iTransferWatchdogWarning = 300000;
		var iTransferWatchdogRetry = 600000;
		var iTransferWatchdogAbort = 900000;
		var iCompareBatchMax = 500;
		var iMaxRetries = 5;
		var iBatchGap = 150;

		/**
		 * Returns the passed string with the first letter capitalised.
		 *
		 * @param string msg
		 * @return string
		 */
		var capitalize = function(msg) {
			return msg.charAt(0).toUpperCase() + msg.slice(1);
		};

		/**
		 * Returns the action verb optionally capitalised
		 *
		 * @param bool bCaptialize if true capitalize the
		 * @return string
		 */
		var actionVerb = function(bCapitalize) {
			let verb = bMove ? 'move' : 'copy';
			if (bCapitalize) {
				return capitalize(verb);
			}

			return verb;
		};

		/**
		 * Returns the success verb optionally capitalised
		 *
		 * @param bool bCaptialize if true capitalize the
		 * @return string
		 */
		var successVerb = function(bCapitalize) {
			let verb = bMove ? 'moved' : 'copied';
			if (bCapitalize) {
				return capitalize(verb);
			}

			return verb;
		};

		/**
		 * Returns the path of the aFolder
		 *
		 * @param nsIMsgFolder aFolder Folder to return the path of.
		 * @param nsIMsgFolder aSubFolder optional sub folder.
		 * @return string
		 */
		var folderPath = function(aFolder, aSubFolder) {
			// We should the able to use relativePathName but its always blank.
			let parts = [];
			if (typeof aSubFolder !== 'undefined') {
				parts.unshift(aSubFolder.prettiestName);
			}

			while (aFolder !== null) {
				parts.unshift(aFolder.prettiestName);
				aFolder = aFolder.parent;
			}

			return parts.join('/');
		};

		/**
		 * Returns the count messages in aFolder, optionally including sub folders
		 *
		 * @param nsIMsgFolder aFolder Folder to return the count of.
		 * @param bool bRecurse include sub folder counts.
		 * @return int
		 */
		var folderMessageCount = function(aFolder, bRecurse) {
			// We need a de-duplicated count not a raw one and also nsIMsgFolder.getTotalMessages doesn't
			// always agree with the number of messages we can enumerate from the folder so we use our
			// uniqueMsgEnumerator instead..
			let cnt = uniqueMsgEnumerator(aFolder).msgTotal();
			if (bRecurse && aFolder.hasSubFolders) {
				for each (let subFolder in fixIterator(aFolder.subFolders, Components.interfaces.nsIMsgFolder)) {
					cnt += folderMessageCount(subFolder, bRecurse);
				}
			}

			return cnt;
		};

		/**
		 * JS Implementation of MurmurHash3 (r136) (as of May 20, 2011)
		 *
		 * @author Gary Court <gary.court@gmail.com>
		 * @see http://github.com/garycourt/murmurhash-js
		 * @author Austin Appleby <aappleby@gmail.com>
		 * @see http://sites.google.com/site/murmurhash/
		 *
		 * @param {string} key ASCII only
		 * @param {number} seed Positive integer only
		 * @return {number} 32-bit positive integer hash
		 */
		var murmurhash3 = function (key, seed) {
			let remainder, bytes, h1, h1b, c1, c1b, c2, c2b, k1, i;

			remainder = key.length & 3; // key.length % 4
			bytes = key.length - remainder;
			h1 = seed;
			c1 = 0xcc9e2d51;
			c2 = 0x1b873593;
			i = 0;

			while (i < bytes) {
				k1 =
				  ((key.charCodeAt(i) & 0xff)) |
				  ((key.charCodeAt(++i) & 0xff) << 8) |
				  ((key.charCodeAt(++i) & 0xff) << 16) |
				  ((key.charCodeAt(++i) & 0xff) << 24);
				++i;

				k1 = ((((k1 & 0xffff) * c1) + ((((k1 >>> 16) * c1) & 0xffff) << 16))) & 0xffffffff;
				k1 = (k1 << 15) | (k1 >>> 17);
				k1 = ((((k1 & 0xffff) * c2) + ((((k1 >>> 16) * c2) & 0xffff) << 16))) & 0xffffffff;

				h1 ^= k1;
				h1 = (h1 << 13) | (h1 >>> 19);
				h1b = ((((h1 & 0xffff) * 5) + ((((h1 >>> 16) * 5) & 0xffff) << 16))) & 0xffffffff;
				h1 = (((h1b & 0xffff) + 0x6b64) + ((((h1b >>> 16) + 0xe654) & 0xffff) << 16));
			}

			k1 = 0;

			switch (remainder) {
				case 3: k1 ^= (key.charCodeAt(i + 2) & 0xff) << 16;
				case 2: k1 ^= (key.charCodeAt(i + 1) & 0xff) << 8;
				case 1: k1 ^= (key.charCodeAt(i) & 0xff);

				k1 = (((k1 & 0xffff) * c1) + ((((k1 >>> 16) * c1) & 0xffff) << 16)) & 0xffffffff;
				k1 = (k1 << 15) | (k1 >>> 17);
				k1 = (((k1 & 0xffff) * c2) + ((((k1 >>> 16) * c2) & 0xffff) << 16)) & 0xffffffff;
				h1 ^= k1;
			}

			h1 ^= key.length;

			h1 ^= h1 >>> 16;
			h1 = (((h1 & 0xffff) * 0x85ebca6b) + ((((h1 >>> 16) * 0x85ebca6b) & 0xffff) << 16)) & 0xffffffff;
			h1 ^= h1 >>> 13;
			h1 = ((((h1 & 0xffff) * 0xc2b2ae35) + ((((h1 >>> 16) * 0xc2b2ae35) & 0xffff) << 16))) & 0xffffffff;
			h1 ^= h1 >>> 16;

			return h1 >>> 0;
		};

		/**
		 * Returns an identifier for the message
		 *
		 * @param nsIMsgDBHdr msgHdr
		 * @return string
		 */
		var messageHashCode = function(msgHdr, bIncludeDate) {
			// messageSize and lineCount vary on Gmail, they seem to include the headers when it shouldn't so we cant use them.
			// Messages going through different routes could be the same but have different case on the recipients.
			let parts = [
				msgHdr.subject,
				// subject has re: stripped so include that flag too.
				msgHdr.flags & Components.interfaces.nsMsgMessageFlags.HasRe,
				// This can cause multiple copies as messages can exist without a Date header, which when copied get a new date.
				msgHdr.ccList,
				msgHdr.bccList,
				msgHdr.author,
				msgHdr.recipients
			];

			if (bIncludeDate) {
				parts.push(msgHdr.dateInSeconds);
			}

			// At least when copying to Gmail:
			// * subject gets tabs replaced by spaces on copy
			// * ccList, bccList and author sometimes have multi spaces removed.
			// So we perform a cleanup before hashing to prevent issues.
			return murmurhash3(parts.join(':').replace(/\s+/gm, ' '), iHashSeed);
		};

		/**
		 * Returns true if the msgHdr has an md5 based messageId
		 *
		 * @param nsIMsgDBHdr msgHdr
		 * @return bool
		 */
		var hasMd5Id = function(msgHdr) {
			return msgHdr.messageId.substring(0, 4) == "md5:";
		};

		/**
		 * Searches for message in folder
		 *
		 * @param nsIMsgFolder folder
		 * @param nsIMsgDBHdr msgHdr
		 * @return boolean
		 */
		messageExists = function(folder, msgHdr) {
			if (folder === null) {
				return false;
			}

			if (destFolderEnumerator !== null && destFolderEnumerator.msgTotal() === 0) {
				return false;
			}

			let bExists = false;
			try {
				let msgDB = folder.msgDatabase;
				if (msgDB === null) {
					return false;
				}

				if (msgDB.getMsgHdrForMessageID(msgHdr.messageId) != null) {
					bExists = true;
				} else if (hasMd5Id(msgHdr)) {
					// md5 based messageId's aren't maintained across copies so this message could still exist.
					if (destFolderEnumerator === null) {
						destFolderEnumerator = uniqueMsgEnumerator(folder, true);
					}

					bExists = destFolderEnumerator.msgExists(msgHdr);
				}
				// Close the db according to:
				// http://mdn.beonex.com/en/Extensions/Thunderbird/HowTos/Common_Thunderbird_Use_Cases/Open_Folder.html
				folder.msgDatabase = null;
			} catch (ex) {
				// TODO(steve): deal with better e.g. force an update?
				com.crunchmod.copyfolder.logError("Failed to check if message exists: ex: " + ex);
			}

			if (!bExists) {
				com.crunchmod.copyfolder.logDebug(5, "messageExists: folder: " + folder.prettiestName + ", messageId: " + msgHdr.messageId + ", subject: " + msgHdr.subject + ", dateInSeconds: " + msgHdr.dateInSeconds + ", date: " + msgHdr.date + " => " + bExists);
			}

			return bExists;
		};

		/**
		 * Schedule a batch after the batch gap.
		 *
		 * @param function processFunc see processBatch
		 * @param function completeFunc see processBatch
		 * @param function abortedFunc see processBatch
		 * @return void
		 */
		var scheduleBatch = function(processFunc, completeFunc, abortedFunc) {
			if (batchTimeout) {
				window.clearTimeout(batchTimeout);
			}
			batchTimeout = window.setTimeout(processBatch.bind(this, processFunc, completeFunc, abortedFunc), iBatchGap);
		};

		/**
		 * Compare a batch of messages between two folders.
		 *
		 * @param nsIMsgFolder srcFolder
		 * @param nsIMsgFolder destParent
		 * @return void
		 */
		var compareFolderBatch = function(srcFolder, destFolder) {
			if (srcFolderEnumerator === null) {
				iCompareFolderMissing = 0;
				srcFolderEnumerator = uniqueMsgEnumerator(srcFolder);

				// Update the status and schedule a retry to prevent long running script warnings.
				com.crunchmod.copyfolder.setStatus('Comparing ' + folderPath(srcFolder) + ' messages...');
				scheduleBatch.call(this, compareFolderBatch, confirmDialog, null);

				return false;
			}

			if (destFolder !== null) {
				if (destFolderEnumerator === null) {
					destFolderEnumerator = uniqueMsgEnumerator(destFolder, true);
				}

				// Pre load destination folder in batches to avoid stalls
				let batchCount = 0;
				let msgHdr;
				while (msgHdr = destFolderEnumerator.nextMsg()) {
					// nextMsg can process more than it returns so use the count as the batch increment
					batchCount += destFolderEnumerator.nextProcessedCnt();
					if (batchCount >= iCompareBatchMax) {
						com.crunchmod.copyfolder.setStatus('Comparing ' + folderPath(srcFolder) + ' loaded ' + destFolderEnumerator.msgCount() + ' target messages...');
						scheduleBatch.call(this, compareFolderBatch, confirmDialog, null);

						return false;
					}
				}
			}

			let batchCount = 0;
			let msgHdr;
			while (msgHdr = srcFolderEnumerator.nextMsg()) {
				// nextMsg can process more than it returns so use the count as the batch increment
				batchCount += srcFolderEnumerator.nextProcessedCnt();
				if (!messageExists(destFolder, msgHdr)) {
					iCompareFolderMissing++;
				}

				if (batchCount >= iCompareBatchMax) {
					com.crunchmod.copyfolder.setStatus('Comparing ' + folderPath(srcFolder) + ' processed ' +  srcFolderEnumerator.msgCount() + ' messages...');
					scheduleBatch.call(this, compareFolderBatch, confirmDialog, null);

					return false;
				}
			}

			let srcCnt = srcFolderEnumerator.msgTotal();
			let destCnt = (destFolder === null) ? 0 : destFolderEnumerator.msgTotal();

			iDestTotalCount += destCnt;
			iSrcTotalCount += srcCnt;
			iSrcNewCount += iCompareFolderMissing;

			com.crunchmod.copyfolder.logDebug(
				1,
				"folderCompare: folder: " + folderPath(srcFolder) +
				", source: " + srcCnt +
				", dest: " + destCnt +
				", diff: " + (srcCnt - destCnt) +
				", missing: " + iCompareFolderMissing +
				", srcDups: " + srcFolderEnumerator.duplicateTotal() +
				", destDups: " + ((destFolder === null) ? 0 : destFolderEnumerator.duplicateTotal())
			);

			// Clean / reset out enumerators so we free up the memory
			srcFolderEnumerator = null;
			destFolderEnumerator = null;

			return true;
		};

		/**
		 * Estimates messages in srcFolder that need to be tranfered to destFolder
		 *
		 * @param nsIMsgFolder srcFolder
		 * @param nsIMsgFolder destParent
		 * @return void
		 */
		var estimateFolders = function(srcFolder, destParent) {
			// Build the folder tree
			iRef++;
			let destFolder;
			if (destParent === null || !destParent.containsChildNamed(srcFolder.prettiestName)) {
				destFolder = null;
			} else {
				destFolder = destParent.getChildNamed(srcFolder.prettiestName);
			}
			pendingFolders.push({srcFolder: srcFolder, destFolder: destFolder});

			if (srcFolder.hasSubFolders) {
				for each (let subFolder in fixIterator(srcFolder.subFolders, Components.interfaces.nsIMsgFolder)) {
					estimateFolders.call(this, subFolder, destFolder);
				}
			}

			iRef--;
			if (iRef != 0) {
				return;
			}

			com.crunchmod.copyfolder.setStatus('Preparing to ' + actionVerb() + " " + iSrcNewCount + " messages...");

			// Batch creation complete so kick off the compare.
			iRef++;
			processBatch.call(this, compareFolderBatch, confirmDialog, null);
		};

		/**
		 * Displays the user transfer confirmation dialog
		 *
		 * @return void
		 */
		var confirmDialog = function() {
			let question = '';
			if (iSrcNewCount > 0) {
				question = "<vbox><label><html:div>" + actionVerb(true) + " " + iSrcNewCount + " new messages from: <html:div style='padding:5px 10px; font-weight:bold;'>" +
					folderPath(oSrcFolder) +
					"</html:div> to: <html:div style='padding:5px 10px; font-weight:bold;'>" +
					folderPath(oDestParent, oSrcFolder) +
					"</html:div></html:div></label></vbox>";
			} else {
				question = "<vbox><label><html:div>There are no new messages to " + actionVerb() + ".</html:div></label></vbox>";
			}

			let warning = '';
			if (oDestParent.containsChildNamed(srcFolder.prettiestName)) {
				warning = "<vbox><html:div style='margin: 0 3px 2px 3px; background: #3D9EFE; padding: 5px 10px; border: solid 1px #0A88FE; color: #FFF;'>The destination already contains a folder named \"<html:span style='font-weight: bold;'>" +
					oSrcFolder.prettiestName +
					"</html:span>\"</html:div></vbox>";
			}

			com.crunchmod.copyfolder.setStatus(null);
			com.crunchmod.copyfolder.logDebug(1, "confirmDialog: action: " + actionVerb(true) + ", iSrcTotalCount: " + iSrcTotalCount + ", iSrcNewCount: " + iSrcNewCount + ", iDestTotalCount: " + iDestTotalCount + ", diff: " + (iSrcTotalCount - iDestTotalCount));

			params = {
				title: oSrcFolder.prettiestName,
				srcFolderInfo: iSrcTotalCount + " messages" + ((iSrcNewCount != 0) ? (" (" + iSrcNewCount + " new)") : ''),
				destFolderInfo: iDestTotalCount + ' messages',
				newMessages: iSrcNewCount,
				warning: warning,
				question: question
			};

			window.openDialog("chrome://copyfolder/content/copyfolder-dialog.xul", "copyfolder-dialog", "chrome, dialog, centerscreen, modal", params).focus();

			if (iSrcNewCount && params.ok) {
				process.call(this);
			}
		};

		/**
		 * Calculates the folder differences and the displays the transfer confirmation dialog.
		 *
		 * @return void
		 */
		var calculateAndConfirm = function() {
			com.crunchmod.copyfolder.setStatus('Searching for new messages to ' + actionVerb() + '...');
			// Run the calculate after a small delay to allow the UI to update the status.
			var calculateFunc = function() {
				estimateFolders.call(this, oSrcFolder, oDestParent);
			};
			window.setTimeout(calculateFunc.bind(this), iBatchGap);
		};

		/**
		 * Sets progress bar percentage and displays the summary dialog if completed
		 *
		 * @param int Percent of messages copied relative to total messages in account.
		 * @return void
		 */
		var setProgress = function() {
			let processed = (iFailedCount + iSuccessCount);
			if (processed > iSrcNewCount) {
				iSrcNewCount = processed;
			}
			com.crunchmod.copyfolder.statusBar.setAttribute('collapsed', false);
			com.crunchmod.copyfolder.progressMeter.setAttribute('mode', 'normal');
			com.crunchmod.copyfolder.progressMeter.setAttribute('value', (processed / iSrcNewCount) * 100);
			com.crunchmod.copyfolder.setStatus('Processed ' + processed + ' of ' + iSrcNewCount + ' messages');
			checkDone.call(this);
		};


		/**
		 * Transfers a messages from to destination folder.
		 *
		 * @param nsIMsgFolder destFolder Folder to transfer messages to.
		 * @param nsIMsgDBHdr msgHdr message to transfer.
		 * @return bool true if the transfer queued successfully false otherwise.
		 */
		var transferMessage = function(destFolder, msgHdr) {
			let messages;
			try {
				messages = Components.classes['@mozilla.org/array;1'].createInstance(Components.interfaces.nsIMutableArray);
				messages.appendElement(msgHdr, false);
				// We use copyService as nsIMsgFolder.copyMessages doesn't trigger the OnStopCopy callback.
				copyService.CopyMessages(msgHdr.folder, messages, destFolder, bMove, copyListener(this, msgHdr, destFolder), null, false);
			} catch (ex) {
				com.crunchmod.copyfolder.logError(
					"CopyMessages call failed: msgHdr: " + msgHdr +
					", folder:" + ((msgHdr) ? msgHdr.folder : 'N/A') +
					", messages: " + messages +
					", destFolder: " + destFolder +
					", ex: " + ex
				);
				return false;
			}

			iInflightCount++;
			inflightMsgs[msgHdr.messageId] = [destFolder, msgHdr];
			iCopyCount++;
			folderTotals.copies++;

			return true;
		};

		/**
		 * Return the string key for the message transfer.
		 *
		 * @param nsIMsgDBHdr msgHdr message.
		 * @param nsIMsgFolder destFolder for the message.
		 * @return string
		 */
		var transferKey = function(msgHdr, destFolder) {
			return folderPath(destFolder) + '/' + msgHdr.messageId;
		};

		/**
		 * Stores information about failed transfers, retrying it needed.
		 *
		 * @param nsIMsgDBHdr msgHdr message to transfer.
		 * @param nsIMsgFolder destFolder to transfer messages to.
		 * @return void
		 */
		var transferSuccess = function(msgHdr, destFolder) {
			let key = transferKey(msgHdr, destFolder);
			if (failedTransfers.hasOwnProperty(key)) {
				// Retry succeeded.
				delete failedTransfers[key];
				iFailedCount--;
			}
			iSuccessCount++;
			folderTotals.successes++;
		};

		/**
		 * Stores information about failed transfers, retrying it needed.
		 *
		 * @param nsIMsgDBHdr msgHdr message to transfer.
		 * @param nsIMsgFolder destFolder Folder to transfer messages to.
		 * @return void
		 */
		var transferFailed = function(msgHdr, destFolder, status) {
			let key = transferKey(msgHdr, destFolder);
			let failure;
			if (failedTransfers.hasOwnProperty(key)) {
				failure = failedTransfers[key];
				failure.failed++;
			} else {
				failure = {
					msgHdr: msgHdr,
					destFolder: destFolder,
					failed: 1
				};
				failedTransfers[key] = failure;
				iFailedCount++;
			}
			folderTotals.failures++;

			let msg = "Failed to " + actionVerb() + " message (error code: " + status + ")\n" +
				"subject: " + msgHdr.subject + "\n" +
				"messageKey: " + msgHdr.messageKey + "\n" +
				"messageId: " + msgHdr.messageId + "\n" +
				"folder: " + folderPath(msgHdr.folder)

			if (failure.failed < iMaxRetries) {
				folderTotals.retries++;
				com.crunchmod.copyfolder.logWarn(msg + "\nretrying...");
				transferMessage.call(this, destFolder, msgHdr);
			} else {
				com.crunchmod.copyfolder.logError(msg);
			}
		};

		/*
		 * Provides nsIMsgCopyServiceListener interface methods for copy notifications.
		 */
		var copyListener = function(aTransfer, aMsgHdr, aDestFolder) {
			var transfer = aTransfer;
			var msgHdr = aMsgHdr;
			var destFolder = aDestFolder;

			return {
				OnStartCopy: function() {
					dLastTransferCallback = new Date();
				},
				OnProgress: function(aProgress, aProgressMax) {
					dLastTransferCallback = new Date();
				},
				SetMessageKey: function(aKey) {},
				GetMessageId: function(aMessageId) {},
				OnStopCopy: function(aStatus) {
					dLastTransferCallback = new Date();
					iInflightCount--;
					delete inflightMsgs[msgHdr.messageId];
					if (Components.isSuccessCode(aStatus)) {
						transferSuccess.call(transfer, msgHdr, destFolder);
					} else {
						transferFailed.call(transfer, msgHdr, destFolder, aStatus);
					}
					setProgress.call(transfer);
					if (iRef != 0 && iInflightCount <= iInflightMin && !bAborted) {
						processBatch.call(transfer, transferFolderBatch, checkDone, checkDone);
					}
					dLastTransferCallbackComplete = new Date();
					// If we got here we have potentially recovered from a stall so clear our retried flag.
					bRetried = false;
				}
			}
		};

		/**
		 * Returns a folder message enumerator that only returns unique messages according to messageHashCode.
		 *
		 * @param nsIMsgFolder aFolder Folder to iterate over.
		 * @return uniqueMsgEnumerator
		 */
		var uniqueMsgEnumerator = function(aFolder, bDateless) {
			var msgEnumerator = null;
			var seenHashCodes = {};
			var dateless = bDateless
			var msgCnt = 0;
			var duplicates = 0;
			var getNextProcessedCnt = 0;

			// nsIMsgFolder.messages can throw exceptions e.g. error: 0x80550005 (NS_MSG_ERROR_FOLDER_SUMMARY_OUT_OF_DATE)
			// if it does so catch it, inform the user and abort as the results would be invalid if we let it continue
			try {
				msgEnumerator = aFolder.messages;
			} catch (ex) {
				let msg = 'Failed get messages from: ' + folderPath(aFolder)+ ' aborting!';
				com.crunchmod.copyfolder.setStatus(msg);
				com.crunchmod.copyfolder.logError(msg);
				alert(msg);

				com.crunchmod.copyfolder.setStatus(null);
				com.crunchmod.copyfolder.statusBar.setAttribute('collapsed', true);

				// Flag aborted in case we have any scheduled timeouts.
				abortTransfer();

				throw ex;
			}

			var getNext = function() {
				getNextProcessedCnt = 0;
				while (msgEnumerator.hasMoreElements()) {
					getNextProcessedCnt++;
					let msgHdr = msgEnumerator.getNext().QueryInterface(Components.interfaces.nsIMsgDBHdr);
					let hashCode = messageHashCode(msgHdr, true);
					if (!seenHashCodes.hasOwnProperty(hashCode)) {
						let detail = {msgHdr: msgHdr, hashCode: hashCode, datelessHashCode: null};
						seenHashCodes[hashCode] = true
						if (dateless) {
							let datelessHashCode = messageHashCode(msgHdr, false);
							if (seenHashCodes.hasOwnProperty(datelessHashCode)) {
								seenHashCodes[datelessHashCode] = false;
							} else {
								seenHashCodes[datelessHashCode] = true;
							}
							detail.datelessHashCode = datelessHashCode;
						}

						if (hasMd5Id(msgHdr)) {
							// md5 hashes are location specific so don't bother checking it
							msgCnt++;
							return detail;
						}

						var messageIdHashCode = murmurhash3(msgHdr.messageId, iHashSeed);
						if (!seenHashCodes.hasOwnProperty(messageIdHashCode)) {
							seenHashCodes[messageIdHashCode] = true;
							msgCnt++;
							return detail;
						}
					} else {
						duplicates++;
					}
				}

				return null;
			};

			var nextMsg = function() {
				let aMsgDetail = getNext();
				if (aMsgDetail === null) {
					return null;
				}

				return aMsgDetail.msgHdr;
			};

			var msgExists = function(aMsgHdr) {
				enumerate();
				if (msgCnt === 0) {
					return false;
				}

				if (seenHashCodes.hasOwnProperty(messageHashCode(aMsgHdr, true))) {
					return true;
				}

				if (!dateless) {
					return false;
				}

				let datelessHashCode = messageHashCode(aMsgHdr, false);
				if (seenHashCodes.hasOwnProperty(datelessHashCode)) {
					return seenHashCodes[datelessHashCode];
				}

				return false;
			};

			var enumerate = function() {
				while (getNext()) {
				}
			};

			var msgCount = function() {
				return msgCnt;
			};

			var msgTotal = function() {
				enumerate();
				return msgCnt;
			};

			var duplicateTotal = function() {
				enumerate();
				return duplicates;
			};

			var nextProcessedCnt = function() {
				return getNextProcessedCnt;
			};

			return {
				getNext: getNext,
				nextMsg: nextMsg,
				msgExists: msgExists,
				msgCount: msgCount,
				msgTotal: msgTotal,
				enumerate: enumerate,
				duplicateTotal: duplicateTotal,
				nextProcessedCnt: nextProcessedCnt
			}
		}

		/**
		 * Transfers a batch from messages from source folder to destination folder.
		 *
		 * @param nsIMsgFolder srcFolder Folder to transfer messages from.
		 * @param nsIMsgFolder destFolder Folder to transfer messages to.
		 * @return bool true if we completed this folder, false if there is more to go
		 */
		var transferFolderBatch = function(srcFolder, destFolder) {
			if (srcFolderEnumerator === null) {
				srcFolderEnumerator = uniqueMsgEnumerator(srcFolder);
			}
			if (destFolderEnumerator === null) {
				destFolderEnumerator = uniqueMsgEnumerator(destFolder, true);
			}

			// Pre load destination folder in batches to avoid stalls
			let batchCount = 0;
			let msgHdr;
			while (msgHdr = destFolderEnumerator.nextMsg()) {
				// nextMsg can process more than it returns so use the count as the batch increment
				batchCount += destFolderEnumerator.nextProcessedCnt();
				if (batchCount >= iCompareBatchMax) {
					com.crunchmod.copyfolder.setStatus('Transfer ' + folderPath(srcFolder) + ' loaded ' + destFolderEnumerator.msgCount() + ' target messages...');
					scheduleBatch.call(this, transferFolderBatch, checkDone);

					return false;
				}
			}

			batchCount = 0;
			while ((msgHdr = srcFolderEnumerator.nextMsg()) && !bAborted) {
				batchCount += srcFolderEnumerator.nextProcessedCnt();
				if (folderWasCreated(destFolder) || !messageExists(destFolder, msgHdr)) {
					transferMessage.call(this, destFolder, msgHdr);

					if (iInflightCount == iInflightMax) {
						// Reached the max inflight so return
						return false;
					}
				}

				if (batchCount >= iCompareBatchMax) {
					// Prevent timeout when processing folders with lots of existing messages.
					com.crunchmod.copyfolder.setStatus('Transfer ' + folderPath(srcFolder) + ' checked ' + destFolderEnumerator.msgCount() + ' messages...');
					scheduleBatch.call(this, transferFolderBatch, checkDone);

					return false;
				}
			}

			com.crunchmod.copyfolder.logInfo(
				"transferFolderBatch: folder: " + folderPath(destFolder) +
				", successes: " + folderTotals.successes +
				", failures: " + folderTotals.failures +
				", copies: " + folderTotals.copies +
				", retries: " + folderTotals.retries +
				", expected: " + srcFolderEnumerator.msgTotal() +
				", inflight: " + iInflightCount +
				", bAborted: " + bAborted +
				", have (so far): " + folderMessageCount(destFolder, false)
			);

			folderTotals.failures = 0;
			folderTotals.successes = 0;
			folderTotals.copies = 0;
			folderTotals.retries = 0;

			// clean out hash codes cache
			srcFolderEnumerator = null;
			destFolderEnumerator = null

			try {
				// Update the folder so hopefully if the user runs a second time they get the right results.
				// TODO(steve): make this a configable option as doing it by default can cause the TB to become
				// really unresponsive.
				//destFolder.setFlag(Components.interfaces.nsMsgFolderFlags.CheckNew);
				destFolder.updateFolder(null);
				// Force update summary totals from db too.
				destFolder.updateSummaryTotals(true);
			} catch (ex) {
				com.crunchmod.copyfolder.logError("Failed to update " + folderPath(updateFolder) + ": " + ex);
			}

			return true;
		};

		/**
		 * Flag the transfer as aborted and cleanup
		 *
		 * @return void
		 */
		var abortTransfer = function() {
			bAborted = true;
			window.clearInterval(transferWatchdogInterval);
		}

		/**
		 * Displays the summary dialog if completed and collapses the statuses areas
		 *
		 * @return void
		 */
		var transferWatchdog = function() {
			let now = new Date();
			let timeDiff = now.getTime() - dLastTransferCallback.getTime();
			if (timeDiff > iTransferWatchdogWarning) {
				let errMsg = "No transfer callback since: last: " + dLastTransferCallback.toUTCString() +
					", diff: " + timeDiff +
					", now: " + now.toUTCString() +
					", last complete: " +  dLastTransferCallback.toUTCString() +
					", iRef: " + iRef +
					", iInflightCount: " + iInflightCount +
					", iSuccessCount: " + iSuccessCount +
					", iFailedCount: " + iFailedCount;

				if (timeDiff > iTransferWatchdogAbort) {
					// Unfortunately it seems like the nsIMsgCopyService does just stop responding or at
					// least stops calling the nsIMsgCopyServiceListener function.
					//
					// At this point we've already retried so there's nothing more we can do :(
					com.crunchmod.copyfolder.logError(errMsg + " aborting...");
					iFailedCount = iSrcNewCount - iSuccessCount;
					abortTransfer();
					checkDone.call(this);
				} else if (timeDiff > iTransferWatchdogRetry && !bRetried) {
					com.crunchmod.copyfolder.logError(errMsg + " retrying...");

					// Rety the inflight transfers to see if it fixes the stall.
					var inflightCopy = {};
					for (let key in inflightMsgs) {
						inflightCopy[key] = inflightMsgs[key];
					}
					inflightMsgs = {};
					iInflightCount = 0;

					for (let key in inflightCopy) {
						var entry = inflightCopy[key];
						if (!transferMessage.call(this, entry[0], entry[1]) && bAborted) {
							break;
						}
					}
					bRetried = true;
				} else {
					com.crunchmod.copyfolder.logError(errMsg);
				}
			}
		};

		/**
		 * Displays the summary dialog if completed and collapses the statuses areas
		 *
		 * @return void
		 */
		var checkDone = function() {
			if ((iRef != 0 || iInflightCount != 0) && !bAborted) {
				return;
			}
			
			window.clearInterval(transferWatchdogInterval);
			notifyService.removeListener(this);
			
			let status = '<html:img src="chrome://copyfolder/skin/images/success.png" style="vertical-align: bottom;" /> Success';
			let summary = successVerb(true) + ' ' + iSuccessCount + ' message(s) successfully';
			
			if (iFailedCount) {
				summary += ', failed ' + iFailedCount + ' message(s)';
			}
			
			let summaryDisplay = summary + ' from: <html:div style="padding:5px 10px; font-weight:bold;">' + folderPath(oSrcFolder) +
				'</html:div> to: <html:div style="padding:5px 10px; font-weight:bold;">' + folderPath(oDestParent, oSrcFolder) +
				'</html:div>';
			
			summary += ' from: ' + folderPath(oSrcFolder) + ' to: ' + folderPath(oDestParent, oSrcFolder);
				
			if (bAborted) {
				summary += " ABORTED!";
				summaryDisplay += " ABORTED!";
			}
			
			com.crunchmod.copyfolder.setStatus(summary);
			com.crunchmod.copyfolder.logInfo(summary);
			
			window.openDialog(
				"chrome://copyfolder/content/copyfolder-summary.xul",
				"copyfolder-summary",
				"chrome, dialog, modal, centerscreen",
				{status: status, summary: summaryDisplay}
			).focus();

			com.crunchmod.copyfolder.setStatus(null);
			com.crunchmod.copyfolder.statusBar.setAttribute('collapsed', true);
		};

		/**
		 * Creates a folder in the destination.
		 *
		 * @param nsIMsgFolder srcFolder Folder to copy messages from.
		 * @param nsIMsgFolder destParent Parent of where destination folder will be created.
		 * @return void
		 */
		var createFolder = function(aSrcFolder, aDestParent) {
			let path = folderPath(aDestParent, aSrcFolder);
			com.crunchmod.copyfolder.logDebug(2, "createFolder: path: " + path);
			pendingFolderCreates[path] = {srcFolder: aSrcFolder, destParent: aDestParent};
			aDestParent.createSubfolder(aSrcFolder.prettiestName, null);
		};

		/**
		 * Notified after a folder has been added via nsIMsgFolderNotificationService.
		 *
		 * @param aFolder The folder that has just been added
		 * @return void
		 */
		var folderAdded = function(aFolder) {
			let path = folderPath(aFolder);
			// Check that this is the folder we're interested in.
			if (pendingFolderCreates.hasOwnProperty(path)) {
				let aCreateFolder = pendingFolderCreates[path];
				delete pendingFolderCreates[path];
				// We use URI instead of path here to speed up the check by folderWasCreated.
				createdFolders[aFolder.URI] = true;
				iRef--;
				transferFolders.call(this, aCreateFolder.srcFolder, aCreateFolder.destParent);
			}
		};

		/**
		 * Returns true if we created this folder during the this transfer.
		 *
		 * @param aFolder The folder to check
		 * @return bool
		 */
		var folderWasCreated = function(aFolder) {
			return createdFolders.hasOwnProperty(aFolder.URI);
		};

		/**
		 * Iterates over the pending folder pairs, calling the passed function.
		 *
		 * @param function processFunc the function to call on each folder pair
		 * @param function completeFunc the function to call after all pairs have been processed
		 * @param function abortedFunc the function to call if processing is aborted
		 * @return void
		 */
		var processBatch = function(processFunc, completeFunc, abortedFunc) {
			while (pendingFolders.length != 0 && !bAborted) {
				let folders = pendingFolders[0];
				if (!processFunc.call(this, folders.srcFolder, folders.destFolder)) {
					// still more to go
					return;
				}
				pendingFolders.splice(0, 1);
			}
			iRef--;

			if (bAborted) {
				pendingFolders = [];
				if (abortedFunc !== null) {
					abortedFunc.call(this);
				}
				return;
			}

			if (completeFunc !== null) {
				completeFunc.call(this);
			}
		};

		/**
		 * Builds the list of folders to transfer ensuring all destination folders exist and then transfers them.
		 *
		 * @param nsIMsgFolder srcFolder Folder to create from.
		 * @param nsIMsgFolder destParent Parent of where destination folders will be created.
		 * @return void
		 */
		var transferFolders = function(srcFolder, destParent) {
			com.crunchmod.copyfolder.logDebug(2, "transferFolders: " + folderPath(srcFolder) + ", destParent: " + folderPath(destParent));
			iRef++;
			if (!destParent.containsChildNamed(srcFolder.prettiestName)) {
				// transferFolders will continue when the folder creation notification (folderAdded) fires.
				createFolder(srcFolder, destParent);
				return;
			}

			let destFolder = destParent.getChildNamed(srcFolder.prettiestName);
			pendingFolders.push({srcFolder: srcFolder, destFolder: destFolder});

			if (srcFolder.hasSubFolders) {
				for each (let subFolder in fixIterator(srcFolder.subFolders, Components.interfaces.nsIMsgFolder)) {
					transferFolders.call(this, subFolder, destFolder);
				}
			}
			iRef--;
			if (iRef != 0) {
				return;
			}

			com.crunchmod.copyfolder.setStatus('Preparing to ' + actionVerb() + " " + iSrcNewCount + " messages...");

			// Batch creation complete so kick off the transfer.
			iRef++;
			transferWatchdogInterval = window.setInterval(transferWatchdog.bind(this), 30000);
			dLastTransferCallback = new Date();
			dLastTransferCallbackComplete = new Date();
			processBatch.call(this, transferFolderBatch, checkDone, checkDone);
		};

		/**
		 * Processes the transfer
		 *
		 * @return void
		 */
		var process = function() {
			com.crunchmod.copyfolder.setStatus('Processing ' + actionVerb() + " between " + folderPath(oSrcFolder) + " and " + folderPath(oDestParent) + "...");
			copyService = Components.classes['@mozilla.org/messenger/messagecopyservice;1'].getService(Components.interfaces.nsIMsgCopyService);

			notifyService = Components.classes["@mozilla.org/messenger/msgnotificationservice;1"].getService(Components.interfaces.nsIMsgFolderNotificationService);
    		notifyService.addListener(this, notifyService.folderAdded);

			com.crunchmod.copyfolder.setStatus('Creating missing destination folders...');
			transferFolders.call(this, oSrcFolder, oDestParent);

			// Call done dialog in case we processed really quickly
			checkDone.call(this);
		};

		return {
			calculateAndConfirm: calculateAndConfirm,
			folderAdded: folderAdded
		};
	}
};

window.addEventListener('load', com.crunchmod.copyfolder.init, false);