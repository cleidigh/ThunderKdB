if ("undefined" == typeof(ImapAclExt)) {
	var ImapAclExt = {};
};
if ("undefined" == typeof(ImapAclExt.ChangeAcl)) {
  ImapAclExt.ChangeAcl = {	
	Cc : Components.classes,
	Ci : Components.interfaces,
	_pref : null,
	_stringBundle : null,
	_doc : null,
	_forceClose : false,

	init : function() {
		this._stringBundle = document.getElementById("changeAcl-bundle");
		this._pref = this.Cc['@mozilla.org/preferences-service;1']
					.getService(this.Ci.nsIPrefBranch);
		this._doc = document;
			
		this.toggleMode(this._pref.getBoolPref("extensions.ImapAclExt.advMode"));
		
		var usernameBox = document.getElementById("username_box");
		var selected = window.arguments[0];

		if (selected==-1)
		{
			document.title=this._stringBundle.getString("newUser");
		}
		else
		{
			document.title=this._stringBundle.getString("setRightsFor") + ": " + selected.username;
			usernameBox.value = selected.username;
			usernameBox.setAttribute("readonly", true);
			//usernameBox.disabled = "true";
			
			var uacl = selected.permissions;
			
			if(this._pref.getBoolPref("extensions.ImapAclExt.advMode")) {
				//Parse ACL-string
				var atom=uacl.indexOf("l");
				var check = document.getElementById("lacl");
				if (atom!=-1) {
					check.checked="true";
				}
			
				atom=uacl.indexOf("r");
					check = document.getElementById("racl");
				if (atom!=-1) {
					check.checked="true";
				}

				atom=uacl.indexOf("s");
					check = document.getElementById("sacl");
				if (atom!=-1) {
					check.checked="true";
				}

				atom=uacl.indexOf("w");
					check = document.getElementById("wacl");
				if (atom!=-1) {
					check.checked="true";
				}

				atom=uacl.indexOf("i");
					check = document.getElementById("iacl");
				if (atom!=-1) {
					check.checked="true";
				}

				atom=uacl.indexOf("p");
					check = document.getElementById("pacl");
				if (atom!=-1) {
					check.checked="true";
				}

				atom=uacl.indexOf("c");
					check = document.getElementById("cacl");
				if (atom!=-1) {
					check.checked="true";
					document.getElementById("kacl").checked = true;
					document.getElementById("xacl").checked = true;
				}

				atom=uacl.indexOf("d");
					check = document.getElementById("dacl");
				if (atom!=-1) {
					check.checked="true";
					document.getElementById("tacl").checked = true;
					document.getElementById("eacl").checked = true;
				}

				atom=uacl.indexOf("a");
					check = document.getElementById("aacl");
				if (atom!=-1) {
					check.checked="true";
				}
			} else {
				if (uacl.indexOf("l")!=-1 && uacl.indexOf("r")!=-1 && 
					uacl.indexOf("s")!=-1) {
					document.getElementById("readAcl").checked="true";
				}
				
				if (uacl.indexOf("l")!=-1 && uacl.indexOf("r")!=-1 && 
					uacl.indexOf("s")!=-1 && uacl.indexOf("w")!=-1 &&
					uacl.indexOf("i")!=-1) {
					
					document.getElementById("insertAcl").checked="true";
					
				}
				
				if (uacl.indexOf("l")!=-1 && uacl.indexOf("r")!=-1 && 
					uacl.indexOf("s")!=-1 && uacl.indexOf("w")!=-1 &&
					uacl.indexOf("i")!=-1 && uacl.indexOf("d")!=-1) {
					
					document.getElementById("deleteAacl").checked="true";
					
				}							
			}			
		}
	},
	
	change : function() {
		if (this._forceClose) {
			return true;
		}
		
		var usernameBox = document.getElementById("username_box");
		var username = usernameBox.value
		if (username == "" || username == null) {
			alert(this._stringBundle.getString("noUser"));
			return false;
		}
		
		var aclstring = "";

		if(this._pref.getBoolPref("extensions.ImapAclExt.advMode")) {
			var check = document.getElementById("lacl");
			if (check.checked == true) {
				aclstring+="l";
			}

			check = document.getElementById("racl");
			if (check.checked == true) {
				aclstring+="r";
			}

			check = document.getElementById("sacl");
			if (check.checked == true) {
				aclstring+="s";
			}

			check = document.getElementById("wacl");
			if (check.checked == true) {
				aclstring+="w";
			}

			check = document.getElementById("iacl");
			if (check.checked == true) {
				aclstring+="i";
			}

			check = document.getElementById("pacl");
			if (check.checked == true) {
				aclstring+="p";
			}

			check = document.getElementById("kacl");
			if (check.checked == true) {
				aclstring+="k";
			}
			check = document.getElementById("xacl");
			if (check.checked == true) {
				aclstring+="x";
			}
			check = document.getElementById("tacl");
			if (check.checked == true) {
				aclstring+="t";
			}
			check = document.getElementById("eacl");
			if (check.checked == true) {
				aclstring+="e";
			}

			check = document.getElementById("aacl");
			if (check.checked == true) {
				aclstring+="a";
			}

			check = document.getElementById("cacl");
			if (check.checked == true) {
				aclstring+="c";
			}

			check = document.getElementById("dacl");
			if (check.checked == true) {
				aclstring+="d";
			}
		} else {
			if (document.getElementById("deleteAacl").checked == true) {
				aclstring = "lrswid";
			}
			else if (document.getElementById("insertAcl").checked == true) {
				aclstring = "lrswi";
			}
			else if (document.getElementById("readAcl").checked == true) {
				aclstring = "lrs";
			}
		}
				
		if (aclstring == "") {
			alert(this._stringBundle.getString("noAcl"));
			return false;
		}

		var imapFolder = window.arguments[3];
		if (imapFolder.server.realUsername == username) {
			alert(this._stringBundle.getString("noSelfAcl"));
			//hello EVIL BUG!
			return false;
		}

		ImapAclExt.Utils.setAcl(imapFolder, username, aclstring, 
			document.getElementById("recursion").checked, this.isChanged, this);

		return false;
	},
	isChanged : function (cbSender, result) {

		if (result != "success") {
			if (result == "noAclRight") {
				alert(this._stringBundle.getString("noAclRight"));
			} else {
				alert(result);
			}
			
		} else {
			cbSender._forceClose = true;
			cbSender._doc.getElementById("acl_dialog").acceptDialog();
		}
	},
	toggleDependency : function(checkBox){
		var id = checkBox.id;
		if (id == "kacl" && checkBox.checked == false) {
			document.getElementById("cacl").checked = false;
		} else if (id == "xacl" && checkBox.checked == false) {
			document.getElementById("cacl").checked = false;
		}

		if ((id == "kacl" || id == "xacl") && 
				document.getElementById("kacl").checked == true &&
				document.getElementById("xacl").checked == true) {

			document.getElementById("cacl").checked = true;
		} else if ((id == "tacl" || id == "eacl") && 
				document.getElementById("tacl").checked == true &&
				document.getElementById("eacl").checked == true) {

			document.getElementById("dacl").checked = true;
		}

		if (id == "tacl" && checkBox.checked == false) {
			document.getElementById("dacl").checked = false;
		} else if (id == "eacl" && checkBox.checked == false) {
			document.getElementById("dacl").checked = false;
		}

		if (id == "cacl" && checkBox.checked == false) {
			document.getElementById("kacl").checked = false;
			document.getElementById("xacl").checked = false;
		} else if (id == "cacl" && checkBox.checked == true) {
			document.getElementById("kacl").checked = true;
			document.getElementById("xacl").checked = true;
		}

		if (id == "dacl" && checkBox.checked == false) {
			document.getElementById("tacl").checked = false;
			document.getElementById("eacl").checked = false;
		} else if (id == "dacl" && checkBox.checked == true) {
			document.getElementById("tacl").checked = true;
			document.getElementById("eacl").checked = true;
		}
	},	

	cancel : function(){
		window.arguments[1].value = "Cancel";
		return true;
	},
	
	toggleMode : function (advMode) {
		if (advMode) {
			document.getElementById("readAcl").hidden = true;
			document.getElementById("insertAcl").hidden = true;
			document.getElementById("deleteAacl").hidden = true;
		} else {
			document.getElementById("lacl").hidden = true;
			document.getElementById("racl").hidden = true;
			document.getElementById("sacl").hidden = true;
			document.getElementById("wacl").hidden = true;
			document.getElementById("iacl").hidden = true;
			document.getElementById("pacl").hidden = true;
			document.getElementById("kacl").hidden = true;
			document.getElementById("xacl").hidden = true;
			document.getElementById("tacl").hidden = true;
			document.getElementById("eacl").hidden = true;
			document.getElementById("aacl").hidden = true;
			document.getElementById("cacl").hidden = true;
			document.getElementById("dacl").hidden = true;
			
		}
	}
  };
};
