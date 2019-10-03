Components.utils.import('resource:///modules/iteratorUtils.jsm');
Components.utils.import('resource:///modules/MailUtils.js');
Components.utils.import('resource://gre/modules/PluralForm.jsm');

var reportspam = { // Base object
	version: '1.02',
	
	_initialize: [],
	_shutdown: [],
	
	initialize: function() {
		for(var i=0; i<this._initialize.length; i++) this._initialize[i].apply(this);
	},
	
	shutdown: function() {
		for(var i=0; i<this._shutdown.length; i++) this._shutdown[i].apply(this);
	},
	
	extend: function(ext) {
		if(typeof(ext) == 'function') ext = ext.apply(this);
		for(var k in ext) switch(k) {
			case 'initialize': this._initialize.push(ext[k]); break;
			case 'shutdown': this._shutdown.push(ext[k]); break;
			default: this[k] = ext[k];
		}
	}
};

// Main event listeners
window.addEventListener('load', function() {
	reportspam.initialize();
}, false);

window.addEventListener('unload', function() {
	reportspam.shutdown();
}, false);

// XPCOM shortcuts
reportspam.extend({
	getClassInstance: function(cls, it) {
		return Components.classes['@mozilla.org/' + cls + ';1'].createInstance(Components.interfaces[it]);
	},
	getClassService: function(cls, it) {
		return Components.classes['@mozilla.org/' + cls + ';1'].getService(Components.interfaces[it]);
	}
});

// Utilities
reportspam.extend({
	// Localize strings
	stringbundle: null,
	translate: function(id) {
		if(!this.stringbundle) this.stringbundle = this.getClassService('intl/stringbundle', 'nsIStringBundleService').createBundle('chrome://reportspam/locale/reportspam.properties');
		try {
			return this.stringbundle.GetStringFromName('reportspam.' + id);
		}catch(e) {
			return '';
		}
	},
	
	// Preferences getters / setters
	prefs: null,
	pref: function(id, getter, value) {
		if(!this.prefs) this.prefs = this.getClassService('preferences-service', 'nsIPrefBranch');
		if(id[0] == '.') id = 'extensions.reportspam' + id;
		try {
			return this.prefs[((typeof(value) == 'undefined') ? 'get' : 'set') + getter[0].toUpperCase() + getter.substr(1).toLowerCase() + 'Pref'](id, value);
		}catch(e) {
			return undefined;
		}
	},
	boolPref: function(id, value) {
		return this.pref(id, 'bool', value);
	},
	intPref: function(id, value) {
		return this.pref(id, 'int', value);
	},
	charPref: function(id, value) {
		return this.pref(id, 'char', value);
	}
});

