/* global strftime, Preferences */
var { Services } = ChromeUtils.import('resource://gre/modules/Services.jsm');
const { strftime } = ChromeUtils.import("chrome://messagearchiveoptions/content/strftime.js");

// For TB68 the dialog needs to be of type child to not use instantApply  
const dialog = document.getElementById("messagearchiveoptionsPreferences");
const versionChecker = Services.vc;
const currentVersion = Services.appinfo.platformVersion;

if (versionChecker.compare(currentVersion, "61") >= 0) {
	dialog.setAttribute("type", "child");
}

Preferences.addAll([
	{ id: "extensions.messagearchiveoptions@eviljeff.com.monthstring", type: "unichar" },
	{ id: "extensions.messagearchiveoptions@eviljeff.com.yearstring", type: "unichar" },
	{ id: "mail.identity.default.archive_granularity", type: "int" },
	{ id: "extensions.messagearchiveoptions@eviljeff.com.key.alt", type: "bool" },
	{ id: "extensions.messagearchiveoptions@eviljeff.com.key.shift", type: "bool" },
	{ id: "extensions.messagearchiveoptions@eviljeff.com.key.control", type: "bool" },
]);


function granualitySwitch() {
	var yearradio = document.getElementById('granuality1');
	var monthradio = document.getElementById('granuality2');
	var yearField = document.getElementById('year');
	var monthField = document.getElementById('month');

	if (monthradio.selected) monthField.removeAttribute("disabled");
	else monthField.setAttribute("disabled", "true");
	if (yearradio.selected || monthradio.selected) yearField.removeAttribute("disabled");
	else yearField.setAttribute("disabled", "true");
}

function strftimeReferenceLoad() {
	let tabmail = getMail3Pane();
	const ref = "https://thdoan.github.io/strftime/";
	tabmail.openTab("chromeTab", { chromePage: ref });
}

function getMail3Pane() {
	var w = Cc["@mozilla.org/appshell/window-mediator;1"]
		.getService(Ci.nsIWindowMediator)
		.getMostRecentWindow("mail:3pane");
	return w;
}


function onDialogAccept(e) {
	const promptStrings = Services.strings.createBundle("chrome://messagearchiveoptions/locale/messagearchiveoptions.properties");

	var yearField = document.getElementById('year').value;
	var monthField = document.getElementById('month').value;
	const mFolder = strftime.strftime(monthField);
	const yFolder = strftime.strftime(yearField);

	let illegalChars = /[^a-z0-9_()-\s]/gi;

	const promptTitle = promptStrings.GetStringFromName("extensions.messagearchiveoptions.prompttitle.formaterror");

	if (illegalChars.test(mFolder)) {
		const promptError = promptStrings.GetStringFromName("extensions.messagearchiveoptions.prompt.illegalmonthformat");
		Services.prompt.alert(window, promptTitle, promptError + ':  ' + monthField);
		if (!!e) {
			e.preventDefault();
			e.stopPropagation();
		}
		return false;
	}

	if (illegalChars.test(yFolder)) {
		const promptError = promptStrings.GetStringFromName("extensions.messagearchiveoptions.prompt.illegalyearformat");
		Services.prompt.alert(window, promptTitle, promptError + ':  ' + yearField);
		if (!!e) {
			e.preventDefault();
			e.stopPropagation();
		}
		return false;
	}

	return true;
}

function onLoad(e) {
	granualitySwitch();
}

function onbeforeaccept(e) {
	// Services.console.logStringMessage("before except");
	return onDialogAccept(e);
}

document.addEventListener('dialogcancel', function (e) {
	return true;
});

window.addEventListener("load", function (e) { onLoad(e); }, false);
