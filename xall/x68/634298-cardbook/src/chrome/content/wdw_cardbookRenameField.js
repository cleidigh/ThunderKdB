var { Services } = ChromeUtils.import("resource://gre/modules/Services.jsm");
var { XPCOMUtils } = ChromeUtils.import("resource://gre/modules/XPCOMUtils.jsm");
var { cardbookRepository } = ChromeUtils.import("chrome://cardbook/content/cardbookRepository.js");

var renameFieldNotification = {};
XPCOMUtils.defineLazyGetter(renameFieldNotification, "errorNotifications", () => {
	return new MozElements.NotificationBox(element => {
		element.setAttribute("flex", "1");
		document.getElementById("errorNotificationsHbox").append(element);
	});
});
		
function validate () {
	var myValue = document.getElementById('typeTextBox').value;
	if (!myValue) {
		document.querySelector("dialog").getButton("accept").disabled = true;
		return false;
	} else {
		var myValidationList = JSON.parse(JSON.stringify(window.arguments[0].validationList));
		function filterOriginal(element) {
			return (element != myValue);
		}
		myValidationList = myValidationList.filter(filterOriginal);
		if (myValidationList.length != window.arguments[0].validationList.length) {
			cardbookNotifications.setNotification(renameFieldNotification.errorNotifications, "valueAlreadyExists", [myValue]);
			document.querySelector("dialog").getButton("accept").disabled = true;
			return false;
		} else {
			cardbookNotifications.setNotification(renameFieldNotification.errorNotifications, "OK");
			document.querySelector("dialog").getButton("accept").disabled = false;
			return true;
		}
	}
};

function onLoadDialog () {
	i18n.updateDocument({ extension: cardbookRepository.extension });
	document.title = cardbookRepository.extension.localeData.localizeMessage("wdw_cardbookRenameField" + window.arguments[0].context + "Title");
	if (window.arguments[0].context == "EditNode") {
		var orgStructure = cardbookRepository.cardbookPreferences.getStringPref("extensions.cardbook.orgStructure");
		if (orgStructure != "") {
			var tmpArray = cardbookRepository.cardbookUtils.unescapeArray(cardbookRepository.cardbookUtils.escapeString(orgStructure).split(";"));
			var idArray = window.arguments[0].id.split("::");
			document.getElementById('typeLabel').value = cardbookRepository.extension.localeData.localizeMessage("wdw_cardbookRenameField" + window.arguments[0].context + "Label", [tmpArray[idArray.length - 2]]);
		}
	} else {
		document.getElementById('typeLabel').value = cardbookRepository.extension.localeData.localizeMessage("wdw_cardbookRenameField" + window.arguments[0].context + "Label");
	}

	if (window.arguments[0].context == "EditNode") {
		document.getElementById('colorRow').hidden = true;
	} else if ('color' in window.arguments[0]) {
		if (window.arguments[0].color) {
			document.getElementById('useColorCheck').checked = window.arguments[0].color;
			document.getElementById('colorInput').value = window.arguments[0].color;
		}
	} else {
		document.getElementById('colorRow').hidden = true;
	}
	document.getElementById('typeTextBox').value = window.arguments[0].type;
	document.getElementById('typeTextBox').focus();
};

function onAcceptDialog () {
	if (validate()) {
		window.arguments[0].type = document.getElementById('typeTextBox').value.trim();
		if (document.getElementById('colorRow').getAttribute("hidden") != "true") {
			window.arguments[0].color = document.getElementById('useColorCheck').checked ? document.getElementById('colorInput').value : '';
		}
		window.arguments[0].typeAction="SAVE";
		if (typeof window.arguments[0].onSaved == "function") {
			window.arguments[0].onSaved();
		}
		close();
	}
};

function onCancelDialog () {
	window.arguments[0].typeAction="CANCEL";
	close();
};

document.addEventListener("dialogaccept", onAcceptDialog);
document.addEventListener("dialogcancel", onCancelDialog);
document.addEventListener("popupshowing", cardbookRichContext.loadRichContext, true);
