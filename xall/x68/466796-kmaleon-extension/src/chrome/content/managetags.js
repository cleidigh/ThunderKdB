var console3 = Components.classes['@mozilla.org/consoleservice;1'].getService(Components.interfaces.nsIConsoleService);
var tagname = "EN KMALEON";
var mintagname = "en_kmaleon";
window.addEventListener("load", function(e) { 
	inicio(); 
}, false);

function inicio() 
{
	var tagService = Components.classes["@mozilla.org/messenger/tagservice;1"].getService(Components.interfaces.nsIMsgTagService);

	if (!tagService.getKeyForTag(tagname))
	{
		MailServices.tags.addTag(tagname, "#33CC00", "");
	}
		
}

var admintags = 
{
	anyadirtag: function (messageheader)
	{
		var tagService = Components.classes["@mozilla.org/messenger/tagservice;1"].getService(Components.interfaces.nsIMsgTagService);

		if (!tagService.getKeyForTag(tagname))
		{
			MailServices.tags.addTag(tagname, "#33CC00", "");
		}
		AnyadirTagMsgHdr(mintagname, mintagname+" "+messageheader.getStringProperty("keywords"),messageheader);
	}
}

function AnyadirTagMsgHdr(key, addKey, msgheader)
{
	var messages = Components.classes["@mozilla.org/array;1"].createInstance(Components.interfaces.nsIMutableArray);
	var msg = Components.classes["@mozilla.org/array;1"].createInstance(Components.interfaces.nsIMutableArray);
	var toggler = addKey ? "addKeywordsToMessages" : "removeKeywordsFromMessages";
	var prevHdrFolder = null;
	var msgHdr = msgheader;
	if (msgHdr.label)
	{
	  msg.clear();
	  msg.appendElement(msgHdr, false);
	  msgHdr.folder.addKeywordsToMessages(msg, "$label" + msgHdr.label);
	  msgHdr.label = 0;
	}
	if (prevHdrFolder != msgHdr.folder)
	{
		if (prevHdrFolder)
		prevHdrFolder[toggler](messages, key);
		messages.clear();
		prevHdrFolder = msgHdr.folder;
	}
	messages.appendElement(msgHdr, false);
  
	if (prevHdrFolder)
		prevHdrFolder[toggler](messages, key);
	OnTagsChange();
}