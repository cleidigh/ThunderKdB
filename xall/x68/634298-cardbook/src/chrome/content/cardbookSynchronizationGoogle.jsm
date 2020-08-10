var { Services } = ChromeUtils.import("resource://gre/modules/Services.jsm");

var loader = Services.scriptloader;
loader.loadSubScript("chrome://cardbook/content/cardbookWebDAV.js", this);

var EXPORTED_SYMBOLS = ["cardbookSynchronizationGoogle"];
var cardbookSynchronizationGoogle = {

	getNewAccessTokenForGoogle: function(aConnection, aCode, aOperationType, aParams) {
		var listener_getAccessToken = {
			onDAVQueryComplete: function(status, response, askCertificate) {
				if (status > 199 && status < 400) {
					try {
						var responseText = JSON.parse(response);
						cardbookRepository.cardbookUtils.formatStringForOutput("googleAccessTokenOK", [aConnection.connDescription, cardbookRepository.cardbookUtils.cleanWebObject(responseText)]);
						aConnection.accessToken = responseText.token_type + " " + responseText.access_token;
						aConnection.connUrl = cardbookRepository.cardbookSynchronization.getWellKnownUrl(cardbookRepository.cardbookOAuthData.GOOGLE.ROOT_API);
						cardbookRepository.cardbookSynchronization.discoverPhase1(aConnection, aOperationType, aParams);
					}
					catch(e) {
						cardbookRepository.cardbookServerSyncResponse[aConnection.connPrefId]++;
						cardbookRepository.cardbookAccessTokenError[aConnection.connPrefId]++;
						cardbookRepository.cardbookLog.updateStatusProgressInformation(aConnection.connDescription + " : cardbookSynchronizationGoogle.getNewAccessTokenForGoogle error : " + e, "Error");
					}
				} else {
					if (status == 400 || status == 401) {
						cardbookRepository.cardbookUtils.formatStringForOutput("synchronizationFailed", [aConnection.connDescription, "getNewAccessTokenForGoogle", aConnection.connUrl, status]);
						cardbookRepository.cardbookUtils.formatStringForOutput("googleGetNewRefreshToken", [aConnection.connDescription, aConnection.connUrl]);
						cardbookSynchronizationGoogle.requestNewRefreshTokenForGoogle(aConnection, cardbookSynchronizationGoogle.getNewAccessTokenForGoogle, aOperationType, aParams);
					} else {
						cardbookRepository.cardbookUtils.formatStringForOutput("synchronizationFailed", [aConnection.connDescription, "getNewAccessTokenForGoogle", aConnection.connUrl, status], "Error");
						cardbookRepository.cardbookServerSyncResponse[aConnection.connPrefId]++;
						cardbookRepository.cardbookAccessTokenError[aConnection.connPrefId]++;
					}
				}
				cardbookRepository.cardbookAccessTokenResponse[aConnection.connPrefId]++;
			}
		};
		cardbookRepository.cardbookUtils.formatStringForOutput("googleRequestAccessToken", [aConnection.connDescription, aConnection.connUrl]);
		cardbookRepository.cardbookAccessTokenRequest[aConnection.connPrefId]++;
		aConnection.accessToken = "NOACCESSTOKEN";
		let params = {"refresh_token": aCode, "client_id": cardbookRepository.cardbookOAuthData.GOOGLE.CLIENT_ID, "client_secret": cardbookRepository.cardbookOAuthData.GOOGLE.CLIENT_SECRET,
						"grant_type": cardbookRepository.cardbookOAuthData.GOOGLE.REFRESH_REQUEST_GRANT_TYPE};
		let headers = { "Content-Type": "application/x-www-form-urlencoded", "GData-Version": "3" };
		let request = new cardbookWebDAV(aConnection, listener_getAccessToken);
		request.googleToken(cardbookRepository.cardbookOAuthData.GOOGLE.REFRESH_REQUEST_TYPE, params, headers);
	},

	getNewRefreshTokenForGoogle: function(aConnection, aCode, aCallback) {
		var listener_getRefreshToken = {
			onDAVQueryComplete: function(status, response, askCertificate) {
				if (status > 199 && status < 400) {
					try {
						var responseText = JSON.parse(response);
						cardbookRepository.cardbookUtils.formatStringForOutput("googleRefreshTokenOK", [aConnection.connDescription, cardbookRepository.cardbookUtils.cleanWebObject(responseText)]);
						if (aCallback) {
							aCallback(responseText);
						}
					}
					catch(e) {
						cardbookRepository.cardbookRefreshTokenError[aConnection.connPrefId]++;
						cardbookRepository.cardbookLog.updateStatusProgressInformation(aConnection.connDescription + " : cardbookSynchronizationGoogle.getNewRefreshTokenForGoogle error : " + e, "Error");
						cardbookRepository.cardbookServerSyncResponse[aConnection.connPrefId]++;
					}
				} else {
					cardbookRepository.cardbookRefreshTokenError[aConnection.connPrefId]++;
					cardbookRepository.cardbookUtils.formatStringForOutput("synchronizationFailed", [aConnection.connDescription, "getNewRefreshTokenForGoogle", aConnection.connUrl, status], "Error");
					cardbookRepository.cardbookServerSyncResponse[aConnection.connPrefId]++;
				}
				cardbookRepository.lTimerNewRefreshTokenAll[aConnection.connPrefId].cancel();
				cardbookRepository.cardbookRefreshTokenResponse[aConnection.connPrefId]++;
			}
		};
		cardbookRepository.cardbookUtils.formatStringForOutput("googleRequestRefreshToken", [aConnection.connDescription, aConnection.connUrl]);
		let params = {"code": aCode, "client_id": cardbookRepository.cardbookOAuthData.GOOGLE.CLIENT_ID, "client_secret": cardbookRepository.cardbookOAuthData.GOOGLE.CLIENT_SECRET,
						"redirect_uri": cardbookRepository.cardbookOAuthData.GOOGLE.REDIRECT_URI, "grant_type": cardbookRepository.cardbookOAuthData.GOOGLE.TOKEN_REQUEST_GRANT_TYPE};
		let headers = { "Content-Type": "application/x-www-form-urlencoded", "GData-Version": "3" };
		aConnection.accessToken = "NOACCESSTOKEN";
		let request = new cardbookWebDAV(aConnection, listener_getRefreshToken);
		request.googleToken(cardbookRepository.cardbookOAuthData.GOOGLE.TOKEN_REQUEST_TYPE, params, headers);
	},

	requestNewRefreshTokenForGoogle: function (aConnection, aCallback, aOperationType, aParams) {
		cardbookRepository.cardbookRefreshTokenRequest[aConnection.connPrefId]++;
		var myArgs = {operationType: aOperationType, operationMail: aConnection.connUser, dirPrefId: aConnection.connPrefId};
		var wizard = Services.wm.getMostRecentWindow("mail:3pane").openDialog("chrome://cardbook/content/addressbooksconfiguration/wdw_newToken.xhtml", "", "chrome,resizable,scrollbars=no,status=no", myArgs);
		wizard.addEventListener("load", function onloadListener() {
			var browser = wizard.document.getElementById("browser");
			var url = cardbookSynchronizationGoogle.getGoogleOAuthURL(aConnection.connUser);
			browser.setAttribute("src", url);
			cardbookRepository.lTimerNewRefreshTokenAll[aConnection.connPrefId] = Components.classes["@mozilla.org/timer;1"].createInstance(Components.interfaces.nsITimer);
			var lTimerCheckTitle = cardbookRepository.lTimerNewRefreshTokenAll[aConnection.connPrefId];
			lTimerCheckTitle.initWithCallback({ notify: function(lTimerCheckTitle) {
						var title = browser.contentTitle;
						if (title && title.indexOf(cardbookRepository.cardbookOAuthData.GOOGLE.REDIRECT_TITLE) === 0) {
							var myCode = title.substring(cardbookRepository.cardbookOAuthData.GOOGLE.REDIRECT_TITLE.length);
							cardbookRepository.cardbookUtils.formatStringForOutput("googleNewRefreshTokenOK", [aConnection.connDescription, myCode]);
							var connection = {connUser: "", connUrl: cardbookRepository.cardbookOAuthData.GOOGLE.TOKEN_REQUEST_URL, connPrefId: aConnection.connPrefId, connDescription: aConnection.connDescription};
							cardbookSynchronizationGoogle.getNewRefreshTokenForGoogle(connection, myCode, function callback(aResponse) {
																									wizard.close();
																									cardbookRepository.cardbookRepository.cardbookPasswordManager.rememberPassword(aConnection.connUser, "", aResponse.refresh_token, true);
																									if (aCallback) {
																										aCallback(aConnection, aResponse.refresh_token, aOperationType, aParams);
																									}
																									});
						}
					}
					}, 1000, Components.interfaces.nsITimer.TYPE_REPEATING_SLACK);
		});
	},

	getGoogleOAuthURL: function (aEmail) {
		return cardbookRepository.cardbookOAuthData.GOOGLE.OAUTH_URL +
		"?response_type=" + cardbookRepository.cardbookOAuthData.GOOGLE.RESPONSE_TYPE +
		"&client_id=" + cardbookRepository.cardbookOAuthData.GOOGLE.CLIENT_ID +
		"&redirect_uri=" + cardbookRepository.cardbookOAuthData.GOOGLE.REDIRECT_URI +
		"&scope=" + cardbookRepository.cardbookOAuthData.GOOGLE.SCOPE +
		"&login_hint=" + aEmail;
	}

};