// GUI utils and message display handlers
reportspam.extend({
	// Check if a header is in the preference-defined default set
	isDefaultHeader: function(hn) {
		return this.charPref('.defaultHeaders').match(new RegExp('\b' + hn + '\b', 'gi'));
	},
	
	parseSpamDetector: function() {
		var d = this.charPref('.spamDetector').match(/^([^\s]+)\s*\:\s*(.+)\s*$/);
		if(!d || d.length < 3) return null;
		return {header: d[1].toLowerCase(), tester: new RegExp(d[2], 'gi')};
	},
	
	// Get spam header
	spamHeader: function() {
		var detector = this.parseSpamDetector();
		if(!detector) return null;
		return detector.header;
	},
	
	// Check if a message is tagged as spam in regards of the preference defined regexp
	isSpam: function(hdr) {
		var detector = this.parseSpamDetector();
		if(!detector) return false;
        var hdr = hdr.getStringProperty(detector.header);
		if(typeof(hdr) == 'undefined') return false;
		if(!hdr.match(detector.tester)) return false;
		return true;
	},
	
	// Checks the presence of a plugin tag on a message
	isReportedAs: function(what, hdr) {
		var r = hdr ? hdr.getStringProperty('reportspam-reported-as-' + what) : '';
		return (r == '1');
	},
	
	// Show or hide DOM elements
	showHide: function(ids, show) {
		if(typeof(ids) == 'string') ids = [ids];
		for(var i=0; i<ids.length; i++) {
			ids[i] = document.getElementById(ids[i]);
			if(!ids[i]) continue;
			ids[i].hidden = !show;
			ids[i].style.display = show ? '' : 'none';
			ids[i].setAttribute('disabled', show ? '' : 'true');
		}
		return ids;
	},
	
	// Sets the status, command and label of DOM elements
	setTrigger: function(ids, labelid, cmd) {
		if(typeof(ids) == 'string') ids = [ids];
		for(var i=0; i<ids.length; i++) {
			ids[i] = document.getElementById(ids[i]);
			if(!ids[i]) continue;
			ids[i].label = this.translate(labelid);
			ids[i].tooltiptext = this.translate(labelid + 'tooltip');
			ids[i].setAttribute('disabled', cmd ? '' : 'true');
			ids[i].setAttribute('command', cmd);
		}
		return ids;
	},
	
	// Callback used on message headers display start, expands custom spam tagging header if needed
	viewedMsgOnStartHeaders: function() {
		//If the header name preferences isn't always present, add it to the preference of thunderbird extraExpandedHeaders
		//That will allows us to get the header value that we want if the header name is present
		var sh = this.spamHeader();
		if(sh && !this.isDefaultHeader(sh) && (this.charPref('mailnews.customDBHeaders').indexOf(sh) < 0)) this.charPref('mailnews.customDBHeaders', this.charPref('mailnews.customDBHeaders') + ' ' + sh);
	},
	
	// Callback used on header pane display, eval buttons and menus visibility
	viewedMsgOnBeforeShowHeaderPane: function () {
		//Load the display preferences and change the visibility of the button and the menu item
		var showinmenu = this.boolPref('.showInMenu');
		var showintoolbar = this.boolPref('.showInToolbar');
		var phishingenabled = this.boolPref('.phishing.enabled');
		
		this.showHide('reportspam_button_spamham', showintoolbar);
		this.showHide('reportspam_menu_spamham', showinmenu);
		
		this.showHide('reportspam_button_phishing', showintoolbar && phishingenabled);
		this.showHide('reportspam_menu_phishing', showinmenu && phishingenabled);
		
		var isSpam = this.isSpam(gFolderDisplay.selectedMessage);
		
		if(this.isReportedAs('phishing', gFolderDisplay.selectedMessage)) {
			this.setTrigger(['reportspam_button_spamham', 'reportspam_menu_spamham'], 'reported.spam', '');
			this.setTrigger(['reportspam_button_phishing', 'reportspam_menu_phishing'], 'reported.phishing', '');
		}else if(isSpam) {
			if(this.isReportedAs('ham', gFolderDisplay.selectedMessage)) {
				this.setTrigger(['reportspam_button_spamham', 'reportspam_menu_spamham'], 'reported.ham', '');
				this.showHide(['reportspam_button_phishing', 'reportspam_menu_phishing'], false);
			}else{
				this.setTrigger(['reportspam_button_spamham', 'reportspam_menu_spamham'], 'report.ham', 'reportspam_cmd_ham');
				this.setTrigger(['reportspam_button_phishing', 'reportspam_menu_phishing'], 'report.phishing', 'reportspam_cmd_phishing');
			}
		}else{
			if(this.isReportedAs('spam', gFolderDisplay.selectedMessage)) {
				this.setTrigger(['reportspam_button_spamham', 'reportspam_menu_spamham'], 'reported.spam', '');
				this.setTrigger(['reportspam_button_phishing', 'reportspam_menu_phishing'], 'report.phishing', 'reportspam_cmd_phishing');
			}else{
				this.setTrigger(['reportspam_button_spamham', 'reportspam_menu_spamham'], 'report.spam', 'reportspam_cmd_spam');
				this.setTrigger(['reportspam_button_phishing', 'reportspam_menu_phishing'], 'report.phishing', 'reportspam_cmd_phishing');
			}
		}
		
		//Check if the header view is in expended mode and if the header from the preferences is always present in the header view
		//If the header is not always present and if the header view is not in expanded mode, delete this header from the header view
		var sh = this.spamHeader();
		if(!sh || typeof(gFolderDisplay.selectedMessage[sh]) == 'undefined') return;
		if(this.prefs.getIntPref('mail.show_headers') == 2) return;
		if(this.isDefaultHeader(sh)) return;
		delete gFolderDisplay.selectedMessage[sh];
	},
	
	initialize: function() {
		// Checks if first run, adds buttonset to header toolbar if so
		var ctn  = document.getElementById('header-view-toolbar');
		var set  = ctn ? ctn.currentSet.split(/,/g) : [];
		var installed = this.charPref('.installed');
		if(ctn && (installed != this.version) && set.indexOf('reportspam_button_spamham') < 0) {
			set.unshift('reportspam_button_phishing');
			set.unshift('reportspam_button_spamham');
			ctn.setAttribute('currentset', set.join(','));
			ctn.currentSet = set.join(',');
			document.persist(ctn.id, 'currentset');
			this.charPref('.installed', this.version);
		}
		
		// Set message display listeners
		var rso = this;
		if(typeof(gMessageListeners) != 'undefined') gMessageListeners.push({
			onStartHeaders: function() {
				rso.viewedMsgOnStartHeaders();
			},
			onEndHeaders: function() {},
			onEndAttachments: function() {},
			onBeforeShowHeaderPane: function() {
				rso.viewedMsgOnBeforeShowHeaderPane();
			},
		});
	}
});

