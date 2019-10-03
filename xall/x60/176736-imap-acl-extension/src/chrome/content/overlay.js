if ("undefined" == typeof(ImapAclExt)) {
  var ImapAclExt = {
	Cc : Components.classes,
	Ci : Components.interfaces,  
	IAE_VERSION : "0.2.8",
	_stringBundle : null,
	_pref : null,
	
    /**
     * Initializes this object.
     */
    init : function() {
      	this._stringBundle = document.getElementById("ImapAclExt-string-bundle");
		this._pref = this.Cc['@mozilla.org/preferences-service;1']
					.getService(this.Ci.nsIPrefBranch);

		this.startup();
    	},
	onMenuItemCommand : function(aEvent) {
		this.showAclWindow(aEvent,null);
	},
	onToolbarButtonCommand : function(aEvent,folder) {
		this.showAclWindow(aEvent,folder);
	},
	onToolbarOverviewButtonCommand : function(aEvent) {
	  window.openDialog("chrome://imapaclext/content/aclOverview.xul", "aclOverview", "modal=yes,dialog=yes,centerscreen=yes,resizable=yes");
	},
	showAclWindow : function(aEvent,folder) {
	  var imapFolder = this.getCurrendFolder(folder);
	  
	  if (imapFolder != null) {	
	    if (imapFolder.getPermissionsForUser(imapFolder.server.realUsername).indexOf("a") != -1) {			
		    var raction = new Object();
		    var ruser = new Object();
		    var rrights = new Object();
		    
		    window.openDialog("chrome://imapaclext/content/acls.xul", "acls", 
			    "modal=yes,dialog=yes,centerscreen=yes,resizable=yes", 
			    imapFolder, raction, ruser, rrights);
			    
    
	    } else {
		    window.alert(this._stringBundle.getString("noAclRight"));
	    }  
	  }
	},
	getCurrendFolder : function(imapFolder) {
	if (imapFolder == null) {
	  if (typeof(gFolderDisplay) != "undefined" && typeof(gFolderDisplay.displayedFolder) != "undefined" 
		  && gFolderDisplay.displayedFolder != null) {
		  imapFolder = gFolderDisplay.displayedFolder.QueryInterface(
						  this.Ci.nsIMsgImapMailFolder);
		  if (!imapFolder.verifiedAsOnlineFolder) {
			  window.alert(this._stringBundle.getString("noFolderSelected"));
			  //window.alert("FOLDER OFFLINE");
			  imapFolder = null;
		  }
	  }
	  else {
		  window.alert(this._stringBundle.getString("noFolderSelected"));
		  imapFolder = null;
	  }
	} else {
	  imapFolder = imapFolder.QueryInterface(this.Ci.nsIMsgImapMailFolder);
	  if (!imapFolder.verifiedAsOnlineFolder) {
		  window.alert(this._stringBundle.getString("noFolderSelected"));
		  //window.alert("FOLDER OFFLINE");
		  imapFolder = null;
	  }
	}
	var type = imapFolder.server.type;
	
	if (type != "imap") {
		window.alert(this._stringBundle.getString("Folder")+": " + imapFolder.onlineName +
		this._stringBundle.getString("noImapFolder"));
		
		imapFolder = null;
	}
	
	if (imapFolder.serverDoesntSupportACL) {
		window.alert(this._stringBundle.getString("noAclSupport"));
		
		imapFolder = null;
	}
	return imapFolder;
	},
	startup : function() {
		var addButton = false;
		try {
			var num = this._pref.getCharPref('extensions.ImapAclExt.version');
			if(num!=this.IAE_VERSION) {
			  this._pref.setCharPref('extensions.ImapAclExt.version', this.IAE_VERSION);
			  addButton = true;
			}
		}
		catch(e) {
			this._pref.setCharPref('extensions.ImapAclExt.version', this.IAE_VERSION);
			addButton = true;
		}

		if(addButton) {
			var toolbox = document.getElementById("mail-toolbox");
			var toolboxDocument = toolbox.ownerDocument;

			var iaeButtonIsPresent = false;
			for (var i = 0; i < toolbox.childNodes.length; ++i) {
			  var toolbar = toolbox.childNodes[i];
			  if (toolbar.localName == "toolbar" && 
				toolbar.getAttribute("customizable")=="true") {
				if(toolbar.currentSet.indexOf("button-iae")>-1)
				  iaeButtonIsPresent = true;
			  }
			}
				
			if(!iaeButtonIsPresent)   {
			  for (var i = 0; i < toolbox.childNodes.length; ++i) {
				toolbar = toolbox.childNodes[i];
				if (toolbar.localName == "toolbar" &&  toolbar.getAttribute("customizable")=="true" && toolbar.id=="mail-bar")  {
									
				  var newSet = "";
				  var child = toolbar.firstChild;
				  while(child) {
					if( !iaeButtonIsPresent && !child.nextSibling ) {
					  newSet += "button-iae,";
					  iaeButtonIsPresent = true;
					}

					newSet += child.id+",";
					child = child.nextSibling;
				  }

				  newSet = newSet.substring(0, newSet.length-1);
				  toolbar.currentSet = newSet;

				  toolbar.setAttribute("currentset", newSet);
				  toolboxDocument.persist(toolbar.id, "currentset");
				  MailToolboxCustomizeDone(true);
				  break;
				}
			  }
			}
		}
	}    
  };

  /**
   * Constructor.
   */
  (function() {
    this.init();
  }).apply(ImapAclExt);
};

