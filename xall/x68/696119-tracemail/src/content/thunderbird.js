function LOG(text) {
    var t = "";
    if (typeof text == 'object') {
        for (var a in text) {
            t += a+': ';
            try { t += text[a]; } catch (e) { t += 'err'; }
            t += "\n";
        }
    } else {
        t = text;
    }
    var consoleService = Components.classes["@mozilla.org/consoleservice;1"].getService(Components.interfaces.nsIConsoleService);
    consoleService.logStringMessage(t);
}

function Thunderbird_connector (reply) {
	var _tb_self = this;
	this.epvp = new EPVP( _tb_self );
    ////-
	this.plwtab = {};
    this.epvp.reply = reply;
    ////-
    ////
    //this.messageid;
    ////
	
	this.visualize = function () {
		
		//read selected mail header
        var content = "";
        var MessageURI = gFolderDisplay.selectedMessageUris;
        var MsgService = messenger.messageServiceFromURI(MessageURI);
        var MsgStream = Components.classes["@mozilla.org/network/sync-stream-listener;1"].createInstance();
        var consumer = MsgStream.QueryInterface(Components.interfaces.nsIInputStream);
        var ScriptInput = Components.classes["@mozilla.org/scriptableinputstream;1"].createInstance();
        var ScriptInputStream = ScriptInput.QueryInterface(Components.interfaces.nsIScriptableInputStream);
        ScriptInputStream.init(consumer);

        try {
            MsgService.streamMessage(MessageURI, MsgStream, msgWindow, null, false, null);
        } catch(ex) {
            alert("error: " + ex)
        }

        ScriptInputStream.available();
        while (ScriptInputStream.available()) {
            content = content + ScriptInputStream.read(512);
        }
		
		var temp = ''+MessageURI;
		temp = temp.replace(/#/,'');
		var pieces = temp.split('/');
		
        ////-
        var server = gFolderDisplay.displayedFolder.server;
        this.epvp.smtp = server.realHostName;
        /*
		//set smtp
		var prefs = Components.classes["@mozilla.org/preferences-service;1"]
		                      .getService(Components.interfaces.nsIPrefService);
		var branch = prefs.getBranch("mail.smtpserver.smtp1.");
		var smtp = branch.getCharPref("hostname");
		this.epvp.smtp = smtp;
        */
        ////-
        
        ////
        //this.epvp.messageid = pieces[ pieces.length -1 ];
        ////
        
        ////-
        this.epvp.msgHdr = gFolderDisplay.selectedMessage;
        //alert(this.epvp.msgHdrId);
        ////-
        
		this.epvp.visualize( content, pieces[ pieces.length -1 ] );
	};
	
	this.openTab = function( url, isplw ) {
		var mainWindow = Components.classes["@mozilla.org/appshell/window-mediator;1"]
		                   .getService(Components.interfaces.nsIWindowMediator)
						.getMostRecentWindow('mail:3pane');

		var tabmail;
		if (mainWindow) {
		     tabmail = mainWindow.document.getElementById("tabmail");  
		     mainWindow.focus();
		}
        ////-
		if (tabmail) {
            var tabMode = tabmail.tabModes["chromeTab"];
            if (tabMode.tabs.length >= tabMode.maxTabs) {
                tabmail.tabModes["chromeTab"].maxTabs++;
            }
            if (isplw) {
                this.plwtab[this.epvp.messageid] = tabmail.openTab("chromeTab", { chromePage: url, onLoad: function(tab) {
                    var doc = tab.target;
                    if (doc.getElementById('email-sender'))
                        doc.getElementById('email-sender').innerHTML = _tb_self.epvp.sender;
                    if (doc.getElementById('email-receiver'))
                        doc.getElementById('email-receiver').innerHTML = _tb_self.epvp.receiver;
                } });
			} else {
                var tab = this.plwtab[this.epvp.messageid];
                if (tab && tab.browser) {
                    this.plwtab[this.epvp.messageid].browser.loadURI(url);
                    tabmail.switchToTab(this.plwtab[this.epvp.messageid]);
                } else {
                    tabmail.openTab("chromeTab", { chromePage: url });
                }
                /*
				try {
					tabmail.closeTab(this.plwtab[this.epvp.messageid]);
				}
				catch(e) {}
				finally {
					tabmail.openTab("chromeTab", { chromePage: url });
				}
                */
			}
		} else {
		    if (isplw) this.plwtab[this.epvp.messageid] = window.openDialog("chrome://messenger/content/", "_blank",  
		                     "chrome,dialog=no,all", null,  
		                     { tabType: "chromeTab",  
		                       tabParams: { chromePage: url, onLoad: function(tab) {
                                    var doc = tab.target;
                                    doc.getElementById('email-sender').innerHTML = _tb_self.epvp.sender;
                                    doc.getElementById('email-receiver').innerHTML = _tb_self.epvp.receiver;
                                } } });
			else {
                var tab = this.plwtab[this.epvp.messageid];
                if (tab && tab.browser) {
                    this.plwtab[this.epvp.messageid].browser.loadURI(url);
                    tabmail.switchToTab(this.plwtab[this.epvp.messageid]);
                } else {
                    window.openDialog("chrome://messenger/content/", "_blank",  
					                     "chrome,dialog=no,all", null,  
					                     { tabType: "chromeTab",  
					                       tabParams: { chromePage: url } });
                }
                /*
				try {
					tabmail.closeTab(this.plwtab[this.epvp.messageid]);
				}
				catch(e) {}
				finally {
					window.openDialog("chrome://messenger/content/", "_blank",  
					                     "chrome,dialog=no,all", null,  
					                     { tabType: "chromeTab",  
					                       tabParams: { chromePage: url } });
				}
                */
			}
		}
        ////-
	};
	
	/* composeOnSend observer function */
	this.observe = function( subject, topic, data ) {
        ////---130203
        /* minden connector object feliratkozik az eseményre --> ellenőrizni kell,
           hogy benne van-e a compField.references-ben az EPVP-zett levél id-je */
        var msgId = this.epvp.msgHdr.messageId;
        var refs = subject.gMsgCompose.compFields.references;
        //LOG('refindex:'+refs.indexOf(msgId));
        if (refs.indexOf(msgId) == -1) return; // ha nincs benne, nem csinálunk semmit
        ////---
    
        var prefs = Components.classes["@mozilla.org/preferences-service;1"]
                        .getService(Components.interfaces.nsIPrefService)
                        .getBranch("extensions.emailtraceroutevisualizer.");
        /* route pontok hozzáadása a fejléchez, ha be van kapcsolva */
        if (prefs.getBoolPref("epvpheader")) {
            // ha van benne eltávolítjuk, csak egy lista lehet benne
            subject.gMsgCompose.compFields.otherRandomHeaders = 
                subject.gMsgCompose.compFields.otherRandomHeaders
                .replace(/X-EPVP-Route-Point:\s*\[(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})\].*\r\n/g, '');
            var ips = this.epvp.routeips;
            for( var i = 0; i < ips.length; i++)
            {
                subject.gMsgCompose.compFields.otherRandomHeaders += "X-EPVP-Route-Point: ["+ ips[i].ip +"]\r\n";
            }
        }
        
        ////--
        /* promo szöveg csatolása az email szövegéhez (működő módszer, de az aláírás alapú van használatban) */
        /*
        // alter body
        try {
            // le tudnánk kérni az e-mailhoz tartozó beállítást,
            // és megnézni, hogy bepipáltuk-e az akutális email címet;
            // ekkor nem kéne módosítani az aláírást, mégis tudjuk csatolni a szöveget...
            var email = subject.gCurrentIdentity.email;
            var advertmails = prefs.getCharPref("advertmails");
            if (advertmails.search(email) != -1) {
                var editor = subject.gMsgCompose.editor;
                var isHTML = subject.gMsgCompose.composeHTML;
                editor.beginTransaction();
                editor.endOfDocument(); // seek to beginning
                var promotext = prefs.getCharPref("promotext").replace(/\r?\n/g, '<br>');
                if (isHTML) {
                    var html_editor = editor.QueryInterface(Components.interfaces.nsIHTMLEditor);
                    html_editor.insertHTML("<p>"+promotext+"</p>");
                } else {
                    var text_editor = editor.QueryInterface(Components.interfaces.nsIPlaintextEditor);
                    text_editor.insertLineBreak();
                    text_editor.insertText(promotext);
                }
                editor.endTransaction();
            }
        } catch(ex) {
            Components.utils.reportError(ex);
            return false;
        }
        */
        ////--
		
	};
	
	
	this.processObserver = new ProcessObserver_1( _tb_self );
	
	//ide kell valami smtp
	_tb_self.epvp.tracerouter.detect( this.epvp.smtp,  _tb_self);
	
	return this;
}

