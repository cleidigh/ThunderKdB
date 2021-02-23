var { Services } = ChromeUtils.import("resource://gre/modules/Services.jsm");

var loader = Services.scriptloader;
loader.loadSubScript("chrome://cardbook/content/cardbookWebDAV.js", this);

var EXPORTED_SYMBOLS = ["cardbookSynchronizationGoogle"];
var cardbookSynchronizationGoogle = {

	getGoogleOAuthURLForGoogleCarddav: function (aEmail) {
		return cardbookRepository.cardbookOAuthData.GOOGLE.OAUTH_URL +
			"?response_type=" + cardbookRepository.cardbookOAuthData.GOOGLE.RESPONSE_TYPE +
			"&client_id=" + cardbookRepository.cardbookOAuthData.GOOGLE.CLIENT_ID +
			"&redirect_uri=" + cardbookRepository.cardbookOAuthData.GOOGLE.REDIRECT_URI +
			"&scope=" + cardbookRepository.cardbookOAuthData.GOOGLE.SCOPE_CONTACTS +
			"&login_hint=" + aEmail;
	},

	requestNewRefreshTokenForGoogleCarddav: function (aConnection, aCallback, aOperationType, aParams) {
		cardbookRepository.cardbookRefreshTokenRequest[aConnection.connPrefId]++;
		var myArgs = {email: aConnection.connUser, dirPrefId: aConnection.connPrefId, clientID: cardbookRepository.cardbookOAuthData.GOOGLE.CLIENT_ID, scopeURL: cardbookRepository.cardbookOAuthData.GOOGLE.SCOPE_CONTACTS};
		var wizard = Services.wm.getMostRecentWindow("mail:3pane").openDialog("chrome://cardbook/content/addressbooksconfiguration/wdw_newToken.xhtml", "", "chrome,resizable,scrollbars=no,status=no", myArgs);
		wizard.addEventListener("load", function onloadListener() {
			var browser = wizard.document.getElementById("browser");
			var url = cardbookSynchronizationGoogle.getGoogleOAuthURLForGoogleCarddav(aConnection.connUser);
			browser.setAttribute("src", url);
			cardbookRepository.lTimerNewRefreshTokenAll[aConnection.connPrefId] = Components.classes["@mozilla.org/timer;1"].createInstance(Components.interfaces.nsITimer);
			var lTimerCheckTitle = cardbookRepository.lTimerNewRefreshTokenAll[aConnection.connPrefId];
			lTimerCheckTitle.initWithCallback({ notify: function(lTimerCheckTitle) {
						var title = browser.contentTitle;
						if (title && title.indexOf(cardbookRepository.cardbookOAuthData.GOOGLE.REDIRECT_TITLE) === 0) {
							var myCode = title.substring(cardbookRepository.cardbookOAuthData.GOOGLE.REDIRECT_TITLE.length);
							cardbookRepository.cardbookUtils.formatStringForOutput("googleNewRefreshTokenOK", [aConnection.connDescription, myCode]);
							var connection = {connUser: "", connUrl: cardbookRepository.cardbookOAuthData.GOOGLE.TOKEN_REQUEST_URL, connPrefId: aConnection.connPrefId, connDescription: aConnection.connDescription};
							cardbookSynchronizationGoogle.getNewRefreshTokenForGoogleCarddav(connection, myCode, function callback(aResponse) {
																									wizard.close();
																									cardbookRepository.cardbookPasswordManager.rememberPassword(aConnection.connUser, cardbookRepository.cardbookOAuthData.GOOGLE.AUTH_PREFIX_CONTACTS, aResponse.refresh_token, true);
																									if (aCallback) {
																										aCallback(aConnection, aOperationType, aParams);
																									}
																									});
							lTimerCheckTitle.cancel();
						}
					}
					}, 1000, Components.interfaces.nsITimer.TYPE_REPEATING_SLACK);
		});
	},

	getNewRefreshTokenForGoogleCarddav: function(aConnection, aCode, aCallback) {
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
						cardbookRepository.cardbookLog.updateStatusProgressInformation(aConnection.connDescription + " : cardbookSynchronizationGoogle.getNewRefreshTokenForGoogleCarddav error : " + e, "Error");
						cardbookRepository.cardbookServerSyncResponse[aConnection.connPrefId]++;
					}
				} else {
					cardbookRepository.cardbookRefreshTokenError[aConnection.connPrefId]++;
					cardbookRepository.cardbookUtils.formatStringForOutput("synchronizationFailed", [aConnection.connDescription, "getNewRefreshTokenForGoogleCarddav", aConnection.connUrl, status], "Error");
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

	getNewAccessTokenForGoogleCarddav: function(aConnection, aOperationType, aParams) {
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
						cardbookRepository.cardbookLog.updateStatusProgressInformation(aConnection.connDescription + " : cardbookSynchronizationGoogle.getNewAccessTokenForGoogleCarddav error : " + e, "Error");
					}
				} else {
					if (status == 400 || status == 401) {
						cardbookRepository.cardbookUtils.formatStringForOutput("synchronizationFailed", [aConnection.connDescription, "getNewAccessTokenForGoogleCarddav", aConnection.connUrl, status]);
						cardbookRepository.cardbookUtils.formatStringForOutput("googleGetNewRefreshToken", [aConnection.connDescription, aConnection.connUrl]);
						cardbookSynchronizationGoogle.requestNewRefreshTokenForGoogleCarddav(aConnection, cardbookSynchronizationGoogle.getNewAccessTokenForGoogleCarddav, aOperationType, aParams);
					} else {
						cardbookRepository.cardbookUtils.formatStringForOutput("synchronizationFailed", [aConnection.connDescription, "getNewAccessTokenForGoogleCarddav", aConnection.connUrl, status], "Error");
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
		let myCode = cardbookRepository.cardbookPasswordManager.getPassword(aConnection.connUser, cardbookRepository.cardbookOAuthData.GOOGLE.AUTH_PREFIX_CONTACTS);
		let params = {"refresh_token": myCode, "client_id": cardbookRepository.cardbookOAuthData.GOOGLE.CLIENT_ID, "client_secret": cardbookRepository.cardbookOAuthData.GOOGLE.CLIENT_SECRET,
						"grant_type": cardbookRepository.cardbookOAuthData.GOOGLE.REFRESH_REQUEST_GRANT_TYPE};
		let headers = { "Content-Type": "application/x-www-form-urlencoded", "GData-Version": "3" };
		let request = new cardbookWebDAV(aConnection, listener_getAccessToken);
		request.googleToken(cardbookRepository.cardbookOAuthData.GOOGLE.REFRESH_REQUEST_TYPE, params, headers);
	},

	getGoogleOAuthURLForGoogleClassic: function (aEmail) {
		return cardbookRepository.cardbookOAuthData.GOOGLE.OAUTH_URL +
			"?response_type=" + cardbookRepository.cardbookOAuthData.GOOGLE.RESPONSE_TYPE +
			"&client_id=" + cardbookRepository.cardbookOAuthData.GOOGLE.CLIENT_ID +
			"&redirect_uri=" + cardbookRepository.cardbookOAuthData.GOOGLE.REDIRECT_URI +
			"&scope=" + cardbookRepository.cardbookOAuthData.GOOGLE.SCOPE_LABELS +
			"&login_hint=" + aEmail;
	},

	requestNewRefreshTokenForGoogleClassic: function (aConnection, aCallback, aParams, aFollowAction) {
		cardbookRepository.cardbookRefreshTokenRequest[aConnection.connPrefId]++;
		var myArgs = {email: aConnection.connUser, dirPrefId: aConnection.connPrefId, clientID: cardbookRepository.cardbookOAuthData.GOOGLE.CLIENT_ID, scopeURL: cardbookRepository.cardbookOAuthData.GOOGLE.SCOPE_LABELS};
		var wizard = Services.wm.getMostRecentWindow("mail:3pane").openDialog("chrome://cardbook/content/addressbooksconfiguration/wdw_newToken.xhtml", "", "chrome,resizable,scrollbars=no,status=no", myArgs);
		wizard.addEventListener("load", function onloadListener() {
			var browser = wizard.document.getElementById("browser");
			var url = cardbookSynchronizationGoogle.getGoogleOAuthURLForGoogleClassic(aConnection.connUser);
			browser.setAttribute("src", url);
			cardbookRepository.lTimerNewRefreshTokenAll[aConnection.connPrefId] = Components.classes["@mozilla.org/timer;1"].createInstance(Components.interfaces.nsITimer);
			var lTimerCheckTitle = cardbookRepository.lTimerNewRefreshTokenAll[aConnection.connPrefId];
			lTimerCheckTitle.initWithCallback({ notify: function(lTimerCheckTitle) {
						var title = browser.contentTitle;
						if (title && title.indexOf(cardbookRepository.cardbookOAuthData.GOOGLE.REDIRECT_TITLE) === 0) {
							var myCode = title.substring(cardbookRepository.cardbookOAuthData.GOOGLE.REDIRECT_TITLE.length);
							cardbookRepository.cardbookUtils.formatStringForOutput("googleNewRefreshTokenOK", [aConnection.connDescription, myCode]);
							var connection = {connUser: "", connUrl: cardbookRepository.cardbookOAuthData.GOOGLE.TOKEN_REQUEST_URL, connPrefId: aConnection.connPrefId, connDescription: aConnection.connDescription};
							cardbookSynchronizationGoogle.getNewRefreshTokenForGoogleClassic(connection, myCode, function callback(aResponse) {
																									wizard.close();
																									cardbookRepository.cardbookPasswordManager.rememberPassword(aConnection.connUser, cardbookRepository.cardbookOAuthData.GOOGLE.AUTH_PREFIX_LABELS, aResponse.refresh_token, true);
																									if (aCallback) {
																										aCallback(aConnection, aParams, aFollowAction);
																									}
																									});
							lTimerCheckTitle.cancel();
						}
					}
					}, 1000, Components.interfaces.nsITimer.TYPE_REPEATING_SLACK);
		});
	},

	getNewRefreshTokenForGoogleClassic: function(aConnection, aCode, aCallback) {
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
						cardbookRepository.cardbookLog.updateStatusProgressInformation(aConnection.connDescription + " : cardbookSynchronizationGoogle.getNewRefreshTokenForGoogleClassic error : " + e, "Error");
						cardbookRepository.cardbookServerSyncResponse[aConnection.connPrefId]++;
					}
				} else {
					cardbookRepository.cardbookRefreshTokenError[aConnection.connPrefId]++;
					cardbookRepository.cardbookUtils.formatStringForOutput("synchronizationFailed", [aConnection.connDescription, "getNewRefreshTokenForGoogleClassic", aConnection.connUrl, status], "Error");
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

	getNewAccessTokenForGoogleClassic: function(aConnection, aParams, aFollowAction) {
		var listener_getAccessToken = {
			onDAVQueryComplete: function(status, response, askCertificate) {
				if (status > 199 && status < 400) {
					try {
						var responseText = JSON.parse(response);
						cardbookRepository.cardbookUtils.formatStringForOutput("googleAccessTokenOK", [aConnection.connDescription, cardbookRepository.cardbookUtils.cleanWebObject(responseText)]);
						aConnection.accessToken = responseText.token_type + " " + responseText.access_token;
						aFollowAction(aConnection, aParams);
					}
					catch(e) {
						cardbookRepository.cardbookServerSyncResponse[aConnection.connPrefId]++;
						cardbookRepository.cardbookAccessTokenError[aConnection.connPrefId]++;
						cardbookRepository.cardbookLog.updateStatusProgressInformation(aConnection.connDescription + " : cardbookSynchronizationGoogle.getNewAccessTokenForGoogleClassic error : " + e, "Error");
					}
				} else {
					if (status == 400 || status == 401) {
						cardbookRepository.cardbookUtils.formatStringForOutput("synchronizationFailed", [aConnection.connDescription, "getNewAccessTokenForGoogleClassic", aConnection.connUrl, status]);
						cardbookRepository.cardbookUtils.formatStringForOutput("googleGetNewRefreshToken", [aConnection.connDescription, aConnection.connUrl]);
						cardbookSynchronizationGoogle.requestNewRefreshTokenForGoogleClassic(aConnection, cardbookSynchronizationGoogle.getNewAccessTokenForGoogleClassic, aParams, aFollowAction);
					} else {
						cardbookRepository.cardbookUtils.formatStringForOutput("synchronizationFailed", [aConnection.connDescription, "getNewAccessTokenForGoogleClassic", aConnection.connUrl, status], "Error");
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
		let myCode = cardbookRepository.cardbookPasswordManager.getPassword(aConnection.connUser, cardbookRepository.cardbookOAuthData.GOOGLE.AUTH_PREFIX_LABELS);
		let params = {"refresh_token": myCode, "client_id": cardbookRepository.cardbookOAuthData.GOOGLE.CLIENT_ID, "client_secret": cardbookRepository.cardbookOAuthData.GOOGLE.CLIENT_SECRET,
						"grant_type": cardbookRepository.cardbookOAuthData.GOOGLE.REFRESH_REQUEST_GRANT_TYPE};
		let headers = { "Content-Type": "application/x-www-form-urlencoded", "GData-Version": "3" };
		let request = new cardbookWebDAV(aConnection, listener_getAccessToken);
		request.googleToken(cardbookRepository.cardbookOAuthData.GOOGLE.REFRESH_REQUEST_TYPE, params, headers);
	},

	googleSyncCards: function(aConnection, aPrefIdType, aValue) {
		var listener_propfind = {
			onDAVQueryComplete: function(status, responseJSON, askCertificate) {
				if (status == 0) {
					if (askCertificate) {
						var certificateExceptionAdded = false;
						var certificateExceptionAdded = cardbookSynchronization.addCertificateException(cardbookSynchronization.getRootUrl(aConnection.connUrl));
						if (certificateExceptionAdded) {
							cardbookSynchronizationGoogle.googleSyncCards(aConnection, aPrefIdType);
						} else {
							cardbookRepository.cardbookUtils.formatStringForOutput("synchronizationFailed", [aConnection.connDescription, "googleSyncCards", aConnection.connUrl, status], "Error");
							cardbookRepository.cardbookServerCardSyncError[aConnection.connPrefId]++;
							cardbookRepository.cardbookServerSyncResponse[aConnection.connPrefId]++;
						}
					} else {
						cardbookRepository.cardbookUtils.formatStringForOutput("synchronizationFailed", [aConnection.connDescription, "googleSyncCards", aConnection.connUrl, status], "Error");
						cardbookRepository.cardbookServerCardSyncError[aConnection.connPrefId]++;
						cardbookRepository.cardbookServerSyncResponse[aConnection.connPrefId]++;
					}
				} else if (responseJSON && responseJSON["parsererror"] && responseJSON["parsererror"][0]["sourcetext"] && responseJSON["parsererror"][0]["sourcetext"][0]) {
					cardbookRepository.cardbookUtils.formatStringForOutput("unableToParseResponse", [aConnection.connDescription, responseJSON["parsererror"][0]["sourcetext"][0]], "Error");
					cardbookRepository.cardbookServerCardSyncError[aConnection.connPrefId]++;
					cardbookRepository.cardbookServerSyncResponse[aConnection.connPrefId]++;
				} else if (responseJSON && responseJSON["multistatus"] && (status > 199 && status < 400)) {
					try {
						var length = cardbookSynchronization.getCardsNumber(aConnection.connPrefId);
						cardbookRepository.cardbookServerSyncHandleRemainingCardTotal[aConnection.connPrefId] = length;
						if (responseJSON["multistatus"][0] && responseJSON["multistatus"][0]["response"]) {
							let jsonResponses = responseJSON["multistatus"][0]["response"];
							for (var prop in jsonResponses) {
								var jsonResponse = jsonResponses[prop];
								let href = decodeURIComponent(jsonResponse["href"][0]);
								let propstats = jsonResponse["propstat"];
								// 2015.04.27 13:53:48 : href : /carddav/v1/principals/foo.bar@gmail.com/lists/default/
								// 2015.04.27 13:53:48 : propstats : [{status:["HTTP/1.1 200 OK"]}, {status:["HTTP/1.1 404 Not Found"], prop:[{getetag:[null]}]}]
								// 2015.04.27 14:03:54 : href : /carddav/v1/principals/foo.bar@gmail.com/lists/default/69ada43d89c0d90b
								// 2015.04.27 14:03:54 : propstats : [{status:["HTTP/1.1 200 OK"], prop:[{getetag:["\"2014-07-15T13:43:23.997-07:00\""]}]}]
								for (var prop1 in propstats) {
									var propstat = propstats[prop1];
									if (cardbookSynchronization.isStatusCorrect(propstat["status"][0])) {
										if (propstat["prop"] != null && propstat["prop"] !== undefined && propstat["prop"] != "") {
											cardbookRepository.cardbookServerCardSyncTotal[aConnection.connPrefId]++;
											cardbookRepository.cardbookServerSyncCompareCardWithCacheTotal[aConnection.connPrefId]++;
											var prop = propstat["prop"][0];
											var etag = prop["getetag"][0];
											var keyArray = href.split("/");
											var key = decodeURIComponent(keyArray[keyArray.length - 1]);
											var myUrl = baseUrl + key;
											var myFileName = cardbookRepository.cardbookUtils.getFileNameFromUrl(myUrl);
											var aCardConnection = {accessToken: aConnection.accessToken, connPrefId: aConnection.connPrefId, connUrl: myUrl, connDescription: aConnection.connDescription, connUser: aConnection.connUser};
											cardbookSynchronization.compareServerCardWithCache(aCardConnection, aConnection, aPrefIdType, myUrl, etag, myFileName);
											if (cardbookRepository.cardbookCardsFromCache[aConnection.connPrefId][myFileName]) {
												delete cardbookRepository.cardbookCardsFromCache[aConnection.connPrefId][myFileName];
												cardbookRepository.cardbookServerSyncHandleRemainingCardTotal[aConnection.connPrefId]--;
											}
										}
									}
								}
							}
						}
						cardbookSynchronization.handleRemainingCardCache(aPrefIdType, aConnection);
						cardbookRepository.cardbookServerSyncParams[aConnection.connPrefId][0] =  aConnection;
					}
					catch(e) {
						cardbookRepository.cardbookLog.updateStatusProgressInformation(aConnection.connDescription + " : cardbookSynchronization.googleSyncCards error : " + e, "Error");
						cardbookRepository.cardbookServerCardSyncError[aConnection.connPrefId]++;
						cardbookRepository.cardbookServerSyncHandleRemainingCardTotal[aConnection.connPrefId] = cardbookRepository.cardbookServerSyncHandleRemainingCardDone[aConnection.connPrefId];
					}
					cardbookRepository.cardbookServerSyncResponse[aConnection.connPrefId]++;
				} else {
					cardbookRepository.cardbookUtils.formatStringForOutput("synchronizationFailed", [aConnection.connDescription, "googleSyncCards", aConnection.connUrl, status], "Error");
					cardbookRepository.cardbookServerCardSyncError[aConnection.connPrefId]++;
					cardbookRepository.cardbookServerSyncResponse[aConnection.connPrefId]++;
				}
			}
		};
		var baseUrl = cardbookRepository.cardbookSynchronization.getSlashedUrl(aConnection.connUrl);
		cardbookRepository.cardbookUtils.formatStringForOutput("synchronizationSearchingCards", [aConnection.connDescription]);
		let request = new cardbookWebDAV(aConnection, listener_propfind, "", true);
		if (aValue) {
			request.reportQuery(["D:getetag"], aValue);
		} else {
			request.propfind(["D:getetag"]);
		}
	},

	getCategoriesNumber: function (aPrefId) {
		cardbookRepository.cardbookCategoriesFromCache[aPrefId] = {};
		if (!cardbookRepository.cardbookFileCacheCategories[aPrefId]) {
			cardbookRepository.cardbookFileCacheCategories[aPrefId] = {}
		}
		if (cardbookRepository.cardbookCategoriesFromCache[aPrefId]) {
			cardbookRepository.cardbookCategoriesFromCache[aPrefId] = JSON.parse(JSON.stringify(cardbookRepository.cardbookFileCacheCategories[aPrefId]));
		}
		var length = 0;
		if (cardbookRepository.cardbookFileCacheCategories[aPrefId]) {
			for (var i in cardbookRepository.cardbookFileCacheCategories[aPrefId]) {
				length++;
			}
		}
		return length;
	},

	googleSyncLabels: function(aConnection) {
		var listener_getLabels = {
			onDAVQueryComplete: function(status, responseXML, askCertificate) {
				if (status == 0) {
					if (askCertificate) {
						var certificateExceptionAdded = false;
						var certificateExceptionAdded = cardbookSynchronization.addCertificateException(cardbookSynchronization.getRootUrl(aConnection.connUrl));
						if (certificateExceptionAdded) {
							cardbookSynchronizationGoogle.googleSyncLabels(aConnection);
						} else {
							cardbookRepository.cardbookUtils.formatStringForOutput("synchronizationFailed", [aConnection.connDescription, "googleSyncLabels", aConnection.connUrl, status], "Error");
							cardbookRepository.cardbookServerCatSyncError[aConnection.connPrefId]++;
							cardbookRepository.cardbookServerSyncResponse[aConnection.connPrefId]++;
						}
					} else {
						cardbookRepository.cardbookUtils.formatStringForOutput("synchronizationFailed", [aConnection.connDescription, "googleSyncLabels", aConnection.connUrl, status], "Error");
						cardbookRepository.cardbookServerCatSyncError[aConnection.connPrefId]++;
						cardbookRepository.cardbookServerSyncResponse[aConnection.connPrefId]++;
					}
				} else if (responseXML && (status > 199 && status < 400)) {
					try {
						cardbookRepository.cardbookServerSyncHandleRemainingCatTotal[aConnection.connPrefId] = cardbookSynchronizationGoogle.getCategoriesNumber(aConnection.connPrefId);
						let listOfCategories = [];
						let nodes =  responseXML.getElementsByTagNameNS("http://www.w3.org/2005/Atom", "entry");
						// first get a list of categories to avoid pushing existing categories
						for (let entry of nodes) {
							let title = entry.getElementsByTagNameNS("http://www.w3.org/2005/Atom", "title")[0].textContent.trim();
							if (title.startsWith("System Group:") || title == "Starred in Android") {
								continue;
							}
							listOfCategories.push(title);
						}
						for (let entry of nodes) {
							let id = entry.getElementsByTagNameNS("http://www.w3.org/2005/Atom", "id")[0].textContent.trim();
							let tmpArray = id.split("/");
							let groupId = tmpArray[tmpArray.length - 1];
							let title = entry.getElementsByTagNameNS("http://www.w3.org/2005/Atom", "title")[0].textContent.trim();
							if (title.startsWith("System Group:") || title == "Starred in Android") {
								continue;
							}
							let linkNodes = entry.getElementsByTagNameNS("http://www.w3.org/2005/Atom", "link");
							let href = "";
							for (let link of linkNodes) {
								if (link.getAttribute("rel") == "edit") {
									href = link.getAttribute("href").trim();
									break;
								}
							}
							let etag = entry.getAttribute('gd:etag').replace(/^\"/, "").replace(/\.\"$/, "").trim();
							cardbookRepository.cardbookServerCatSyncTotal[aConnection.connPrefId]++;
							cardbookRepository.cardbookServerSyncCompareCatWithCacheTotal[aConnection.connPrefId]++;
							let aCategory = new cardbookCategoryParser(title, aConnection.connPrefId);
							aCategory.etag = etag;
							aCategory.href = href;
							aCategory.uid = groupId;
							let aCatConnection = {accessToken: aConnection.accessToken, connPrefId: aConnection.connPrefId, connUrl: href, connDescription: aConnection.connDescription,
													connUser: aConnection.connUser};
							cardbookSynchronizationGoogle.compareServerCatWithCache(aCatConnection, aCategory, listOfCategories);
							if (cardbookRepository.cardbookCategoriesFromCache[aCatConnection.connPrefId][href]) {
								delete cardbookRepository.cardbookCategoriesFromCache[aCatConnection.connPrefId][href];
								cardbookRepository.cardbookServerSyncHandleRemainingCatTotal[aCatConnection.connPrefId]--;
							}
						}
						cardbookSynchronizationGoogle.handleRemainingCatCache(aConnection, listOfCategories);
					}
					catch(e) {
						cardbookRepository.cardbookLog.updateStatusProgressInformation(aConnection.connDescription + " : cardbookSynchronization.googleSyncLabels error : " + e, "Error");
						cardbookRepository.cardbookServerCatSyncError[aConnection.connPrefId]++;
						cardbookRepository.cardbookServerSyncHandleRemainingCatTotal[aConnection.connPrefId] = cardbookRepository.cardbookServerSyncHandleRemainingCatDone[aConnection.connPrefId];
					}
					cardbookRepository.cardbookServerSyncResponse[aConnection.connPrefId]++;
				} else {
					cardbookRepository.cardbookUtils.formatStringForOutput("synchronizationFailed", [aConnection.connDescription, "googleSyncLabels", aConnection.connUrl, status], "Error");
					cardbookRepository.cardbookServerCatSyncError[aConnection.connPrefId]++;
					cardbookRepository.cardbookServerSyncResponse[aConnection.connPrefId]++;
				}
			}
		};
		cardbookRepository.cardbookUtils.formatStringForOutput("synchronizationSearchingCategories", [aConnection.connDescription]);
		aConnection.connUrl = cardbookRepository.cardbookOAuthData.GOOGLE.LABELS_URL;
		var request = new cardbookWebDAV(aConnection, listener_getLabels, "", false);
		request.getlabels("*/*");
	},

	compareServerCatWithCache: function (aCatConnection, aCategory, aServerList) {
		if (cardbookRepository.cardbookFileCacheCategories[aCatConnection.connPrefId] && cardbookRepository.cardbookFileCacheCategories[aCatConnection.connPrefId][aCategory.href]) {
			var myCacheCat = cardbookRepository.cardbookFileCacheCategories[aCatConnection.connPrefId][aCategory.href];
			var myServerCat = new cardbookCategoryParser();
			cardbookRepository.cardbookUtils.cloneCategory(myCacheCat, myServerCat);
			cardbookRepository.cardbookUtils.addEtag(myServerCat, aCategory.etag);
			if (myCacheCat.etag == aCategory.etag) {
				if (myCacheCat.deleted) {
					// "DELETEDONDISK"
					cardbookRepository.cardbookServerDeletedCatRequest[aCatConnection.connPrefId]++;
					cardbookRepository.cardbookServerSyncDeletedCatOnDisk[aCatConnection.connPrefId]++;
					cardbookRepository.cardbookUtils.formatStringForOutput("categoryDeletedOnDisk", [aCatConnection.connDescription, myCacheCat.name]);
					cardbookSynchronizationGoogle.serverDeleteCategory(aCatConnection, myCacheCat);
				} else if (myCacheCat.updated) {
					// "UPDATEDONDISK"
					cardbookRepository.cardbookServerSyncUpdatedCatOnDisk[aCatConnection.connPrefId]++;
					if (aServerList.includes(myCacheCat.name)) {
						cardbookRepository.cardbookServerCatSyncDone[aCatConnection.connPrefId]++;
						cardbookRepository.removeCategoryFromRepository(myCacheCat, true, aCatConnection.connPrefId);
					} else {
						cardbookRepository.cardbookServerUpdatedCatRequest[aCatConnection.connPrefId]++;
						cardbookRepository.cardbookUtils.formatStringForOutput("categoryUpdatedOnDisk", [aCatConnection.connDescription, myCacheCat.name]);
						var aUpdateConnection = JSON.parse(JSON.stringify(aCatConnection));
						cardbookSynchronizationGoogle.serverUpdateCategory(aUpdateConnection, myCacheCat);
					}
				} else {
					// "NOTUPDATED"
					cardbookRepository.cardbookUtils.formatStringForOutput("categoryAlreadyGetFromCache", [aCatConnection.connDescription, myCacheCat.name]);
					cardbookRepository.cardbookServerCatSyncDone[aCatConnection.connPrefId]++;
					cardbookRepository.cardbookServerSyncNotUpdatedCat[aCatConnection.connPrefId]++;
				}
			} else if (myCacheCat.deleted) {
				// "DELETEDONDISKUPDATEDONSERVER"
				cardbookRepository.cardbookServerSyncDeletedCatOnDiskUpdatedCatOnServer[aCatConnection.connPrefId]++;
				cardbookRepository.cardbookUtils.formatStringForOutput("categoryDeletedOnDiskUpdatedOnServer", [aCatConnection.connDescription, myCacheCat.name]);
				var solveConflicts = cardbookRepository.cardbookPreferences.getStringPref("extensions.cardbook.solveConflicts");
				if (solveConflicts === "Local") {
					var conflictResult = "delete";
				} else if (solveConflicts === "Remote") {
					var conflictResult = "keep";
				} else {
					var message = cardbookRepository.extension.localeData.localizeMessage("categoryDeletedOnDiskUpdatedOnServer", [aCatConnection.connDescription, myCacheCat.name]);
					var askUserResult = cardbookSynchronization.askUser("category", message, "keep", "delete");
					var conflictResult = askUserResult.result;
				}
				
				cardbookRepository.cardbookLog.updateStatusProgressInformationWithDebug1(aCatConnection.connDescription + " : debug mode : conflict resolution : ", conflictResult);
				switch (conflictResult) {
					case "keep":
						if (cardbookRepository.cardbookAccountsCategories[aCatConnection.connPrefId].includes(aCategory.name)) {
							// new category created on CardBook with the same name
							if (cardbookRepository.cardbookCategories[aCatConnection.connPrefId+"::"+aCategory.name]) {
								let myOldCategory = cardbookRepository.cardbookCategories[aCategory.dirPrefId+"::"+aCategory.name];
								cardbookRepository.removeCategoryFromRepository(myOldCategory, true, aCatConnection.connPrefId);
							// another category was updated on CardBook to the same name
							} else {
								for (let i in cardbookRepository.cardbookCategories) {
									let myCategory = cardbookRepository.cardbookCategories[i];
									if (myCategory.name == aCategory.name) {
										cardbookRepository.removeCategoryFromRepository(myCategory, true, aCatConnection.connPrefId);
										break;
									}
								}
							}
						}
						cardbookRepository.removeCategoryFromRepository(myCacheCat, true, aCatConnection.connPrefId);
						cardbookRepository.addCategoryToRepository(aCategory, true, aCatConnection.connPrefId);
						cardbookRepository.cardbookServerCatSyncDone[aCatConnection.connPrefId]++;
						break;
					case "delete":
						cardbookRepository.cardbookServerDeletedCatRequest[aCatConnection.connPrefId]++;
						myCacheCat.etag = aCategory.etag;
						cardbookSynchronizationGoogle.serverDeleteCategory(aCatConnection, myCacheCat);
						break;
					case "cancel":
						cardbookRepository.cardbookServerCatSyncDone[aCatConnection.connPrefId]++;
						break;
				}
			} else if (myCacheCat.updated) {
				// "UPDATEDONBOTH"
				cardbookRepository.cardbookServerSyncUpdatedCatOnBoth[aCatConnection.connPrefId]++;
				cardbookRepository.cardbookUtils.formatStringForOutput("categoryUpdatedOnBoth", [aCatConnection.connDescription, myCacheCat.name]);
				var solveConflicts = cardbookRepository.cardbookPreferences.getStringPref("extensions.cardbook.solveConflicts");
				if (solveConflicts === "Local") {
					var conflictResult = "local";
				} else if (solveConflicts === "Remote") {
					var conflictResult = "remote";
				} else {
					var message = cardbookRepository.extension.localeData.localizeMessage("categoryUpdatedOnBoth", [aCatConnection.connDescription, myCacheCat.name]);
					var askUserResult = cardbookSynchronization.askUser("category", message, "local", "remote");
					var conflictResult = askUserResult.result;
				}
				
				cardbookRepository.cardbookLog.updateStatusProgressInformationWithDebug1(aCatConnection.connDescription + " : debug mode : conflict resolution : ", conflictResult);
				switch (conflictResult) {
					case "local":
						if (aServerList.includes(myCacheCat.name)) {
							cardbookRepository.cardbookServerCatSyncDone[aCatConnection.connPrefId]++;
							cardbookRepository.removeCategoryFromRepository(myCacheCat, true, aCatConnection.connPrefId);
						} else {
							cardbookRepository.cardbookServerUpdatedCatRequest[aCatConnection.connPrefId]++;
							var aUpdateConnection = JSON.parse(JSON.stringify(aCatConnection));
							myCacheCat.etag = aCategory.etag;
							cardbookSynchronizationGoogle.serverUpdateCategory(aUpdateConnection, myCacheCat);
						}
						break;
					case "remote":
						if (cardbookRepository.cardbookAccountsCategories[aCatConnection.connPrefId].includes(aCategory.name)) {
							// new category created on CardBook with the same name
							if (cardbookRepository.cardbookCategories[aCatConnection.connPrefId+"::"+aCategory.name]) {
								let myOldCategory = cardbookRepository.cardbookCategories[aCategory.dirPrefId+"::"+aCategory.name];
								cardbookRepository.removeCategoryFromRepository(myOldCategory, true, aCatConnection.connPrefId);
							// another category was updated on CardBook to the same name
							} else {
								for (let i in cardbookRepository.cardbookCategories) {
									let myCategory = cardbookRepository.cardbookCategories[i];
									if (myCategory.name == aCategory.name) {
										cardbookRepository.removeCategoryFromRepository(myCategory, true, aCatConnection.connPrefId);
										break;
									}
								}
							}
						}
						cardbookRepository.updateCategoryFromRepository(aCategory, myCacheCat, aCatConnection.connPrefId);
						cardbookRepository.cardbookServerCatSyncDone[aCatConnection.connPrefId]++;
						break;
					case "cancel":
						cardbookRepository.cardbookServerCatSyncDone[aCatConnection.connPrefId]++;
						break;
				}
			} else {
				// "UPDATEDONSERVER"
				if (cardbookRepository.cardbookAccountsCategories[aCatConnection.connPrefId].includes(aCategory.name)) {
					// new category created on CardBook with the same name
					if (cardbookRepository.cardbookCategories[aCatConnection.connPrefId+"::"+aCategory.name]) {
						let myOldCategory = cardbookRepository.cardbookCategories[aCategory.dirPrefId+"::"+aCategory.name];
						cardbookRepository.removeCategoryFromRepository(myOldCategory, true, aCatConnection.connPrefId);
					// another category was updated on CardBook to the same name
					} else {
						for (let i in cardbookRepository.cardbookCategories) {
							let myCategory = cardbookRepository.cardbookCategories[i];
							if (myCategory.name == aCategory.name) {
								cardbookRepository.removeCategoryFromRepository(myCategory, true, aCatConnection.connPrefId);
								break;
							}
						}
					}
				}
				cardbookRepository.cardbookServerSyncUpdatedCatOnServer[aCatConnection.connPrefId]++;
				cardbookRepository.cardbookUtils.formatStringForOutput("categoryUpdatedOnServer", [aCatConnection.connDescription, myCacheCat.name, aCategory.etag, myCacheCat.etag]);
				cardbookRepository.updateCategoryFromRepository(aCategory, myCacheCat, aCatConnection.connPrefId);
				cardbookRepository.cardbookServerCatSyncDone[aCatConnection.connPrefId]++;
			}
		} else {
			// "NEWONSERVER"
			if (cardbookRepository.cardbookAccountsCategories[aCatConnection.connPrefId].includes(aCategory.name)) {
				// new category created on CardBook with the same name
				if (cardbookRepository.cardbookCategories[aCatConnection.connPrefId+"::"+aCategory.name]) {
					let myOldCategory = cardbookRepository.cardbookCategories[aCategory.dirPrefId+"::"+aCategory.name];
					cardbookRepository.removeCategoryFromRepository(myOldCategory, true, aCatConnection.connPrefId);
				// another category was updated on CardBook to the same name
				} else {
					for (let i in cardbookRepository.cardbookCategories) {
						let myCategory = cardbookRepository.cardbookCategories[i];
						if (myCategory.name == aCategory.name) {
							cardbookRepository.removeCategoryFromRepository(myCategory, true, aCatConnection.connPrefId);
							break;
						}
					}
				}
			}
			cardbookRepository.cardbookServerSyncNewCatOnServer[aCatConnection.connPrefId]++;
			cardbookRepository.cardbookUtils.formatStringForOutput("categoryNewOnServer", [aCatConnection.connDescription]);
			cardbookRepository.addCategoryToRepository(aCategory, true, aCatConnection.connPrefId);
			cardbookRepository.cardbookServerCatSyncDone[aCatConnection.connPrefId]++;
		}
		cardbookRepository.cardbookServerSyncCompareCatWithCacheDone[aCatConnection.connPrefId]++;
	},

	handleRemainingCatCache: function (aConnection, aServerList) {
		if (cardbookRepository.cardbookCategoriesFromCache[aConnection.connPrefId]) {
			for (var i in cardbookRepository.cardbookCategoriesFromCache[aConnection.connPrefId]) {
				var aCategory = cardbookRepository.cardbookCategoriesFromCache[aConnection.connPrefId][i];
				if (aCategory.name == cardbookRepository.cardbookUncategorizedCards){
					cardbookRepository.cardbookServerCatSyncTotal[aConnection.connPrefId]++;
					cardbookRepository.cardbookServerCatSyncDone[aConnection.connPrefId]++;
				} else if (aServerList.includes(aCategory.name)){
					cardbookRepository.cardbookServerCatSyncTotal[aConnection.connPrefId]++;
					cardbookRepository.cardbookServerCatSyncDone[aConnection.connPrefId]++;
				} else {
					if (aCategory.created) {
						// "NEWONDISK"
						cardbookRepository.cardbookUtils.formatStringForOutput("categoryNewOnDisk", [aConnection.connDescription, aCategory.name]);
						cardbookRepository.cardbookServerCreatedCatRequest[aConnection.connPrefId]++;
						cardbookRepository.cardbookServerCatSyncTotal[aConnection.connPrefId]++;
						cardbookRepository.cardbookServerSyncNewCatOnDisk[aConnection.connPrefId]++;
						var aCreateConnection = JSON.parse(JSON.stringify(aConnection));
						cardbookSynchronizationGoogle.serverCreateCategory(aCreateConnection, aCategory);
					} else if (aCategory.updated) {
						// "UPDATEDONDISKDELETEDONSERVER";
						cardbookRepository.cardbookUtils.formatStringForOutput("categoryUpdatedOnDiskDeletedOnServer", [aConnection.connDescription, aCategory.name]);
						cardbookRepository.cardbookServerCatSyncTotal[aConnection.connPrefId]++;
						cardbookRepository.cardbookServerSyncUpdatedCatOnDiskDeletedCatOnServer[aConnection.connPrefId]++;
						var solveConflicts = cardbookRepository.cardbookPreferences.getStringPref("extensions.cardbook.solveConflicts");
						if (solveConflicts === "Local") {
							var conflictResult = "keep";
						} else if (solveConflicts === "Remote") {
							var conflictResult = "delete";
						} else {
							var message = cardbookRepository.extension.localeData.localizeMessage("categoryUpdatedOnDiskDeletedOnServer", [aConnection.connDescription, aCategory.name]);
							var askUserResult = cardbookSynchronization.askUser("category", message, "keep", "delete");
							var conflictResult = askUserResult.result;
						}
						
						cardbookRepository.cardbookLog.updateStatusProgressInformationWithDebug1(aConnection.connDescription + " : debug mode : conflict resolution : ", conflictResult);
						switch (conflictResult) {
							case "keep":
								cardbookRepository.cardbookUtils.formatStringForOutput("categoryNewOnDisk", [aConnection.connDescription, aCategory.name]);
								cardbookRepository.cardbookServerCreatedCatRequest[aConnection.connPrefId]++;
								var aCreateConnection = JSON.parse(JSON.stringify(aConnection));
								cardbookSynchronizationGoogle.serverCreateCategory(aCreateConnection, aCategory);
								break;
							case "delete":
								cardbookRepository.cardbookUtils.formatStringForOutput("categoryDeletedOnServer", [aConnection.connDescription, aCategory.name]);
								cardbookRepository.removeCardsFromCategory(aConnection.connPrefId, aCategory.name);
								cardbookRepository.removeCategoryFromRepository(aCategory, true, aConnection.connPrefId);
								cardbookRepository.cardbookServerCatSyncDone[aConnection.connPrefId]++;
								break;
							case "cancel":
								cardbookRepository.cardbookServerCatSyncDone[aConnection.connPrefId]++;
								break;
						}
					} else {
						// "DELETEDONSERVER"
						cardbookRepository.cardbookServerCatSyncTotal[aConnection.connPrefId]++;
						cardbookRepository.cardbookUtils.formatStringForOutput("categoryDeletedOnServer", [aConnection.connDescription, aCategory.name]);
						cardbookRepository.removeCardsFromCategory(aConnection.connPrefId, aCategory.name);
						cardbookRepository.removeCategoryFromRepository(aCategory, true, aConnection.connPrefId);
						cardbookRepository.cardbookServerCatSyncDone[aConnection.connPrefId]++;
						cardbookRepository.cardbookServerSyncDeletedCatOnServer[aConnection.connPrefId]++;
					}
				}
				cardbookRepository.cardbookServerSyncHandleRemainingCatDone[aConnection.connPrefId]++;
			}
		}
	},

	serverDeleteCategory: function(aConnection, aCategory) {
		var listener_delete = {
			onDAVQueryComplete: function(status, response, askCertificate) {
				if (status > 199 && status < 400) {
					cardbookRepository.cardbookUtils.formatStringForOutput("serverCategoryDeletedFromServer", [aConnection.connDescription, aCategory.name]);
					cardbookRepository.removeCategoryFromRepository(aCategory, true, aConnection.connPrefId);
				} else if (status == 404) {
					cardbookRepository.cardbookUtils.formatStringForOutput("serverCategoryNotExistServer", [aConnection.connDescription, aCategory.name]);
					cardbookRepository.removeCategoryFromRepository(aCategory, true, aConnection.connPrefId);
				} else {
					cardbookRepository.cardbookServerDeletedCatError[aConnection.connPrefId]++;
					cardbookRepository.cardbookUtils.formatStringForOutput("serverCategoryDeleteFailed", [aConnection.connDescription, aCategory.name, aConnection.connUrl, status], "Error");
				}
				cardbookRepository.cardbookServerCatSyncDone[aConnection.connPrefId]++;
				cardbookRepository.cardbookServerDeletedCatResponse[aConnection.connPrefId]++;
			}
		};
		if (cardbookSynchronization.getModifsPushed(aConnection.connPrefId) <= cardbookRepository.cardbookPreferences.getMaxModifsPushed()) {
			var request = new cardbookWebDAV(aConnection, listener_delete, aCategory.etag);
			cardbookRepository.cardbookUtils.formatStringForOutput("serverCategorySendingDeletion", [aConnection.connDescription, aCategory.name]);
			request.delete(null, "text/vcard; charset=utf-8");
		} else {
			cardbookRepository.cardbookServerCatSyncDone[aConnection.connPrefId]++;
			cardbookRepository.cardbookServerDeletedCatResponse[aConnection.connPrefId]++;
			cardbookRepository.cardbookServerNotPushed[aConnection.connPrefId]++;
		}
	},

	serverUpdateCategory: function(aConnection, aCategory) {
		var listener_update = {
			onDAVQueryComplete: function(status, responseXML, askCertificate, etag) {
				if (status > 199 && status < 400) {
					if (cardbookRepository.cardbookCategories[aCategory.dirPrefId+"::"+aCategory.uid]) {
						let myOldCategory = cardbookRepository.cardbookCategories[aCategory.dirPrefId+"::"+aCategory.uid];
						cardbookRepository.removeCategoryFromRepository(myOldCategory, true, aConnection.connPrefId);
					}
					let nodes =  responseXML.getElementsByTagNameNS("http://www.w3.org/2005/Atom", "entry");
					for (let entry of nodes) {
						let id = entry.getElementsByTagNameNS("http://www.w3.org/2005/Atom", "id")[0].textContent.trim();
						let tmpArray = id.split("/");
						let uid = tmpArray[tmpArray.length - 1];
						let etag = entry.getAttribute('gd:etag').replace(/^\"/, "").replace(/\.\"$/, "").trim();
						cardbookRepository.cardbookUtils.addEtag(aCategory, etag);
						aCategory.uid = uid;
						aCategory.href = id;
						cardbookRepository.cardbookUtils.formatStringForOutput("serverCategoryUpdatedOnServerWithEtag", [aConnection.connDescription, aCategory.name, etag]);
					}
					cardbookRepository.cardbookUtils.nullifyTagModification(aCategory);
					cardbookRepository.addCategoryToRepository(aCategory, true, aConnection.connPrefId);
				} else {
					cardbookRepository.cardbookServerUpdatedCatError[aConnection.connPrefId]++;
					cardbookRepository.cardbookUtils.formatStringForOutput("serverCategoryUpdateFailed", [aConnection.connDescription, aCategory.name, aConnection.connUrl, status], "Error");
				}
				cardbookRepository.cardbookServerCatSyncDone[aConnection.connPrefId]++;
				cardbookRepository.cardbookServerUpdatedCatResponse[aConnection.connPrefId]++;
			}
		};
		if (cardbookSynchronization.getModifsPushed(aConnection.connPrefId) <= cardbookRepository.cardbookPreferences.getMaxModifsPushed()) {
			aConnection.connUrl = aCategory.href;
			var request = new cardbookWebDAV(aConnection, listener_update, aCategory.etag, false);
			var categoryContent = cardbookSynchronizationGoogle.getCategoryForServer(aCategory);
			cardbookRepository.cardbookUtils.formatStringForOutput("serverCategorySendingUpdate", [aConnection.connDescription, aCategory.name]);
			request.put(categoryContent);
		} else {
			cardbookRepository.cardbookServerCatSyncDone[aConnection.connPrefId]++;
			cardbookRepository.cardbookServerUpdatedCatResponse[aConnection.connPrefId]++;
			cardbookRepository.cardbookServerNotPushed[aConnection.connPrefId]++;
		}
	},

	getCategoryForServer: function(aCategory) {
		return "<entry xmlns=\"http://www.w3.org/2005/Atom\" xmlns:gd=\"http://schemas.google.com/g/2005\"> \
						<category scheme=\"http://schemas.google.com/g/2005#kind\" term=\"http://schemas.google.com/g/2008#group\"/> \
						<title>" + aCategory.name + "</title> \
						</entry>";
	},

	serverCreateCategory: function(aConnection, aCategory) {
		var listener_create = {
			onDAVQueryComplete: function(status, responseXML, askCertificate, etag) {
				if (status > 199 && status < 400) {
					if (cardbookRepository.cardbookCategories[aCategory.dirPrefId+"::"+aCategory.uid]) {
						let myOldCategory = cardbookRepository.cardbookCategories[aCategory.dirPrefId+"::"+aCategory.uid];
						cardbookRepository.removeCategoryFromRepository(myOldCategory, true, aConnection.connPrefId);
					}
					let nodes =  responseXML.getElementsByTagNameNS("http://www.w3.org/2005/Atom", "entry");
					for (let entry of nodes) {
						let id = entry.getElementsByTagNameNS("http://www.w3.org/2005/Atom", "id")[0].textContent.trim();
						let tmpArray = id.split("/");
						let uid = tmpArray[tmpArray.length - 1];
						let etag = entry.getAttribute('gd:etag').replace(/^\"/, "").replace(/\.\"$/, "").trim();
						cardbookRepository.cardbookUtils.formatStringForOutput("serverCategoryCreatedOnServerWithEtag", [aConnection.connDescription, aCategory.name, etag]);
						cardbookRepository.cardbookUtils.addEtag(aCategory, etag);
						aCategory.uid = uid;
						aCategory.href = id;
					}
					if (cardbookRepository.cardbookPreferences.getType(aConnection.connPrefId) == "GOOGLE") {
						cardbookRepository.cardbookServerSyncAgain[aConnection.connPrefId] = true;
					}
					cardbookRepository.cardbookUtils.nullifyTagModification(aCategory);
					cardbookRepository.addCategoryToRepository(aCategory, true, aConnection.connPrefId);
				} else {
					cardbookRepository.cardbookUtils.addTagCreated(aCategory);
					cardbookRepository.cardbookServerCreatedCatError[aConnection.connPrefId]++;
					cardbookRepository.cardbookUtils.formatStringForOutput("serverCategoryCreateFailed", [aConnection.connDescription, aCategory.name, aConnection.connUrl, status], "Error");
				}
				cardbookRepository.cardbookServerCreatedCatResponse[aConnection.connPrefId]++;
				cardbookRepository.cardbookServerCatSyncDone[aConnection.connPrefId]++;
			}
		};
		if (cardbookSynchronization.getModifsPushed(aConnection.connPrefId) <= cardbookRepository.cardbookPreferences.getMaxModifsPushed()) {
			aConnection.connUrl = cardbookRepository.cardbookOAuthData.GOOGLE.LABEL_URL + aConnection.connUser + "/full";
			var request = new cardbookWebDAV(aConnection, listener_create, "", false);
			var categoryContent = cardbookSynchronizationGoogle.getCategoryForServer(aCategory);
			cardbookRepository.cardbookUtils.formatStringForOutput("serverCategorySendingCreate", [aConnection.connDescription, aCategory.name]);
			request.post(categoryContent);
		} else {
			cardbookRepository.cardbookServerCatSyncDone[aConnection.connPrefId]++;
			cardbookRepository.cardbookServerCreatedCatResponse[aConnection.connPrefId]++;
			cardbookRepository.cardbookServerNotPushed[aConnection.connPrefId]++;
		}
	},

	serverGetCardLabels: function(aConnection, aParams) {
		var listener_get = {
			onDAVQueryComplete: function(status, responseXML, askCertificate, etag) {
				if (status > 199 && status < 400) {
					cardbookRepository.cardbookUtils.formatStringForOutput("serverGetCardLabelsOK", [aConnection.connDescription, aParams.aNewCard.fn]);
					let nodes =  responseXML.getElementsByTagNameNS("http://www.w3.org/2005/Atom", "entry");
					let listOfCategories = [];
					for (let entry of nodes) {
						let id = entry.getElementsByTagNameNS("http://www.w3.org/2005/Atom", "id")[0].textContent.trim();
						let tmpArray = id.split("/");
						let uid = tmpArray[tmpArray.length - 1];
						let etag = entry.getAttribute('gd:etag').replace(/^\"/, "").replace(/\.\"$/, "").trim();
						// new or updated contacts on Google server
						// there two cases : 
						// 1/ new contacts from Cardbook
						// 2/ new or updated contacts from Google 
						if (aParams.aActionType == "GET") {
							let groups = responseXML.getElementsByTagNameNS("http://schemas.google.com/contact/2008", "groupMembershipInfo");
							if (aParams.aWhyGet == "UPDATEDONSERVER") {
								aParams.aNewCard.categories = [];
							}
							let categoriesFound = false;
							for (let group of groups) {
								let href = group.getAttribute("href").replace("http://","https://").replace("/base/","/full/");
								if (cardbookRepository.cardbookFileCacheCategories[aConnection.connPrefId][href] && !aParams.aNewCard.categories.includes(cardbookRepository.cardbookFileCacheCategories[aConnection.connPrefId][href].name)) {
									categoriesFound = true;
									cardbookRepository.addCategoryToCard(aParams.aNewCard, cardbookRepository.cardbookFileCacheCategories[aConnection.connPrefId][href].name);
								}
							}
							if (!categoriesFound && aParams.aWhyGet == "NEWONSERVER" && aParams.aNewCard.categories.length) {
								let stopAddCat = false;
								// at first sync there might be categories not yet pushed to Google
								// first create categories and then push contacts
								for (let category of aParams.aNewCard.categories) {
									if (!cardbookRepository.cardbookCategories[aConnection.connPrefId+"::"+category]) {
										stopAddCat = true;
										let aCategory = new cardbookCategoryParser(category, aConnection.connPrefId);
										cardbookRepository.cardbookUtils.addTagCreated(aCategory);
										cardbookRepository.addCategoryToRepository(aCategory, true, aConnection.connPrefId);
									}
								}
								if (stopAddCat) {
									if (cardbookRepository.cardbookCards[aParams.aNewCard.dirPrefId+"::"+aParams.aNewCard.uid]) {
										let aOldCard = cardbookRepository.cardbookCards[aParams.aNewCard.dirPrefId+"::"+aParams.aNewCard.uid];
										cardbookRepository.removeCardFromRepository(aOldCard, true);
									}
									cardbookRepository.cardbookServerGetCardResponse[aConnection.connPrefId]++;
									cardbookRepository.cardbookServerCardSyncDone[aConnection.connPrefId]++;
									cardbookRepository.cardbookUtils.addTagUpdated(aParams.aNewCard);
									cardbookRepository.addCardToRepository(aParams.aNewCard, true, aParams.aNewCard.uid);
									cardbookRepository.cardbookUtils.formatStringForOutput("serverCardGetOK", [aConnection.connDescription, aParams.aNewCard.fn]);
									cardbookRepository.cardbookServerSyncAgain[aConnection.connPrefId] = true;
								} else {
									cardbookRepository.cardbookServerSyncRequest[aConnection.connPrefId]++;
									cardbookSynchronizationGoogle.serverPutCardLabels(aConnection, aParams, uid, etag, entry);
								}
							} else {
								if (cardbookRepository.cardbookCards[aParams.aNewCard.dirPrefId+"::"+aParams.aNewCard.uid]) {
									let aOldCard = cardbookRepository.cardbookCards[aParams.aNewCard.dirPrefId+"::"+aParams.aNewCard.uid];
									cardbookRepository.removeCardFromRepository(aOldCard, true);
								}
								cardbookRepository.cardbookServerGetCardResponse[aConnection.connPrefId]++;
								cardbookRepository.cardbookServerCardSyncDone[aConnection.connPrefId]++;
								cardbookRepository.addCardToRepository(aParams.aNewCard, true, aParams.aNewCard.uid);
								cardbookRepository.cardbookUtils.formatStringForOutput("serverCardGetOK", [aConnection.connDescription, aParams.aNewCard.fn]);
							}
						// updated contacts on CardBook : PUT
						} else {
							cardbookRepository.cardbookServerSyncRequest[aConnection.connPrefId]++;
							cardbookSynchronizationGoogle.serverPutCardLabels(aConnection, aParams, uid, etag, entry);
						}
					}
				} else {
					cardbookRepository.cardbookUtils.formatStringForOutput("serverGetCardLabelsFailed", [aConnection.connDescription, aParams.aNewCard.fn, aConnection.connUrl, status], "Error");
					if (aParams.aActionType == "GET") {
						cardbookRepository.cardbookServerCardSyncDone[aConnection.connPrefId]++;
						cardbookRepository.cardbookServerGetCardResponse[aConnection.connPrefId]++;
						cardbookRepository.cardbookServerGetCardError[aConnection.connPrefId]++;
						cardbookRepository.cardbookUtils.formatStringForOutput("serverCardGetFailed", [aConnection.connDescription, aConnection.connUrl, status], "Error");
					} else {
						cardbookRepository.cardbookUtils.addTagUpdated(aParams.aNewCard);
						cardbookRepository.cardbookServerCardSyncDone[aConnection.connPrefId]++;
						cardbookRepository.cardbookServerUpdatedCardError[aConnection.connPrefId]++;
						cardbookRepository.cardbookUtils.formatStringForOutput("serverCardUpdateFailed", [aConnection.connDescription, aParams.aNewCard.fn, aConnection.connUrl, status], "Error");
					}
				}
				cardbookRepository.cardbookServerSyncResponse[aConnection.connPrefId]++;
			}
		};
		aConnection.connUrl = cardbookRepository.cardbookOAuthData.GOOGLE.CONTACT_URL + aConnection.connUser + "/full/" + aParams.aNewCard.uid;
		var request = new cardbookWebDAV(aConnection, listener_get, "", false);
		cardbookRepository.cardbookUtils.formatStringForOutput("serverSendingGetCardLabels", [aConnection.connDescription, aParams.aNewCard.fn]);
		request.getContact();
	},

	updateEntryForServer: function(aDirPrefId, aUserEmail, aCard, aGoogleEntry) {
		for (let i = aGoogleEntry.childNodes.length -1; i >= 0; i--) {
			let child = aGoogleEntry.childNodes[i];
			if (child.tagName == "gContact:groupMembershipInfo") {
				aGoogleEntry.removeChild(child);
			}
		}
		let categoryAll = aGoogleEntry.ownerDocument.createElementNS("http://schemas.google.com/contact/2008", "gContact:groupMembershipInfo");
		categoryAll.setAttribute("deleted", "false");
		categoryAll.setAttribute("href", "http://www.google.com/m8/feeds/groups/" + aUserEmail + "/base/" + 6);
		aGoogleEntry.appendChild(categoryAll);
    	for (let category of aCard.categories) {
			let myCategoryId = cardbookRepository.cardbookCategories[aDirPrefId+"::"+category].uid;
			let categoryNode = aGoogleEntry.ownerDocument.createElementNS("http://schemas.google.com/contact/2008", "gContact:groupMembershipInfo");
			categoryNode.setAttribute("deleted", "false");
			categoryNode.setAttribute("href", "http://www.google.com/m8/feeds/groups/" + aUserEmail + "/base/" + myCategoryId);
			aGoogleEntry.appendChild(categoryNode);
		}
		return aGoogleEntry.outerHTML;
	},

	serverPutCardLabels: function(aConnection, aParams, aCardUid, aCardEtag, aGoogleEntry) {
		var listener_updateContact = {
			onDAVQueryComplete: function(status, response, askCertificate, etag) {
				if (status > 199 && status < 400) {
					cardbookRepository.cardbookUtils.formatStringForOutput("serverPutCardLabelsOK", [aConnection.connDescription, aParams.aNewCard.fn]);
					if (aParams.aActionType == "GET") {
						if (cardbookRepository.cardbookCards[aParams.aNewCard.dirPrefId+"::"+aParams.aNewCard.uid]) {
							let aOldCard = cardbookRepository.cardbookCards[aParams.aNewCard.dirPrefId+"::"+aParams.aNewCard.uid];
							cardbookRepository.removeCardFromRepository(aOldCard, true);
						}
						cardbookRepository.cardbookServerGetCardResponse[aConnection.connPrefId]++;
						cardbookRepository.cardbookServerCardSyncDone[aConnection.connPrefId]++;
						cardbookRepository.addCardToRepository(aParams.aNewCard, true, aParams.aNewCard.uid);
						cardbookRepository.cardbookUtils.formatStringForOutput("serverCardGetOK", [aConnection.connDescription, aParams.aNewCard.fn]);
					} else {
						cardbookRepository.cardbookServerCardSyncDone[aConnection.connPrefId]++;
						// if aCard and aCard have the same cached medias
						cardbookRepository.cardbookUtils.changeMediaFromFileToContent(aParams.aNewCard);
						if (cardbookRepository.cardbookCards[aParams.aNewCard.dirPrefId+"::"+aParams.aNewCard.uid]) {
							let aOldCard = cardbookRepository.cardbookCards[aParams.aNewCard.dirPrefId+"::"+aParams.aNewCard.uid];
							cardbookRepository.removeCardFromRepository(aOldCard, true);
						}
						cardbookRepository.addCardToRepository(aParams.aNewCard, true, aParams.aNewCard.uid);
						cardbookRepository.cardbookUtils.formatStringForOutput("serverCardUpdatedOnServerWithEtag", [aConnection.connDescription, aParams.aNewCard.fn]);
					}						
				} else {
					cardbookRepository.cardbookUtils.formatStringForOutput("serverPutCardLabelsFailed", [aConnection.connDescription, aParams.aNewCard.fn, aConnection.connUrl, status], "Error");
					if (aParams.aActionType == "GET") {
						cardbookRepository.cardbookServerCardSyncDone[aConnection.connPrefId]++;
						cardbookRepository.cardbookServerGetCardResponse[aConnection.connPrefId]++;
						cardbookRepository.cardbookServerGetCardError[aConnection.connPrefId]++;
						cardbookRepository.cardbookUtils.formatStringForOutput("serverCardGetFailed", [aConnection.connDescription, aConnection.connUrl, status], "Error");
					} else {
						cardbookRepository.cardbookUtils.addTagUpdated(aParams.aNewCard);
						cardbookRepository.cardbookServerCardSyncDone[aConnection.connPrefId]++;
						cardbookRepository.cardbookServerUpdatedCardError[aConnection.connPrefId]++;
						cardbookRepository.cardbookUtils.formatStringForOutput("serverCardUpdateFailed", [aConnection.connDescription, aParams.aNewCard.fn, aConnection.connUrl, status], "Error");
					}
				}
				cardbookRepository.cardbookServerSyncResponse[aConnection.connPrefId]++;
			}
		};
		aConnection.connUrl = cardbookRepository.cardbookOAuthData.GOOGLE.CONTACT_URL + aConnection.connUser + "/full/" + aCardUid;
		var request = new cardbookWebDAV(aConnection, listener_updateContact, aCardEtag);
		var categoryContent = cardbookSynchronizationGoogle.updateEntryForServer(aConnection.connPrefId, aConnection.connUser, aParams.aNewCard, aGoogleEntry);
		cardbookRepository.cardbookUtils.formatStringForOutput("serverSendingPutCardLabels", [aConnection.connDescription, aParams.aNewCard.fn]);
		request.put(categoryContent, "application/atom+xml; charset=UTF-8; type=feed");
	},

	waitForGoogleSyncFinished: function (aPrefId, aPrefName) {
		cardbookRepository.lTimerSyncAll[aPrefId] = Components.classes["@mozilla.org/timer;1"].createInstance(Components.interfaces.nsITimer);
		var lTimerSync = cardbookRepository.lTimerSyncAll[aPrefId];
		lTimerSync.initWithCallback({ notify: function(lTimerSync) {
					cardbookRepository.cardbookUtils.notifyObservers("syncRunning", aPrefId);
					var myPrefIdType = cardbookRepository.cardbookPreferences.getType(aPrefId);
					if (cardbookRepository.cardbookServerSyncCompareCardWithCacheDone[aPrefId] != 0) {
						if (cardbookRepository.cardbookServerSyncCompareCardWithCacheDone[aPrefId] == cardbookRepository.cardbookServerSyncCompareCardWithCacheTotal[aPrefId]) {
							cardbookRepository.cardbookServerSyncCompareCardWithCacheDone[aPrefId] = 0;
							cardbookRepository.cardbookServerSyncCompareCardWithCacheTotal[aPrefId] = 0;
							if (cardbookRepository.cardbookServerMultiGetArray[aPrefId].length != 0) {
								cardbookSynchronization.serverMultiGet(cardbookRepository.cardbookServerSyncParams[aPrefId][0], myPrefIdType);
							}
						}
					}
					if (cardbookRepository.cardbookServerSyncHandleRemainingCardDone[aPrefId] == cardbookRepository.cardbookServerSyncHandleRemainingCardTotal[aPrefId]) {
						var request = cardbookSynchronization.getRequest(aPrefId, aPrefName) + cardbookSynchronization.getTotal(aPrefId, aPrefName);
						var response = cardbookSynchronization.getResponse(aPrefId, aPrefName) + cardbookSynchronization.getDone(aPrefId, aPrefName);
						if (cardbookRepository.cardbookUtils.isMyAccountRemote(myPrefIdType)) {
							cardbookActions.fetchSyncActivity(aPrefId, cardbookRepository.cardbookServerCardSyncDone[aPrefId], cardbookRepository.cardbookServerCardSyncTotal[aPrefId]);
						}
						if (request == response) {
							if (cardbookRepository.cardbookServerSyncParams[aPrefId].length && cardbookRepository.cardbookAccessTokenRequest[aPrefId] == 1 && "test1" == "test") {
								let currentConnection = cardbookRepository.cardbookServerSyncParams[aPrefId][0];
								let connection = {connUser: currentConnection.connUser, connPrefId: currentConnection.connPrefId, connUrl: cardbookRepository.cardbookOAuthData.GOOGLE.REFRESH_REQUEST_URL, connDescription: currentConnection.connDescription};
								let params = {aPrefIdType: "GOOGLE"};
								cardbookRepository.cardbookServerSyncRequest[aPrefId]++;
								// wait 10 s to be sure the category were memorized by Google
								let { setTimeout } = ChromeUtils.import("resource:///modules/imXPCOMUtils.jsm");
								setTimeout(function() {
									cardbookSynchronizationGoogle.getNewAccessTokenForGoogleCarddav(connection, "GOOGLE", params);
									}, 10000);
							} else {				
								cardbookSynchronization.finishSync(aPrefId, aPrefName, myPrefIdType);
								if (cardbookRepository.cardbookServerSyncAgain[aPrefId]) {
									cardbookRepository.cardbookUtils.formatStringForOutput("synchroForcedToResync", [aPrefName]);
									// wait 10 s to be sure the category were memorized by Google
									let { setTimeout } = ChromeUtils.import("resource:///modules/imXPCOMUtils.jsm");
									setTimeout(function() {
										cardbookSynchronization.finishMultipleOperations(aPrefId);
										cardbookSynchronization.syncAccount(aPrefId, false);
										}, 10000);
								} else {
									cardbookSynchronization.finishMultipleOperations(aPrefId);
									var total = cardbookSynchronization.getRequest() + cardbookSynchronization.getTotal() + cardbookSynchronization.getResponse() + cardbookSynchronization.getDone();
									// all sync are finished
									if (total === 0) {
										// should check if some should be restarted because of a changed password
										var syncAgain = [];
										var syncFailed = [];
										for (let i in cardbookRepository.cardbookServerChangedPwd) {
											if (cardbookRepository.cardbookServerChangedPwd[i].pwdChanged) {
												syncAgain = syncAgain.concat(cardbookRepository.cardbookServerChangedPwd[i].dirPrefIdList);
											} else {
												syncFailed = syncFailed.concat(cardbookRepository.cardbookServerChangedPwd[i].dirPrefIdList);
											}
										}
										cardbookRepository.cardbookServerChangedPwd = {};
										for (var j = 0; j < syncAgain.length; j++) {
											var myPrefId = syncAgain[j];
											var myPrefName = cardbookRepository.cardbookUtils.getPrefNameFromPrefId(myPrefId);
											cardbookRepository.cardbookUtils.formatStringForOutput("synchroForcedToResync", [myPrefName]);
											// wait 10 s to be sure the category were memorized by Google
											let { setTimeout } = ChromeUtils.import("resource:///modules/imXPCOMUtils.jsm");
											setTimeout(function() {
												cardbookSynchronization.syncAccount(myPrefId, false);
												}, 10000);
										}
										for (var j = 0; j < syncFailed.length; j++) {
											var myPrefId = syncFailed[j];
											cardbookRepository.cardbookUtils.formatStringForOutput("synchronizationFailed", [cardbookRepository.cardbookPreferences.getName(myPrefId), "passwordNotChanged", cardbookRepository.cardbookPreferences.getUrl(myPrefId), 401], "Error");
										}
										if (syncAgain.length == 0) {
											cardbookRepository.cardbookUtils.formatStringForOutput("synchroAllFinished");
											if (cardbookRepository.initialSync) {
												ovl_birthdays.onLoad();
												cardbookRepository.initialSync = false;
											}
										}
									}
								}
								lTimerSync.cancel();
							}
						}
					}
				}
				}, 1000, Components.interfaces.nsITimer.TYPE_REPEATING_SLACK);
	}
};
