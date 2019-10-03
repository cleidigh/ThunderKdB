// Main parts of this object taken from Bitcoin Venezuela Add-On. (c) Alexander Salas
var guiElements = {
	synchCallback : null,
	testsCallback : null,
	uriResolver : null,

	startup : function(synchCallback, testsCallback, uriResolver) {
		guiElements.synchCallback = synchCallback;
		guiElements.testsCallback = testsCallback;
		guiElements.uriResolver = uriResolver;

		guiElements.addMenuItem("taskPopup", "sanitizeHistory");
		guiElements.addToolbarBtn();
	},

	toolbarBtnID : "tbBtn_SyncItem",
	toolbarBtn : null,

	saveToolbarInfo : function(aEvt) {
		let tbId = "";
		if (guiElements.toolbarBtn.parentNode !== null)
			tbId = guiElements.toolbarBtn.parentNode.getAttribute("id");
		setPref("toolbar", tbId);

		let tbb4Id = (guiElements.toolbarBtn.nextSibling || "")	&&
			guiElements.toolbarBtn.nextSibling.getAttribute("id").replace(/^wrapper-/i, "");
		setPref("toolbar.before", tbb4Id);
	},

	delToolbarBtn : function() {
		if (guiElements.toolbarBtn !== null)
			guiElements.toolbarBtn.parentNode.removeChild(guiElements.toolbarBtn);
	},

	addToolbarBtn : function() {
		let doc = win.document;

		guiElements.toolbarBtn = doc.createElementNS(NS_XUL, "toolbarbutton");
		guiElements.toolbarBtn.setAttribute("id", guiElements.toolbarBtnID);
		guiElements.toolbarBtn.setAttribute("type", "button");
		guiElements.toolbarBtn.setAttribute("image", guiElements.uriResolver.getResourceURI("icon24BW.png"));
		guiElements.toolbarBtn.setAttribute("label", _("synchShort", retrieveLocale()));
		guiElements.toolbarBtn.addEventListener("command", guiElements.synchCallback, true);

		let tbox = doc.getElementById("navigator-toolbox") || doc.getElementById("mail-toolbox");
		if (tbox === null) {
			log.writeLn("guiElements.addToolbarBtn. Could not find toolbar");
			return;
		}
		tbox.palette.appendChild(guiElements.toolbarBtn);

		let tbId = getPref("toolbar");
		if (tbId) {
			let tb = doc.getElementById(tbId);
			if (tb) {
				let tbb4Id = getPref("toolbar.before");
				let tbb4 = doc.getElementById(tbb4Id);
				if (!tbb4) {
					let currentset = tb.getAttribute("currentset").split(",");
					let i = currentset.indexOf(guiElements.toolbarBtnID) + 1;
					if (i > 0) {
						let len = currentset.length;
						for (; i < len; i++) {
							tbb4 = doc.getElementById(currentset[i]);
							if (tbb4)
								break;
						}
					}
				}

				tb.insertItem(guiElements.toolbarBtnID, tbb4, null, false);
			}
		}

		win.addEventListener("aftercustomization", guiElements.saveToolbarInfo, false);
		unload(guiElements.delToolbarBtn, win);
	},

	fileMenuitemID : "menu_SyncItem",
	fileMenuitemTestID : "menu_SyncTestItem",

	delMenuItem : function() {
		let doc = win.document;

		let menuitem = doc.getElementById(guiElements.fileMenuitemID);
		if (menuitem !== null)
			menuitem.parentNode.removeChild(menuitem);

		let menuitemTests = doc.getElementById(guiElements.fileMenuitemTestID);
		if (menuitemTests !== null)
			menuitemTests.parentNode.removeChild(menuitemTests);
	},

	addMenuItem : function(strMenuPopup, strMenuItemRef) {
		let doc = win.document;

		guiElements.delMenuItem();

		let menuItemSync = doc.createElementNS(NS_XUL, "menuitem");
		menuItemSync.setAttribute("id", guiElements.fileMenuitemID);
		menuItemSync.setAttribute("label", _("synchronize", retrieveLocale()));
		menuItemSync.addEventListener("command", guiElements.synchCallback, true);

		let menuItemRef = doc.getElementById(strMenuItemRef);
		if (menuItemRef === null) {
			log.writeLn("guiElements.addMenuItem. Could not find menu item: " + strMenuItemRef);
			return;
		}
		let menuPopup = doc.getElementById(strMenuPopup);
		if (menuPopup === null) {
			log.writeLn("guiElements.addMenuItem. Could not find menu popup: " + strMenuPopup);
			return;
		}
		menuPopup.insertBefore(menuItemSync, menuItemRef);

		// Debug menu item. Run tests
		if (getPref("debug.active") === true) {
			let menuItemTests = doc.createElementNS(NS_XUL, "menuitem");
			menuItemTests.setAttribute("id", guiElements.fileMenuitemTestID);
			menuItemTests.setAttribute("label", _("runTests", retrieveLocale()));
			menuItemTests.addEventListener("command", guiElements.testsCallback, true);
			menuPopup.insertBefore(menuItemTests, menuItemSync);
		}

		unload(guiElements.delMenuItem, win);
	},
};
