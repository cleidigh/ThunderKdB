var PS_bundleService = Components.classes["@mozilla.org/intl/stringbundle;1"]
	.getService(Components.interfaces.nsIStringBundleService);
var PS_bundle =  PS_bundleService.createBundle("chrome://profilelauncher/locale/profilelauncher.properties");

document.addEventListener("dialogaccept", function() {onOK()}); // This replaces ondialogaccept in XUL.

function pickFile(el) {
	var nsIFilePicker = Components.interfaces.nsIFilePicker;
	var fp = Components.classes["@mozilla.org/filepicker;1"].createInstance(nsIFilePicker);
	fp.init(window, "", nsIFilePicker.modeSave);
	fp.defaultString = "ThunderbirdLog.txt";
	fp.appendFilter("log", "*.txt");
	if (fp.show)
		var res = fp.show();
	else
		var res = profileSwitcherUtils.openFPsync(fp);
	if (res == nsIFilePicker.returnOK || res == nsIFilePicker.returnReplace) {
		var box = el.previousSibling;
		box.value = fp.file.path;
	}	
}

function onOK() {
	if (! document.getElementById("pop3").checked && ! document.getElementById("imap").checked && ! document.getElementById("smtp").checked) {
		alert(PS_bundle.GetStringFromName("logErrorNoProtocol"));
		return false;
	}	
	if (! document.getElementById("profPath").value) {
		alert(PS_bundle.GetStringFromName("logErrorNoPath"));
		return false;
	}
	window.arguments[0].pop3 = document.getElementById("pop3").checked;
	window.arguments[0].imap = document.getElementById("imap").checked;
	window.arguments[0].smtp = document.getElementById("smtp").checked;
	window.arguments[0].file = document.getElementById("profPath").value;
	window.arguments[0].abort = false;
	return true;
}

