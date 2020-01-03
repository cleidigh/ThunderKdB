Preferences.addAll([
	{ id: "extensions.foldersize.hide.statusbar_panel", type: "bool" },
	{ id: "extensions.foldersize.file_too_big.mb", type: "int" },
	{ id: "extensions.foldersize.imap.show_remote_size", type: "bool" },
	{ id: "extensions.foldersize.startup.check", type: "bool" },
	{ id: "extensions.foldersize.imap.show_quota", type: "bool" },
	{ id: "extensions.foldersize.warningColor", type: "string" },
]);

var sfsopt = {

	prefs : {
		orgPrefs : Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefBranch),
		getBoolPref: function(key){
			try{
				var tmpVal = this.orgPrefs.getBoolPref(key);
				if(tmpVal || tmpVal === "true"){
					return true;
				}else{
					return false;
				}
			}catch(e){
				return false;
			}
		}
	},

	savePrefs: function() {
		var wm = Components.classes["@mozilla.org/appshell/window-mediator;1"]
	                   .getService(Components.interfaces.nsIWindowMediator);
		var enumerator = wm.getEnumerator("mail:3pane");
		while(enumerator.hasMoreElements()) {
			var win = enumerator.getNext();
			if (this.prefs.getBoolPref("extensions.foldersize.hide.statusbar_panel"))
				win.document.getElementById("folderSizePanel").collapsed = true;
			else
				win.document.getElementById("folderSizePanel").collapsed = false;
		}
	}
}
document.addEventListener("dialogaccept", function(event) {
	sfsopt.savePrefs();
	//event.preventDefault(); // Prevent the dialog closing.
});