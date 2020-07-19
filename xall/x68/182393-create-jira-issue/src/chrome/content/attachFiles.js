/* Thunderbird Plugin: Create Jira Issue
 *
 * This Plugin is able to create Jira-Issues out of an email.
 * Furthermore the content of an email can be added to an issue
 * as a comment.
 *
 * Requirements:
 * - Jira 4.4 and above with REST-API
 * - Thunderbird 68+
 *
 * Author: catworkx GmbH, Hamburg, Germany
 * 		   Holger Lehmann <holger.lehmann_AT_catworkx.de>
 *
 */
const Ci = Components.interfaces;
const Cu = Components.utils;
const Cc = Components.classes;
Cu.import("resource://gre/modules/Services.jsm");
Cu.import("resource://gre/modules/NetUtil.jsm");
Cu.import("resource://gre/modules/XPCOMUtils.jsm");
Cu.import("resource://gre/modules/FileUtils.jsm");
// EPOQ CHANGES START
Cu.import("chrome://createjiraissue/content/epoq/request-fixes.js");
// EPOQ CHANGES END

var aConsoleService = Cc["@mozilla.org/consoleservice;1"].getService(Ci.nsIConsoleService);
var prefs = Components.classes["@mozilla.org/preferences-service;1"]
.getService(Components.interfaces.nsIPrefService)
.getBranch("extensions.createjiraissue.");
var tempDir = Cc["@mozilla.org/file/directory_service;1"].getService(Ci.nsIProperties).get("TmpD", Ci.nsIFile);
let messenger = Cc["@mozilla.org/messenger;1"].createInstance(Ci.nsIMessenger);
var strbundle = Services.strings.createBundle("chrome://createjiraissue/locale/attacheFiles.properties");

var createjiraissue;
var listeners = new Array(); // store all listeners here, used in finish() below

function onLoad() {

	var selectedIds = window.arguments[0].selectedIds;
	var attachments = window.arguments[0].attachments;
	var names = window.arguments[0].names;
	var mimeTypes = window.arguments[0].mimeTypes;
	var urls = new Array();
	var sizes = new Array();


	try {
		// Fixes CWXTP-130
		if ( selectedIds && attachments && names && mimeTypes ) {
			var i;
			for (i = 0; i < selectedIds.length; i++) {
				urls.push(attachments[selectedIds[i]].url);
				sizes.push(attachments[selectedIds[i]].size);
			}
			uploadAttachments(urls, names, sizes, mimeTypes);
		}
	} catch (e) {
		console.log("[onLoad]: exception while accessing attachments: " + e);
	}
}

