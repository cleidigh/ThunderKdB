if ("undefined" == typeof(cardbookTabType)) {
	var { Services } = ChromeUtils.import("resource://gre/modules/Services.jsm");
	var { QuickFilterManager } = ChromeUtils.import("resource:///modules/QuickFilterManager.jsm");
	var { XPCOMUtils } = ChromeUtils.import("resource://gre/modules/XPCOMUtils.jsm");
	XPCOMUtils.defineLazyModuleGetter(this, "cardbookRepository", "chrome://cardbook/content/cardbookRepository.js", "cardbookRepository");

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
				document.getElementById("cardboookModeBroadcasterTab").setAttribute("mode", "mail");
				document.getElementById("unreadMessageCount").hidden=false;
			}
		},
		onTabPersist: function() {},
		onTabRestored: function() {},
		onTabSwitched: function(aNewTab, aOldTab) {
			if (aNewTab.mode.name == "cardbook") {
				document.getElementById("cardboookModeBroadcasterTab").setAttribute("mode", "cardbook");
				document.getElementById("totalMessageCount").setAttribute("tooltiptext", cardbookRepository.strBundle.GetStringFromName("statusProgressInformationTooltip"));
			} else {
				document.getElementById("cardboookModeBroadcasterTab").setAttribute("mode", "mail");
				document.getElementById("totalMessageCount").removeAttribute("tooltiptext");
				wdw_cardbook.setElementLabel(document.getElementById('statusText'), "");
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
					aState.title = cardbookRepository.strBundle.GetStringFromName("cardbookTitle");
					aTabmail.openTab('cardbook', aState);
				},
				
				onTitleChanged: function(aTab) {
					aTab.title = cardbookRepository.strBundle.GetStringFromName("cardbookTitle");
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
			if (cardbookPreferences.getBoolPref("extensions.cardbook.exclusive")) {
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

		overrideToolbarMenu: function(addon) {
			var menus = [ 'toolbar-context-menu', 'menu_Toolbars' ];
			for (var i in menus) {
				if (document.getElementById(menus[i])) {
					var myMenu = document.getElementById(menus[i]);
					myMenu.removeEventListener('popupshowing', arguments.callee, true);
					if (addon && addon.isActive) {
						myMenu.addEventListener("popupshowing", function(event) {
							if (cardbookWindowUtils.getBroadcasterOnCardBook()) {
								onViewToolbarsPopupShowing(event, ["navigation-toolbox", "cardbook-toolbox"]);
							} else {
								onToolbarsPopupShowingForTabType(event);
							}
						});
					} else {
						myMenu.addEventListener("popupshowing", function(event) {
							if (cardbookWindowUtils.getBroadcasterOnCardBook()) {
								onViewToolbarsPopupShowing(event, ["navigation-toolbox", "cardbook-toolbox"]);
							}
						});
					}
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
			tabmail.openTab('cardbook', {title: cardbookRepository.strBundle.GetStringFromName("cardbookTitle")});
		}
	};
};

window.addEventListener("load", function(e) {
	var { AddonManager } = ChromeUtils.import("resource://gre/modules/AddonManager.jsm");
	var { XPCOMUtils } = ChromeUtils.import("resource://gre/modules/XPCOMUtils.jsm");
	XPCOMUtils.defineLazyModuleGetter(this, "cardbookRepository", "chrome://cardbook/content/cardbookRepository.js", "cardbookRepository");

	let tabmail = document.getElementById('tabmail');
	if (tabmail) {
		tabmail.registerTabType(cardbookTabType);
		tabmail.registerTabMonitor(cardbookTabMonitor);
	}

	var firstRun = cardbookPreferences.getBoolPref("extensions.cardbook.firstRun");
	if (firstRun) {
		var toolbar = document.getElementById("mail-bar3");
		if (toolbar) {
			var toolbarItems = toolbar.currentSet.split(",");
			var newSet = [];
			var found = false;
			for (var i=0; i<toolbarItems.length; i++) {
				if (toolbarItems[i] == "cardbookToolbarButton") {
					found = true;
				} else if (toolbarItems[i] == "button-address") {
					newSet.push("cardbookToolbarButton");
					newSet.push(toolbarItems[i]);
				} else {
					newSet.push(toolbarItems[i]);
				}
			}
			if (!found) {
				toolbar.insertItem("cardbookToolbarButton");
				toolbar.setAttribute("currentset", newSet.join(","));
				Services.xulStore.persist(toolbar, "currentset");
			}
		}

		wdw_cardbook.addAddressbook("first");
		cardbookPreferences.setBoolPref("extensions.cardbook.firstRun", false);
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

	// for CardBook toolbar depending whether Lightning is installed or not
	AddonManager.getAddonByID(cardbookRepository.LIGHTNING_ID).then(addon => {
		ovl_cardbook.overrideToolbarMenu(addon);
	});
	
	window.removeEventListener('load', arguments.callee, true);
}, false);
