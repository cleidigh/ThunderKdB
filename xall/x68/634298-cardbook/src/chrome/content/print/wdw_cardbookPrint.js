if ("undefined" == typeof(wdw_cardbookPrint)) {
	var { Services } = ChromeUtils.import("resource://gre/modules/Services.jsm");
	var { ConversionHelper } = ChromeUtils.import("chrome://cardbook/content/api/ConversionHelper/ConversionHelper.jsm");
	var { XPCOMUtils } = ChromeUtils.import("resource://gre/modules/XPCOMUtils.jsm");
	XPCOMUtils.defineLazyModuleGetter(this, "cardbookRepository", "chrome://cardbook/content/cardbookRepository.js", "cardbookRepository");

	var wdw_cardbookPrint = {
		
		myHTML: "",
		
		refreshHTML: function () {
			var iframeDoc = document.getElementById("content").contentDocument;
			cardbookRepository.reloadCss("chrome://cardbook/content/skin/cardbookDataPrint.css");
			if (this.lastCategoriesStyleSheetUri) {
				cardbookRepository.unregisterCss(this.lastCategoriesStyleSheetUri);
				delete this.lastCategoriesStyleSheetUri;
			}
			wdw_cardbookPrint.myHTML = cardbookPrint.buildHTML(window.arguments[0].listOfCards, document.getElementById("titleTextBox").value,
																		{ display: document.getElementById("displayCheckBox").checked,
																			headers: document.getElementById("displayHeadersCheckBox").checked,
																			fieldNames: document.getElementById("displayFieldNamesCheckBox").checked,
																			types: document.getElementById("displayTypesCheckBox").checked,
																			personal: document.getElementById("personalCheckBox").checked,
																			org: document.getElementById("orgCheckBox").checked,
																			categories: document.getElementById("categoriesCheckBox").checked,
																			adr: document.getElementById("adrCheckBox").checked,
																			tel: document.getElementById("telCheckBox").checked,
																			email: document.getElementById("emailCheckBox").checked,
																			impp: document.getElementById("imppCheckBox").checked,
																			url: document.getElementById("urlCheckBox").checked,
																			note: document.getElementById("noteCheckBox").checked } );
			var html = document.implementation.createDocument("http://www.w3.org/1999/xhtml", "html", null);
			var body = document.createElementNS("http://www.w3.org/1999/xhtml", "body");
			html.documentElement.appendChild(body);
			var parserUtils = Components.classes["@mozilla.org/parserutils;1"].getService(Components.interfaces.nsIParserUtils);
			body.appendChild(parserUtils.parseFragment(wdw_cardbookPrint.myHTML, Components.interfaces.nsIParserUtils.SanitizerDropForms | Components.interfaces.nsIParserUtils.SanitizerAllowStyle,
														false, null, body));
			iframeDoc.body = body;
			if (document.getElementById("titleTextBox").value != "") {
				iframeDoc.title = document.getElementById("titleTextBox").value;
			} else {
				iframeDoc.title = "CardBook";
			}
			if (PrintUtils.getPrintSettings().printBGColors) {
				var styles = [];
				for (let category in cardbookRepository.cardbookNodeColors) {
					var categoryCleanName = cardbookRepository.cardbookUtils.formatCategoryForCss(category);
					var color = cardbookRepository.cardbookNodeColors[category];
					if (!color) {
						continue;
					}
					var oppositeColor = cardbookRepository.getTextColorFromBackgroundColor(color);
					styles.push(".print_preview_category_" + categoryCleanName + "{ color: " + oppositeColor + "; background-color: " + color + "}");
				}
				this.lastCategoriesStyleSheetUri = 'data:text/css,' + encodeURIComponent(styles.join('\n'));
				cardbookRepository.reloadCss(this.lastCategoriesStyleSheetUri);
			}
		},

		setWindowTitle: function () {
			if (window.arguments[0].title != "") {
				document.title = ConversionHelper.i18n.getMessage("wdw_cardbookPrintTitleLong", [window.arguments[0].title]);
			} else {
				document.title = ConversionHelper.i18n.getMessage("wdw_cardbookPrintTitle");
			}
			document.getElementById("titleTextBox").value = window.arguments[0].title;
		},

		loadCheckboxes: function() {
			var myFields = [ "adr", "categories", "display", "displayHeaders", "displayFieldNames", "displayTypes", "email", "impp", "note", "org", "personal", "tel", "url" ];
			for (var i = 0; i < myFields.length; i++) {
				var myCheckbox = document.getElementById(myFields[i] + "CheckBox");
				if (myCheckbox.getAttribute("checked") == "true") {
					myCheckbox.checked = true;
				} else {
					myCheckbox.checked = false;
				}
			}
		},

		load: function() {
			wdw_cardbookPrint.setWindowTitle();
			wdw_cardbookPrint.loadCheckboxes();
			wdw_cardbookPrint.refreshHTML();
		},
		
		unload: function() {
			if (this.lastCategoriesStyleSheetUri) {
				cardbookRepository.unregisterCss(this.lastCategoriesStyleSheetUri);
			}
		}
		
	};

};

// translations
window.addEventListener("DOMContentLoaded", function(e) {
	cardbookLocales.updateDocument();
}, false);

document.addEventListener("dialogaccept", event => {
	let printSettings = PrintUtils.getPrintSettings();
	// Evicts "about:blank" header
	printSettings.docURL = " ";
	
	// we don't do anything with statusFeedback, msgPrintEngine requires it
	let statusFeedback = Components.classes["@mozilla.org/messenger/statusfeedback;1"].createInstance();
	statusFeedback = statusFeedback.QueryInterface(Components.interfaces.nsIMsgStatusFeedback);
	
	let printWindow = window.openDialog(
		"chrome://messenger/content/msgPrintEngine.xhtml",
		"",
		"chrome,dialog=no,all",
		1,
		[document.getElementById("content").src],
		statusFeedback,
		false,
		0
	);
	
	let closer = aEvent => {
		// printWindow is loaded multiple time in the print process and only
		// at the end with fully loaded document, so we must not register a
		// onetime listener here nor should we close too early so that the
		// the opener is still available when the document finally loaded
		if (aEvent.type == "unload" && printWindow.document.readyState == "complete") {
			printWindow.removeEventListener("unload", closer);
			window.close();
		}
	};
	printWindow.addEventListener("unload", closer);
	event.preventDefault(); // leave open
});