if ("undefined" == typeof(ImapAclExt.SharingButtonObserver)) {
  ImapAclExt.SharingButtonObserver = {
	  myObs : null,
	  callAddSharingButton : { notify: function(timer) { ImapAclExt.SharingButtonObserver.addSharingButton(); } },
	  timer : null,
	  addSharingButton : function () {
		var winEnum = ImapAclExt.Cc["@mozilla.org/appshell/window-mediator;1"]
		.getService(ImapAclExt.Ci.nsIWindowMediator).getXULWindowEnumerator(null);
		var win = null;
		while(winEnum.hasMoreElements()) {
			try { 
				win = winEnum.getNext().QueryInterface(ImapAclExt.Ci.nsIXULWindow)
					.docShell.QueryInterface(ImapAclExt.Ci.nsIInterfaceRequestor)
					.getInterface(ImapAclExt.Ci.nsIDOMWindow);
				
				if(win.location == 'chrome://messenger/content/folderProps.xul') {
					var iaeshbutton = win.document.createElement('button');
					iaeshbutton.height = "25px";
					iaeshbutton.width = "150px";
					iaeshbutton.setAttribute("label", ImapAclExt._stringBundle.getString("setAcl"));
					win.ImapAclExtref = ImapAclExt;
					iaeshbutton.onclick = function(){ImapAclExt.onToolbarButtonCommand('onSharing',win.gMsgFolder)};				
					//iaeshbutton.addEventListener("onclick", function(){alert("button");ImapAclExt.onToolbarButtonCommand('onSharing')});
					win.document.getElementById("imap.FolderPrivileges").parentNode
						.appendChild(iaeshbutton);
					//win.dump(iaeshbutton.label);
					
					break; 
				}
			} catch(e){ alert(e); }
		}
	  },
	  observe: function(subject, topic, data) {
		var imapFolder = null;

		if (typeof(gFolderDisplay) != "undefined" && gFolderDisplay.displayedFolder != null) {
			imapFolder = gFolderDisplay.displayedFolder.QueryInterface(
							ImapAclExt.Ci.nsIMsgImapMailFolder);
		}

		if (imapFolder != null && imapFolder.server.type == "imap" &&
			!imapFolder.serverDoesntSupportACL) {
			
			this.timer.initWithCallback(this.callAddSharingButton, 1000,
				ImapAclExt.Ci.nsITimer.TYPE_ONE_SHOT);
		}
	  },
	  init : function() {
		this.timer = ImapAclExt.Cc["@mozilla.org/timer;1"].createInstance(ImapAclExt.Ci.nsITimer),
		this.myObs = ImapAclExt.Cc["@mozilla.org/observer-service;1"].
			getService(ImapAclExt.Ci.nsIObserverService);
		this.myObs.addObserver(this, "charsetmenu-selected", false);
	  },
	  unregister: function() {
		myObs.removeObserver(this, "charsetmenu-selected");
	  }	  
	}
};

window.addEventListener("load", function() { ImapAclExt.init(); ImapAclExt.SharingButtonObserver.init(); }, true);
