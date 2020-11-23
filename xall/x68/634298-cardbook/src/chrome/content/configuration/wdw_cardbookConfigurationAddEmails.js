var { Services } = ChromeUtils.import("resource://gre/modules/Services.jsm");
var { cardbookRepository } = ChromeUtils.import("chrome://cardbook/content/cardbookRepository.js");

function loadInclExcl () {
	cardbookElementTools.loadInclExcl("typeMenupopup", "typeMenulist", window.arguments[0].includeCode);
};

function loadMailAccounts () {
	cardbookElementTools.loadMailAccounts("mailAccountMenupopup", "mailAccountMenulist", window.arguments[0].emailAccountId, true);
};

function loadAB () {
	var aIncludeSearch = true;
	if (window.arguments[0].context === "Collection") {
		aIncludeSearch = false;
	}
	var ABList = document.getElementById('CardBookABMenulist');
	var ABPopup = document.getElementById('CardBookABMenupopup');
	cardbookElementTools.loadAddressBooks(ABPopup, ABList, window.arguments[0].addressBookId, true, false, true, aIncludeSearch, false);
};

function loadCategories () {
	var ABList = document.getElementById('CardBookABMenulist');
	if (ABList.value) {
		var ABDefaultValue = ABList.value;
	} else {
		var ABDefaultValue = 0;
	}
	cardbookElementTools.loadCategories("categoryMenupopup", "categoryMenulist", ABDefaultValue, window.arguments[0].categoryId, false, false, false, true);
};

function onLoadDialog () {
	i18n.updateDocument({ extension: cardbookRepository.extension });
	document.title = cardbookRepository.extension.localeData.localizeMessage("wdw_cardbookConfigurationAddEmails" + window.arguments[0].context + "Title");
	loadInclExcl();
	loadMailAccounts();
	loadAB();
	loadCategories();
	if (window.arguments[0].context === "Collection") {
		document.getElementById('typeRow').hidden = true;
	}
};

function onAcceptDialog () {
	window.arguments[0].emailAccountId=document.getElementById('mailAccountMenulist').value;
	window.arguments[0].emailAccountName=document.getElementById('mailAccountMenulist').label;
	window.arguments[0].addressBookId=document.getElementById('CardBookABMenulist').value;
	window.arguments[0].addressBookName=document.getElementById('CardBookABMenulist').label;
	window.arguments[0].categoryId=document.getElementById('categoryMenulist').value;
	window.arguments[0].categoryName=document.getElementById('categoryMenulist').label;
	window.arguments[0].includeName=document.getElementById('typeMenulist').label;
	window.arguments[0].includeCode=document.getElementById('typeMenulist').value;
	window.arguments[0].typeAction="SAVE";
	close();
};

function onCancelDialog () {
	window.arguments[0].typeAction="CANCEL";
	close();
};

document.addEventListener("dialogaccept", onAcceptDialog);
document.addEventListener("dialogcancel", onCancelDialog);
