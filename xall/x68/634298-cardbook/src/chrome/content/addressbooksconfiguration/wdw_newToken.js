if ("undefined" == typeof(wdw_newToken)) {
	var { Services } = ChromeUtils.import("resource://gre/modules/Services.jsm");
	var { cardbookRepository } = ChromeUtils.import("chrome://cardbook/content/cardbookRepository.js");

	var wdw_newToken = {

		load: function () {
			var myWindowTitle = cardbookRepository.extension.localeData.localizeMessage("newTokenTitle", [window.arguments[0].operationMail]);
			document.getElementById('wdw_newToken').setAttribute("title", myWindowTitle);
			var myWindowDescription = cardbookRepository.extension.localeData.localizeMessage("newTokenDescription", [window.arguments[0].operationMail]);
			document.getElementById('dialogMessage').textContent = myWindowDescription;
			var a = 1;
		},

		closeKO: function () {
			cardbookRepository.cardbookRefreshTokenError[window.arguments[0].dirPrefId]++;
			cardbookRepository.cardbookRefreshTokenResponse[window.arguments[0].dirPrefId]++;
			cardbookRepository.cardbookServerSyncResponse[window.arguments[0].dirPrefId]++;
			cardbookRepository.lTimerNewRefreshTokenAll[window.arguments[0].dirPrefId].cancel();
			close();
		}
	};

};