function uploadAttachments(urls, fileNames, fileSizes, mimeTypes) {
	var i;
	var max = urls.length;
	var progressMeter = document.getElementById("attachmentProgress");
	var vbox = document.getElementById("attachmentBox");
	progressMeter.setAttribute('max', max); // FF3.5 since when in TB?
	progressMeter.setAttribute('value', 0); // FF3.5 since when in TB?
	for (i = 0; i < max; i++) {
		var url = Services.io.newURI(urls[i], null, null);
		var tempHbox = document.createElement("hbox");
		var tempField = document.createElement("label");
		var tempProgress = document.createElement("html:progress");
		tempField.setAttribute("value", fileNames[i] + ":");
		tempField.setAttribute("control", "attachmentProgress_" + i);
		tempProgress.setAttribute("max", fileSizes[i]);
		tempProgress.setAttribute("value", 0);
		tempProgress.setAttribute("flex", 1);
		tempProgress.id = "attachmentProgress_" + i;
		tempHbox.id = "attachmentBox_" + i;
		tempHbox.appendChild(tempField);
		tempHbox.appendChild(tempProgress);
		vbox.appendChild(tempHbox);
		console.log("###url: " + url);
		//EPOQ CHANGE START
		// var channel = Services.io.newChannelFromURI(url); // FIXME: Obsolete since Gecko 48 -> https://developer.mozilla.org/en-US/docs/Mozilla/Tech/XPCOM/Reference/Interface/nsIIOService#newChannelFromURI2()
		var channel = Services.io.newChannelFromURI(url,null,Services.scriptSecurityManager.getSystemPrincipal(),null,Ci.nsILoadInfo.SEC_ALLOW_CROSS_ORIGIN_DATA_IS_NULL,Ci.nsIContentPolicy.TYPE_OTHER);
		//EPOQ CHANGE END
		var listener = {
		    issueKey : "",
		    resturl : "",
		    fileName : "",
		    fileSize : "",
		    data : "",
		    success : false,
		    finished : false,
		    finish : null,
		    mimeType: "",
		    progressMeter: null,
		    hbox: null,

            attachFile : function () {
				if ( this.success ) {
					_uploadViaREST(this);
				} else {
					this.finished = true;
					if ( this.finish != null ) {
						this.finish();
					}
				}
			},

			onStartRequest : function(/* nsIRequest */aRequest, /* nsISupports */
					aContext) {
			},

			onStopRequest : function(/* nsIRequest */aRequest, /* nsISupports */
					aContext, /* int */aStatusCode) {
				this.success = true;
				this.attachFile();
			},
			//EPOQ CHANGE START
			onDataAvailable : function(/* nsIRequest */aRequest,
					/* nsIInputStream */aStream, /* int */aOffset, /* int */
					aCount) {
				//EPOQ CHANGE END
				// Fortunately, we have in Gecko 2.0 a nice wrapper
				this.data = this.data + NetUtil.readInputStreamToString(aStream, aCount);
				var val = this.progressMeter.getAttribute('value');
				val = val + aCount;
				this.progressMeter.setAttribute('value', val);
			},

			QueryInterface : ChromeUtils.generateQI([ Ci.nsISupports,
					Ci.nsIStreamListener, Ci.nsIRequestObserver ])
		};
		listener.issueKey = window.arguments[0].issueKey;
		listener.resturl = window.arguments[0].jiraurl + "/rest/api/2/issue/" + window.arguments[0].issueKey + "/attachments";
		listener.fileName = fileNames[i];
		listener.fileSize = fileSizes[i];
		listener.mimeType = mimeTypes[i];
		listener.finish = finish;
		listener.progressMeter = tempProgress;
		listener.hbox = tempHbox;
		// store listener in order to ensure the have all finished
		listeners.push(listener);

		channel.asyncOpen(listener, null);
	}
	return;
}

function finish() {
	for (var i = 0; i < listeners.length; ++i) {
		if ( listeners[i].finished == false ) {
			return;
		}
	}
	this.close();
}

function abort() {
	this.close();
}

