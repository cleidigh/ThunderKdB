// Import any needed modules.
var { Services } = ChromeUtils.import("resource://gre/modules/Services.jsm");

function onLoad(wasAlreadyOpen) {
	WL.injectCSS("chrome://cardbook/content/skin/mainToolbarButton.css");
	WL.injectCSS("chrome://cardbook/content/skin/cardbookComposeMsg.css");
	WL.injectCSS("chrome://cardbook/content/skin/cardbookToolbarButtons.css");
};
