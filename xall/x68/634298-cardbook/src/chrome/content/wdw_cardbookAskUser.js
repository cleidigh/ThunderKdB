if ("undefined" == typeof(wdw_cardbookAskUser)) {
	var { Services } = ChromeUtils.import("resource://gre/modules/Services.jsm");
	var { cardbookRepository } = ChromeUtils.import("chrome://cardbook/content/cardbookRepository.js");

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
					wdw_cardbookAskUser.onChoicePersist(aData);
					break;
			}
		}
	};

	var wdw_cardbookAskUser = {
		choice: [],

		load: function () {
			myAskUserObserver.register();
			document.title = cardbookRepository.extension.localeData.localizeMessage(window.arguments[0].type + "AskUserTitle");
			document.getElementById('messageLabel').value = window.arguments[0].message;
			document.getElementById('askUserButton1').label = cardbookRepository.extension.localeData.localizeMessage(window.arguments[0].type + window.arguments[0].button1 + "AskUserLabel");
			wdw_cardbookAskUser.choice.push(window.arguments[0].button1);
			document.getElementById('askUserButton2').label = cardbookRepository.extension.localeData.localizeMessage(window.arguments[0].type + window.arguments[0].button2 + "AskUserLabel");
			wdw_cardbookAskUser.choice.push(window.arguments[0].button2);
			if (window.arguments[0].button3) {
				document.getElementById('askUserButton3').label = cardbookRepository.extension.localeData.localizeMessage(window.arguments[0].type + window.arguments[0].button3 + "AskUserLabel");
				document.getElementById('askUserButton3').hidden = false;
				wdw_cardbookAskUser.choice.push(window.arguments[0].button3);
			} else {
				document.getElementById('askUserButton3').hidden = true;
			}
			if (window.arguments[0].button4) {
				document.getElementById('askUserButton4').label = cardbookRepository.extension.localeData.localizeMessage(window.arguments[0].type + window.arguments[0].button4 + "AskUserLabel");
				document.getElementById('askUserButton4').hidden = false;
				wdw_cardbookAskUser.choice.push(window.arguments[0].button4);
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
			let choice = wdw_cardbookAskUser.choice.join("::");
			if (cardbookRepository.importConflictChoicePersist[window.arguments[0].dirPrefId] &&
				cardbookRepository.importConflictChoicePersist[window.arguments[0].dirPrefId][choice] &&
				cardbookRepository.importConflictChoicePersist[window.arguments[0].dirPrefId][choice] == true) {
				window.arguments[0].resultConfirm = cardbookRepository.importConflictChoicePersist[window.arguments[0].dirPrefId][choice];
				window.arguments[0].result = cardbookRepository.importConflictChoice[window.arguments[0].dirPrefId][choice];
				wdw_cardbookAskUser.close();
			}
		},

		close: function () {
			myAskUserObserver.unregister();
			close();
		}

	};

};
