var gTagToolbar;

var {MailUtils} = ChromeUtils.import("resource:///modules/MailUtils.jsm");
var nsIMsgCompDeliverMode = Components.interfaces.nsIMsgCompDeliverMode;

var TTBStateListener = {
  NotifyComposeFieldsReady: function() {},

  NotifyComposeBodyReady: function() {},
  
  ComposeProcessDone: function(aResult) {
  	dump("Compose process done\n");
  	if (!gMsgCompose) return;
  	var msgSend = gMsgCompose.messageSend;
  	if (msgSend.sendReport.deliveryMode != nsIMsgCompDeliverMode.Now) return;
  	var tags = gTagToolbar.getTagsForSentMsg();
    if (tags.length == 0) return;
    //var sRDF = Components.classes['@mozilla.org/rdf/rdf-service;1'].getService(Components.interfaces.nsIRDFService);
    if (aResult== Components.results.NS_OK){
			var id = getCurrentIdentity();
			if (!id.doFcc) return;
			var uris = new Array();
			if (gMsgCompose.savedFolderURI) uris[gMsgCompose.savedFolderURI] = 1; 
			if (id.fccFolder) uris[id.fccFolder] = 1;
			if (gMsgCompose.compFields.fcc) uris[gMsgCompose.compFields.fcc] = 1;
			if (gMsgCompose.compFields.fcc2) uris[gMsgCompose.compFields.fcc2] = 1;
	
			//var folder = Components.classes["@mozilla.org/supports-array;1"]
	   	//              .createInstance(Components.interfaces.nsISupportsArray);
			var info = {
      	wrappedJSObject: {
        	folders: []
      	}
    	};
    	
			var key;
			for (key in uris) {
			  try {
			  	//var folderResource = sRDF.GetResource(key);
			  	var folderResource = MailUtils.getExistingFolder(key);
			  	if (folderResource) {
						var msgFolder = folderResource.QueryInterface(Components.interfaces.nsIMsgFolder);
						//folder.AppendElement(msgFolder);
						info.wrappedJSObject.folders.push(msgFolder);
			  	}
			  } catch(e) {
			  	dump(e+"\n");
			  }
			}
	
			var observerService = Components.classes["@mozilla.org/observer-service;1"].
								getService(Components.interfaces.nsIObserverService);
			//observerService.notifyObservers(folder, "ttb:tag_compose_done", "");
			observerService.notifyObservers(info, "ttb:tag_compose_done", "");
    }
  },

  SaveInFolderDone: function(folderURI) {	
  },
  
  composeSendMessage: function() {
		var attachButton = document.getElementById("tag-toolbar-attach-button");
		var attachTags = attachButton ? attachButton.checked : false;
		var msgcomposeWindow = document.getElementById( "msgcomposeWindow" );  
		var msg_type = msgcomposeWindow.getAttribute( "msgtype" );  
		//if( !(msg_type == nsIMsgCompDeliverMode.Now || msg_type == nsIMsgCompDeliverMode.Later) )
		if(msg_type != nsIMsgCompDeliverMode.Now) return;
			
  	var tags = gTagToolbar.getTagsForSentMsg();
    if (tags.length == 0) return;
    var header = "";
    var data = "";
    if (attachTags) {
    	header = "T"+tags.join(" ");
    	data = "-";
    } else {
    	var date = new Date();
    	header = "D"
						 + date.getFullYear().toString()
						 + ("0"+(date.getMonth()+1)).substr(-2)
						 + ("0"+date.getDate()).substr(-2)
						 + ("0"+date.getHours()).substr(-2)
						 + ("0"+date.getMinutes()).substr(-2)
						 + ("0"+date.getSeconds()).substr(-2)
						 + ("00"+date.getMilliseconds()).substr(-3);
			data = header;
    }
/*
		if( gMsgCompose.compFields.otherRandomHeaders != "" && 
				gMsgCompose.compFields.otherRandomHeaders.lastIndexOf("\r\n") != gMsgCompose.compFields.otherRandomHeaders.length - 2) {
      // do CRLF, same as PUSH_NEWLINE() in nsMsgSend.h / nsMsgCompUtils.cpp
      // see bug #195965
			gMsgCompose.compFields.otherRandomHeaders += "\r\n"; 
		}
		gMsgCompose.compFields.otherRandomHeaders += "X-TagToolbar-Keys: " + header + "\r\n";
*/
    //from TB37 (bug 998191)
    gMsgCompose.compFields.setHeader("X-TagToolbar-Keys", header);
    //var sRDF = Components.classes['@mozilla.org/rdf/rdf-service;1'].getService(Components.interfaces.nsIRDFService);
		var id = getCurrentIdentity();
		if (!id.doFcc) return;
		var uris = [];
		if (gMsgCompose.savedFolderURI) uris[gMsgCompose.savedFolderURI] = 1; 
		if (id.fccFolder) uris[id.fccFolder] = 1;
		if (gMsgCompose.compFields.fcc) uris[gMsgCompose.compFields.fcc] = 1;
		if (gMsgCompose.compFields.fcc2) uris[gMsgCompose.compFields.fcc2] = 1;

		//var folder = Components.classes["@mozilla.org/supports-array;1"]
   	//              .createInstance(Components.interfaces.nsISupportsArray);
		var info = {
    	wrappedJSObject: {
      	folders: []
    	}
  	};
		var key;
		for (key in uris) {
		  try {
		  	//var folderResource = sRDF.GetResource(key);
		  	var folderResource = MailUtils.getExistingFolder(key);
		  	if (folderResource) {
					var msgFolder = folderResource.QueryInterface(Components.interfaces.nsIMsgFolder);
					//folder.AppendElement(msgFolder);
					info.wrappedJSObject.folders.push(msgFolder);
		  	}
		  } catch(e) {
		  	dump(e+"\n");
		  }
		}

		var observerService = Components.classes["@mozilla.org/observer-service;1"].
							getService(Components.interfaces.nsIObserverService);
		//observerService.notifyObservers(folder, "ttb:tag_compose", data + " " + tags.join(" "));
		observerService.notifyObservers(info, "ttb:tag_compose", data + " " + tags.join(" "));
	}
};

