/**
 * Copy Folder Thunderbird Plugin
 * 
 * @version copyfolder.js v1.61
 * @copyright Copyright(c) 2014 Jonathan Wolinsky
 * @author Jonathan Wolinsky <jwolinsky@gmail.com>
 */

if(!com) var com = {};
if(!com.crunchmod) com.crunchmod = {};

Components.utils.import('resource:///modules/mailServices.js');
Components.utils.import("resource:///modules/MailUtils.js");
Components.utils.import('resource:///modules/iteratorUtils.jsm');
Components.utils.import("resource:///modules/folderUtils.jsm");

com.crunchmod.copyfolder = {
	/**
	 * Initiates plugin
	 *
	 * @return void
	 */
	init: function() {
		// remove onLoad listener and set attributes
		window.removeEventListener('load', com.crunchmod.copyfolder.init, false);
		com.crunchmod.copyfolder.statusBar = document.getElementById('statusbar-progresspanel');
		com.crunchmod.copyfolder.progressMeter = document.getElementById('statusbar-icon');
		com.crunchmod.copyfolder.copyfolderStatus = document.getElementById('copyfolder-status');
		
		// create datasources for "Copy To" menuitem
		var prefix = "@mozilla.org/rdf/datasource;1?name=";
		var accountManagerDSCID = prefix + "msgaccountmanager";
		var folderDSCID = prefix + "mailnewsfolders";
		var nsIRDFDataSource = Components.interfaces.nsIRDFDataSource;

		var accountManagerDataSource = Components.classes[accountManagerDSCID].getService(nsIRDFDataSource);
		var folderDataSource = Components.classes[folderDSCID].getService(nsIRDFDataSource);
		
		var menu = document.getElementById('folderPaneContext-copyfolder');
		if (menu) {
			menu.database.AddDataSource(accountManagerDataSource);
			menu.database.AddDataSource(folderDataSource);
			menu.setAttribute('ref', 'msgaccounts:/');
		}
	},
	
	/**
	 * Backward compatibility for old getMsgFolderFromUri global function
	 * 
	 * @param uri the URI to convert into a folder
	 * @param checkFolderAttributes whether to check that the folder either has
	 *								a parent or isn't a server
	 * @returns the nsIMsgFolder corresponding to this URI, or null if
	 *			aCheckFolderAttributes is true and the folder doesn't have a
	 *			parent or is a server
	 */
	getMsgFolderFromUri:  function(uri, checkFolderAttributes) {
		let msgfolder = null;
		
		if (typeof MailUtils != 'undefined' && MailUtils.getFolderForURI) {
			return MailUtils.getFolderForURI(uri, checkFolderAttributes);
		}
		
		try {
			let resource = GetResourceFromUri(uri);
			msgfolder = resource.QueryInterface(Components.interfaces.nsIMsgFolder);
			if (checkFolderAttributes) {
				if (!(msgfolder && (msgfolder.parent || msgfolder.isServer))) {
					msgfolder = null;
				}
			}
		} catch (ex) {
			//dump("failed to get the folder resource\n");
		}
		
		return msgfolder;
	},
	
	/**
	 * Shows confirmation dialog
	 * 
	 * @param nsIMsgFolder Destination folder.
	 * @return void
	 */
	copyDialog: function(destFolderSelected) {
		// get the msg folder we're copying messages into
		var destUri = destFolderSelected.getAttribute('id');
		var destFolder = com.crunchmod.copyfolder.getMsgFolderFromUri(destUri);
		
		// get the source folder to copy
		var srcFolder = gFolderTreeView.getSelectedFolders()[0];
		
		com.crunchmod.copyfolder.srcFolder = srcFolder;
		com.crunchmod.copyfolder.destFolder = destFolder;
		com.crunchmod.copyfolder.copiedMessages = 0;
		com.crunchmod.copyfolder.newMessages = com.crunchmod.copyfolder.messagesOutstanding(srcFolder, destFolder);
		com.crunchmod.copyfolder.copyfolderStatus.setAttribute('collapsed', true);
		
		var warning = '';
		var question = '';
		var localMessages = 0;
		
		// need to check destFolder children for a folder with the same name as our srcFolder
		// since destFolder is the parent/root folder of where we are copying srcFolder to
		if(destFolder.containsChildNamed(srcFolder.prettiestName)) {
			localMessages = destFolder.getChildNamed(srcFolder.prettiestName).getTotalMessages(true);
			warning = "<vbox><html:div style='margin: 0 3px 2px 3px; background: #3D9EFE; padding: 5px 10px; border: solid 1px #0A88FE; color: #FFF;'>The destination already contains a folder named \"<html:span style='font-weight: bold;'>" + srcFolder.prettiestName + "</html:span>\"</html:div></vbox>";
		}
		
		if(com.crunchmod.copyfolder.newMessages > 0) {
			question = "<vbox><label><html:div>Copy " + com.crunchmod.copyfolder.newMessages + " new messages from: <html:div style='padding:5px 10px; font-weight:bold;'>" + com.crunchmod.copyfolder.getFolderTree(srcFolder) + "</html:div> to: <html:div style='padding:5px 10px; font-weight:bold;'>" + com.crunchmod.copyfolder.getFolderTree(destFolder) + " / " + srcFolder.prettiestName + "</html:div></html:div></label></vbox>"
		} else {
			question = "<vbox><label><html:div>There are no new messages to copy.</html:div></label></vbox>"
		}
		
		var params = {
			title: srcFolder.prettiestName,
			newMessages: com.crunchmod.copyfolder.newMessages,
			copiedMessages: localMessages,
			warning: warning,
			question: question,
			out: null
		};
		
		window.openDialog("chrome://copyfolder/content/copyfolder-dialog.xul", "copyfolder-dialog", "chrome, dialog, centerscreen, modal", params).focus();
		
		if(params.out) {
			com.crunchmod.copyfolder.copyFolder(srcFolder, destFolder);
		}
	},
	
	/**
	 * Returns string of folder's ancestor folders
	 *
	 * @param nsIMsgFolder
	 * @return string
	 */
	getFolderTree: function(folder) {
		var folderTree = [];
		
		while(folder != null) {
			folderTree.push(folder.prettiestName);
			
			try {
				folder = folder.parent;
			} catch (ex) {
				console.log(ex);
			}
			
		}
		
		return folderTree.reverse().join(' / ');
	},
	
	/**
	 * Returns number of messages in srcFolder that haven't been copied to destFolder
	 *
	 * @param nsIMsgFolder srcFolder
	 * @param nsIMsgFolder destParent
	 * @return int newMessages
	 */
	messagesOutstanding: function(srcFolder, destParent) {
		com.crunchmod.copyfolder.setStatus('Searching for new messages...');
		
		if(destParent.containsChildNamed(srcFolder.prettiestName)) {
			// get folder corresponding to srcFolder in destParent
			var destFolder = destParent.getChildNamed(srcFolder.prettiestName);
		} else {
			// destParent doesn't contain srcFolder so there's no point in iterating
			// through srcFolder, just return number of messages in srcFolder
			return srcFolder.getTotalMessages(true);
		}
		
		let newMessages = 0;
		
		// go through messages in subfolders
		if(srcFolder.hasSubFolders) {
			for each (let subFolder in fixIterator(srcFolder.subFolders, Components.interfaces.nsIMsgFolder)) {
				//subFolder.updateFolder(msgWindow);
				if(destFolder.containsChildNamed(subFolder.prettiestName)) {
					var destSubFolder = destFolder.getChildNamed(subFolder.prettiestName);
				
					if(subFolder.hasSubFolders) {
						newMessages += com.crunchmod.copyfolder.messagesOutstanding(subFolder, destFolder);
					}
					
					let msgArray = subFolder.messages;
					
					while(msgArray.hasMoreElements()) {
						let msgHdr = msgArray.getNext().QueryInterface(Components.interfaces.nsIMsgDBHdr);
						let messageId = msgHdr.messageId;

						if(!com.crunchmod.copyfolder.searchFolder(destSubFolder, messageId)) {
							newMessages++;
						}
					}
				} else {
					newMessages += subFolder.getTotalMessages(true);
				}
			}
		}
		
		// go through messages in srcFolder
		let msgArray = srcFolder.messages;
		
		while(msgArray.hasMoreElements()) {
			let msgHdr = msgArray.getNext().QueryInterface(Components.interfaces.nsIMsgDBHdr);
			let messageId = msgHdr.messageId;

			if(!com.crunchmod.copyfolder.searchFolder(destFolder, messageId)) {
				newMessages++;
			}
		}
		
		return newMessages;
	},
	
	/**
	 * Searches for message in folder
	 *
	 * @param nsIMsgFolder folder
	 * @param string messageId
	 * @return boolean
	 */
	searchFolder: function(folder, messageId) {
		var msgHdr = null;
		var msgDB = null;
		
		if(folder) {
			msgDB = folder.msgDatabase;
			
			if(msgDB != null) {
				msgHdr = msgDB.getMsgHdrForMessageID(messageId);
				
				if(msgHdr != null) {
					return true;
				}
			}
		}
		
		return false;
	},
	
	/**
	 * Copies folder to destination and maintains subfolder structure.
	 *
	 * @param nsIMsgFolder srcFolder Folder to copy messages from.
	 * @param nsIMsgFolder destParent Parent of where destination folder will be created.
	 * @return void
	 */
	copyFolder: function(srcFolder, destParent) {
		if(destParent.containsChildNamed(srcFolder.prettiestName)) {
			// get destination folder if it exists
			var destFolder = destParent.getChildNamed(srcFolder.prettiestName);
			
			/* // gCopyService.CopyFolders copies folder tree but not messages!?
			let folders = new Array;
			folders.push(srcFolder.QueryInterface(Components.interfaces.nsIMsgFolder));
			let array = toXPCOMArray(folders, Components.interfaces.nsIMutableArray);
			gCopyService.CopyFolders(array, destParent, false, null, null); */
			
			// copy messages from srcFolder to destFolder
			com.crunchmod.copyfolder.copyMessages(srcFolder, destFolder);
			
			// if srcFolder has subfolders, iterate through subfolders and copy
			if(srcFolder.hasSubFolders) {
				for each (let subFolder in fixIterator(srcFolder.subFolders, Components.interfaces.nsIMsgFolder)) {
					com.crunchmod.copyfolder.copyFolder(subFolder, destFolder);
				}
			}
		} else {
			// create destination folder in destParent if destination doesn't exist
			destParent.createSubfolder(srcFolder.prettiestName, null);
			// update destParent
			// destParent.updateFolder(msgWindow);
			// create destination folder and send back through copyFolder
			window.setTimeout(function() {
				return com.crunchmod.copyfolder.copyFolder(srcFolder, destParent);
			}, 100);
		}
	},
	
	/**
	 * Copies messages from source folder to destination folder
	 *
	 * @param nsIMsgFolder srcFolder Folder to copy messages from.
	 * @param nsIMsgFolder destFolder Folder to copy messages to.
	 * @return void
	 */
	copyMessages: function(srcFolder, destFolder) {
		let msgArray = srcFolder.messages;
		let gCopyService = Components.classes['@mozilla.org/messenger/messagecopyservice;1'].getService(Components.interfaces.nsIMsgCopyService);
		
		while( msgArray.hasMoreElements() ) {
			let msgHdr = msgArray.getNext().QueryInterface(Components.interfaces.nsIMsgDBHdr);
			let messageId = msgHdr.messageId;
			
			// copy message if it doesn't already exist in destination folder
			if(!com.crunchmod.copyfolder.searchFolder(destFolder, messageId)) {
				let messages = Components.classes['@mozilla.org/array;1'].createInstance(Components.interfaces.nsIMutableArray);
				messages.appendElement(msgHdr, false);
				gCopyService.CopyMessages(srcFolder, messages, destFolder, /* isMove */ false, com.crunchmod.copyfolder.copyListener, null, /* allow undo */ false);
			}
		}
	},
	
	/**
	 * Sets progress bar percentage
	 *
	 * @param int Percent of messages copied relative to total messages in account.
	 * @return void
	 */
	setProgress: function(percent) {
		com.crunchmod.copyfolder.statusBar.setAttribute('collapsed', false);
		com.crunchmod.copyfolder.progressMeter.setAttribute('mode', 'normal');
		com.crunchmod.copyfolder.progressMeter.setAttribute('value', percent);
		
		if(com.crunchmod.copyfolder.copiedMessages >= com.crunchmod.copyfolder.newMessages) {
			com.crunchmod.copyfolder.statusBar.setAttribute('collapsed', true);
			
			window.openDialog(
				"chrome://copyfolder/content/copyfolder-summary.xul",
				"copyfolder-dialog",
				"chrome, dialog, modal, centerscreen",
				{
					newMessages: com.crunchmod.copyfolder.messagesOutstanding(com.crunchmod.copyfolder.srcFolder, com.crunchmod.copyfolder.destFolder),
					destMessages: com.crunchmod.copyfolder.destFolder.getChildNamed(com.crunchmod.copyfolder.srcFolder.prettiestName).getTotalMessages(true),
					summary: 'Copied ' + com.crunchmod.copyfolder.copiedMessages + ' messages successfully.'
				}
			).focus();
		}
	},
	
	/**
	 * Sets status message
	 *
	 * @param string Status message text.
	 * @return void
	 */
	setStatus: function(text) {
		com.crunchmod.copyfolder.copyfolderStatus.setAttribute('collapsed', false);
		com.crunchmod.copyfolder.copyfolderStatus.setAttribute('label', text);
		
		if(com.crunchmod.copyfolder.copiedMessages >= com.crunchmod.copyfolder.newMessages) {
			com.crunchmod.copyfolder.copyfolderStatus.setAttribute('collapsed', true);
		}
	},
	
	/**
	 * Callback for nsIMsgCopyService
	 *
	 * @return void
	 */
	copyListener: {
		OnStartCopy: function OnStartCopy() {},
		OnProgress: function OnProgress(aProgress, aProgressMax) {},
		SetMessageKey: function SetMessageKey(aKey) {},
		SetMessageId: function SetMessageId(aMessageId) {},
		OnStopCopy: function OnStopCopy(aStatus) {
			com.crunchmod.copyfolder.copiedMessages++;
			com.crunchmod.copyfolder.setProgress((com.crunchmod.copyfolder.copiedMessages / com.crunchmod.copyfolder.newMessages) * 100);
			com.crunchmod.copyfolder.setStatus('Copied ' + com.crunchmod.copyfolder.copiedMessages + ' of ' + com.crunchmod.copyfolder.newMessages + ' messages');
		}
	}
}

window.addEventListener('load', function () { com.crunchmod.copyfolder.init(); }, false);