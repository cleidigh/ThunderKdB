Components.utils.import("resource:///modules/gloda/mimemsg.js");

var gStripAttachments = {

	init : function() {
		window.removeEventListener("load", gStripAttachments.init, false);
		var mailSession = Components.classes["@mozilla.org/messenger/services/session;1"]
			.getService(Components.interfaces.nsIMsgMailSession);
		var nsIFolderListener = Components.interfaces.nsIFolderListener;
		var notifyFlags = nsIFolderListener.added;
		mailSession.AddFolderListener(gStripAttachments.folderListener, notifyFlags);
		gStripAttachments.resetCheckbox();
		window.addEventListener("compose-send-message", gStripAttachments.onSend, true ); 
		window.addEventListener("compose-window-reopen", gStripAttachments.resetCheckbox, true);
		if (attachExtraToolsObject.prefs.getPrefType("mailnews.message_warning_size") == 0) {
			document.getElementById("AETmaxSize").collapsed = true;
			document.getElementById("AETmaxSize").previousSibling.collapsed = true;
		}
	},

	resetCheckbox : function() {
		document.getElementById("AETdeleteOnSend").checked = false;
	},

	onSend : function(evt) {
		var attachmentBucket = document.getElementById("attachmentBucket");
		var msg_type = document.getElementById("msgcomposeWindow").getAttribute("msgtype"); 
		if (! document.getElementById("AETdeleteOnSend").checked || ! attachmentBucket .hasChildNodes() || msg_type != 0) {
			gStripAttachments.folderListener.abort = true;
			return;
		}
		gStripAttachments.folderListener.abort = false;
		gStripAttachments.folderListener.id  = null;		
		/*var identity =  getCurrentIdentity();
		if (identity.doFcc)
			gStripAttachments.folderListener.originalFcc0 = identity.fccFolder;
		else
			gStripAttachments.folderListener.originalFcc0 = "";
		if (typeof gMsgCompose.compFields.fcc != "undefined")
			gStripAttachments.folderListener.originalFcc1 = gMsgCompose.compFields.fcc;
		else
			gStripAttachments.folderListener.originalFcc1 = "";
		if (typeof gMsgCompose.compFields.fcc2 != "undefined")
			gStripAttachments.folderListener.originalFcc2 = gMsgCompose.compFields.fcc2;
		else
			gStripAttachments.folderListener.originalFcc2 = "";*/
		gMsgCompose.addMsgSendListener(gStripAttachments.sendListener);
		try {
			var newH = "X-Strip_Attachments: true\r\n";
			gMsgCompose.compFields.otherRandomHeaders += newH;	
		}
		catch(e) {
			gMsgCompose.compFields.setHeader("X-Strip_Attachments", "true");
		}
	},

	sendListener : {
		onStartSending : function(id,size) {},
		onProgress : function(aMsgID,aProgress,aProgressMax) {},
		onStatus: function	(MsgID,aMsg) {},
		onStopSending: function	(aMsgID,aStatus,aMsg,aReturnFile) {
			gStripAttachments.folderListener.id = aMsgID.replace("<","").replace(">","");
		},
		onGetDraftFolderURI: function (aFolderURI) {
			gStripAttachments.folderListener.targetURI = aFolderURI;
		},
		onSendNotPerformed :function(aMsgID,aStatus) {}
	},
	
	folderListener : {
		OnItemAdded: function(parent, item, viewString) {
			if (gStripAttachments.folderListener.abort) 
				return;
			gStripAttachments.folderListener.abort = true;
			var aMsgHdr = item.QueryInterface(Components.interfaces.nsIMsgDBHdr);
			var folderUri = aMsgHdr.folder.URI;
			if (folderUri != gStripAttachments.folderListener.targetURI)			
				return;	
			if (gStripAttachments.folderListener.id && aMsgHdr.messageId == gStripAttachments.folderListener.id) {
				var main = Components.classes["@mozilla.org/appshell/window-mediator;1"]
                                  .getService(Components.interfaces.nsIWindowMediator)
                                  .getMostRecentWindow("mail:3pane");
				main.attachExtraToolsObject.stripAtt(aMsgHdr);
			}
		},
		OnItemRemoved: function(parent, item, viewString) {},
		OnItemPropertyChanged: function(parent, item, viewString) {},
		OnItemIntPropertyChanged: function(item, property, oldValue, newValue) {},
		OnItemBoolPropertyChanged: function(item, property, oldValue, newValue) {},
		OnItemUnicharPropertyChanged: function(item, property, oldValue, newValue) {},
		OnItemPropertyFlagChanged: function(item, property, oldFlag, newFlag) {},
		OnItemEvent: function(item, event) {},
		OnFolderLoaded: function(aFolder) {},
		OnDeleteOrMoveMessagesCompleted: function( aFolder) {}
	}
};

window.addEventListener("load", gStripAttachments.init, false);