function TTBClassInheriter()
{
}

TTBClassInheriter.copyUndefProperties = function(src, dest)
{
    for (var prop in src) {
        if (typeof(dest[prop]) == "undefined") { 
            dest[prop] = src[prop];
        }
    }
}

TTBClassInheriter.inherit = function(subClass, superClass) 
{
	TTBClassInheriter.copyUndefProperties(superClass, subClass);
    TTBClassInheriter.copyUndefProperties(superClass.prototype, subClass.prototype);
}

/*
var MailToolboxCustomizeDoneOrg = MailToolboxCustomizeDone;
//var MailToolboxCustomizeDone = function(aToolboxChanged) {
var MailToolboxCustomizeDone = function() {
	MailToolboxCustomizeDoneOrg.apply(this, arguments);
	gTagToolbar.updateTagToolbar();
	if (!gTagToolbar.inToolbar) gTagToolbar.buildCatList();
};
*/
window.addEventListener("aftercustomization",
												function(event){gTagToolbar.updateTagToolbar();},
												false);
												
function initTagToolbar()
{
	var attachButton = document.getElementById("tag-toolbar-attach-button");
	if (attachButton) attachButton.checked = false;
	gTagToolbar = new TagToolbarCompose();
	gTagToolbar.initTagToolbar();
	if (gMsgCompose) gMsgCompose.RegisterStateListener(TTBStateListener);
}
window.addEventListener("load", initTagToolbar, false);

/*
function initTagToolbarDelay() {
	setTimeout(initTagToolbar,0);
}
window.addEventListener("load", initTagToolbarDelay, false);
*/

document.getElementById("msgcomposeWindow").addEventListener("compose-window-reopen", initTagToolbar, false);
document.getElementById("msgcomposeWindow").addEventListener("compose-send-message", TTBStateListener.composeSendMessage, true); 

function finalizeTagToolbar()
{
	gTagToolbar.finalize();
	if (gMsgCompose) gMsgCompose.UnregisterStateListener(TTBStateListener);
}
window.addEventListener("unload", finalizeTagToolbar, false);
document.getElementById("msgcomposeWindow").addEventListener("compose-window-close", finalizeTagToolbar, false);

