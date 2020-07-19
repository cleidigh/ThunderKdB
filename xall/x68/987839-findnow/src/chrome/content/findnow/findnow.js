/* global ChromeUtils */

Components.utils.import("resource://gre/modules/Services.jsm");

/**
 *
 * FindNow
 */

if( typeof com_hw_FindNow === "undefined" ) {
	var com_hw_FindNow = {};
};

/**
 * exporter object
 * @type findnow_L15.exp|Function
 */
com_hw_FindNow.exporter = function() {
	var IETabort = false;

	// -------------------------------------------------------------------------

	var exp = {};

	/**
	 * init
	 * @returns {undefined}
	 */
	exp.init = function() {
		// TODO
	}

	/**
	 * saveTo
	 * @returns {undefined}
	 */
	exp.saveTo = function() {
		var msguri		= gFolderDisplay.selectedMessageUris[0];
		var file		= com_hw_FindNow.utils.getMsgDestination();

		var emlsArray = [];

		emlsArray.push(msguri);

		IETtotal	= emlsArray.length;
		IETexported = 0;
		IETskipped	= 0;

		this.saveMsgAsEML(msguri, file, false, emlsArray, null, null, false, false, null, null);
	}

	/**
	 * load
	 * @returns {undefined}
	 */
	exp.load = function() {
		if( !com_hw_FindNow.utils.IETprefs.getBoolPref("extensions.findnow.button.show_default") ) {
			document.getElementById("saveToFindnow").className += " findnow-lay-down";
		}
	}

	/**
	 * saveMsgAsEML
	 * @param {type} msguri
	 * @param {type} file
	 * @param {type} append
	 * @param {type} uriArray
	 * @param {type} hdrArray
	 * @param {type} fileArray
	 * @param {type} imapFolder
	 * @param {type} clipboard
	 * @param {type} file2
	 * @param {type} msgFolder
	 * @returns {undefined}
	 */
	exp.saveMsgAsEML = function(msguri, file, append, uriArray, hdrArray, fileArray, imapFolder, clipboard, file2, msgFolder) {
		if( file === null ) {
			//alert(com_hw_FindNow.utils.mboximportbundle.GetStringFromName("fileEmpty"));
			return;
		}

		var myEMLlistner = {
			scriptStream: null,
			emailtext: "",

			QueryInterface: function( iid ) {
				if( iid.equals(Ci.nsIStreamListener) || iid.equals(Ci.nsISupports) ) {
					return this;
				}

				throw Cr.NS_NOINTERFACE;
			},

			// cleidigh - Handle old/new streamlisteners signatures after TB67
			onStartRequest60: function(aRequest, aContext) { },
			onStartRequest68: function(aRequest) { },

			onStopRequest60: function(aRequest, aContext, aStatusCode) {
				this.onStopRequest68(aRequest, aStatusCode);
			},

			onStopRequest68: function(aRequest, aStatusCode) {
				var sub;
				var data;

				this.scriptStream = null;

				if( clipboard ) {
					com_hw_FindNow.utils.IETcopyStrToClip(this.emailtext);
					return;
				}

				var tags = hdr.getStringProperty("keywords");

				if( tags && this.emailtext.substring(0, 5000).includes("X-Mozilla-Keys") ) {
					this.emailtext = "X-Mozilla-Keys: " + tags + "\r\n" + this.emailtext;
				}

				if( append ) {
					if( this.emailtext !== "" ) {
						data = this.emailtext + "\n";

						// Some Imap servers don't add to the message the "From" prologue
						if( data && !data.match(/^From/) ) {
							var da = new Date;
							// Mbox format requires that the date in "From" first line is 24 characters long
							var now = da.toString().substring(0, 24);
							now = now.replace(da.getFullYear() + " ", "") + " " + da.getFullYear();

							var prologue = "From - " + now + "\n";
							data = prologue + data;
						}

						data = com_hw_FindNow.utils.IETescapeBeginningFrom(data);
					}

					var fileClone = file.clone();

					com_hw_FindNow.utils.IETwriteDataOnDisk(fileClone, data, true, null, null);

					sub = true;
				}
				else {
					if( !hdrArray ) {
						sub = com_hw_FindNow.utils.getSubjectForHdr(hdr, file.path);
					}
					else {
						var parts = hdrArray[IETexported].split("§][§^^§");
						sub = parts[4];
						sub = sub.replace(/[\x00-\x1F]/g, "_");
					}

					sub = com_hw_FindNow.utils.IETstr_converter(sub);

					if( sub ) {
						data = this.emailtext.replace(/^From.+\r?\n/, "");
						data = com_hw_FindNow.utils.IETescapeBeginningFrom(data);

						var clone = file.clone();

						// The name is taken from the subject "corrected"
						clone.append(sub + ".eml");
						clone.createUnique(0, 0644);

						var time = (hdr.dateInSeconds) * 1000;

						com_hw_FindNow.utils.IETwriteDataOnDisk(clone, data, false, null, time);

						// myEMLlistener.file2 exists just if we need the index
						if( myEMLlistner.file2 ) {
							var nameNoExt = clone.leafName.replace(/\.eml$/, "");
							// If the leafName of the file is not equal to "sub", we must change also
							// the corrispondent section of hdrArray[IETexported], otherwise the link
							// in the index will be wrong
							if( sub !== nameNoExt ) {
								parts[4] = nameNoExt;
								hdrArray[IETexported] = parts.join("§][§^^§");
							}
						}
					}
				}

				IETexported = IETexported + 1;

				if( sub ) {
					com_hw_FindNow.utils.IETwritestatus(
						com_hw_FindNow.utils.mboximportbundle.GetStringFromName("exported") +
						" " + IETexported + " " + com_hw_FindNow.utils.mboximportbundle.GetStringFromName("msgs") +
						" " + (IETtotal + IETskipped));
				}

				if( IETabort ) {
					IETabort = false;
					return;
				}

				var nextUri;
				var nextFile;

				if( IETexported < IETtotal ) {
					if( fileArray ) {
						nextUri = uriArray[IETexported];
						nextFile = fileArray[IETexported];
					}
					else if( !hdrArray ) {
						nextUri = uriArray[IETexported];
						nextFile = file;
					}
					else {
						parts = hdrArray[IETexported].split("§][§^^§");
						nextUri = parts[5];
						nextFile = file;
					}

					com_hw_FindNow.exporter.saveMsgAsEML(
						nextUri, nextFile, append, uriArray,
						hdrArray, fileArray, imapFolder, false,
						file2, msgFolder
						);
				}
				else {
					if( myEMLlistner.file2 ) {
						createIndex(0, myEMLlistner.file2, hdrArray, myEMLlistner.msgFolder, false, true);
					}

					IETexported = 0;
					IETtotal	= 0;
					IETskipped	= 0;

					if( document.getElementById("IETabortIcon") ) {
						document.getElementById("IETabortIcon").collapsed = true;
					}
				}
			},

			// cleidigh - Handle old/new streamlisteners signatures after TB67
			onDataAvailable60: function (aRequest, aContext, aInputStream, aOffset, aCount) {
				this.onDataAvailable68(aRequest, aInputStream, aOffset, aCount);
			},

			onDataAvailable68: function (aRequest, aInputStream, aOffset, aCount) {
				var scriptStream = Cc["@mozilla.org/scriptableinputstream;1"].createInstance(Ci.nsIScriptableInputStream);
				scriptStream.init(aInputStream);

				this.emailtext += scriptStream.read(scriptStream.available());
			},
		};

		// ---------------------------------------------------------------------

		// cleidigh - Handle old/new streamlisteners signatures after TB67
		var versionChecker = Services.vc;
		var currentVersion = Services.appinfo.platformVersion;

		if( versionChecker.compare(currentVersion, "61") >= 0 ) {
			myEMLlistner.onDataAvailable = myEMLlistner.onDataAvailable68;
			myEMLlistner.onStartRequest = myEMLlistner.onStartRequest68;
			myEMLlistner.onStopRequest = myEMLlistner.onStopRequest68;
		}
		else {
			myEMLlistner.onDataAvailable = myEMLlistner.onDataAvailable60;
			myEMLlistner.onStartRequest = myEMLlistner.onStartRequest60;
			myEMLlistner.onStopRequest = myEMLlistner.onStopRequest60;
		}

		var mms = messenger.messageServiceFromURI(msguri)
			.QueryInterface(Ci.nsIMsgMessageService);

		var hdr = mms.messageURIToMsgHdr(msguri);

		try {
			com_hw_FindNow.utils.IETlogger.write(
				"call to saveMsgAsEML - subject = " + hdr.mime2DecodedSubject + " - messageKey = " + hdr.messageKey);
		}
		catch( e ) {
			com_hw_FindNow.utils.IETlogger.write(
				"call to saveMsgAsEML - error = " + e);
		}

		myEMLlistner.file2 = file2;
		myEMLlistner.msgFolder = msgFolder;

		mms.streamMessage(msguri, myEMLlistner, msgWindow, null, false, null);
	}

	return exp;
}();

// init
com_hw_FindNow.exporter.init();

/**
 * addEventListener - load
 */
window.addEventListener("load", function(event) {
	com_hw_FindNow.exporter.load();
});