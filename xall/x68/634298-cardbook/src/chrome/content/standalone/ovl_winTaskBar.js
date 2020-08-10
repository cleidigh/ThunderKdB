if ("undefined" == typeof(ovl_winTaskBar)) {
	var { ConversionHelper } = ChromeUtils.import("chrome://cardbook/content/api/ConversionHelper/ConversionHelper.jsm");
	var { Services } = ChromeUtils.import("resource://gre/modules/Services.jsm");
	var { WinTaskbarJumpList } = ChromeUtils.import("resource:///modules/windowsJumpLists.js");
	var { XPCOMUtils } = ChromeUtils.import("resource://gre/modules/XPCOMUtils.jsm");
	XPCOMUtils.defineLazyModuleGetter(this, "cardbookRepository", "chrome://cardbook/content/cardbookRepository.js", "cardbookRepository");

	var ovl_winTaskBar = {

		CardBookTask : 
			// Open CardBook
			{
				get title()       { return ovl_winTaskBar.getString("cardbookTitle"); },
				get description() { return ovl_winTaskBar.getString("cardbookTitle"); },
				args:             "-cardbook",
				iconIndex:        3,
				open:             true,
				close:            true,
			},

			
		getString: function(aString) {
			return ConversionHelper.i18n.getMessage(aString);
		},

		add: function() {
			if (WinTaskbarJumpList && WinTaskbarJumpList._tasks) {
				Services.tm.currentThread.dispatch({ run: function() {
					var found = false;
					for (var myObj in WinTaskbarJumpList._tasks) {
						if (WinTaskbarJumpList._tasks[myObj].args == "-cardbook") {
							found = true;
							break;
						}
					}
					if (!found) {
						WinTaskbarJumpList._tasks.push(ovl_winTaskBar.CardBookTask);
						WinTaskbarJumpList.update();
					}
				}}, Components.interfaces.nsIEventTarget.DISPATCH_NORMAL);
			}
		}
	};
};
