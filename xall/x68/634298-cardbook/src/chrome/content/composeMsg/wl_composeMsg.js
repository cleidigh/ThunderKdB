// Import any needed modules.
var { Services } = ChromeUtils.import("resource://gre/modules/Services.jsm");
Services.scriptloader.loadSubScript("chrome://cardbook/content/contactsSidebar/ovl_cardbookContactsSidebarMain.js", window, "UTF-8");

Services.scriptloader.loadSubScript("chrome://cardbook/content/attachvCard/ovl_attachvCard.js", window, "UTF-8");

Services.scriptloader.loadSubScript("chrome://cardbook/content/indexedDB/cardbookEncryptor.js", window, "UTF-8");
Services.scriptloader.loadSubScript("chrome://cardbook/content/indexedDB/cardbookIndexedDB.js", window, "UTF-8");
Services.scriptloader.loadSubScript("chrome://cardbook/content/indexedDB/cardbookIDBCard.js", window, "UTF-8");
Services.scriptloader.loadSubScript("chrome://cardbook/content/indexedDB/cardbookIDBCat.js", window, "UTF-8");
Services.scriptloader.loadSubScript("chrome://cardbook/content/indexedDB/cardbookIDBUndo.js", window, "UTF-8");
Services.scriptloader.loadSubScript("chrome://cardbook/content/indexedDB/cardbookIDBImage.js", window, "UTF-8");
Services.scriptloader.loadSubScript("chrome://cardbook/content/indexedDB/cardbookIDBMailPop.js", window, "UTF-8");
Services.scriptloader.loadSubScript("chrome://cardbook/content/indexedDB/cardbookIDBSearch.js", window, "UTF-8");

Services.scriptloader.loadSubScript("chrome://cardbook/content/cardbookActions.js", window, "UTF-8");
Services.scriptloader.loadSubScript("chrome://cardbook/content/cardbookCardParser.js", window, "UTF-8");
Services.scriptloader.loadSubScript("chrome://cardbook/content/collected/ovl_collected.js", window, "UTF-8");

Services.scriptloader.loadSubScript("chrome://cardbook/content/lists/cardbookListConversion.js", window, "UTF-8");
Services.scriptloader.loadSubScript("chrome://cardbook/content/lists/ovl_list.js", window, "UTF-8");

Services.scriptloader.loadSubScript("chrome://cardbook/content/autocomplete/cardbookAutocompleteSearch.js", window, "UTF-8");
Services.scriptloader.loadSubScript("chrome://cardbook/content/autocomplete/cardbookAutocomplete.js", window, "UTF-8");
Services.scriptloader.loadSubScript("chrome://cardbook/content/composeMsg/ovl_cardbookComposeMsg.js", window, "UTF-8");
Services.scriptloader.loadSubScript("chrome://cardbook/content/cardbookWindowUtils.js", window, "UTF-8");
Services.scriptloader.loadSubScript("chrome://cardbook/content/observers/cardBookObserverRepository.js", window, "UTF-8");
Services.scriptloader.loadSubScript("chrome://cardbook/content/observers/cardBookComposeMsgObserver.js", window, "UTF-8");
Services.scriptloader.loadSubScript("chrome://cardbook/content/observers/cardBookObserver.js", window, "UTF-8");
Services.scriptloader.loadSubScript("chrome://cardbook/content/ovl_cardbook.js", window, "UTF-8");

Services.scriptloader.loadSubScript("chrome://cardbook/content/cardbookInit.js", window, "UTF-8");
Services.scriptloader.loadSubScript("chrome://cardbook/content/cardbookSynchro.js", window, "UTF-8");

function onLoad(wasAlreadyOpen) {
	// contact sidebar
	// usefull at startup if the contact sidebar is already open
	if (!document.getElementById("sidebar-box").hidden) {
		setTimeout(toggleAddressPicker, 0, false);
		setTimeout(toggleAddressPicker, 0, false);
	}

	// attach vCard
	window.addEventListener("compose-send-message", function(e) { window.ovl_attachvCard.attachvCard(e); }, true);

	// collect emails
	window.addEventListener("compose-send-message", function(e) { window.ovl_collected.collectToCardBook(e); }, true);
	
	// autocompletion, buttons and menus
	WL.injectCSS("chrome://cardbook/content/skin/cardbookAutocomplete.css");
	WL.injectCSS("chrome://cardbook/content/skin/cardbookComposeMsg.css");

	WL.injectElements(`
	<!-- horrible hack to have the CardBookKey defined -->
	<!-- <keyset id="viewZoomKeys"> -->
	<key id="CardBookKey" key="__MSG_cardbookMenuItemAccesskey__" modifiers="accel, shift" oncommand="ovl_cardbook.open();" insertafter="key_fullZoomReduce"/>

	<menupopup id="taskPopup">
		<menuitem id="cardbookMenuItem"
			label="__MSG_cardbookMenuItemLabel__" accesskey="__MSG_cardbookMenuItemAccesskey__"
			key="CardBookKey"
			tooltiptext="__MSG_cardbookMenuItemTooltip__"
			oncommand="ovl_cardbook.open();"
			insertafter="tasksMenuAddressBook"/>
	</menupopup>

	<toolbarpalette id="MsgComposeToolbarPalette">
		<toolbarbutton id="cardbookComposeToolbarButton"
			insertafter="button-save"
			label="__MSG_cardbookToolbarButtonLabel__"
			tooltiptext="__MSG_cardbookToolbarButtonTooltip__"
			removable="true"
			oncommand="ovl_cardbook.open();"
			class="toolbarbutton-1"/>
	</toolbarpalette>
	`);

	window.ovl_cardbookComposeMsg.loadMsg();
};

function onUnload(wasAlreadyOpen) {
	window.ovl_cardbookComposeMsg.unloadMsg();
};