var { Services } = ChromeUtils.import("resource://gre/modules/Services.jsm");
var { XPCOMUtils } = ChromeUtils.import("resource://gre/modules/XPCOMUtils.jsm");

function CardBookCmdLineHandler() {}

CardBookCmdLineHandler.prototype = {
	classID: Components.ID("{823f4516-885f-492d-b8d3-d5e8c8316be1}"),
	description: "CardBookCommandLine",
	contractID: "@mozilla.org/commandlinehandler/general-startup;1?type=cardbook",
	
	QueryInterface: ChromeUtils.generateQI([Components.interfaces.nsICommandLineHandler]),

	handle: function (aCmdLine) {
		if (aCmdLine.handleFlag("cardbook", false)) {
			let topWindow = Services.wm.getMostRecentWindow("CardBook:standaloneWindow");
			if (topWindow) {
				topWindow.focus();
			} else {
				Services.ww.openWindow(null, "chrome://cardbook/content/standalone/wdw_cardbookWin.xhtml", "_blank",
										"chrome,extrachrome,menubar,resizable,scrollbars,status,toolbar,dialog=no", aCmdLine);
			}
			aCmdLine.preventDefault = true;
		}
	},

	helpInfo: "  -cardbook            Open CardBook.\n"
};

function NSGetFactory(cid) {
	return (XPCOMUtils.generateNSGetFactory([CardBookCmdLineHandler]))(cid);
}

var CardBookCmdLineHandlerRegistrar = Components.manager.QueryInterface(Components.interfaces.nsIComponentRegistrar);
if (!CardBookCmdLineHandlerRegistrar.isContractIDRegistered(CardBookCmdLineHandler.prototype.contractID)) {
	CardBookCmdLineHandlerRegistrar.registerFactory(
		CardBookCmdLineHandler.prototype.classID,
		CardBookCmdLineHandler.prototype.description,
		CardBookCmdLineHandler.prototype.contractID,
		NSGetFactory(CardBookCmdLineHandler.prototype.classID)
	);

	Services.catMan.addCategoryEntry(
		"command-line-handler",
		"m-cardbook",
		CardBookCmdLineHandler.prototype.contractID,
		false,
		false
	);
}
