if ("undefined" == typeof(ovl_attachvCard)) {
	var { Services } = ChromeUtils.import("resource://gre/modules/Services.jsm");
	var { XPCOMUtils } = ChromeUtils.import("resource://gre/modules/XPCOMUtils.jsm");
	XPCOMUtils.defineLazyModuleGetter(this, "cardbookRepository", "chrome://cardbook/content/cardbookRepository.js", "cardbookRepository");

	var ovl_attachvCard = {
		
		attachvCard: function () {
			var selected = document.getElementById("msgIdentity").selectedItem;
			var key = selected.getAttribute("identitykey");
			var result = [];
			result = cardbookPreferences.getAllVCards();
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
							var myFile = cardbookUtils.getTempFile();
							myFile.append("cardbook-send-messages");
							myFile.append(myFilename);
							if (myFile.exists() && myFile.isFile()) {
								try {
									myFile.remove(true);
								} catch(e) {
									cardbookUtils.formatStringForOutput("errorAttachingFile", [myFile.path, e], "Error");
									return;
								}
							}
							cardbookSynchronization.writeContentToFile(myFile.path, cardbookUtils.getvCardForEmail(myCard), "UTF8");
							if (myFile.exists() && myFile.isFile()) {
								attachment.url = "file:///" + myFile.path;
								gMsgCompose.compFields.addAttachment(attachment);
								// test
								// test gMsgCompose.compFields.attachVCard = true;
							} else {
								cardbookUtils.formatStringForOutput("errorAttachingFile", [myFile.path], "Error");
							}
						}
					}
				}
			}
		}
	};
};

window.addEventListener("compose-send-message", function(e) { ovl_attachvCard.attachvCard(e); }, true);
