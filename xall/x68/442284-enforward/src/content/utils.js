var gENForwardUtils = {
	limitPremium: [200, 200], //[size max, sent max]
	limitPlus: [50, 200], //[size max, sent max]

	getMaxSize: function(account) {
		if (!account) account = gENFPreferences.copyUnicharPref("extensions.enforward.account.type", "standard");
		var ret = 0;
		switch (account) {
			case "plus":
				ret = this.limitPlus[0];
				break;
			case "premium":
				ret = this.limitPremium[0];
				break;
			default:
				ret = this.limitPlus[0];
				break;
		}
		
		return ret;
	},

	getMaxSend: function(account) {
		if (!account) account = gENFPreferences.copyUnicharPref("extensions.enforward.account.type", "standard");
		var ret = 0;
		switch (account) {
			case "plus":
				ret = this.limitPlus[1];
				break;
			case "premium":
				ret = this.limitPremium[1];
				break;
			default:
				ret = this.limitPlus[1];
				break;
		}
		
		return ret;
	},

	checkMsgSize: function(msgFile) {
		if (gENFPreferences.getBoolPref("extensions.enforward.alert_limit", false)) {
			var size = msgFile.fileSize;
			return size < this.getMaxSize() * 1024 * 1024;
		} else {
			return true;
		}
	},
	
	checkSentTimes: function() {
		if (gENFPreferences.getBoolPref("extensions.enforward.alert_limit", false)) {
			var sent = gENFPreferences.getIntPref("extensions.enforward.sent_times", 0);
			return sent < this.getMaxSend();
		} else {
			return true;
		}
	},
	
	checkLimitExpires: function(force) {
		if (force || gENFPreferences.getBoolPref("extensions.enforward.alert_limit", false)) {
			var date = this.localDateToEnDate(new Date());
			var today = date.getFullYear() + "-" + (date.getMonth() + 1) + "-" + date.getDate();
			var last = gENFPreferences.copyUnicharPref("extensions.enforward.sent_date", "");
			return today != last;
		} else {
			return true;
		}
	},
	
	//change local date to california date
	localDateToEnDate: function(date) {
		var localTime = date.getTime();
		var gmt = localTime + date.getTimezoneOffset() * 60 * 1000;
		var enDate = new Date(gmt + (-8 * 60 * 60 * 1000));
		return enDate;
	},
	
	writeStringToFile: function(name, str) {
		var file = Components.classes["@mozilla.org/file/directory_service;1"]
									.getService(Components.interfaces.nsIProperties)
									.get("ProfD", Components.interfaces.nsIFile);
		file.append("EnForward");
		file.append(name);
		if (file.exists()) {
			file.remove(true);
		}
		file.create(file.NORMAL_FILE_TYPE, 0666);
		
		var ioService = Components.classes['@mozilla.org/network/io-service;1']
											.getService(Components.interfaces.nsIIOService);

		var fileStream = Components.classes['@mozilla.org/network/file-output-stream;1']
											.createInstance(Components.interfaces.nsIFileOutputStream);
		fileStream.init(file, 2, 0x200, false);

		var converterStream = Components
				.classes['@mozilla.org/intl/converter-output-stream;1']
				.createInstance(Components.interfaces.nsIConverterOutputStream);
		converterStream.init(fileStream, "UTF-8", 0,
												 Components.interfaces.nsIConverterInputStream.DEFAULT_REPLACEMENT_CHARACTER);
		converterStream.writeString(str);
		converterStream.close();
		fileStream.close();
	},
	
	loadFileToString: function(name) {
		var ret = "";
		try {
			var file = Components.classes["@mozilla.org/file/directory_service;1"]
										.getService(Components.interfaces.nsIProperties)
										.get("ProfD", Components.interfaces.nsIFile);
			file.append("EnForward");
			file.append(name);
		
			if (file.exists()) {
				var stream = Components.classes['@mozilla.org/network/file-input-stream;1'].createInstance(Components.interfaces.nsIFileInputStream);
			  stream.init(file, 1, 0, false);
		  	var converterStream = Components
						.classes['@mozilla.org/intl/converter-input-stream;1']
						.createInstance(Components.interfaces.nsIConverterInputStream);
				converterStream.init(stream, "UTF-8", stream.available(),
														 Components.interfaces.nsIConverterInputStream.DEFAULT_REPLACEMENT_CHARACTER);
				var fileObj = {};
				converterStream.readString(stream.available(), fileObj);
				converterStream.close();
				stream.close();
				ret = fileObj.value ? fileObj.value : "";
			}
		} catch(e) {
			ret = "";
		}
		return ret;
	},
	
	getFileInst: function(name) {
		var file = Components.classes["@mozilla.org/file/directory_service;1"]
									.getService(Components.interfaces.nsIProperties)
									.get("ProfD", Components.interfaces.nsIFile);
		file.append("EnForward");
		file.append(name);
		
		return file;
	},
	
	getElementsByAttribute: function(name, value) {
    return value
      ? document.querySelectorAll(`[${name}="${value}"]`)
      : document.querySelectorAll(`[${name}]`);
  }
}

var gENFPreferences = {
	pref: Components.classes["@mozilla.org/preferences-service;1"].
	  getService(Components.interfaces.nsIPrefBranch),
	  
	getIntPref: function(str, def) {
		try {
			return this.pref.getIntPref(str);
		} catch(e) {
			return def;
		}
	},
	
	getBoolPref: function(str, def) {
		try {
			return this.pref.getBoolPref(str);
		} catch(e) {
			return def;
		}
	},
	
	copyUnicharPref: function(str, def) {
		try{
			//return this.pref.getComplexValue(str, Components.interfaces.nsISupportsString).data;
			return this.pref.getStringPref(str);
		}catch(e){
			return def;
		}
	},
	
	setIntPref: function(str, val) {
		return this.pref.setIntPref(str, val);
	},
	
	setBoolPref: function(str, val) {
		return this.pref.setBoolPref(str, val);
	},
	
	setUnicharPref: function(str, val) {
		//var sstr = Components.classes["@mozilla.org/supports-string;1"].
		//					createInstance(Components.interfaces.nsISupportsString);
		//sstr.data = val;
		//this.pref.setComplexValue(str, Components.interfaces.nsISupportsString, sstr);
		this.pref.setStringPref(str, val);
	}
}