//sub class of TagToolbar
function TagToolbarCompose()
{
	var superConstructor = TagToolbar;
	superConstructor.apply(this, arguments);
	this.mailBar = "composeToolbar2";
	//this.mailToolbox = ;
	this.toolbarManager = new TTBToolbarManager("compose-toolbox");
	this.tagsToBeAdded = new Array();
	//display options
	this.inToolbar = false;
	//this.recallTagToolbarPersist();

	this.searching = false;
	this.searchResult = "";
	this.categoryManager = null;
	//this.additionalToolbars = new Array();
	this.prevWidth = 0;
	var origMsgURI = gMsgCompose.originalMsgURI;
	if (gTTBPreferences.getBoolPref("ttb.compose_reproduce_orig_tags", true) && origMsgURI) {
		var messenger = Components.classes["@mozilla.org/messenger;1"]  
											.createInstance(Components.interfaces.nsIMessenger);
		var origMsgHdr = messenger.messageServiceFromURI(origMsgURI).messageURIToMsgHdr(origMsgURI);
		var keysStr = "";
		try {
			keysStr = origMsgHdr.getStringProperty("keywords");
		if (origMsgHdr.label)
		  keysStr += " $label" + origMsgHdr.label;
		} catch(e) {
		}
		var keys = keysStr.split(" ");
		for (var i=0; i<keys.length; i++) {
			this.tagsToBeAdded[keys[i]] = true;
		}
	}
}

TTBClassInheriter.inherit(TagToolbarCompose, TagToolbar);

//overrides methods
TagToolbarCompose.prototype.initTagToolbarContainer = function(container) {
	var superMethod = TagToolbar.prototype.initTagToolbarContainer;
	superMethod.apply(this, arguments);
	
	if (!container) container = document.getElementById("tag-toolbar-container-box");
	var mode = this.dispMode;
	var isPopup = container.localName == "menupopup";
	if (this.searching || !mode || isPopup) mode = "text";
	if (mode != "category") {
		var endNum = 0;
		var tags = container.childNodes;
		var tagsNum = tags.length;
		for (var i = tagsNum-1; i >= endNum; i--) {
			var node = tags[i];
			var tagKey = node.getAttribute("value");
			if (!tagKey) continue;
			if (this.tagsToBeAdded[tagKey]) node.setAttribute("checked", "true");
			else node.removeAttribute("checked");
		}
	}
	document.getElementById("TTB:TagStatus").removeAttribute("disabled");
	this.resizeFunc();
}

TagToolbarCompose.prototype.toggleMessageTagToolbar = function(target) {
	if (this.dispMode == "category" && this.openedMenuButton) {
		var container = document.getElementById("tag-toolbar-container");
		if (container) container.removeEventListener("mouseover", this.autoOpenMenu, true);
	}
	
	var key = target.getAttribute("value");
	
	if (target.getAttribute("checked") == "true") { 
		target.removeAttribute("checked");
		this.tagsToBeAdded[key] = false;
	} else {
		target.setAttribute("checked", "true");
		this.tagsToBeAdded[key] = true;
	}
	
	this.updateTagToolbar();
}

TagToolbarCompose.prototype.initTagToolbar = function()
{
	this.recallTagToolbarPersist();
	if (!this.inToolbar) return;
	
	var me = this;
	var listener = {
	  observe : function(aSubject, aTopic, aData) {
		  if (aTopic == 'nsPref:changed') {
			  me.initTagToolbarContainer();
		  } else if (aTopic == "ttb:setting_updated") {
			  me.buildCatList();
		  }
	  }
	};
	
	try {
		//use sample in http://developer.mozilla.org/ja/docs/Code_snippets:Preferences
		var prefService = Components.classes["@mozilla.org/preferences-service;1"]
			  .getService(Components.interfaces.nsIPrefService);
		var branch = prefService.getBranch('mailnews.tags.');
		//branch.QueryInterface(Components.interfaces.nsIPrefBranch2);
		branch.QueryInterface(Components.interfaces.nsIPrefBranch);
		branch.addObserver("", listener, false);
		
		var settingObserverService = Components.classes["@mozilla.org/observer-service;1"].
		  getService(Components.interfaces.nsIObserverService);
		settingObserverService.addObserver(listener, "ttb:setting_updated", false);
	} catch(e) {}
	
	window.addEventListener("resize", this.resizeFunc, false);

	this.syncTagToolbar();
	var toolbar = document.getElementById("tag-toolbar");
	if (toolbar) {
		if (toolbar.collapsed) {
			toolbar.setAttribute("collapsed", "true");
			document.getElementById("TTB:ShowToolBar").removeAttribute("checked");
		} else {
			toolbar.removeAttribute("collapsed");
			document.getElementById("TTB:ShowToolBar").setAttribute("checked", "true");
		}
		this.buildCatList();
	} else {
	  	document.getElementById("TTB:ShowToolBar").removeAttribute("checked");
	}
}

