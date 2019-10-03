s3menuwizard.history = {};
Components.utils.import("resource://gre/modules/osfile.jsm");

//------------------------------------------------------------------------------
s3menuwizard.history.open_file = function(pref_name) {
	var file = Components.classes["@mozilla.org/file/directory_service;1"].getService(Components.interfaces.nsIProperties).get("ProfD", Components.interfaces.nsIFile);
	file.append("s3menuwizard");
	file.append(pref_name + ".json");
	if (file.exists()) {
		return file;
	} else {
		return false;
	}
}
//------------------------------------------------------------------------------
s3menuwizard.history.create_file = function(pref_name) {
	var file = Components.classes["@mozilla.org/file/directory_service;1"].getService(Components.interfaces.nsIProperties).get("ProfD", Components.interfaces.nsIFile);
	file.append("s3menuwizard");
	file.append(pref_name + ".json");
	try {
		if (file.exists()) {
			return s3menuwizard.history.open_file(pref_name);
		}
		file.create( Components.interfaces.nsIFile.NORMAL_FILE_TYPE, 0664);
	} catch(e) {
		file = false;
	}
	return file;
}
//------------------------------------------------------------------------------
s3menuwizard.history.read_file = function(file) {
	var fileInputStream = Components.classes['@mozilla.org/network/file-input-stream;1'].createInstance(Components.interfaces.nsIFileInputStream);
	var scriptableInputStream = Components.classes['@mozilla.org/scriptableinputstream;1'].createInstance(Components.interfaces.nsIScriptableInputStream);
	var converter = Components.classes["@mozilla.org/intl/scriptableunicodeconverter"].createInstance(Components.interfaces.nsIScriptableUnicodeConverter);
	converter.charset = "UTF-8";
	var json_data = '';

	try {
		fileInputStream.init(file, 1, 0, 0);
		scriptableInputStream.init(fileInputStream);
		json_data = scriptableInputStream.read(-1);
		json_data = converter.ConvertToUnicode(json_data);
	} catch(e) {
		return false;
	}

	//-------------------------------------------------------------------------
	scriptableInputStream.close();
        fileInputStream.close();

	var is_ok = true;
	//-------------------------------------------------------------------------
	try {
		json_data = JSON.parse(json_data);
	} catch(e) {
		is_ok = false;
	}
	//-------------------------------------------------------------------------
	if (is_ok) {
		return json_data;
	}
	//-------------------------------------------------------------------------
	else {
		try {
			file.remove(false);
		} catch(e) {
		}
		return false;
	}
}
//------------------------------------------------------------------------------
s3menuwizard.history.write_file = function(file, json_data) {
	var fileOutputStream = Components.classes['@mozilla.org/network/file-output-stream;1'].createInstance(Components.interfaces.nsIFileOutputStream);
	var converter = Components.classes["@mozilla.org/intl/scriptableunicodeconverter"].createInstance(Components.interfaces.nsIScriptableUnicodeConverter);
	converter.charset = "UTF-8";

	try {
		var json_str = converter.ConvertFromUnicode(JSON.stringify(json_data));
		fileOutputStream.init(file, 0x02 | 0x08 | 0x20, 0644, 0);
		fileOutputStream.write(json_str, json_str.length);
	}
	catch(e) {
		return false;
	}

	fileOutputStream.close();
	return true;
}
//------------------------------------------------------------------------------
s3menuwizard.history.set_history = function(pref_name, json_data) {
	var history_file = s3menuwizard.history.create_file(pref_name);
	if (history_file) {
		s3menuwizard.history.write_file(history_file, json_data);
	}
}
//------------------------------------------------------------------------------
s3menuwizard.history.get_history = function(pref_name) {
	var history_file = s3menuwizard.history.open_file(pref_name);
	if (history_file) {
		return s3menuwizard.history.read_file(history_file);
	}
	return false;
}
//------------------------------------------------------------------------------
