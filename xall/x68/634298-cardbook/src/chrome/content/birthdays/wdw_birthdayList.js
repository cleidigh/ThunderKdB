if ("undefined" == typeof(wdw_birthdayList)) {
	var { MailServices } = ChromeUtils.import("resource:///modules/MailServices.jsm");
	var { Services } = ChromeUtils.import("resource://gre/modules/Services.jsm");
	var { XPCOMUtils } = ChromeUtils.import("resource://gre/modules/XPCOMUtils.jsm");
	XPCOMUtils.defineLazyModuleGetter(this, "cardbookRepository", "chrome://cardbook/content/cardbookRepository.js", "cardbookRepository");

	var wdw_birthdayList = {
		
		sortTrees: function (aEvent) {
			wdw_birthdayList.buttonShowing();
			if (aEvent.button != 0) {
				return;
			}
		},

		birthdayListTreeContextShowing: function () {
			if (cardbookWindowUtils.displayColumnsPicker()) {
				wdw_birthdayList.birthdayListTreeContextShowingNext();
				return true;
			} else {
				return false;
			}
		},

		birthdayListTreeContextShowingNext: function () {
			var menuSend = document.getElementById("sendEmail");
			var myTree = document.getElementById("birthdayListTree");
			if (myTree.view.selection.getRangeCount() > 0) {
				menuSend.disabled = false;
			} else {
				menuSend.disabled = true;
			}
		},

		setupWindow: function () {
			document.getElementById('syncLightningMenuItemLabel').disabled = false;
		},
	
		loadCssRules: function () {
			var myStyleSheet = "chrome://cardbook/content/skin/cardbookBirthday.css";
			var myStyleSheetRuleName = "cardbookBirthday";
			for (let styleSheet of InspectorUtils.getAllStyleSheets(window.document, false)) {
				for (let rule of styleSheet.cssRules) {
					// difficult to find as the sheet as no href 
					if (rule.cssText.includes(myStyleSheetRuleName)) {
						cardbookRepository.deleteCssAllRules(styleSheet);
						cardbookRepository.createMarkerRule(styleSheet, myStyleSheetRuleName);
						var createSearchRules = 0;
						for (var i in cardbookBirthdaysUtils.lBirthdayAccountList) {
							createSearchRules++;
						}
						for (var i in cardbookBirthdaysUtils.lBirthdayAccountList) {
							var dirPrefId = i;
							var color = cardbookRepository.cardbookPreferences.getColor(dirPrefId)
							if (createSearchRules > 1) {
								cardbookRepository.createCssCardRules(styleSheet, dirPrefId, color);
							}
						}
						cardbookRepository.reloadCss(myStyleSheet);
						return;
					}
				}
			}
		},

		displayAllBirthdays: function () {
			i18n.updateDocument({ extension: cardbookRepository.extension });
			wdw_birthdayList.setupWindow();
			
			var maxDaysUntilNextBirthday = cardbookRepository.cardbookPreferences.getStringPref("extensions.cardbook.numberOfDaysForSearching");
			cardbookBirthdaysUtils.loadBirthdays(maxDaysUntilNextBirthday);
			cardbookRepository.cardbookUtils.sortArrayByNumber(cardbookBirthdaysUtils.lBirthdayList,0,1);
			wdw_birthdayList.loadCssRules();

			// if there are no birthdays in the configured timespan
			if (cardbookBirthdaysUtils.lBirthdayList.length == 0) {
				var today = new Date();
				today = new Date(today.getTime() + maxDaysUntilNextBirthday *24*60*60*1000);
				var noBirthdaysFoundMessage = cardbookRepository.extension.localeData.localizeMessage("noBirthdaysFoundMessage", [cardbookRepository.cardbookDates.convertDateToDateString(today, 'YYYYMMDD')]);
				var treeView = {
					rowCount : 1,
					getCellText : function(row,column){
						if (column.id == "daysleft") return noBirthdaysFoundMessage;
					}
				}
			} else {
				var treeView = {
					rowCount: cardbookBirthdaysUtils.lBirthdayList.length,
					isContainer: function(row) { return false },
					cycleHeader: function(row) { return false },
					getRowProperties: function(row) {
						return "SEARCH color_" + cardbookBirthdaysUtils.lBirthdayList[row][6];
					},
					getCellProperties: function(row, column) {
						return this.getRowProperties(row);
					},
					getCellText: function(row, column){
						if (column.id == "daysleft") return cardbookBirthdaysUtils.lBirthdayList[row][0];
						else if (column.id == "name") return cardbookBirthdaysUtils.lBirthdayList[row][1];
						else if (column.id == "age") return cardbookBirthdaysUtils.lBirthdayList[row][2];
						else if (column.id == "dateofbirth") return cardbookRepository.cardbookDates.getFormattedDateForDateString(cardbookBirthdaysUtils.lBirthdayList[row][3], cardbookBirthdaysUtils.lBirthdayList[row][7], cardbookRepository.dateDisplayedFormat);
						else if (column.id == "dateofbirthfound") return cardbookBirthdaysUtils.lBirthdayList[row][4];
						else if (column.id == "email") return cardbookBirthdaysUtils.lBirthdayList[row][5];
						else return cardbookBirthdaysUtils.lBirthdayList[row][5];
					}
				}
			}
			document.getElementById('birthdayListTree').view = treeView;
			document.title=cardbookRepository.extension.localeData.localizeMessage("birthdaysListWindowLabel", [cardbookBirthdaysUtils.lBirthdayList.length.toString()]);
			wdw_birthdayList.buttonShowing();
		},
	
		displaySyncList: function() {
			Services.wm.getMostRecentWindow("mail:3pane").openDialog("chrome://cardbook/content/birthdays/wdw_birthdaySync.xhtml", "", cardbookRepository.modalWindowParams);
		},

		buttonShowing: function () {
			var btnSend = document.getElementById("sendEmailLabel");
			var myTree = document.getElementById("birthdayListTree");
			if (myTree.view.selection.getRangeCount() > 0) {
				btnSend.disabled = false;
			} else {
				btnSend.disabled = true;
			}
		},

		sendEmail: function () {
			var myTree = document.getElementById('birthdayListTree');
			var numRanges = myTree.view.selection.getRangeCount();
			var start = new Object();
			var end = new Object();

			for (var i = 0; i < numRanges; i++) {
				myTree.view.selection.getRangeAt(i,start,end);
				for (var k = start.value; k <= end.value; k++){
					var myEmail = myTree.view.getCellText(k, myTree.columns.getNamedColumn('email'));
					var myName = myTree.view.getCellText(k, myTree.columns.getNamedColumn('name'));
					if (myEmail == "") {
						var errorTitle = cardbookRepository.extension.localeData.localizeMessage("warningTitle");
						var errorMsg = cardbookRepository.extension.localeData.localizeMessage("noEmailFoundMessage", [myName]);
						Services.prompt.alert(null, errorTitle, errorMsg);
					} else {
						var msgComposeType = Components.interfaces.nsIMsgCompType;
						var msgComposFormat = Components.interfaces.nsIMsgCompFormat;
						var msgComposeService = MailServices.compose;
						var params = Components.classes["@mozilla.org/messengercompose/composeparams;1"].createInstance(Components.interfaces.nsIMsgComposeParams);
						
						msgComposeService = msgComposeService.QueryInterface(Components.interfaces.nsIMsgComposeService);
						if (params) {
							params.type = msgComposeType.New;
							params.format = msgComposFormat.Default;
							var composeFields = Components.classes["@mozilla.org/messengercompose/composefields;1"].createInstance(Components.interfaces.nsIMsgCompFields);
							if (composeFields) {
								composeFields.to = myEmail;
								params.composeFields = composeFields;
								msgComposeService.OpenComposeWindowWithParams(null, params);
							}
						}
					}
				}
			}
		},
	
		do_close: function () {
			close();
		}
	};
};
