var { Services } = ChromeUtils.import("resource://gre/modules/Services.jsm");

var loader = Services.scriptloader;
loader.loadSubScript("chrome://cardbook/content/cardbookWebDAV.js", this);

var EXPORTED_SYMBOLS = ["cardbookSynchronizationGoogle2"];
var cardbookSynchronizationGoogle2 = {
	skippedLabels: {},
	labels: {},
	labelsList: {},
	contacts: {},

	getGoogleOAuthURLForGooglePeople: function (aEmail) {
		return cardbookRepository.cardbookOAuthData.GOOGLE2.OAUTH_URL +
			"?response_type=" + cardbookRepository.cardbookOAuthData.GOOGLE2.RESPONSE_TYPE +
			"&client_id=" + cardbookRepository.cardbookOAuthData.GOOGLE2.CLIENT_ID +
			"&redirect_uri=" + cardbookRepository.cardbookOAuthData.GOOGLE2.REDIRECT_URI +
			"&scope=" + cardbookRepository.cardbookOAuthData.GOOGLE2.SCOPE_CONTACTS +
			"&login_hint=" + aEmail;
	},

	requestNewRefreshTokenForGooglePeople: function (aConnection, aCallback, aFollowAction) {
		cardbookRepository.cardbookRefreshTokenRequest[aConnection.connPrefId]++;
		var myArgs = {email: aConnection.connUser, dirPrefId: aConnection.connPrefId, clientID: cardbookRepository.cardbookOAuthData.GOOGLE2.CLIENT_ID, scopeURL: cardbookRepository.cardbookOAuthData.GOOGLE2.SCOPE_CONTACTS};
		var wizard = Services.wm.getMostRecentWindow("mail:3pane").openDialog("chrome://cardbook/content/addressbooksconfiguration/wdw_newToken.xhtml", "", "chrome,resizable,scrollbars=no,status=no", myArgs);
		wizard.addEventListener("load", function onloadListener() {
			var browser = wizard.document.getElementById("browser");
			var url = cardbookSynchronizationGoogle2.getGoogleOAuthURLForGooglePeople(aConnection.connUser);
			browser.setAttribute("src", url);
			cardbookRepository.lTimerNewRefreshTokenAll[aConnection.connPrefId] = Components.classes["@mozilla.org/timer;1"].createInstance(Components.interfaces.nsITimer);
			var lTimerCheckTitle = cardbookRepository.lTimerNewRefreshTokenAll[aConnection.connPrefId];
			lTimerCheckTitle.initWithCallback({ notify: function(lTimerCheckTitle) {
						var title = browser.contentTitle;
						if (title && title.indexOf(cardbookRepository.cardbookOAuthData.GOOGLE2.REDIRECT_TITLE) === 0) {
							var myCode = title.substring(cardbookRepository.cardbookOAuthData.GOOGLE2.REDIRECT_TITLE.length);
							cardbookRepository.cardbookUtils.formatStringForOutput("googleNewRefreshTokenOK", [aConnection.connDescription, myCode]);
							var connection = {connUser: "", connUrl: cardbookRepository.cardbookOAuthData.GOOGLE2.TOKEN_REQUEST_URL, connPrefId: aConnection.connPrefId, connDescription: aConnection.connDescription};
							cardbookSynchronizationGoogle2.getNewRefreshTokenForGooglePeople(connection, myCode, function callback(aResponse) {
																									wizard.close();
																									cardbookRepository.cardbookPasswordManager.rememberPassword(aConnection.connUser, cardbookRepository.cardbookOAuthData.GOOGLE2.AUTH_PREFIX_CONTACTS, aResponse.refresh_token, true);
																									if (aCallback) {
																										aCallback(aConnection, aFollowAction);
																									}
																									});
							lTimerCheckTitle.cancel();
						}
					}
					}, 1000, Components.interfaces.nsITimer.TYPE_REPEATING_SLACK);
		});
	},

	getNewRefreshTokenForGooglePeople: function(aConnection, aCode, aCallback) {
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
						cardbookRepository.cardbookLog.updateStatusProgressInformation(aConnection.connDescription + " : cardbookSynchronizationGoogle2.getNewRefreshTokenForGooglePeople error : " + e, "Error");
						cardbookRepository.cardbookServerSyncResponse[aConnection.connPrefId]++;
					}
				} else {
					cardbookRepository.cardbookRefreshTokenError[aConnection.connPrefId]++;
					cardbookRepository.cardbookUtils.formatStringForOutput("synchronizationFailed", [aConnection.connDescription, "getNewRefreshTokenForGooglePeople", aConnection.connUrl, status], "Error");
					cardbookRepository.cardbookServerSyncResponse[aConnection.connPrefId]++;
				}
				cardbookRepository.lTimerNewRefreshTokenAll[aConnection.connPrefId].cancel();
				cardbookRepository.cardbookRefreshTokenResponse[aConnection.connPrefId]++;
			}
		};
		cardbookRepository.cardbookUtils.formatStringForOutput("googleRequestRefreshToken", [aConnection.connDescription, aConnection.connUrl]);
		let params = {"code": aCode, "client_id": cardbookRepository.cardbookOAuthData.GOOGLE2.CLIENT_ID, "client_secret": cardbookRepository.cardbookOAuthData.GOOGLE2.CLIENT_SECRET,
						"redirect_uri": cardbookRepository.cardbookOAuthData.GOOGLE2.REDIRECT_URI, "grant_type": cardbookRepository.cardbookOAuthData.GOOGLE2.TOKEN_REQUEST_GRANT_TYPE};
		let headers = { "Content-Type": "application/x-www-form-urlencoded", "GData-Version": "3" };
		aConnection.accessToken = "NOACCESSTOKEN";
		let request = new cardbookWebDAV(aConnection, listener_getRefreshToken);
		request.googleToken(cardbookRepository.cardbookOAuthData.GOOGLE2.TOKEN_REQUEST_TYPE, params, headers);
	},

	getNewAccessTokenForGooglePeople: function(aConnection, aFollowAction) {
		var listener_getAccessToken = {
			onDAVQueryComplete: function(status, response, askCertificate) {
				if (status > 199 && status < 400) {
					try {
						var responseText = JSON.parse(response);
						cardbookRepository.cardbookUtils.formatStringForOutput("googleAccessTokenOK", [aConnection.connDescription, cardbookRepository.cardbookUtils.cleanWebObject(responseText)]);
						aConnection.accessToken = responseText.token_type + " " + responseText.access_token;
						aFollowAction(aConnection);
					}
					catch(e) {
						cardbookRepository.cardbookServerSyncResponse[aConnection.connPrefId]++;
						cardbookRepository.cardbookAccessTokenError[aConnection.connPrefId]++;
						cardbookRepository.cardbookLog.updateStatusProgressInformation(aConnection.connDescription + " : cardbookSynchronizationGoogle2.getNewAccessTokenForGooglePeople error : " + e, "Error");
					}
				} else {
					if (status == 400 || status == 401) {
						cardbookRepository.cardbookUtils.formatStringForOutput("synchronizationFailed", [aConnection.connDescription, "getNewAccessTokenForGooglePeople", aConnection.connUrl, status]);
						cardbookRepository.cardbookUtils.formatStringForOutput("googleGetNewRefreshToken", [aConnection.connDescription, aConnection.connUrl]);
						cardbookSynchronizationGoogle2.requestNewRefreshTokenForGooglePeople(aConnection, cardbookSynchronizationGoogle2.getNewAccessTokenForGooglePeople, aFollowAction);
					} else {
						cardbookRepository.cardbookUtils.formatStringForOutput("synchronizationFailed", [aConnection.connDescription, "getNewAccessTokenForGooglePeople", aConnection.connUrl, status], "Error");
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
		let myCode = cardbookRepository.cardbookPasswordManager.getPassword(aConnection.connUser, cardbookRepository.cardbookOAuthData.GOOGLE2.AUTH_PREFIX_CONTACTS);
		let params = {"refresh_token": myCode, "client_id": cardbookRepository.cardbookOAuthData.GOOGLE2.CLIENT_ID, "client_secret": cardbookRepository.cardbookOAuthData.GOOGLE2.CLIENT_SECRET,
						"grant_type": cardbookRepository.cardbookOAuthData.GOOGLE2.REFRESH_REQUEST_GRANT_TYPE};
		let headers = { "Content-Type": "application/x-www-form-urlencoded", "GData-Version": "3" };
		let request = new cardbookWebDAV(aConnection, listener_getAccessToken);
		request.googleToken(cardbookRepository.cardbookOAuthData.GOOGLE2.REFRESH_REQUEST_TYPE, params, headers);
	},

	getCategoriesNumber: function (aPrefId) {
		cardbookRepository.cardbookCategoriesFromCache[aPrefId] = {};
		if (!cardbookRepository.cardbookFileCacheCategories[aPrefId]) {
			cardbookRepository.cardbookFileCacheCategories[aPrefId] = {}
		}
		if (cardbookRepository.cardbookCategoriesFromCache[aPrefId]) {
			cardbookRepository.cardbookCategoriesFromCache[aPrefId] = JSON.parse(JSON.stringify(cardbookRepository.cardbookFileCacheCategories[aPrefId]));
		}
		let length = 0;
		if (cardbookRepository.cardbookFileCacheCategories[aPrefId]) {
			for (let i in cardbookRepository.cardbookFileCacheCategories[aPrefId]) {
				length++;
			}
		}
		return length;
	},

	googleSyncLabelsInit: function (aConnection) {
		cardbookSynchronizationGoogle2.skippedLabels[aConnection.connPrefId] = [];
		cardbookSynchronizationGoogle2.labels[aConnection.connPrefId] = [];
		cardbookSynchronizationGoogle2.labelsList[aConnection.connPrefId] = [];
		cardbookSynchronizationGoogle2.googleSyncLabels(aConnection);
	},

	googleSyncLabels: function(aConnection, aNextPageToken) {
		var listener_getLabels = {
			onDAVQueryComplete: async function(status, response, askCertificate) {
				if (status == 0) {
					if (askCertificate) {
						var certificateExceptionAdded = false;
						var certificateExceptionAdded = cardbookRepository.cardbookSynchronization.addCertificateException(cardbookSynchronization.getRootUrl(aConnection.connUrl));
						if (certificateExceptionAdded) {
							cardbookSynchronizationGoogle2.googleSyncLabels(aConnection);
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
				} else if (response && (status > 199 && status < 400)) {
					cardbookRepository.cardbookServerSyncHandleRemainingCatTotal[aConnection.connPrefId] = cardbookSynchronizationGoogle2.getCategoriesNumber(aConnection.connPrefId);
					let responseJSON = JSON.parse(response);
					for (let contactGroup of responseJSON.contactGroups) {
						if (contactGroup.groupType == "SYSTEM_CONTACT_GROUP") {
							continue;
						}
						cardbookSynchronizationGoogle2.labelsList[aConnection.connPrefId].push(contactGroup.name);
					}
					for (let contactGroup of responseJSON.contactGroups) {
						let tmpArray = contactGroup.resourceName.split("/");
						let uid = tmpArray[tmpArray.length - 1];
						if (contactGroup.groupType == "SYSTEM_CONTACT_GROUP") {
							cardbookSynchronizationGoogle2.skippedLabels[aConnection.connPrefId].push(uid);
							continue;
						}
						let href = cardbookRepository.cardbookOAuthData.GOOGLE2.LABELS_URL + "/" + uid;
						
						cardbookRepository.cardbookServerCatSyncTotal[aConnection.connPrefId]++;
						cardbookRepository.cardbookServerSyncCompareCatWithCacheTotal[aConnection.connPrefId]++;
						let aCategory = new cardbookCategoryParser(contactGroup.name, aConnection.connPrefId);
						aCategory.etag = contactGroup.etag;
						aCategory.href = href;
						aCategory.uid = uid;
						cardbookSynchronizationGoogle2.labels[aConnection.connPrefId].push(aCategory);
					}
					if (responseJSON.nextPageToken == null) {
						for (let category of cardbookSynchronizationGoogle2.labels[aConnection.connPrefId]) {
							let aCatConnection = {accessToken: aConnection.accessToken, connPrefId: aConnection.connPrefId, connUrl: category.href, connDescription: aConnection.connDescription,
													connUser: aConnection.connUser};
							cardbookSynchronizationGoogle2.compareServerCatWithCache(aCatConnection, category, cardbookSynchronizationGoogle2.labelsList[aConnection.connPrefId]);
							if (cardbookRepository.cardbookCategoriesFromCache[aCatConnection.connPrefId][category.href]) {
								delete cardbookRepository.cardbookCategoriesFromCache[aCatConnection.connPrefId][category.href];
								cardbookRepository.cardbookServerSyncHandleRemainingCatTotal[aCatConnection.connPrefId]--;
							}
						}
						await cardbookSynchronizationGoogle2.handleRemainingCatCache(aConnection, cardbookSynchronizationGoogle2.labelsList[aConnection.connPrefId]);
					} else {
						cardbookRepository.cardbookServerSyncRequest[aConnection.connPrefId]++;
						cardbookSynchronizationGoogle2.googleSyncLabels(aConnection, responseJSON.nextPageToken)
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
		let params = {pageSize: cardbookRepository.cardbookOAuthData.GOOGLE2.LABELS_URL_SIZE, groupFields: "name,groupType"};
		if (aNextPageToken != null) {
			params.pageToken = aNextPageToken;
		}
		let encodedParams = cardbookRepository.cardbookSynchronization.encodeParams(params);
		aConnection.connUrl = cardbookRepository.cardbookOAuthData.GOOGLE2.LABELS_URL + "?" + encodedParams;
		var request = new cardbookWebDAV(aConnection, listener_getLabels, "");
		request.getLabels2();
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
					cardbookSynchronizationGoogle2.serverDeleteCategory(aCatConnection, myCacheCat);
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
						cardbookSynchronizationGoogle2.serverUpdateCategory(aUpdateConnection, myCacheCat);
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
					var conflictResult = cardbookRepository.cardbookSynchronization.askUser("category", aCatConnection.connPrefId, message, cardbookRepository.importConflictChoiceSync1Values);
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
						cardbookSynchronizationGoogle2.serverDeleteCategory(aCatConnection, myCacheCat);
						break;
					default:
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
					var conflictResult = cardbookRepository.cardbookSynchronization.askUser("category", aCatConnection.connPrefId, message, cardbookRepository.importConflictChoiceSync3Values);
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
							cardbookSynchronizationGoogle2.serverUpdateCategory(aUpdateConnection, myCacheCat);
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
					default:
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

	handleRemainingCatCache: async function (aConnection, aServerList) {
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
						cardbookSynchronizationGoogle2.serverCreateCategory(aCreateConnection, aCategory);
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
							var conflictResult = cardbookRepository.cardbookSynchronization.askUser("category", aConnection.connPrefId, message, cardbookRepository.importConflictChoiceSync1Values);
						}
						
						cardbookRepository.cardbookLog.updateStatusProgressInformationWithDebug1(aConnection.connDescription + " : debug mode : conflict resolution : ", conflictResult);
						switch (conflictResult) {
							case "keep":
								cardbookRepository.cardbookUtils.formatStringForOutput("categoryNewOnDisk", [aConnection.connDescription, aCategory.name]);
								cardbookRepository.cardbookServerCreatedCatRequest[aConnection.connPrefId]++;
								var aCreateConnection = JSON.parse(JSON.stringify(aConnection));
								cardbookSynchronizationGoogle2.serverCreateCategory(aCreateConnection, aCategory);
								break;
							case "delete":
								cardbookRepository.cardbookUtils.formatStringForOutput("categoryDeletedOnServer", [aConnection.connDescription, aCategory.name]);
								await cardbookRepository.removeCardsFromCategory(aConnection.connPrefId, aCategory.name);
								cardbookRepository.removeCategoryFromRepository(aCategory, true, aConnection.connPrefId);
								cardbookRepository.cardbookServerCatSyncDone[aConnection.connPrefId]++;
								break;
							default:
								cardbookRepository.cardbookServerCatSyncDone[aConnection.connPrefId]++;
								break;
						}
					} else {
						// "DELETEDONSERVER"
						cardbookRepository.cardbookServerCatSyncTotal[aConnection.connPrefId]++;
						cardbookRepository.cardbookUtils.formatStringForOutput("categoryDeletedOnServer", [aConnection.connDescription, aCategory.name]);
						await cardbookRepository.removeCardsFromCategory(aConnection.connPrefId, aCategory.name);
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
					cardbookRepository.cardbookServerSyncAgain[aConnection.connPrefId] = true;
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
		if (cardbookRepository.cardbookSynchronization.getModifsPushed(aConnection.connPrefId) <= cardbookRepository.cardbookPreferences.getMaxModifsPushed()) {
			var request = new cardbookWebDAV(aConnection, listener_delete, aCategory.etag);
			cardbookRepository.cardbookUtils.formatStringForOutput("serverCategorySendingDeletion", [aConnection.connDescription, aCategory.name]);
			request.delete();
		} else {
			cardbookRepository.cardbookServerCatSyncDone[aConnection.connPrefId]++;
			cardbookRepository.cardbookServerDeletedCatResponse[aConnection.connPrefId]++;
			cardbookRepository.cardbookServerNotPushed[aConnection.connPrefId]++;
		}
	},

	serverUpdateCategory: function(aConnection, aCategory) {
		var listener_update = {
			onDAVQueryComplete: function(status, response, askCertificate, etag) {
				if (status > 199 && status < 400) {
					cardbookRepository.cardbookServerSyncAgain[aConnection.connPrefId] = true;
					if (cardbookRepository.cardbookCategories[aCategory.dirPrefId+"::"+aCategory.uid]) {
						let myOldCategory = cardbookRepository.cardbookCategories[aCategory.dirPrefId+"::"+aCategory.uid];
						cardbookRepository.removeCategoryFromRepository(myOldCategory, true, aConnection.connPrefId);
					}
					let responseJSON = JSON.parse(response);
					let tmpArray = responseJSON.resourceName.split("/");
					let uid = tmpArray[tmpArray.length - 1];
					aCategory.uid = uid;
					cardbookRepository.cardbookUtils.addEtag(aCategory, responseJSON.etag);
					aCategory.href = cardbookRepository.cardbookOAuthData.GOOGLE2.LABELS_URL + "/" + uid;
					cardbookRepository.cardbookUtils.formatStringForOutput("serverCategoryUpdatedOnServerWithEtag", [aConnection.connDescription, aCategory.name, responseJSON.etag]);
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
		if (cardbookRepository.cardbookSynchronization.getModifsPushed(aConnection.connPrefId) <= cardbookRepository.cardbookPreferences.getMaxModifsPushed()) {
			aConnection.connUrl = aCategory.href;
			var request = new cardbookWebDAV(aConnection, listener_update, aCategory.etag);
			var categoryContent = {
				"contactGroup": {name: aCategory.name, etag: aCategory.etag, resourceName: cardbookRepository.cardbookOAuthData.GOOGLE2.LABELS + "/" + aCategory.uid},
				"updateGroupFields": "name,groupType",
				"readGroupFields": "name,groupType"
			};
			cardbookRepository.cardbookUtils.formatStringForOutput("serverCategorySendingUpdate", [aConnection.connDescription, aCategory.name]);
			request.put(JSON.stringify(categoryContent));
		} else {
			cardbookRepository.cardbookServerCatSyncDone[aConnection.connPrefId]++;
			cardbookRepository.cardbookServerUpdatedCatResponse[aConnection.connPrefId]++;
			cardbookRepository.cardbookServerNotPushed[aConnection.connPrefId]++;
		}
	},

	serverCreateCategory: function(aConnection, aCategory) {
		var listener_create = {
			onDAVQueryComplete: function(status, response, askCertificate, etag) {
				if (status > 199 && status < 400) {
					cardbookRepository.cardbookServerSyncAgain[aConnection.connPrefId] = true;
					if (cardbookRepository.cardbookCategories[aCategory.dirPrefId+"::"+aCategory.uid]) {
						let myOldCategory = cardbookRepository.cardbookCategories[aCategory.dirPrefId+"::"+aCategory.uid];
						cardbookRepository.removeCategoryFromRepository(myOldCategory, true, aConnection.connPrefId);
					}
					let responseJSON = JSON.parse(response);
					let tmpArray = responseJSON.resourceName.split("/");
					let uid = tmpArray[tmpArray.length - 1];
					aCategory.uid = uid;
					cardbookRepository.cardbookUtils.addEtag(aCategory, responseJSON.etag);
					aCategory.href = cardbookRepository.cardbookOAuthData.GOOGLE2.LABELS_URL + "/" + uid;
					cardbookRepository.cardbookUtils.formatStringForOutput("serverCategoryCreatedOnServerWithEtag", [aConnection.connDescription, aCategory.name, responseJSON.etag]);
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
		if (cardbookRepository.cardbookSynchronization.getModifsPushed(aConnection.connPrefId) <= cardbookRepository.cardbookPreferences.getMaxModifsPushed()) {
			aConnection.connUrl = cardbookRepository.cardbookOAuthData.GOOGLE2.LABELS_URL;
			var request = new cardbookWebDAV(aConnection, listener_create, "");
			var categoryContent = {
				"contactGroup": {name: aCategory.name},
				"readGroupFields": "name,groupType",
			};
			cardbookRepository.cardbookUtils.formatStringForOutput("serverCategorySendingCreate", [aConnection.connDescription, aCategory.name]);
			request.post(JSON.stringify(categoryContent));
		} else {
			cardbookRepository.cardbookServerCatSyncDone[aConnection.connPrefId]++;
			cardbookRepository.cardbookServerCreatedCatResponse[aConnection.connPrefId]++;
			cardbookRepository.cardbookServerNotPushed[aConnection.connPrefId]++;
		}
	},

	googleSyncContactsInit: function (aConnection) {
		cardbookSynchronizationGoogle2.contacts[aConnection.connPrefId] = {};
		cardbookSynchronizationGoogle2.googleSyncContacts(aConnection);
	},

	googleSyncContacts: function(aConnection, aNextPageToken) {
		var listener_getContacts = {
			onDAVQueryComplete: async function(status, response, askCertificate) {
				if (status == 0) {
					if (askCertificate) {
						var certificateExceptionAdded = false;
						var certificateExceptionAdded = cardbookRepository.cardbookSynchronization.addCertificateException(cardbookSynchronization.getRootUrl(aConnection.connUrl));
						if (certificateExceptionAdded) {
							cardbookSynchronizationGoogle2.googleSyncContacts(aConnection);
						} else {
							cardbookRepository.cardbookUtils.formatStringForOutput("synchronizationFailed", [aConnection.connDescription, "googleSyncContacts", aConnection.connUrl, status], "Error");
							cardbookRepository.cardbookServerCardSyncError[aConnection.connPrefId]++;
							cardbookRepository.cardbookServerSyncResponse[aConnection.connPrefId]++;
						}
					} else {
						cardbookRepository.cardbookUtils.formatStringForOutput("synchronizationFailed", [aConnection.connDescription, "googleSyncContacts", aConnection.connUrl, status], "Error");
						cardbookRepository.cardbookServerCardSyncError[aConnection.connPrefId]++;
						cardbookRepository.cardbookServerSyncResponse[aConnection.connPrefId]++;
					}
				} else if (response && (status > 199 && status < 400)) {
					cardbookRepository.cardbookServerSyncHandleRemainingCardTotal[aConnection.connPrefId] = cardbookSynchronization.getCardsNumber(aConnection.connPrefId);
					let responseJSON = JSON.parse(response);
					if (responseJSON.connections) {
						for (let resource of responseJSON.connections) {
							let tmpArray = resource.resourceName.split("/");
							let uid = tmpArray[tmpArray.length - 1];
							let href = cardbookRepository.cardbookOAuthData.GOOGLE2.CONTACT_URL + "/" + uid;
							let etag = resource.metadata.sources[0].etag;
							// Google sometimes answers the same contacts
							if (typeof cardbookSynchronizationGoogle2.contacts[aConnection.connPrefId][uid] == "undefined") {
								cardbookSynchronizationGoogle2.contacts[aConnection.connPrefId][uid] = { href: href, etag: etag, memberships: resource.memberships, resourceEtag: resource.etag};
								cardbookRepository.cardbookServerCardSyncTotal[aConnection.connPrefId]++;
								cardbookRepository.cardbookServerSyncCompareCardWithCacheTotal[aConnection.connPrefId]++;
							}
						}
						if (responseJSON.nextPageToken == null) {
							for (let uid in cardbookSynchronizationGoogle2.contacts[aConnection.connPrefId]) {
								let card = cardbookSynchronizationGoogle2.contacts[aConnection.connPrefId][uid];
								let aCardConnection = {accessToken: aConnection.accessToken, connPrefId: aConnection.connPrefId, connUrl: card.href, connDescription: aConnection.connDescription,
														connUser: aConnection.connUser};
								await cardbookSynchronizationGoogle2.compareServerCardWithCache(aCardConnection, uid, card.etag, uid);
								if (cardbookRepository.cardbookCardsFromCache[aCardConnection.connPrefId][uid]) {
									delete cardbookRepository.cardbookCardsFromCache[aCardConnection.connPrefId][uid];
									cardbookRepository.cardbookServerSyncHandleRemainingCardTotal[aCardConnection.connPrefId]--;
								}
							}
							await cardbookSynchronizationGoogle2.handleRemainingCardCache(aConnection);
						} else {
							cardbookRepository.cardbookServerSyncRequest[aConnection.connPrefId]++;
							cardbookSynchronizationGoogle2.googleSyncContacts(aConnection, responseJSON.nextPageToken)
						}
					} else {
						console.debug(responseJSON);
						cardbookRepository.cardbookUtils.formatStringForOutput("synchronizationFailed", [aConnection.connDescription, "googleSyncContacts", aConnection.connUrl, status], "Error");
						cardbookRepository.cardbookServerCardSyncError[aConnection.connPrefId]++;
					}
					cardbookRepository.cardbookServerSyncResponse[aConnection.connPrefId]++;
				} else {
					cardbookRepository.cardbookUtils.formatStringForOutput("synchronizationFailed", [aConnection.connDescription, "googleSyncContacts", aConnection.connUrl, status], "Error");
					cardbookRepository.cardbookServerCardSyncError[aConnection.connPrefId]++;
					cardbookRepository.cardbookServerSyncResponse[aConnection.connPrefId]++;
				}
			}
		};
		cardbookRepository.cardbookUtils.formatStringForOutput("synchronizationSearchingCards", [aConnection.connDescription]);
		let params = {pageSize: cardbookRepository.cardbookOAuthData.GOOGLE2.CONTACTS_URL_SIZE, personFields: cardbookRepository.cardbookOAuthData.GOOGLE2.SYNC_PERSON_FIELDS};
		if (aNextPageToken != null) {
			params.pageToken = aNextPageToken;
		}
		let encodedParams = cardbookRepository.cardbookSynchronization.encodeParams(params);
		aConnection.connUrl = cardbookRepository.cardbookOAuthData.GOOGLE2.CONTACTS_URL + "?" + encodedParams;
		var request = new cardbookWebDAV(aConnection, listener_getContacts, "");
		request.getContacts2();
	},

	compareServerCardWithCache: async function (aCardConnection, aUrl, aEtag, aId) {
		if (cardbookRepository.cardbookFileCacheCards[aCardConnection.connPrefId] && cardbookRepository.cardbookFileCacheCards[aCardConnection.connPrefId][aUrl]) {
			var myCacheCard = cardbookRepository.cardbookFileCacheCards[aCardConnection.connPrefId][aUrl];
			var myServerCard = new cardbookCardParser();
			cardbookRepository.cardbookUtils.cloneCard(myCacheCard, myServerCard);
			cardbookRepository.cardbookUtils.addEtag(myServerCard, aEtag);
			if (myCacheCard.etag == aEtag) {
				if (myCacheCard.deleted) {
					// "DELETEDONDISK";
					cardbookRepository.cardbookServerDeletedCardRequest[aCardConnection.connPrefId]++;
					cardbookRepository.cardbookServerSyncDeletedCardOnDisk[aCardConnection.connPrefId]++;
					cardbookRepository.cardbookUtils.formatStringForOutput("cardDeletedOnDisk", [aCardConnection.connDescription, myCacheCard.fn]);
					cardbookSynchronizationGoogle2.serverDeleteCard(aCardConnection, myCacheCard);
				} else if (myCacheCard.updated) {
					// "UPDATEDONDISK";
					cardbookRepository.cardbookServerUpdatedCardRequest[aCardConnection.connPrefId]++;
					cardbookRepository.cardbookServerSyncUpdatedCardOnDisk[aCardConnection.connPrefId]++;
					cardbookRepository.cardbookUtils.formatStringForOutput("cardUpdatedOnDisk", [aCardConnection.connDescription, myCacheCard.fn]);
					cardbookSynchronizationGoogle2.serverUpdateCard(aCardConnection, myCacheCard);
				} else {
					// "NOTUPDATED";
					cardbookRepository.cardbookUtils.formatStringForOutput("cardAlreadyGetFromCache", [aCardConnection.connDescription, myCacheCard.fn]);
					cardbookRepository.cardbookServerCardSyncDone[aCardConnection.connPrefId]++;
					cardbookRepository.cardbookServerSyncNotUpdatedCard[aCardConnection.connPrefId]++;
				}
			} else if (myCacheCard.deleted) {
				// "DELETEDONDISKUPDATEDONSERVER";
				cardbookRepository.cardbookServerSyncDeletedCardOnDiskUpdatedCardOnServer[aCardConnection.connPrefId]++;
				cardbookRepository.cardbookUtils.formatStringForOutput("cardDeletedOnDiskUpdatedOnServer", [aCardConnection.connDescription, myCacheCard.fn]);
				var solveConflicts = cardbookRepository.cardbookPreferences.getStringPref("extensions.cardbook.solveConflicts");
				if (solveConflicts === "Local") {
					var conflictResult = "delete";
				} else if (solveConflicts === "Remote") {
					var conflictResult = "keep";
				} else {
					var message = cardbookRepository.extension.localeData.localizeMessage("cardDeletedOnDiskUpdatedOnServer", [aCardConnection.connDescription, myCacheCard.fn]);
					var conflictResult = cardbookRepository.cardbookSynchronization.askUser("card", aCardConnection.connPrefId, message, cardbookRepository.importConflictChoiceSync1Values);
				}
				
				cardbookRepository.cardbookLog.updateStatusProgressInformationWithDebug1(aCardConnection.connDescription + " : debug mode : conflict resolution : ", conflictResult);
				switch (conflictResult) {
					case "keep":
						await cardbookRepository.removeCardFromRepository(myCacheCard, true);
						cardbookRepository.cardbookServerMultiGetArray[aCardConnection.connPrefId].push(aId);
						break;
					case "delete":
						cardbookRepository.cardbookServerDeletedCardRequest[aCardConnection.connPrefId]++;
						cardbookSynchronizationGoogle2.serverDeleteCard(aCardConnection, myCacheCard);
						break;
					default:
						cardbookRepository.cardbookServerCardSyncDone[aCardConnection.connPrefId]++;
						break;
				}
			} else if (myCacheCard.updated) {
				// "UPDATEDONBOTH";
				cardbookRepository.cardbookServerSyncUpdatedCardOnBoth[aCardConnection.connPrefId]++;
				cardbookRepository.cardbookUtils.formatStringForOutput("cardUpdatedOnBoth", [aCardConnection.connDescription, myCacheCard.fn]);
				var solveConflicts = cardbookRepository.cardbookPreferences.getStringPref("extensions.cardbook.solveConflicts");
				if (solveConflicts === "Local") {
					var conflictResult = "local";
				} else if (solveConflicts === "Remote") {
					var conflictResult = "remote";
				} else {
					var message = cardbookRepository.extension.localeData.localizeMessage("cardUpdatedOnBoth", [aCardConnection.connDescription, myCacheCard.fn]);
					var conflictResult = cardbookRepository.cardbookSynchronization.askUser("card", aCardConnection.connPrefId, message, cardbookRepository.importConflictChoiceSync2Values);
				}
				
				cardbookRepository.cardbookLog.updateStatusProgressInformationWithDebug1(aCardConnection.connDescription + " : debug mode : conflict resolution : ", conflictResult);
				switch (conflictResult) {
					case "local":
						cardbookRepository.cardbookServerUpdatedCardRequest[aCardConnection.connPrefId]++;
						cardbookSynchronizationGoogle2.serverUpdateCard(aCardConnection, myCacheCard);
						break;
					case "remote":
						cardbookRepository.cardbookServerMultiGetArray[aCardConnection.connPrefId].push(aId);
						break;
					case "merge":
						cardbookRepository.cardbookServerGetCardForMergeRequest[aCardConnection.connPrefId]++;
						cardbookSynchronizationGoogle2.serverGetForMerge(aCardConnection, aEtag, myCacheCard);
						break;
					default:
						cardbookRepository.cardbookServerCardSyncDone[aCardConnection.connPrefId]++;
						break;
				}
			} else {
				// "UPDATEDONSERVER";
				cardbookRepository.cardbookServerMultiGetArray[aCardConnection.connPrefId].push(aId);
				cardbookRepository.cardbookServerSyncUpdatedCardOnServer[aCardConnection.connPrefId]++;
				cardbookRepository.cardbookUtils.formatStringForOutput("cardUpdatedOnServer", [aCardConnection.connDescription, myCacheCard.fn, aEtag, myCacheCard.etag]);
			}
		} else {
			// "NEWONSERVER";
			cardbookRepository.cardbookServerMultiGetArray[aCardConnection.connPrefId].push(aId);
			cardbookRepository.cardbookServerSyncNewCardOnServer[aCardConnection.connPrefId]++;
			cardbookRepository.cardbookUtils.formatStringForOutput("cardNewOnServer", [aCardConnection.connDescription]);
		}
		cardbookRepository.cardbookServerSyncCompareCardWithCacheDone[aCardConnection.connPrefId]++;
	},

	handleRemainingCardCache: async function (aConnection) {
		if (cardbookRepository.cardbookCardsFromCache[aConnection.connPrefId]) {
			for (var i in cardbookRepository.cardbookCardsFromCache[aConnection.connPrefId]) {
				var aCard = cardbookRepository.cardbookCardsFromCache[aConnection.connPrefId][i];
				if (aCard.created) {
					// "NEWONDISK";
					cardbookRepository.cardbookUtils.formatStringForOutput("cardNewOnDisk", [aConnection.connDescription, aCard.fn]);
					cardbookRepository.cardbookServerCreatedCardRequest[aConnection.connPrefId]++;
					cardbookRepository.cardbookServerCardSyncTotal[aConnection.connPrefId]++;
					cardbookRepository.cardbookServerSyncNewCardOnDisk[aConnection.connPrefId]++;
					var aCreateConnection = JSON.parse(JSON.stringify(aConnection));
					cardbookSynchronizationGoogle2.serverCreateCard(aCreateConnection, aCard);
				} else if (aCard.updated) {
					// "UPDATEDONDISKDELETEDONSERVER";
					cardbookRepository.cardbookUtils.formatStringForOutput("cardUpdatedOnDiskDeletedOnServer", [aConnection.connDescription, aCard.fn]);
					cardbookRepository.cardbookServerCardSyncTotal[aConnection.connPrefId]++;
					cardbookRepository.cardbookServerSyncUpdatedCardOnDiskDeletedCardOnServer[aConnection.connPrefId]++;
					var solveConflicts = cardbookRepository.cardbookPreferences.getStringPref("extensions.cardbook.solveConflicts");
					if (solveConflicts === "Local") {
						var conflictResult = "keep";
					} else if (solveConflicts === "Remote") {
						var conflictResult = "delete";
					} else {
						var message = cardbookRepository.extension.localeData.localizeMessage("cardUpdatedOnDiskDeletedOnServer", [aConnection.connDescription, aCard.fn]);
						var conflictResult = cardbookRepository.cardbookSynchronization.askUser("card", aConnection.connPrefId, message, cardbookRepository.importConflictChoiceSync1Values);
					}
					
					cardbookRepository.cardbookLog.updateStatusProgressInformationWithDebug1(aConnection.connDescription + " : debug mode : conflict resolution : ", conflictResult);
					switch (conflictResult) {
						case "keep":
							cardbookRepository.cardbookServerCreatedCardRequest[aConnection.connPrefId]++;
							var aCreateConnection = JSON.parse(JSON.stringify(aConnection));
							cardbookRepository.cardbookUtils.nullifyEtag(aCard);
							cardbookSynchronizationGoogle2.serverCreateCard(aCreateConnection, aCard);
							break;
						case "delete":
							await cardbookRepository.removeCardFromRepository(aCard, true);
							cardbookRepository.cardbookServerGetCardRequest[aConnection.connPrefId]++;
							cardbookRepository.cardbookServerGetCardResponse[aConnection.connPrefId]++;
							cardbookRepository.cardbookServerCardSyncDone[aConnection.connPrefId]++;
							break;
						default:
							cardbookRepository.cardbookServerCardSyncDone[aConnection.connPrefId]++;
							break;
					}
				} else if (!aCard.deleted) {
					// "DELETEDONSERVER";
					cardbookRepository.cardbookServerCardSyncTotal[aConnection.connPrefId]++;
					cardbookRepository.cardbookUtils.formatStringForOutput("cardDeletedOnServer", [aConnection.connDescription, aCard.fn]);
					await cardbookRepository.removeCardFromRepository(aCard, true);
					cardbookRepository.cardbookServerCardSyncDone[aConnection.connPrefId]++;
					cardbookRepository.cardbookServerSyncDeletedCardOnServer[aConnection.connPrefId]++;
				}
				cardbookRepository.cardbookServerSyncHandleRemainingCardDone[aConnection.connPrefId]++;
			}
		}
	},
	
	serverGetForMerge: function(aConnection, aEtag, aCacheCard) {
		var listener_get = {
			onDAVQueryComplete: async function(status, response, askCertificate) {
				if (status > 199 && status < 400) {
					let responseJSON = JSON.parse(response);
					let myCard = cardbookSynchronizationGoogle2.parseGoogleContactToCard(responseJSON, aConnection.connPrefId);
					if (myCard.photo.URI != "") {
						// setting new id from storing temporary photo into DB
						myCard.uid = cardbookRepository.cardbookUtils.getUUID();
						myCard.cbid = aConnection.connPrefId+"::"+cardbookRepository.cardbookUtils.getUUID();
						await cardbookRepository.cardbookUtils.changeMediaFromFileToContent(myCard);
					}
					cardbookRepository.cardbookUtils.formatStringForOutput("serverCardGetOK", [aConnection.connDescription, myCard.fn]);
					var myArgs = {cardsIn: [myCard, aCacheCard], cardsOut: [], hideCreate: true, action: ""};
					var myWindow = Services.wm.getMostRecentWindow("mail:3pane").openDialog("chrome://cardbook/content/mergeCards/wdw_mergeCards.xhtml", "", cardbookRepository.modalWindowParams, myArgs);
					if (myArgs.action == "CREATEANDREPLACE") {
						myArgs.cardsOut[0].uid = aCacheCard.uid;
						myArgs.cardsOut[0].cardurl = aCacheCard.cardurl;
						cardbookRepository.cardbookUtils.addEtag(myArgs.cardsOut[0], aEtag);
						cardbookRepository.cardbookUtils.setCalculatedFields(myArgs.cardsOut[0]);
						cardbookRepository.cardbookServerUpdatedCardRequest[aConnection.connPrefId]++;
						cardbookRepository.cardbookServerGetCardForMergeResponse[aConnection.connPrefId]++;
						cardbookSynchronizationGoogle2.serverUpdateCard(aConnection, myArgs.cardsOut[0]);
					} else {
						cardbookRepository.cardbookServerCardSyncDone[aConnection.connPrefId]++;
						cardbookRepository.cardbookServerGetCardForMergeResponse[aConnection.connPrefId]++;
					}
				} else {
					cardbookRepository.cardbookServerGetCardForMergeError[aConnection.connPrefId]++;
					cardbookRepository.cardbookServerGetCardForMergeResponse[aConnection.connPrefId]++;
					cardbookRepository.cardbookServerCardSyncDone[aConnection.connPrefId]++;
					cardbookRepository.cardbookUtils.formatStringForOutput("serverCardGetFailed", [aConnection.connDescription, aConnection.connUrl, status], "Error");
				}
			}
		};
		let params = {personFields: cardbookRepository.cardbookOAuthData.GOOGLE2.GET_PERSON_FIELDS};
		let encodedParams = cardbookRepository.cardbookSynchronization.encodeParams(params);
		aConnection.connUrl = aCacheCard.cardurl + "?" + encodedParams;
		let request = new cardbookWebDAV(aConnection, listener_get, "");
		request.get();
	},

	serverMultiGet: function(aConnection) {
		var listener_multiget = {
			onDAVQueryComplete: async function(status, response, askCertificate, etagDummy, length) {
				if (status == 0) {
					if (askCertificate) {
						var certificateExceptionAdded = false;
						var certificateExceptionAdded = cardbookRepository.cardbookSynchronization.addCertificateException(cardbookSynchronization.getRootUrl(aConnection.connUrl));
						if (certificateExceptionAdded) {
							cardbookSynchronizationGoogle2.serverMultiGet(aConnection);
						} else {
							cardbookRepository.cardbookUtils.formatStringForOutput("synchronizationFailed", [aConnection.connDescription, "googleSyncContacts", aConnection.connUrl, status], "Error");
							cardbookRepository.cardbookServerCardSyncError[aConnection.connPrefId]++;
							cardbookRepository.cardbookServerSyncResponse[aConnection.connPrefId]++;
						}
					} else {
						cardbookRepository.cardbookUtils.formatStringForOutput("synchronizationFailed", [aConnection.connDescription, "googleSyncContacts", aConnection.connUrl, status], "Error");
						cardbookRepository.cardbookServerCardSyncError[aConnection.connPrefId]++;
						cardbookRepository.cardbookServerSyncResponse[aConnection.connPrefId]++;
					}
				} else if (response && (status > 199 && status < 400)) {
					let responseJSON = JSON.parse(response);
					for (let contact of responseJSON.responses) {
						if (contact.httpStatusCode == "200") {
							let myCard = cardbookSynchronizationGoogle2.parseGoogleContactToCard(contact.person, aConnection.connPrefId);
							if (cardbookRepository.cardbookCards[myCard.dirPrefId+"::"+myCard.uid]) {
								let myOldCard = cardbookRepository.cardbookCards[myCard.dirPrefId+"::"+myCard.uid];
								await cardbookRepository.removeCardFromRepository(myOldCard, true);
							}
							await cardbookRepository.addCardToRepository(myCard, true);
							cardbookRepository.cardbookUtils.formatStringForOutput("serverCardGetOK", [aConnection.connDescription, myCard.fn]);
							cardbookRepository.cardbookServerCardSyncDone[aConnection.connPrefId]++;
						} else {
							cardbookRepository.cardbookServerCardSyncDone[aConnection.connPrefId]++;
							cardbookRepository.cardbookServerGetCardError[aConnection.connPrefId]++;
							cardbookRepository.cardbookUtils.formatStringForOutput("serverCardGetFailed", [aConnection.connDescription, aConnection.connUrl, status], "Error");
						}
					}
				} else {
					cardbookRepository.cardbookServerCardSyncDone[aConnection.connPrefId] = cardbookRepository.cardbookServerCardSyncDone[aConnection.connPrefId] + length;
					cardbookRepository.cardbookServerMultiGetError[aConnection.connPrefId]++;
					cardbookRepository.cardbookUtils.formatStringForOutput("serverCardGetFailed", [aConnection.connDescription, aConnection.connUrl, status], "Error");
				}
				cardbookRepository.cardbookServerMultiGetResponse[aConnection.connPrefId]++;
			}
		};
		let multiget = cardbookRepository.cardbookOAuthData.GOOGLE2.BATCH_GET_URL_SIZE;
		for (var i = 0; i < cardbookRepository.cardbookServerMultiGetArray[aConnection.connPrefId].length; i = i + +multiget) {
			let params = {personFields: cardbookRepository.cardbookOAuthData.GOOGLE2.GET_PERSON_FIELDS};
			let encodedParams = cardbookRepository.cardbookSynchronization.encodeParams(params);
			aConnection.connUrl = cardbookRepository.cardbookOAuthData.GOOGLE2.BATCH_GET_URL + "?" + encodedParams;
			let subArray = cardbookRepository.cardbookServerMultiGetArray[aConnection.connPrefId].slice(i, i + +multiget);
			let resources = subArray.map(value => "resourceNames=people/" + value).join("&");
			aConnection.connUrl = aConnection.connUrl + "&" + resources;
			let request = new cardbookWebDAV(aConnection, listener_multiget, "");
			cardbookRepository.cardbookServerMultiGetRequest[aConnection.connPrefId]++;
			request.multiget2(subArray.length);
		}
	},

	serverDeleteCard: function(aConnection, aCard) {
		var listener_delete = {
			onDAVQueryComplete: async function(status, response, askCertificate) {
				if (status > 199 && status < 400) {
					cardbookRepository.cardbookServerSyncAgain[aConnection.connPrefId] = true;
					cardbookRepository.cardbookUtils.formatStringForOutput("serverCardDeletedFromServer", [aConnection.connDescription, aCard.fn]);
					await cardbookRepository.removeCardFromRepository(aCard, true);
				} else if (status == 404) {
					cardbookRepository.cardbookUtils.formatStringForOutput("serverCardNotExistServer", [aConnection.connDescription, aCard.fn]);
					await cardbookRepository.removeCardFromRepository(aCard, true);
				} else {
					cardbookRepository.cardbookServerDeletedCardError[aConnection.connPrefId]++;
					cardbookRepository.cardbookUtils.formatStringForOutput("serverCardDeleteFailed", [aConnection.connDescription, aCard.fn, aConnection.connUrl, status], "Error");
				}
				cardbookRepository.cardbookServerCardSyncDone[aConnection.connPrefId]++;
				cardbookRepository.cardbookServerDeletedCardResponse[aConnection.connPrefId]++;
			}
		};
		if (cardbookSynchronization.getModifsPushed(aConnection.connPrefId) <= cardbookRepository.cardbookPreferences.getMaxModifsPushed()) {
			aConnection.connUrl = aCard.cardurl + ":deleteContact";
			let request = new cardbookWebDAV(aConnection, listener_delete, aCard.etag);
			cardbookRepository.cardbookUtils.formatStringForOutput("serverCardSendingDeletion", [aConnection.connDescription, aCard.fn]);
			request.delete();
		} else {
			cardbookRepository.cardbookServerCardSyncDone[aConnection.connPrefId]++;
			cardbookRepository.cardbookServerDeletedCardResponse[aConnection.connPrefId]++;
			cardbookRepository.cardbookServerNotPushed[aConnection.connPrefId]++;
		}
	},

	serverUpdateCard: function(aConnection, aCard) {
		var listener_update = {
			onDAVQueryComplete: async function(status, response, askCertificate) {
				if (status > 199 && status < 400) {
					cardbookRepository.cardbookServerSyncAgain[aConnection.connPrefId] = true;
					let responseJSON = JSON.parse(response);
					let aModifiedCard = cardbookSynchronizationGoogle2.parseGoogleContactToCard(responseJSON, aConnection.connPrefId);
					let etag = responseJSON.metadata.sources[0].etag;
					cardbookRepository.cardbookUtils.formatStringForOutput("serverCardUpdatedOnServerWithEtag", [aConnection.connDescription, aModifiedCard.fn, etag]);
					cardbookRepository.cardbookUtils.addEtag(aModifiedCard, etag);
					cardbookRepository.cardbookServerCardSyncDone[aConnection.connPrefId]++;
					await cardbookRepository.cardbookUtils.changeMediaFromFileToContent(aCard);
					aModifiedCard.photo = JSON.parse(JSON.stringify(aCard.photo));
					if (aModifiedCard.photo.value) {
						cardbookRepository.cardbookUtils.addTagUpdated(aModifiedCard);
						cardbookRepository.cardbookServerUpdatedCardPhotoRequest[aConnection.connPrefId]++;
						cardbookSynchronizationGoogle2.serverUpdateCardPhoto(aConnection, aModifiedCard);
					} else {
						cardbookRepository.cardbookServerUpdatedCardPhotoRequest[aConnection.connPrefId]++;
						cardbookSynchronizationGoogle2.serverDeleteCardPhoto(aConnection, aModifiedCard);
						await cardbookRepository.removeCardFromRepository(aCard, true);
						await cardbookRepository.addCardToRepository(aModifiedCard, true);
					}
				} else {
					cardbookRepository.cardbookServerCardSyncDone[aConnection.connPrefId]++;
					cardbookRepository.cardbookServerUpdatedCardError[aConnection.connPrefId]++;
					cardbookRepository.cardbookUtils.formatStringForOutput("serverCardUpdateFailed", [aConnection.connDescription, aCard.fn, aConnection.connUrl, status], "Error");
				}
				cardbookRepository.cardbookServerUpdatedCardResponse[aConnection.connPrefId]++;
			}
		};
		if (cardbookSynchronization.getModifsPushed(aConnection.connPrefId) <= cardbookRepository.cardbookPreferences.getMaxModifsPushed()) {
			let params = {updatePersonFields: cardbookRepository.cardbookOAuthData.GOOGLE2.UPDATE_PERSON_FIELDS};
			let encodedParams = cardbookRepository.cardbookSynchronization.encodeParams(params);
			aConnection.connUrl = aCard.cardurl + ":updateContact" + "?" + encodedParams;
			let request = new cardbookWebDAV(aConnection, listener_update);
			cardbookRepository.cardbookUtils.formatStringForOutput("serverCardSendingUpdate", [aConnection.connDescription, aCard.fn]);
			let GoogleContact = cardbookSynchronizationGoogle2.parseCardToGoogleContact(aCard);
			request.patchContact2(JSON.stringify(GoogleContact));
		} else {
			cardbookRepository.cardbookServerCardSyncDone[aConnection.connPrefId]++;
			cardbookRepository.cardbookServerUpdatedCardResponse[aConnection.connPrefId]++;
			cardbookRepository.cardbookServerNotPushed[aConnection.connPrefId]++;
		}
	},

	serverCreateCard: function(aConnection, aCard) {
		var listener_create = {
			onDAVQueryComplete: async function(status, response, askCertificate) {
				if (status > 199 && status < 400) {
					cardbookRepository.cardbookServerSyncAgain[aConnection.connPrefId] = true;
					let responseJSON = JSON.parse(response);
					await cardbookRepository.cardbookUtils.changeMediaFromFileToContent(aCard);
					if (cardbookRepository.cardbookCards[aCard.dirPrefId+"::"+aCard.uid]) {
						var myOldCard = cardbookRepository.cardbookCards[aCard.dirPrefId+"::"+aCard.uid];
						await cardbookRepository.removeCardFromRepository(myOldCard, true);
					}
					let newCard = cardbookSynchronizationGoogle2.parseGoogleContactToCard(responseJSON, aConnection.connPrefId);
					let etag = responseJSON.metadata.sources[0].etag;
					cardbookRepository.cardbookUtils.formatStringForOutput("serverCardCreatedOnServerWithEtag", [aConnection.connDescription, newCard.fn, etag]);
					cardbookRepository.cardbookUtils.addEtag(newCard, etag);
					// if aCard and aCard have the same cached medias
					newCard.photo = JSON.parse(JSON.stringify(aCard.photo));
					if (aCard.photo.value) {
						cardbookRepository.cardbookUtils.addTagUpdated(newCard);
						cardbookRepository.cardbookServerUpdatedCardPhotoRequest[aConnection.connPrefId]++;
						cardbookSynchronizationGoogle2.serverUpdateCardPhoto(aConnection, newCard);
					}
					await cardbookRepository.addCardToRepository(newCard, true);
				} else {
					cardbookRepository.cardbookServerCreatedCardError[aConnection.connPrefId]++;
					cardbookRepository.cardbookUtils.formatStringForOutput("serverCardCreateFailed", [aConnection.connDescription, aCard.fn, aConnection.connUrl, status], "Error");
				}
				cardbookRepository.cardbookServerCreatedCardResponse[aConnection.connPrefId]++;
				cardbookRepository.cardbookServerCardSyncDone[aConnection.connPrefId]++;
			}
		};
		if (cardbookSynchronization.getModifsPushed(aConnection.connPrefId) <= cardbookRepository.cardbookPreferences.getMaxModifsPushed()) {
			let params = {personFields: cardbookRepository.cardbookOAuthData.GOOGLE2.CREATE_PERSON_FIELDS};
			let encodedParams = cardbookRepository.cardbookSynchronization.encodeParams(params);
			aConnection.connUrl = cardbookRepository.cardbookOAuthData.GOOGLE2.CONTACT_URL + ":createContact" + "?" + encodedParams;
			let request = new cardbookWebDAV(aConnection, listener_create, aCard.etag);
			cardbookRepository.cardbookUtils.formatStringForOutput("serverCardSendingCreate", [aConnection.connDescription, aCard.fn]);
			let GoogleContact = cardbookSynchronizationGoogle2.parseCardToGoogleContact(aCard);
			request.postContact2(JSON.stringify(GoogleContact));
		} else {
			cardbookRepository.cardbookServerCardSyncDone[aConnection.connPrefId]++;
			cardbookRepository.cardbookServerCreatedCardResponse[aConnection.connPrefId]++;
			cardbookRepository.cardbookServerNotPushed[aConnection.connPrefId]++;
		}
	},

	serverUpdateCardPhoto: function(aConnection, aCard) {
		var listener_updatephoto = {
			onDAVQueryComplete: async function(status, response, askCertificate) {
				if (status > 199 && status < 400) {
					cardbookRepository.cardbookServerSyncAgain[aConnection.connPrefId] = true;
					let responseJSON = JSON.parse(response);
					let etag = responseJSON.person.metadata.sources[0].etag;
					cardbookRepository.cardbookUtils.formatStringForOutput("serverCardUpdatedOnServerWithEtag", [aConnection.connDescription, aCard.fn, etag]);
					cardbookRepository.cardbookUtils.addEtag(aCard, etag);
					cardbookRepository.cardbookUtils.nullifyTagModification(aCard);
				} else {
					cardbookRepository.cardbookServerUpdatedCardPhotoError[aConnection.connPrefId]++;
					cardbookRepository.cardbookUtils.formatStringForOutput("serverCardUpdateFailed", [aConnection.connDescription, aCard.fn, aConnection.connUrl, status], "Error");
				}
				if (cardbookRepository.cardbookCards[aCard.dirPrefId+"::"+aCard.uid]) {
					var myOldCard = cardbookRepository.cardbookCards[aCard.dirPrefId+"::"+aCard.uid];
					await cardbookRepository.removeCardFromRepository(myOldCard, true);
				}
				await cardbookRepository.addCardToRepository(aCard, true);
				cardbookRepository.cardbookServerUpdatedCardPhotoResponse[aConnection.connPrefId]++;
			}
		};
		if (cardbookSynchronization.getModifsPushed(aConnection.connPrefId) <= cardbookRepository.cardbookPreferences.getMaxModifsPushed()) {
			let params = {personFields: cardbookRepository.cardbookOAuthData.GOOGLE2.UPDATEPHOTO_PERSON_FIELDS};
			let encodedParams = cardbookRepository.cardbookSynchronization.encodeParams(params);
			aConnection.connUrl = aCard.cardurl + ":updateContactPhoto" + "?" + encodedParams;
			let request = new cardbookWebDAV(aConnection, listener_updatephoto);
			cardbookRepository.cardbookUtils.formatStringForOutput("serverCardSendingUpdate", [aConnection.connDescription, aCard.fn]);
			let photo = { "photoBytes": aCard.photo.value };
			request.patchContactPhoto2(JSON.stringify(photo));
		} else {
			cardbookRepository.cardbookServerUpdatedCardPhotoResponse[aConnection.connPrefId]++;
			cardbookRepository.cardbookServerNotPushed[aConnection.connPrefId]++;
		}
	},

	serverDeleteCardPhoto: function(aConnection, aCard) {
		var listener_deletephoto = {
			onDAVQueryComplete: async function(status, response, askCertificate) {
				if (status > 199 && status < 400) {
					cardbookRepository.cardbookServerSyncAgain[aConnection.connPrefId] = true;
					let responseJSON = JSON.parse(response);
					let etag = responseJSON.person.metadata.sources[0].etag;
					cardbookRepository.cardbookUtils.formatStringForOutput("serverCardUpdatedOnServerWithEtag", [aConnection.connDescription, aCard.fn, etag]);
					cardbookRepository.cardbookUtils.addEtag(aCard, etag);
					cardbookRepository.cardbookUtils.nullifyTagModification(aCard);
					if (cardbookRepository.cardbookCards[aCard.dirPrefId+"::"+aCard.uid]) {
						var myOldCard = cardbookRepository.cardbookCards[aCard.dirPrefId+"::"+aCard.uid];
						await cardbookRepository.removeCardFromRepository(myOldCard, true);
					}
					await cardbookRepository.addCardToRepository(aCard, true);
				// normal if contact had no photo
				// } else {
				// 	cardbookRepository.cardbookServerUpdatedCardPhotoError[aConnection.connPrefId]++;
				// 	cardbookRepository.cardbookUtils.formatStringForOutput("serverCardUpdateFailed", [aConnection.connDescription, aCard.fn, aConnection.connUrl, status], "Error");
				}
				cardbookRepository.cardbookServerUpdatedCardPhotoResponse[aConnection.connPrefId]++;
			}
		};
		if (cardbookSynchronization.getModifsPushed(aConnection.connPrefId) <= cardbookRepository.cardbookPreferences.getMaxModifsPushed()) {
			let params = {personFields: cardbookRepository.cardbookOAuthData.GOOGLE2.UPDATEPHOTO_PERSON_FIELDS};
			let encodedParams = cardbookRepository.cardbookSynchronization.encodeParams(params);
			aConnection.connUrl = aCard.cardurl + ":deleteContactPhoto" + "?" + encodedParams;
			let request = new cardbookWebDAV(aConnection, listener_deletephoto);
			cardbookRepository.cardbookUtils.formatStringForOutput("serverCardSendingUpdate", [aConnection.connDescription, aCard.fn]);
			request.delete();
		} else {
			cardbookRepository.cardbookServerUpdatedCardPhotoResponse[aConnection.connPrefId]++;
			cardbookRepository.cardbookServerNotPushed[aConnection.connPrefId]++;
		}
	},

	parseCardToGoogleContact: function (aCard) {
		console.debug(aCard);
		let dateFormat = cardbookRepository.getDateFormat(aCard.dirPrefId, aCard.version);
		let GoogleContact = {};
		// no need for created contacts
		if (cardbookSynchronizationGoogle2.contacts[aCard.dirPrefId][aCard.uid]) {
			GoogleContact.resourceName = "people/" + aCard.uid;
			GoogleContact.etag = cardbookSynchronizationGoogle2.contacts[aCard.dirPrefId][aCard.uid].resourceEtag;
			GoogleContact.metadata = { objectType: "PERSON", sources: [ { etag: aCard.etag, id: aCard.uid, type: "CONTACT" } ] };
		}
		GoogleContact.names = [];                                                          
		let name = {};
		name.displayName = aCard.fn;
		name.unstructuredName = aCard.fn;
		if (aCard.lastname) {
			name.familyName = aCard.lastname;
		}
		if (aCard.firstname) {
			name.givenName = aCard.firstname;
		}
		if (aCard.prefixname) {
			name.honorificPrefix = aCard.prefixname;
		}
		if (aCard.suffixname) {
			name.honorificSuffix = aCard.suffixname;
		}
		if (aCard.othername) {
			name.middleName = aCard.othername;
		}
		GoogleContact.names.push(name);

		if (aCard.note) {
			GoogleContact.biographies = [];
			let biographie = {};
			biographie.value = aCard.note;
			biographie.contentType = "TEXT_PLAIN";
			GoogleContact.biographies.push(biographie);
		}

		if (aCard.nickname) {
			GoogleContact.nicknames = [];
			let nickname = {};
			nickname.value = aCard.nickname;
			GoogleContact.nicknames.push(nickname);
		}

		// if (["F", "M"].includes(aCard.gender)) {
		// 	GoogleContact.genders = [];
		// 	let gender = {};
		// 	if (aCard.gender == "F") {
		// 		gender.value = "female";
		// 	} else if (aCard.gender == "M") {
		// 		gender.value = "male";
		// 	}
		// 	GoogleContact.genders.push(gender);
		// }

		let isDate = cardbookRepository.cardbookDates.convertDateStringToDateUTC(aCard.bday, dateFormat);
		if (isDate != "WRONGDATE") {
			GoogleContact.birthdays = [];
			let birthday = {};
			let dateSplitted = cardbookDates.splitUTCDateIntoComponents(isDate);
			let day = parseInt(dateSplitted.day);
			let month = parseInt(dateSplitted.month);
			if (dateSplitted.year == "1604") {
				birthday.date = {month: month, day: day};
			} else {
				birthday.date = {year: dateSplitted.year, month: month, day: day};
			}
			// birthday.text = dateSplitted.day + "/" + dateSplitted.month + "/" + dateSplitted.year;
			GoogleContact.birthdays.push(birthday);
		}
		
		if (aCard.org || aCard.title) {
			GoogleContact.organizations = [];
			let organization = {};
			let orgArray = cardbookRepository.cardbookUtils.escapeStringSemiColon(aCard.org).split("::")
			if (orgArray[1]) {
				organization.department = cardbookRepository.cardbookUtils.unescapeStringSemiColon(orgArray[1]);
			}
			if (orgArray[0]) {
				organization.name = cardbookRepository.cardbookUtils.unescapeStringSemiColon(orgArray[0]);
			}
			if (aCard.title) {
				organization.title = aCard.title;
			}
			GoogleContact.organizations.push(organization);
		}

		if (aCard.categories.length) {
			GoogleContact.memberships = [];
			for (let category of aCard.categories) {
				let membership = {};
				for (let i in cardbookRepository.cardbookCategories) {
					let myCategory = cardbookRepository.cardbookCategories[i];
					if (myCategory.name == category && myCategory.dirPrefId == aCard.dirPrefId) {
						membership.contactGroupId = myCategory.uid;
						membership.contactGroupResourceName = "contactGroups/" + myCategory.uid;
						break;
					}          
				}
				GoogleContact.memberships.push({contactGroupMembership: membership});
			}
		}
		if (cardbookSynchronizationGoogle2.contacts[aCard.dirPrefId][aCard.uid]) {
			for (let membership of cardbookSynchronizationGoogle2.contacts[aCard.dirPrefId][aCard.uid].memberships) {
				if (!GoogleContact.memberships) {
					GoogleContact.memberships = [];
				}
				if (cardbookSynchronizationGoogle2.skippedLabels[aCard.dirPrefId].includes(membership.contactGroupMembership.contactGroupId)) {
					GoogleContact.memberships.push(membership);
				}
			}
		}

		let resultCustoms = [];
		for (let type of ["personal", "org"]) {
			for (let custom of cardbookRepository.customFields[type]) {
				let customValue = cardbookRepository.cardbookUtils.getCardValueByField(aCard, custom[0], false)[0];
				if (customValue) {
					resultCustoms.push([custom[1], customValue]);
				}
			}
		}
		if (resultCustoms.length) {
			GoogleContact.userDefined = [];
			for (let resultCustom of resultCustoms) {
				let custom = {};
				custom.key = resultCustom[0];
				custom.value = resultCustom[1];
				GoogleContact.userDefined.push(custom);
			}
		}
		
		let resultEvents = [];
		let events = cardbookRepository.cardbookUtils.getEventsFromCard(aCard.note.split("\n"), aCard.others);
		for (let event of events.result) {
			let isDate = cardbookRepository.cardbookDates.convertDateStringToDateUTC(event[0], dateFormat);
			if (isDate != "WRONGDATE") {
				let dateSplitted = cardbookDates.splitUTCDateIntoComponents(isDate);
				resultEvents.push([event[1], dateSplitted]);
			}
		}
		if (resultEvents.length) {
			GoogleContact.events = [];
			for (let resultEvent of resultEvents) {
				let event = {};
				event.type = resultEvent[0];
				event.date = resultEvent[1];
				GoogleContact.events.push(event);
			}
		}
		
		function buildElement(aElement, aLine, aLineValue) {
			let type = aLine[1].filter(type => type.toLowerCase().includes("type=") && type.toLowerCase() != "type=pref");
			if (type.length) {
				aElement.type = type[0].replace(/type=/i, "");
			}
			let pref = aLine[1].filter(type => type.toLowerCase() == "pref=1" || type.toLowerCase() == "pref" || type.toLowerCase() == "type=pref");
			if (pref.length) {
				aElement.metadata = {}
				aElement.metadata.primary = true;
			}
			if (aLineValue) {
				aElement.value = aLineValue;
			}
			return aElement;
		}
		if (aCard.email.length) {
			GoogleContact.emailAddresses = [];
			for (let emailLine of aCard.email) {
				let emailAddress = {};
				emailAddress = buildElement(emailAddress, emailLine, emailLine[0][0]);
				GoogleContact.emailAddresses.push(emailAddress);
			}
		}
		if (aCard.tel.length) {
			GoogleContact.phoneNumbers = [];
			for (let telLine of aCard.tel) {
				let phoneNumber = {};
				phoneNumber = buildElement(phoneNumber, telLine, telLine[0][0]);
				GoogleContact.phoneNumbers.push(phoneNumber);
			}
		}
		if (aCard.url.length) {
			GoogleContact.urls = [];
			for (let urlLine of aCard.url) {
				let url = {};
				url = buildElement(url, urlLine, urlLine[0][0]);
				GoogleContact.urls.push(url);
			}
		}
		if (aCard.adr.length) {
			GoogleContact.addresses = [];
			for (let adrLine of aCard.adr) {
				let address = {};
				address = buildElement(address, adrLine);
				address.poBox = adrLine[0][0];
				address.extendedAddress = adrLine[0][1];
				address.streetAddress = adrLine[0][2];
				address.city = adrLine[0][3];
				address.region = adrLine[0][4];
				address.postalCode = adrLine[0][5];
				let countryCode = cardbookRepository.cardbookUtils.getCountryCodeFromCountryName(adrLine[0][6]);
				if (countryCode.length == 2) {
					address.countryCode = countryCode;
				} else if (countryCode) {
					address.country = countryCode;
				}
				GoogleContact.addresses.push(address);
			}
		}
		if (aCard.impp.length) {
			GoogleContact.imClients = [];
			for (let imppLine of aCard.impp) {
				let imClient = {};
				imClient = buildElement(imClient, imppLine);
				let imppArray = imppLine[0][0].split(":");
				imClient.protocol = imppArray[0];
				imClient.username = imppArray[1];
				GoogleContact.imClients.push(imClient);
			}
		}
		console.debug(GoogleContact);
		return GoogleContact;
	},

	parseGoogleContactToCard: function (aGoogleContact, aDirPrefId) {
		console.debug(aGoogleContact);
		let tmpArray = aGoogleContact.resourceName.split("/");
		let uid = tmpArray[tmpArray.length - 1];
		let href = cardbookRepository.cardbookOAuthData.GOOGLE2.CONTACT_URL + "/" + uid;
		let aCard = new cardbookCardParser("", href, aGoogleContact.etag, aDirPrefId);
		aCard.uid = uid;
		aCard.cardurl = href;
		aCard.etag = aGoogleContact.metadata.sources[0].etag;
		aCard.version = cardbookRepository.cardbookOAuthData.GOOGLE2.VCARD_VERSIONS[0];
		cardbookRepository.cardbookUtils.setCacheURIFromCard(aCard, "GOOGLE2");
		if (aGoogleContact.names && aGoogleContact.names[0]) {
			let name = aGoogleContact.names[0];
			aCard.fn = name.displayName;
			if (name.familyName) {
				aCard.lastname = name.familyName;
			}
			if (name.givenName) {
				aCard.firstname = name.givenName;
			}
			if (name.honorificPrefix) {
				aCard.prefixname = name.honorificPrefix;
			}
			if (name.honorificSuffix) {
				aCard.suffixname = name.honorificSuffix;
			}
			if (name.middleName) {
				aCard.othername = name.middleName;
			}
		}
		if (aGoogleContact.biographies && aGoogleContact.biographies[0]) {
			let biographie = aGoogleContact.biographies[0];
			aCard.note = biographie.value;
		}
		if (aGoogleContact.nicknames && aGoogleContact.nicknames[0]) {
			let nickname = aGoogleContact.nicknames[0];
			aCard.nickname = nickname.value;
		}
		// if (aGoogleContact.genders && aGoogleContact.genders[0]) {
		// 	let gender = aGoogleContact.genders[0];
		// 	if (gender.value == "male") {
		// 		aCard.gender = "M";
		// 	} else if (gender.value == "female") {
		// 		aCard.gender = "F";
		// 	}
		// }
		if (aGoogleContact.birthdays && aGoogleContact.birthdays[0]) {
			let birthday = aGoogleContact.birthdays[0];
			if (birthday.date) {
				let day = cardbookRepository.cardbookDates.lPad(birthday.date.day);
				let month = cardbookRepository.cardbookDates.lPad(birthday.date.month);
				if (birthday.date.year) {
					aCard.bday = cardbookRepository.cardbookDates.getFinalDateString(day, month, birthday.date.year, cardbookRepository.cardbookOAuthData.GOOGLE2.VCARD_VERSIONS[0]);
				} else {
					aCard.bday = cardbookRepository.cardbookDates.getFinalDateString(day, month, "", cardbookRepository.cardbookOAuthData.GOOGLE2.VCARD_VERSIONS[0]);
				}
			}
		}
		if (aGoogleContact.organizations && aGoogleContact.organizations[0]) {
			let organization = aGoogleContact.organizations[0];
			if (organization.name) {
				aCard.org = organization.name;
			}
			if (organization.title) {
				aCard.title = organization.title;
			}
			if (organization.department) {
				aCard.org += ";" + organization.department;
			}
		}
		if (aGoogleContact.memberships) {
			for (let membership of aGoogleContact.memberships) {
				if (membership.contactGroupMembership && membership.contactGroupMembership.contactGroupId) {
					let catId = membership.contactGroupMembership.contactGroupId;
					for (let i in cardbookRepository.cardbookCategories) {
						let myCategory = cardbookRepository.cardbookCategories[i];
						if (myCategory.uid == catId) {
							aCard.categories.push(myCategory.name);
							break;
						}
					}
				}
			}
		}
		if (aGoogleContact.photos) {
			for (let photo of aGoogleContact.photos) {
				if (!photo.url.includes("___________")) {
					let value = photo.url;
					let extension = cardbookRepository.cardbookUtils.getFileNameExtension(value);
					aCard.photo = {types: [], value: "", URI: value, extension: extension};
					break;
				}
			}
		}
		if (aGoogleContact.userDefined) {
			for (let custom of aGoogleContact.userDefined) {
				let found = false;
				for (let customCB of cardbookRepository.customFields.personal) {
					if (customCB[1] == custom.key) {
						cardbookRepository.cardbookUtils.setCardValueByField(aCard, customCB[0], custom.value);
						found = true;
						break;
					}
				}
				if (!found) {
					for (let customCB of cardbookRepository.customFields.org) {
						if (customCB[1] == custom.key) {
							cardbookRepository.cardbookUtils.setCardValueByField(aCard, customCB[0], custom.value);
							found = true;
							break;
						}
					}
				}
				if (!found) {
					let i = 0;
					let condition = true;
					let rootName = "X-GOOGLE";
					while (condition) {
						let newfound = false;
						for (let customCB of cardbookRepository.customFields.personal) {
							if (rootName + i == customCB[0]) {
								newfound = true;
								break;
							}
						}
						if (newfound) {
							i++;
						} else {
							condition = false;
						}
					}
					cardbookRepository.cardbookPreferences.setCustomFields('personal', cardbookRepository.customFields.personal.length, rootName + i + ":" + custom.key);
					cardbookRepository.loadCustoms();
					cardbookRepository.cardbookUtils.setCardValueByField(aCard, rootName + i, custom.value);
				}
			}
		}
		if (aGoogleContact.events) {
			let events = []
			for (let event of aGoogleContact.events) {
				let eventDate = "";
				if (event.date.year && String(event.date.year).length == 4) {
					eventDate = cardbookRepository.cardbookDates.getFinalDateString(String(event.date.day), String(event.date.month), String(event.date.year), cardbookRepository.cardbookOAuthData.GOOGLE2.VCARD_VERSIONS[0]);
				} else {
					eventDate = cardbookRepository.cardbookDates.getFinalDateString(String(event.date.day), String(event.date.month), "", cardbookRepository.cardbookOAuthData.GOOGLE2.VCARD_VERSIONS[0]);
				}
				events.push([eventDate, event.type, (event.metadata && event.metadata.primary == true)]);
			}
			let dateFormat = cardbookRepository.getDateFormat(aCard.dirPrefId, aCard.version);
			let myPGNextNumber = cardbookRepository.cardbookTypes.rebuildAllPGs(aCard);
			cardbookRepository.cardbookUtils.addEventstoCard(aCard, events, myPGNextNumber, dateFormat);
		}
		function buildLine(aElement, aElementName, aValue) {
			let line = [];
			if (aElement.type) {
				let type = "";
				for (let elementType of cardbookRepository.cardbookCoreTypes.GOOGLE2[aElementName]) {
					if (elementType[1] == aElement.type) {
						type = elementType[1];
						break;
					}
				}
				if (type) {
					line = [ aValue, [ "TYPE=" + type ], "", [], "" ];
				} else {
					let myPGNextNumber = cardbookRepository.cardbookTypes.rebuildAllPGs(aCard);
					line = [ aValue, [], "ITEM" + myPGNextNumber, [ "X-ABLABEL:" + aElement.type ], "" ];
				}
			} else {
				line = [ aValue, [], "", [], "" ];
			}
			return line;
		}
		function addPrefToLine(aLine, aElement) {
			if (aElement.metadata && aElement.metadata.primary == true) {
				if (aCard.version == "3.0") {
					aLine[1].push("TYPE=PREF");
				} else {
					aLine[1].push("PREF");
				}
			}
		}
		if (aGoogleContact.emailAddresses) {
			for (let email of aGoogleContact.emailAddresses) {
				let emailLine = buildLine(email, "email", [ email.value ]);
				addPrefToLine(emailLine, email);
				aCard.email.push(emailLine);
			}
		}
		if (aGoogleContact.phoneNumbers) {
			for (let tel of aGoogleContact.phoneNumbers) {
				let telLine = buildLine(tel, "tel", [ tel.value ]);
				addPrefToLine(telLine, tel);
				aCard.tel.push(telLine);
			}
		}
		if (aGoogleContact.urls) {
			for (let url of aGoogleContact.urls) {
				let urlLine = buildLine(url, "url", [ url.value ]);
				addPrefToLine(urlLine, url);
				aCard.url.push(urlLine);
			}
		}
		if (aGoogleContact.addresses) {
			for (let adr of aGoogleContact.addresses) {
				let country = adr.countryCode || adr.country || "";
				let region = adr.region || "";
				let city = adr.city || "";
				let poBox = adr.poBox || "";
				let postalCode = adr.postalCode || "";
				let streetAddress = adr.streetAddress || "";
				let extendedAddress = adr.extendedAddress || "";
				let adrLine = buildLine(adr, "adr", [ poBox, extendedAddress, streetAddress, city, region, postalCode, country ]);
				addPrefToLine(adrLine, adr);
				aCard.adr.push(adrLine);
			}
		}
		if (aGoogleContact.imClients) {
			for (let impp of aGoogleContact.imClients) {
				let serviceLine = [];
				if (impp.protocol) {
					serviceLine = cardbookRepository.cardbookTypes.getIMPPLineForCode(impp.protocol);
				}
				let protocol = serviceLine[2] || impp.protocol;
				let value = impp.username;
				if (protocol) {
					value = protocol + ":" + value;
				}
				let imppLine = [ [ value ], [], "", [], "" ];
				addPrefToLine(imppLine, impp);
				aCard.impp.push(imppLine);
			}
		}
		cardbookRepository.cardbookUtils.setCalculatedFields(aCard);
		console.debug(aCard);
		return aCard;
	},

	
	waitForGoogleSyncFinished: function (aPrefId, aPrefName) {
		// wait 10 s to be sure the category were memorized by Google
		var waitTime = 10000;
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
								cardbookSynchronizationGoogle2.serverMultiGet(cardbookRepository.cardbookServerSyncParams[aPrefId][0], myPrefIdType);
							}
						}
					}
					if (cardbookRepository.cardbookServerSyncHandleRemainingCardDone[aPrefId] == cardbookRepository.cardbookServerSyncHandleRemainingCardTotal[aPrefId]) {
						var request = cardbookSynchronization.getRequest(aPrefId, aPrefName) + cardbookSynchronization.getTotal(aPrefId, aPrefName);
						var response = cardbookSynchronization.getResponse(aPrefId, aPrefName) + cardbookSynchronization.getDone(aPrefId, aPrefName);
						cardbookActions.fetchSyncActivity(aPrefId, cardbookRepository.cardbookServerCardSyncDone[aPrefId], cardbookRepository.cardbookServerCardSyncTotal[aPrefId]);
						if (request == response) {
							let currentConnection = cardbookRepository.cardbookServerSyncParams[aPrefId][0];
							let connection = {connUser: currentConnection.connUser, connPrefId: currentConnection.connPrefId, connUrl: cardbookRepository.cardbookOAuthData.GOOGLE2.REFRESH_REQUEST_URL, connDescription: currentConnection.connDescription};
							cardbookRepository.cardbookServerSyncParams[aPrefId] = [ connection ];
							if (cardbookRepository.cardbookServerSyncParams[aPrefId].length && cardbookRepository.cardbookAccessTokenRequest[aPrefId] == 1 && cardbookRepository.cardbookAccessTokenError[aPrefId] != 1) {
								cardbookRepository.cardbookServerSyncRequest[aPrefId]++;
								cardbookSynchronizationGoogle2.getNewAccessTokenForGooglePeople(connection, cardbookSynchronizationGoogle2.googleSyncContactsInit);
							} else {
								cardbookSynchronization.finishSync(aPrefId, aPrefName, myPrefIdType);
								if (cardbookRepository.cardbookServerSyncAgain[aPrefId] && cardbookSynchronization.getError(aPrefId) == 0) {
									cardbookRepository.cardbookUtils.formatStringForOutput("synchroForcedToResync", [aPrefName]);
									cardbookSynchronization.finishMultipleOperations(aPrefId);
									// to avoid other sync during the wait time
									cardbookRepository.cardbookSyncMode[aPrefId] = 1;
									let { setTimeout } = ChromeUtils.import("resource:///modules/imXPCOMUtils.jsm");
									setTimeout(function() {
											cardbookSynchronization.syncAccount(aPrefId, true);
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
											cardbookSynchronization.syncAccount(myPrefId, false);
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
