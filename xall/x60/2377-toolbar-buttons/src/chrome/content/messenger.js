toolbar_buttons.toolbar_button_loader(toolbar_buttons, {
		GetWindowByWindowType: function(windowType) {
		var windowManager = toolbar_buttons.interfaces.WindowMediator;
		return windowManager.getMostRecentWindow(windowType);
	},
	MsgSearchAddresses: function(event) {
		var args = {directory: null};
		toolbar_buttons.OpenOrFocusWindow(event, args, "mailnews:absearch", "chrome://messenger/content/ABSearchDialog.xul");
	},
	OpenOrFocusWindow: function(event, args, windowType, chromeURL) {
		var win = event.target.ownerDocument.defaultView;
		var desiredWindow = toolbar_buttons.GetWindowByWindowType(windowType);
		if (desiredWindow) {
			desiredWindow.focus();
			if ("refresh" in args && args.refresh) {
				desiredWindow.refresh();
			}
		} else {
			win.openDialog(chromeURL, "", "chrome,resizable,status,centerscreen,dialog=no", args);
		}
	},
	realNextMessage: function(event) {
		var prefs = toolbar_buttons.interfaces.ExtensionPrefBranch;
		toolbar_buttons.realNavigate(event, prefs.getBoolPref("next"), true);
	},
	realPreviousMessage: function(event) {
		var prefs = toolbar_buttons.interfaces.ExtensionPrefBranch;
		toolbar_buttons.realNavigate(event, !prefs.getBoolPref("next"), true);
	},
	toggleHtmlMode: function(event) {
		var win = event.target.ownerDocument.defaultView;
		var prefs = toolbar_buttons.interfaces.PrefBranch;
		var value = prefs.getIntPref("mailnews.display.html_as");
		[win.MsgBodyAsPlaintext, win.MsgBodySanitized, win.MsgBodySanitized, win.MsgBodyAllowHTML][value]();
	}
});
