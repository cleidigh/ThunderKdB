// Import any needed modules.
var { Services } = ChromeUtils.import("resource://gre/modules/Services.jsm");
Services.scriptloader.loadSubScript("chrome://cardbook/content/cardbookRichContext.js", window, "UTF-8");
Services.scriptloader.loadSubScript("chrome://cardbook/content/cardbookEncryptor.js", window, "UTF-8");
Services.scriptloader.loadSubScript("chrome://cardbook/content/cardbookIndexedDB.js", window, "UTF-8");
Services.scriptloader.loadSubScript("chrome://cardbook/content/cardbookActions.js", window, "UTF-8");
Services.scriptloader.loadSubScript("chrome://cardbook/content/cardbookCardParser.js", window, "UTF-8");
Services.scriptloader.loadSubScript("chrome://cardbook/content/cardbookWebDAV.js", window, "UTF-8");
Services.scriptloader.loadSubScript("chrome://cardbook/content/cardbookWindowUtils.js", window, "UTF-8");
Services.scriptloader.loadSubScript("chrome://cardbook/content/cardbookElementTools.js", window, "UTF-8");
Services.scriptloader.loadSubScript("chrome://cardbook/content/observers/cardBookObserverRepository.js", window, "UTF-8");
Services.scriptloader.loadSubScript("chrome://cardbook/content/observers/cardBookObserver.js", window, "UTF-8");
Services.scriptloader.loadSubScript("chrome://cardbook/content/cardbookSynchro.js", window, "UTF-8");
Services.scriptloader.loadSubScript("chrome://cardbook/content/formatEmailCorrespondents/ovl_formatEmailCorrespondents.js", window, "UTF-8");
Services.scriptloader.loadSubScript("chrome://cardbook/content/layout/ovl_cardbookLayout.js", window, "UTF-8");
Services.scriptloader.loadSubScript("chrome://cardbook/content/mailContact/ovl_cardbookMailContacts.js", window, "UTF-8");
Services.scriptloader.loadSubScript("chrome://cardbook/content/ovl_cardbook.js", window, "UTF-8");
Services.scriptloader.loadSubScript("chrome://cardbook/content/wdw_cardbook.js", window, "UTF-8");
Services.scriptloader.loadSubScript("chrome://cardbook/content/birthdays/cardbookBirthdaysUtils.js", window, "UTF-8");
Services.scriptloader.loadSubScript("chrome://cardbook/content/birthdays/ovl_birthdays.js", window, "UTF-8");
Services.scriptloader.loadSubScript("chrome://cardbook/content/cardbookNotifications.js", window, "UTF-8");
Services.scriptloader.loadSubScript("chrome://cardbook/content/cardbookTreeUtils.js", window, "UTF-8");
Services.scriptloader.loadSubScript("chrome://cardbook/content/cardbookClipboard.js", window, "UTF-8");
Services.scriptloader.loadSubScript("chrome://cardbook/content/cardbookTreeCols.js", window, "UTF-8");
Services.scriptloader.loadSubScript("chrome://cardbook/content/observers/cardBookWindowObserver.js", window, "UTF-8");
Services.scriptloader.loadSubScript("chrome://cardbook/content/cardbookDirTree.js", window, "UTF-8");
Services.scriptloader.loadSubScript("chrome://cardbook/content/cardEdition/wdw_imageEdition.js", window, "UTF-8");
Services.scriptloader.loadSubScript("chrome://cardbook/content/cardEdition/wdw_cardEdition.js", window, "UTF-8");
Services.scriptloader.loadSubScript("chrome://cardbook/content/mailContact/ovl_cardbookFindEmails.js", window, "UTF-8");
Services.scriptloader.loadSubScript("chrome://cardbook/content/mailContact/ovl_cardbookFindEvents.js", window, "UTF-8");
Services.scriptloader.loadSubScript("chrome://cardbook/content/attachments/ovl_attachments.js", window, "UTF-8");
// <!-- for the function onViewToolbarsPopupShowing and CustomizeMailToolbar -->
Services.scriptloader.loadSubScript("chrome://messenger/content/mailCore.js", window, "UTF-8");
// <!-- for the textbox -->
Services.scriptloader.loadSubScript("chrome://global/content/globalOverlay.js", window, "UTF-8");
Services.scriptloader.loadSubScript("chrome://global/content/editMenuOverlay.js", window, "UTF-8");

