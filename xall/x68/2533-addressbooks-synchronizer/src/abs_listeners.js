function addCardListObserver() {
debug('add observer for cards/lists');
	dirObserver.setUp();
}

function removeCardListObserver() {
debug('remove observer for cards/lists');
	dirObserver.cleanUp();
}

/*
	lastModifiedDate of a directory is only used by TB with ldap
	but i want it for normal directories
*/
var dirObserver={
  topics: [
//    "addrbook-directory-created",		//nsIAbDirectory, null
//    "addrbook-directory-updated",		//nsIAbDirectory, DirName
//    "addrbook-directory-deleted",		//nsIAbDirectory, null
    "addrbook-contact-created",			//nsIAbCard, book.UID (==itemAdded)
    "addrbook-contact-updated",			//nsIAbCard, book.UID (==itemPropertyChanged with nsIAbCard)
    "addrbook-contact-deleted",			//nsIAbCard, book.UID (==itemRemoved)
    "addrbook-list-created",				//nsIAbDirectory, book.UID
    "addrbook-list-updated",				//nsIAbDirectory, book.UID
    "addrbook-list-deleted",				//nsIAbDirectory, book.UID
    "addrbook-list-member-added",		//nsIAbCard, list.UID
    "addrbook-list-member-removed",	//nsIAbCard, list.UID
  ],
//AddrBookManager.getDirectoryFromUID(uid)
  setUp() {
    for (let topic of this.topics) {
try {
      Services.obs.addObserver(dirObserver, topic);
} catch(e) { debug('listener setUp for topic "'+topic+'" '+(typeof dirObserver)+' throws: '+e, ''); }
    }
  },
  cleanUp() {
    for (let topic of this.topics) {
try {
      Services.obs.removeObserver(dirObserver, topic);
//sometimes throws NS_ERROR_ILLEGAL_VALUE (Mail from Albrecht Dreß, 14.11.20)
//unknown topic throws NS_ERROR_FAILURE
//null topic or null observer throws NS_ERROR_ILLEGAL_VALUE
//Seems that the problem comes from a bad profile (according to Albrechts)
} catch(e) { debug('listener cleanUp for topic "'+topic+'" '+(typeof dirObserver)+' throws: '+e, ''); }
    }
  },
	bookUID: null,
	listUID: null,
	card: null,
	list: null,
	dir: null,
	observe(subject, topic, data) {
    //this.events.push([topic, subject, data]);
debug(topic+' '+subject+' '+data);
		let now=Math.floor(Date.now()/1000);
    switch (topic) {
			case "addrbook-contact-created":
			case "addrbook-contact-updated":
			case "addrbook-contact-deleted":
				bookUID=data;
				card=subject;
				dir=MailServices.ab.getDirectoryFromUID(bookUID);
debug('		'+topic+': parent='+dir.dirName+' email='+card.primaryEmail);
debug('     lmd of dir set from '+dir.lastModifiedDate+' to '+now);
				dir.lastModifiedDate=now;
				break;
			case "addrbook-list-created":
			case "addrbook-list-updated":
			case "addrbook-list-deleted":
				bookUID=data;
				list=subject;
				dir=MailServices.ab.getDirectoryFromUID(bookUID);
debug('		'+topic+': parent='+dir.dirName+' list='+list.dirName+' '+list.UID);
debug('     lmd of dir set from '+dir.lastModifiedDate+' to '+now);
				dir.lastModifiedDate=now;
				break;
			case "addrbook-list-member-added":
			case "addrbook-list-member-removed":
				listUID=data;
				card=subject;
				//list=MailServices.ab.getDirectoryFromUID(listUID);		//not for lists :-(
				let dirId=card.directoryId;	//something like ldap_2.servers.prefname&dirname
				dir=MailServices.ab.getDirectoryFromId(dirId.replace(/\&[^\&]*$/,''));
debug('		'+topic+': parent='+dir.dirName+' dirID='+card.directoryId);
debug('     lmd of dir set from '+dir.lastModifiedDate+' to '+now);
				break;
		}
  }
}