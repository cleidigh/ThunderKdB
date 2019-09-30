if ("undefined" == typeof(ovl_birthdays)) {
	var { AddonManager } = ChromeUtils.import("resource://gre/modules/AddonManager.jsm");
	var { Services } = ChromeUtils.import("resource://gre/modules/Services.jsm");
	var { XPCOMUtils } = ChromeUtils.import("resource://gre/modules/XPCOMUtils.jsm");
	XPCOMUtils.defineLazyModuleGetter(this, "cardbookRepository", "chrome://cardbook/content/cardbookRepository.js", "cardbookRepository");

	var ovl_birthdays = {
		lTimerPopup : null,
		lPopupShowed : 0,
		lEventTimerPopup : { notify: function(lTimerPopup) {
			if (cardbookPreferences.getBoolPref("extensions.cardbook.showPeriodicPopup")) {
				var popupTime = cardbookPreferences.getStringPref("extensions.cardbook.periodicPopupIime");
				var dateOfToday = new Date();
				var dateOfTodayHour = (dateOfToday.getHours()<10?'0':'') + dateOfToday.getHours();
				var dateOfTodayMin = (dateOfToday.getMinutes()<10?'0':'') + dateOfToday.getMinutes();
				var checkTime = dateOfTodayHour.toString() + dateOfTodayMin.toString();
		
				var EmptyParamRegExp1 = new RegExp("(.*)([^0-9])(.*)", "ig");
				if (popupTime.replace(EmptyParamRegExp1, "$1")!=popupTime) {
					var checkPopupHour = popupTime.replace(EmptyParamRegExp1, "$1");
					var checkPopupMin = popupTime.replace(EmptyParamRegExp1, "$3");
					if (checkPopupHour < 10 && checkPopupHour.length == 1) {
						checkPopupHour = "0" + checkPopupHour;
					}
					if (checkPopupMin < 10 && checkPopupMin.length == 1) {
						checkPopupMin = "0" + checkPopupMin;
					}
					var checkPopupTime = checkPopupHour.toString() + checkPopupMin.toString();
				}
				
				if ((checkTime == checkPopupTime) && (ovl_birthdays.lPopupShowed == 0)) {
					ovl_birthdays.lPopupShowed++;
					ovl_birthdays.onShowPopup();
				} else if ((ovl_birthdays.lPopupShowed > 0) && (ovl_birthdays.lPopupShowed < 8)) {
					ovl_birthdays.lPopupShowed++;
				} else {
					ovl_birthdays.lPopupShowed=0;
				}
			}
		} },
	
		onLoad: function() {
			if (cardbookPreferences.getBoolPref("extensions.cardbook.showPopupOnStartup")) {
				ovl_birthdays.onShowPopup();
			}
			
			if (cardbookPreferences.getBoolPref("extensions.cardbook.syncWithLightningOnStartup")) {
				AddonManager.getAddonByID(cardbookRepository.LIGHTNING_ID).then(addon => {
					ovl_birthdays.displaySyncListAddon(addon);
				});
			}
		},
	
		displayBirthdayList: function() {
			if (cardbookRepository.cardbookBirthdayPopup == 0) {
				cardbookRepository.cardbookBirthdayPopup++;
				var MyWindows = window.openDialog("chrome://cardbook/content/birthdays/wdw_birthdayList.xul", "", cardbookRepository.modalWindowParams);
				cardbookRepository.cardbookBirthdayPopup--;
			}
		},
	
		displaySyncListAddon: function(addon) {
			if (addon && addon.isActive) {
				cardbookBirthdaysUtils.syncWithLightning();
			}
		},
	
		displaySyncList: function() {
			var MyWindows = window.openDialog("chrome://cardbook/content/birthdays/wdw_birthdaySync.xul", "", cardbookRepository.modalWindowParams);
		},
	
		onShowPopup: function() {
			var maxDaysUntilNextBirthday = cardbookPreferences.getStringPref("extensions.cardbook.numberOfDaysForSearching");
			cardbookBirthdaysUtils.loadBirthdays(maxDaysUntilNextBirthday);
			var lshowPopupEvenIfNoBirthday = cardbookPreferences.getBoolPref("extensions.cardbook.showPopupEvenIfNoBirthday");
			if ((cardbookBirthdaysUtils.lBirthdayList.length>0) || lshowPopupEvenIfNoBirthday) {
				ovl_birthdays.displayBirthdayList();
			}
		}
	};
	
	ovl_birthdays.lTimerPopup = Components.classes["@mozilla.org/timer;1"].createInstance(Components.interfaces.nsITimer);
	ovl_birthdays.lTimerPopup.initWithCallback(ovl_birthdays.lEventTimerPopup, 10000, Components.interfaces.nsITimer.TYPE_REPEATING_SLACK);
}