////
/*
try {
    var epvp_tc = new Thunderbird_connector();
} catch (e) {
    alert(e);
}
    

var observerService = Components.classes["@mozilla.org/observer-service;1"].getService(Components.interfaces.nsIObserverService);
observerService.addObserver(epvp_tc, "mail:composeOnSend", false);
*/
function runEPVP(reply) {
    try {
        var epvp_tc = new Thunderbird_connector(reply);
        var observerService = Components.classes["@mozilla.org/observer-service;1"].getService(Components.interfaces.nsIObserverService);
        observerService.addObserver(epvp_tc, "mail:composeOnSend", false);
        epvp_tc.visualize();
    } catch (e) {
        alert(e);
    }
}
        

////

////
function initFile(id, file) {
    var directoryService = Components.classes["@mozilla.org/file/directory_service;1"].getService(Components.interfaces.nsIProperties);
    var profileFolder = directoryService.get("ProfD", Components.interfaces.nsIFile);
    try {
    profileFolder.append("extensions");
    /*
    var entries = profileFolder.directoryEntries;
    while(entries.hasMoreElements())
    {
      var entry = entries.getNext();
      entry.QueryInterface(Components.interfaces.nsIFile);
      alert(entry.leafName);
    }
    */
    profileFolder.append(id);
    var d = file.split('/');
    for (var i in d) {
        profileFolder.append(d[i]);
    }
    //profileFolder.appendRelativePath(file);
    return profileFolder;
    } catch (e) {
        alert(e + " id: " + id + " file: " + file + " caller: " + initFile.caller);
        throw e;
    }
}
////

