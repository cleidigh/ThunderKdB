if ("undefined" == typeof(wdw_cardbookConfigurationAddEmails)) {
	var { Services } = ChromeUtils.import("resource://gre/modules/Services.jsm");
	var { XPCOMUtils } = ChromeUtils.import("resource://gre/modules/XPCOMUtils.jsm");
	XPCOMUtils.defineLazyModuleGetter(this, "cardbookRepository", "chrome://cardbook/content/cardbookRepository.js", "cardbookRepository");

	var wdw_cardbookConfigurationAddEmails = {
		
		loadInclExcl: function () {
			cardbookElementTools.loadInclExcl("typeMenupopup", "typeMenulist", window.arguments[0].includeCode);
		},
		
		loadMailAccounts: function () {
			cardbookElementTools.loadMailAccounts("mailAccountMenupopup", "mailAccountMenulist", window.arguments[0].emailAccountId, true);
		},
		
		loadAB: function () {
			var aIncludeSearch = true;
			if (window.arguments[0].context === "Collection") {
				aIncludeSearch = false;
			}
			var ABList = document.getElementById('CardBookABMenulist');
			var ABPopup = document.getElementById('CardBookABMenupopup');
			cardbookElementTools.loadAddressBooks(ABPopup, ABList, window.arguments[0].addressBookId, true, false, true, aIncludeSearch, false);
		},
		
		loadCategories: function () {
			var ABList = document.getElementById('CardBookABMenulist');
			if (ABList.value) {
				var ABDefaultValue = ABList.value;
			} else {
				var ABDefaultValue = 0;
			}
			cardbookElementTools.loadCategories("categoryMenupopup", "categoryMenulist", ABDefaultValue, window.arguments[0].categoryId, false, false, false, true);
		},
		
		load: function () {
			document.title = cardbookRepository.strBundle.GetStringFromName("wdw_cardbookConfigurationAddEmails" + window.arguments[0].context + "Title");
			wdw_cardbookConfigurationAddEmails.loadInclExcl();
			wdw_cardbookConfigurationAddEmails.loadMailAccounts();
			wdw_cardbookConfigurationAddEmails.loadAB();
			wdw_cardbookConfigurationAddEmails.loadCategories();
			if (window.arguments[0].context === "Collection") {
				document.getElementById('typeRow').hidden = true;
			}
		},

		save: function () {
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
		},

		cancel: function () {
			window.arguments[0].typeAction="CANCEL";
			close();
		}

	};

};
