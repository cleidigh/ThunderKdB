var { Services } = ChromeUtils.import("resource://gre/modules/Services.jsm");
var { QuickFilterManager } = ChromeUtils.import("resource:///modules/QuickFilterManager.jsm");
var { ConversionHelper } = ChromeUtils.import("chrome://cardbook/content/api/ConversionHelper/ConversionHelper.jsm");
var { XPCOMUtils } = ChromeUtils.import("resource://gre/modules/XPCOMUtils.jsm");
XPCOMUtils.defineLazyModuleGetter(this, "cardbookRepository", "chrome://cardbook/content/cardbookRepository.js", "cardbookRepository");

if ("undefined" == typeof(cardbookTabType)) {
	var cardbookTabMonitor = {
		monitorName: "cardbook",
		onTabTitleChanged: function() {},
		onTabOpened: function(aTab) {
			if (aTab.mode.name == "cardbook") {
				wdw_cardbook.loadFirstWindow();
			}
		},
		onTabClosing: function(aTab) {
			if (aTab.mode.name == "cardbook") {
				if (document.getElementById("cardboookModeBroadcasterTab")) {
					document.getElementById("cardboookModeBroadcasterTab").setAttribute("mode", "mail");
				}
				document.getElementById("unreadMessageCount").hidden=false;
			}
		},
		onTabPersist: function() {},
		onTabRestored: function() {},
		onTabSwitched: function(aNewTab, aOldTab) {
			if (aNewTab.mode.name == "cardbook") {
				if (document.getElementById("cardboookModeBroadcasterTab")) {
					document.getElementById("cardboookModeBroadcasterTab").setAttribute("mode", "cardbook");
				}
				document.getElementById("totalMessageCount").setAttribute("tooltiptext", ConversionHelper.i18n.getMessage("statusProgressInformationTooltip"));
			} else {
				if (document.getElementById("cardboookModeBroadcasterTab")) {
					document.getElementById("cardboookModeBroadcasterTab").setAttribute("mode", "mail");
				}
				document.getElementById("totalMessageCount").removeAttribute("tooltiptext");
				document.getElementById("unreadMessageCount").hidden=false;
			}
		}
	};

	var cardbookTabType = {
		name: "cardbook",
		panelId: "cardbookTabPanel",
		modes: {
			cardbook: {
				type: "cardbookTab",
				maxTabs: 1,
				openTab: function(aTab, aArgs) {
					aTab.title = aArgs["title"];
					ovl_cardbookLayout.orientPanes();
				},

				showTab: function(aTab) {
				},

				closeTab: function(aTab) {
				},
				
				persistTab: function(aTab) {
					let tabmail = document.getElementById("tabmail");
					return {
						background: (aTab != tabmail.currentTabInfo)
						};
				},
				
				restoreTab: function(aTabmail, aState) {
					aState.title = ConversionHelper.i18n.getMessage("cardbookTitle");
					aTabmail.openTab('cardbook', aState);
				},
				
				onTitleChanged: function(aTab) {
					aTab.title = ConversionHelper.i18n.getMessage("cardbookTitle");
				},
				
				supportsCommand: function supportsCommand(aCommand, aTab) {
					switch (aCommand) {
						case "cmd_toggleMessagePane":
						case "cmd_viewClassicMailLayout":
						case "cmd_viewVerticalMailLayout":
						case "cmd_printSetup":
						case "cmd_print":
						case "cmd_printpreview":
						case "cmd_selectAll":
						case "cmd_copy":
						case "cmd_cut":
						case "cmd_paste":
						case "cmd_delete":
						case "cmd_find":
						case "cmd_findAgain":
						case "cmd_showQuickFilterBar":
						case "cmd_undo":
						case "cmd_redo":
							return true;
						default:
							return false;
					}
				},
				
				isCommandEnabled: function isCommandEnabled(aCommand, aTab) {
					switch (aCommand) {
						case "cmd_toggleMessagePane":
						case "cmd_viewClassicMailLayout":
						case "cmd_viewVerticalMailLayout":
						case "cmd_printSetup":
						case "cmd_print":
						case "cmd_printpreview":
						case "cmd_selectAll":
						case "cmd_copy":
						case "cmd_cut":
						case "cmd_paste":
						case "cmd_delete":
						case "cmd_find":
						case "cmd_findAgain":
						case "cmd_showQuickFilterBar":
						case "cmd_undo":
						case "cmd_redo":
							return true;
						default:
							return false;
					}
				},
				
				doCommand: function doCommand(aCommand, aTab) {
					switch (aCommand) {
						case "cmd_toggleMessagePane":
							ovl_cardbookLayout.changeResizePanes('viewABContact');
							break;
						case "cmd_viewClassicMailLayout":
						case "cmd_viewVerticalMailLayout":
							ovl_cardbookLayout.changeOrientPanes(aCommand);
							break;
						case "cmd_printSetup":
							PrintUtils.showPageSetup();
							break;
						case "cmd_print":
						case "cmd_printpreview":
							wdw_cardbook.print();
							break;
						case "cmd_selectAll":
							wdw_cardbook.selectAllKey();
							break;
						case "cmd_copy":
							wdw_cardbook.copyKey();
							break;
						case "cmd_cut":
							wdw_cardbook.cutKey();
							break;
						case "cmd_paste":
							wdw_cardbook.pasteKey();
							break;
						case "cmd_delete":
							wdw_cardbook.deleteKey();
							break;
						case "cmd_find":
						case "cmd_findAgain":
						case "cmd_showQuickFilterBar":
							wdw_cardbook.findKey();
							break;
						case "cmd_undo":
							cardbookActions.undo();
							break;
						case "cmd_redo":
							cardbookActions.redo();
							break;
					}
				},

				onEvent: function(aEvent, aTab) {}
			}
		},

		saveTabState: function(aTab) {
		}
	};
};

