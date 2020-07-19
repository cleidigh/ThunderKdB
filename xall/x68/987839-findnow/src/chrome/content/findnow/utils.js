/* global ChromeUtils */

ChromeUtils.import('resource://gre/modules/Services.jsm');
ChromeUtils.import("resource://gre/modules/osfile.jsm");
ChromeUtils.import("resource://gre/modules/FileUtils.jsm");


/**
 *
 * FindNow Utils
 */

if( typeof com_hw_FindNow === "undefined" ) {
	var com_hw_FindNow = {};
};

/**
 * utils object
 * @type findnow_L15.exp|Function
 */
com_hw_FindNow.utils = function() {
	var utils = {};

	utils.IETprefs = Components.classes["@mozilla.org/preferences-service;1"]
		.getService(Components.interfaces.nsIPrefBranch);

	var MBstrBundleService = Components.classes["@mozilla.org/intl/stringbundle;1"]
		.getService(Components.interfaces.nsIStringBundleService);

	utils.mboximportbundle = MBstrBundleService.createBundle(
		"chrome://findnow/locale/mboxfindnow.properties");

	utils.IETnosub = utils.mboximportbundle.GetStringFromName("nosubjectmsg");

	/**
	 * IETgetComplexPref
	 * @param {type} prefname
	 * @returns {utils_L16.utils.IETprefs.getStringPref|utils_L16.utils.IETprefs.getComplexValue.data}
	 */
	utils.IETgetComplexPref = function(prefname) {
		var value;

		if( this.IETprefs.getStringPref ) {
			value = this.IETprefs.getStringPref(prefname);
		}
		else {
			value = this.IETprefs.getComplexValue(
				prefname, Components.interfaces.nsISupportsString).data;
		}

		return value;
	}

	/**
	 * IETlogger
	 */
	utils.IETlogger = {
		write : function(string) {
			try {
				if( !com_hw_FindNow.utils.IETprefs.getBoolPref("extensions.findnow.log.enable") ) {
					return;
				}
			}
			catch( e ) {
				return;
			}

			if( !com_hw_FindNow.utils.IETlogger.file ) {
				com_hw_FindNow.utils.IETlogger.file =
					Components.classes["@mozilla.org/file/directory_service;1"]
						.getService(Components.interfaces.nsIProperties)
						.get("ProfD", Components.interfaces.nsIFile);

				com_hw_FindNow.utils.IETlogger.file.append("FindNow.log");
			}

			var now = new Date();

			var foStream =
				Components.classes["@mozilla.org/network/file-output-stream;1"]
					.createInstance(Components.interfaces.nsIFileOutputStream);

			var flag = "0x10";

			if( (com_hw_FindNow.utils.IETlogger.file.exists()) &&
				(com_hw_FindNow.utils.IETlogger.file.fileSize > 204800) )
			{
				flag = "0x20";
			}

			foStream.init(com_hw_FindNow.utils.IETlogger.file, 0x02 | 0x08 | flag, 0664, 0);

			var data = now.getTime() + ": " + string + "\r\n";

			foStream.write(data, data.length);
			foStream.close();
		}
	};

	/**
	 * IETopenFPsync
	 * @param {type} fp
	 * @returns {utils_L16.utils.IETopenFPsync.result}
	 */
	utils.IETopenFPsync = function(fp) {
		var done = false;
		var rv, result;

		fp.open(function(result) {
			rv = result;
			done = true;
		});

		var thread = Components.classes["@mozilla.org/thread-manager;1"].getService().currentThread;

		while( !done ) {
			thread.processNextEvent(true);
		}

		return rv;
	}

	/**
	 * IETescapeBeginningFrom
	 * @param {type} data
	 * @returns {unresolved}
	 */
	utils.IETescapeBeginningFrom = function(data) {
		var datacorrected = data.replace(/\nFrom /g, "\n From ");
		return datacorrected;
	}

	/**
	 * IETcopyStrToClip
	 * @param {type} str
	 * @returns {undefined}
	 */
	utils.IETcopyStrToClip = function(str) {
		var clip = Cc["@mozilla.org/widget/clipboardhelper;1"]
			.getService(Ci.nsIClipboardHelper);

		clip.copyString(str);
	}

	/**
	 * IETstr_converter
	 * @param {type} str
	 * @returns {unresolved}
	 */
	utils.IETstr_converter = function(str) {
		var convStr;

		try {
			var charset = this.IETprefs.getCharPref("extensions.findnow.export.filename_charset");

			if( charset === "" ) {
				return str;
			}

			var uConv = Cc["@mozilla.org/intl/scriptableunicodeconverter"]
				.createInstance(Ci.nsIScriptableUnicodeConverter);

			uConv.charset = charset;
			convStr = uConv.ConvertFromUnicode(str);
		}
		catch (e) {
			return str;
		}

		return convStr;
	}

	/**
	 * IETwritestatus
	 * @param {type} text
	 * @returns {undefined}
	 */
	utils.IETwritestatus = function(text) {
		if (document.getElementById("statusText")) {
			document.getElementById("statusText").setAttribute("label", text);

			var delay = this.IETprefs.getIntPref("extensions.findnow.delay.clean_statusbar");

			if( delay > 0 ) {
				window.setTimeout(function () {
					com_hw_FindNow.utils.IETdeletestatus(text);
				}, delay);
			}
		}
	}

	/**
	 * IETdeletestatus
	 * @param {type} text
	 * @returns {undefined}
	 */
	utils.IETdeletestatus = function(text) {
		if( document.getElementById("statusText").getAttribute("label") === text ) {
			document.getElementById("statusText").setAttribute("label", "");
		}
	}

	/**
	 * IETwriteDataOnDisk
	 * @param {type} file
	 * @param {type} data
	 * @param {type} append
	 * @param {type} fname
	 * @param {type} time
	 * @returns {undefined}
	 */
	utils.IETwriteDataOnDisk = function(file, data, append, fname, time) {
		try {
			this.IETlogger.write("call to IETwriteDataOnDisk - file path = " + file.path);
		} catch (e) {
			this.IETlogger.write("call to IETwriteDataOnDisk - error = " + e);
		}

		var foStream = Cc["@mozilla.org/network/file-output-stream;1"]
			.createInstance(Ci.nsIFileOutputStream);

		if( append ) {
			if( fname ) {
				file.append(fname);
			}

			foStream.init(file, 0x02 | 0x08 | 0x10, 0664, 0); // write,  create, append
		}
		else {
			foStream.init(file, 0x02 | 0x08 | 0x20, 0664, 0); // write, create, truncate
		}

		if( data ) {
			foStream.write(data, data.length);
		}

		foStream.close();

		try {
			if( time && this.IETprefs.getBoolPref("extensions.findnow.export.set_filetime") ) {
				file.lastModifiedTime = time;
			}
		}
		catch( e ) {
		}
	}

	/**
	 * IETpickFile
	 * @param {type} el
	 * @returns {undefined}
	 */
	utils.IETpickFile = function(el) {
		var box				= el.previousSibling;
		var nsIFilePicker	= Ci.nsIFilePicker;
		var fp				= Cc["@mozilla.org/filepicker;1"].createInstance(nsIFilePicker);

		fp.init(window, "", nsIFilePicker.modeGetFolder);

		var res;

		if( fp.show ) {
			res = fp.show();
		}
		else {
			res = this.IETopenFPsync(fp);
		}

		if( res === nsIFilePicker.returnOK ) {
			box.value = fp.file.path;
		}
	}

	/**
	 * IETsetComplexPref
	 * @param {type} prefname
	 * @param {type} value
	 * @returns {undefined}
	 */
	utils.IETsetComplexPref = function(prefname, value) {
		if( this.IETprefs.setStringPref ) {
			this.IETprefs.setStringPref(prefname, value);
		}
		else {
			var str = Cc["@mozilla.org/supports-string;1"]
				.createInstance(Ci.nsISupportsString);

			str.data = value;

			this.IETprefs.setComplexValue(prefname, Ci.nsISupportsString, str);
		}
	}

	/**
	 * nametoascii
	 * @param {type} str
	 * @returns {String}
	 */
	utils.nametoascii = function(str) {
		if( !this.IETprefs.getBoolPref("extensions.findnow.export.filenames_toascii") ) {
			str = str.replace(/[\x00-\x19]/g, "_");

			return str.replace(/[\/\\:,<>*\?\"\|]/g, "_");
		}

		if( str ) {
			str = str.replace(/[^a-zA-Z0-9\- ]/g, "_");
		}
		else {
			str = "Undefinied_or_empty";
		}

		return str;
	}

	/**
	 * dateInSecondsTo8601
	 * @param {type} secs
	 * @returns {unresolved}
	 */
	utils.dateInSecondsTo8601 = function(secs) {
		var addTime		= this.IETprefs.getBoolPref("extensions.findnow.export.filenames_addtime");
		var msgDate		= new Date(secs * 1000);
		var msgDate8601 = msgDate.getFullYear();

		var month;
		var day;
		var hours;
		var min;

		if( msgDate.getMonth() < 9 ) {
			month = "0" + (msgDate.getMonth() + 1);
		}
		else {
			month = msgDate.getMonth() + 1;
		}

		if( msgDate.getDate() < 10 ) {
			day = "0" + msgDate.getDate();
		}
		else {
			day = msgDate.getDate();
		}

		var msgDate8601string = msgDate8601.toString() + month.toString() + day.toString();

		if( addTime && this.IETprefs.getIntPref("extensions.findnow.exportEML.filename_format") === 2) {
			if( msgDate.getHours() < 10 ) {
				hours = "0" + msgDate.getHours();
			}
			else {
				hours = msgDate.getHours();
			}

			if( msgDate.getMinutes() < 10 ) {
				min = "0" + msgDate.getMinutes();
			}
			else {
				min = msgDate.getMinutes();
			}

			msgDate8601string += " " + hours.toString() + min.toString();
		}

		return msgDate8601string;
	}

	/**
	 * dateInISO
	 * @param {type} secs
	 * @returns {String}
	 */
	utils.dateInISO = function(secs) {
		var addTime		= this.IETprefs.getBoolPref("extensions.findnow.export.filenames_addtime");
		var msgDate		= new Date(secs * 1000);
		var msgDate8601 = msgDate.getFullYear();

		var month;
		var day;
		var hours;
		var min;
		var sec;

		if( msgDate.getMonth() < 9 ) {
			month = "0" + (msgDate.getMonth() + 1);
		}
		else {
			month = msgDate.getMonth() + 1;
		}

		if( msgDate.getDate() < 10 ) {
			day = "0" + msgDate.getDate();
		}
		else {
			day = msgDate.getDate();
		}

		var msgDateIsostring = msgDate8601.toString() + "-" + month.toString() + "-" + day.toString();

		if( addTime && this.IETprefs.getIntPref("extensions.findnow.exportEML.filename_format") === 2) {
			if( msgDate.getHours() < 10 ) {
				hours = "0" + msgDate.getHours();
			}
			else {
				hours = msgDate.getHours();
			}

			if( msgDate.getMinutes() < 10 ) {
				min = "0" + msgDate.getMinutes();
			}
			else {
				min = msgDate.getMinutes();
			}

			sec = msgDate.getSeconds();

			msgDateIsostring += " " + hours.toString() + "-" + min.toString() + "-" + sec.toString();
		}

		return msgDateIsostring;
	}

	/**
	 * formatNameForSubject
	 * @param {type} str
	 * @param {type} recipients
	 * @returns {unresolved}
	 */
	utils.formatNameForSubject = function(str, recipients) {
		if( recipients ) {
			str = str.replace(/\s*\,.+/, "");
		}

		if( str.indexOf("<") > -1 ) {
			str = str.replace(/\s*<.+>/, "");
		}
		else {
			str = str.replace(/[@\.]/g, "_");
		}

		return str;
	}

	/**
	 * getSubjectForHdr
	 * @param {type} hdr
	 * @param {type} dirPath
	 * @returns {@exp;utils_L16@pro;utils@pro;getSubjectForHdr@pro;pattern|@exp;utils_L16@pro;utils@pro;getSubjectForHdr@pro;prefix|@exp;pattern@call;replace|utils_L16.utils@pro;IETprefs@call;getCharPref|@call;IETgetComplexPref|String}
	 */
	utils.getSubjectForHdr = function(hdr, dirPath) {
		var emlNameType		= this.IETprefs.getIntPref("extensions.findnow.exportEML.filename_format");
		var mustcorrectname = this.IETprefs.getBoolPref("extensions.findnow.export.filenames_toascii");
		var cutSubject		= this.IETprefs.getBoolPref("extensions.findnow.export.cut_subject");
		var cutFileName		= this.IETprefs.getBoolPref("extensions.findnow.export.cut_filename");
		var useIsoDate		= this.IETprefs.getBoolPref("extensions.findnow.export.filename_useisodate");
		var subMaxLen		= cutSubject ? 50 : -1;

		// Subject
		var subj;

		if( hdr.mime2DecodedSubject ) {
			subj = hdr.mime2DecodedSubject;

			if( hdr.flags & 0x0010 ) {
				subj = "Re_" + subj;
			}
		}
		else {
			subj = this.IETnosub;
		}

		if( subMaxLen > 0 ) {
			subj = subj.substring(0, subMaxLen);
		}

		subj = this.nametoascii(subj);

		// Date - Key
		var dateInSec = hdr.dateInSeconds;

		if( useIsoDate ) {
			var msgDate8601string = this.dateInISO(dateInSec);
		}
		else {
			var msgDate8601string = this.dateInSecondsTo8601(dateInSec);
		}

		var key	= hdr.messageKey;

		var fname;

		if( emlNameType === 2 ) {
			var pattern = this.IETprefs.getCharPref("extensions.findnow.export.filename_pattern");

			// Name
			var authName = this.formatNameForSubject(hdr.mime2DecodedAuthor, false);
			var recName = this.formatNameForSubject(hdr.mime2DecodedRecipients, true);

			// Sent of Drafts folder
			var isSentFolder = hdr.folder.flags & 0x0200 || hdr.folder.flags & 0x0400;
			var isSentSubFolder = hdr.folder.URI.indexOf("/Sent/");
			var smartName;

			if( isSentFolder || isSentSubFolder > -1 ) {
				smartName = recName;
			}
			else {
				smartName = authName;
			}

			pattern = pattern.replace("%s", subj);
			pattern = pattern.replace("%k", key);
			pattern = pattern.replace("%d", msgDate8601string);
			pattern = pattern.replace("%n", smartName);
			pattern = pattern.replace("%a", authName);
			pattern = pattern.replace("%r", recName);
			pattern = pattern.replace(/-%e/g, "");

			if( this.IETprefs.getBoolPref("extensions.findnow.export.filename_add_prefix") ) {
				var prefix = this.IETgetComplexPref("extensions.findnow.export.filename_prefix");

				pattern = prefix + pattern;
			}

			fname = pattern;
		}
		else {
			fname = msgDate8601string + " " + subj + "-" + hdr.messageKey;
		}

		fname = fname.replace(/[\x00-\x1F]/g, "_");

		if( mustcorrectname ) {
			fname = this.nametoascii(fname);
		}
		else {
			fname = fname.replace(/[\/\\:,<>*\?\"\|\']/g, "_");
		}

		if( cutFileName ) {
			var maxFN = 249 - dirPath.length;

			if( fname.length > maxFN ) {
				fname = fname.substring(0, maxFN);
			}
		}

		return fname;
	}

	/**
	 * getPredefinedFolder
	 * @param {type} type
	 * @returns {unresolved}
	 */
	utils.getPredefinedFolder = function() {
		var use_dir = "extensions.findnow.exportEML.use_dir";
		var dir_path = "extensions.findnow.exportEML.dir";

		try {
			if( !this.IETprefs.getBoolPref(use_dir) ) {
				return null;
			}
		}
		catch( e ) {
			// setting not exist
			return null;
		}

		try {
			var dirPathValue = this.IETgetComplexPref(dir_path);

			if( (this.IETprefs.getPrefType(dir_path) === 0) || (dirPathValue === "") ) {
				return null;
			}
			else {
				var localFile = Components.classes["@mozilla.org/file/local;1"]
					.createInstance(Components.interfaces.nsIFile);

				localFile.initWithPath(dirPathValue);

				if( localFile.exists() ) {
					return localFile;
				}
				else {
					return null;
				}
			}
		}
		catch( e ) {
			return null;
		}
	}

	/**
	 * getMsgDestination
	 * @param {type} type
	 * @returns {undefined}
	 */
	utils.getMsgDestination = function() {
		var bfile		= this.getPredefinedFolder();
		var file		= bfile;
		var showPicker	= false;

		if( !bfile ) {
			showPicker = true;
		}

		if( !com_hw_FindNow.utils.IETprefs.getBoolPref("extensions.findnow.export.save_auto_eml") ) {
			showPicker = true;
		}

		if( showPicker ) {
			var nsIFilePicker	= Components.interfaces.nsIFilePicker;
			var fp				= Components.classes["@mozilla.org/filepicker;1"].createInstance(nsIFilePicker);

			fp.init(window, this.mboximportbundle.GetStringFromName("filePickerExport"), nsIFilePicker.modeGetFolder);

			if( bfile ) {
				fp.displayDirectory = bfile;
			}

			var res = null;

			if( fp.show ) {
				res = fp.show();
			}
			else {
				res = this.IETopenFPsync(fp);
			}

			if( res === nsIFilePicker.returnOK ) {
				file = fp.file;
			}
		}

		// create sub dir
		// ---------------------------------------------------------------------

		try {
			if( this.IETprefs.getBoolPref("extensions.findnow.exportEML.use_sub_dir") ) {
				//if( bfile.path === file.path ) {
					var subDir		= this.IETgetComplexPref("extensions.findnow.exportEML.sub_dir");
					var subDirDes	= OS.Path.join(file.path, subDir);

					try {
						// not work!
						//OS.File.makeDir(subDirDes, {ignoreExisting: true});
						//FileUtils.getDir("ProfD", [subDirDes], true);

						var localFile = Components.classes["@mozilla.org/file/local;1"]
							.createInstance(Components.interfaces.nsIFile);

						localFile.initWithPath(subDirDes);

						//if( localFile.exists() ) {
							//localFile.create(localFile.DIRECTORY_TYPE, 0777);
						//}

						if( localFile.exists() ) {
							file = localFile;
						}
					}
					catch( ex ) {
						com_hw_FindNow.utils.IETlogger.write(
							"call getMsgDestination (sub dir) - error = " + e);

						// TODO Alert
						return null;
					}
				//}
			}
		}
		catch( e ) {
		}

		//----------------------------------------------------------------------

		return file;
	}

	return utils;
}();

