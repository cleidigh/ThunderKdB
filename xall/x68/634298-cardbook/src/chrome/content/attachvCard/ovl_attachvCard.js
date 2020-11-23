if ("undefined" == typeof(ovl_attachvCard)) {
	var { Services } = ChromeUtils.import("resource://gre/modules/Services.jsm");
	var { cardbookRepository } = ChromeUtils.import("chrome://cardbook/content/cardbookRepository.js");

	var ovl_attachvCard = {
		
		attachvCard: function () {
			var selected = document.getElementById("msgIdentity").selectedItem;
			var key = selected.getAttribute("identitykey");
			var result = [];
			result = cardbookRepository.cardbookPreferences.getAllVCards();
			for (var i = 0; i < result.length; i++) {
				var resultArray = result[i];
				if (resultArray[0] == "true") {
					if (resultArray[1] == key || resultArray[1] == "allMailAccounts") {
						var myFilename = resultArray[4];
						if (cardbookRepository.cardbookCards[resultArray[2]+"::"+resultArray[3]]) {
							var myCard = cardbookRepository.cardbookCards[resultArray[2]+"::"+resultArray[3]];
							var attachment = Components.classes["@mozilla.org/messengercompose/attachment;1"].createInstance(Components.interfaces.nsIMsgAttachment);
							attachment.contentType = "text/vcard";
							attachment.name = myFilename;
							var myFile = cardbookRepository.cardbookUtils.getTempFile();
							myFile.append("cardbook-send-messages");
							myFile.append(myFilename);
							if (myFile.exists() && myFile.isFile()) {
								try {
									myFile.remove(true);
								} catch(e) {
									cardbookRepository.cardbookUtils.formatStringForOutput("errorAttachingFile", [myFile.path, e], "Error");
									return;
								}
							}
							cardbookRepository.cardbookUtils.writeContentToFile(myFile.path, cardbookRepository.cardbookUtils.getvCardForEmail(myCard), "UTF8");
							if (myFile.exists() && myFile.isFile()) {
								attachment.url = "file:///" + myFile.path;
								gMsgCompose.compFields.addAttachment(attachment);
							} else {
								cardbookRepository.cardbookUtils.formatStringForOutput("errorAttachingFile", [myFile.path], "Error");
							}
						}
					}
				}
			}
		}
	};
};
