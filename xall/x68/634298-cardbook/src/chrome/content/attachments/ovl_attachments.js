if ("undefined" == typeof(ovl_attachments)) {
	var { Services } = ChromeUtils.import("resource://gre/modules/Services.jsm");
	var { XPCOMUtils } = ChromeUtils.import("resource://gre/modules/XPCOMUtils.jsm");
	XPCOMUtils.defineLazyModuleGetter(this, "cardbookRepository", "chrome://cardbook/content/cardbookRepository.js", "cardbookRepository");

	var ovl_attachments = {
		
		setCardBookMenus: function (aValue) {
			document.getElementById('attachments1CardBookImport').disabled = aValue;
			document.getElementById('attachments2CardBookImport').disabled = aValue;
			document.getElementById('attachment1CardBookImport').disabled = aValue;
			document.getElementById('attachment2CardBookImport').disabled = aValue;
			if (!aValue) {
				cardbookWindowUtils.addToCardBookMenuSubMenu('attachments1CardBookImportPopup', ovl_cardbookMailContacts.getIdentityKey(), ovl_attachments.importFileIntoCardBook);
				cardbookWindowUtils.addToCardBookMenuSubMenu('attachments2CardBookImportPopup', ovl_cardbookMailContacts.getIdentityKey(), ovl_attachments.importFileIntoCardBook);
				cardbookWindowUtils.addToCardBookMenuSubMenu('attachment1CardBookImportPopup', ovl_cardbookMailContacts.getIdentityKey(), ovl_attachments.importFileIntoCardBook);
				cardbookWindowUtils.addToCardBookMenuSubMenu('attachment2CardBookImportPopup', ovl_cardbookMailContacts.getIdentityKey(), ovl_attachments.importFileIntoCardBook);
			}
		},

		displayCardBookMenu: function() {
			var disabled = true;
			var attachmentList = document.getElementById('attachmentList');
			var selectedAttachments = attachmentList.selectedItems;
			if (selectedAttachments.length == 0) {
				for (var i = 0; i < currentAttachments.length; i++) {
					var attachment = currentAttachments[i];
					var myFileArray = attachment.name.split(".");
					var myExtension =  myFileArray[myFileArray.length-1];
					if (myExtension.toLowerCase() == "vcf") {
						disabled = false;
						break;
					}
				}
			} else {
				for (var i = 0; i < selectedAttachments.length; i++) {
					var attachment = selectedAttachments[i].attachment;
					var myFileArray = attachment.name.split(".");
					var myExtension =  myFileArray[myFileArray.length-1];
					if (myExtension.toLowerCase() == "vcf") {
						disabled = false;
						break;
					}
				}
			}
			ovl_attachments.setCardBookMenus(disabled);
		},

		loadAttachment: function(aAttachment, aDirPrefId) {
			var myFileArray = aAttachment.name.split(".");
			var myExtension =  myFileArray[myFileArray.length-1];
			if (myExtension.toLowerCase() == "vcf") {
				var myFile = Services.dirsvc.get("TmpD", Components.interfaces.nsIFile);
				var myUuid = cardbookRepository.cardbookUtils.getUUID();
				var myFileName = myUuid + ".vcf";
				myFile.append(myFileName);
				var listener_loadFile = {
					mFile : myFile,
					myDirPrefId : aDirPrefId,
					OnStartRunningUrl: function (aUrl) {
						cardbookRepository.cardbookLog.updateStatusProgressInformationWithDebug2("debug mode : start downloading attachment…");
					},
					OnStopRunningUrl: function (aUrl, aStatus) {
						if (aStatus == 0) {
							cardbookRepository.cardbookLog.updateStatusProgressInformationWithDebug2("debug mode : attachment successfully downloaded");
							var myTopic = "cardsImportedFromFile";
							var myActionId = cardbookActions.startAction(myTopic, [this.mFile.leafName]);
							cardbookRepository.cardbookSynchronization.loadFile(this.mFile, this.myDirPrefId, this.myDirPrefId, "WINDOW", "IMPORTFILE", myActionId);
							cardbookActions.endAsyncAction(myActionId);
						} else {
							cardbookRepository.cardbookLog.updateStatusProgressInformationWithDebug2("debug mode : attachment not successfully downloaded, status : " + aStatus);
						}
					}
				};
				messenger.saveAttachmentToFile(myFile, aAttachment.url, aAttachment.uri, aAttachment.contentType, listener_loadFile);
			}
		},

		importFileIntoCardBook: function(aDirPrefId) {
			var attachmentList = document.getElementById('attachmentList');
			var selectedAttachments = attachmentList.selectedItems;
			if (selectedAttachments.length == 0) {
				for (var i = 0; i < currentAttachments.length; i++) {
					ovl_attachments.loadAttachment(currentAttachments[i], aDirPrefId);                                           
				}
			} else {
				for (var i = 0; i < selectedAttachments.length; i++) {
					ovl_attachments.loadAttachment(selectedAttachments[i].attachment, aDirPrefId);                               
				}
			}
		}
	};
};

// for the displaying or not import into CardBook for all attachments
// onShowSaveAttachmentMenuMultiple
(function() {
	// Keep a reference to the original function.
	var _original = onShowSaveAttachmentMenuMultiple;
	
	// Override a function.
	onShowSaveAttachmentMenuMultiple = function() {
		
		// Execute original function.
		var rv = _original.apply(null, arguments);
		ovl_attachments.displayCardBookMenu();
		
		// return the original result
		return rv;
	};

})();

// for the displaying or not import into CardBook for one attachment
// onShowSaveAttachmentMenuSingle
(function() {
	// Keep a reference to the original function.
	var _original = onShowSaveAttachmentMenuSingle;
	
	// Override a function.
	onShowSaveAttachmentMenuSingle = function() {
		
		// Execute original function.
		var rv = _original.apply(null, arguments);
		ovl_attachments.displayCardBookMenu();
		
		// return the original result
		return rv;
	};

})();

// for the displaying or not import into CardBook for all attachments
// goUpdateAttachmentCommands
(function() {
	// Keep a reference to the original function.
	var _original = goUpdateAttachmentCommands;
	
	// Override a function.
	goUpdateAttachmentCommands = function() {
		
		// Execute original function.
		var rv = _original.apply(null, arguments);
		ovl_attachments.displayCardBookMenu();
		
		// return the original result
		return rv;
	};

})();

// for the displaying or not import into CardBook for one attachment
// onShowAttachmentItemContextMenu
(function() {
	// Keep a reference to the original function.
	var _original = onShowAttachmentItemContextMenu;
	
	// Override a function.
	onShowAttachmentItemContextMenu = function() {
		
		// Execute original function.
		var rv = _original.apply(null, arguments);
		ovl_attachments.displayCardBookMenu();
		
		// return the original result
		return rv;
	};

})();
