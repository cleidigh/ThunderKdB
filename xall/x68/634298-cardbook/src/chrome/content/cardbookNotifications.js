if ("undefined" == typeof(cardbookNotifications)) {
	var { Services } = ChromeUtils.import("resource://gre/modules/Services.jsm");
	var { cardbookRepository } = ChromeUtils.import("chrome://cardbook/content/cardbookRepository.js");

	var cardbookNotifications = {
		setNotification: function(aNotificationBox, aReasonCode, aValueArray, aPriority) {
			if (aReasonCode == "OK") {
				aNotificationBox.removeAllNotifications();
			} else {
				var aNotificationCode = aReasonCode;
				if (aValueArray && aValueArray.length > 0) {
					aNotificationCode = aNotificationCode + aValueArray.join("_");
				}
				var existingBox = aNotificationBox.getNotificationWithValue(aNotificationCode);
				if (!existingBox) {
					aNotificationBox.removeAllNotifications();
					if (aValueArray && aValueArray.length > 0) {
						var myReason = cardbookRepository.extension.localeData.localizeMessage(aReasonCode, aValueArray);
					} else {
						var myReason = cardbookRepository.extension.localeData.localizeMessage(aReasonCode);
					}
					if (aPriority) {
						var myPriority = aNotificationBox[aPriority];
					} else {
						var myPriority = aNotificationBox.PRIORITY_WARNING_MEDIUM;
					}
					aNotificationBox.appendNotification(myReason, aNotificationCode, null, myPriority, null);
					aNotificationBox.getNotificationWithValue(aNotificationCode).setAttribute("hideclose", "true");
				}
			}
		}

	};
};
