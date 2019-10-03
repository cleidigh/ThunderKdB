Components.utils.import("resource://mapaplus/masterpasswordplusCore.jsm");
Components.utils.import("resource://gre/modules/XPCOMUtils.jsm");

function MasterPasswordPlus(){}

MasterPasswordPlus.prototype = {
	classDescription:		"Master Password+",
	classID:						Components.ID("{3F6CF5B4-39AE-11E3-9DB0-5FED6188709B}"),
	contractID:					"@mpp/masterpasswordplus;1",
	QueryInterface:			XPCOMUtils.generateQI([Components.interfaces.nsIMasterPasswordPlus]),
	_xpcom_categories:	[{category: "profile-after-change", entry: "MasterPasswordPlus"}],
	observe:						function(){}
};
if ("generateNSGetFactory" in XPCOMUtils)
	var NSGetFactory = XPCOMUtils.generateNSGetFactory([MasterPasswordPlus]);
else
	var NSGetModule = XPCOMUtils.generateNSGetModule([MasterPasswordPlus]);