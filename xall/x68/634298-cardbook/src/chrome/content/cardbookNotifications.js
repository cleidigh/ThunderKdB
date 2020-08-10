if ("undefined" == typeof(cardbookNotifications)) {
	var { Services } = ChromeUtils.import("resource://gre/modules/Services.jsm");
	var { ConversionHelper } = ChromeUtils.import("chrome://cardbook/content/api/ConversionHelper/ConversionHelper.jsm");
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
						var myReason = ConversionHelper.i18n.getMessage(aReasonCode, aValueArray);
					} else {
						var myReason = ConversionHelper.i18n.getMessage(aReasonCode);
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
