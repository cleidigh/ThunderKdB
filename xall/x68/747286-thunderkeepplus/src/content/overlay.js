"use strict";

var EXPORTED_SYMBOLS = ["TKPManager"];

const Cu = ChromeUtils;
const Ci = Components.interfaces;
const Cc = Components.classes;

var { Services } = Cu.import("resource://gre/modules/Services.jsm");

class TKPManager {
	constructor(enableDebug) {
		this.enableDebug = enableDebug;
		this.prompt = Cc["@mozilla.org/embedcomp/prompt-service;1"].getService(Ci.nsIPromptService);
		this.strings = Services.strings.createBundle("chrome://ThunderKeepPlus/locale/overlay.properties?" + Math.random());
		this.mailPane = null;
		this.tabManager = null;
		this.tabsArray = null;
		this.loaded = false;
	}
	
	debug(aMessage) {
		if(this.enableDebug) {
			console.debug("ThunderKeepPlus: " + aMessage);
		}
	}
	
	onLoad(document)
	{
		try{
			if(this.loaded){
				return;
			}
			
			this.debug("TKPManager onLoad");
			
			// Main button
			let customButton = document.getElementById("thunderkeepplus-toolbar-button");
			
			if(customButton == null){
				return;
			}
			
			var self = this;
			customButton.addEventListener("click", function(event) {
				self.onToolbarButtonClick(event);
			});
						
			this.debug("tabTitle1 is:\"" + this.strings.GetStringFromName("ThunderKeepPlus.tabTitle1") + 
				"\" and 2 is:\"" + this.strings.GetStringFromName("ThunderKeepPlus.tabTitle2") + "\"");
			
			this.mailPane = Cc["@mozilla.org/appshell/window-mediator;1"].getService(Ci.nsIWindowMediator).getMostRecentWindow("mail:3pane");
			this.tabManager = this.mailPane.document.getElementById("tabmail");
			this.tabsArray = this.tabManager.tabInfo;

			this.loaded = true;

			this.debug("TKPManager onLoad successful");
		} catch(e) {Cu.reportError("ThunderKeepPlus: onLoad " + e);}
	}
	
	onUnload()
	{
		this.debug("TKPManager onUnLoad");
		
		if(!this.loaded){
			this.debug("TKPManager onUnLoad, loaded is false");
			return;
		}

		this.loaded = false;

		this.closeGoogleKeepTab();
	}
	
	siteClickHandler(aEvent) {
		// Don't handle events that: a) aren't trusted, b) have already been
		// handled or c) aren't left-click.
		if (!aEvent.isTrusted || aEvent.defaultPrevented || aEvent.button)
			return true;

		// For all other events, handle them inside thunderbird
		// This allows to have multiple tabs from different accounts, and signing out
		return false;
	}
	
	onToolbarButtonClick(event) {

		// Open a new tab with Google Keep
		try{
			// Handle only left click
			if(event.button !== 0){
				return;
			}
			this.debug("TKPManager trying to open a Google Keep Tab ");
			
			let gtab = this.tabManager.openTab("contentTab", {contentPage: "https://keep.google.com",
																clickHandler: "this.siteClickHandler(event);"});
			
			this.debug("\tTab opened successfully");
			
		} catch(e) {Cu.reportError("ThunderKeepPlus: onToolbarButtonClick " + e);}
	}
		
	closeGoogleKeepTab() {
		// Close all Google Keep tabs
		try{
			this.debug("TKPManager trying to close Google Keep Tabs ");
			this.debug("\tFound " + String(this.tabsArray.length) + " tabs");
			for (let i = 0; i < this.tabsArray.length; i++) {
				let tabBrowser = this.tabsArray[i].browser;
				if(tabBrowser != null){
					this.debug("\tTab " + i +  " with id \"" + tabBrowser.id + "\" and title \"" + this.tabsArray[i].title + "\"");
					if(this.tabsArray[i].title === this.strings.GetStringFromName("ThunderKeepPlus.tabTitle1")
						|| this.tabsArray[i].title === this.strings.GetStringFromName("ThunderKeepPlus.tabTitle2")){
						this.debug("\tClosing tab " + i);
						this.tabManager.closeTab(i);
						i--; // tabsArray changed size because we just closed a tab
					}
				} else {
					this.debug("\tTab " + i + " without id and title \"" + this.tabsArray[i].title + "\"");
				}
			}
			this.debug("\tDone closing tabs");
		} catch(e) { Cu.reportError("ThunderKeepPlus: closeGoogleKeepTab " + e);}
	}
}
