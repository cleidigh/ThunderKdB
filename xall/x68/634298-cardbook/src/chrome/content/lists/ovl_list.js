if ("undefined" == typeof(ovl_list)) {
	var ovl_list = {
		expandRecipientsFromCardBook: function () {
			var myFields = window.gMsgCompose.compFields;
			var listToCollect = ["to", "cc", "bcc", "followupTo"];
			for (var i = 0; i < listToCollect.length; i++) {
				if (myFields[listToCollect[i]]) {
					if (myFields[listToCollect[i]]) {
						var myConversion = new cardbookListConversion(myFields[listToCollect[i]], window.gMsgCompose.identity.key);
						myFields[listToCollect[i]] = cardbookRepository.arrayUnique(myConversion.emailResult).join(", ");
					}
				}
			}
		}
	};
};

// expandRecipients
(function() {
	// Keep a reference to the original function.
	var _original = expandRecipients;
	
	// Override a function.
	expandRecipients = function() {
		// Execute original function.
		var rv = _original.apply(null, arguments);
		
		// Execute some action afterwards.
		ovl_list.expandRecipientsFromCardBook();

		// return the original result
		return rv;
	};

})();

// updateSendLock
(function() {
	// Keep a reference to the original function.
	var _original = updateSendLock;
	
	// Override a function.
	updateSendLock = function() {
		// Execute original function.
		// var rv = _original.apply(null, arguments);
		
		// Execute some action afterwards.
		// if (!gSendLocked) {
		// 	let inputValue = awGetInputElement(row).value.trim();
		// 	ovl_list.mailListNameExistsInCardBook(inputValue.replace(/ *<.*>/, ""));
		// }
		//
		// return the original result
		gSendLocked = false;
		// return rv;
	};

})();