function ProcessObserver_1( _tb_self )
{
	this.observe = function(subject, topic, data) {
	
		//route object
		var route = new Array();
		
		var tracerouteRegexp = /(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})/;
	
		    var MY_ID = 'epvp@pet-portal.eu';
            ////
			//var output = Components.classes["@mozilla.org/extensions/manager;1"].getService(Components.interfaces.nsIExtensionManager).getInstallLocation(MY_ID).getItemFile(MY_ID, "traceroute");
            var output = initFile(MY_ID, "traceroute_" + _tb_self.epvp.messageid);
            //alert(output.exists() + " " + output.path);
            ////
            
			// open an input stream from file
	        var istream = Components.classes["@mozilla.org/network/file-input-stream;1"].createInstance(Components.interfaces.nsIFileInputStream);
	        try {
                istream.init(output, 0x01, 0444, 0);
            } catch (e) {
                return this;
            }
	        istream.QueryInterface(Components.interfaces.nsILineInputStream);

	        // read lines into array  
			var line = {},
	        lines = [],
	        hasmore;
	        do {
	            hasmore = istream.readLine(line);
	            lines.push(line.value);
	        } while (hasmore);

	        istream.close();

			var ips = new Array();

			for (var i = 1; i < lines.length; i++)
			{
				var traceip = tracerouteRegexp.exec( lines[i] );
				if ( traceip ) {
					ips.push( traceip[1] );
				}
			}
			
			_tb_self.ips = ips;
	  };
	
	return this;
}
