//Needed for compatibility with Thunderbird 31
if (typeof AddFileAttachment == "undefined") {
	var AddFileAttachment = function(file) {
		var arr = [];
		arr.push(FileToAttachment(file));
		AddAttachments(arr);
	};

	var AddUrlAttachment = function(attachment) {
		AddAttachments([attachment]);
	};
}

if (document.getElementById("attachmentBucketSize")) {
	var UpdateAttachmentBucketORIGINAL = updateAttachmentPane;
	updateAttachmentPane = function(aShowPane) {
		UpdateAttachmentBucketORIGINAL.apply(this,arguments);
		if (! attachExtraToolsObject.prefs.getBoolPref("extensions.attachextratools.realsize_show"))
			return;
		var atts = document.getElementById("attachmentBucket").childNodes;
		var realSize = 0;
		for (var i=0;i<atts.length;i++) {
			var attName = atts[i].attachment.name;
			var ext = attName.substring(attName.lastIndexOf(".")+1);
			if (ext != "txt" && ext != "xml" && ext != "eml" && ext != "html" && ext != "htm" && ext != "ini") 
				realSize += (atts[i].attachment.size * 1.4);
			else
				realSize += atts[i].attachment.size;
		}	
		document.getElementById("attachmentBucketSize").value = document.getElementById("attachmentBucketSize").value + " (" +  gMessenger.formatFileSize(realSize) + ")";
	}
}

