if ("undefined" == typeof(ImapAclExt)) {
	var ImapAclExt = {};
};
if ("undefined" == typeof(ImapAclExt.Aclist)) {
  ImapAclExt.Aclist = {	  
	Cc : Components.classes,
	Ci : Components.interfaces, 
	_pref : null,
	_stringBundle : null,
	_userList : null,
	_rights : null,
	_doc : null,

	init : function() {
		this._stringBundle = document.getElementById("acls-bundle");
		this._pref = this.Cc['@mozilla.org/preferences-service;1']
					.getService(this.Ci.nsIPrefBranch);
		this._userList = document.getElementById("user_list");
		this._doc = document;
		this.buildList();
	},

	buildList : function() {
		document.getElementById("status_label").value = this._stringBundle.getString("loading");

		var imapFolder = window.arguments[0];

		if (imapFolder.onlineName.indexOf("\"") >= 0) {
			window.alert(this._stringBundle.getString("canthandleFolder"));
			document.getElementById("user_list_dialog").cancelDialog();
		}

		var folderDisplayName = imapFolder.server.rootFolder.name + ": " + imapFolder.onlineName;
		if (imapFolder.onlineName.length > 30) {
			folderDisplayName = imapFolder.server.rootFolder.name + ": " + imapFolder.onlineName.substr(0,30) + "...";
		}
		document.getElementById("foldername_label").value = folderDisplayName;

		ImapAclExt.Utils.check(imapFolder, this.buildAclListCB, this);
	},

	buildAclListCB : function(cbSender, rights) {
		cbSender._rights = rights;

		if (cbSender._rights == undefined) {
			cbSender._doc.getElementById("status_label").value = cbSender._stringBundle.getString("loadingFailed");
		} else {
			for (var i=0; i<cbSender._rights.length;++i) {
				var username = cbSender._rights[i].username;
				var aclstring = cbSender._rights[i].permissions;
			
				var usernameCell = cbSender._doc.createElement("listcell");
				var aclstringCell = cbSender._doc.createElement("listcell");
		
				usernameCell.setAttribute("label", username);
				aclstringCell.setAttribute("label", aclstring);
				aclstringCell.setAttribute("cvalue", aclstring);

				var item = cbSender._doc.createElement("listitem");
				item.Cname = "aclRightsListItemName";
				item.value = username;
				item.appendChild(usernameCell);
				item.appendChild(aclstringCell);

				cbSender._userList.appendChild(item);
			}

			//cbSender._doc.getElementById("status_label").value = this._stringBundle.getString("loadingDone");
			if (("_stringBundle" in cbSender)) {
				cbSender._doc.getElementById("status_label").value = cbSender._stringBundle.getString("loadingDone");
			} else if (("getString" in cbSender._doc.getElementById("acls-bundle"))) {
				cbSender._doc.getElementById("status_label").value = cbSender._doc.getElementById("acls-bundle").getString("loadingDone");
			}
		}
	},
	
	refresh : function() {
		document.getElementById("status_label").value = this._stringBundle.getString("loading");
		//this.buildList();
		var items = this._userList.childNodes;
		//window.dump(this._userList.childNodes.length);
		for (var i=items.length-1;i>0;--i) {
			//window.dump("found: " + items[i].value + "\n");
			if (("Cname" in items[i]) && items[i].Cname == "aclRightsListItemName") {
			//	window.dump("removed" + items[i].value + "\n");
				items[i].parentNode.removeChild(items[i]); //items[i].hidden = true;
			}
		}
		this.buildList();
		document.getElementById("status_label").value =  this._stringBundle.getString("loadingDone");
	},

	click : function(event) {
        // we only care about button 0 (left click) double click events
		if (event.button != 0 || event.detail != 2 || event.originalTarget.localName != "listitem")
		    return;
		this.change();
	},

	change : function() {
		var selected = this._userList.selectedIndex;
		
		if (selected == -1) {
			window.alert(this._stringBundle.getString("noEntry"));
			return;// "true";
		}

		var aclstring = new Object();
		var username = new Object();

		if (this._pref.getBoolPref("extensions.ImapAclExt.advMode")) {
			window.openDialog("chrome://imapaclext/content/changeAcl.xul", "changeAcl", 
				"modal=yes,dialog=yes,centerscreen=yes,resizable=no,height=430,width=300", 
				this._rights[selected], aclstring, username, window.arguments[0]);
		} else {
			window.openDialog("chrome://imapaclext/content/changeAcl.xul", "changeAcl", 
				"modal=yes,dialog=yes,centerscreen=yes,resizable=no,height=180,width=300", 
				this._rights[selected], aclstring, username, window.arguments[0]);		
		}
		
		if (!("value" in aclstring) || aclstring.value != "Cancel") {
			this.refresh();
		}
		
		//useless, but avoids warning:
		//return true;
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
		
		if (!("value" in aclstring) || aclstring.value != "Cancel") {
			this.refresh();
		}
	},

	del : function() {
		document.getElementById("status_label").value = this._stringBundle.getString("loading");
		var selected = this._userList.selectedIndex;

		if (selected == -1) {
			window.alert(this._stringBundle.getString("noEntry"));
			return "true";
		}
				
		var q = this._stringBundle.getString("delRights") + ": " + 
					this._rights[selected].username + "?";
		
		var check = confirm(q);
		if (check == true) {
			ImapAclExt.Utils.delAcl(window.arguments[0], this._rights[selected].username, 
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
		cbSender._doc.getElementById("status_label").value = cbSender._stringBundle.getString("loadingDone");
	},
	cancel : function () {
		window.arguments[1].value = "Cancel";
	},
	onOverviewButtonCommand : function(aEvent) {
	  window.openDialog("chrome://imapaclext/content/aclOverview.xul", "aclOverview", "modal=yes,dialog=yes,centerscreen=yes,resizable=yes");
	}
  };
};