TagToolbarCompose.prototype.recallCategoryForFolder = function()
{
}

TagToolbarCompose.prototype.rememberCategoryForFolder = function()
{
}

TagToolbarCompose.prototype.finalize = function() {
	this.toolbarManager.clear();
	var container = document.getElementById("tag-toolbar-container");
	if (container) {
	  container.setAttribute("curcat", this.curcat.toString());
  	  container.setAttribute("catcol", this.catcol.toString());
   	  container.setAttribute("dispMode", this.dispMode);
   	  container.setAttribute("akey", this.akey.toString());
	}

	//this.categoryManager.syncTagsInCategory(); //remove tags deleted in this session from categories
}

TagToolbarCompose.prototype.getTagsForSentMsg = function()
{
	var tagsArray = new Array();
  	for (key in this.tagsToBeAdded)
		if (this.tagsToBeAdded[key]) tagsArray.push(key);
	return tagsArray;
}

TagToolbarCompose.prototype.removeAllMessageTags = function()
{
	this.tagsToBeAdded = new Array();
	this.updateTagToolbar();
}

TagToolbarCompose.prototype.initTagsButtonPopup = function(container)
{
	var endNum = 0;
	var oldTags = container.childNodes;
	var oldTagsNum = oldTags.length;
	for (var i = oldTagsNum-1; i >= 2; i--) {
		var node = oldTags[i];
		if (node) container.removeChild(node);
	}
	
	var tagService = Components.classes["@mozilla.org/messenger/tagservice;1"]
	  .getService(Components.interfaces.nsIMsgTagService);
	var tagArray = tagService.getAllTags({});
	var tagCount = tagArray.length;
	for (var i = 0; i < tagCount; ++i) {
		var taginfo = tagArray[i];
		var button = document.createElement("menuitem")
		this.setMessageTagLabelToTagToolbar(button, i+1, taginfo.tag,
											taginfo.color, false, false);
		container.appendChild(button);
		button.setAttribute("value", taginfo.key);
		button.setAttribute("type", "checkbox");
		button.setAttribute("autocheck", "false");
		if (this.tagsToBeAdded[taginfo.key]) {
			button.setAttribute("checked", "true");
		}
		button.setAttribute('oncommand', 
			'gTagToolbar.toggleMessageTagToolbar(event.target);gTagToolbar.updateTagToolbar();');
	}
}

TagToolbarCompose.prototype.toggleAllTagsInCat = function(tagsStr, add) {
	var tags = "null";
	if (tagsStr != "null") {
		tags = tagsStr.split(this.categoryManager.delimiter);
	}
	var tagService = Components.classes["@mozilla.org/messenger/tagservice;1"]
	  .getService(Components.interfaces.nsIMsgTagService);
	var tagArray = tagService.getAllTags({});
	var tagCount = tagArray.length;
	for (var i = 0; i < tagCount; ++i) {
		var taginfo = tagArray[i];
		if (tags == "null" || tags.indexOf(taginfo.key) != -1) {
			//ToggleMessageTag(taginfo.key, add);
			this.tagsToBeAdded[taginfo.key] = add;
		}
	}
	this.updateTagToolbar();
	return true;
}

TagToolbarCompose.prototype.onTagCategoryButtonPopupShowing = function(container) 
{
	var superMethod = TagToolbar.prototype.onTagCategoryButtonPopupShowing;
	superMethod.apply(this, arguments);
	document.getElementById("TTB:TagStatus").removeAttribute("disabled");
}
