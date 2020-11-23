var { cardbookRepository } = ChromeUtils.import("chrome://cardbook/content/cardbookRepository.js");

function loadMailAccounts () {
	cardbookElementTools.loadMailAccounts("mailAccountMenupopup", "mailAccountMenulist", window.arguments[0].emailAccountId, true);
};

function loadAB () {
	var ABList = document.getElementById('CardBookABMenulist');
	var ABPopup = document.getElementById('CardBookABMenupopup');
	cardbookElementTools.loadAddressBooks(ABPopup, ABList, window.arguments[0].addressBookId, true, false, true, false, false);
};

function loadContacts () {
	cardbookElementTools.loadContacts("contactMenupopup", "contactMenulist", document.getElementById('CardBookABMenulist').value, window.arguments[0].contactId);
	changeFileName();
	changeVCard();
};
		
function changeFileName () {
	document.getElementById('filenameTextbox').value = document.getElementById('contactMenulist').label + ".vcf";
};
		
function changeVCard () {
	document.getElementById('VCardTextbox').value = cardbookRepository.cardbookUtils.getvCardForEmail(cardbookRepository.cardbookCards[document.getElementById('CardBookABMenulist').value+"::"+document.getElementById('contactMenulist').value]);
};
		
function checkRequired () {
	if (document.getElementById('filenameTextbox').value != "") {
		document.querySelector("dialog").getButton("accept").disabled = false;
	} else {
		document.querySelector("dialog").getButton("accept").disabled = true;
	}
};

function onLoadDialog () {
	i18n.updateDocument({ extension: cardbookRepository.extension });
	loadMailAccounts();
	loadAB();
	loadContacts();
	if (window.arguments[0].fileName != "") {
		document.getElementById('filenameTextbox').value = window.arguments[0].fileName;
	}
};

function onAcceptDialog () {
	window.arguments[0].emailAccountId = document.getElementById('mailAccountMenulist').value;
	window.arguments[0].emailAccountName = document.getElementById('mailAccountMenulist').label;
	window.arguments[0].fn = document.getElementById('contactMenulist').label;
	window.arguments[0].contactId = document.getElementById('contactMenulist').value;
	window.arguments[0].addressBookId = document.getElementById('CardBookABMenulist').value;
	window.arguments[0].fileName = document.getElementById('filenameTextbox').value;
	window.arguments[0].typeAction = "SAVE";
	close();
};

function onCancelDialog () {
	window.arguments[0].typeAction="CANCEL";
	close();
};

document.addEventListener("dialogaccept", onAcceptDialog);
document.addEventListener("dialogcancel", onCancelDialog);
document.addEventListener("input", checkRequired, true);
document.addEventListener("command", checkRequired, true);
