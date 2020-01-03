var showFolderSize = {

	redAlert : null,
	foldArray : null,
	//prefs : Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefBranch),
	prefs : {
		orgPrefs : Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefBranch),
		getBoolPref: function(key){
			try{
				var tmpVal = this.orgPrefs.getBoolPref(key);
				if(tmpVal || tmpVal === "true"){
					return true;
				}else{
					return false;
				}
			}catch(e){
				return false;
			}
		},
		getIntPref: function(key){
			try{
				return this.orgPrefs.getIntPref(key);
			}catch(e){
				return 0;
			}
		},
		getCharPref: function(key){
			try{
				return this.orgPrefs.getCharPref(key);
			}catch(e){
				return "";
			}
		},
	},
	bundle : null,

	formatBytes : function (foldsize,setAlert) {
		if (foldsize == 0)
			return "0.00 KB";
		var unit = " KB";
		foldsize = foldsize/1024;
		var foldertoobig = showFolderSize.prefs.getIntPref("extensions.foldersize.file_too_big.mb");
		if (foldsize > 1024) {
				foldsize = foldsize/1024;
				unit = " MB";
				if (foldsize > foldertoobig && setAlert)
					showFolderSize.redAlert = true;	
			}
		if (foldsize > 1024) {
				foldsize = foldsize/1024;
				unit = " GB";
		}
		// Cut the string so we have just two decimal units
		var foldsizestr = new String(foldsize);
		var reg = /.+\..{0,2}/;
		var foldsizestr00 = reg.exec(foldsizestr);
		return foldsizestr00+unit;
	},

	getFolSize : function(msgFolder) {
		showFolderSize.redAlert = false;
		var unit = " KB";
		var folderfile = msgFolder.filePath;
		if (folderfile.exists() && folderfile.fileSize) {
			var foldsize = folderfile.fileSize;
			var foldsizestr00 = showFolderSize.formatBytes(foldsize,true);
		}
		else
			var foldsizestr00 = "0.00 KB";
		if (showFolderSize.prefs.getBoolPref("extensions.foldersize.imap.show_remote_size") && msgFolder.server.type == "imap") {
			if (msgFolder.sizeOnDisk > 0)
				foldsizestr00 = foldsizestr00 + " (" + showFolderSize.formatBytes(msgFolder.sizeOnDisk, false) + ")";
			else
				foldsizestr00 = foldsizestr00 + " (0.00 KB)";
		}
		return foldsizestr00;
	},

	getLabel : function(shortlabel) {
		// The label "Size" is taken from messenger.properties, so that the extension is localized automatically
		// In statusbar panel the label is cut at 4 chars, because otherwise it could be too big
		//var strBSer = Components.classes["@mozilla.org/intl/stringbundle;1"].
		//	getService(Components.interfaces.nsIStringBundleService);
		//var thisbundle = strBSer.createBundle("chrome://messenger/locale/messenger.properties");
		var thisbundle = Services.strings.createBundle("chrome://messenger/locale/messenger.properties");
		var sizelabel = thisbundle.GetStringFromName("sizeColumnHeader");
		if (shortlabel && sizelabel.length > 4)
			sizelabel = sizelabel.substring(0,3)+".";
		return sizelabel;		
	},

	writeStatusBar : function() {
		var msgFolder = GetSelectedMsgFolders()[0];
		document.getElementById("folderSizeLabel").value = showFolderSize.getFolSize(msgFolder);
		if (showFolderSize.redAlert) {
			//document.getElementById("folderSizeLabel").style.color="red";
			document.getElementById("folderSizeLabel").style.color = showFolderSize.prefs.getCharPref("extensions.foldersize.warningColor");
			document.getElementById("folderSizeLabel").setAttribute("tooltip", "folderSizeTip1");
		}
		else {
			document.getElementById("folderSizeLabel").removeAttribute("style");
			document.getElementById("folderSizeLabel").setAttribute("tooltip", "folderSizeTip2");
		}
		showFolderSize.busy = false;
		if (msgFolder.server.type == "imap" && showFolderSize.prefs.getBoolPref("extensions.foldersize.imap.show_quota")) 
			document.getElementById("folderSizeQuota").removeAttribute("collapsed");
		else
			document.getElementById("folderSizeQuota").collapsed = true;
	},		

	CreateDbObserver : {
		observe: function(aMsgFolder, aTopic, aData){
			showFolderSize.writeStatusBar();
			showFolderSize.showExpBytes();
		}
	},
	
	initMainWinOverlay : function() {
		var hidestatusbarpanel = showFolderSize.prefs.getBoolPref("extensions.foldersize.hide.statusbar_panel");
		if (hidestatusbarpanel) {
			document.getElementById("folderSizePanel").hidden = true;
			return;
		}
		// This is for every other events, i.e. the function is called every time the view in message panel changes
		var ObserverService = Components.classes["@mozilla.org/observer-service;1"]
			.getService(Components.interfaces.nsIObserverService);
		ObserverService.addObserver(showFolderSize.CreateDbObserver, "MsgCreateDBView", false);
		var nsIFolderListener = Components.interfaces.nsIFolderListener;
		var notifyFlags = Components.interfaces.nsIFolderListener.all;
		var mailSession = Components.classes["@mozilla.org/messenger/services/session;1"].getService(Components.interfaces.nsIMsgMailSession);
		mailSession.AddFolderListener(showFolderSize.sizeListener, notifyFlags);
		if (showFolderSize.prefs.getBoolPref("extensions.foldersize.startup.check"))
			setTimeout(showFolderSize.checkAll,5000,true);
		// var folderBox = document.getElementById("folderPaneBox");
		// if (folderBox)
		// 	folderBox.addEventListener("DOMAttrModified", showFolderSize.folderBox, false);
		//var strBSer = Components.classes["@mozilla.org/intl/stringbundle;1"]
		//	.getService(Components.interfaces.nsIStringBundleService);
		//showFolderSize.bundle = strBSer.createBundle("chrome://foldersize/locale/foldersize.properties");
		showFolderSize.bundle = Services.strings.createBundle("chrome://foldersize/locale/foldersize.properties");
		var tabmail = document.getElementById("tabmail");
		if (tabmail)
			tabmail.tabContainer.addEventListener("DOMAttrModified", showFolderSize.tabSelected, false);
		var newTabMail = document.getElementById("tabcontainer");
		if (newTabMail)
			newTabMail.addEventListener("DOMAttrModified", showFolderSize.tabSelected, false);
	},

	tabSelected : function(e) {
		if (! showFolderSize.busy && e.attrName == "selected") {
			showFolderSize.busy = true;
			setTimeout(function() {
				showFolderSize.writeStatusBar();
				showFolderSize.showExpBytes();
			}, 500);
		}
	},

	checkAll : function(loading) {
		// Initialize the folders array
		showFolderSize.foldArray = [];
		var acctMgr = Components.classes["@mozilla.org/messenger/account-manager;1"]
			.getService(Components.interfaces.nsIMsgAccountManager);  
		var accounts = acctMgr.accounts;
		var maxSize = showFolderSize.prefs.getIntPref("extensions.foldersize.file_too_big.mb");
		// In TB20 and higher "accounts" is a nsIArray object, in lower versions it's a nsISupportsArray object
		if (accounts.length) {
			var len = accounts.length;
			var query_lower_case = true;
		}
		else {
			var len = accounts.Count();	
			var query_lower_case = false;
		}
		for (var i = 0; i < len; i++) {
			// nsIArray wants queryElementAt and nsISupportsArray QueryElementAt...
			if (query_lower_case)
				var account = accounts.queryElementAt(i, Components.interfaces.nsIMsgAccount); 
			else
				var account = accounts.QueryElementAt(i, Components.interfaces.nsIMsgAccount); 
			var rootFolder = account.incomingServer.rootFolder; // nsIMsgFolder 
			var accName  = account.incomingServer.prettyName;
			// Shorthand to test if it's TB3 or lower: String object
			// has "trim" method just in Gecko 1.9.1 or higher
			if (String.trim)
				showFolderSize.getAllSubFoldersTB3(rootFolder,account.toString(),accName,maxSize);
			else
				showFolderSize.getAllSubFolders(rootFolder,account.toString(),accName,maxSize);
		}
		if (showFolderSize.foldArray.length > 0) {
			var text = showFolderSize.bundle.GetStringFromName("checkAll1")+"\n\n" + showFolderSize.foldArray.join("\n");
			alert(text);
		}
		else if (! loading) {
			alert(showFolderSize.bundle.GetStringFromName("checkAll2"));
		}		
	},

	getAllSubFolders : function(rootFolder,key,accName,maxSize) {
		if (rootFolder.hasSubFolders) {
			//var subFolders = rootFolder.GetSubFolders();
			let subFolders = rootFolder.subFolders;
			try {
				subFolders.first();
				do {
					var data = subFolders.currentItem();
					var folder = data.QueryInterface(Components.interfaces.nsIMsgFolder);
					var file = folder.filePath;
					if (file.exists()) {
						// file size in MB
						var fileSize =  file.fileSize / 1048576;
						if (fileSize > maxSize) {
							var foldsizestr = new String(fileSize);
							var reg = /.+\..{0,2}/;
							var foldsizestr00 = reg.exec(foldsizestr);
							showFolderSize.foldArray.push(accName + " : " +folder.name+" ("+foldsizestr00+" MB)");		
						}
					}
					if (folder.hasSubFolders)
						showFolderSize.getAllSubFolders(folder,key,accName,maxSize);
					subFolders.next();
				} while( Components.lastResult == 0 );	
			} catch(e) {}
		}
	},
	
	getAllSubFoldersTB3 : function(rootFolder,key,accName,maxSize) {
		if (rootFolder.hasSubFolders) {
			var subfolders = rootFolder.subFolders;
			while(subfolders.hasMoreElements())  {
				var next = subfolders.getNext();
				var folder = next.QueryInterface(Components.interfaces.nsIMsgFolder);
				var file = folder.filePath;
				if (file.exists()) {
					// file size in MB
					var fileSize =  file.fileSize / 1048576;
					if (fileSize > maxSize) {
						var foldsizestr = new String(fileSize);
						var reg = /.+\..{0,2}/;
						var foldsizestr00 = reg.exec(foldsizestr);
						showFolderSize.foldArray.push(accName + " = " +folder.name+" ("+foldsizestr00+" MB)");		
					}
				}
				if (folder.hasSubFolders)
					showFolderSize.getAllSubFoldersTB3(folder,key,accName,maxSize);
			}
		}
	},

	loadFolderSize : function() {
		var label = document.createElement("label");
		var labvalue = showFolderSize.getLabel(false)+": "+showFolderSize.getFolSize(gMsgFolder);
		label.setAttribute("value", labvalue);
		var nameBox = document.getElementById("nameBox");
		nameBox.parentNode.insertBefore(label,nameBox);
		if (window.location.href == "chrome://messenger/content/folderProps.xul")
			window.sizeToContent();
	},

	showExpBytes : function() {
		var msgFolder = GetSelectedMsgFolders()[0];
		var expBytes = msgFolder.expungedBytes;
		var lab = showFolderSize.formatBytes(expBytes,false);
		var expLabel = showFolderSize.bundle.GetStringFromName("expBytesLabel");
		document.getElementById("explabel1").value = expLabel.replace("%s", lab);
		document.getElementById("explabel2").value = expLabel.replace("%s", lab);
	},

	openOptions : function() {
		openDialog("chrome://foldersize/content/foldersizeOptions.xul","","chrome=yes,modal=yes,centerscreen=yes");
	},

	compact : function() {
		if (typeof MsgCompactFolder == "undefined")
			gFolderTreeController.compactFolders();
		else
			MsgCompactFolder(false);
		showFolderSize.writeStatusBar();
		showFolderSize.showExpBytes();
	},
	
	sizeListener : {
		OnItemAdded: function(parentItem, item, view) {
			showFolderSize.writeStatusBar();		
		},
		OnItemRemoved: function(parentItem, item, view) { 
			showFolderSize.showExpBytes();
		},
		OnItemPropertyChanged: function(parent, item, viewString) {},
		OnItemIntPropertyChanged: function(item, property, oldValue, newValue) {},
		OnItemBoolPropertyChanged: function(item, property, oldValue, newValue) {},
		OnItemUnicharPropertyChanged: function(item, property, oldValue, newValue) {},
		OnItemPropertyFlagChanged: function(item, property, oldFlag, newFlag) {},
		OnFolderLoaded: function(aFolder) { },
		OnDeleteOrMoveMessagesCompleted: function( aFolder) {},
		OnItemEvent: function(item, event) {
			if (event == "FolderLoaded") {
				var msgFolder = GetSelectedMsgFolders()[0];
				/*if (msgFolder.server.type != "imap" || ! showFolderSize.prefs.getBoolPref("foldersize.imap.show_quota")) {
					document.getElementById("folderSizeQuota").collapsed = true;
					return;
				}*/
				if (msgFolder && msgFolder.server.type == "imap") {
					var imapFolder = msgFolder.QueryInterface(Components.interfaces.nsIMsgImapMailFolder);
					if (imapFolder)
						imapFolder.fillInFolderProps(showFolderSize.propsSink);
				}
			}
		}
	},

	propsSink : {
		setFolderType: function(folderTypeString) {},
		setFolderTypeDescription: function(folderDescription) {},
		setFolderPermissions: function(folderPermissions) {},
		serverDoesntSupportACL : function() {},
		setQuotaStatus : function(folderQuotaStatus) {},
		showQuotaData : function(showData) {},
		setQuotaData : function(root, usedKB, maxKB) {
			var percent = Math.round((usedKB/maxKB)*100) + "%";
			var fsq = document.getElementById("folderSizeQuota");
			fsq.value = showFolderSize.bundle.GetStringFromName("quota")+percent;
			if (percent > 79)
				//fsq.style.color="red";
				fsq.style.color = showFolderSize.prefs.getCharPref("extensions.foldersize.warningColor");
			else
				fsq.removeAttribute("style");
			fsq.removeAttribute("collapsed");
			document.getElementById("explabel3").value = showFolderSize.bundle.GetStringFromName("quotaDetails").replace("%1", usedKB).replace("%2", maxKB);
		}
	}
};
