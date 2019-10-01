if ("undefined" == typeof(wdw_cardbookConfigurationAddVcards)) {
	var { XPCOMUtils } = ChromeUtils.import("resource://gre/modules/XPCOMUtils.jsm");
	XPCOMUtils.defineLazyModuleGetter(this, "cardbookRepository", "chrome://cardbook/content/cardbookRepository.js", "cardbookRepository");

	var wdw_cardbookConfigurationAddVcards = {
		
		loadMailAccounts: function () {
			cardbookElementTools.loadMailAccounts("mailAccountMenupopup", "mailAccountMenulist", window.arguments[0].emailAccountId, true);
		},
		
		loadAB: function () {
			var ABList = document.getElementById('CardBookABMenulist');
			var ABPopup = document.getElementById('CardBookABMenupopup');
			cardbookElementTools.loadAddressBooks(ABPopup, ABList, window.arguments[0].addressBookId, true, false, true, false, false);
		},
		
		loadContacts: function () {
			cardbookElementTools.loadContacts("contactMenupopup", "contactMenulist", document.getElementById('CardBookABMenulist').value, window.arguments[0].contactId);
			wdw_cardbookConfigurationAddVcards.changeFileName();
			wdw_cardbookConfigurationAddVcards.changeVCard();
		},
				
		changeFileName: function () {
			document.getElementById('filenameTextbox').value = document.getElementById('contactMenulist').label + ".vcf";
		},
				
		changeVCard: function () {
			document.getElementById('VCardTextbox').value = cardbookUtils.getvCardForEmail(cardbookRepository.cardbookCards[document.getElementById('CardBookABMenulist').value+"::"+document.getElementById('contactMenulist').value]);
		},
				
		load: function () {
			wdw_cardbookConfigurationAddVcards.loadMailAccounts();
			wdw_cardbookConfigurationAddVcards.loadAB();
			wdw_cardbookConfigurationAddVcards.loadContacts();
			if (window.arguments[0].fileName != "") {
				document.getElementById('filenameTextbox').value = window.arguments[0].fileName;
			}
		},

		save: function () {
			var myFileName = document.getElementById('filenameTextbox').value;
			if (myFileName != "") {
				window.arguments[0].emailAccountId = document.getElementById('mailAccountMenulist').value;
				window.arguments[0].emailAccountName = document.getElementById('mailAccountMenulist').label;
				window.arguments[0].fn = document.getElementById('contactMenulist').label;
				window.arguments[0].contactId = document.getElementById('contactMenulist').value;
				window.arguments[0].addressBookId = document.getElementById('CardBookABMenulist').value;
				window.arguments[0].fileName = myFileName;
				window.arguments[0].typeAction = "SAVE";
				close();
			}
		},

		cancel: function () {
			window.arguments[0].typeAction="CANCEL";
			close();
		}

	};

};
