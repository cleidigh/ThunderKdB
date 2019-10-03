if ("undefined" == typeof(ImapAclExt)) {
	var ImapAclExt = {};
};
 if ("undefined" == typeof(ImapAclExt.Utils)) {
  Components.utils.import("resource:///modules/iteratorUtils.jsm");
  ImapAclExt.Utils = {
	TIMEOUT : 5,
	//more than ms, faar less than s
	COMMANDTIMEOUT : 100,
	Cc : Components.classes,
	Ci : Components.interfaces,
	Cu : Components.utils,

	getSubFoldersAsArray : function (imapFolder, folders) {
		// SG, 07.10.2015 - TB24 changed from nsISupportsArray to nsIMutableArray, and fix typo ListDescendants
		//                  https://developer.mozilla.org/en-US/docs/Mozilla/Thunderbird/Releases/24
		//let allFolders = this.Cc["@mozilla.org/supports-array;1"].createInstance(this.Ci.nsISupportsArray);
		let allFolders = this.Cc["@mozilla.org/array;1"].createInstance(this.Ci.nsIMutableArray);
		imapFolder.ListDescendants(allFolders);
		
		for (let folder of fixIterator(allFolders, this.Ci.nsIMsgFolder)) {
			var imapF = folder.QueryInterface(Components.interfaces.nsIMsgImapMailFolder);
			
			if (imapF.canOpenFolder) {
				folders.push(imapF.onlineName);
			}
		}
		/*
		var subFolders = imapFolder.subFolders;
		var numSubFolders = imapFolder.numSubFolders;
		
		while (subFolders.hasMoreElements()) {
			var currentFolder = null;
			try {
				currentFolder = subFolders.getNext().QueryInterface(Components.interfaces.nsIMsgImapMailFolder);
				folders.push(currentFolder.onlineName);
				
				if (currentFolder.hasSubFolders) {
					this.getSubFoldersAsArray(currentFolder, folders);
				}
			} catch (ex) {
				window.dump(ex);
			}
		}
		*/
	},
	
	setAcl : function (imapFolder, user, acl, rec, callback, cbSender) {
		var result;
		var folders = new Array();
		if (rec && imapFolder.hasSubFolders) {
			this.getSubFoldersAsArray(imapFolder, folders);
			var command = "SETACL \"" + imapFolder.onlineName + "\" \"" + user + "\" \"" + acl + "\"";
			var otherCommands = new Array();
			for (var i = 0; i < folders.length; ++i) {
				otherCommands.push("SETACL \"" + folders[i] + "\" \"" + user + "\" \"" + acl + "\"");
			}
			
			this.sendToServer(imapFolder.server, command, true, otherCommands, this.isChanged, this, callback, cbSender, imapFolder);
		} else {		
			this.sendToServer(imapFolder.server, "SETACL \"" +
			imapFolder.onlineName + "\" \"" + user + "\" \"" + acl + "\"", true, null, this.isChanged, this, callback, cbSender, imapFolder);
		}
		return result;
	},

	check : function (imapFolder, callback, cbSender) {
		
		if (imapFolder instanceof Array && imapFolder.length > 0) {
			// SG, 07.10.2015 - working, but why not using otherCommands?
			var commands = new Array();
			for (var i = 0; i < imapFolder.length; ++i) {
				commands.push("cmd00" + i +  " GETACL \"" + imapFolder[i].onlineName + "\"");
			}
			
			this.sendToServer(imapFolder[0].server, commands, 
						false, null, this.isMultiChecked, this, callback, cbSender, imapFolder);
		} else {
			this.sendToServer(imapFolder.server, "GETACL \"" + imapFolder.onlineName + "\"", 
						false, null, this.isChecked, this, callback, cbSender, imapFolder);
		}
	},

	delAcl : function (imapFolder, user, rec, callback, cbSender) {
		var result;
		var folders = new Array();
		if (rec && imapFolder.hasSubFolders) {
			this.getSubFoldersAsArray(imapFolder, folders);
			var command = "DELETEACL \"" + imapFolder.onlineName + "\" \"" + user + "\"";
			var otherCommands = new Array();
			for (var i = 0; i < folders.length; ++i) {
				otherCommands.push("DELETEACL \"" + folders[i] + "\" \"" + user + "\"");
			}
			
			this.sendToServer(imapFolder.server, command, true, otherCommands, this.isChanged, this, callback, cbSender, imapFolder);
		} else {
			this.sendToServer(imapFolder.server, "DELETEACL \"" +
			imapFolder.onlineName + "\" \"" + user + "\"", true, null, this.isChanged, this, callback, cbSender, imapFolder);
		}
	},
	isChanged : function (cbSender, result, cb, cbS, imapFolder) {
		result = result.toLowerCase();
		if (result != null && result.indexOf("ok") != -1 && (result.indexOf("setacl") != -1 ||
									result.indexOf("deleteacl") != -1 ||
									result.indexOf("completed") != -1 ||
									result.indexOf("updated") != -1)) {
			result = "success";
		}
		
		cb(cbS, result, imapFolder);
	},
	isMultiChecked : function (cbSender, result, cb, cbS, imapFolder) {
		//window.dump(result);
		//window.dump(result.length);
		var cmd = 0;
		imapFolder.reverse();
		++cbS._returnCounter;
		for (var i = 0; i < result.length; ++i) {
			//window.dump(i + " // " + result[i]);
			if (result[i].indexOf("cmd00") !=-1) {
				
				if (result[i].search("cmd00([0-9]+) OK") != -1) {
					cbSender.parseCheck(cbSender, result[i], cb, cbS, imapFolder.pop());
				} else {
					cb(cbS, "", imapFolder.pop());
				}
				++cmd;
			}
		}
	},
	isChecked : function (cbSender, result, cb, cbS, imapFolder) {
		//window.dump("isChecked "+ imapFolder.onlineName + "\n");

		if (!result instanceof Array || !result.length > 0) {
			window.alert("Unknown Imap Error!\n" + result);
		}

		var aclRes = "";

		if (result.length > 3 && result[3].toLowerCase().indexOf("acl") >=0
			&& result[3].toLowerCase().indexOf(imapFolder.onlineName.toLowerCase()) >= 0) {
			aclRes = result[3];
		} else if (result.length > 2 && result[2].toLowerCase().indexOf("acl") >=0
			&& result[2].toLowerCase().indexOf(imapFolder.onlineName.toLowerCase()) >= 0) {
			aclRes = result[2];
		}
		
		//window.dump("isChecked "+ imapFolder.onlineName + "\\\\" + cbSender.checkedCounter + "//" + aclRes.indexOf("\n") + result+"\n");
		
		cbSender.parseCheck(cbSender, aclRes, cb, cbS, imapFolder);
	},
	splitargs : function (input, separator, keepQuotes) {
		// source: https://github.com/elgs/splitargs
		separator = separator || /\s/g;
		var singleQuoteOpen = false;
		var doubleQuoteOpen = false;
		var tokenBuffer = [];
		var ret = [];

		var arr = input.split('');
		for (var i = 0; i < arr.length; ++i) {
			var element = arr[i];
			var matches = element.match(separator);
			if (element === "'" && !doubleQuoteOpen) {
				if (keepQuotes === true) {
					tokenBuffer.push(element);
				}
				singleQuoteOpen = !singleQuoteOpen;
				continue;
			} else if (element === '"' && !singleQuoteOpen) {
				if (keepQuotes === true) {
					tokenBuffer.push(element);
				}
				doubleQuoteOpen = !doubleQuoteOpen;
				continue;
			}

			if (!singleQuoteOpen && !doubleQuoteOpen && matches) {
				if (tokenBuffer && tokenBuffer.length > 0) {
					ret.push(tokenBuffer.join(''));
					tokenBuffer = [];
				} else {
					ret.push('');
				}
			} else {
				tokenBuffer.push(element);
			}
		}
		if (tokenBuffer && tokenBuffer.length > 0) {
			ret.push(tokenBuffer.join(''));
		} else {
			ret.push('');
		}
		return ret;
	},
	parseCheck : function (cbSender, aclRes, cb, cbS, imapFolder) {
		//dump("parseCheck(aclRes = "+aclRes+")\n");
		if (aclRes == "" || aclRes.indexOf(" OK ") < 0) {
			//window.dump("isChecked "+ imapFolder.onlineName + "\\\\" + cbSender.checkedCounter + "//" + aclRes.indexOf("\n") + result+"\n");
			cb(cbS, "", imapFolder);
		}

		// SG, 07.10.2015 - not only process first, but all lines 
		// * ACL <folder> <user1> <rights1> <user2> <rights2> <user3> <rights3>
		var rights = new Array();
		var aclLine = aclRes.split("\n");

		for (var a=0;a<aclLine.length;a++) {
			//dump("\t\t"+aclLine[a]);
			var acls = this.splitargs(aclLine[a], null, false);
			var currACL = 4;
			if ((acls[0] == "*") && (acls[1].toLowerCase() == "acl")) {
				while (acls.length > currACL) {
					// SG, 07.10.2015 - TODO: find correct owner
					// (but ACL may return complete mail address when realUsername misses domain)
					if (acls[currACL-1] != "owner" && acls[currACL-1] != imapFolder.server.realUsername) {
						rights.push({username: acls[currACL-1], permissions: acls[currACL]});
					}
					currACL += 2;
				}
			}
		}
		//dump("parseCheck found "+rights.length+" ACLs for "+imapFolder.onlineName+"\n");

		cb(cbS, rights, imapFolder);
	},
	
	sendToServer : function (server, command, isACLCommand, otherCommands, callback, cbSender, cb, cbS, imapFolder)
	{
		var result = null;
		var index = 0;
		var initialized = false;
		var protocolData = new Array();
		var result;
		var prefs = Components.classes['@mozilla.org/preferences-service;1'].getService(this.Ci.nsIPrefBranch);
		try {		
			var secType = null;
			var secLength = 0;
			var starttlsMode = false;
			var startedtlsMode = false;

			if (server.socketType == 3) {
				secType = ['ssl'];
				secLength = 1;
			} else if (server.socketType == 2) {
				secType = ['starttls'];
				secLength = 1;
				starttlsMode = true;
			}
			
			var transportService = this.Cc["@mozilla.org/network/socket-transport-service;1"]
							   .getService(this.Ci.nsISocketTransportService);
			
			var transport = transportService.createTransport(secType, secLength,
										server.realHostName, server.port, null);

			//transport.setTimeout(this.Ci.nsISocketTransport.TIMEOUT_CONNECT, this.TIMEOUT);
			//transport.setTimeout(this.Ci.nsISocketTransport.TIMEOUT_READ_WRITE, this.TIMEOUT);			
						
			var outstream = transport.openOutputStream(0,0,0);
			var stream = transport.openInputStream(0,0,0);
			var instream = this.Cc["@mozilla.org/scriptableinputstream;1"]
					   .createInstance(this.Ci.nsIScriptableInputStream);

			instream.init(stream);

			if (starttlsMode) {
				protocolData.push("a001 STARTTLS" + "\r\n");
			}
			
			protocolData.push("a002 LOGIN " + server.realUsername + " " + server.password + "\r\n");
			if (command instanceof Array) {
				for (var i = 0; i < command.length; ++i) {
					protocolData.push(command[i] + "\r\n");
				}
			} else {
				protocolData.push("a003 " + command + "\r\n");
			}
			if (otherCommands != undefined && otherCommands instanceof Array) {
				for (var i = 0; i < otherCommands.length; ++i) {
					protocolData.push("b00" + i + " " + otherCommands[i] + "\r\n");
				}
			}
			protocolData.push("c004 LOGOUT" + "\r\n");

			var dataListener =
			{
				callback : null,
				cbSender : null,
				cb : null,
				cbS : null,
				imapFolder : null,
				data : new Array(),
				onStartRequest: function(request, context)
				{
					initialized = true;
					//window.dump("onStartRequest :: " + imapFolder.URI + "\n");
				},
				onStopRequest: function(request, context, status)
				{
					
					instream.close();
					outstream.close();
					//window.alert(ImapAclExt.Debug.var_dump(this.data));
					if (this.data != null && this.data.length > 2) {
						var response = null;
						if (isACLCommand) {							
							if (this.data[2].indexOf("a003") == 0) {
								response = this.data[2].toLowerCase();
							} else if (this.data[3].indexOf("a003") == 0) {
								response = this.data[3].toLowerCase();
							}
							//window.alert(ImapAclExt.Debug.var_dump(response));
							if (response != null && response.indexOf("ok") != -1 && 
								(response.indexOf("setacl") != -1 ||
									response.indexOf("deleteacl") != -1 ||
									response.indexOf("completed") != -1 ||
									response.indexOf("updated") != -1)) {
								this.data = "success";
							} else if (response != null && response.indexOf("no") != -1) {
								this.data = "noAclRight";
							}
						}
					}
					
					if (this.callback != null && typeof(this.callback) === "function") {
						callback(this.cbSender, this.data, this.cb, this.cbS, this.imapFolder);
					}
				},
				onDataAvailable: function(request, context, inputStream, offset, count)
				{
					let inputData = instream.read(count);

					if (starttlsMode && inputData.indexOf("a001") == 0 && inputData.indexOf("OK") != -1) {
						transport.securityInfo.StartTLS();
						startedtlsMode = true;
					}					
					this.data.push(inputData);
					
					if (index < protocolData.length && index > 0 && starttlsMode && !startedtlsMode) {
						window.alert("Could not establish TLS Connection");
						index = protocolData.length-1;
					}

					if (index < protocolData.length) {
						let outputData = protocolData[index++];
						outstream.write(outputData, outputData.length);
					}
				}
			};

			var pump = this.Cc["@mozilla.org/network/input-stream-pump;1"]
					   .createInstance(this.Ci.nsIInputStreamPump);

			pump.init(stream, 0, 0, true);
			let thread = this.Cc["@mozilla.org/thread-manager;1"].getService().currentThread;

			var countdown = 0;
			while(starttlsMode && transport.securityInfo == null && countdown++ < this.COMMANDTIMEOUT) {
				thread.processNextEvent(true);
				window.dump("CONNECT waiting: " + countdown + "\n");
			}

			if (starttlsMode) {
				transport.securityInfo.QueryInterface(this.Ci.nsISSLSocketControl);
				//var secure = transport.securityInfo.QueryInterface(this.Ci.nsISSLSocketControl);
				//window.alert(ImapAclExt.Debug.var_dump(secure));
			}
			
			
			dataListener.callback = callback;
			dataListener.cbSender = cbSender;
			dataListener.cb = cb;
			dataListener.cbS = cbS;
			dataListener.imapFolder = imapFolder;
			
			pump.asyncRead(dataListener, this);
		}
		catch (ex) {
			result = ex;
			window.dump(ex);
		}
		return result;
	}
  };
};
