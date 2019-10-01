if ("undefined" == typeof(wdw_cardbookPrint)) {
	var { Services } = ChromeUtils.import("resource://gre/modules/Services.jsm");
	var { XPCOMUtils } = ChromeUtils.import("resource://gre/modules/XPCOMUtils.jsm");
	XPCOMUtils.defineLazyModuleGetter(this, "cardbookRepository", "chrome://cardbook/content/cardbookRepository.js", "cardbookRepository");

	var wdw_cardbookPrint = {
		
		refreshHTML: function () {
			var iframeDoc = document.getElementById("wdw_cardbookContent").contentDocument;
			cardbookRepository.reloadCss("chrome://cardbook/skin/cardbookDataPrint.css");
			if (this.lastCategoriesStyleSheetUri) {
				cardbookRepository.unregisterCss(this.lastCategoriesStyleSheetUri);
				delete this.lastCategoriesStyleSheetUri;
			}
			var myHTML = cardbookPrint.buildHTML(window.arguments[0].listOfCards, document.getElementById("titleTextBox").value,
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
			body.appendChild(parserUtils.parseFragment(myHTML, Components.interfaces.nsIParserUtils.SanitizerDropForms | Components.interfaces.nsIParserUtils.SanitizerAllowStyle,
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
					var categoryCleanName = cardbookUtils.formatCategoryForCss(category);
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
			window.setTimeout(function() { PrintUtils.printPreview(); }, 500);
		},

		setWindowTitle: function () {
			if (window.arguments[0].title != "") {
				document.title = cardbookRepository.strBundle.formatStringFromName("wdw_cardbookPrintTitleLong", [window.arguments[0].title], 1);
			} else {
				document.title = cardbookRepository.strBundle.GetStringFromName("wdw_cardbookPrintTitle");
			}
			document.getElementById("titleTextBox").value = window.arguments[0].title;
		},

		printEngineWindow: {},
		printEngine: {},
		printSettings: null,

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
			wdw_cardbookPrint.PrintEngineCreateGlobals();
			wdw_cardbookPrint.InitPrintEngineWindow();
		},
		
		unload: function() {
			if (this.lastCategoriesStyleSheetUri) {
				cardbookRepository.unregisterCss(this.lastCategoriesStyleSheetUri);
			}
		},
		
		PrintEngineCreateGlobals: function() {
			/* get the print engine instance */
			wdw_cardbookPrint.printEngine = Components.classes['@mozilla.org/messenger/msgPrintEngine;1'].createInstance();
			wdw_cardbookPrint.printEngine = wdw_cardbookPrint.printEngine.QueryInterface(Components.interfaces.nsIMsgPrintEngine);
			wdw_cardbookPrint.printSettings = PrintUtils.getPrintSettings();
			if (wdw_cardbookPrint.printSettings) {
				wdw_cardbookPrint.printSettings.isCancelled = false;
			}
		},
		
		InitPrintEngineWindow: function() {
			var PrintPreviewListener = {
				getPrintPreviewBrowser: function () {
					return document.getElementById("wdw_cardbookContent");
				},
				getSourceBrowser: function () {
					return document.getElementById("wdw_cardbookContent");
				},
				getNavToolbox: function () {
					return document.getElementById("wdw_cardbookPrintToolbox");
				},
				onEnter: function () {
					wdw_cardbookPrint.refreshHTML();
					document.getElementById("wdw_cardbookContent").collapsed = true;
					wdw_cardbookPrint.printEngine.showWindow(true);
				},
				onExit: function () {
					window.close();
				}
			};

			/* Tell the nsIPrintEngine object what window is rendering the email */
			wdw_cardbookPrint.printEngine.setWindow(window);
			
			/* hide the printEngine window.  see bug #73995 */
			
			/* See if we got arguments.
			* Window was opened via window.openDialog.  Copy argument
			* and perform compose initialization
			*/
			if ( window.arguments && window.arguments[0] != null ) {
				wdw_cardbookPrint.printEngine.doPrintPreview = window.arguments[0].doPrintPreview;
				wdw_cardbookPrint.printEngine.showWindow(true);
				wdw_cardbookPrint.printEngine.setStatusFeedback(window.arguments[0].feedback);
			}
			PrintUtils.printPreview(PrintPreviewListener);
		},
		
		ClearPrintEnginePane: function() {
			if (window.frames["content"].location.href != "about:blank") {
				window.frames["content"].location.href = "about:blank";
			}
		},
		
		StopUrls: function() {
			wdw_cardbookPrint.printEngine.stopUrls();
		}

	};

};
