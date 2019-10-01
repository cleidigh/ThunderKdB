window.addEventListener("load", function(e) { GetSendButton_status.startup(); }, false);
window.addEventListener("unload", function(e) { GetSendButton_status.shutdown(); }, false);

var GetSendButton_status = {

	startup: function()
	{
		this.observerService = Components.classes["@mozilla.org/observer-service;1"]
		    .getService(Components.interfaces.nsIObserverService);
		this.observerService.addObserver(this, "mail:updateToolbarItems", false);

		this.registerFolderListener();
		this.replacePopup();
		this.refreshButtons();    
	},

	shutdown: function()
	{
		this.observerService.removeObserver(this, "mail:updateToolbarItems");
	},

	observe: function(subject, topic, data)
	{
		switch(topic)
		{
			case "mail:updateToolbarItems":
				this.replacePopup();
				this.refreshButtons();
				break;
		}
	},

	registerFolderListener: function()
	{
	// const MSG_FOLDER_FLAG_QUEUE = 0x0800;
	let folderListener = {
	  OnItemIntPropertyChanged: function(parentItem, item, viewString) {
	    if (parentItem instanceof Components.interfaces.nsIMsgFolder) {
	      if (item == "TotalMessages") {
	        if (parentItem.flags & 0x0800) {
	          GetSendButton_status.refreshButtons();
	          // console.log(parentItem+"/n"+parentItem.flags+"/n"+item+"/n"+viewString);
	        }
	      }
	    }
	  }
	}

	let mailSession =
	  Components.classes["@mozilla.org/messenger/services/session;1"].getService(Components.interfaces.nsIMsgMailSession);
	let notifyFlags =
	  Components.interfaces.nsIFolderListener.intPropertyChanged;
	mailSession.AddFolderListener(folderListener,notifyFlags);
	},

	refreshButtons: function()
	{
		let GetSendButton_sendAllButton = document.getElementById("GetSendButton_S_all");

		// GetSendButton_sendAllButton exists only, if the button is added to the toolbar
		if (GetSendButton_sendAllButton) {
			try {
				// if there are unsent messages
				if (MailOfflineMgr.haveUnsentMessages()) {
					GetSendButton_sendAllButton.removeAttribute("disabled");
				}  
				else {
					GetSendButton_sendAllButton.setAttribute("disabled", true);
				}
			}
			catch(e) {
			}
		}
	},
	
	replacePopup: function() {
		// console.log("GetSendButton: replacePopup");
	    let GetSendButton_originalPopup = document.getElementById("button-getMsgPopup");
	    let GetSendButton_getSendPopup = document.getElementById("GetSendButton_popupGetSend");
		GetSendButton_originalPopup.setAttribute("hidden", true);
		GetSendButton_getSendPopup.removeAttribute("hidden");
	}
}
