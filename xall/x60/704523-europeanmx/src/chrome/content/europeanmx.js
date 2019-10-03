Components.utils.import('resource://gre/modules/PluralForm.jsm');
Components.utils.import('resource:///modules/MailUtils.js');

var europeanmx = { // Base object
	version: '1.0',

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
	europeanmx.initialize();
}, false);

window.addEventListener('unload', function() {
	europeanmx.shutdown();
}, false);

// XPCOM shortcuts
europeanmx.extend({
	getClassInstance: function(cls, it) {
		return Components.classes['@mozilla.org/' + cls + ';1'].createInstance(Components.interfaces[it]);
	},
	getClassService: function(cls, it) {
		return Components.classes['@mozilla.org/' + cls + ';1'].getService(Components.interfaces[it]);
	}
});

// Utilities
europeanmx.extend({
	// Localize strings
	stringbundle: null,
	translate: function(id) {
		if(!this.stringbundle) this.stringbundle = this.getClassService('intl/stringbundle', 'nsIStringBundleService').createBundle('chrome://europeanmx/locale/europeanmx.properties');
		try {
			return this.stringbundle.GetStringFromName('europeanmx.' + id);
		}catch(e) {
			return '';
		}
	},

	// Preferences getters / setters
	prefs: null,
	pref: function(id, getter, value) {
		if(!this.prefs) this.prefs = this.getClassService('preferences-service', 'nsIPrefBranch');
		if(id[0] == '.') id = 'extensions.europeanmx' + id;
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
	},

	logger: null,
	log2console: function(s) {
		if(!this.logger) this.logger = this.getClassService('consoleservice', 'nsIConsoleService');
		this.logger.logStringMessage(s);
	},
	dumpVar: function(v, rec) {
		if(typeof(rec) == 'undefined') rec = 0;
		if(rec > 3) return '*** TOO DEEP ***';
		switch(typeof(v)) {
			case 'undefined' : return 'undefined'; break;
			case 'number' : return v; break;
			case 'string' : return '"' + v + '"'; break;
			case 'function' : return v.toString(); break;
			case 'xml' : return '[XML] ' + v.toString(); break;
			case 'object' :
			default :
				if(!v) return 'null';
				if(typeof(v.length) != 'undefined') {
					var o = [];
					for(var i=0; i<v.length; i++) o.push(this.dumpVar(v[i], rec + 1));
					return '[' + o.join(', ') + ']';
				}else{
					var o = [];
					for(var k in v) o.push(k + ': ' + this.dumpVar(v[k], rec + 1));
					return '{' + o.join(', ') + '}';
				}
		}
	},
	dump2console: function(v) {
		this.log2console(this.dumpVar(v));
	}
});

// GUI utils and message display handlers
europeanmx.extend({
	// Check if a header is in the preference-defined default set
	isDefaultHeader: function(hn) {
		return this.charPref('.defaultHeaders').match(new RegExp('\b' + hn + '\b', 'gi'));
	},

	// Get spam header

	spamHeader: function() {
		return null;
	},

	// Check if a message is tagged as spam in regards of the preference defined regexp
	isSpam: function(hdr) {
		return false;
	},

	// Checks the presence of a plugin tag on a message
	isReportedAs: function(what, hdr) {
		var r = hdr ? hdr.getStringProperty('europeanmx-reported-as-' + what) : '';
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
			ids[i].setAttribute('label', this.translate(labelid));
			ids[i].setAttribute('tooltiptext', this.translate(labelid + 'tooltip'));
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
		if(sh && !this.isDefaultHeader(sh)) this.charPref('mailnews.headers.extraExpandedHeaders', true, sh);
	},

	// Callback used on header pane display, evaluate only the button's visibility for the message being displayed
	viewedMsgOnBeforeShowHeaderPane: function () {
		//Load the display preferences and evaluate the visibility of the button
		var selectedMessage = gFolderDisplay.selectedMessage,
            showInToolbar = this.boolPref('.showInToolbar');
		this.showHide('europeanmx_button_spamham', showInToolbar);
		// no point to continue if the option to show the button is not active or no message is selected
        if (!showInToolbar || selectedMessage === null) return;

        var isSpam = this.isSpam(selectedMessage);

		if(isSpam) {
			if(this.isReportedAs('ham', selectedMessage)) {
				this.setTrigger(['europeanmx_button_spamham', 'europeanmx_menu_spamham'], 'reported.ham', '');
			}else{
				this.setTrigger(['europeanmx_button_spamham', 'europeanmx_menu_spamham'], 'report.ham', 'europeanmx_cmd_ham');
			}
		}else{
			if(this.isReportedAs('spam', selectedMessage)) {
				this.setTrigger(['europeanmx_button_spamham', 'europeanmx_menu_spamham'], 'reported.spam', '');
			}else{
				this.setTrigger(['europeanmx_button_spamham', 'europeanmx_menu_spamham'], 'report.spam', 'europeanmx_cmd_spam');
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
		if(ctn && (installed != this.version) && set.indexOf('europeanmx_button_spamham') < 0) {
			set.push('europeanmx_button_spamham');
			ctn.setAttribute('currentset', set.join(','));
			ctn.currentSet = set.join(',');
			document.persist(ctn.id, 'currentset');
			try {
				BrowserToolboxCustomizeDone(true);
			}catch (e) {}
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
			}
		});

        // evaluate the status for our contextmenu entries every time 'contextmenu' event fires up
        addEventListener('contextmenu', function() {
            var selectedMessage = gFolderDisplay.selectedMessage,
                selectedMessages = gFolderDisplay.selectedMessages,
                showInMenu = rso.boolPref('.showInMenu'),
                nothingToReport = true;
            // no point to continue if the option to show the contextmenu item is not active or if
            // there is no message currently selected, so disable our contextmenu entries and simply return
            if (!showInMenu || selectedMessage === null) {
                rso.showHide('europeanmx_menu_spamham', false);
                rso.showHide('europeanmx_separator', false);
                return;
            }
            if(selectedMessages.length == 1) {
                // the 'Report spam' option is available if the message has not been reported yet
                nothingToReport = rso.isReportedAs('spam', selectedMessage) == 1;
            } else {
                // in case more than one message was selected
                // the 'Report spam' option is available if at least one message has not been reported yet
                selectedMessages.forEach(function(message) {
                    if(rso.isReportedAs('spam', message) != 1) {
                        nothingToReport = false;
                    }
                });
            }
            rso.showHide('europeanmx_menu_spamham', showInMenu);
            rso.showHide('europeanmx_separator', showInMenu);
            if(nothingToReport) {
                rso.setTrigger(['europeanmx_button_spamham', 'europeanmx_menu_spamham'], 'reported.spam', '');
            } else {
                rso.setTrigger(['europeanmx_button_spamham', 'europeanmx_menu_spamham'], 'report.spam', 'europeanmx_cmd_spam');
            }
        });

    }
});

