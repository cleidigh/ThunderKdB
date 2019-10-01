/* Thunderbird Plugin: Create Jira Issue
 *
 * This Plugin is able to create Jira-Issues out of an email.
 * Furthermore the content of an email can be added to an issue
 * as a comment.
 *
 * Requirements:
 * - Jira 4.0 and above with enabled SOAP-API
 * - Thunderbird 68+
 *
 * Author: catworkx GmbH, Hamburg, Germany
 * 		   Holger Lehmann <holger.lehmann_AT_catworkx.de>
 *
 */

// Variable mimeMsg is not undeclared in chrome/content/progress.js line 16.
// Fix taken from lightning source
if (typeof(mimeMsg) === 'undefined')
  (typeof(window) !== 'undefined') ? this.mimeMsg = {} : mimeMsg = {};

Components.utils.import("resource:///modules/gloda/mimemsg.js", mimeMsg);
var aConsoleService = Components.classes["@mozilla.org/consoleservice;1"].getService(Components.interfaces.nsIConsoleService);

var createjiraissue;

function onLoad(){
	createjiraissue = window.arguments[0];
	var header = window.arguments[1];
    mimeMsg.MsgHdrToMimeMessage(header, this, this.registerAttachments, true /* allowDownload */);
}

function registerAttachments(message, mimeMessage) {
	createjiraissue.registerAttachments(message, mimeMessage);
	this.close();
}

function abort() {
	this.close();
}