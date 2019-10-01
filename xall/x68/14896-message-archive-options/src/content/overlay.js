/* global Services, MailUtils, MessageArchiver, getIdentityForHeader, FeedMessageHandler */

const { strftime } = ChromeUtils.import("chrome://messagearchiveoptions/content/strftime.js");

var messagearchiveoptions = {
	preferenceService: Cc["@mozilla.org/preferences-service;1"].getService(Ci.nsIPrefService).getBranch("extensions.messagearchiveoptions@eviljeff.com."),

	// cleidigh - use getStringPref for TB 60+
	get monthValue() { return this.preferenceService.getStringPref("monthstring"); },
	get yearValue() { return this.preferenceService.getStringPref("yearstring"); },

	get keyModifiers() {
		var modifiers = [];
		if (this.preferenceService.getBoolPref("key.shift")) modifiers.push("shift");
		if (this.preferenceService.getBoolPref("key.alt")) modifiers.push("alt");
		if (this.preferenceService.getBoolPref("key.control")) modifiers.push("accel");
		return modifiers;
	},

	onLoad: function () {

		// cleidigh - original approach modifies batch archive function to substitute
		// complex date strings for folder names.

		// Modify year and month folder names
		// cleidigh - use strftime from @tdoan to replace deprecated toLocaleFormat in TB 60+

		// archiveMessages moved to MessageArchiver.jsm in TB68
		try {
			BatchMessageMover.prototype.archiveMessages = messagearchiveoptions.archiveMessagesOverride60;
		} catch (error) {
			MessageArchiver.prototype.archiveMessages = messagearchiveoptions.archiveMessagesOverride;
		}

		this.migrateOldPrefs();
		this.observe("", "nsPref:changed", "");
	},

	observe: function (subject, topic, data) {
		// Application.console.log("MessageArchiveOptions:observe");
		if (topic !== "nsPref:changed") return;
		document.getElementById("key_archive").setAttribute("modifiers", this.keyModifiers.join(" "));
	},
	migrateOldPrefs: function () {
		var ps = this.preferenceService;
		if (ps.prefHasUserValue("mail.server.default.archive_granularity")) {
			ps.setIntPref("mail.identity.default.archive_granularity", ps.getIntPref("mail.server.default.archive_granularity"));
			ps.clearUserPref("mail.server.default.archive_granularity");
		}
	},

	archiveMessagesOverride60(aMsgHdrs) {

		if (!aMsgHdrs.length)
			return;

		const { strftime } = ChromeUtils.import("chrome://messagearchiveoptions/content/strftime.js");

		// console.debug('inside override 60');
		gFolderDisplay.hintMassMoveStarting();
		for (let i = 0; i < aMsgHdrs.length; i++) {
			let msgHdr = aMsgHdrs[i];

			let server = msgHdr.folder.server;

			// Convert date to JS date object.
			let msgDate = new Date(msgHdr.date / 1000);
			// let msgYear = msgDate.getFullYear().toString();
			// let monthFolderName = msgYear + "-" + (msgDate.getMonth() + 1).toString().padStart(2, "0");

			let msgYear = strftime.strftime(messagearchiveoptions.yearValue, msgDate).toString();
			let monthFolderName = strftime.strftime(messagearchiveoptions.monthValue, msgDate).toString();

			let archiveFolderURI;
			let archiveGranularity;
			let archiveKeepFolderStructure;

			let identity = getIdentityForHeader(msgHdr);

			if (!identity || FeedMessageHandler.isFeedFolder(msgHdr.folder)) {
				// If no identity, or a server (RSS) which doesn't have an identity
				// and doesn't want the default unrelated identity value, figure
				// this out based on the default identity prefs.
				let enabled = Services.prefs.getBoolPref(
					"mail.identity.default.archive_enabled"
				);
				if (!enabled)
					continue;

				archiveFolderURI = server.serverURI + "/Archives";
				archiveGranularity = Services.prefs.getIntPref(
					"mail.identity.default.archive_granularity"
				);
				archiveKeepFolderStructure = Services.prefs.getBoolPref(
					"mail.identity.default.archive_keep_folder_structure"
				);
			} else {
				if (!identity.archiveEnabled)
					continue;

				archiveFolderURI = identity.archiveFolder;
				archiveGranularity = identity.archiveGranularity;
				archiveKeepFolderStructure = identity.archiveKeepFolderStructure;
			}

			let copyBatchKey = msgHdr.folder.URI;
			if (archiveGranularity >= Ci.nsIMsgIdentity
				.perYearArchiveFolders)
				copyBatchKey += "\0" + msgYear;

			if (archiveGranularity >= Ci.nsIMsgIdentity
				.perMonthArchiveFolders)
				copyBatchKey += "\0" + monthFolderName;

			if (archiveKeepFolderStructure)
				copyBatchKey += msgHdr.folder.URI;

			// Add a key to copyBatchKey
			if (!(copyBatchKey in this._batches)) {
				this._batches[copyBatchKey] = {
					srcFolder: msgHdr.folder,
					archiveFolderURI,
					granularity: archiveGranularity,
					keepFolderStructure: archiveKeepFolderStructure,
					yearFolderName: msgYear,
					monthFolderName,
					messages: [],
				};
			}
			this._batches[copyBatchKey].messages.push(msgHdr);
		}
		MailServices.mfn.addListener(this, MailServices.mfn.folderAdded);

		// Now we launch the code iterating over all message copies, one in turn.
		this.processNextBatch();
	},

	archiveMessagesOverride(aMsgHdrs) {

		if (!aMsgHdrs.length)
			return;

		if (this.folderDisplay) {
			this.folderDisplay.hintMassMoveStarting();
		}
		for (let i = 0; i < aMsgHdrs.length; i++) {
			let msgHdr = aMsgHdrs[i];

			let server = msgHdr.folder.server;

			// Convert date to JS date object.
			let msgDate = new Date(msgHdr.date / 1000);

			// let msgYear = msgDate.getFullYear().toString();
			// let monthFolderName = msgYear + "-" + (msgDate.getMonth() + 1).toString().padStart(2, "0");

			let msgYear = strftime.strftime(messagearchiveoptions.yearValue, msgDate).toString();
			let monthFolderName = strftime.strftime(messagearchiveoptions.monthValue, msgDate).toString();

			let archiveFolderURI;
			let archiveGranularity;
			let archiveKeepFolderStructure;

			let identity = MailUtils.getIdentityForHeader(msgHdr);
			if (!identity || msgHdr.folder.server.type === "rss") {
				// If no identity, or a server (RSS) which doesn't have an identity
				// and doesn't want the default unrelated identity value, figure
				// this out based on the default identity prefs.
				let enabled = Services.prefs.getBoolPref(
					"mail.identity.default.archive_enabled"
				);
				if (!enabled)
					continue;

				archiveFolderURI = server.serverURI + "/Archives";
				archiveGranularity = Services.prefs.getIntPref(
					"mail.identity.default.archive_granularity"
				);
				archiveKeepFolderStructure = Services.prefs.getBoolPref(
					"mail.identity.default.archive_keep_folder_structure"
				);
			} else {
				if (!identity.archiveEnabled)
					continue;

				archiveFolderURI = identity.archiveFolder;
				archiveGranularity = identity.archiveGranularity;
				archiveKeepFolderStructure = identity.archiveKeepFolderStructure;
			}

			let copyBatchKey = msgHdr.folder.URI;
			if (archiveGranularity >= Ci.nsIMsgIdentity
				.perYearArchiveFolders)
				copyBatchKey += "\0" + msgYear;

			if (archiveGranularity >= Ci.nsIMsgIdentity
				.perMonthArchiveFolders)
				copyBatchKey += "\0" + monthFolderName;

			if (archiveKeepFolderStructure)
				copyBatchKey += msgHdr.folder.URI;

			// Add a key to copyBatchKey
			if (!(copyBatchKey in this._batches)) {
				this._batches[copyBatchKey] = {
					srcFolder: msgHdr.folder,
					archiveFolderURI,
					granularity: archiveGranularity,
					keepFolderStructure: archiveKeepFolderStructure,
					yearFolderName: msgYear,
					monthFolderName,
					messages: [],
				};
			}
			this._batches[copyBatchKey].messages.push(msgHdr);
		}
		MailServices.mfn.addListener(this, MailServices.mfn.folderAdded);

		// Now we launch the code iterating over all message copies, one in turn.
		this.processNextBatch();
	},

};

// cleidigh - use nsIPrefBranch for TB 60+
window.addEventListener("load", function (e) { messagearchiveoptions.onLoad(e); }, false);
messagearchiveoptions.preferenceService.QueryInterface(Ci.nsIPrefBranch).addObserver("key", messagearchiveoptions, false);
