var { Services } = ChromeUtils.import("resource://gre/modules/Services.jsm");

var EXPORTED_SYMBOLS = ["cardbookDiscovery"];
var cardbookDiscovery = {

	addAddressbook: function (aAccountsToAdd) {
		// this function is luckily not always available
		// especially after having added an address book, a new discovery does not reask for adding 
		let window = Services.wm.getMostRecentWindow("mail:3pane");
		if (window) {
			if (Services.wm.getMostRecentWindow("mail:3pane").openDialog && aAccountsToAdd.length != 0) {
				var myArgs = {action: "discovery", accountsToAdd: aAccountsToAdd};
				Services.wm.getMostRecentWindow("mail:3pane").openDialog("chrome://cardbook/content/addressbooksconfiguration/wdw_addressbooksAdd.xhtml", "", cardbookRepository.windowParams, myArgs);
			}
		}
	},

	removeAddressbook: function (aDirPrefId) {
		try {
			var myDirPrefIdName = cardbookRepository.cardbookPreferences.getName(aDirPrefId);
		
			var confirmTitle = cardbookRepository.extension.localeData.localizeMessage("confirmTitle");
			var confirmMsg = cardbookRepository.extension.localeData.localizeMessage("accountDeletionDiscoveryConfirmMessage", [myDirPrefIdName]);
			var returnFlag = false;
			returnFlag = Services.prompt.confirm(null, confirmTitle, confirmMsg);
			if (returnFlag) {
				cardbookRepository.removeAccountFromComplexSearch(aDirPrefId);
				cardbookRepository.removeAccountFromRepository(aDirPrefId);
				// cannot be launched from cardbookRepository
				cardbookIndexedDB.removeAccount(aDirPrefId, myDirPrefIdName);
				cardbookRepository.cardbookPreferences.delBranch(aDirPrefId);
				wdw_cardbook.loadCssRules();
				cardbookRepository.cardbookUtils.formatStringForOutput("addressbookDeleted", [myDirPrefIdName]);
				cardbookActions.addActivity("addressbookDeleted", [myDirPrefIdName], "deleteMail");
				cardbookRepository.cardbookUtils.notifyObservers("addressbookDeleted");
			}
		}
		catch (e) {
			cardbookRepository.cardbookLog.updateStatusProgressInformation("cardbookRepository.removeAddressbook error : " + e, "Error");
		}
	}
};
