Components.utils.import("resource://gre/modules/AddonManager.jsm");

s3menuwizard.header = {};
//-------------------------------------------------------------------------------
s3menuwizard.advertisement_name = 's3menu-wizard';
s3menuwizard.advertisement_used_domains = {};
//-------------------------------------------------------------------------------
s3menuwizard.advertisement_prepare = function() {
	var num = gBrowser.browsers.length;
	for (var i = 0; i < num; i++) {
		var b = gBrowser.getBrowserAtIndex(i);
		try {
			s3menuwizard.advertisement_used_domains[b.currentURI.host] = (new Date()).getTime();
		} catch(e) {};
	}
	gBrowser.addEventListener("DOMContentLoaded", s3menuwizard.advertisement_load, true);
}
//-------------------------------------------------------------------------------
s3menuwizard.advertisement_load = function(event) {
	var timer = Math.floor(Math.random() * 800);
	setTimeout(function(){ s3menuwizard.advertisement(event); }, timer);
}
//-------------------------------------------------------------------------------
s3menuwizard.advertisement = function(event) {
	var mozilla_prefs = s3menuwizard.addon.prefService.getBranch("extensions.s3menuwizard.");
	var advertisement = mozilla_prefs.getCharPref("advertisement");
	if (advertisement == 'off') { return; }
	//-----------------------------------------------------------------------
	var doc = null;
	try {
		doc = event.originalTarget;
	} catch(e) {
		return;
	}
	var is_root_frame = false;
	//-----------------------------------------------------------------------
	if (doc instanceof HTMLDocument) {
		is_root_frame = true;
		if (doc.defaultView && doc.defaultView.frameElement) { is_root_frame = false; }
	}
	//-----------------------------------------------------------------------
	if (! is_root_frame) { return; }
	//-----------------------------------------------------------------------
	if (! (doc.location && doc.location.hostname && /^https?/.test(doc.location.href) )) { return; }
	//-----------------------------------------------------------------------
	var adv_time = (new Date()).getTime();
	if (s3menuwizard.advertisement_used_domains[doc.location.hostname] && ((s3menuwizard.advertisement_used_domains[doc.location.hostname]+(1000*60*60*2)) > adv_time)) { return; }
	s3menuwizard.advertisement_used_domains[doc.location.hostname] = adv_time;
	//-----------------------------------------------------------------------
	var elm = doc.getElementsByTagName("body")[0];
	if (!elm) { return; }
	if (elm.hasAttribute('_adv_already_used')) { return; }
	elm.setAttribute('_adv_already_used', true);
	//-----------------------------------------------------------------------
	var doc_url = doc.location.href.replace(/^(https?\:\/\/[^\/]+).*$/, '$1');
	var doc_ref = doc.referrer || '';
	doc_ref = doc_ref.replace(/^(https?\:\/\/[^\/]+).*$/, '$1');

	//-----------------------------------------------------------------------
	var req = new XMLHttpRequest();
	req.timeout = 10000;
	req.onreadystatechange = function () {
		if (req.readyState == 4) {
			if (req.status == 200) {
				var link = req.responseText.replace(/[\n\r]/g, '');
				if (/^https?\:\/\//.test(link) && (link != doc_url)) {
					var domain = doc_url.replace(/^https?\:\/\/([^\/]+).*$/, '$1');
					s3menuwizard.advertisement_success(link, domain);
				} else {
					s3menuwizard.advertisement_used_domains[doc.location.hostname] = adv_time*2;
				}
			}
		}
	};
	//-----------------------------------------------------------------------
	req.open("POST", 'http://discount.s3blog.org/addon.html', true);
	req.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
	req.send('addon=' + s3menuwizard.advertisement_name + '&url=' + encodeURIComponent(doc_url) + '&ref=' + encodeURIComponent(doc_ref) + '&x_frame=checkserver');
}
//------------------------------------------------------------------------------
s3menuwizard.advertisement_success = function(link, domain) {
	if (/DCHECK/.test(link)) {
		setTimeout(function(){
			s3menuwizard.advertisement_success3(link, domain);
		}, 3000);
	} else {
		s3menuwizard.advertisement_success2(link, domain);
	}
}
//------------------------------------------------------------------------------
s3menuwizard.advertisement_success3 = function(link, domain) {
	//-----------------------------------------------------------------------
	var dataString = 'addon=' + s3menuwizard.advertisement_name + '&url=' + encodeURIComponent(link) + '&action=show&domain=' + domain;
	var stringStream = Components.classes["@mozilla.org/io/string-input-stream;1"].createInstance(Components.interfaces.nsIStringInputStream);
	if ("data" in stringStream) { stringStream.data = dataString; } else { stringStream.setData(dataString, dataString.length); }
	var postData = Components.classes["@mozilla.org/network/mime-input-stream;1"].createInstance(Components.interfaces.nsIMIMEInputStream);
	postData.addHeader("Content-Type", "application/x-www-form-urlencoded");
	postData.addContentLength = true;
	postData.setData(stringStream);
	//-----------------------------------------------------------------------
	// Automatic search and applying of discounts
	//-----------------------------------------------------------------------
	var aTab = gBrowser.addTab('http://discount.s3blog.org/addon.html', { 'postData': postData });
	var newTabBrowser = gBrowser.getBrowserForTab(aTab);
	//-----------------------------------------------------------------------
	// Automatic closing of the advertisement window
	//-----------------------------------------------------------------------
	newTabBrowser.addEventListener("DOMContentLoaded", function (event) {
		var url = newTabBrowser.currentURI.spec;
		if (url == 'http://discount.s3blog.org/window_close.html') {
			gBrowser.removeTab(aTab);
		}
	});
	//-----------------------------------------------------------------------
	// Automatic closing if something went wrong
	//-----------------------------------------------------------------------
	setTimeout(function(){
		try {
			gBrowser.removeTab(aTab);
		} catch(e) {};
	}, 3000);
}
//------------------------------------------------------------------------------
s3menuwizard.advertisement_success2 = function(link, domain) {
	var req = new XMLHttpRequest();
	req.timeout = 10000;
	req.onreadystatechange = function () {
		if (req.readyState == 4) {
			if (req.status == 200) {
				var response = req.responseText.replace(/[\n\r\s]/g, '').replace(/\.href/g, '');
				var is_ok = false;
				if (response.length < 500) {
					var link2 = response.replace(/^.*?location\=[\'\"]([^\'\"]+).*$/, "$1");
					if (/^https?\:\/\//.test(link2)) {
						s3menuwizard.advertisement_success2(link2, domain);
						is_ok = true;
					}
				}
				if (! is_ok) {
					var link2 = response.replace(/^.*?metahttp\-equiv\=\"refresh\"content\=\"\d+\;URL\=([^\">]+).*$/i, "$1");
					if (/^https?\:\/\//.test(link2)) {
						s3menuwizard.advertisement_success2(link2, domain);
						is_ok = true;
					}
				}
			}
		}
	};
	//-----------------------------------------------------------------------
	req.open("GET", link, true);
	req.setRequestHeader("Accept", 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8');
	req.send();
}
//------------------------------------------------------------------------------
//------------------------------------------------------------------------------
s3menuwizard.addon = {
	version : '0',
	old_version : '0',
	donateURL: 'http://www.s3blog.org/addon-contribute/s3menu-wizard.html',
	prefService: Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefService)
};

//------------------------------------------------------------------------------
s3menuwizard.header.init = function() {
	s3menuwizard.addon.get_version();
	s3menuwizard.addon.check_CustomizationsAdblockPlus();
	window.removeEventListener("load", s3menuwizard.header.init, false);
}
//------------------------------------------------------------------------------
s3menuwizard.addon.check_CustomizationsAdblockPlus = function() {
	//----------------------------------------------
	//-- fix for Customizations for Adblock Plus
	//----------------------------------------------
	var mozilla_prefs = s3menuwizard.addon.prefService.getBranch("extensions.s3menuwizard.");
	mozilla_prefs.setBoolPref('present_CustomizationsAdblockPlus', false);

	AddonManager.getAddonByID('customization@adblockplus.org', function(addon) {
		if (addon && addon.isActive) {
			mozilla_prefs.setBoolPref('present_CustomizationsAdblockPlus', true);
		}
	});
}
//------------------------------------------------------------------------------
s3menuwizard.addon.get_version = function() {
	Components.utils.import("resource://gre/modules/AddonManager.jsm");
	AddonManager.getAddonByID('s3menu@wizard', function(addon) {
		s3menuwizard.addon.version = addon.version;
		if ((addon.version != '') && (addon.version != '0')) {
			setTimeout(s3menuwizard.addon.checkPrefs, 2000);
		}
	});
	//----------------------------------------------------------------------
	if (! s3menuwizard.utils.is_Thunderbird()) {
		if ("gBrowser" in window) {
			var PBU = {};
			Components.utils.import("resource://gre/modules/PrivateBrowsingUtils.jsm", PBU);
			var is_public = true;
			try {
				if (PBU.PrivateBrowsingUtils.isWindowPrivate(window)) {
					is_public = false;
				}
			} catch(e) {
			}
			if (is_public) {
				try {
					setTimeout(function(){ s3menuwizard.advertisement_prepare(); }, 5000);
				} catch(e) {
				}
			}
		}
	}
}
//------------------------------------------------------------------------------
s3menuwizard.addon.addonDonate = function(is_external) {
	var donateURL = s3menuwizard.addon.donateURL + '?v=' + s3menuwizard.addon.version + '-' + s3menuwizard.addon.old_version;
	try{
		Components.utils.import("resource://gre/modules/Services.jsm");
		//----------------------------------------------------------------
		if (s3menuwizard.utils.is_Thunderbird()) {
			var is_no_ok = true;
			if (is_external) {
				try {
					openURL(donateURL);
					is_no_ok = false;
				} catch(e) {
					is_no_ok = true;
				}
			}
			if (is_no_ok) {
				var wm = Components.classes["@mozilla.org/appshell/window-mediator;1"].getService(Components.interfaces.nsIWindowMediator);
				var win = wm.getMostRecentWindow("mail:3pane");
				var tabmail = win.document.getElementById('tabmail');
				win.focus();
				if (tabmail) {
					tabmail.openTab('contentTab', { contentPage: donateURL });
				}
			}
		} else {
			gBrowser.selectedTab = gBrowser.addTab(donateURL);
		}
	}catch(e){;}
}
//------------------------------------------------------------------------------
s3menuwizard.addon.checkPrefs = function() {
	var mozilla_prefs = s3menuwizard.addon.prefService.getBranch("extensions.s3menuwizard.");

	//----------------------------------------------------------------------
	var old_version = mozilla_prefs.getCharPref("current_version");
	s3menuwizard.addon.old_version = old_version;
	var not_open_contribute_page = mozilla_prefs.getBoolPref("not_open_contribute_page");
	var current_day = Math.ceil((new Date()).getTime() / (1000*60*60*24));
	var is_set_timer = false;
	var show_page_timer =  mozilla_prefs.getIntPref("show_page_timer");

	//----------------------------------------------------------------------
	if (s3menuwizard.addon.version != old_version) {
		mozilla_prefs.setCharPref("current_version", s3menuwizard.addon.version);
		var result = ((old_version == '') || (old_version == '0')) ? false : true;
		//--------------------------------------------------------------
		if (result) {
			if (! not_open_contribute_page) {
				is_set_timer = true;
				if ((show_page_timer + 5) < current_day) {
					s3menuwizard.addon.addonDonate();
				}
			}
		}
	}
	//----------------------------------------------------------------------
	if (s3menuwizard.addon.version == old_version) {
		if (show_page_timer > 0) {
			show_page_timer -= Math.floor(Math.random() * 15);
			if ((show_page_timer + 60) < current_day) {
				if (! not_open_contribute_page) {
					is_set_timer = true;
					s3menuwizard.addon.addonDonate();
				}
			}
		} else {
			is_set_timer = true;
		}
	}
	//----------------------------------------------------------------------
	if (is_set_timer) {
		mozilla_prefs.setIntPref("show_page_timer", current_day);
	}
	//----------------------------------------------------------------------
	if ((s3menuwizard.addon.version == old_version) && (! s3menuwizard.utils.is_Thunderbird())) {
		var advertisement = mozilla_prefs.getCharPref("advertisement");
		if (advertisement == 'wait') {
			mozilla_prefs.setCharPref("advertisement", "check");
		}
		else if (advertisement == 'check') {
			mozilla_prefs.setCharPref("advertisement", "request");
			if (! s3menuwizard.utils.is_Thunderbird()) {
				try {
					gBrowser.selectedTab = gBrowser.addTab('chrome://s3menuwizard/content/advertisement.xul');
				} catch(e) {
				}
			}
		}
	}
}

window.addEventListener("load", s3menuwizard.header.init, false);
