"use strict";
var { Services } = ChromeUtils.import("resource://gre/modules/Services.jsm");

var gMsgCompose = window.opener.gMsgCompose;

var mailmergeutils = window.opener.mailmergeutils;

var mailmerge = {
	
	load: function() {
		
		mailmerge.init();
		
	},
	
	unload: function() {
		
	},
	
	init: function() {
		
		if(window.arguments[0].type == "FILE") {
			
			document.getElementById("mailmerge-file").hidden = false;
			
			let json = window.arguments[0].json;
			let table = document.getElementById("mailmerge-file-table");
			for(let i = 0; i < json.length; i++) {
				
				let row = table.insertRow(i);
				for(let j = 0; j < json[i].length; j++) {
					
					let cell = row.insertCell(j);
					cell.textContent = json[i][j];
					
				}
				
			}
			
		}
		
		if(window.arguments[0].type == "MESSAGE") {
			
			document.getElementById("mailmerge-message-sendlater").parentElement.style.display = (window.opener.opener.Sendlater3Util) ? "block" : "none";
			
			document.getElementById("mailmerge-message").hidden = false;
			document.getElementById("mailmerge-begin").hidden = false;
			document.getElementById("mailmerge-previous").hidden = false;
			document.getElementById("mailmerge-next").hidden = false;
			document.getElementById("mailmerge-end").hidden = false;
			
			mailmerge.begin();
			
		}
		
		window.sizeToContent();
		document.getElementById('mailmerge-content').style.height = Math.min(Math.max(150, document.getElementById('mailmerge-content').clientHeight), screen.availHeight - 150) + "px";
		window.sizeToContent();
		
	},
	
	begin: function() {
		
		mailmerge.index = 0;
		mailmerge.update();
		
	},
	
	previous: function() {
		
		mailmerge.index--;
		if(mailmerge.index < 0) { mailmerge.begin(); return; }
		mailmerge.update();
		
	},
	
	next: function() {
		
		mailmerge.index++;
		if(mailmerge.index >= mailmergeutils.objects.length) { mailmerge.end(); return; }
		mailmerge.update();
		
	},
	
	end: function() {
		
		mailmerge.index = mailmergeutils.objects.length - 1;
		mailmerge.update();
		
	},
	
	update: function() {
		
		let compose = mailmergeutils.compose(mailmerge.index);
		if(compose) {
			
			document.getElementById("mailmerge-message-index").textContent = mailmerge.index;
			document.getElementById("mailmerge-message-from").textContent = compose.compFields.from;
			document.getElementById("mailmerge-message-to").textContent = compose.compFields.to;
			document.getElementById("mailmerge-message-cc").textContent = compose.compFields.cc;
			document.getElementById("mailmerge-message-bcc").textContent = compose.compFields.bcc;
			document.getElementById("mailmerge-message-reply").textContent = compose.compFields.replyTo;
			document.getElementById("mailmerge-message-subject").textContent = compose.compFields.subject;
			document.getElementById("mailmerge-message-body").textContent = compose.compFields.body;
			document.getElementById("mailmerge-message-attachments").textContent = "";
			document.getElementById("mailmerge-message-sendlater").textContent = "";
			
			let attachments = compose.compFields.attachments;
			while(attachments.hasMoreElements()) {
				
				try {
					
					let attachment = attachments.getNext();
					attachment.QueryInterface(Ci.nsIMsgAttachment);
					
					document.getElementById("mailmerge-message-attachments").textContent += attachment.name + " : " + attachment.size + " : " + decodeURI(attachment.url) + "\n";
					
				} catch(e) { console.warn(e); }
				
			}
			
			if(compose.compFields.hasHeader("X-Send-Later-Uuid")) {
				
				document.getElementById("mailmerge-message-sendlater").textContent += "X-Send-Later-Uuid" + " : " + compose.compFields.getHeader("X-Send-Later-Uuid") + "\n";
				document.getElementById("mailmerge-message-sendlater").textContent += "X-Send-Later-At" + " : " + compose.compFields.getHeader("X-Send-Later-At") + "\n";
				document.getElementById("mailmerge-message-sendlater").textContent += "X-Send-Later-Recur" + " : " + compose.compFields.getHeader("X-Send-Later-Recur") + "\n";
				
			}
			
		}
		
	}
	
}
