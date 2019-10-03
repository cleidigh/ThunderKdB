toolbar_buttons.toolbar_button_loader(toolbar_buttons.interfaces, {
	MsgAccountManager: Cc["@mozilla.org/messenger/account-manager;1"].getService(Ci.nsIMsgAccountManager)
});
toolbar_buttons.toolbar_button_loader(toolbar_buttons, {
		addContact: function(event) {
		var doc = event.target.ownerDocument;
		var win = doc.defaultView;
		var detailsNodes = doc.getElementById('expandedfromBox').emailAddresses.firstChild;
		if (detailsNodes.cardDetails.card) {
			win.EditContact(detailsNodes)
		} else {
			win.AddContact(detailsNodes);
		}
	},
	emptyAllTrash: function(event) {
		var win = event.target.ownerDocument.defaultView;
		try {
			win.MsgEmptyTrash(); // stopped working in Thunderbird 3.1
		} catch (e) {
			// same as gFolderTreeController.emptyTrash(); in 3.1
			win.goDoCommand("cmd_emptyTrash");
		}
	},
	emptyAllTrashClick: function(event) {
		var win = event.target.ownerDocument.defaultView;
		if(event.button == 1) {
			try {
				if(!win.gFolderTreeController._checkConfirmationPrompt("emptyTrash")) {
					return;
				}
			} catch(e) {
				if(!win.confirmToProceed("emptyTrash"))  {
					return;
				}
			}
			// not what happens with smart folders in 3.1, but too scared to change
			var servers = toolbar_buttons.interfaces.MsgAccountManager.allServers;
			for(var server in fixIterator(servers, Ci.nsIMsgIncomingServer)) {
				server.rootMsgFolder.emptyTrash(win.msgWindow, null);
			}
		}
	},
	openOptionsTab: function(event) {
		var doc = event.target.ownerDocument.defaultView;
		if(event.button == 1) { 
			doc.getElementById('tabmail').openTab('contentTab',
					{contentPage: 
						'chrome://messenger/content/preferences/preferences.xul'});
			return true;
		}
		return false;
	},
	toggleMsgHeaders: function(event) {
		var win = event.target.ownerDocument.defaultView;
		var modeType = Ci.nsMimeHeaderDisplayTypes, mode,
			prefs =  toolbar_buttons.interfaces.PrefBranch,
			setting = prefs.getIntPref("mail.show_headers");
		if(setting == modeType.MicroHeaders || setting == modeType.NormalHeaders) {
			mode = modeType.AllHeaders;
		} else {
			mode = modeType.NormalHeaders;
		}
		prefs.setIntPref("mail.show_headers", mode);
		win.AdjustHeaderView(mode);
		win.ReloadMessage();
	}
});