// Mail source getter
reportspam.extend({
	// Message source getter callback
	sourceListener: function(count, callback, args) {
		return {
			rso: this,
			src: {},
			callback: callback,
			args: args,
			count: count,
			
			onDataAvailable: function(request, context, inputStream, offset, count) {
				var s = this.rso.getClassInstance('scriptableinputstream', 'nsIScriptableInputStream');
				s.init(inputStream);
				context.QueryInterface(Components.interfaces.nsISupportsString);
				this.src[context.data] += s.read(count);
			},
			
			onStartRequest: function(request, context) {
				context.QueryInterface(Components.interfaces.nsISupportsString);
				this.src[context.data] = '';
			},
			
			onStopRequest: function(request, context, statusCode) {
				context.QueryInterface(Components.interfaces.nsISupportsString);
				if(statusCode != Components.results.NS_OK) {
					dump("Message content retrieving error (" + context.data + ")\n");
					return 0;
				}
				this.count--;
				if(!this.count) this.callback.call(this.rso, this.src, this.args); // All done
			}
		}
	},
	
	// Query messages sources get and call back
	getMessagesSources: function(messages, callback, args){
		var ioService = this.getClassService('network/io-service', 'nsIIOService');
		var mailSession = this.getClassService('messenger/services/session', 'nsIMsgMailSession');
	 	var listener = this.sourceListener(messages.length, callback, args);
	 	for(var i in messages) {
			var nsStr = Components.classes['@mozilla.org/supports-string;1'].createInstance(Components.interfaces.nsISupportsString);
			nsStr.data = messages[i].folder.getUriForMsg(messages[i]);
			let principal = Components.classes["@mozilla.org/systemprincipal;1"].createInstance(Ci.nsIPrincipal);
			ioService.newChannelFromURI2(
				ioService.newURI(mailSession.ConvertMsgURIToMsgURL(nsStr.data, null), null, null),
				null,
                principal,
                principal,
                Components.interfaces.nsILoadInfo.SEC_REQUIRE_SAME_ORIGIN_DATA_INHERITS,
                Components.interfaces.nsIContentPolicy.TYPE_DATAREQUEST
			).asyncOpen(listener, nsStr);
		}
	},
});

