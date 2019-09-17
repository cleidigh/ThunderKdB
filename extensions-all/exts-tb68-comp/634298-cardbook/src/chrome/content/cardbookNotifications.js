if ("undefined" == typeof(cardbookNotifications)) {
	var { Services } = ChromeUtils.import("resource://gre/modules/Services.jsm");
	var { XPCOMUtils } = ChromeUtils.import("resource://gre/modules/XPCOMUtils.jsm");
	XPCOMUtils.defineLazyModuleGetter(this, "cardbookRepository", "chrome://cardbook/content/cardbookRepository.js", "cardbookRepository");

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
						var myReason = cardbookRepository.strBundle.formatStringFromName(aReasonCode, aValueArray, aValueArray.length);
					} else {
						var myReason = cardbookRepository.strBundle.GetStringFromName(aReasonCode);
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
