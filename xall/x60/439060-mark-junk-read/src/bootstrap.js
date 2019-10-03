'use strict';

Components.utils.import('resource:///modules/iteratorUtils.jsm');
Components.utils.import('resource://gre/modules/XPCOMUtils.jsm');

var markJunkRead = {
	MSG_FOLDER_JUNK: 0x40000000,
	MSG_FOLDER_FLAG_MAIL: 0x0004,
	timeoutId: -1,
	mailSession: '',
	notifyFlags: '',
	timer: Components.classes['@mozilla.org/timer;1'].createInstance(Components.interfaces.nsITimer),
	mailServices: {},
 	timerCallback: {
		notify: function(timer){
			markJunkRead.markAccountsRead();
		}
	},

	onLoad: function(e) {
	},

	folderListener: {
		OnItemAdded: function(parent, item, viewString){
				markJunkRead.onItemCountChanged();
		},
		OnItemRemoved: function(parent, item, viewString){
				markJunkRead.onItemCountChanged();
		},
		OnItemPropertyFlagChanged: function(item, property, oldFlag, newFlag){
			if (property == 'Status'){
				markJunkRead.onItemCountChanged();
			}
		},
		OnItemEvent: function(item, event){
				markJunkRead.onItemCountChanged();
		},

		// These functions must be defined or we get exceptions
		OnFolderLoaded: function(aFolder) {},
		OnDeleteOrMoveMessagesCompleted: function(aFolder) {},
		OnItemPropertyChanged: function(parent, item, viewString) {},
		OnItemIntPropertyChanged: function(item, property, oldVal, newVal) {},
		OnItemBoolPropertyChanged: function(item, property, oldValue, newValue) {},
		OnItemUnicharPropertyChanged: function(item, property, oldValue, newValue) {}
	},

	onItemCountChanged: function(){
		// We set a timeout so that if there are many events happening at once (within one second), we only run the function one time.
		// This prevents recursion errors.
		this.timer.cancel();
		this.timer.initWithCallback(this.timerCallback, 1000, Components.interfaces.nsITimer.TYPE_ONE_SHOT);
	},

	markAccountsRead: function(){
		let iterator = fixIterator(this.mailServices.accounts.accounts, Components.interfaces.nsIMsgAccount);

		let result = iterator.next();
		while (!result.done) {
			let account = result.value;
			let rootFolder = account.incomingServer.rootFolder; // nsIMsgFolder
			if(rootFolder.hasSubFolders){
				markJunkRead.markJunkRead(rootFolder);
			}
			result = iterator.next();
		}
	},

	markJunkRead: function(rootFolder){
		let subFolders = rootFolder.getFoldersWithFlags(this.MSG_FOLDER_FLAG_MAIL); // nsIArray
		let subFoldersEnumerator = subFolders.enumerate();

		while(subFoldersEnumerator.hasMoreElements()){
			let folder = subFoldersEnumerator.getNext().QueryInterface(Components.interfaces.nsIMsgFolder);

			if(folder.getFlag(markJunkRead.MSG_FOLDER_JUNK) || folder.name.toLowerCase() == 'spam' || folder.name.toLowerCase() == 'junk'){
				if(folder.getNumUnread(false) > 0){
					folder.markAllMessagesRead(null);
				}
			}
		}
	}
};

function startup(data, reason){
	// Set up the core object
	markJunkRead.mailSession = Components.classes['@mozilla.org/messenger/services/session;1'].getService(Components.interfaces.nsIMsgMailSession);
	markJunkRead.notifyFlags = Components.interfaces.nsIFolderListener.all;
	markJunkRead.mailSession.AddFolderListener(markJunkRead.folderListener, markJunkRead.notifyFlags);

	XPCOMUtils.defineLazyServiceGetter(markJunkRead.mailServices, 'accounts', '@mozilla.org/messenger/account-manager;1', 'nsIMsgAccountManager');

	// Run this function immediately on startup to clear junk folders
	markJunkRead.onItemCountChanged();
}

function install(data, reason) {
}

function shutdown(data, reason){
	markJunkRead.mailSession.RemoveFolderListener(markJunkRead.folderListener);
	markJunkRead.timer.cancel();
}

function uninstall(data, reason){
}