// Mail report sender
reportspam.extend({
	sendReportMail: function (messages, what) {
			if(!this.charPref('.' + what + '.reportAddress')) {
				alert(this.translate('reportmail.emptyaddress'));
				dump('reportspam(' + what + ') : Empty report address');
				return false;
			}
			
			this.getMessagesSources(
				messages,
				function(sources, args) {
					this._sendReportMail(sources, args.what, args.identity);
				},
				{what: what, identity: getIdentityForHeader(messages[0])}
			);
	},
	
	_sendReportMail: function(sources, what, identity) {
		var fields = this.getClassInstance('messengercompose/composefields', 'nsIMsgCompFields');
		var params = this.getClassInstance('messengercompose/composeparams', 'nsIMsgComposeParams');
		
		fields.to = this.charPref('.' + what + '.reportAddress');
		fields.subject = this.translate('reportmail.subject.' + what);
		fields.body = this.translate('reportmail.body.' + what) + "\n\n"; 
		
		var msgHdr;
		var ioService = this.getClassService('network/io-service', 'nsIIOService');
		var mailSession = this.getClassService('messenger/services/session', 'nsIMsgMailSession');
		
		var i = 0;
		for(var k in sources) {
			var file = this.getClassService('file/directory_service', 'nsIProperties').get('TmpD', Components.interfaces.nsIFile);
			file.append('reportspam_' + what + '_' + i + '.eml');
			file.createUnique(Components.interfaces.nsIFile.NORMAL_FILE_TYPE, 0o666);
			
			var foStream = this.getClassInstance('network/file-output-stream', 'nsIFileOutputStream');
			foStream.init(file, 0x02 | 0x08 | 0x20, 0o666, 0);
			var converter = this.getClassInstance('intl/converter-output-stream', 'nsIConverterOutputStream');
			converter.init(foStream, 'UTF-8', 0, 0);
			converter.writeString(sources[k]);
			converter.close();
			
			var attachment = this.getClassInstance('messengercompose/attachment', 'nsIMsgAttachment');
			attachment.url = 'file://' + file.path;
			attachment.temporary = true;
			attachment.name = 'reportspam_' + what + '_' + i + '.eml';
			attachment.contentType = 'message/rfc822';
			fields.addAttachment(attachment);
			i++;
		}
		
		params.originalMsgURI = '';
		params.format = Components.interfaces.nsIMsgCompFormat.PlainText;
		params.type = Components.interfaces.nsIMsgCompType.New;
		params.identity = identity;
		params.composeFields = fields;
		
		var msgComposeService = this.getClassService('messengercompose', 'nsIMsgComposeService');
		
		/*return msgComposeService.OpenComposeWindowWithParams(null, params);*/
		
		// Initialization of the message to be sent with various parameters
		var msgCompose = (typeof(msgComposeService['InitCompose']) != 'undefined') ? msgComposeService.InitCompose(null, params) : msgComposeService.initCompose(params); // comm-1.9.2 or comm-central
		var nsIMsgCompDeliverMode = Components.interfaces.nsIMsgCompDeliverMode;
		//msgCompose.currentHeaderData['content-type'].headerValue = 'multipart/report;';
		
		return msgCompose.SendMsg( // Sends the message to the recipient
			ioService.offline ? nsIMsgCompDeliverMode.Later : nsIMsgCompDeliverMode.Now,
			identity,
			accountManager.FindAccountForServer(gFolderDisplay.displayedFolder.server).key,
			null,
			null
		);
	}
});

