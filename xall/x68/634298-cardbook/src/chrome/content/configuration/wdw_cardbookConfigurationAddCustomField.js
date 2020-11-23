var { Services } = ChromeUtils.import("resource://gre/modules/Services.jsm");
var { XPCOMUtils } = ChromeUtils.import("resource://gre/modules/XPCOMUtils.jsm");
var { cardbookRepository } = ChromeUtils.import("chrome://cardbook/content/cardbookRepository.js");

var CardBookConfigAddCustomNotification = {};
XPCOMUtils.defineLazyGetter(CardBookConfigAddCustomNotification, "errorNotifications", () => {
	return new MozElements.NotificationBox(element => {
		element.setAttribute("flex", "1");
		document.getElementById("errorNotificationsHbox").append(element);
	});
});

function customFieldCheck (aTextBox) {
	var myValue = aTextBox.value.trim();
	if (myValue == "") {
		aTextBox.value = "X-";
	} else {
		aTextBox.value = myValue.toUpperCase();
	}
};

function validateCustomValues () {
	var myValue = document.getElementById('customFieldCodeTextBox').value;
	var myValidationList = JSON.parse(JSON.stringify(window.arguments[0].validationList));
	function filterOriginal(element) {
		return (element != myValue);
	}
	myValidationList = myValidationList.filter(filterOriginal);
	if (myValidationList.length != window.arguments[0].validationList.length) {
		cardbookNotifications.setNotification(CardBookConfigAddCustomNotification.errorNotifications, "customFieldsErrorUNIQUE");
		return false;
	} else if (myValue.toUpperCase() !== myValue) {
		cardbookNotifications.setNotification(CardBookConfigAddCustomNotification.errorNotifications, "customFieldsErrorUPPERCASE", [myValue]);
		return false;
	} else if (!(myValue.toUpperCase().startsWith("X-"))) {
		cardbookNotifications.setNotification(CardBookConfigAddCustomNotification.errorNotifications, "customFieldsErrorX", [myValue]);
		return false;
	} else if (cardbookRepository.notAllowedCustoms.indexOf(myValue.toUpperCase()) != -1) {
		cardbookNotifications.setNotification(CardBookConfigAddCustomNotification.errorNotifications, "customFieldsErrorFIELD", [myValue]);
		return false;
	} else if (myValue.includes(":") || myValue.includes(",") || myValue.includes(";") || myValue.includes(".")) {
		cardbookNotifications.setNotification(CardBookConfigAddCustomNotification.errorNotifications, "customFieldsErrorCHAR", [myValue]);
		return false;
	} else {
		cardbookNotifications.setNotification(CardBookConfigAddCustomNotification.errorNotifications, "OK");
		return true;
	}
};

function validate () {
	var fieldCode = document.getElementById("customFieldCodeTextBox").value;
	var fieldLabel = document.getElementById("customFieldLabelTextBox").value;
	var btnSave = document.querySelector("dialog").getButton("accept");
	if (fieldCode != "" && fieldLabel != "") {
		btnSave.disabled = false;
		return validateCustomValues();
	} else {
		btnSave.disabled = true;
		cardbookNotifications.setNotification(CardBookConfigAddCustomNotification.errorNotifications, "OK");
		return false;
	}
};

function onLoadDialog () {
	i18n.updateDocument({ extension: cardbookRepository.extension });
	document.getElementById('customFieldCodeTextBox').value = window.arguments[0].code;
	document.getElementById('customFieldLabelTextBox').value = window.arguments[0].label;
	document.getElementById('customFieldCodeTextBox').focus();
	customFieldCheck(document.getElementById('customFieldCodeTextBox'));
	validate();
};

function onAcceptDialog () {
	if (validate()) {
		window.arguments[0].code = document.getElementById('customFieldCodeTextBox').value.trim();
		window.arguments[0].label = document.getElementById('customFieldLabelTextBox').value.trim();
		window.arguments[0].typeAction="SAVE";
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
