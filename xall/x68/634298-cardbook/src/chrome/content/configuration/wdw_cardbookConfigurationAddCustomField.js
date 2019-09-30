if ("undefined" == typeof(wdw_cardbookConfigurationAddCustomField)) {
	var { Services } = ChromeUtils.import("resource://gre/modules/Services.jsm");
	var { XPCOMUtils } = ChromeUtils.import("resource://gre/modules/XPCOMUtils.jsm");
	XPCOMUtils.defineLazyModuleGetter(this, "cardbookRepository", "chrome://cardbook/content/cardbookRepository.js", "cardbookRepository");

	var CardBookConfigAddCustomNotification = {};
	XPCOMUtils.defineLazyGetter(CardBookConfigAddCustomNotification, "errorNotifications", () => {
		return new MozElements.NotificationBox(element => {
			element.setAttribute("flex", "1");
			document.getElementById("errorNotificationsHbox").append(element);
		});
	});

	var wdw_cardbookConfigurationAddCustomField = {
		
		customFieldCheck: function (aTextBox) {
			var myValue = aTextBox.value.trim();
			if (myValue == "") {
				aTextBox.value = "X-";
			} else {
				aTextBox.value = myValue.toUpperCase();
			}
		},

		validateCustomValues: function () {
			var myValue = document.getElementById('customFieldCodeTextBox').value;
			var myValidationList = JSON.parse(JSON.stringify(window.arguments[0].validationList));
			function filterOriginal(element) {
				return (element != myValue);
			}
			myValidationList = myValidationList.filter(filterOriginal);
			if (myValidationList.length != window.arguments[0].validationList.length) {
				cardbookNotifications.setNotification(CardBookConfigAddCustomNotification.errorNotifications, "customFieldsErrorUNIQUE");
				return false;
			} else if (myValue.toUpperCase() !== myValue) {
				cardbookNotifications.setNotification(CardBookConfigAddCustomNotification.errorNotifications, "customFieldsErrorUPPERCASE", [myValue]);
				return false;
			} else if (!(myValue.toUpperCase().startsWith("X-"))) {
				cardbookNotifications.setNotification(CardBookConfigAddCustomNotification.errorNotifications, "customFieldsErrorX", [myValue]);
				return false;
			} else if (cardbookRepository.notAllowedCustoms.indexOf(myValue.toUpperCase()) != -1) {
				cardbookNotifications.setNotification(CardBookConfigAddCustomNotification.errorNotifications, "customFieldsErrorFIELD", [myValue]);
				return false;
			} else if (myValue.includes(":") || myValue.includes(",") || myValue.includes(";") || myValue.includes(".")) {
				cardbookNotifications.setNotification(CardBookConfigAddCustomNotification.errorNotifications, "customFieldsErrorCHAR", [myValue]);
				return false;
			} else {
				cardbookNotifications.setNotification(CardBookConfigAddCustomNotification.errorNotifications, "OK");
				return true;
			}
		},

		validate: function() {
			var fieldCode = document.getElementById("customFieldCodeTextBox").value;
			var fieldLabel = document.getElementById("customFieldLabelTextBox").value;
			var btnSave = document.getElementById("saveEditionLabel");
			if (fieldCode != "" && fieldLabel != "") {
				btnSave.disabled = false;
				return wdw_cardbookConfigurationAddCustomField.validateCustomValues();
			} else {
				btnSave.disabled = true;
				cardbookNotifications.setNotification(CardBookConfigAddCustomNotification.errorNotifications, "OK");
				return false;
			}
		},

		load: function () {
			document.getElementById('customFieldCodeTextBox').value = window.arguments[0].code;
			document.getElementById('customFieldLabelTextBox').value = window.arguments[0].label;
			document.getElementById('customFieldCodeTextBox').focus();
			wdw_cardbookConfigurationAddCustomField.customFieldCheck(document.getElementById('customFieldCodeTextBox'));
			wdw_cardbookConfigurationAddCustomField.validate();
		},

		save: function () {
			if (wdw_cardbookConfigurationAddCustomField.validate()) {
				window.arguments[0].code = document.getElementById('customFieldCodeTextBox').value.trim();
				window.arguments[0].label = document.getElementById('customFieldLabelTextBox').value.trim();
				window.arguments[0].typeAction="SAVE";
				close();
			}
		},

		cancel: function () {
			window.arguments[0].typeAction="CANCEL";
			close();
		}

	};

};

window.addEventListener("popupshowing", cardbookRichContext.loadRichContext, true);
