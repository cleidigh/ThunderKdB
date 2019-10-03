// Feedly Synchronizer AddOn for Mozilla Thunderbird
// Developed by Antonio Miras Aróstegui
// Published under Mozilla Public License, version 2.0 (https://www.mozilla.org/MPL/2.0/)

Components.utils.import("resource:///modules/mailServices.js");
Components.utils.import("resource://gre/modules/FileUtils.jsm");
Components.utils.import("resource://gre/modules/NetUtil.jsm");
Components.utils.import("resource://gre/modules/AppConstants.jsm");

var synchDirection = {
	both : 0,
	down : 1,
	up : 2,

	isBoth : function() {
		return getPref("synch.direction") == synchDirection.both;
	},
	isDownload : function() {
		return getPref("synch.direction") == synchDirection.down;
	},
	isUpload : function() {
		return getPref("synch.direction") == synchDirection.up;
	}
};

var log = {
	eol : null,
	file : null,

	writeLn : function(str, force) {
		if (!getPref("log.active")) {
			if (force === undefined || force === false)
				return;
		}

		let now = new Date();

		let hh = now.getHours();
		if (hh < 10)
			hh = "0" + hh;
		let mm = now.getMinutes();
		if (mm < 10)
			mm = "0" + mm;
		let ss = now.getSeconds();
		if (ss < 10)
			ss = "0" + ss;

		let dd = now.getDate();
		if (dd < 10)
		    dd = "0" + dd;
		let MM = now.getMonth() + 1;
		if (MM < 10)
		    MM = "0" + MM;

		let logStr = "(" + now.getFullYear() + "/" + MM + "/" + dd + " " + hh + ":" + mm + ":" + ss + ") " + str;

		if (log.eol === null) {
			if (AppConstants.platform === "win")
				log.eol = '\r\n';
			else if (AppConstants.platform === "macosx")
				log.eol = '\r';
			else
				log.eol = '\n';
		}

		switch (getPref("log.toFile")) {
			case false:
				Services.console.logStringMessage("FeedlySync: " + logStr);
				break;
			case true:
				if (log.file === null) {
					let logFile = now.getFullYear() + MM + dd + ".log";
					let id = addonId;
					log.file =
						FileUtils.getFile("ProfD", [id, "data", "logs", logFile], false);
					if (!log.file.exists())
						log.file.create(Components.interfaces.nsIFile.NORMAL_FILE_TYPE, FileUtils.PERMS_FILE);
				}

				let outStream = FileUtils.openFileOutputStream(log.file, FileUtils.MODE_WRONLY | FileUtils.MODE_APPEND);
				let converter = Components.classes["@mozilla.org/intl/scriptableunicodeconverter"].
				                createInstance(Components.interfaces.nsIScriptableUnicodeConverter);
				converter.charset = "UTF-8";
				let inStream = converter.convertToInputStream(logStr + log.eol + log.eol);
				NetUtil.asyncCopy(inStream, outStream);
				break;
		}
	}
};

function retrieveLocale() {
	// Looks like this function wouldn't be necessary if l10n.js was initialized later
	return Components.classes["@mozilla.org/chrome/chrome-registry;1"]
		.getService(Components.interfaces.nsIXULChromeRegistry).getSelectedLocale("global");
}

function getIncomingServer() {
	let accountKey = getPref("synch.account");
	let account = MailServices.accounts.getAccount(accountKey);
	if (account === null)
		return null;

	return account.incomingServer;
}

function getRootFolder() {
	let server = getIncomingServer();
	let accountKey = getPref("synch.account");

	if (server === null) {
		log.writeLn("getRootFolder. No incoming server. Unexpected situation. Account Key = " + accountKey);
		setPref("synch.account", "");
		return null;
	}
	if (server.type !== "rss") {
		log.writeLn("getRootFolder. Wrong incoming server type. Unexpected situation. Account Key = " + accountKey);
		setPref("synch.account", "");
		return null;
	}

	let rootFolder = server.rootFolder;
	if (rootFolder === null) {
		log.writeLn("getRootFolder. No root folder. Unexpected situation. Account Key = " + accountKey);
		setPref("synch.account", "");
		return null;
	}
	return rootFolder;
}

function formatEventMsg(message, evnt, i, j) {
	return message +
			(i !== undefined && j !== undefined ? " (" + (i + 1) + "/" + j + ")" : "") +
			" Url: " + evnt.currentTarget.channel.URI.spec +
			" Status: " + evnt.currentTarget.status + " Status Text: " + evnt.currentTarget.statusText +
			" Response text: " + evnt.currentTarget.responseText;
}

function getParameterByName(val, location) {
    let tmp = [];
    let items = location.search.substr(1).split("&");
    for (var index = 0; index < items.length; index++) {
        tmp = items[index].split("=");
        if (tmp[0] === val)
        	return decodeURIComponent(tmp[1]);
    }
    return "";
}