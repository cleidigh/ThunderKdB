/*********************************************************************************
 * The contents of this file are subject to the Opacus Licence, available at
 * http://www.opacus.co.uk/licence or available on request.
 * By installing or using this file, You have unconditionally agreed to the
 * terms and conditions of the License, and You may not use this file except in
 * compliance with the License.  Under the terms of the license, You shall not,
 * among other things: 1) sublicense, resell, rent, lease, redistribute, assign
 * or otherwise transfer Your rights to the Software. Use of the Software
 * may be subject to applicable fees and any use of the Software without first
 * paying applicable fees is strictly prohibited.  You do not have the right to
 * remove Opacus copyrights from the source code.
 *
 * The software is provided "as is", without warranty of any kind, express or
 * implied, including but not limited to the warranties of merchantability,
 * fitness for a particular purpose and noninfringement. In no event shall the
 * authors or copyright holders be liable for any claim, damages or other
 * liability, whether in an action of contract, tort or otherwise, arising from,
 * out of or in connection with the software or the use or other dealings in
 * the software.
 *
 * Portions created by Opacus are Copyright (C) 2010 Mathew Bland, Jonathan Cutting
 * Opacus Ltd.
 * All Rights Reserved.
 ********************************************************************************/
// Compose
function opacustepabObserver() {
	var wMediator = Components.classes["@mozilla.org/appshell/window-mediator;1"].getService(Components.interfaces.nsIWindowMediator);
	this.parentWindow = wMediator.getMostRecentWindow("mail:3pane");
}

opacustepabObserver.prototype = {
  sync: function(){
	  this.parentWindow.opacustep.contactSync();
  },
  newRecord: function(type){
	  this.parentWindow.opacustep.create(type);
  }

  /*addSendButton: function(){
	if(this.parentWindow.opacustep.prefs.getBoolPref('addButtons') === true){
		try {
		  var myId    = "opacustep-send"; // ID of button to add
		  var myId2    = "opacustep-send-archive"; // ID of button to add
		  var afterId = "button-send";    // ID of element to insert after
		  var navBar  = document.getElementById("composeToolbar2");
		  var curSet  = navBar.currentSet.split(",");

		  if (curSet.indexOf(myId) == -1) {
			var pos = curSet.indexOf(afterId) + 1 || curSet.length;
			var set = curSet.slice(0, pos).concat(myId).concat(myId2).concat(curSet.slice(pos));


			navBar.setAttribute("currentset", set.join(","));
			navBar.currentSet = set.join(",");
			document.persist(navBar.id, "currentset");
			try {
			  BrowserToolboxCustomizeDone(true);
			}
			catch (e) {}
		  }
		}
		catch(e) {}
		this.parentWindow.opacustep.prefs.setBoolPref("addButtons",false);
	}
	try{
		// Enable button on compose open in case something went Pete Tong with the last send and auto archive
		// and button remains disabled
		document.getElementById('opacustep-send-archive').disabled = false;
	}
	catch(e) {}
  }*/
};


/*
 * Register observer for send events. Check for event target to ensure that the 
 * compose window is loaded/unloaded (and not the content of the editor).
 * 
 * Unregister to prevent memory leaks (as per MDC documentation).
 */
// Make use of Gecko 1.9.2 activate event too
//window.addEventListener('activate', function (e) {opacustepabObserver.addSendButton()}, false);
window.addEventListener('load', function (e) {if (e.target == document) opacustepabObserver = new opacustepabObserver(); }, true);
//window.addEventListener('unload', function (e) { if (e.target == document) opacustepabObserver.unregister();}, true);




