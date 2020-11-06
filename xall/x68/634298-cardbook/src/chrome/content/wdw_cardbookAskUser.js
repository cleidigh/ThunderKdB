if ("undefined" == typeof(wdw_cardbookAskUser)) {
	var { Services } = ChromeUtils.import("resource://gre/modules/Services.jsm");
	var { XPCOMUtils } = ChromeUtils.import("resource://gre/modules/XPCOMUtils.jsm");
	XPCOMUtils.defineLazyModuleGetter(this, "cardbookRepository", "chrome://cardbook/content/cardbookRepository.js", "cardbookRepository");

	var myAskUserObserver = {
		register: function() {
			Services.obs.addObserver(this, "cardbook.importConflictChoicePersist", false);
		},
		
		unregister: function() {
			Services.obs.removeObserver(this, "cardbook.importConflictChoicePersist");
		},
		
		observe: function(aSubject, aTopic, aData) {
			switch (aTopic) {
				case "cardbook.importConflictChoicePersist":
					wdw_cardbookAskUser.onChoicePersist();
					break;
			}
		}
	};

	var wdw_cardbookAskUser = {
		load: function () {
			myAskUserObserver.register();
			document.title = cardbookRepository.extension.localeData.localizeMessage("askUserTitle");
			document.getElementById('messageLabel').value = window.arguments[0].message;
			document.getElementById('askUserButton1').label = cardbookRepository.extension.localeData.localizeMessage(window.arguments[0].button1 + "AskUserLabel");
			document.getElementById('askUserButton2').label = cardbookRepository.extension.localeData.localizeMessage(window.arguments[0].button2 + "AskUserLabel");
			if (window.arguments[0].button3) {
				document.getElementById('askUserButton3').label = cardbookRepository.extension.localeData.localizeMessage(window.arguments[0].button3 + "AskUserLabel");
				document.getElementById('askUserButton3').hidden = false;
			} else {
				document.getElementById('askUserButton3').hidden = true;
			}
			if (window.arguments[0].button4) {
				document.getElementById('askUserButton4').label = cardbookRepository.extension.localeData.localizeMessage(window.arguments[0].button4 + "AskUserLabel");
				document.getElementById('askUserButton4').hidden = false;
			} else {
				document.getElementById('askUserButton4').hidden = true;
			}
			if (window.arguments[0].confirmMessage) {
				document.getElementById('confirmCheckBox').label = window.arguments[0].confirmMessage;
				document.getElementById('confirmCheckBox').checked = window.arguments[0].confirmValue;
				document.getElementById('confirmCheckBox').hidden = false;
			} else {
				document.getElementById('confirmCheckBox').hidden = true;
			}
		},

		fireButton: function (aButton) {
			var myButton = aButton.id.replace("askUser", "").toLowerCase();
			window.arguments[0].resultConfirm = document.getElementById('confirmCheckBox').checked;
			window.arguments[0].result = window.arguments[0][myButton];
			wdw_cardbookAskUser.close();
		},

		cancel: function () {
			window.arguments[0].result = "cancel";
			wdw_cardbookAskUser.close();
		},

		onChoicePersist: function () {
			if (cardbookRepository.importConflictChoicePersist) {
				window.arguments[0].resultConfirm = cardbookRepository.importConflictChoicePersist;
				window.arguments[0].result = cardbookRepository.importConflictChoice;
				wdw_cardbookAskUser.close();
			}
		},

		close: function () {
			myAskUserObserver.unregister();
			close();
		}

	};

};