// HTTP POST report sender
europeanmx.extend({
	// Sends data as http post
	sendReportToServer: function(s, what) {
		var req = new XMLHttpRequest();
		try {
			req.open('POST', "https://europeanmx.eu/spamreport.php", true);
			req.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
			req.setRequestHeader('X-Reported-Via', "europeanmx/" + this.version + " (Thunderbird)" );
			req.send('mailContent=' + encodeURIComponent(s));
		}catch(e) {
			dump('Error: ' + e + "\n");
		}
		return true;
	},

	// Message source getter callback
	httpListener: function(what, callback) {
		return {
			rso: this,
			what: what,
            callback: callback,
			src: {},

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
				if(statusCode != Components.results.NS_OK) {
					dump("Message content retrieving error\n");
					return 0;
				}
				context.QueryInterface(Components.interfaces.nsISupportsString);
				this.rso.sendReportToServer(this.src[context.data], this.what);
                this.callback.call(this.rso, this.what);
			}
		}
	},

	// Query message source get and registers above listener
	POSTReport: function(msg, what, callback){
		var ioService = this.getClassService('network/io-service', 'nsIIOService');
		var mailSession = this.getClassService('messenger/services/session', 'nsIMsgMailSession');

	 	var nsStr = Components.classes['@mozilla.org/supports-string;1'].createInstance(Components.interfaces.nsISupportsString);
        nsStr.data = msg.folder.getUriForMsg(msg);
        ioService.newChannelFromURI(ioService.newURI(mailSession.ConvertMsgURIToMsgURL(nsStr.data, null), null, null)).asyncOpen(this.httpListener(what, callback), nsStr);
	}

});

// Main report method
europeanmx.extend({
    reportedMessagesCount: null,
    messagesToReport: null,
    report: function(what) {
	   	var messages = gFolderDisplay.selectedMessages;
		if(messages.length == 0) return;
        this.reportedMessagesCount = 0;
        this.messagesToReport = [];
        for(i in messages) {
            // only process messages that haven't already been reported
            if (this.isReportedAs(what, messages[i]) != 1) {
                this.messagesToReport.push(messages[i]);
                this.POSTReport(messages[i], what, this.process);
            }
        }
	},
    process: function(what) {
        var messages = this.messagesToReport;
        this.reportedMessagesCount++;
        if (this.reportedMessagesCount == messages.length) {
            messages.forEach(function(message) {
                message.setStringProperty('europeanmx-reported-as-' + what, '1');
            });

            var target = 'spamham';
            this.setTrigger(['europeanmx_button_' + target, 'europeanmx_menu_' + target], 'reported.' + what, '');

            if(what == 'ham') return;

            // If the option to mark as junk and/or move to trash are selected
            if(this.boolPref('.' + what + '.tagAsJunk')) goDoCommand('cmd_markAsJunk');
            if(this.boolPref('.' + what + '.moveToTrash')) goDoCommand('cmd_delete');
        }
    }
});

// Preferences window utils
europeanmx.extend({
	switchReportMode: function(what, mode) {
		if(typeof(what) != 'string') {
			var mode = what.value;
			var what = what.parentNode.parentNode.id.replace(/^europeanmx_/, '');
		}
		var el = document.getElementById('europeanmx_' + what + '_reportmode_' + mode);
		if(!el) return;
		var l = el.parentNode.childNodes;
		for(var i=0; i<l.length; i++) if(l[i].tagName.toLowerCase() == 'vbox') l[i].hidden = true;
		el.hidden = false;
	},
	initReportMode: function(what) {
		this.switchReportMode(what, this.charPref('.' + what + '.reportmode'));
	}
});
