"use strict";
var { Services } = ChromeUtils.import("resource://gre/modules/Services.jsm");
var { ExtensionSupport } = ChromeUtils.import("resource:///modules/ExtensionSupport.jsm");

var mailmerge = class extends ExtensionCommon.ExtensionAPI {
	
	constructor(extension) {
		
		super(extension);
		mailmerge.i18n = extension.localeData;
		
	}
	
	onStartup() {
		
		const aomStartup = Cc["@mozilla.org/addons/addon-manager-startup;1"].getService(Ci.amIAddonManagerStartup);
		const manifestURI = Services.io.newURI("manifest.json", null, this.extension.rootURI);
		
		this.chromeHandle = aomStartup.registerChrome(manifestURI, [["content", "mailmerge", "content/"]]);
		
		ExtensionSupport.registerWindowListener("mailmerge@example.net", {
			
			chromeURLs: [
				
				"chrome://messenger/content/messengercompose/messengercompose.xhtml",
				
				"chrome://mailmerge/content/about.xhtml",
				"chrome://mailmerge/content/dialog.xhtml",
				"chrome://mailmerge/content/preview.xhtml",
				"chrome://mailmerge/content/progress.xhtml",
				
			],
			
			onLoadWindow: loadWindow,
			onUnloadWindow: unloadWindow,
			
		});
		
	}
	
	onShutdown() {
		
		for(let win of Services.wm.getEnumerator("mailmerge")) {
			
			Services.prompt.alert(Services.wm.getMostRecentWindow("mail:3pane"), "Mail Merge", "Mail Merge gets disabled, removed or updated.\nPlease close all open windows of Mail Merge, then click \"OK\".");
			this.onShutdown();
			return;
			
		}
		
		for(let win of Services.wm.getEnumerator("msgcompose")) {
			
			unloadWindow(win);
			
		}
		
		Services.obs.notifyObservers(null, "startupcache-invalidate", null);
		
		ExtensionSupport.unregisterWindowListener("mailmerge@example.net");
		
		this.chromeHandle.destruct();
		this.chromeHandle = null;
		
	}
	
	getAPI(context) {
		
		return {
			
			mailmerge: {
				
				init() {
					
					let prefs = Services.prefs.getDefaultBranch("extensions.mailmerge.");
					prefs.setStringPref("source", 'AddressBook');
					prefs.setStringPref("delivermode", 'Later');
					prefs.setStringPref("attachments", '');
					prefs.setStringPref("cardbook", '');
					prefs.setStringPref("addressbook", '');
					prefs.setStringPref("csv", '');
					prefs.setStringPref("characterset", 'utf-8');
					prefs.setStringPref("fielddelimiter", ',');
					prefs.setStringPref("textdelimiter", '"');
					prefs.setStringPref("json", '');
					prefs.setStringPref("xlsx", '');
					prefs.setStringPref("sheetname", '');
					prefs.setStringPref("pause", '');
					prefs.setStringPref("start", '');
					prefs.setStringPref("stop", '');
					prefs.setStringPref("at", '');
					prefs.setStringPref("recur", '');
					prefs.setStringPref("every", '');
					prefs.setStringPref("between", '');
					prefs.setStringPref("only", '');
					prefs.setIntPref("recipients", 1);
					prefs.setBoolPref("debug", false);
					prefs.setBoolPref("recipientsreminder", true);
					prefs.setBoolPref("variablesreminder", true);
					
				},
				
				click() {
					
					let recentWindow = Services.wm.getMostRecentWindow("");
					if (recentWindow) {
						recentWindow.mailmerge.init();
					}
					
				}
				
			}
			
		};
		
	}
	
}

function loadWindow(win) {
	
	switch(win.location.href) {
		
		case "chrome://messenger/content/messengercompose/messengercompose.xhtml":
			
			win.mailmerge = {};
			Services.scriptloader.loadSubScript("chrome://mailmerge/content/overlay.js", win.mailmerge);
			win.mailmerge.i18n = mailmerge.i18n;
			win.mailmerge.load(win);
			
			win.mailmergeutils = {};
			Services.scriptloader.loadSubScript("chrome://mailmerge/content/utils.js", win.mailmergeutils);
			win.mailmergeutils.load(win);
			
			break;
		
		case "chrome://mailmerge/content/about.xhtml":
		case "chrome://mailmerge/content/dialog.xhtml":
		case "chrome://mailmerge/content/preview.xhtml":
		case "chrome://mailmerge/content/progress.xhtml":
			
			win.mailmerge.i18n = mailmerge.i18n;
			i18n(win);
			
			break;
		
		default:;
		
	}
	
}

function unloadWindow(win) {
	
	switch(win.location.href) {
		
		case "chrome://messenger/content/messengercompose/messengercompose.xhtml":
			
			win.mailmerge.unload(win);
			delete win.mailmerge;
			
			win.mailmergeutils.unload(win);
			delete win.mailmergeutils;
			
			break;
		
		default:;
		
	}
	
}

function i18n(win) {
	
	let elements = win.document.querySelectorAll("[i18n]");
	for(let element of elements) {
		
		let attributes = element.getAttribute("i18n").split(";");
		for(let attribute of attributes) {
			
			if(attribute.includes("=")) {
				element.setAttribute(attribute.split("=")[0], win.mailmerge.i18n.localizeMessage(attribute.split("=")[1]));
			} else {
				element.textContent = win.mailmerge.i18n.localizeMessage(attribute);
			}
			
		}
		
	}
	
}
