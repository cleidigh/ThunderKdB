if ("undefined" == typeof(wdw_findDuplicates)) {
	var { Services } = ChromeUtils.import("resource://gre/modules/Services.jsm");
	var { cardbookRepository } = ChromeUtils.import("chrome://cardbook/content/cardbookRepository.js");

	var wdw_findDuplicates = {
		
		gResults: [],
		gResultsDirPrefId: [],
		gHideForgotten: true,
		mergeAllCount: 0,
		mergeAllDone: 0,

		createCssTextBoxRules: function (aStyleSheet, aDirPrefId, aColor, aColorProperty) {
			var ruleString = ".cardbookFindDuplicatesClass input[findDuplicates=color_" + aDirPrefId + "] {-moz-appearance: none !important; " + aColorProperty + ": " + aColor + " !important; border: 1px !important;}";
			var ruleIndex = aStyleSheet.insertRule(ruleString, aStyleSheet.cssRules.length);
		},

		loadCssRules: function () {
			var myStyleSheet = "chrome://cardbook/content/skin/cardbookFindDuplicates.css";
			var myStyleSheetRuleName = "cardbookFindDuplicates";
			for (let styleSheet of InspectorUtils.getAllStyleSheets(window.document, false)) {
				for (let rule of styleSheet.cssRules) {
					// difficult to find as the sheet as no href 
					if (rule.cssText.includes(myStyleSheetRuleName)) {
						cardbookRepository.deleteCssAllRules(styleSheet);
						cardbookRepository.createMarkerRule(styleSheet, myStyleSheetRuleName);
						for (var i = 0; i < wdw_findDuplicates.gResultsDirPrefId.length; i++) {
							var dirPrefId = wdw_findDuplicates.gResultsDirPrefId[i];
							var color = cardbookRepository.cardbookPreferences.getColor(dirPrefId)
							var oppositeColor = cardbookRepository.getTextColorFromBackgroundColor(color);
							if (cardbookRepository.useColor == "text") {
								wdw_findDuplicates.createCssTextBoxRules(styleSheet, dirPrefId, color, "color");
								wdw_findDuplicates.createCssTextBoxRules(styleSheet, dirPrefId, oppositeColor, "background-color");
							} else if (cardbookRepository.useColor == "background") {
								wdw_findDuplicates.createCssTextBoxRules(styleSheet, dirPrefId, color, "background-color");
								wdw_findDuplicates.createCssTextBoxRules(styleSheet, dirPrefId, oppositeColor, "color");
							}
						}
						cardbookRepository.reloadCss(myStyleSheet);
						return;
					}
				}
			}
		},

		generateCardArray: function (aCard) {
			try {
				let myResultTry = [];
				let myResultSure = {id: "", firstname: "", lastname: "", tel: [], email: []};
				for (let field of [ "firstname" , "lastname" ]) {
					if (aCard[field]) {
						myResultTry.push(cardbookRepository.makeSearchStringWithoutNumber(aCard[field]));
						myResultSure[field] = cardbookRepository.makeSearchStringWithoutNumber(aCard[field]);
					}
				}
				for (let emailLine of aCard.email) {
					let email = emailLine[0][0];
					var myCleanEmail = email.replace(/([\\\/\:\*\?\"\'\-\<\>\| ]+)/g, "").replace(/([0123456789]+)/g, "").toUpperCase();
					var myEmailArray = myCleanEmail.split("@");
					var myEmailArray1 = myEmailArray[0].replace(/([^\+]*)(.*)/, "$1").split(".");
					myResultTry = myResultTry.concat(myEmailArray1);
					myResultSure.email.push(email.toUpperCase());
				}
				for (let telLine of aCard.tel) {
					let tel = telLine[0][0];
					tel = cardbookRepository.cardbookUtils.formatTelForSearching(tel);
					myResultSure.tel.push(tel);
				}
				myResultSure.id = aCard.uid;
				myResultTry = cardbookRepository.arrayUnique(myResultTry);
				return {resultTry : myResultTry, resultSure : myResultSure};
			}
			catch (e) {
				cardbookRepository.cardbookLog.updateStatusProgressInformation("wdw_findDuplicates.generateCardArray error : " + e, "Error");
			}
		},

		compareCardArrayTry: function (aArray1, aArray2) {
			try {
				if (aArray1.length == 1) {
					if (aArray2.length != 1) {
						return false;
					} else if (aArray1[0] == aArray2[0]) {
						return true;
					} else {
						return false;
					}
				} else {
					var count = 0;
					for (var i = 0; i < aArray1.length; i++) {
						for (var j = 0; j < aArray2.length; j++) {
							if (aArray1[i] == aArray2[j]) {
								count++;
								break;
							}
						}
						if (count == 2) {
							return true;
						}
					}
				}
				return false;
			}
			catch (e) {
				cardbookRepository.cardbookLog.updateStatusProgressInformation("wdw_findDuplicates.compareCardArrayTry error : " + e, "Error");
			}
		},

		compareCardArraySure: function (aArray1, aArray2) {
			try {
				if (aArray1.lastname && aArray1.firstname && aArray2.lastname && aArray2.firstname) {
					if ((aArray1.lastname == aArray2.lastname && aArray1.firstname == aArray2.firstname) ||
						(aArray1.lastname == aArray2.firstname && aArray1.firstname == aArray2.lastname)) {
						return true;
					}
				}
				for (let field of [ "email" , "tel" ]) {
					for (var i = 0; i < aArray1[field].length; i++) {
						for (var j = 0; j < aArray2[field].length; j++) {
							if (aArray1[field][i] == aArray2[field][j]) {
								return true;
								break;
							}
						}
					}
				}
				return false;
			}
			catch (e) {
				cardbookRepository.cardbookLog.updateStatusProgressInformation("wdw_findDuplicates.compareCardArraySure error : " + e, "Error");
			}
		},

		compareCards: function (aDirPrefId) {
			try {
				let button = document.getElementById('moreOrLessLabel');
				let buttonState = button.getAttribute('state');
				let myCardArray = [];
				wdw_findDuplicates.gResults = [];
				let myTmpResultDirPrefId = [];
				wdw_findDuplicates.gResultsDirPrefId = [];
				if (aDirPrefId) {
					for (let card of cardbookRepository.cardbookDisplayCards[aDirPrefId].cards) {
						if (!card.isAList) {
							myCardArray.push([wdw_findDuplicates.generateCardArray(card), card, true]);
						}
					}
				} else {
					for (let i in cardbookRepository.cardbookCards) {
						var myCard = cardbookRepository.cardbookCards[i];
						if (!myCard.isAList) {
							myCardArray.push([wdw_findDuplicates.generateCardArray(myCard), myCard, true]);
						}
					}
				}
				
				for (var i = 0; i < myCardArray.length-1; i++) {
					var myTmpResult = [myCardArray[i][1]];
					for (var j = i+1; j < myCardArray.length; j++) {
						if (myCardArray[j][2] && wdw_findDuplicates.compareCardArraySure(myCardArray[i][0].resultSure, myCardArray[j][0].resultSure)) {
							myTmpResult.push(myCardArray[j][1]);
							myCardArray[j][2] = false;
						} else if (myCardArray[j][2] && buttonState == "more" && wdw_findDuplicates.compareCardArrayTry(myCardArray[i][0].resultTry, myCardArray[j][0].resultTry)) {
							myTmpResult.push(myCardArray[j][1]);
							myCardArray[j][2] = false;
						}
					}
					if (myTmpResult.length > 1) {
						// necessary to sort for the excluded duplicates
						cardbookRepository.cardbookUtils.sortCardsTreeArrayByString(myTmpResult, "uid", 1);
						wdw_findDuplicates.gResults.push(myTmpResult);
						myTmpResultDirPrefId = myTmpResultDirPrefId.concat(myTmpResult);
					}
				}
				for (var i = 0; i < myTmpResultDirPrefId.length; i++) {
					wdw_findDuplicates.gResultsDirPrefId.push(myTmpResultDirPrefId[i].dirPrefId);
				}
				wdw_findDuplicates.gResultsDirPrefId = cardbookRepository.arrayUnique(wdw_findDuplicates.gResultsDirPrefId);
				if (wdw_findDuplicates.gResultsDirPrefId.length == 1) {
					document.getElementById('mergeAllLabel').hidden = false;
				}

			}
			catch (e) {
				cardbookRepository.cardbookLog.updateStatusProgressInformation("wdw_findDuplicates.compareCards error : " + e, "Error");
			}
		},
		
		mergeOne: async function (aLineNumber, aSourceCat, aTargetCat, aActionId) {
			let myOutCard = new cardbookCardParser();
			myOutCard.dirPrefId = wdw_findDuplicates.gResults[aLineNumber][0].dirPrefId;
			myOutCard.version = wdw_findDuplicates.gResults[aLineNumber][0].version;
			
			for (var j of [ 'photo' ]) {
				var dirname = cardbookRepository.cardbookPreferences.getName(myOutCard.dirPrefId);
				var image = {};
				await cardbookIDBImage.getImage(j, dirname, wdw_findDuplicates.gResults[aLineNumber][0].dirPrefId+"::"+wdw_findDuplicates.gResults[aLineNumber][0].uid, wdw_findDuplicates.gResults[aLineNumber][0].fn)
					.then(imageFound => { image = imageFound })
					.catch( () => {} );
				if (image.content && image.content != "") {
					myOutCard[j].value = image.content;
					myOutCard[j].extension = image.extension;
				} else {
					var out = false;
					for (var k = 1; k < wdw_findDuplicates.gResults[aLineNumber].length; k++) {
						await cardbookIDBImage.getImage(j, dirname, wdw_findDuplicates.gResults[aLineNumber][k].dirPrefId+"::"+wdw_findDuplicates.gResults[aLineNumber][k].uid, wdw_findDuplicates.gResults[aLineNumber][k][j].fn)
							.then(image => {
								myOutCard[j].value = image.content;
								myOutCard[j].extension = image.extension;
								out = true;
							})
							.catch( () => { } );
						if (out == true) {
							break;
						}
					}
				}
			}
			var fields = cardbookRepository.allColumns.display.concat(cardbookRepository.allColumns.personal);
			fields = fields.concat(cardbookRepository.allColumns.org);
			for (let j of fields) {
				myOutCard[j] = wdw_findDuplicates.gResults[aLineNumber][0][j];
				if (!myOutCard[j]) {
					for (let k = 1; k < wdw_findDuplicates.gResults[aLineNumber].length; k++) {
						if (wdw_findDuplicates.gResults[aLineNumber][k][j]) {
							myOutCard[j] = JSON.parse(JSON.stringify(wdw_findDuplicates.gResults[aLineNumber][k][j]));
							break;
						}
					}
				}
			}
			for (let j in cardbookRepository.customFields) {
				for (let k = 0; k < cardbookRepository.customFields[j].length; k++) {
					if (!cardbookRepository.cardbookUtils.getCardValueByField(myOutCard, cardbookRepository.customFields[j][k][0], false).length) {
						for (let l = 1; l < wdw_findDuplicates.gResults[aLineNumber].length; l++) {
							if (cardbookRepository.cardbookUtils.getCardValueByField(wdw_findDuplicates.gResults[aLineNumber][l], cardbookRepository.customFields[j][k][0], false).length) {
								myOutCard.others.push(cardbookRepository.customFields[j][k][0] + ":" + cardbookRepository.cardbookUtils.getCardValueByField(wdw_findDuplicates.gResults[aLineNumber][l], cardbookRepository.customFields[j][k][0], false)[0]);
								break;
							}
						}
					}
				}
			}
			for (let j of cardbookRepository.allColumns.categories) {
				myOutCard[j] = JSON.parse(JSON.stringify(wdw_findDuplicates.gResults[aLineNumber][0][j]));
				for (let k = 1; k < wdw_findDuplicates.gResults[aLineNumber].length; k++) {
					myOutCard[j] = myOutCard[j].concat(wdw_findDuplicates.gResults[aLineNumber][k][j]);
				}
				myOutCard[j] = cardbookRepository.arrayUnique(myOutCard[j]);
			}
			for (let j of cardbookRepository.multilineFields) {
				myOutCard[j] = JSON.parse(JSON.stringify(wdw_findDuplicates.gResults[aLineNumber][0][j]));
				for (let k = 1; k < wdw_findDuplicates.gResults[aLineNumber].length; k++) {
					myOutCard[j] = myOutCard[j].concat(wdw_findDuplicates.gResults[aLineNumber][k][j]);
				}
				for (var k=0; k<myOutCard[j].length; ++k) {
					for (var l=k+1; l<myOutCard[j].length; ++l) {
						if (j == "tel" && cardbookRepository.cardbookUtils.formatTelForSearching(myOutCard[j][k][0][0]) == cardbookRepository.cardbookUtils.formatTelForSearching(myOutCard[j][l][0][0])) {
							myOutCard[j].splice(l--, 1);
						} else if (j != "tel" && myOutCard[j][k][0][0] == myOutCard[j][l][0][0]) {
							myOutCard[j].splice(l--, 1);
						}
					}
				}
			}
			for (let j of [ 'event' ]) {
				for (let k = 0; k < wdw_findDuplicates.gResults[aLineNumber].length; k++) {
					let myEvents = cardbookRepository.cardbookUtils.getEventsFromCard(wdw_findDuplicates.gResults[aLineNumber][k].note.split("\n"), wdw_findDuplicates.gResults[aLineNumber][k].others);
					let dateFormat = cardbookRepository.getDateFormat(wdw_findDuplicates.gResults[aLineNumber][k].dirPrefId, wdw_findDuplicates.gResults[aLineNumber][k].version);
					let myPGNextNumber = cardbookRepository.cardbookTypes.rebuildAllPGs(myOutCard);
					cardbookRepository.cardbookUtils.addEventstoCard(myOutCard, myEvents.result, myPGNextNumber, dateFormat);
				}
				// to do array unique
			}
			for (let j of cardbookRepository.allColumns.note) {
				myOutCard[j] = wdw_findDuplicates.gResults[aLineNumber][0][j];
				if (!myOutCard[j]) {
					for (let k = 1; k < wdw_findDuplicates.gResults[aLineNumber].length; k++) {
						if (wdw_findDuplicates.gResults[aLineNumber][k][j]) {
							myOutCard[j] = JSON.parse(JSON.stringify(wdw_findDuplicates.gResults[aLineNumber][k][j]));
							break;
						}
					}
				}
			}

			for (let card of wdw_findDuplicates.gResults[aLineNumber]) {
				let newCard = new cardbookCardParser();
				cardbookRepository.cardbookUtils.cloneCard(card, newCard);
				cardbookRepository.addCategoryToCard(newCard, aSourceCat);
				await cardbookRepository.saveCardFromUpdate(card, newCard, aActionId, true);
			}
			cardbookRepository.addCategoryToCard(myOutCard, aTargetCat);
			await cardbookRepository.saveCardFromUpdate({}, myOutCard, aActionId, true);
			wdw_findDuplicates.finishMergeAllIdAction(aLineNumber, aActionId);
		},
		
		mergeAll: function () {
			let now = cardbookRepository.cardbookLog.getTime();
			let sourceCat = now + "_" + cardbookRepository.extension.localeData.localizeMessage("sourceCategoryLabel")
			let targetCat = now + "_" + cardbookRepository.extension.localeData.localizeMessage("targetCategoryLabel")
			wdw_findDuplicates.mergeAllCount = wdw_findDuplicates.finishAction();
			let myTopic = "cardsMerged";
			let myActionId = cardbookActions.startAction(myTopic);
			var i = 0;
			document.getElementById('recordsHbox').hidden = true;
			document.getElementById('mergeAllVbox').hidden = false;
			Services.tm.currentThread.dispatch({ run: function() {
				while (document.getElementById(i + 'Row')) {
					let row = document.getElementById(i + 'Row');
					if (row.getAttribute('delete') == 'true') {
						i++;
						continue;
					} else if (wdw_findDuplicates.gHideForgotten && row.getAttribute('forget') == 'true') {
						i++;
						continue;
					}
					
					Services.tm.currentThread.dispatch(wdw_findDuplicates.mergeOne(i, sourceCat, targetCat, myActionId), Components.interfaces.nsIEventTarget.DISPATCH_SYNC);
					i++;
				}
			}}, Components.interfaces.nsIEventTarget.DISPATCH_NORMAL);
		},

		createRow: function (aParent, aName, aHidden) {
			var aRow = document.createXULElement('row');
			aParent.appendChild(aRow);
			aRow.setAttribute('id', aName + 'Row');
			aRow.setAttribute('align', 'center');
			aRow.setAttribute('flex', '1');
			aRow.setAttribute('forget', aHidden.toString());
			if (wdw_findDuplicates.gHideForgotten && aRow.getAttribute('forget') == 'true') {
				aRow.hidden = true;
			} else {
				aRow.hidden = false;
			}
			// dirty hack to have the lines not shrinked on Linux only with blue.css
			aRow.setAttribute('style', 'min-height:36px;');
			return aRow
		},

		createTextbox: function (aRow, aName, aValue, aDirPrefId) {
			var aTextbox = document.createElementNS("http://www.w3.org/1999/xhtml","html:input");
			aRow.appendChild(aTextbox);
			aTextbox.setAttribute('id', aName);
			aTextbox.setAttribute('value', aValue);
			aTextbox.setAttribute("findDuplicates", "color_" + aDirPrefId);
		},

		createMergeButton: function (aRow, aName, aLabel) {
			var aButton = document.createXULElement('button');
			aRow.appendChild(aButton);
			aButton.setAttribute('id', aName + 'Merge');
			aButton.setAttribute('label', aLabel);
			aButton.setAttribute('flex', '1');
			async function fireButton(event) {
				var myId = this.id.replace(/Merge$/, "");
				var myArgs = {cardsIn: wdw_findDuplicates.gResults[myId], cardsOut: [], hideCreate: false, action: ""};
				var myWindow = Services.wm.getMostRecentWindow("mail:3pane").openDialog("chrome://cardbook/content/mergeCards/wdw_mergeCards.xhtml", "", cardbookRepository.modalWindowParams, myArgs);
				var myTopic = "cardsMerged";
				var myActionId = cardbookActions.startAction(myTopic);
				switch (myArgs.action) {
					case "CREATEANDREPLACE":
						await cardbookRepository.deleteCards(myArgs.cardsIn, myActionId);
					case "CREATE":
						await cardbookRepository.saveCardFromUpdate({}, myArgs.cardsOut[0], myActionId, true);
						wdw_findDuplicates.finishMergeAction(myId);
						break;
				}
				cardbookActions.endAction(myActionId);
			};
			aButton.addEventListener("click", fireButton, false);
			aButton.addEventListener("input", fireButton, false);
		},


		finishMergeAllIdAction: function (aId, aActionId) {
			wdw_findDuplicates.finishMergeAction(aId);
			wdw_findDuplicates.mergeAllDone++;
			let value = Math.round(wdw_findDuplicates.mergeAllDone / wdw_findDuplicates.mergeAllCount * 100);
			document.getElementById("mergeAll-progressmeter").value = value;
			if (wdw_findDuplicates.mergeAllDone == wdw_findDuplicates.mergeAllCount) {
				wdw_findDuplicates.finishMergeAllAction(aActionId);
			}
		},

		finishMergeAllAction: function (aActionId) {
			cardbookActions.endAction(aActionId);
			wdw_findDuplicates.cancel();
		},

		finishMergeAction: function (aId) {
			// wdw_findDuplicates.gResults.splice(aId, 1);
			document.getElementById(aId + 'Row').hidden = true;
			document.getElementById(aId + 'Row').setAttribute('delete', 'true');
			wdw_findDuplicates.finishAction();
		},

		createForgetButton: function (aRow, aName, aLabel) {
			var aButton = document.createXULElement('button');
			aRow.appendChild(aButton);
			aButton.setAttribute('id', aName + 'Forget');
			aButton.setAttribute('label', aLabel);
			aButton.setAttribute('flex', '1');
			function fireButton(event) {
				var myId = this.id.replace(/Forget$/, "");
				cardbookDuplicate.updateDuplicate(wdw_findDuplicates.gResults[myId]);
				wdw_findDuplicates.finishForgetAction(myId);
			};
			aButton.addEventListener("click", fireButton, false);
			aButton.addEventListener("input", fireButton, false);
		},

		finishForgetAction: function (aId) {
			document.getElementById(aId + 'Row').setAttribute('forget', 'true');
			if (wdw_findDuplicates.gHideForgotten) {
				document.getElementById(aId + 'Row').hidden = true;
			}
			document.getElementById(aId + 'Forget').hidden = true;
			wdw_findDuplicates.finishAction();
		},

		createDeleteButton: function (aRow, aName, aLabel) {
			var aButton = document.createXULElement('button');
			aRow.appendChild(aButton);
			aButton.setAttribute('id', aName + 'Delete');
			aButton.setAttribute('label', aLabel);
			aButton.setAttribute('flex', '1');
			function fireButton(event) {
				var myId = this.id.replace(/Delete$/, "");
				if (wdw_cardbook.deleteCardsAndValidate(wdw_findDuplicates.gResults[myId])) {
					wdw_findDuplicates.finishDeleteAction(myId);
				}
			};
			aButton.addEventListener("click", fireButton, false);
			aButton.addEventListener("input", fireButton, false);
		},

		finishDeleteAction: function (aId) {
			// wdw_findDuplicates.gResults.splice(aId, 1);
			document.getElementById(aId + 'Row').hidden = true;
			document.getElementById(aId + 'Row').setAttribute('delete', 'true');
			wdw_findDuplicates.finishAction();
		},

		finishAction: function () {
			var i = 0;
			var myShownCount = 0;
			while (document.getElementById(i + 'Row')) {
				let myRow = document.getElementById(i + 'Row');
				if (!(myRow.getAttribute('delete') == 'true')) {
					if (!(wdw_findDuplicates.gHideForgotten && myRow.getAttribute('forget') == 'true')) {
						myShownCount++;
					}
				}
				i++;
			}
			wdw_findDuplicates.showLabels(myShownCount);
			return myShownCount;
		},

		displayResults: async function () {
			cardbookElementTools.deleteRows('fieldsVbox');
			var aListRows = document.getElementById('fieldsVbox');
			var buttonMergeLabel = cardbookRepository.extension.localeData.localizeMessage("mergeCardsLabel");
			var buttonForgetLabel = cardbookRepository.extension.localeData.localizeMessage("forgetCardsLabel");
			var buttonDeleteLabel = cardbookRepository.extension.localeData.localizeMessage("deleteCardsLabel");

			var myShownCount = 0;
			for (var i = 0; i < wdw_findDuplicates.gResults.length; i++) {
				var shouldBeForgotten = false;
				for (var j = 0; j < wdw_findDuplicates.gResults[i].length-1; j++) {
					var myCard = wdw_findDuplicates.gResults[i][j];
					if (cardbookRepository.cardbookDuplicateIndex[myCard.uid]) {
						for (var k = j+1; k < wdw_findDuplicates.gResults[i].length; k++) {
							if (cardbookRepository.cardbookDuplicateIndex[myCard.uid].includes(wdw_findDuplicates.gResults[i][k].uid)) {
								shouldBeForgotten = true;
								break;
							}
						}
					}
					if (shouldBeForgotten) {
						break;
					}
				}
				var aRow = wdw_findDuplicates.createRow(aListRows, i, shouldBeForgotten);
				for (var j = 0; j < wdw_findDuplicates.gResults[i].length; j++) {
					var myCard = wdw_findDuplicates.gResults[i][j];
					wdw_findDuplicates.createTextbox(aRow, i+"::"+j, myCard.fn, myCard.dirPrefId);
				}
				await wdw_findDuplicates.createMergeButton(aRow, i, buttonMergeLabel);
				if (!shouldBeForgotten) {
					wdw_findDuplicates.createForgetButton(aRow, i, buttonForgetLabel);
					myShownCount++;
				}
				wdw_findDuplicates.createDeleteButton(aRow, i, buttonDeleteLabel);
			}
			wdw_findDuplicates.showLabels(myShownCount);
		},

		showLabels: function (aCount) {
			if (aCount == 0) {
				document.getElementById('noContactsFoundDesc').value = cardbookRepository.extension.localeData.localizeMessage("noContactsDuplicated");
				document.getElementById('noContactsFoundDesc').hidden = false;
				document.getElementById('numberContactsFoundDesc').hidden = true;
			} else {
				document.getElementById('noContactsFoundDesc').hidden = true;
				document.getElementById('numberContactsFoundDesc').value = cardbookRepository.extension.localeData.localizeMessage("numberLines", [aCount]);
				document.getElementById('numberContactsFoundDesc').hidden = false;
			}
			if (wdw_findDuplicates.gHideForgotten) {
				document.getElementById('hideOrShowForgottenLabel').setAttribute('label', cardbookRepository.extension.localeData.localizeMessage("showForgottenLabel"));
				document.getElementById('hideOrShowForgottenLabel').setAttribute('accesskey', cardbookRepository.extension.localeData.localizeMessage("showForgottenAccesskey"));
			} else {
				document.getElementById('hideOrShowForgottenLabel').setAttribute('label', cardbookRepository.extension.localeData.localizeMessage("hideForgottenLabel"));
				document.getElementById('hideOrShowForgottenLabel').setAttribute('accesskey', cardbookRepository.extension.localeData.localizeMessage("hideForgottenAccesskey"));
			}				
		},

		hideOrShowForgotten: function () {
			wdw_findDuplicates.gHideForgotten = !wdw_findDuplicates.gHideForgotten;
			var i = 0;
			var myShownCount = 0;
			while (true) {
				if (document.getElementById(i + 'Row')) {
					var myRow = document.getElementById(i + 'Row');
					if (myRow.getAttribute('delete') == 'true') {
						myRow.hidden = true;
					} else if (wdw_findDuplicates.gHideForgotten && myRow.getAttribute('forget') == 'true') {
						myRow.hidden = true;
					} else {
						myRow.hidden = false;
						myShownCount++;
					}
					i++;
				} else {
					break;
				}
			}
			wdw_findDuplicates.showLabels(myShownCount);
		},

		moreOrLess: function () {
			let button = document.getElementById('moreOrLessLabel');
			let buttonState = button.getAttribute('state');
			let newState = "less";
			if (buttonState == "less") {
				newState = "more";
			}
			button.setAttribute('label' , cardbookRepository.extension.localeData.localizeMessage(buttonState + "EditionLabel"));
			button.setAttribute('accesskey' , cardbookRepository.extension.localeData.localizeMessage(buttonState + "EditionAccesskey"));
			button.setAttribute('state' , newState);
			wdw_findDuplicates.load();
		},

		preload: function () {
			cardbookDuplicate.loadDuplicate();
		},

		load: async function () {
			i18n.updateDocument({ extension: cardbookRepository.extension });
			wdw_findDuplicates.compareCards(window.arguments[0].dirPrefId);
			wdw_findDuplicates.loadCssRules();
			await wdw_findDuplicates.displayResults();
		},

		cancel: function () {
			cardbookRepository.cardbookDuplicateIndex = {};
			close();
		}

	};

};
