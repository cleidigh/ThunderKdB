if ("undefined" == typeof(ImapAclExt)) {
	var ImapAclExt = {};
};
if ("undefined" == typeof(ImapAclExt.AclOverview)) {
  ImapAclExt.AclOverview = {	  
	Cc : Components.classes,
	Cu : Components.utils,
	Ci : Components.interfaces, 
	_pref : null,
	_stringBundle : null,
	_folderList : null,
	_doc : null,
	_folderCounter : 0,
	_returnCounter : 0,

	init : function() {
		this.Cu.import("resource:///modules/iteratorUtils.jsm");
		this._stringBundle = document.getElementById("acloverview-bundle");
		this._pref = this.Cc['@mozilla.org/preferences-service;1']
					.getService(this.Ci.nsIPrefBranch);
		this._folderList = document.getElementById("folder_list");
		this._doc = document;
		
		this.buildList();
	},

	buildList : function() {
		document.getElementById("status_label").value = this._stringBundle.getString("loading") + " 0/0";
		document.getElementById("folderProgress").value = 0;
		document.getElementById("folderProgress").hidden = false;
		
		var gAccountManager = Components.classes["@mozilla.org/messenger/account-manager;1"].getService(Components.interfaces.nsIMsgAccountManager);
		var folders = new Array();
		
		for (let account of fixIterator(gAccountManager.accounts, this.Ci.nsIMsgAccount)) {
			var incomingServer = account.incomingServer.QueryInterface(Components.interfaces.nsIMsgIncomingServer);
			var root = incomingServer.rootFolder.QueryInterface(Components.interfaces.nsIMsgFolder);
			if (incomingServer.type == "imap" && root.hasSubFolders) {
				
				var rootFolder = root.QueryInterface(Components.interfaces.nsIMsgImapMailFolder);
				
				if (rootFolder.canOpenFolder && incomingServer.realUsername.length > 0 && incomingServer.password.length > 0) {
					var folderForAcc = new Array();
					
					// SG, 07.10.2015 - TB24 changed from nsISupportsArray to nsIMutableArray, and fix typo ListDescendants
					//                  https://developer.mozilla.org/en-US/docs/Mozilla/Thunderbird/Releases/24
					//let allFolders = this.Cc["@mozilla.org/supports-array;1"].createInstance(this.Ci.nsISupportsArray);
					let allFolders = this.Cc["@mozilla.org/array;1"].createInstance(this.Ci.nsIMutableArray);
					rootFolder.ListDescendants(allFolders);
					//window.alert(allFolders.length);
					//window.alert(allFolders.Count());
				
					for (let folder of fixIterator(allFolders, this.Ci.nsIMsgFolder)) {
						var imapF = folder.QueryInterface(Components.interfaces.nsIMsgImapMailFolder);
						
						if (imapF.canOpenFolder) {
						//if (imapF.getPermissionsForUser(imapF.server.realUsername).indexOf("a") != -1) {
							folderForAcc.push(imapF);
						//}
						} else {
							//window.dump(imapF.URI + " // " + imapF.canOpenFolder +  "\n");
						}
					}
					folders.push(folderForAcc);
				} else {
					var r = new Array();
					r.push(root.name);
					this.buildAclListCB(this, r, this._stringBundle.getString("noConnect"));
				}	
			} else {
				var r = new Array();
				r.push(root.name);
				this.buildAclListCB(this, r, this._stringBundle.getString("noImap"));
			}
		}
		
		this._folderCounter = folders.length;
		this._returnCounter = 0;
		
		for (var i = 0; i < folders.length; ++i) {
			var foldersArray = folders[i];
			foldersArray.sort(this.folderSort);

			ImapAclExt.Utils.check(foldersArray, this.buildAclListCB, this);
		}
		
		document.getElementById("status_label").value = this._stringBundle.getString("loading") + this._returnCounter + " /" + this._folderCounter;
	},

	folderSort : function (a, b) {
		if (a.server.rootFolder.name == b.server.rootFolder.name)
			return a.onlineName > b.onlineName;
		else
			return a.server.rootFolder.name > b.server.rootFolder.name
	},

	buildAclListCB : function(cbSender, rights, imapFolder) {
		//++cbSender._returnCounter;
		//cbSender._doc.getElementById("folderProgress").value = cbSender._returnCounter/cbSender._folderCounter*100;
		
		//window.dump(cbSender._returnCounter + "\n");
		//window.dump("buildAclListCB: " + imapFolder.server.rootFolder.name + "/" + imapFolder.onlineName + "\n");
		if (rights == "") {
			//window.dump("buildAclListCB: empty rights");
		} else if (rights == undefined) {
			cbSender._doc.getElementById("status_label").value = cbSender._stringBundle.getString("loadingFailed");
		} else {
			for (var i=0; i<rights.length;++i) {
				var accNameCell = cbSender._doc.createElement("listcell");
				var folderNameCell = cbSender._doc.createElement("listcell");
				var usernameCell = cbSender._doc.createElement("listcell");
				var aclstringCell = cbSender._doc.createElement("listcell");
				var item = cbSender._doc.createElement("listitem");
				item.Cname = "aclRightsListItemName";
				
				if (imapFolder != null && !(typeof(imapFolder) == 'string')) {
					var username = rights[i].username;
					var aclstring = rights[i].permissions;
				
					accNameCell.setAttribute("label", imapFolder.server.rootFolder.name);
					folderNameCell.setAttribute("label", imapFolder.onlineName);
					folderNameCell.setAttribute("tooltiptext", imapFolder.onlineName);
					
					usernameCell.setAttribute("label", username);
					aclstringCell.setAttribute("label", aclstring);
					aclstringCell.setAttribute("cvalue", aclstring);

				
					item.value = username;
					//window.dump(ImapAclExt.Debug.var_dump(rights));
					item.aclValue = rights[i];
					item.imapFolder = imapFolder;
				} else {
					accNameCell.setAttribute("label", rights[0]);
					folderNameCell.setAttribute("label", imapFolder);
					folderNameCell.setAttribute("style", "color: red;");
					item.imapFolder = null;
				}
				
				item.appendChild(accNameCell);
				item.appendChild(folderNameCell);
				item.appendChild(usernameCell);
				item.appendChild(aclstringCell);

				cbSender._folderList.appendChild(item);
			}
		}
		
		if (cbSender._returnCounter == cbSender._folderCounter) {
			cbSender._doc.getElementById("status_label").value = cbSender._stringBundle.getString("loadingDone");
			cbSender._doc.getElementById("folderProgress").hidden = true;
		} else {
			cbSender._doc.getElementById("status_label").value = cbSender._stringBundle.getString("loading") + cbSender._returnCounter + " /" + cbSender._folderCounter;
		}
		
		
	},

	refresh : function() {
		//document.getElementById("status_label").value = this._stringBundle.getString("loading");
		//this.buildList();
		var items = this._folderList.childNodes;
		//window.dump(this._userList.childNodes.length);
		for (var i=items.length-1;i>0;--i) {
			//window.dump("found: " + items[i].value + "\n");
			if (("Cname" in items[i]) && items[i].Cname == "aclRightsListItemName") {
			//	window.dump("removed" + items[i].value + "\n");
				items[i].parentNode.removeChild(items[i]); //items[i].hidden = true;
			}
		}
		this._folderCounter = 0;
		this._returnCounter = 0;
		this.buildList();
		//document.getElementById("status_label").value =  this._stringBundle.getString("loadingDone");
	},

	click : function(event) {
		// we only care about button 0 (left click) double click events
		if (event.button != 0 || event.detail != 2 || event.originalTarget.localName != "listitem")
		    return;
		this.change();
	},

	change : function() {
		if (this._folderList.selectedIndex == -1) {
			window.alert(this._stringBundle.getString("noEntry"));
			return "true";
		} else if (this._folderList.selectedItem.imapFolder == null) {
			return "true";
		}
		
		

		var aclstring = new Object();
		var username = new Object();

		if (this._pref.getBoolPref("extensions.ImapAclExt.advMode")) {
			window.openDialog("chrome://imapaclext/content/changeAcl.xul", "changeAcl", 
				"modal=yes,dialog=yes,centerscreen=yes,resizable=no,height=430,width=300", 
				this._folderList.selectedItem.aclValue, aclstring, username, this._folderList.selectedItem.imapFolder);
		} else {
			window.openDialog("chrome://imapaclext/content/changeAcl.xul", "changeAcl", 
				"modal=yes,dialog=yes,centerscreen=yes,resizable=no,height=180,width=300", 
				this._folderList.selectedItem.aclValue, aclstring, username, this._folderList.selectedItem.imapFolder);		
		}
		
		if (!("value" in aclstring) || aclstring.value != "Cancel") {
			this.refresh();
		}
		
		//useless, but avoids warning:
		return true;
	},

	cnew : function() {
		var aclstring = new Object();
		var username = new Object();
		
		if (this._pref.getBoolPref("extensions.ImapAclExt.advMode")) {
			window.openDialog("chrome://imapaclext/content/changeAcl.xul", "changeAcl", 
			"modal=yes,dialog=yes,centerscreen=yes,resizable=yes,height=430,width=300", 
			-1, aclstring, username, window.arguments[0]);
		} else {
			window.openDialog("chrome://imapaclext/content/changeAcl.xul", "changeAcl", 
			"modal=yes,dialog=yes,centerscreen=yes,resizable=yes,height=180,width=300", 
			-1, aclstring, username, window.arguments[0]);		
		}
		
		if (aclstring.value != "Cancel") {
			this.refresh();
		}
	},

	del : function() {
		

		if (this._folderList.selectedIndex == -1) {
			window.alert(this._stringBundle.getString("noEntry"));
			return "true";
		} else if (this._folderList.selectedItem.imapFolder == null) {
			return "true";
		}
			
		document.getElementById("status_label").value = this._stringBundle.getString("loading");	
			
		var q = this._stringBundle.getString("delRights") + ": " +
			this._folderList.selectedItem.aclValue.username + " on " + "\n" + this._folderList.selectedItem.imapFolder.onlineName + "?";
		
		var check = confirm(q);
		if (check == true) {
			ImapAclExt.Utils.delAcl(this._folderList.selectedItem.imapFolder, this._folderList.selectedItem.aclValue.username, 
					document.getElementById("recursion").checked, this.delCB, this);
		} else {
			document.getElementById("status_label").value = this._stringBundle.getString("loadingDone");
		}
		
		//useless, but avoids warning:
		return true;
	},
	delCB : function (cbSender, result) {
		if (result != "success") {
			if (result == "noAclRight") {
				alert(this._stringBundle.getString("noAclRight"));
			} else {
				alert(result);
			}
		}
		cbSender.refresh();
		if ("_stringBundle" in this) {
			cbSender._doc.getElementById("status_label").value = this._stringBundle.getString("loadingDone");
		}
	},
	cancel : function () {
		if (this._returnCounter != this._folderCounter) {
			//window.dump("cancel aborted");
			//return false;
		}
	},
	accept : function() {
		if (this._returnCounter != this._folderCounter) {
			//window.dump("accept aborted");
			//return false;
		}
	}
  };
};
