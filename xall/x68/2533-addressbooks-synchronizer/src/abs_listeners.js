function addListener() {
debug('addListener for cards');
	MailServices.ab.addAddressBookListener(
		sessionListener,
//      Ci.nsIAbListener.itemAdded ||
//      Ci.nsIAbListener.directoryItemRemoved ||
//      Ci.nsIAbListener.directoryRemoved ||
//      Ci.nsIAbListener.itemChanged ||
			Ci.nsIAbListener.all);
}

function removeListener() {
debug('removeListener for cards');
	MailServices.ab.removeAddressBookListener(sessionListener);
}

let sessionListener={
	// these functions are called for the main dir and every list (which has been shown
	// in the addressbookwindows) even if item are not part of the list
//After book has been downloaded vie replace by entry, these functions
//are no longer called for dir (only for lists)
	onItemAdded: function(parentDir, item) {
debug('onItemAdded: '+parentDir+' '+item);
		try {
			let dir=parentDir.QueryInterface(Ci.nsIAbDirectory);
//MAB  //this.dump('dir.URI: '+dir.URI); //moz-abmdbdirectory://abook.zzz
			if (item instanceof Ci.nsIAbCard) {
				let card=item.QueryInterface(Ci.nsIAbCard);
				//card might be a list
				let now=Math.floor(Date.now()/1000);
debug('		card added: parent='+dir.dirName+' email='+card.primaryEmail);
debug('     lmd of dir,card set from '+dir.lastModifiedDate+','+card.getProperty('LastModifiedDate','???')+' to '+now);
				card.setProperty('LastModifiedDate',now);
				dir.lastModifiedDate=now;
				//card.setProperty('LastModifiedDate',now);
			}
		} catch(e) {
			debug('onItemAdded throws: '+item+': '+e, e);
		}
	},
	onItemRemoved: function(parentDir, item) {
		// if a list is removed, this is called twice, with a nsIAbCard than with nsIAbDirectory
debug('onItemRemoved: '+parentDir+' '+item);
		try {
			let now=Math.floor(Date.now()/1000);
			let dir=parentDir?parentDir.QueryInterface(Ci.nsIAbDirectory):null;
			if (item instanceof Ci.nsIAbCard) {
				let card=item.QueryInterface(Ci.nsIAbCard);
debug('		card removed parent='+dir.dirName+' email='+card.primaryEmail);
        if (dir.isMailList) {
debug('     is Mail List uri='+dir.URI);
					dir=MailServices.ab.getDirectory(dir.URI.replace(/\/[^\/]*$/,''));
debug('     parent is '+dir.dirName);
        }
debug('     lmd of dir set from '+dir.lastModifiedDate+' to '+now);
				dir.lastModifiedDate=now;
			} else if (item instanceof Ci.nsIAbDirectory) {
				let list=item.QueryInterface(Ci.nsIAbDirectory);
				if (!dir) {
debug('		a book was removed');  // complete book has been removed
//TODO: remove prefs?
				} else {
debug('		list removed parent='+dir.dirName+' list='+list.dirName);
					// hhm, wie unterscheide ich, ob es nur ein löschen der Liste
					// ist, oder ein löschen des ganzen Buches? => wenn Buch gelöscht ist parent null
					// Vielleicht ist es auch egal?
debug('     lmd of dir set from '+dir.lastModifiedDate+' to '+now);
					dir.lastModifiedDate=now;
				}
			} else {
debug('		??? removed parent='+dir.dirName);
			}
		} catch(e) {
			debug('onItemRemoved throws: '+e, e);
		}
	},
	onItemPropertyChanged: function(item, property, oldValue, newValue) {
debug('onItemPropertyChanged');
		try{
			let now=Math.floor(Date.now()/1000);
			if (item instanceof Ci.nsIAbCard) {
				//property, oldValue and newValue are always null
				//fires 41 times in TB72 :-(
				let card=item.QueryInterface(Ci.nsIAbCard);
				let lmdc=card.getProperty('LastModifiedDate','');	//always 0 in TB72
debug('		card changed '+card.primaryEmail+' '+card.firstName+' '+card.lastName);
debug('			property '+property+' from '+oldValue+' to '+newValue);
debug('			directoryId: '+card.directoryId+' localId: '+card.localId);  //ldap_2.servers.pab&Personal
debug('			lmd of card is '+lmdc);
				//if (lmdc==0) {
debug('     lmd of card set from '+lmdc+' to '+now);
					lmdc=now;
					card.setPropertyAsUint32('LastModifiedDate',lmdc);	//does not work :-(
				//}
				// lastModifiedDate of card has changed, but not for the directoy :-(
				// card.directoryId something like 'ldap_2.servers.Test&TestModNeu'
				let dir = MailServices.ab.getDirectoryFromId(card.directoryId.replace(/&.*$/,''));
				if (dir) {
debug('     lmd of dir set from '+dir.lastModifiedDate+' to '+lmdc);
					dir.lastModifiedDate=lmdc;
				} else {
					debug('		Card change, but no directory found for '+card.directoryId);
				}
			} else if (item instanceof Ci.nsIAbDirectory) {
				let dir=item.QueryInterface(Ci.nsIAbDirectory);
				//property='DirName'
debug('		dir changed '+dir.dirName+' '+property+': '+oldValue+'->'+newValue);
				if (dir.isMailList) {
debug('			dir is MailList: '+dir.URI);   //moz-abmdbdirectory://abook.zzz/MailList3
					dir=MailServices.ab.getDirectory(dir.URI.replace(/\/[^\/]*$/,''));
debug('     lmd of dir set from '+dir.lastModifiedDate+' to '+now);
					dir.lastModifiedDate=now;
				} else {
debug('			dir is directory: '+dir.URI);   //moz-abmdbdirectory://abook.zzz/MailList3
				}
			} else {
debug('		??? changed item='+item);
			}
		} catch(e) {
			debug('onItemPropertyChanged throws: '+e, e);
		}
	}
}