// HTTP POST report sender
reportspam.extend({
	sendReportHttp: function (messages, what) {
			if(!this.charPref('.' + what + '.reportURL')) {
				alert(this.translate('reporthttp.emptyaddress'));
				dump('reportspam(' + what + ') : Empty report URL');
				return false;
			}
			
			this.getMessagesSources(
				messages,
				function(sources, args) {
					this._sendReportHttp(sources, what);
				},
				what
			);
	},
	
	_sendReportHttp: function(sources, what) {
		var url = this.charPref('.' + what + '.reportURL');
		for(var i in sources) {
			var req = new XMLHttpRequest();
			try {
				req.open('POST', url, true);
				req.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
				req.send('message=' + escape(sources[i]));
			}catch(e) {
				console.error(e);
				dump('Error: ' + e + "\n");
			}
		}
		
		return true;
	}
});

// Main report method
reportspam.extend({
	report: function(what, bypassactions) {
	   	var messages = gFolderDisplay.selectedMessages;
		if(messages.length == 0) return;
		
		var rmode = this.charPref('.' + what + '.reportMode');
		
		if(typeof(rmode) == 'undefined') return; // Unknown report type
		
		if((what == 'phishing') && !this.boolPref('.phishing.enabled')) return;
		
		if(rmode == 'mail') this.sendReportMail(messages, what);
		
		if(rmode == 'http') this.sendReportHttp(messages, what);
		
		for(var i in messages) messages[i].setStringProperty('reportspam-reported-as-' + what, '1');
		
		if(what == 'phishing') this.report('spam', true);
		
		var target = (what == 'phishing') ? 'phishing' : 'spamham';
		this.setTrigger(['reportspam_button_' + target, 'reportspam_menu_' + target], 'reported.' + what, '');
		
		if(bypassactions || (what == 'ham')) return;
		
		// If the option to mark as junk and/or move to folder are selected
		if(this.boolPref('.' + what + '.tagAsJunk')) goDoCommand('cmd_markAsJunk');
		if(this.boolPref('.' + what + '.moveToFolder') && !this.boolPref('.' + what + '.moveToTrash')) {
			var uri = this.charPref('.' + what + '.moveToFolderTarget');
			if(uri && (folder = this.getFolderFromURI(uri))) {
				for(var i in messages) {
					if(messages[i].folder.URI == folder.URI) continue; // Already in dest folder, avoit throwing error
					var xpcomHdrArray = toXPCOMArray([messages[i]], Components.interfaces.nsIMutableArray);
					this.getClassService('messenger/messagecopyservice', 'nsIMsgCopyService').CopyMessages(
						messages[i].folder,
						xpcomHdrArray,
						folder,
						true, null, null, false
					);
				}
			}
		}
		if(this.boolPref('.' + what + '.moveToTrash')) goDoCommand('cmd_delete');
	}
});

