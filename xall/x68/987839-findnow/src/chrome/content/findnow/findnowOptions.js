/* global ChromeUtils */

Components.utils.import("resource://gre/modules/Services.jsm");

/**
 *
 * FindNow Options
 */

if( typeof com_hw_FindNow === "undefined" ) {
	var com_hw_FindNow = {};
};

/**
 * options object
 * @type findnow_L15.exp|Function
 */
com_hw_FindNow.options = function() {

	// -------------------------------------------------------------------------

	var opt = {};

	/**
	 * init
	 * @returns {undefined}
	 */
	opt.init = function() {

	}

	/**
	 * load
	 * @returns {undefined}
	 */
	opt.load = function() {
		var versionChecker = Services.vc;
		var currentVersion = Services.appinfo.platformVersion;

		if (versionChecker.compare(currentVersion, "61") >= 0) {
			var captions = document.querySelectorAll("caption");

			for( var i=0; i<captions.length; i++ ) {
				captions[i].style.display = "none";
			}
		}
		else {
			var groupboxtitles = document.querySelectorAll(".groupbox-title");

			for( var i=0; i<groupboxtitles.length; i++ ) {
				groupboxtitles[i].style.display = "none";
			}
		}

		// ---------------------------------------------------------------------

		document.getElementById("defaultButton").checked			= com_hw_FindNow.utils.IETprefs.getBoolPref("extensions.findnow.button.show_default");
		//document.getElementById("MBoverwrite").checked			= com_hw_FindNow.utils.IETprefs.getBoolPref("extensions.findnow.export.overwrite");
		//document.getElementById("setTimestamp").checked			= com_hw_FindNow.utils.IETprefs.getBoolPref("extensions.findnow.export.set_filetime");
		//document.getElementById("MBasciiname").checked			= com_hw_FindNow.utils.IETprefs.getBoolPref("extensions.findnow.export.filenames_toascii");
		document.getElementById("addtimeCheckbox").checked		= com_hw_FindNow.utils.IETprefs.getBoolPref("extensions.findnow.export.filenames_addtime");
		//document.getElementById("useISOTimeCheckbox").checked	= com_hw_FindNow.utils.IETprefs.getBoolPref("extensions.findnow.export.filename_useisodate");
		//document.getElementById("save_auto_eml").checked		= com_hw_FindNow.utils.IETprefs.getBoolPref("extensions.findnow.export.save_auto_eml");

		/*if( com_hw_FindNow.utils.IETprefs.getIntPref("extensions.findnow.exportEML.filename_format") === 2 ) {
			document.getElementById("customizeFilenames").checked = true;
		}
		else {
			document.getElementById("customizeFilenames").checked = false;
		}*/

		// ---------------------------------------------------------------------

		/*var charset = "";

		try {
			charset = com_hw_FindNow.utils.IETprefs.getCharPref("extensions.findnow.export.filename_charset");
		}
		catch( e ) {
			charset = "";
		}

		document.getElementById("filenameCharset").value = charset;*/

		// ---------------------------------------------------------------------

		//document.getElementById("cutSub").checked = com_hw_FindNow.utils.IETprefs.getBoolPref("extensions.findnow.export.cut_subject");
		//document.getElementById("cutFN").checked = com_hw_FindNow.utils.IETprefs.getBoolPref("extensions.findnow.export.cut_filename");

		//this.customNamesCheck(document.getElementById("customizeFilenames"));

		// ---------------------------------------------------------------------

		/*if( com_hw_FindNow.utils.IETprefs.getPrefType("extensions.findnow.export.filename_pattern") > 0 ) {
			var pattern = com_hw_FindNow.utils.IETprefs.getCharPref("extensions.findnow.export.filename_pattern");
			var patternParts = pattern.split("-");

			for( var i = 0; i < 3; i++ ) {
				var list = document.getElementById('part' + (i + 1));
				var popup = document.getElementById('part' + (i + 1) + '-popup-list');

				switch( patternParts[i] ) {
					case "%d":
						list.selectedItem = popup.childNodes[1];
						break;

					case "%k":
						list.selectedItem = popup.childNodes[2];
						break;

					case "%n":
						list.selectedItem = popup.childNodes[3];
						break;

					case "%a":
						list.selectedItem = popup.childNodes[4];
						break;

					case "%r":
						list.selectedItem = popup.childNodes[5];
						break;

					case "%e":
						list.selectedItem = popup.childNodes[6];
						break;

					default:
						list.selectedItem = popup.childNodes[0];
				}
			}
		}*/

		// ---------------------------------------------------------------------

		//document.getElementById("addPrefix").checked = com_hw_FindNow.utils.IETprefs.getBoolPref("extensions.findnow.export.filename_add_prefix");

		/*try {
			document.getElementById("prefixText").value = com_hw_FindNow.utils.IETgetComplexPref("extensions.findnow.export.filename_prefix");
		}
		catch( e ) {}*/

		// ---------------------------------------------------------------------

		if( com_hw_FindNow.utils.IETprefs.getPrefType("extensions.findnow.exportEML.dir") > 0 ) {
			document.getElementById("export_eml_dir").value = com_hw_FindNow.utils.IETgetComplexPref("extensions.findnow.exportEML.dir");
		}

		if( com_hw_FindNow.utils.IETprefs.getBoolPref("extensions.findnow.exportEML.use_dir") ) {
			document.getElementById("use_export_eml_dir").checked = true;

			document.getElementById("export_eml_dir").removeAttribute("disabled");
			document.getElementById("export_eml_dir").nextSibling.removeAttribute("disabled");
		}
		else {
			document.getElementById("use_export_eml_dir").checked = false;

			document.getElementById("export_eml_dir").setAttribute("disabled", "true");
			document.getElementById("export_eml_dir").nextSibling.setAttribute("disabled", "true");
		}

		// ---------------------------------------------------------------------

		if( com_hw_FindNow.utils.IETprefs.getPrefType("extensions.findnow.exportEML.sub_dir") > 0 ) {
			document.getElementById("export_eml_sub_dir").value = com_hw_FindNow.utils.IETgetComplexPref("extensions.findnow.exportEML.sub_dir");
		}

		if( com_hw_FindNow.utils.IETprefs.getBoolPref("extensions.findnow.exportEML.use_sub_dir") ) {
			document.getElementById("use_export_eml_sub_dir").checked = true;

			document.getElementById("export_eml_sub_dir").removeAttribute("disabled");
			document.getElementById("export_eml_sub_dir").nextSibling.removeAttribute("disabled");
		}
		else {
			document.getElementById("use_export_eml_sub_dir").checked = false;

			document.getElementById("export_eml_sub_dir").setAttribute("disabled", "true");
			document.getElementById("export_eml_sub_dir").nextSibling.setAttribute("disabled", "true");
		}
	}

	/**
	 * save
	 * @returns {undefined}
	 */
	opt.save = function() {
		/*
		com_hw_FindNow.utils.IETprefs.setBoolPref("extensions.findnow.export.overwrite", document.getElementById("MBoverwrite").checked);
		com_hw_FindNow.utils.IETprefs.setBoolPref("extensions.findnow.export.set_filetime", document.getElementById("setTimestamp").checked);
		com_hw_FindNow.utils.IETprefs.setBoolPref("extensions.findnow.export.filenames_toascii", document.getElementById("MBasciiname").checked);*/
		com_hw_FindNow.utils.IETprefs.setBoolPref("extensions.findnow.export.filenames_addtime", document.getElementById("addtimeCheckbox").checked);
		/*com_hw_FindNow.utils.IETprefs.setBoolPref("extensions.findnow.export.filename_useisodate", document.getElementById("useISOTimeCheckbox").checked);
		com_hw_FindNow.utils.IETprefs.setBoolPref("extensions.findnow.export.save_auto_eml", document.getElementById("save_auto_eml").checked);

		if( document.getElementById("customizeFilenames").checked ) {
			com_hw_FindNow.utils.IETprefs.setIntPref("extensions.findnow.exportEML.filename_format", 2);
		}
		else {
			com_hw_FindNow.utils.IETprefs.setIntPref("extensions.findnow.exportEML.filename_format", 0);
		}

		com_hw_FindNow.utils.IETprefs.setCharPref("extensions.findnow.export.filename_charset", document.getElementById("filenameCharset").value);

		com_hw_FindNow.utils.IETprefs.setBoolPref("extensions.findnow.export.cut_subject", document.getElementById("cutSub").checked);
		com_hw_FindNow.utils.IETprefs.setBoolPref("extensions.findnow.export.cut_filename", document.getElementById("cutFN").checked);

		var pattern = "";

		for( var u=1; u<4; u++ ) {
			var val = document.getElementById("part" + u.toString()).selectedItem.value;

			if( u>1 && val ) {
				val = "-" + val;
			}

			pattern += val;
		}

		com_hw_FindNow.utils.IETprefs.setCharPref("extensions.findnow.export.filename_pattern", pattern);
		com_hw_FindNow.utils.IETprefs.setBoolPref("extensions.findnow.export.filename_add_prefix", document.getElementById("addPrefix").checked);
		com_hw_FindNow.utils.IETsetComplexPref("extensions.findnow.export.filename_prefix", document.getElementById("prefixText").value);
		*/

		com_hw_FindNow.utils.IETprefs.setBoolPref("extensions.findnow.button.show_default", document.getElementById("defaultButton").checked);

		// dir
		com_hw_FindNow.utils.IETprefs.setBoolPref("extensions.findnow.exportEML.use_dir", document.getElementById("use_export_eml_dir").checked);

		if( document.getElementById("export_eml_dir").value !== "" ) {
			com_hw_FindNow.utils.IETsetComplexPref("extensions.findnow.exportEML.dir", document.getElementById("export_eml_dir").value);
		}
		else {
			com_hw_FindNow.utils.IETprefs.deleteBranch("extensions.findnow.exportEML.dir");
		}

		// sub dir
		com_hw_FindNow.utils.IETprefs.setBoolPref("extensions.findnow.exportEML.use_sub_dir", document.getElementById("use_export_eml_sub_dir").checked);

		if( document.getElementById("export_eml_sub_dir").value !== "" ) {
			com_hw_FindNow.utils.IETsetComplexPref("extensions.findnow.exportEML.sub_dir", document.getElementById("export_eml_sub_dir").value);
		}
		else {
			com_hw_FindNow.utils.IETprefs.deleteBranch("extensions.findnow.exportEML.sub_dir");
		}
	}

	/**
	 * pickFile
	 * @param {type} el
	 * @returns {undefined}
	 */
	opt.pickFile = function(el) {
		com_hw_FindNow.utils.IETpickFile(el);
	}

	/**
	 * toggleDirCheck
	 * @param {type} el
	 * @returns {undefined}
	 */
	opt.toggleDirCheck = function(el) {
		if( !el.checked ) {
			el.nextSibling.setAttribute("disabled", "true");
			el.nextSibling.nextSibling.setAttribute("disabled", "true");
		}
		else {
			el.nextSibling.removeAttribute("disabled");
			el.nextSibling.nextSibling.removeAttribute("disabled");
		}
	}

	/**
	 * customNamesCheck
	 * @param {type} el
	 * @returns {undefined}
	 */
	opt.customNamesCheck = function(el) {
		if( !el.checked ) {
			document.getElementById("addtimeCheckbox").setAttribute("disabled", "true");
			document.getElementById("useISOTimeCheckbox").setAttribute("disabled", "true");
			document.getElementById("part1").setAttribute("disabled", "true");
			document.getElementById("part2").setAttribute("disabled", "true");
			document.getElementById("part3").setAttribute("disabled", "true");
			document.getElementById("addPrefix").setAttribute("disabled", "true");
			document.getElementById("prefixText").setAttribute("disabled", "true");
		}
		else {
			document.getElementById("addtimeCheckbox").removeAttribute("disabled");
			document.getElementById("useISOTimeCheckbox").removeAttribute("disabled");
			document.getElementById("part1").removeAttribute("disabled");
			document.getElementById("part2").removeAttribute("disabled");
			document.getElementById("part3").removeAttribute("disabled");
			document.getElementById("addPrefix").removeAttribute("disabled");
			document.getElementById("prefixText").removeAttribute("disabled");
		}
	}

	return opt;
}();

/**
 * init
 */
com_hw_FindNow.options.init();

/**
 * addEventListener - load
 */
window.addEventListener("load", function(event) {
	com_hw_FindNow.options.load();
});

/**
 * addEventListener - dialogaccept
 * @param {type} param1
 * @param {type} param2
 */
document.addEventListener("dialogaccept", function(event) {
	com_hw_FindNow.options.save();
});
