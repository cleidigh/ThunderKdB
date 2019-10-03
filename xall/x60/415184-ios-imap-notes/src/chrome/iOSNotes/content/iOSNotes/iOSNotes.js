/* This extension allows to edit notes that were created by iOS devices within Thunderbird.
Some of the functionality is derived from the extension Header Tools Lite by Paolo "Kaosmos". */

var iOSNotesObj = {
	
	// global variables
	folder : null,	
	hdr : null,
	prefs : Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefBranch),
	bundle : Components.classes["@mozilla.org/intl/stringbundle;1"].getService(Components.interfaces.nsIStringBundleService).createBundle("chrome://iOSNotes/locale/iOSNotes.properties"),

	// called loading dialog for editing note, that is in window.arguments[0].value
	initDialog : function() {
		document.getElementById("editNoteArea").focus();
		var text =  window.arguments[0].value;			
		document.getElementById("editNoteArea").setAttribute("limit", window.arguments[0].value.length);		
		setTimeout(function() {
			document.getElementById("editNoteArea").value = text;
			// move the cursor at the beginning of the text
			document.getElementById("editNoteArea").setSelectionRange(0,0);
			window.sizeToContent();
		}, 300);
	},

	// called closing dialog for editing note
	exitDialog : function(cancel) {
		window.arguments[0].cancel = cancel;
		if (! cancel) {
			var fullSource = window.arguments[0].value.substring(document.getElementById("editNoteArea").getAttribute("limit"));
			fullSource =  document.getElementById("editNoteArea").value + fullSource;
			window.arguments[0].value = fullSource;			
		}
	},

	// start editing note
	startEditNote: function() {
		var msguri = gFolderDisplay.selectedMessageUris[0];
		var mms = messenger.messageServiceFromURI(msguri)
			.QueryInterface(Components.interfaces.nsIMsgMessageService);
		iOSNotesObj.hdr = mms.messageURIToMsgHdr(msguri);
		iOSNotesObj.folder = iOSNotesObj.hdr.folder;
		iOSNotesObj.listener.fullSource = true;
		mms.streamMessage(msguri, iOSNotesObj.listener, null, null, false, null);			
	},

	// decode note
	decode : function(note) {	
		// detect if note contains special 'escaped' characters indicated by '=\r\n/'
		if (note.search(/=\r\n/) > 0) {								
			note = note.replace(/=\r\n/g, "");					
			// if mesage contains '%' character replace it with UTF-8 Hex code
			note = note.replace(/%/g, "%25");				
			// now replace all '=' with '%' for decodeURIComponent to work properly
			note = note.replace(/=/g, "%");				
			note = decodeURIComponent(note);						
			}		
		// this is the line break which separates header from body we don't need this
		note = note.replace(/\r\n/g, "");		
		// some notes start with a div tag which can mess up the formating
		if (note.substring(0,5) == "<div>") {
			note	= note.replace(/<div>/, "");		
			note	= note.replace(/<\/div>/, "");	
			}
		// convert tags for non HTML editor
		note	= note.replace(/<div>/, "\r\n");		
		note	= note.replace(/<div>/g, "");		
		note	= note.replace(/<br><\/div>/g, "\r\n");
		note = note.replace(/<\/div>/g, "\r\n");
		note = note.replace(/<br>/g, "\r\n"); 
		note = note.replace(/&nbsp;/g, " ");
		// now remove all HTML tags that might have come in through copy & paste		
		var htmlTag = note.match("<.*?.>");					
		while (htmlTag != null) {			
				note = note.replace(htmlTag, "");								
				htmlTag = note.match("<.*?.>");						
		}
		// decode special HTML characters
		note = note.replace(/&gt;/g, ">");
		note = note.replace(/&lt;/g, "<");
		note = note.replace(/&amp;/g, "&");					
		note = note.replace(/&nbsp;/g, " ");	
		// return clean note
		return note;
	},
	
	// encode note
	encode : function(note) {	
		// encode note with HTML tags
		// convert line breaks back, careful this applies only to the body text!
		var htmlData = "";
		var splitData = note.split("\r\n");						
		
		var i = 0;	
		while (i < splitData.length)
		{
			// first iteration
			if (i==0) {
				htmlData += splitData[0];				
				i++;
			}
			if (splitData[i].length == 0) {
				htmlData += "<div><br><\/div>";
			}
			else {
				htmlData += "<div>"+splitData[i]+"<\/div>";
			}
			i++;
		}						
		// return final note
		return htmlData;
	},
	
	// parses headers to find the original Date header, not present in nsImsgDbHdr
	getOrigDate : function() {
		var dateOrig = "";
		var splitted = null;
		try {
			var str_message = iOSNotesObj.listener.text;
			// This is the end of the headers
			var end = str_message.search(/\r?\n\r?\n/);
			if (str_message.indexOf("\nDate") > -1 && str_message.indexOf("\nDate")  < end) 
				splitted =str_message.split("\nDate:");
			else if (str_message.indexOf("\ndate") > -1 && str_message.indexOf("\ndate")  < end) 
				splitted =str_message.split("\ndate:");
			if (splitted) {
				dateOrig = splitted[1].split("\n")[0];
				dateOrig = dateOrig.replace(/ +$/,"");
				dateOrig = dateOrig.replace(/^ +/,"");
			}
		}
		catch(e) {}
		return dateOrig;
	},
	
	// change the date according to settings
	changeDate : function(header, date) {	
		// change date						
		if ( iOSNotesObj.prefs.getBoolPref("extensions.iOSNotes.keep_Date") ) {		
			// Some IMAP provider (for ex. GMAIL) doesn't register changes in sorce if the main header
			// are not different from an existing note. To work around this limit, the "Date" field is 
			// modified, if necessary, adding a second to the time (or decreasing a second if second are 59)
			var newDate = date.replace(/(\d{2}):(\d{2}):(\d{2})/, function (str, p1, p2, p3) {
				var z = parseInt(p3)+1; 
				if (z > 59) z = 58;
				if (z < 10) z = "0"+z.toString(); 
				return p1+":"+p2+":"+z});
			header = header.replace(date,newDate);
		}	
		else { 
			// use current date 
			date = new Date();			
			header = header.replace(/\nDate: *.*\r\n/, "\nDate: "+date.toGMTString()+"\r\n");				
		}						
		// return header
		return header;
	},
	
	cleanCRLF : function(data) {
		/* This function forces all newline as CRLF; this is useful for some reasons
		1) this will make the note RFC2822 compliant
		2) this will fix some problems with IMAP servers that don't accept mixed newlines
		3) this will make easier to use regexps
		*/
		var newData = data.replace(/\r/g, "");
		newData = newData.replace(/\n/g, "\r\n");
		return newData;
	},
	
	// streamMessage listener
	listener : {
		QueryInterface : function(iid)  {
	                if (iid.equals(Components.interfaces.nsIStreamListener) ||  
        	            iid.equals(Components.interfaces.nsISupports))
        	         return this;
        
        	        throw Components.results.NS_NOINTERFACE;
        	        return 0;
        	},
        
	        onStartRequest : function (aRequest, aContext) {
			iOSNotesObj.listener.text = "";			
		},
            
        	onStopRequest : function (aRequest, aContext, aStatusCode) {
			
			if  (iOSNotesObj.folder.server.type != "imap") {
					alert(iOSNotesObj.bundle.GetStringFromName("noiIMAP"));
					throw new Error (iOSNotesObj.bundle.GetStringFromName("noiIMAP"));
					}	
			var date = iOSNotesObj.getOrigDate();									
			var textObj = {};
			var converter = Components.classes["@mozilla.org/intl/scriptableunicodeconverter"]
				.createInstance(Components.interfaces.nsIScriptableUnicodeConverter); 
			var text = iOSNotesObj.listener.text;
			if (iOSNotesObj.hdr.Charset)
				converter.charset = iOSNotesObj.hdr.Charset;
			// hdr.Charset will not work with multipart messages, so we must try to extract the charset manually
			else {
					converter.charset = "UTF-8";						
			}
			try {
				text = converter.ConvertToUnicode(text);
			}
			catch(e) {}
		
			// separate header and note info
			var endHeaders = text.search(/\r\n\r\n/);
			var header = text.substring(0,endHeaders+4);			
			var note = text.substring(endHeaders);
		
			// search header for Apple specific header					
			if ( header.search("X-Uniform-Type-Identifier: com.apple.mail-note") == -1 ) {
				alert(iOSNotesObj.bundle.GetStringFromName("noiOSNote"));
				throw new Error (iOSNotesObj.bundle.GetStringFromName("noiOSNote"));
				}	
				
			// check note length				
			var limit = iOSNotesObj.prefs.getIntPref("extensions.iOSNotes.editNote_maxchars");				
			if ( limit != -1 && note.length > limit) {
				alert(iOSNotesObj.bundle.GetStringFromName("noteTooLong"));
				throw new Error (iOSNotesObj.bundle.GetStringFromName("noteTooLong"));
				}
			
			// decode HTML
			note = iOSNotesObj.decode(note);							

			//textObj.value = cleanMSG;
			textObj.value = note;
			textObj.charset = converter.charset;
			window.openDialog('chrome://iOSNotes/content/editNote.xul',"","chrome,modal,centerscreen,resizable",textObj);
			if (textObj.cancel) { // user clicked on "Cancel" button
				iOSNotesObj.hdr = null;
				iOSNotesObj.folder = null;
				return;
			}
			var data = iOSNotesObj.cleanCRLF(textObj.value);				
			try {
				converter.charset = textObj.charset;
				data = converter.ConvertFromUnicode(data);
			}
			catch(e) {}							
			
			// encode note
			data = iOSNotesObj.encode(data);			
			// change date
			header = iOSNotesObj.changeDate(header, date);
			// get first line for note subject, note subject is always first line of text			
			var subject = data.match(/(.*?)<div>/);			
			header = header.replace(/Subject: *.*\r\n/, "Subject: "+subject[1]+"\r\n");			
			// combine header and html data
			data = header+data+"\r\n";
			
			// creates the temporary file, where the modified note body will be stored
			var tempFile = Components.classes["@mozilla.org/file/directory_service;1"].  
				getService(Components.interfaces.nsIProperties).  
				get("TmpD", Components.interfaces.nsIFile);  
			tempFile.append("HT.eml");
			tempFile.createUnique(0,0600);
			var foStream = Components.classes["@mozilla.org/network/file-output-stream;1"]
				.createInstance(Components.interfaces.nsIFileOutputStream);
			foStream.init(tempFile, 2, 0x200, false); // open as "write only"
			foStream.write(data,data.length);
			foStream.close();
					
			var flags =  iOSNotesObj.hdr.flags;
			var keys =  iOSNotesObj.hdr.getStringProperty("keywords");

			iOSNotesObj.list = Components.classes["@mozilla.org/array;1"].createInstance(Components.interfaces.nsIMutableArray);
			iOSNotesObj.list.appendElement(iOSNotesObj.hdr, false);
	
			// this is interesting: nsIMsgFolder.copyFileMessage seems to have a bug on Windows, when
			// the nsIFile has been already used by foStream (because of Windows lock system?), so we	
			// must initialize another nsIFile object, pointing to the temporary file
			var fileSpec = Components.classes["@mozilla.org/file/local;1"]
				.createInstance(Components.interfaces.nsIFile);
			fileSpec.initWithPath(tempFile.path);
			var fol = iOSNotesObj.hdr.folder;
			var extService = Components.classes['@mozilla.org/uriloader/external-helper-app-service;1']
				.getService(Components.interfaces.nsPIExternalAppLauncher)
			extService.deleteTemporaryFileOnExit(fileSpec); // function's name says all!!!
			iOSNotesObj.noTrash = ! (iOSNotesObj.prefs.getBoolPref("extensions.iOSNotes.putOriginalInTrash"))
			// Moved in copyListener.onStopCopy
			// iOSNotesObj.folder.deleteMessages(iOSNotesObj.list,null,noTrash,true,null,false);
			var cs = Components.classes["@mozilla.org/messenger/messagecopyservice;1"]
                     		 .getService(Components.interfaces.nsIMsgCopyService);
			cs.CopyFileMessage(fileSpec, fol, null, false, flags, keys, iOSNotesObj.copyListener, msgWindow);		
		},
	
         	onDataAvailable : function (aRequest, aContext, aInputStream, aOffset, aCount) {
				var scriptStream = Components.classes["@mozilla.org/scriptableinputstream;1"].
            	    createInstance().QueryInterface(Components.interfaces.nsIScriptableInputStream);
				scriptStream.init(aInputStream);
				iOSNotesObj.listener.text+=scriptStream.read(scriptStream.available());
	     }        
	},

	// copyFileMessage listener
	copyListener : {
		QueryInterface : function(iid) {
			if (iid.equals(Components.interfaces.nsIMsgCopyServiceListener) ||
			iid.equals(Components.interfaces.nsISupports))
			return this;

			throw Components.results.NS_NOINTERFACE;
			return 0;
		}, 
		GetMessageId: function (messageId) {},
		OnProgress: function (progress, progressMax) {},
		OnStartCopy: function () {},
		OnStopCopy: function (status) {
			if (status == 0) // copy done
				iOSNotesObj.folder.deleteMessages(iOSNotesObj.list,null,iOSNotesObj.noTrash,true,null,false);			
		},
		SetMessageKey: function (key) {
			// at this point, the note is already stored in local folders, but not yet in remote folders,
			// so for remote folders we use a folderListener
			if (iOSNotesObj.folder.server.type == "imap" || iOSNotesObj.folder.server.type == "news") {
				Components.classes["@mozilla.org/messenger/services/session;1"]
			            .getService(Components.interfaces.nsIMsgMailSession)
			            .AddFolderListener(iOSNotesObj.folderListener, Components.interfaces.nsIFolderListener.all);
				iOSNotesObj.folderListener.key = key;
				iOSNotesObj.folderListener.URI = iOSNotesObj.folder.URI;
			}
			else
				setTimeout(function() {iOSNotesObj.postActions(key);}, 500);
		} 
	},

	postActions : function(key) {
		gDBView.selectMsgByKey(key); // select note with modified header/source
		var hdr = iOSNotesObj.folder.GetMessageHeader(key);
		if (hdr.flags & 2) 
			iOSNotesObj.folder.addMessageDispositionState(hdr,0); //set replied if necessary
	        if (hdr.flags & 4096) 
			iOSNotesObj.folder.addMessageDispositionState(hdr,1); //set fowarded if necessary
	},

	// used just for remote folders
	folderListener  : { 
		OnItemAdded: function(parentItem, item, view) {
			try {
				var hdr = item.QueryInterface(Components.interfaces.nsIMsgDBHdr);
			} 
			catch(e) {
		             return;
			}
			if (iOSNotesObj.folderListener.key == hdr.messageKey && iOSNotesObj.folderListener.URI == hdr.folder.URI) {
				iOSNotesObj.postActions(iOSNotesObj.folderListener.key);
				// we don't need anymore the folderListener
				 Components.classes["@mozilla.org/messenger/services/session;1"]
		                	.getService(Components.interfaces.nsIMsgMailSession)
		                	.RemoveFolderListener(iOSNotesObj.folderListener);
			}            
		},
		OnItemRemoved: function(parentItem, item, view) {},
		OnItemPropertyChanged: function(item, property, oldValue, newValue) {},
		OnItemIntPropertyChanged: function(item, property, oldValue, newValue) {},
		OnItemBoolPropertyChanged: function(item, property, oldValue, newValue) {},
		OnItemUnicharPropertyChanged: function(item, property, oldValue, newValue){},
		OnItemPropertyFlagChanged: function(item, property, oldFlag, newFlag) {},
		OnItemEvent: function(folder, event) {}
	},
	
	init : function() {
		var shortcut = null;
		try {			
			shortcut = iOSNotesObj.prefs.getCharPref("extensions.iOSNotes.editNote_shortcut");			
		}
		catch(e) {}
		if (shortcut) {			
			var key1 = document.createElement("key");
			key1.setAttribute("key", shortcut);
			key1.setAttribute("modifiers", "control");
			key1.setAttribute("id", "iOSNotesKey");
			key1.setAttribute("command", "iOSIMAPNotesModifyContent");
			document.getElementById("iOSIMAPNotesKeyset").appendChild(key1);
			document.getElementById("iOSIMAPNotesModify1").setAttribute("key", "iOSNotesKey");
		}    
	}
};