if ("undefined" == typeof(ovl_cardbook)) {
	var ovl_cardbook = {
		reloadCardBookQFB: function () {
			if (cardbookRepository.cardbookPreferences.getBoolPref("extensions.cardbook.exclusive")) {
				if (document.getElementById('qfb-inaddrbook')) {
					document.getElementById('qfb-inaddrbook').hidden = true;
				}
			} else {
				if (document.getElementById('qfb-inaddrbook')) {
					document.getElementById('qfb-inaddrbook').hidden = false;
				}
			}
			if (document.getElementById("quick-filter-bar-cardbook-bar") && !document.getElementById("quick-filter-bar-cardbook-bar").collapsed) {
				try {
					QuickFilterBarMuxer.updateSearch();
				} catch (e) {}
			}
		},

		overrideToolbarMenu: function() {
			var menus = [ 'toolbar-context-menu', 'menu_Toolbars' ];
			for (var i in menus) {
				if (document.getElementById(menus[i])) {
					var myMenu = document.getElementById(menus[i]);
					myMenu.removeEventListener('popupshowing', arguments.callee, true);
					myMenu.addEventListener("popupshowing", function(event) {
						if (cardbookWindowUtils.getBroadcasterOnCardBook()) {
							onViewToolbarsPopupShowing(event, ["navigation-toolbox", "cardbook-toolbox"]);
						} else {
							// does not exist with messengercompose
							if ("undefined" !== typeof(onToolbarsPopupShowingForTabType)) {
								onToolbarsPopupShowingForTabType(event);
							}
						}
					});
				}
			}
		},

		open: function() {
			var tabmail = document.getElementById("tabmail");
			if (!tabmail) {
				// Try opening new tabs in an existing 3pane window
				let mail3PaneWindow = Services.wm.getMostRecentWindow("mail:3pane");
				if (mail3PaneWindow) {
					tabmail = mail3PaneWindow.document.getElementById("tabmail");
					mail3PaneWindow.focus();
				}
			}
			tabmail.openTab('cardbook', {title: ConversionHelper.i18n.getMessage("cardbookTitle")});
		}
	};
};

window.document.addEventListener("DOMOverlayLoaded_cardbook@vigneau.philippe", function(e) {
	var { Services } = ChromeUtils.import("resource://gre/modules/Services.jsm");
	var { XPCOMUtils } = ChromeUtils.import("resource://gre/modules/XPCOMUtils.jsm");
	var { QuickFilterManager } = ChromeUtils.import("resource:///modules/QuickFilterManager.jsm");
	XPCOMUtils.defineLazyModuleGetter(this, "cardbookRepository", "chrome://cardbook/content/cardbookRepository.js", "cardbookRepository");

	cardbookLocales.updateDocument();

	let tabmail = document.getElementById('tabmail');
	if (tabmail) {
		tabmail.registerTabType(cardbookTabType);
		tabmail.registerTabMonitor(cardbookTabMonitor);
	}

	// the currentset is lost by the overlay loader
	var currentSet = cardbookRepository.cardbookPreferences.getStringPref("extensions.cardbook.cardbookToolbar.currentset");
	if (currentSet) {
		var toolbar = document.getElementById("cardbook-toolbar");
		toolbar.currentSet = currentSet;
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

	ovl_cardbook.overrideToolbarMenu();

	if (document.getElementById("totalMessageCount")) {
		document.getElementById("totalMessageCount").addEventListener("click", wdw_cardbook.openLogEdition, true);
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

	window.document.removeEventListener('DOMOverlayLoaded_cardbook@vigneau.philippe', arguments.callee, true);
}, false);
