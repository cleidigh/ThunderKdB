if ("undefined" == typeof(cardbookDiscovery)) {
	var { Services } = ChromeUtils.import("resource://gre/modules/Services.jsm");
	var { XPCOMUtils } = ChromeUtils.import("resource://gre/modules/XPCOMUtils.jsm");
	XPCOMUtils.defineLazyModuleGetter(this, "cardbookRepository", "chrome://cardbook/content/cardbookRepository.js", "cardbookRepository");

	var loader = Services.scriptloader;
	loader.loadSubScript("chrome://cardbook/content/preferences/cardbookPreferences.js");
	loader.loadSubScript("chrome://cardbook/content/cardbookLog.js");
	loader.loadSubScript("chrome://cardbook/content/cardbookUtils.js");
	
	var cardbookDiscovery = {

		addAddressbook: function (aAccountsToAdd) {
			// this function is luckily not always available
			// especially after having added an address book, a new discovery does not reask for adding 
			if (window && window.openDialog && aAccountsToAdd.length != 0) {
				var myArgs = {action: "discovery", accountsToAdd: aAccountsToAdd};
				window.openDialog("chrome://cardbook/content/addressbooksconfiguration/wdw_addressbooksAdd.xul", "", cardbookRepository.windowParams, myArgs);
			}
		},

		removeAddressbook: function (aDirPrefId) {
			try {
				var myDirPrefIdName = cardbookPreferences.getName(aDirPrefId);
			
				var confirmTitle = cardbookRepository.strBundle.GetStringFromName("confirmTitle");
				var confirmMsg = cardbookRepository.strBundle.formatStringFromName("accountDeletionDiscoveryConfirmMessage", [myDirPrefIdName], 1);
				var returnFlag = false;
				returnFlag = Services.prompt.confirm(null, confirmTitle, confirmMsg);
				if (returnFlag) {
					cardbookRepository.removeAccountFromComplexSearch(aDirPrefId);
					cardbookRepository.removeAccountFromRepository(aDirPrefId);
					// cannot be launched from cardbookRepository
					cardbookIndexedDB.removeAccount(aDirPrefId, myDirPrefIdName);
					cardbookPreferences.delBranch(aDirPrefId);
					wdw_cardbook.loadCssRules();
					cardbookUtils.formatStringForOutput("addressbookDeleted", [myDirPrefIdName]);
					cardbookActions.addActivity("addressbookDeleted", [myDirPrefIdName], "deleteMail");
					cardbookUtils.notifyObservers("addressbookDeleted");
				}
			}
			catch (e) {
				cardbookLog.updateStatusProgressInformation("cardbookRepository.removeAddressbook error : " + e, "Error");
			}
		}
	};
};
