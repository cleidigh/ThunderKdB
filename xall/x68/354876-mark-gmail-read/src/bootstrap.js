'use strict';

Components.utils.import("resource:///modules/iteratorUtils.jsm");
ChromeUtils.import("resource:///modules/MailServices.jsm");
const { XPCOMUtils } = ChromeUtils.import("resource://gre/modules/XPCOMUtils.jsm");

var markGmailRead = {
	MSG_FOLDER_GMAIL: '[Gmail]',
	MSG_FOLDER_GMAIL_ALL_MAIL: 'All Mail',
	MSG_FOLDER_GMAIL_IMPORTANT: 'Important',
	MSG_FOLDER_GMAIL_STARRED: 'Starred',
	MSG_FOLDER_FLAG_MAIL: 0x0004,
	timeoutId: -1,
	mailSession: '',
	notifyFlags: '',
	timer: Components.classes["@mozilla.org/timer;1"].createInstance(Components.interfaces.nsITimer),
	mailServices: {},
 	timerCallback: {
		notify: function(timer){
			markGmailRead.markAllGmailRead();
		}
	},

	onLoad: function(e) {
	},

	folderListener: {
		OnItemAdded: function(parent, item, viewString){
				markGmailRead.onItemCountChanged();
		},
		OnItemRemoved: function(parent, item, viewString){
				markGmailRead.onItemCountChanged();
		},
		OnItemPropertyFlagChanged: function(item, property, oldFlag, newFlag){
			if (property == "Status"){
				markGmailRead.onItemCountChanged();
			}
		},
		OnItemEvent: function(item, event){
				markGmailRead.onItemCountChanged();
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

	markAllGmailRead: function(){
		for (let account of fixIterator(this.mailServices.accounts.accounts, Components.interfaces.nsIMsgAccount)){
			var rootFolder = account.incomingServer.rootFolder; // nsIMsgFolder
			if(rootFolder.hasSubFolders){
				markGmailRead.markGmailRead(rootFolder);
			}
		}
	},

	markGmailRead: function(rootFolder){
		var subFolders = rootFolder.getFoldersWithFlags(this.MSG_FOLDER_FLAG_MAIL); // nsIArray
		var subFoldersEnumerator = subFolders.enumerate();

		while(subFoldersEnumerator.hasMoreElements()){
			var folder = subFoldersEnumerator.getNext().QueryInterface(Components.interfaces.nsIMsgFolder);
			if(folder.prettyName == markGmailRead.MSG_FOLDER_GMAIL){
				// The [Gmail] folder doesn't return an unread message count, even if subfolders have unread items.
				// So we iterate over each subfolder and mark it as read that way.
				var gmailSubFolders = folder.getFoldersWithFlags(this.MSG_FOLDER_FLAG_MAIL); //nsIArray
				var gmailSubFoldersEnumerator = gmailSubFolders.enumerate();
				while(gmailSubFoldersEnumerator.hasMoreElements()){
					var gmailFolder = gmailSubFoldersEnumerator.getNext().QueryInterface(Components.interfaces.nsIMsgFolder);
					// Don't mark various special folder as read, because that might mess up the inbox.
					if(gmailFolder.getNumUnread(false) > 0
					&& gmailFolder.prettyName != markGmailRead.MSG_FOLDER_GMAIL_ALL_MAIL
					&& gmailFolder.prettyName != markGmailRead.MSG_FOLDER_GMAIL_IMPORTANT
					&& gmailFolder.prettyName != markGmailRead.MSG_FOLDER_GMAIL_STARRED){
						gmailFolder.markAllMessagesRead(null);
					}
				}
			}
		}
	}
};

function startup(data, reason){
	// Load prefs
	var prefs = Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefService);
	prefs = prefs.getBranch("extensions.mark_gmail_read.");

	markGmailRead.MSG_FOLDER_GMAIL_ALL_MAIL = prefs.getStringPref("folder_names.all_mail", markGmailRead.MSG_FOLDER_GMAIL_ALL_MAIL);
	markGmailRead.MSG_FOLDER_GMAIL_IMPORTANT = prefs.getStringPref("folder_names.important", markGmailRead.MSG_FOLDER_GMAIL_IMPORTANT);
	markGmailRead.MSG_FOLDER_GMAIL_STARRED = prefs.getStringPref("folder_names.starred", markGmailRead.MSG_FOLDER_GMAIL_STARRED);

	// Set up the core object
	markGmailRead.mailSession = Components.classes["@mozilla.org/messenger/services/session;1"].getService(Components.interfaces.nsIMsgMailSession);
	markGmailRead.notifyFlags = Components.interfaces.nsIFolderListener.all;
	markGmailRead.mailSession.AddFolderListener(markGmailRead.folderListener, markGmailRead.notifyFlags);

	XPCOMUtils.defineLazyServiceGetter(markGmailRead.mailServices, "accounts", "@mozilla.org/messenger/account-manager;1", "nsIMsgAccountManager");

	// Run this function immediately on startup to mark folders as read
	markGmailRead.onItemCountChanged();
}

function install(data, reason) {
}

function shutdown(data, reason){
	markGmailRead.mailSession.RemoveFolderListener(markGmailRead.folderListener);
	markGmailRead.timer.cancel();
}

function uninstall(data, reason){
}