var attachExtraToolsObject = {
	rootPath : null,
	filesArr : null,
	nsIFilesArr : null,
	dirArr : null,
	nsIFilePicker : Components.interfaces.nsIFilePicker,
	prefs : Components.classes["@mozilla.org/preferences-service;1"]
		.getService(Components.interfaces.nsIPrefBranch),

	bundle : Components.classes["@mozilla.org/intl/stringbundle;1"]
		.getService(Components.interfaces.nsIStringBundleService)
		.createBundle("chrome://attachtools/locale/attachtools.properties"),

	// credit for this code to Jorg K
	// see https://bugzilla.mozilla.org/show_bug.cgi?id=1427722
	openFPsync : function(fp) {
		let done = false;
		let rv, result;
		fp.open(result => {
			rv = result;
			done = true;
		});
		let thread = Components.classes["@mozilla.org/thread-manager;1"].getService().currentThread;
		while (!done) {
			thread.processNextEvent(true);
		}
		return rv;
	},

	move : function(offset) {
		var list = document.getElementById("attachmentBucket"); 
		var pos = list.selectedIndex;
		if ( (pos == 0 && offset > 0) || ( pos == (list.itemCount -1) && offset < 0) )
			return;
		var newpos = pos - offset;
		var item = list.removeItemAt(list.currentIndex);
		var newitem = list.insertItemAt(newpos,list.selectedItem.attachment);
		newitem.setAttribute("ondblclick", "goDoCommand('cmd_openAttachment')");
		list.selectedIndex = newpos;		
	},
	
	stripAtt: function(aMsgHdr) {
		if (attachExtraToolsObject.prefs.getBoolPref("extensions.attachextratools.select_send_folder"))
			gFolderTreeView.selectFolder(aMsgHdr.folder);
		MsgHdrToMimeMessage(aMsgHdr, null, function(aMsgHdr, aMsg) {
				var strip = false;
				for (var h in aMsg.headers) {                               
					if (h.toLowerCase().indexOf( "x-strip_attachments") > -1) {
							strip = true;
							break;
						}
					}
					if (! strip)
						return;	
					var attachments = aMsg.allAttachments.filter(function (x) {return x.isRealAttachment});
					var a1 = [];
					var a2 = [];
					var a3 = [];
					var a4 = [];
					var uri = aMsgHdr.folder.getUriForMsg(aMsgHdr);
					var messenger = Components.classes["@mozilla.org/messenger;1"].createInstance(Components.interfaces.nsIMessenger);
					for (var i=0;i<attachments.length;i++) {
						var att=attachments[i];
						if (att.contentType != "text/x-moz-deleted") {
							a1.push(att.contentType);
							a2.push(att.url);	
							a3.push(encodeURIComponent(att.name));
							a4.push(uri);						
						}
					}
					if (a1.length > 0) 
						messenger.detachAllAttachments(attachments.length, a1,a2,a3,a4,false,true);
		},true);
	},

	addZipDir : function(event) {
		if (event)
			event.stopPropagation();
		var fp = Components.classes["@mozilla.org/filepicker;1"].createInstance(attachExtraToolsObject.nsIFilePicker);
		fp.init(window, attachExtraToolsObject.bundle.GetStringFromName("addZipDirTitle") , attachExtraToolsObject.nsIFilePicker.modeGetFolder);
		fp.appendFilters(nsIFilePicker.filterAll);
		if (fp.show)
			var res=fp.show();
		else
			var res=attachExtraToolsObject.openFPsync(fp);
		if (res==attachExtraToolsObject.nsIFilePicker.returnOK) {
			attachExtraToolsObject.filesArr = [];
			attachExtraToolsObject.nsIFilesArr = [];
			attachExtraToolsObject.dirArr = [];
			var onefile=fp.file;
			attachExtraToolsObject.dirArr.push(onefile.leafName);
			var last = onefile.lastModifiedTime;
			attachExtraToolsObject.rootPath = onefile.parent.path.replace(/\\/g, "/") + "/";
			attachExtraToolsObject.scanDir(onefile);
			var zipName = prompt(attachExtraToolsObject.bundle.GetStringFromName("addZipPrompt"), "");
			var zipFile = Components.classes["@mozilla.org/file/directory_service;1"].  
				getService(Components.interfaces.nsIProperties).  
				get("TmpD", Components.interfaces.nsIFile);  
			zipFile.append(zipName+".zip");
			var zipWriter = Components.Constructor("@mozilla.org/zipwriter;1", "nsIZipWriter");  
			var zipW = new zipWriter();  
			zipW.open(zipFile, 0x04 | 0x08 | 0x20);
			for (var j=0;j<attachExtraToolsObject.dirArr.length;j++) 
				 zipW.addEntryDirectory(attachExtraToolsObject.dirArr[j],last,false);
			for (var i=0;i<attachExtraToolsObject.filesArr.length;i++) 
				zipW.addEntryFile(attachExtraToolsObject.filesArr[i], Components.interfaces.nsIZipWriter.COMPRESSION_DEFAULT, attachExtraToolsObject.nsIFilesArr[i], false);	
			zipW.close();
			AddFileAttachment(zipFile);
			attachExtraToolsObject.deleteTempFile(zipFile);
		}
	},
		
	scanDir : function(nsIDir) {
		var files = nsIDir.directoryEntries;
		while(files.hasMoreElements()) {
			var file= files.getNext();
			file.QueryInterface(Components.interfaces.nsIFile);
			var path = file.path.replace(/\\/g, "/");
			path = path.replace(attachExtraToolsObject.rootPath, "");
			if (file.isDirectory()) {
				attachExtraToolsObject.dirArr.push(path);
				attachExtraToolsObject.scanDir(file);
			}
			else {	
				attachExtraToolsObject.filesArr.push(path);
				attachExtraToolsObject.nsIFilesArr.push(file);
			}
		}		
	},

	deleteTempFile : function(file) {
		var extService = Components.classes['@mozilla.org/uriloader/external-helper-app-service;1']
			.getService(Components.interfaces.nsPIExternalAppLauncher)
		extService.deleteTemporaryFileOnExit(file);
	},

	addZipFiles : function(event) {
		if (event)
			event.stopPropagation();
		var fp = Components.classes["@mozilla.org/filepicker;1"].createInstance(attachExtraToolsObject.nsIFilePicker);
		var zipExists = false;
		fp.init(window, attachExtraToolsObject.bundle.GetStringFromName("addZipFilesTitle") , attachExtraToolsObject.nsIFilePicker.modeOpenMultiple);
		fp.appendFilters(attachExtraToolsObject.nsIFilePicker.filterAll);
		if (fp.show)
			var res=fp.show();
		else
			var res=attachExtraToolsObject.openFPsync(fp);
		if (res==attachExtraToolsObject.nsIFilePicker.returnOK) {
			// thefiles is the nsiSimpleEnumerator with the files selected from the filepicker
			var thefiles=fp.files;
			var container = "";
			while(thefiles.hasMoreElements()) {
				var onefile= thefiles.getNext();
				try {
					onefile = onefile.QueryInterface(Components.interfaces.nsILocalFile);
				}
				catch(e) {
					onefile = onefile.QueryInterface(Components.interfaces.nsIFile);
				}
				if (! zipExists) {
					var prompts = Components.classes["@mozilla.org/embedcomp/prompt-service;1"]  
						.getService(Components.interfaces.nsIPromptService);  
					var check = {value: false}; 
					var input = {value: ""}; 
					var zipName = prompts.prompt(null, attachExtraToolsObject.bundle.GetStringFromName("addZipName"), 
					attachExtraToolsObject.bundle.GetStringFromName("addZipPrompt") , input, 
					attachExtraToolsObject.bundle.GetStringFromName("addZipCheckbox"), check);  
					if (! zipName)
						return;
					var zipFile = Components.classes["@mozilla.org/file/directory_service;1"].  
						getService(Components.interfaces.nsIProperties).  
						get("TmpD", Components.interfaces.nsIFile);  
					zipFile.append(input.value+".zip");
					var zipWriter = Components.Constructor("@mozilla.org/zipwriter;1", "nsIZipWriter");  
					var zipW = new zipWriter();  
					zipW.open(zipFile, 0x04 | 0x08 | 0x20);  
					zipExists = true;
					if (check.value) {
						container = onefile.parent.leafName + "/";
						 zipW.addEntryDirectory(container,onefile.lastModifiedTime,false);
					}
				}
				zipW.addEntryFile(container+onefile.leafName, Components.interfaces.nsIZipWriter.COMPRESSION_DEFAULT, onefile, false);  		
			}
			zipW.close();
			AddFileAttachment(zipFile);
			attachExtraToolsObject.deleteTempFile(zipFile);
		}
	},

	attachMessages : function(event) {
		event.stopPropagation();
		var wm = Components.classes["@mozilla.org/appshell/window-mediator;1"]
		        .getService(Components.interfaces.nsIWindowMediator);
		var win = wm.getMostRecentWindow("mail:3pane");
		var messages = win.gFolderDisplay.selectedMessageUris;
		if (! messages) 
			return;
		for (var i=0;i<messages.length;i++) {
			var attachment = Components.classes["@mozilla.org/messengercompose/attachment;1"]
			.createInstance(Components.interfaces.nsIMsgAttachment);
			var mailurl = messages[i];
			attachment.url = mailurl;
			var hdr = win.messenger.msgHdrFromURI(mailurl);
			var subject = hdr.mime2DecodedSubject;
			if (Array.isArray)
				attachment.size = hdr.messageSize;
			if (subject == "")
				subject = "no_subject";
			if (hdr.flags & 0x0010) 
				subject = "Re: "+  subject;
			attachExtraToolsObject.addEmlAttachment(attachment,subject);
		}
	},
	
	addEmlAttachment : function(attachment,subject) {
		if (attachExtraToolsObject.prefs.getBoolPref("extensions.attachextratools.eml.use_original_name")) {
			subject = subject.replace(/[\x00-\x1F]/g,"_");
			subject = subject.replace(/[\/\\:,<>*\?\"\|]/g,"_");
			attachment.name = subject+".eml";
		}
		AddUrlAttachment(attachment);
	},

	attachFile : function(event) {
		event.stopPropagation();
		var pastedFile = false;
		try {
			var paths = null;
			var clip = Components.classes["@mozilla.org/widget/clipboard;1"]
				.getService(Components.interfaces.nsIClipboard);
			var trans = Components.classes["@mozilla.org/widget/transferable;1"]
				.createInstance(Components.interfaces.nsITransferable);
			if ('init' in trans)
	  			trans.init(null);
			var str = new Object();
			var strLength = new Object();
			trans.addDataFlavor("application/x-moz-file");
			trans.addDataFlavor("text/unicode");
			clip.getData(trans, clip.kGlobalClipboard);
			var data = new Object();
			var bestFlavor = new Object();
			var len = new Object();
			trans.getAnyTransferData(bestFlavor, str, len);
			if (bestFlavor.value == "text/unicode") {
				trans.getTransferData("text/unicode", str, strLength);
				if (str) {
					str = str.value.QueryInterface(Components.interfaces.nsISupportsString);
					paths = str.data.substring(0, strLength.value / 2);
				}
				if (paths) {
					paths = paths.replace(/\r/g, "");
					var pathArray = paths.split("\n");
					for (var i=0;i<pathArray.length;i++) {
						var file = Components.classes["@mozilla.org/file/local;1"].createInstance(Components.interfaces.nsIFile);
						file.initWithPath(pathArray[i]);
						if (file.exists() && file.isFile()) {
							AddFileAttachment(file);
							pastedFile = true;
						}
					}
				}
			}
			else {
				trans.getTransferData("application/x-moz-file", str, strLength);
				str = str.value.QueryInterface(Components.interfaces.nsIFile);
				AddFileAttachment(str);
				pastedFile = true;
			}			
		}
		catch(e) {}
		if (! pastedFile) 
			alert(attachExtraToolsObject.bundle.GetStringFromName("noAttachCopied2"));
	},

	attachAttachments : function(event) {
		event.stopPropagation();
		var urls = "";
		try {
			var urls = attachExtraToolsObject.prefs.getCharPref("extensions.attachextratools.url_attachment");
		}
		catch(e) {}		
		if (urls.length == 0) {
			alert(attachExtraToolsObject.bundle.GetStringFromName("noAttachCopied"));
			return;
		}			
		try {
			var urlArray = urls.split(" ");
			for (var i=0;i<urlArray.length;i++) {
				var attachment = Components.classes["@mozilla.org/messengercompose/attachment;1"]
					.createInstance(Components.interfaces.nsIMsgAttachment);
				attachment.url = urlArray[i];
				attachment.name = decodeURIComponent(urlArray[i].substring(urlArray[i].indexOf("&filename=")+10));
				if (Array.isArray) {
					var size = urlArray[i].substring(urlArray[i].indexOf("&size=")+6);
					attachment.size=size.substring(0,size.indexOf("&"));
				}
				AddUrlAttachment(attachment);	
			}
		}
		catch(e) {
			alert(attachExtraToolsObject.bundle.GetStringFromName("attachError"));
		}
		if (attachExtraToolsObject.prefs.getBoolPref("extensions.attachextratools.reset_copy_list"))
			attachExtraToolsObject.prefs.setCharPref("extensions.attachextratools.url_attachment","");

	},

	copyAttachments : function(event,all) {
		event.stopPropagation();
		var items = document.getElementById("attachmentList").childNodes;
		var urls = "";
		for (var i=0;i<items.length;i++) {
			if (! all && items.length > 1 && items[i].getAttribute("selected") != "true")
				continue;
			var url = items[i].attachment.url;
			if (Array.isArray)
				url=url.replace("&filename=", "&size="+items[i].attachment.size+"&filename=");
			if (urls == "")
				urls = url;
			else
				urls = urls+" "+url;
		}
		if (typeof Services != "undefined")
			Services.prefs.setCharPref("extensions.attachextratools.url_attachment", urls);
		else
			attachExtraToolsObject.prefs.setCharPref("extensions.attachextratools.url_attachment", urls);
	},

	favDir : function(event) {
		event.stopPropagation();
		var path = event.target.getAttribute("value");
		var origValue =  null;
		try {
			origValue = attachExtraToolsObject.getComplexPref("mail.compose.attach.dir");
		}
		catch(e) {}
		attachExtraToolsObject.setComplexPref("mail.compose.attach.dir", path);
		goDoCommand('cmd_attachFile');
		if (origValue) {
			setTimeout(function() {
				attachExtraToolsObject.setComplexPref("mail.compose.attach.dir", origValue); }, 300);
		}
	},
		
	fillPopup : function(popup) {
		if (popup && popup.hasChildNodes()) {
			var len = popup.childNodes.length;
			for (var i=len-3;i>-1;i--) {
				if (popup.childNodes[i].getAttribute("class") != "nodelete")
					popup.removeChild(popup.childNodes[i]);       
			}
		}
		var dirs = attachExtraToolsObject.getComplexPref("extensions.attachextratools.fav_directories");
		var separator = document.getElementById(popup.id+"sep");
		if (dirs.length > 0) {
			var dirArray = dirs.split(" ");
			for (var i=0;i<dirArray.length;i++) {
				if (i == 5)
					break;
				var item = document.createElement("menuitem");
				var dir  = decodeURIComponent(dirArray[i]);
				if (navigator.platform.toLowerCase().indexOf("win") > -1)
					var sep = "\\";
				else
					var sep = "/"
				item.setAttribute("label", dir.substring(dir.lastIndexOf(sep)+1));
				item.setAttribute("value", dir);
				item.setAttribute("accesskey", i.toString());
				item.setAttribute("tooltiptext", dir);
				item.setAttribute("oncommand", "attachExtraToolsObject.favDir(event)");
				popup.insertBefore(item,separator);
			}
		}
		else {
			var item = document.createElement("menuitem");
			item.setAttribute("label", attachExtraToolsObject.bundle.GetStringFromName("noFavFolder"));
			item.setAttribute("disabled", "true");
			item.setAttribute("id", "attachExtraToolsNoElement");
			item.setAttribute("style", "font-style:italic");
			popup.insertBefore(item,separator);
		}
	},
	
	removeNoElement : function() {
		var noEl = document.getElementById("attachExtraToolsNoElement");
		if (noEl)
			noEl.parentNode.removeChild(noEl);			
	},

	maxSize : function(event) {
		event.stopPropagation();
		var limit = attachExtraToolsObject.prefs.getIntPref("mailnews.message_warning_size");
		limit = limit/1048576;
		var text = attachExtraToolsObject.bundle.GetStringFromName("maxSizePrompt1");
		var newLimit = prompt(text, limit); 
		newLimit = newLimit * 1048576;
		if (newLimit > 0)
			attachExtraToolsObject.prefs.setIntPref("mailnews.message_warning_size", newLimit);
	},

	setComplexPref : function(prefname,value) {
		if (attachExtraToolsObject.prefs.setStringPref) {
			attachExtraToolsObject.prefs.setStringPref(prefname,value);
		}
		else {
			var str = Components.classes["@mozilla.org/supports-string;1"]
				.createInstance(Components.interfaces.nsISupportsString);
			str.data = value;
			attachExtraToolsObject.prefs.setComplexValue(prefname, Components.interfaces.nsISupportsString, str);
		}
	},

	getComplexPref : function(prefname) {
		var value;
		if (attachExtraToolsObject.prefs.getStringPref) 
			value = attachExtraToolsObject.prefs.getStringPref(prefname);
		else
			value = attachExtraToolsObject.prefs.getComplexValue(prefname,Components.interfaces.nsISupportsString).data;
		return value;
	},

	openList : function(event) {
		event.stopPropagation();
		openDialog("chrome://attachtools/content/preferences.xul", "", "chrome,modal,centerscreen", true);
	}
};



