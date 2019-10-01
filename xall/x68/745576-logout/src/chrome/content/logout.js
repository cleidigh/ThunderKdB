
function logout() {
	folders=gFolderTreeView.getSelectedFolders();
	for(i=0;i<folders.length;i++) {
		folders[i].server.forgetPassword();
		folders[i].server.forgetSessionPassword();
		folders[i].server.closeCachedConnections();
		subfolder=folders[i];
		if( folders[i].isServer && folders[i].hasSubFolders ) {
			subfolder=folders[i].subFolders.getNext().QueryInterface(Components.interfaces.nsIMsgFolder);
		}
		account=findAccountFromFolder(subfolder);
		if( account != null ) {
			for (id of fixIterator(account.identities, Ci.nsIMsgIdentity)) {
				smtpService=Components.classes['@mozilla.org/messengercompose/smtp;1'].getService(Components.interfaces.nsISmtpService);
				smtpServer=smtpService.getServerByKey(id.smtpServerKey);
				smtpServer.forgetPassword();
			}
		}
	}
}

function findAccountFromFolder(theFolder) {  
    if (!theFolder)  
        return null;  
    var acctMgr = Components.classes["@mozilla.org/messenger/account-manager;1"].getService(Components.interfaces.nsIMsgAccountManager);  
    var accounts = acctMgr.accounts;  
    for (var i = 0; i < accounts.length; i++) {  
        var account = accounts.queryElementAt(i, Components.interfaces.nsIMsgAccount);  
        var rootFolder = account.incomingServer.rootFolder; // nsIMsgFolder  
        if (rootFolder.hasSubFolders) {  
            var subFolders = rootFolder.subFolders; // nsIMsgFolder  
            while(subFolders.hasMoreElements()) {  
                if (theFolder == subFolders.getNext().QueryInterface(Components.interfaces.nsIMsgFolder))  
                    return account.QueryInterface(Components.interfaces.nsIMsgAccount);  
            }  
        }  
    }  
    return null;  
}
