"use strict";
var { Services } = ChromeUtils.import("resource://gre/modules/Services.jsm");

var gProgressListener = {
	
	onStateChange: function(aWebProgress, aRequest, aStateFlags, aStatus) {
	},
	
	onProgressChange: function(aWebProgress, aRequest, aCurSelfProgress, aMaxSelfProgress, aCurTotalProgress, aMaxTotalProgress) {
	},
	
	onLocationChange: function(aWebProgress, aRequest, aLocation, aFlags) {
	},
	
	onStatusChange: function(aWebProgress, aRequest, aStatus, aMessage) {
		
		document.getElementById("mailmerge-progress-status").textContent = aMessage;
		var string = window.opener.document.getElementById("bundle_composeMsgs").getString("copyMessageComplete");
		if(string == aMessage) { window.setTimeout(function() { mailmerge.compose(); }, 50); }
		
	},
	
	onSecurityChange: function(aWebProgress, aRequest, aState) {
	},
	
	QueryInterface: ChromeUtils.generateQI(["nsIWebProgressListener", "nsISupportsWeakReference"])
	
}

var gMsgCompose = window.opener.gMsgCompose;

var mailmergeutils = window.opener.mailmergeutils;

var mailmerge = {
	
	load: function() {
		
		mailmerge.init();
		
	},
	
	unload: function() {
		
	},
	
	init: function() {
		
		/* index start */
		mailmerge.index = -1;
		/* index end */
		
		/* time start */
		var time = new Date();
		mailmerge.time(time, time);
		window.setInterval(function() { mailmerge.time(time, new Date()); }, 1000);
		/* time end */
		
		window.setTimeout(function() { mailmerge.compose(); }, 50);
		
	},
	
	time: function(start, stop) {
		
		var time = Math.round((stop - start) / 1000);
		
		var hours = Math.floor(time / 3600);
		if(hours < 10) { hours = "0" + hours; }
		
		var minutes = Math.floor(time % 3600 / 60);
		if(minutes < 10) { minutes = "0" + minutes; }
		
		var seconds = Math.floor(time % 3600 % 60);
		if(seconds < 10) { seconds = "0" + seconds; }
		
		document.getElementById("mailmerge-progress-time").textContent = hours + ":" + minutes + ":" + seconds;
		
	},
	
	update: function() {
		
		var index = mailmerge.index;
		document.getElementById("mailmerge-progress-index").textContent = index;
		
		var total = mailmergeutils.objects.length;
		document.getElementById("mailmerge-progress-total").textContent = total;
		
		var progress = index / total;
		document.getElementById("mailmerge-progress-progress").value = (progress || 0);
		
		var status = "";
		document.getElementById("mailmerge-progress-status").textContent = status;
		
	},
	
	compose: function() {
		
		/* index start */
		mailmerge.index++;
		/* index end */
		
		/* update start */
		mailmerge.update();
		/* update end */
		
		/* compose start */
		var compose = mailmergeutils.compose(mailmerge.index);
		if(!compose) { window.setTimeout(function() { window.close(); }, 1000); return; }
		/* compose end */
		
		/* pause start */
		var pause = mailmergeutils.pause(mailmerge.index);
		if(!pause) { window.setTimeout(function() { window.close(); }, 1000); return; }
		/* pause end */
		
		window.setTimeout(function() { mailmerge.send(compose); }, pause);
		
	},
	
	send: function(compose) {
		
		/* editor start */
		try {
			
			compose.initEditor(gMsgCompose.editor, window.opener.content);
			
			compose.editor.QueryInterface(Ci.nsIHTMLEditor);
			compose.editor.rebuildDocumentFromSource(compose.compFields.body);
			
		} catch(e) {
			
			mailmergeutils.error(e);
			window.close();
			return;
			
		}
		/* editor end */
		
		try {
			
			/* delivermode start */
			var delivermode;
			switch(mailmergeutils.prefs.delivermode) {
				
				case "SaveAsDraft":
					
					delivermode = Ci.nsIMsgCompDeliverMode.SaveAsDraft;
					break;
					
				case "Later":
					
					delivermode = Ci.nsIMsgCompDeliverMode.Later;
					break;
					
				case "Now":
					
					delivermode = Ci.nsIMsgCompDeliverMode.Now;
					break;
					
				default:;
				
			}
			/* delivermode end */
			
			/* progress start */
			var progress = Cc["@mozilla.org/messenger/progress;1"].createInstance(Ci.nsIMsgProgress);
			progress.registerListener(gProgressListener);
			/* progress end */
			
			compose.SendMsg(delivermode, window.opener.getCurrentIdentity(), window.opener.getCurrentAccountKey(), null, progress);
			
		} catch(e) {
			
			mailmergeutils.error(e);
			window.close();
			return;
			
		}
		
		/* editor start */
		try {
			
			//gMsgCompose.initEditor(gMsgCompose.editor, window.opener.content);
			
			gMsgCompose.editor.QueryInterface(Ci.nsIHTMLEditor);
			gMsgCompose.editor.rebuildDocumentFromSource(gMsgCompose.compFields.body);
			
		} catch(e) {
			
			mailmergeutils.error(e);
			window.close();
			return;
			
		}
		/* editor end */
		
	}
	
}
