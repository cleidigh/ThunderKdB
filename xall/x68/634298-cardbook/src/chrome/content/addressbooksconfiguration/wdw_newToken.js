if ("undefined" == typeof(wdw_newToken)) {
	var { Services } = ChromeUtils.import("resource://gre/modules/Services.jsm");
	var { cardbookRepository } = ChromeUtils.import("chrome://cardbook/content/cardbookRepository.js");

	var wdw_newToken = {

		load: function () {
			let newTokenTitle = cardbookRepository.extension.localeData.localizeMessage("newTokenTitle", [window.arguments[0].email]);
			document.getElementById('wdw_newToken').setAttribute("title", newTokenTitle);
			let warnDescription = cardbookRepository.extension.localeData.localizeMessage("warnDescription", [window.arguments[0].email]);
			document.getElementById('warnDescription').textContent = warnDescription;
			let extName = cardbookRepository.extension.localeData.localizeMessage("extName");
			let applicationName = cardbookRepository.extension.localeData.localizeMessage("applicationName", [extName]);
			document.getElementById('applicationName').textContent = applicationName;
			let clientID = cardbookRepository.extension.localeData.localizeMessage("clientID", [window.arguments[0].clientID]);
			document.getElementById('clientID').textContent = clientID;
			if (window.arguments[0].scopeURL) {
				let scopeURL = cardbookRepository.extension.localeData.localizeMessage("scopeURL", [window.arguments[0].scopeURL]);
				document.getElementById('scopeURL').textContent = scopeURL;
			} else {
				document.getElementById('scopeURL').hidden = true;
			}
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
