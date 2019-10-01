var MsgDeleteSelectedMessagesOriginal = MsgDeleteSelectedMessages;
var MsgDeleteSelectedMessages = function(aCommandType) {
	var reallyDelete;
	if (aCommandType == nsMsgViewCommandType.deleteNoTrash)
		reallyDelete = CBD.ask(true);
	else
		reallyDelete = CBD.ask(false);
	if (reallyDelete)
		MsgDeleteSelectedMessagesOriginal.apply(this,arguments);		
};

var CBD = {
	
	init : function() {
		CBD.prefs  = Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefBranch);
		var strBundleService = Components.classes["@mozilla.org/intl/stringbundle;1"].getService(Components.interfaces.nsIStringBundleService);
		CBD.bundle = strBundleService.createBundle("chrome://confirmbeforedelete/locale/confirmbeforedelete.properties");
	},

	confirm : function(string) {
		var prompts = Components.classes["@mozilla.org/embedcomp/prompt-service;1"]
			.getService(Components.interfaces.nsIPromptService);
		var canceldefault = CBD.prefs.getBoolPref("extensions.confirmbeforedelete.default.cancel");
		if (canceldefault)
			// This is the prompt with "Cancel" as default
			var flags = prompts. BUTTON_TITLE_OK     * prompts.BUTTON_POS_0 +
		            prompts.BUTTON_TITLE_CANCEL    *prompts.BUTTON_POS_1   + prompts.BUTTON_POS_1_DEFAULT;
		else 
			// This is the prompt with "OK" as default
			var flags = prompts. BUTTON_TITLE_OK     * prompts.BUTTON_POS_0 +
	        	    prompts.BUTTON_TITLE_CANCEL    *prompts.BUTTON_POS_1;
		var wintitle = CBD.bundle.GetStringFromName("wintitle");
		var button = prompts.confirmEx(window, wintitle, string, flags,  "Button 0", "Button 1", "", null, {});
		if (button==1)
			return false;
		else
			return true;
	},

	ask : function(isButtonDeleteWithShift) {
		if (! CBD.prefs.getBoolPref("extensions.confirmbeforedelete.delete.enable"))
			return true;
		if (isButtonDeleteWithShift)
			return CBD.checkforshift();
		else if (CBD.prefs.getBoolPref("extensions.confirmbeforedelete.gotrash.enable"))	
			return CBD.confirmbeforedelete('gotrash');
		else
			return true;
	},

	confirmbeforedelete : function(type) {
		return CBD.confirm(CBD.bundle.GetStringFromName(type));
	},

	checkforshift: function() {
		if (! CBD.prefs.getBoolPref("extensions.confirmbeforedelete.shiftcanc.enable"))
			return true;
		return CBD.confirmbeforedelete('mailyesno')
	}
};

window.addEventListener("load", CBD.init, false);


