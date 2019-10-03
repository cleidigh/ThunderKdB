Components.utils.import("resource://gre/modules/XPCOMUtils.jsm");

function EsignGlobal() {
	this.wrappedJSObject = this;
}

EsignGlobal.prototype = {
	classDescription: "Esign global values",
	classID: Components.ID("{9d41103d-3574-4379-aa28-364fc60c3336}"),
	contractID: "@esign.net/esign/global;1",
	QueryInterface: XPCOMUtils.generateQI([Components.interfaces.nsIEsignGlobal]),

	// Аттрибуты
	isSendSigned: false,
	isSendSignedAttachments: false,
	msgSigData: "",
	msgOriginalContent: "",
};

var NSGetFactory = XPCOMUtils.generateNSGetFactory([EsignGlobal]);