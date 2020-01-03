//  if(!reminderfox) var reminderfox = {};
if(!reminderfox.tagging)   reminderfox.tagging = {};
/**
 * 	rmFxMsgTagging.js		<br>
 *
 * Supports Thunderbird/MailApp messages tagging <br>
 *
 * @since 2009-11-01		SM2 support  <br>
 * @since 2009-07-27		TB2/TB3/PB support  <br>
 * @since 2009-03-04		tag now can have uppercase letters, not sorted to top of list anymore  <br>
 * @since 2008-04-14		deleting tag from message was adding it to the general tag-list  <br>
 * @since 2011-01			PB2 rewrite  <br>
 */
reminderfox.tagging.msg = function (tagName, tagOp, tagColor, messageDBHDR) {

			var tagService = Cc["@mozilla.org/messenger/tagservice;1"].getService(Ci.nsIMsgTagService);
			var xKey = tagService.getKeyForTag(tagName); 

			// add the tag to the tag-list if not already exists
			if (xKey == "") { 
 				tagService.addTag(tagName, tagColor, '');	//  3. param is 'ordinal', leave blank

				xKey = tagService.getKeyForTag(tagName);
			}

			if (messageDBHDR == null) { // if NO Hdr data, then used standard ToggleMessageTag
				ToggleMessageTag(xKey, tagOp, "", false)  // use tagName to get key, third param for PB
			} else { 	  //  else, we have the msg-URI
				reminderfox.tagging.msgWithHdr(xKey, tagOp, messageDBHDR)
			}
};

/**
 *  'tag' ONE msg, if the msgHdr is known
 *
 *  messageDBHDR.messageKey = [integer] 1499427
 *  selectedMsgUris[0] = [string] "mailbox-message://nobody@Local%20Folders/Sent#1499427"
 *
 * Tag Thunderbird / Seammonkey message 
 * @param {string} key
 * @param {boolean} addKey
 * @param {Object} messageHdr
 */
reminderfox.tagging.msgWithHdr = function (key, addKey, messageHdr)
{
	var messages = Cc["@mozilla.org/array;1"].createInstance(Ci.nsIMutableArray);
	var msg = Cc["@mozilla.org/array;1"].createInstance(Ci.nsIMutableArray);
	
	var toggler = addKey ? "addKeywordsToMessages" : "removeKeywordsFromMessages";
	var prevHdrFolder = null;

	var msgHdr = messageHdr;
	if (msgHdr.label) {
		// Since we touch all these messages anyway, migrate the label now.
		// If we don't, the thread tree won't always show the correct tag state,
		// because resetting a label doesn't update the tree anymore...
		msg.clear();
		msg.appendElement(msgHdr, false);
		msgHdr.folder.addKeywordsToMessages(msg, "$label" + msgHdr.label);
		msgHdr.label = 0; // remove legacy label
	}
	if (prevHdrFolder != msgHdr.folder) {
		if (prevHdrFolder) prevHdrFolder[toggler](messages, key, false);
		messages.clear();
		prevHdrFolder = msgHdr.folder;
	}
	messages.appendElement(msgHdr, false);
	
	if (prevHdrFolder) prevHdrFolder[toggler](messages, key, false);
	
//	var msg = "FolderListener: reminderfox.tagging.msgWithHdr: key:" + key +
//	"\ntoggler: " + toggler + "\nmsgHdr.label:" + msgHdr.label + "\nmessages:" +
//	messages;
//	reminderfox.util.Logger('FolderListener', msg);
};