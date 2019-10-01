"use strict";

var EXPORTED_SYMBOLS = ["Ui"];

const Cu = ChromeUtils;
const Ci = Components.interfaces;
const Cc = Components.classes;

var { Services } = Cu.import("resource://gre/modules/Services.jsm");

/**
 * Add and remove addon user interface - replacement over overlay.xul
 */
class Ui {
	constructor(enableDebug){
		this.enableDebug = enableDebug;
		this.buttonNode = null;
		this.window = null;
		this.loaded = false;

		/** Css components initialization **/
		this.sss = Cc["@mozilla.org/content/style-sheet-service;1"]
			.getService(Ci.nsIStyleSheetService);
		let ios = Cc["@mozilla.org/network/io-service;1"]
			.getService(Ci.nsIIOService);
		this.cssUri = ios.newURI("chrome://ThunderKeepPlus/skin/overlay.css", null, null);

		/** User alerts **/
		this.prompt = Cc["@mozilla.org/embedcomp/prompt-service;1"].getService(Ci.nsIPromptService);

		/** Import localization properties **/
		this.stringBundle = Services.strings.createBundle("chrome://ThunderKeepPlus/locale/overlay.properties?" + Math.random()); // Randomize URI to work around bug 719376

		this.prefs_branch = Services.prefs.getBranch("extensions.thunderkeepplus.");

		this.afterCustomizeFnc = this.afterCustomize.bind(this);
	}

	debug(aMessage) {
		if(this.enableDebug) {
			console.debug("ThunderKeepPlus: " + aMessage);
		}
	}
	
	attach(window) {
		try{
			this.debug("Ui attach");
			if(this.loaded){
				return;
			}
			this.window = window;
			if(!this.sss.sheetRegistered(this.cssUri, this.sss.AUTHOR_SHEET)){
				this.sss.loadAndRegisterSheet(this.cssUri, this.sss.AUTHOR_SHEET);
			}

			this.createOverlay();
		} catch(e) {Cu.reportError("ThunderKeepPlus: Ui.attach " + e);}
	}

	destroy() {
		try{
			this.debug("Ui destroy");
			if(this.sss.sheetRegistered(this.cssUri, this.sss.AUTHOR_SHEET)){
				this.sss.unregisterSheet(this.cssUri, this.sss.AUTHOR_SHEET);
			}
			if(!this.loaded){
				return;
			}
			this.loaded = false;
			this.window.removeEventListener("aftercustomization", this.afterCustomizeFnc, false);

			this.removeNode(this.buttonNode);

			this.buttonNode = null;
			
			this.window = null;
		} catch(e) {Cu.reportError("ThunderKeepPlus: Ui.destroy " + e);}
	}

	createOverlay() {
		try{
				this.debug("Ui createOverlay");
				let toolbox = this.window.document.getElementById("mail-toolbox");
				if(toolbox != null){
					this.debug("\tFound the toolbox");
					// Create the Google Keep button
					this.buttonNode = this.window.document.createElement("toolbarbutton");
					this.buttonNode.setAttribute("id","thunderkeepplus-toolbar-button");
					this.buttonNode.setAttribute("label", this.stringBundle.GetStringFromName("ThunderKeepPlus.label"));
					this.buttonNode.setAttribute("tooltiptext", this.stringBundle.GetStringFromName("ThunderKeepPlus.tooltip"));
					this.buttonNode.setAttribute("class","toolbarbutton-1 chromeclass-toolbar-additional");

					// Add it to the toolbox, this allows the user to move with the customize option
					toolbox.palette.appendChild(this.buttonNode);
					this.loaded = true;
					this.debug("\tButton created");

					let parentNodeId = this.prefs_branch.getCharPref("parentNodeId");

					// If the saved position is the toolbox exit early
					if(parentNodeId === "MailToolbarPalette"){
						this.window.addEventListener("aftercustomization", this.afterCustomizeFnc, false);
						return;
					}

					let parentNode = this.window.document.getElementById(parentNodeId);

					// Move to saved toolbar position
					if(parentNode != null){

						let nextNode = null;
						let nextNodeId = this.prefs_branch.getCharPref("nextNodeId");
						if(nextNodeId !== ""){
							nextNode = this.window.document.getElementById(nextNodeId);
						}

						parentNode.insertItem(this.buttonNode.id, nextNode);

						this.debug("\tButton placed under \"" + parentNodeId
								+ "\", before \"" + nextNodeId + "\"");
					} else {
						let msg = "ThunderKeepPlus could not insert the button in the toolbar" +
											", please right click on the toolbar select Customize... " +
											" and drag and drop the button"
						this.window.setTimeout(function(){
								this.prompt.alert(null, "ThunderKeepPlus Warning", msg); }.bind(this),
								3000);
					}
					this.window.addEventListener("aftercustomization", this.afterCustomizeFnc, false);
					
					this.debug("\tDone attaching UI components");
				}
		} catch(e) {Cu.reportError("ThunderKeepPlus: createOverlay " + e);}
	}

	afterCustomize(e) {
		try{
			this.debug("Ui afterCustomize");
			// Save in the preferences the parentNode and the nextSibling
			if (this.buttonNode != null && this.buttonNode.parentNode != null){
				this.prefs_branch.setCharPref("parentNodeId", this.buttonNode.parentNode.id);

				if(this.buttonNode.nextSibling != null){
					this.prefs_branch.setCharPref("nextNodeId", this.buttonNode.nextSibling.id);
				} else{
					this.prefs_branch.setCharPref("nextNodeId", "");
				}
			}
			this.debug("Ui afterCustomize new prefs parentNodeId: \"" + 
					this.prefs_branch.getCharPref("parentNodeId") +"\", nextNodeId: \"" +
					this.prefs_branch.getCharPref("nextNodeId") + "\"");
		} catch(e) {Cu.reportError("ThunderKeepPlus: createOverlay " + e);}
	}
	
	removeNode (node){
		if(node != null && node.parentNode != null){
			node.parentNode.removeChild(node);
		}
	}
}