// Preferences window utils
reportspam.extend({
	searchFolder: function(f, uri) {
		var sf = f.subFolders;
		while(sf.hasMoreElements()) {
			var f = sf.getNext().QueryInterface(Components.interfaces.nsIMsgFolder);
			if(f.URI == uri) return f;
			if(f.hasSubFolders && (f = this.searchFolder(f, uri))) return f;
		}
		return null;
	},
	getFolderFromURI: function(uri) {
		var accounts = this.getClassService('messenger/account-manager', 'nsIMsgAccountManager').accounts;
		for(var i=0; i<accounts.length; i++) {
			var account = accounts.queryElementAt(i, Components.interfaces.nsIMsgAccount);
			var folder = this.searchFolder(account.incomingServer.rootFolder, uri);
			if(folder) return folder;
		}
		return null;
	},
	updateMoveToFolder: function(what, folder, checkbox) {
		var ml = document.getElementById('reportspam_' + what + '_moveToFolderTarget');
		if(folder) {
			if(typeof(folder) == 'string') folder = this.getFolderFromURI(folder);
			if(!folder) return;
			var p = [], f = folder;
			do {
				p.unshift(f.prettyName);
				f = f.parent;
			} while(f);
			ml.setAttribute('label', p.join('/'));
		}
		var en = checkbox ? checkbox.checked : this.boolPref('.' + what + '.moveToFolder');
		ml.setAttribute('disabled', en ? '' : 'true');
	},
	initFolderMenu: function(what) {
		var mp = document.getElementById('reportspam_' + what + '_moveToFolderTarget_popup');
		mp._teardown();
		mp._ensureInitialized(); // Force rebuild
		this.updateMoveToFolder(what, this.charPref('.' + what + '.moveToFolderTarget'));
	},
	onMoveToFolderTargetSelect: function(what, event) {
		var mp = document.getElementById('reportspam_' + what + '_moveToFolderTarget');
		mp._folder = event.target._folder;
		this.charPref('.' + what + '.moveToFolderTarget', mp._folder.URI);
		this.updateMoveToFolder(what, mp._folder);
	},
	switchReportMode: function(what, mode) {
		if(typeof(what) != 'string') {
			var mode = what.value;
			var what = what.parentNode.parentNode.id.replace(/^reportspam_/, '');
		}
		var el = document.getElementById('reportspam_' + what + '_reportMode_' + mode);
		if(!el) return;
		var l = el.parentNode.childNodes;
		for(var i=0; i<l.length; i++) if(l[i].tagName.toLowerCase() == 'vbox') l[i].hidden = true;
		el.hidden = false;
	},
	initReportMode: function(what) {
		this.switchReportMode(what, this.charPref('.' + what + '.reportMode'));
	},
	updatePhishingMode: function(checkbox) {
		var el = document.getElementById('reportspam_phishing_tab');
		if(!el) return;
		var en = checkbox ? checkbox.checked : this.boolPref('.phishing.enabled');
		this.showHide(['reportspam_button_phishing', 'reportspam_menu_phishing'], en);
	},
	initPreferences: function() {
		this.updatePhishingMode();
		this.initFolderMenu('spam');
		this.initFolderMenu('phishing');
		this.loadPrefs();
	},

    savePrefs: function ()
    {
        let preferenceInputs = document.querySelectorAll('[preference]');

        for (let i = 0; i < preferenceInputs.length; i++)
        {
            let preference = document.querySelector('#' + preferenceInputs[i].getAttribute('preference'));
            let prefValue = null;
            let prefName = preference.getAttribute('name');
            let prefType = preference.getAttribute('type');

            if (preferenceInputs[i].getAttribute("hidden") !== true || preferenceInputs[i].getAttribute("disabled") !== true) {
                switch(prefType)
                {
                    case 'string':
                        prefValue = preferenceInputs[i].value;
                        this.charPref(prefName,prefValue);
                        break;
                    case 'bool':
                        prefValue = preferenceInputs[i].hasAttribute('checked');
                        this.boolPref(prefName,prefValue);
                        break;
                }
            }

            console.info('savePrefs - ' + prefName + '==' + prefValue + ' (' + prefType + ')');
        }
        window.close();
    },

    loadPrefs: function ()
    {
        let preferenceInputs=document.querySelectorAll('[preference]');

        for (let i=0;i<preferenceInputs.length;i++)
        {
            let preference = document.querySelector('#' + preferenceInputs[i].getAttribute('preference'));
            let prefValue = null;
            let prefName = preference.getAttribute('name');
            let prefType = preference.getAttribute('type');

            if (preferenceInputs[i].getAttribute("hidden") !== true || preferenceInputs[i].getAttribute("disabled") !== true) {
                switch(prefType)
                {
                    case 'string':
                        prefValue = this.charPref(prefName);
                        preferenceInputs[i].value = prefValue;
                        break;
                    case 'bool':
                        prefValue = this.boolPref(prefName);
                        preferenceInputs[i].checked = prefValue;
                        break;
                }
            }

            console.info('loadPrefs - '+prefName+'=='+prefValue+' ('+prefType+')');
        }
    }
});