function _uploadViaREST(listener) {
	listener.progressMeter.setAttribute("mode","undetermined");
	var oReq = new XMLHttpRequest();

	oReq.addEventListener("progress", updateProgress, false);
	oReq.addEventListener("load", transferComplete, false);
	oReq.addEventListener("error", transferFailed, false);
	oReq.addEventListener("abort", transferCanceled, false);
	var credentials = btoa(window.arguments[0].username + ":" + window.arguments[0].password);

	oReq.open("POST", listener.resturl, true, window.arguments[0].username, window.arguments[0].password);
	// EPOQ CHANGES START
	oReq.setRequestHeader("X-Atlassian-Token","no-check"); // taken from the docs
	oReq.setRequestHeader("Authorization","Basic " + credentials);
	oReq.setRequestHeader("User-Agent","xx");
	// EPOQ CHANGES END
	// from: https://developer.mozilla.org/en-US/Add-ons/Code_snippets/File_I_O
	var tempDirDefault = prefs.getBoolPref("tempDirDefault");
	var tempDirAlternate = prefs.getCharPref("tempDirAlternate");
	var aFile = null;
	var message = strbundle.formatStringFromName("dialog.attachment.fallback.directory", [tempDirAlternate, listener.fileName], 2);
	var attachmentStatus = document.getElementById("attachmentStatus");
	try {
		if (tempDirDefault || tempDirAlternate == null
				|| tempDirAlternate == "") {
			aFile = FileUtils.getFile("TmpD", [ listener.fileName ]);
		} else {
			aFile = Components.classes["@mozilla.org/file/local;1"]
					.createInstance(Components.interfaces.nsILocalFile);
			aFile.initWithPath(tempDirAlternate);
			aFile.append(listener.fileName);
		}
	} catch (e) {
		try {
			aFile = FileUtils.getFile("TmpD", [ listener.fileName ]);
		} catch (e2) {
			console.log("[updateProgress]: exception while handling file: " + e2);
			listener.finished = true;
			transferFailed(null);
		}
	}
	try {
		aFile.createUnique(Components.interfaces.nsIFile.NORMAL_FILE_TYPE, FileUtils.PERMS_FILE);
		var stream = Components.classes["@mozilla.org/network/safe-file-output-stream;1"].
		createInstance(Components.interfaces.nsIFileOutputStream);
		stream.init(aFile, FileUtils.MODE_RDWR | FileUtils.MODE_CREATE | FileUtils.MODE_TRUNCATE, FileUtils.PERMS_FILE, 0);
		stream.write(listener.data, listener.data.length);
		if (stream instanceof Components.interfaces.nsISafeOutputStream) {
			stream.finish();
		} else {
			stream.close();
		}
	} catch (e) {
		console.log("[updateProgress]: exception while creating / writing into file: " + e);
		listener.finished = true;
		transferFailed(null);
	}
	var formData = new FormData();
	let promises = [File.createFromFileName(aFile.path).then(file => {
		console.log("[updateProgress.promises]: file: " + file);
      	//EPOQ CHANGE START
		// var today = new Date();
		// var fileNameDate = today.getFullYear() + '-' + (today.getMonth()+1) + '-' + today.getDate() + '-' + today.getHours() + ":" + today.getMinutes() + '-' + listener.fileName;
		// formData.append("file", file, fileNameDate);
		formData.append("file", file, listener.fileName);
		oReq.send(formData);
		oReq.onload = function() {
			console.log("###oReq.response: " + oReq.response);
		};
        //EPOQ CHANGE END
	})];
	// progress on transfers from the server to the client (downloads)
	function updateProgress (oEvent) {
		if (oEvent.lengthComputable) {
			listener.progressMeter.setAttribute('max', oEvent.total);
			listener.progressMeter.setAttribute('value', oEvent.loaded);
			//var percentComplete = oEvent.loaded / oEvent.total;
		} else {
			// Unable to compute progress information since the total size is unknown
			listener.progressMeter.setAttribute("mode","undetermined");
		}
	}

	function transferComplete(evt) {
		listener.finished = true;
		var progressMeter = document.getElementById("attachmentProgress");
		var val = progressMeter.getAttribute('value');
		val++;
		progressMeter.setAttribute('value', val);
		var vbox = document.getElementById("attachmentBox");
		vbox.removeChild(listener.hbox);
		try {
			var keepTempFiles = prefs.getBoolPref("keepTempFiles");
			if (keepTempFiles == false) {
				aFile.remove(false);
			}
		} catch (e) {
			console.log("[transferComplete]: Exception while removing the file: " + e);
		}
		if ( finish != null ) {
			finish();
		}
	}

	function transferFailed(evt) {
		console.log("[transferFailed]: An error occurred while transferring the file.");
		try {
			var keepTempFiles = prefs.getBoolPref("keepTempFiles");
			if (keepTempFiles == false) {
				aFile.remove(false);
			}
		} catch (e) {
			console.log("[transferFailed]: Exception while removing the file: " + e);
		}
	}

	function transferCanceled(evt) {
		try {
			var keepTempFiles = prefs.getBoolPref("keepTempFiles");
			if (keepTempFiles == false) {
				aFile.remove(false);
			}
		} catch (e) {
			console.log("[transferCanceled]: Exception while removing the file: " + e);
		}
		abort();
	}

}
