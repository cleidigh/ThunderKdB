if ("undefined" == typeof(cardbookActions)) {
	var { Services } = ChromeUtils.import("resource://gre/modules/Services.jsm");
	var { XPCOMUtils } = ChromeUtils.import("resource://gre/modules/XPCOMUtils.jsm");
	XPCOMUtils.defineLazyModuleGetter(this, "cardbookRepository", "chrome://cardbook/content/cardbookRepository.js", "cardbookRepository");

	var loader = Services.scriptloader;
	loader.loadSubScript("chrome://cardbook/content/preferences/cardbookPreferences.js", this);

	var EXPORTED_SYMBOLS = ["cardbookActions"];
	var cardbookActions = {

		mainContext: "CardBook",
		cryptoCount: 0,
		cryptoDone: 0,
		cryptoActivity: {},
		syncActivity: {},
		lTimerActionAll: {},

		setUndoAndRedoMenuAndButton: function () {
			var myCurrentUndoId = cardbookRepository.currentUndoId;
			cardbookIndexedDB.setUndoAndRedoMenuAndButton("menu_undo", "cardbookToolbarBackButton", myCurrentUndoId);
			myCurrentUndoId++;
			cardbookIndexedDB.setUndoAndRedoMenuAndButton("menu_redo", "cardbookToolbarForwardButton", myCurrentUndoId);
		},

		saveCurrentUndoId: function () {
			cardbookPreferences.setStringPref("extensions.cardbook.currentUndoId", cardbookRepository.currentUndoId);
		},

		addUndoCardsAction: function (aActionCode, aActionMessage, aOldCards, aNewCards) {
			var myNextUndoId = cardbookRepository.currentUndoId + 1;
			cardbookIndexedDB.addUndoItem(myNextUndoId, aActionCode, aActionMessage, aOldCards, aNewCards, false);
		},

		undo: function () {
			cardbookIndexedDB.executeUndoItem();
		},

		redo: function () {
			cardbookIndexedDB.executeRedoItem();
		},

		initProcess: function(aProcessName, aContextDisplayText, aContextType, aIcon) {
			var gActivityManager = Components.classes["@mozilla.org/activity-manager;1"].getService(Components.interfaces.nsIActivityManager);
			var process = Components.classes["@mozilla.org/activity-process;1"].createInstance(Components.interfaces.nsIActivityProcess);
			process.init(aProcessName, "CardBook");
			process.iconClass = aIcon;
			process.groupingStyle = Components.interfaces.nsIActivity.GROUPING_STYLE_BYCONTEXT;
			process.contextDisplayText = aContextDisplayText;
			process.contextType = aContextType;
			gActivityManager.addActivity(process);
			return process;
		},

		finishProcess: function(aProcess) {
			var gActivityManager = Components.classes["@mozilla.org/activity-manager;1"].getService(Components.interfaces.nsIActivityManager);
			if (gActivityManager.containsActivity(aProcess.id)) {
				aProcess.state = Components.interfaces.nsIActivityProcess.STATE_COMPLETED;
				gActivityManager.removeActivity(aProcess.id);
			}
		},

		addEvent: function(aEventName, aIcon) {
			var gActivityManager = Components.classes["@mozilla.org/activity-manager;1"].getService(Components.interfaces.nsIActivityManager);
			var event = Components.classes["@mozilla.org/activity-event;1"].createInstance(Components.interfaces.nsIActivityEvent);
			event.init(aEventName, null, "", null, Date.now());
			event.iconClass = aIcon;
			gActivityManager.addActivity(event);
			return event;
		},

		initSyncActivity: function(aDirPrefId, aDirPrefName) {
			var processName = cardbookRepository.strBundle.formatStringFromName("synchroRunning", [aDirPrefName], 1);
			var process = cardbookActions.initProcess(processName, aDirPrefName, aDirPrefId, 'syncMail');
			if (!cardbookActions.syncActivity[aDirPrefId]) {
				cardbookActions.syncActivity[aDirPrefId] = {};
			}
			cardbookActions.syncActivity[aDirPrefId].syncProcess = process;
		},

		fetchSyncActivity: function(aDirPrefId, aCountDone, aCountTotal) {
			if (cardbookActions.syncActivity[aDirPrefId] && cardbookActions.syncActivity[aDirPrefId].syncProcess) {
				var processMessage = cardbookRepository.strBundle.formatStringFromName("synchroProcessed", [aCountDone, aCountTotal], 2);
				cardbookActions.syncActivity[aDirPrefId].syncProcess.setProgress(processMessage, aCountDone, aCountTotal);
			}
		},

		finishSyncActivity: function(aDirPrefId) {
			if (cardbookActions.syncActivity[aDirPrefId] && cardbookActions.syncActivity[aDirPrefId].syncProcess) {
				cardbookActions.finishProcess(cardbookActions.syncActivity[aDirPrefId].syncProcess);
			}
		},

		finishSyncActivityOK: function(aDirPrefId, aDirPrefName) {
			cardbookActions.finishSyncActivity(aDirPrefId);
			if (cardbookActions.syncActivity[aDirPrefId].syncEvent) {
				var gActivityManager = Components.classes["@mozilla.org/activity-manager;1"].getService(Components.interfaces.nsIActivityManager);
				if (gActivityManager.containsActivity(cardbookActions.syncActivity[aDirPrefId].syncEvent.id)) {
					gActivityManager.removeActivity(cardbookActions.syncActivity[aDirPrefId].syncEvent.id);
				}
			}
			var eventName = cardbookRepository.strBundle.formatStringFromName("synchroFinished", [aDirPrefName], 1);
			var event = cardbookActions.addEvent(eventName, "syncMail");
			cardbookActions.syncActivity[aDirPrefId].syncEvent = event;
		},

		initCryptoActivity: function(aMode) {
			cardbookActions.cryptoDone = 0;
			cardbookActions.cryptoCount = 0;
			var processName = cardbookRepository.strBundle.GetStringFromName(aMode + "Started");
			var processTitle = cardbookRepository.strBundle.GetStringFromName("cardbookTitle");
			var process = cardbookActions.initProcess(processName, processTitle, cardbookActions.mainContext, "editItem");
			if (!cardbookActions.cryptoActivity[cardbookActions.mainContext]) {
				cardbookActions.cryptoActivity[cardbookActions.mainContext] = {};
			}
			cardbookActions.cryptoActivity[cardbookActions.mainContext].syncProcess = process;
		},

		fetchCryptoCount: function(aCountTotal) {
			cardbookActions.cryptoCount = cardbookActions.cryptoCount + aCountTotal;
		},

		fetchCryptoActivity: function(aMode) {
			cardbookActions.cryptoDone++;
			if (cardbookActions.cryptoActivity[cardbookActions.mainContext] && cardbookActions.cryptoActivity[cardbookActions.mainContext].syncProcess) {
				var processMessage = cardbookRepository.strBundle.formatStringFromName(aMode + "Processed", [cardbookActions.cryptoDone, cardbookActions.cryptoCount], 2);
				cardbookActions.cryptoActivity[cardbookActions.mainContext].syncProcess.setProgress(processMessage, cardbookActions.cryptoDone, cardbookActions.cryptoCount);
			}
			if (cardbookActions.cryptoDone == cardbookActions.cryptoCount) {
				cardbookActions.finishCryptoActivityOK(aMode);
			}
		},

		finishCryptoActivity: function() {
			if (cardbookActions.cryptoActivity[cardbookActions.mainContext] && cardbookActions.cryptoActivity[cardbookActions.mainContext].syncProcess) {
				cardbookActions.finishProcess(cardbookActions.cryptoActivity[cardbookActions.mainContext].syncProcess);
			}
		},

		finishCryptoActivityOK: function(aMode) {
			cardbookActions.finishCryptoActivity();
			if (cardbookActions.cryptoActivity[cardbookActions.mainContext].syncEvent) {
				var gActivityManager = Components.classes["@mozilla.org/activity-manager;1"].getService(Components.interfaces.nsIActivityManager);
				if (gActivityManager.containsActivity(cardbookActions.cryptoActivity[cardbookActions.mainContext].syncEvent.id)) {
					gActivityManager.removeActivity(cardbookActions.cryptoActivity[cardbookActions.mainContext].syncEvent.id);
				}
			}
			var eventName = cardbookRepository.strBundle.GetStringFromName(aMode + "Finished");
			var event = cardbookActions.addEvent(eventName, "syncMail");
			cardbookActions.cryptoActivity[cardbookActions.mainContext].syncEvent = event;
		},

		addActivity: function(aMessageCode, aArray, aIcon) {
			var eventName = cardbookRepository.strBundle.formatStringFromName(aMessageCode, aArray, aArray.length);
			cardbookActions.addEvent(eventName, aIcon);
		},
			
		addActivityFromUndo: function(aActionId) {
			if (cardbookRepository.currentAction[aActionId]) {
				var eventName = cardbookRepository.currentAction[aActionId].message;
				var iconClass = "";
				switch(cardbookRepository.currentAction[aActionId].actionCode) {
					case "cardsConverted":
					case "cardsMerged":
					case "cardsDuplicated":
					case "displayNameGenerated":
					case "cardModified":
					case "categoryRenamed":
					case "categoryConvertedToList":
					case "listConvertedToCategory":
					case "nodeRenamed":
					case "listCreatedFromNode":
						iconClass = "editItem";
						break;
					case "outgoingEmailCollected":
					case "emailCollectedByFilter":
					case "emailDeletedByFilter":
					case "cardsImportedFromFile":
					case "cardsImportedFromDir":
					case "cardCreated":
					case "categoryCreated":
					case "categorySelected":
						iconClass = "addItem";
						break;
					case "cardsPasted":
					case "cardsDragged":
					case "linePasted":
						iconClass = "moveMail";
						break;
					case "undoActionDone":
					case "redoActionDone":
						iconClass = "undo";
						break;
					case "categoryUnselected":
					case "categoryDeleted":
					case "cardsDeleted":
					case "nodeDeleted":
						iconClass = "deleteMail";
						break;
				}
				cardbookActions.addEvent(eventName, iconClass);
			}
		},
			
		addUndoMessage: function(aActionId, aArray) {
			if (cardbookRepository.currentAction[aActionId]) {
				var myActionCode = cardbookRepository.currentAction[aActionId].actionCode;
				switch(myActionCode) {
					case "cardsConverted":
					case "outgoingEmailCollected":
					case "emailCollectedByFilter":
					case "emailDeletedByFilter":
					case "cardsMerged":
					case "cardsDuplicated":
					case "cardsPasted":
					case "cardsDragged":
					case "displayNameGenerated":
					case "linePasted":
						cardbookRepository.currentAction[aActionId].message = cardbookRepository.strBundle.GetStringFromName(myActionCode + 'Undo');
						break;
					case "cardsImportedFromFile":
					case "cardsImportedFromDir":
					case "undoActionDone":
					case "redoActionDone":
					case "cardCreated":
					case "cardModified":
					case "categoryCreated":
					case "categoryRenamed":
					case "categorySelected":
					case "categoryUnselected":
					case "categoryDeleted":
					case "categoryConvertedToList":
					case "listConvertedToCategory":
					case "nodeRenamed":
					case "nodeDeleted":
					case "listCreatedFromNode":
						cardbookRepository.currentAction[aActionId].message = cardbookRepository.strBundle.formatStringFromName(myActionCode + 'Undo', aArray, aArray.length);
						break;
					case "cardsDeleted":
						if (aArray && aArray.length == 1) {
							cardbookRepository.currentAction[aActionId].message = cardbookRepository.strBundle.formatStringFromName(myActionCode + '1' + 'Undo', [aArray[0].fn], 1);
						} else {
							cardbookRepository.currentAction[aActionId].message = cardbookRepository.strBundle.GetStringFromName(myActionCode + '2' + 'Undo');
						}
						break;
				}
			}
		},

		startAction: function (aActionCode, aArray, aRefreshAccount) {
			cardbookRepository.currentActionId++;
			if (!cardbookRepository.currentAction[cardbookRepository.currentActionId]) {
				cardbookRepository.currentAction[cardbookRepository.currentActionId] = {actionCode : aActionCode, message : "", oldCards: [], newCards: [], total: 0, done: 0, files: [], refresh: ""};
			}
			if (aRefreshAccount) {
				cardbookRepository.currentAction[cardbookRepository.currentActionId].refresh = aRefreshAccount;
			}
			cardbookActions.addUndoMessage(cardbookRepository.currentActionId, aArray);
			return cardbookRepository.currentActionId;
		},

		endAsyncAction: function (aActionId) {
			if (cardbookRepository.currentAction[aActionId]) {
				cardbookActions.lTimerActionAll[aActionId] = Components.classes["@mozilla.org/timer;1"].createInstance(Components.interfaces.nsITimer);
				var lTimerActions = cardbookActions.lTimerActionAll[aActionId];
				lTimerActions.initWithCallback({ notify: function(lTimerActions) {
					var myAction = cardbookRepository.currentAction[aActionId];
					if (myAction.total == myAction.done) {
						cardbookActions.endAction(aActionId);
						lTimerActions.cancel();
					}
				}
				}, 1000, Components.interfaces.nsITimer.TYPE_REPEATING_SLACK);
			}
		},

		endAction: function (aActionId, aForceRefresh) {
			if (cardbookRepository.currentAction[aActionId]) {
				var myAction = cardbookRepository.currentAction[aActionId];
				if (myAction.files.length > 0) {
					cardbookActions.addActivityFromUndo(aActionId);
					if (myAction.actionCode != "undoActionDone" && myAction.actionCode != "redoActionDone") {
						cardbookActions.addUndoCardsAction(myAction.actionCode, myAction.message, myAction.oldCards, myAction.newCards);
					}
					if (myAction.refresh != "") {
						cardbookUtils.notifyObservers(myAction.actionCode, "force::" + myAction.refresh);
					} else {
						cardbookUtils.notifyObservers(myAction.actionCode);
					}
					cardbookRepository.reWriteFiles(myAction.files);
					if (cardbookPreferences.getBoolPref("extensions.cardbook.syncAfterChange")) {
						cardbookSynchronization.syncAccounts(myAction.files);
					}
				} else if (aForceRefresh == true) {
					cardbookUtils.notifyObservers(myAction.actionCode, "force::" + myAction.refresh);
				}
			}
		}

	};
};