var { Services } = ChromeUtils.import("resource://gre/modules/Services.jsm");
var { QuickFilterManager } = ChromeUtils.import("resource:///modules/QuickFilterManager.jsm");
var { XPCOMUtils } = ChromeUtils.import("resource://gre/modules/XPCOMUtils.jsm");
XPCOMUtils.defineLazyModuleGetter(this, "cardbookRepository", "chrome://cardbook/content/cardbookRepository.js", "cardbookRepository");

// called on window load or on add-on activation while window is already open
function onLoad(wasAlreadyOpen) {
	WL.injectCSS("chrome://cardbook/content/skin/mainToolbarButton.css");
	WL.injectCSS("chrome://cardbook/content/skin/cardbookQFB.css");
	WL.injectCSS("chrome://cardbook/content/skin/cardbookQFB1.css");
	WL.injectCSS("chrome://cardbook/content/skin/cardbookMain.css");
	WL.injectCSS("chrome://cardbook/content/skin/cardbookEmpty.css");
	WL.injectCSS("chrome://cardbook/content/skin/cardbookCheckboxes.css");
	WL.injectCSS("chrome://cardbook/content/skin/cardbookTreeChildrens.css");
	WL.injectCSS("chrome://cardbook/content/skin/cardbookAddressBooks.css");
	// <!-- for the preference star -->
	WL.injectCSS("chrome://cardbook/content/skin/cardbookPrefStar.css");
	// <!-- for MailList icon -->
	WL.injectCSS("chrome://cardbook/content/skin/cardbookCardsIcon.css");
	// <!-- for the search field -->
	WL.injectCSS("chrome://messenger/skin/searchBox.css");
	// <!-- for the icons of the CardBook main toolbar -->
	WL.injectCSS("chrome://cardbook/content/skin/cardbookToolbarButtons.css");
	// <!-- for the icons of the CardBook menus -->
	WL.injectCSS("chrome://cardbook/content/skin/cardbookMenuIcons.css");
	// <!-- for the search textbox -->
	WL.injectCSS("chrome://messenger/skin/input-fields.css");

	WL.injectElements(`
	<broadcasterset id="cardbookBroadcasters" appendto="messengerWindow">
		<broadcaster id="cardboookModeBroadcasterTab" mode="mail"/>
	</broadcasterset>

	<!-- horrible hack to have the CardBook keys defined -->
	<!-- <keyset id="viewZoomKeys"> -->
	<key id="CardBookKey" key="__MSG_cardbookMenuItemKey__" modifiers="accel, shift" oncommand="ovl_cardbook.open();" insertafter="key_fullZoomReduce"/>
	<key id="CardBookNewContactKey" key="__MSG_newCardBookCardMenuKey__" modifiers="accel, shift" oncommand="wdw_cardbook.newKey();" insertafter="key_fullZoomReduce"/>
	<key id="CardBookMenuKey" keycode="VK_F9" oncommand="wdw_cardbook.F9Key();" insertafter="key_fullZoomReduce"/>

	<menupopup id="menu_NewPopup">
		<menuitem id="newCardBookCardMenu" label="__MSG_newCardBookCardMenuLabel__" accesskey="__MSG_newCardBookCardMenuAccesskey__"
			key="CardBookNewContactKey"
			insertafter="menu_newCard" oncommand="wdw_cardbook.newKey();"/>
	</menupopup>

	<menupopup id="menu_FindPopup">
		<menuitem id="newCardBookSearchMenu" label="__MSG_newCardBookSearchMenuLabel__" accesskey="__MSG_newCardBookSearchMenuAccesskey__"
			insertafter="searchAddressesCmd" oncommand="wdw_cardbook.addAddressbook('search');"/>
	</menupopup>

	<menupopup id="view_layout_popup">
		<menuitem id="cardbookABPaneItem"
			type="checkbox"
			label="__MSG_cardbookABPaneItemLabel__" accesskey="__MSG_cardbookABPaneItemAccesskey__"
			oncommand="ovl_cardbookLayout.changeResizePanes('viewABPane')"
			insertafter="menu_showFolderPane"/>
		<menuitem id="cardbookContactPaneItem"
			type="checkbox" key="key_toggleMessagePane"
			label="__MSG_cardbookContactPaneItemLabel__" accesskey="__MSG_cardbookContactPaneItemAccesskey__"
			command="cmd_toggleMessagePane"
			insertafter="menu_showMessage"/>
	</menupopup>

	<menupopup id="taskPopup">
		<menuitem id="cardbookMenuItem"
			label="__MSG_cardbookMenuItemLabel__" accesskey="__MSG_cardbookMenuItemAccesskey__"
			key="CardBookKey"
			tooltiptext="__MSG_cardbookMenuItemTooltip__"
			oncommand="ovl_cardbook.open()"
			insertafter="addressBook"/>
	</menupopup>

	<menupopup id="appmenu_taskPopup">
		<menuitem id="cardbookAppMenuItem"
			label="__MSG_cardbookMenuItemLabel__" accesskey="__MSG_cardbookMenuItemAccesskey__"
			key="CardBookKey"
			tooltiptext="__MSG_cardbookMenuItemTooltip__"
			oncommand="ovl_cardbook.open()"
			insertafter="appmenu_addressBook"/>
	</menupopup>

	<commandset id="cardbook_commands" appendto="messengerWindow">
		<command id="cardbookTabButtonOpen"
			oncommand="ovl_cardbook.open();"/>
	</commandset>

	<toolbarpalette id="MailToolbarPalette">
		<toolbarbutton id="cardbookToolbarButton"
			insertafter="button-address"
			removable="true"
			label="__MSG_cardbookToolbarButtonLabel__"
			tooltiptext="__MSG_cardbookToolbarButtonTooltip__"
			command="cardbookTabButtonOpen"
			class="toolbarbutton-1"/>
	</toolbarpalette>
	
	<menupopup id="emailAddressPopup">
		<menuseparator id="editCardBookSeparator" insertafter="viewContactItem"/>
		<menu id="addToCardBookMenu" label="__MSG_addToCardBookMenuLabel__" accesskey="__MSG_addToCardBookMenuAccesskey__" insertafter="editCardBookSeparator">
			<menupopup id="addToCardBookMenuPopup" onpopupshowing="ovl_cardbookMailContacts.addToCardBookMenuSubMenu(this.id, ovl_cardbookMailContacts.addToCardBook)"/>
		</menu>
		<menuitem id="editInCardBookMenu" label="__MSG_editInCardBookMenuLabel__" accesskey="__MSG_editInCardBookMenuAccesskey__" insertafter="addToCardBookMenu" onclick="ovl_cardbookMailContacts.editOrViewContact();"/>
		<menuitem id="deleteInCardBookMenu" label="__MSG_deleteInCardBookMenuLabel__" accesskey="__MSG_deleteInCardBookMenuAccesskey__" insertafter="editInCardBookMenu" onclick="ovl_cardbookMailContacts.deleteContact();"/>
		<menuseparator id="IMPPCardBookSeparator" insertafter="deleteInCardBookMenu"/>
		<menu id="IMPPCards" label="__MSG_IMPPMenuLabel__" accesskey="__MSG_IMPPMenuAccesskey__" insertafter="IMPPCardBookSeparator">
			<menupopup id="IMPPCardsMenuPopup"/>
		</menu>
		<menuseparator id="findCardBookSeparator1" insertafter="IMPPCards"/>
		<menuitem id="findEmailsFromEmailMessenger" label="__MSG_findEmailsFromEmailMessengerLabel__" accesskey="__MSG_findEmailsFromEmailMessengerAccesskey__"
			oncommand="ovl_cardbookFindEmails.findEmailsFromEmail();" insertafter="findCardBookSeparator1"/>
		<menuitem id="findAllEmailsFromContactMessenger" label="__MSG_findAllEmailsFromContactMessengerLabel__" accesskey="__MSG_findAllEmailsFromContactMessengerAccesskey__"
			oncommand="ovl_cardbookFindEmails.findAllEmailsFromContact();" insertafter="findEmailsFromEmailMessenger"/>
		<menuitem id="findEventsFromEmailMessenger" label="__MSG_findEventsFromEmailMessengerLabel__" accesskey="__MSG_findEventsFromEmailMessengerAccesskey__"
			oncommand="ovl_cardbookFindEvents.findEventsFromEmail();" insertafter="findAllEmailsFromContactMessenger"/>
		<menuitem id="findAllEventsFromContactMessenger" label="__MSG_findAllEventsFromContactMessengerLabel__" accesskey="__MSG_findAllEventsFromContactMessengerAccesskey__"
			oncommand="ovl_cardbookFindEvents.findAllEventsFromContact();" insertafter="findEventsFromEmailMessenger"/>
		<menuseparator id="findCardBookSeparator2" insertafter="findAllEventsFromContactMessenger"/>
	</menupopup>

	<menupopup id="mailContext">
		<menu id="mailContext-addToCardBookMenu" label="__MSG_mailContext-addToCardBookMenuLabel__" accesskey="__MSG_mailContext-addToCardBookMenuAccesskey__" insertafter="mailContext-addemail">
			<menupopup id="mailContext-addToCardBookMenuPopup" onpopupshowing="ovl_cardbookMailContacts.addToCardBookMenuSubMenu(this.id, ovl_cardbookMailContacts.mailContextAddToCardBook)"/>
		</menu>
	</menupopup>

	<menupopup id="attachmentSaveAllMultipleMenu">
		<menu id="attachments1CardBookImport" label="__MSG_addAllAttachementsToCardBookMenuLabel__" insertafter="button-saveAllAttachments">
			<menupopup id="attachments1CardBookImportPopup"/>
		</menu>
	</menupopup>

	<menupopup id="attachmentSaveAllSingleMenu">
		<menu id="attachment1CardBookImport" label="__MSG_addAttachementToCardBookMenuLabel__" insertafter="button-saveAttachment">
			<menupopup id="attachment1CardBookImportPopup"/>
		</menu>
	</menupopup>

	<menupopup id="attachmentListContext">
		<menu id="attachments2CardBookImport" label="__MSG_addAllAttachementsToCardBookMenuLabel__" insertafter="context-saveAllAttachments">
			<menupopup id="attachments2CardBookImportPopup"/>
		</menu>
	</menupopup>

	<menupopup id="attachmentItemContext">
		<menu id="attachment2CardBookImport" label="__MSG_addAttachementToCardBookMenuLabel__" insertafter="context-saveAttachment">
			<menupopup id="attachment2CardBookImportPopup"/>
		</menu>
	</menupopup>

	
	`);

	let tabmail = document.getElementById('tabmail');
	if (tabmail) {
		tabmail.registerTabType(window.cardbookTabType);
		tabmail.registerTabMonitor(window.cardbookTabMonitor);
	}
	
	var firstRun = cardbookRepository.cardbookPreferences.getBoolPref("extensions.cardbook.firstRun");
	if (firstRun) {
		wdw_cardbook.addAddressbook("first");
		cardbookRepository.cardbookPreferences.setBoolPref("extensions.cardbook.firstRun", false);
	}
	
	if (document.getElementById("addressBook")) {
		document.getElementById("addressBook").removeAttribute("key");
	}
	if (document.getElementById("appmenu_addressBook")) {
		document.getElementById("appmenu_addressBook").removeAttribute("key");
	}
	if (document.getElementById("key_addressbook")) {
		document.getElementById("key_addressbook").setAttribute("key", "");
	}
	
	window.ovl_cardbook.overrideToolbarMenu();
	
	if (document.getElementById("totalMessageCount")) {
		document.getElementById("totalMessageCount").addEventListener("click", window.ovl_cardbook.openLogEdition, true);
	}
	
	if ("undefined" != typeof(QuickFilterBarMuxer)) {
		var ABFacetingFilter = {
			name: "cardbook",
			domId: "qfb-cardbook",
			
			/**
			* @return true if the constaint is only on is in addressbooks/isn't in addressbooks,
			*     false if there are specific AB constraints in play.
			*/
			isSimple(aFilterValue) {
				// it's the simple case if the value is just a boolean
				if (typeof aFilterValue != "object") {
					return true;
				}
				// but also if the object contains no non-null values
				let simpleCase = true;
				for (let key in aFilterValue.addressbooks) {
					let value = aFilterValue.addressbooks[key];
					if (value !== null) {
						simpleCase = false;
						break;
					}
				}
				return simpleCase;
			},
			
			/**
			* Because we support both inclusion and exclusion we can produce up to two
			*  groups.  One group for inclusion, one group for exclusion.  To get listed
			*  the message must have any/all of the addressbooks marked for inclusion,
			*  (depending on mode), but it cannot have any of the addressbooks marked for
			*  exclusion.
			*/
			appendTerms(aTermCreator, aTerms, aFilterValue) {
				if (aFilterValue == null) {
					return null;
				}
				
				let term, value;
				
				// just the true/false case
				if (this.isSimple(aFilterValue)) {
					term = aTermCreator.createTerm();
					value = term.value;
					term.attrib = Components.interfaces.nsMsgSearchAttrib.Custom;
					value.attrib = term.attrib;
					value.str = "";
					term.value = value;
					term.customId = "cardbook#searchCorrespondents";
					term.booleanAnd = true;
					term.op = Components.interfaces.nsMsgSearchOp.IsInAB;
					aTerms.push(term);
					// we need to perform faceting if the value is literally true.
					if (aFilterValue === true) {
						return this;
					}
				} else {
					let firstIncludeClause = true, firstExcludeClause = true;
					let lastIncludeTerm = null;
					term = null;
					let excludeTerms = [];
					let mode = aFilterValue.mode;
					for (let key in aFilterValue.addressbooks) {
						let shouldFilter = aFilterValue.addressbooks[key];
						if (shouldFilter !== null) {
							term = aTermCreator.createTerm();
							value = term.value;
							term.attrib = Components.interfaces.nsMsgSearchAttrib.Custom;
							value.attrib = term.attrib;
							value.str = key;
							term.value = value;
							term.customId = "cardbook#searchCorrespondents";
							if (shouldFilter) {
								term.op = Components.interfaces.nsMsgSearchOp.IsInAB;
								// AND for the group. Inside the group we also want AND if the
								// mode is set to "All of".
								term.booleanAnd = firstIncludeClause || (mode === "AND");
								term.beginsGrouping = firstIncludeClause;
								aTerms.push(term);
								firstIncludeClause = false;
								lastIncludeTerm = term;
							} else {
								term.op = Components.interfaces.nsMsgSearchOp.IsntInAB;
								// you need to not include all of the addressbooks marked excluded.
								term.booleanAnd = true;
								term.beginsGrouping = firstExcludeClause;
								excludeTerms.push(term);
								firstExcludeClause = false;
							}
						}
					}
					if (lastIncludeTerm) {
						lastIncludeTerm.endsGrouping = true;
					}
					
					// if we have any exclude terms:
					// - we might need to add a "is in AB" clause if there were no explicit
					//   inclusions.
					// - extend the exclusions list in.
					if (excludeTerms.length) {
						// (we need to add is in AB)
						if (!lastIncludeTerm) {
							term = aTermCreator.createTerm();
							value = term.value;
							term.attrib = Components.interfaces.nsMsgSearchAttrib.Custom;
							value.attrib = term.attrib;
							value.str = "";
							term.value = value;
							term.customId = "cardbook#searchCorrespondents";
							term.booleanAnd = true;
							term.op = Components.interfaces.nsMsgSearchOp.IsInAB;
							aTerms.push(term);
						}
						
						// (extend in the exclusions)
						excludeTerms[excludeTerms.length - 1].endsGrouping = true;
						aTerms.push.apply(aTerms, excludeTerms);
					}
				}
				return null;
			},
		
			onSearchStart(aCurState) {
				// this becomes aKeywordMap; we want to start with an empty one
				return {};
			},
		
			onSearchMessage(aKeywordMap, aMsgHdr, aFolder) {
			},
		
			onSearchDone(aCurState, aKeywordMap, aStatus) {
				// we are an async operation; if the user turned off the AB facet already,
				//  then leave that state intact...
				if (aCurState == null) {
					return [null, false, false];
				}
				
				// only propagate things that are actually addressbooks though!
				let outKeyMap = {addressbooks: {}};
				let allAddressBooks = cardbookRepository.cardbookPreferences.getAllPrefIds();
				for (let i = 0; i < allAddressBooks.length; i++) {
					let dirPrefId = allAddressBooks[i];
					if (cardbookRepository.cardbookPreferences.getEnabled(dirPrefId) && (cardbookRepository.cardbookPreferences.getType(dirPrefId) !== "SEARCH")) {
						if (dirPrefId in aKeywordMap) {
							outKeyMap.addressbooks[dirPrefId] = aKeywordMap[dirPrefId];
						}
					}
				}
				return [outKeyMap, true, false];
			},
		
			/**
			* We need to clone our state if it's an object to avoid bad sharing.
			*/
			propagateState(aOld, aSticky) {
				// stay disabled when disabled, get disabled when not sticky
				if (aOld == null || !aSticky) {
					return null;
				}
				if (this.isSimple(aOld)) {
					return !!aOld; // could be an object, need to convert.
				}
				// return shallowObjCopy(aOld);
				return JSON.parse(JSON.stringify(aOld));
			},
			
			/**
			* Default behaviour but:
			* - We collapse our expando if we get unchecked.
			* - We want to initiate a faceting pass if we just got checked.
			*/
			onCommand(aState, aNode, aEvent, aDocument) {
				let checked = aNode.checked ? true : null;
				if (!checked) {
					aDocument.getElementById("quick-filter-bar-cardbook-bar").collapsed = true;
				}
				
				// return ourselves if we just got checked to have
				// onSearchStart/onSearchMessage/onSearchDone get to do their thing.
				return [checked, true];
			},
			
			domBindExtra(aDocument, aMuxer, aNode) {
				// AB filtering mode menu (All of/Any of)
				function commandHandler(aEvent) {
					let filterValue = aMuxer.getFilterValueForMutation(ABFacetingFilter.name);
					filterValue.mode = aEvent.target.value;
					aMuxer.updateSearch();
				}
				aDocument.getElementById("qfb-cardbook-boolean-mode").addEventListener("ValueChange", commandHandler);
			},
			
			reflectInDOM(aNode, aFilterValue, aDocument, aMuxer) {
				aNode.checked = !!aFilterValue;
				if (aFilterValue != null && typeof aFilterValue == "object") {
					this._populateABBar(aFilterValue, aDocument, aMuxer);
				} else {
					aDocument.getElementById("quick-filter-bar-cardbook-bar").collapsed = true;
				}
			},
			
			_populateABBar(aState, aDocument, aMuxer) {
				let ABbar = aDocument.getElementById("quick-filter-bar-cardbook-bar");
				let keywordMap = aState.addressbooks;
				
				// If we have a mode stored use that. If we don't have a mode, then update
				// our state to agree with what the UI is currently displaying;
				// this will happen for fresh profiles.
				let qbm = aDocument.getElementById("qfb-cardbook-boolean-mode");
				if (aState.mode) {
					qbm.value = aState.mode;
				} else {
					aState.mode = qbm.value;
				}
				
				function commandHandler(aEvent) {
					let ABKey = aEvent.target.getAttribute("value");
					let state = aMuxer.getFilterValueForMutation(ABFacetingFilter.name);
					state.addressbooks[ABKey] = aEvent.target.checked ? true : null;
					aEvent.target.removeAttribute("inverted");
					aMuxer.updateSearch();
				};
				
				function rightClickHandler(aEvent) {
					// Only do something if this is a right-click, otherwise commandHandler
					//  will pick up on it.
					if (aEvent.button == 2) {
						// we need to toggle the checked state ourselves
						aEvent.target.checked = !aEvent.target.checked;
						let ABKey = aEvent.target.getAttribute("value");
						let state = aMuxer.getFilterValueForMutation(ABFacetingFilter.name);
						state.addressbooks[ABKey] = aEvent.target.checked ? false : null;
						if (aEvent.target.checked) {
							aEvent.target.setAttribute("inverted", "true");
						} else {
							aEvent.target.removeAttribute("inverted");
						}
						aMuxer.updateSearch();
						aEvent.stopPropagation();
						aEvent.preventDefault();
					}
				};
				
				for (let i = ABbar.childNodes.length -1; i >= 0; i--) {
					let child = ABbar.childNodes[i];
					if (child.tagName == "menulist") {
						break;
					}
					ABbar.removeChild(child);
				}
		
				let addCount = 0;
				
				var myStyleSheet = "chrome://cardbook/content/skin/cardbookQFB.css";
				var myStyleSheetRuleName = "cardbookQFB";
				for (let styleSheet of InspectorUtils.getAllStyleSheets(window.document, false)) {
					for (let rule of styleSheet.cssRules) {
						// difficult to find as the sheet as no href 
						if (rule.cssText.includes(myStyleSheetRuleName)) {
							cardbookRepository.deleteCssAllRules(styleSheet);
							cardbookRepository.createMarkerRule(styleSheet, myStyleSheetRuleName);
		
							var allAddressBooks = [];
							allAddressBooks = cardbookRepository.cardbookPreferences.getAllPrefIds();
							for (let i = 0; i < allAddressBooks.length; i++) {
								let dirPrefId = allAddressBooks[i];
								if (cardbookRepository.cardbookPreferences.getEnabled(dirPrefId) && (cardbookRepository.cardbookPreferences.getType(dirPrefId) !== "SEARCH")) {
									let dirPrefName = cardbookRepository.cardbookPreferences.getName(dirPrefId);
									addCount++;
									// Keep in mind that the XBL does not get built for dynamically created
									//  elements such as these until they get displayed, which definitely
									//  means not before we append it into the tree.
									let button = aDocument.createXULElement("toolbarbutton");
			
									button.setAttribute("id", "qfb-cardbook-" + dirPrefId);
									button.addEventListener("command", commandHandler);
									button.addEventListener("click", rightClickHandler);
									button.setAttribute("type", "checkbox");
									if (keywordMap[dirPrefId] !== null && keywordMap[dirPrefId] !== undefined) {
										button.setAttribute("checked", "true");
										if (!keywordMap[dirPrefId]) {
											button.setAttribute("inverted", "true");
										}
									}
									button.setAttribute("label", dirPrefName);
									button.setAttribute("value", dirPrefId);
			
									let color = cardbookRepository.cardbookPreferences.getColor(dirPrefId)
									let ruleString = ".qfb-cardbook-button-color[buttonColor=color_" + dirPrefId + "] {color: " + color + " !important;}";
									let ruleIndex = styleSheet.insertRule(ruleString, styleSheet.cssRules.length);
			
									button.setAttribute("buttonColor", "color_" + dirPrefId);
									button.setAttribute("class", "qfb-cardbook-button qfb-cardbook-button-color");
									ABbar.appendChild(button);
								}
							}
							cardbookRepository.reloadCss(myStyleSheet);
						}
					}
				}
				ABbar.collapsed = !addCount;
			},
		};
		QuickFilterManager.defineFilter(ABFacetingFilter);
		QuickFilterBarMuxer._init();
	}
};

function onUnload(wasAlreadyOpen) {
	window.ovl_cardbook.unload();
};
