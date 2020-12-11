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
Services.scriptloader.loadSubScript("chrome://cardbook/content/enigmail/cardbookEnigmail.js", window, "UTF-8");
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
// for the function onViewToolbarsPopupShowing and CustomizeMailToolbar
Services.scriptloader.loadSubScript("chrome://messenger/content/mailCore.js", window, "UTF-8");
// for the textbox
Services.scriptloader.loadSubScript("chrome://global/content/globalOverlay.js", window, "UTF-8");
Services.scriptloader.loadSubScript("chrome://global/content/editMenuOverlay.js", window, "UTF-8");
// for the events and tasks
Services.scriptloader.loadSubScript("chrome://cardbook/content/lightning/cardbookLightning.js", window, "UTF-8");

var { Services } = ChromeUtils.import("resource://gre/modules/Services.jsm");

var { XPCOMUtils } = ChromeUtils.import("resource://gre/modules/XPCOMUtils.jsm");
var { cardbookRepository } = ChromeUtils.import("chrome://cardbook/content/cardbookRepository.js");
// for the quickfilter bar
var { QuickFilterManager } = ChromeUtils.import("resource:///modules/QuickFilterManager.jsm");
Services.scriptloader.loadSubScript("chrome://cardbook/content/filters/ovl_filters.js", window, "UTF-8");
Services.scriptloader.loadSubScript("chrome://messenger/content/quickFilterBar.js", window, "UTF-8");
XPCOMUtils.defineLazyGlobalGetters(this, ["InspectorUtils"]);

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
	
	<toolbar id="tabbar-toolbar" shouldExist="true">
		<toolbarbutton id="cardbookTabButton"
			appendto="tabbar-toolbar"
			class="toolbarbutton-1"
			title="__MSG_cardbookTabButtonLabel__"
			tooltiptext="__MSG_cardbookTabButtonTooltip__"
			command="cardbookTabButtonOpen"/>
	</toolbar>

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

	<hbox id="quick-filter-bar-collapsible-buttons" shouldExist="true">
		<toolbarbutton id="qfb-cardbook"
						type="checkbox"
						class="toolbarbutton-1"
						orient="horizontal"
						crop="none"
						style="min-width:16px;"
						label="__MSG_cardbookQFBButtonLabel__"
						tooltiptext="__MSG_cardbookQFBButtonTooltip__"
						insertafter="qfb-starred"/>
	</hbox>

	<vbox id="quick-filter-bar" shouldExist="true">
		<hbox id="quick-filter-bar-expando-cardbook" insertafter="quick-filter-bar-expando">
			<arrowscrollbox id="quick-filter-bar-cardbook-bar"
							orient="horizontal"
							collapsed="true"
							flex="2"
							insertafter="quick-filter-bar-tab-bar">
				<menulist id="qfb-cardbook-boolean-mode"
							tooltiptext="__MSG_quickFilterBar.booleanMode.tooltip__"
							persist="value">
					<menupopup id="qfb-cardbook-boolean-mode-popup">
						<menuitem id="qfb-cardbook-boolean-mode-or" value="OR"
									label="__MSG_quickFilterBar.booleanModeAny.label__"
									tooltiptext="__MSG_quickFilterBar.booleanModeAny.tooltip__"/>
						<menuitem id="qfb-cardbook-boolean-mode-and" value="AND"
									label="__MSG_quickFilterBar.booleanModeAll.label__"
									tooltiptext="__MSG_quickFilterBar.booleanModeAll.tooltip__"/>
					</menupopup>
				</menulist>
			</arrowscrollbox>
		</hbox>
	</vbox>

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

	<tabpanels id="tabpanelcontainer">
		<box id="cardbookTabPanel" orient="vertical" flex="1" onkeypress="wdw_cardbook.chooseActionForKey(event);" collapsed="true">
			<popupset id="cardbook-popupset">
				<menupopup id="cardbook-toolbar-context" onpopupshowing="wdw_cardbook.onViewToolbarsPopupShowing(event, ['navigation-toolbox', 'cardbook-toolbox']);">
					<menuseparator id="customizeCardBookToolbarMenuSeparator"/>
					<menuitem id="CustomizeCardBookToolbar"
						label="__MSG_CustomizeCardBookToolbarLabel__"
						accesskey="__MSG_CustomizeCardBookToolbarAccesskey__"
						oncommand="CustomizeMailToolbar('cardbook-toolbox', 'CustomizeCardBookToolbar')"/>
				</menupopup>
			</popupset>
	
			<toolbox id="cardbook-toolbox"
				class="mail-toolbox"
				mode="full"
				defaultmode="full"
				labelalign="end"
				defaultlabelalign="end">
				<toolbarpalette id="CardBookToolbarPalette">
					<toolbarbutton id="cardbookToolbarAddServerButton"
						label="__MSG_cardbookToolbarAddServerButtonLabel__"
						tooltiptext="__MSG_cardbookToolbarAddServerButtonTooltip__"
						oncommand="wdw_cardbook.addAddressbook();"
						mode="dialog"
						class="toolbarbutton-1"/>
					<toolbarbutton id="cardbookToolbarSyncButton" is="toolbarbutton-menu-button"
						label="__MSG_cardbookToolbarSyncButtonLabel__"
						tooltiptext="__MSG_cardbookToolbarSyncButtonTooltip__"
						oncommand="cardbookRepository.cardbookSynchronization.syncAccounts();"
						class="toolbarbutton-1"
						mode="dialog"
						type="menu-button">
						<menupopup id="cardbookToolbarSyncMenupopup" onpopupshowing="cardbookElementTools.loadSyncAddressBooks(this);"/>
					</toolbarbutton>
					<toolbarbutton id="cardbookToolbarWriteButton" is="toolbarbutton-menu-button" 
						label="__MSG_cardbookToolbarWriteButtonLabel__"
						tooltiptext="__MSG_cardbookToolbarWriteButtonTooltip__"
						oncommand="wdw_cardbook.emailCardsFromWriteButton('2', 'to');"
						class="toolbarbutton-1"
						mode="dialog"
						type="menu-button">
						<menupopup>
							<menuitem id="cardbookContactsMenuToEmailCards" label="__MSG_toEmailCardFromCardsLabel__" oncommand="wdw_cardbook.emailCardsFromWriteButton('1', 'to');"/>
							<menuitem id="cardbookContactsMenuCcEmailCards" label="__MSG_ccEmailCardFromCardsLabel__" oncommand="wdw_cardbook.emailCardsFromWriteButton('1', 'cc');"/>
							<menuitem id="cardbookContactsMenuBccEmailCards" label="__MSG_bccEmailCardFromCardsLabel__" oncommand="wdw_cardbook.emailCardsFromWriteButton('1', 'bcc');"/>
						</menupopup>
					</toolbarbutton>
					<toolbarbutton id="cardbookToolbarChatButton"
						label="__MSG_cardbookToolbarChatButtonLabel__"
						tooltiptext="__MSG_cardbookToolbarChatButtonTooltip__"
						oncommand="cardbookWindowUtils.connectCardsFromChatButton(this);"
						class="toolbarbutton-1"
						mode="dialog"
						type="menu-button">
						<menupopup id="cardbookToolbarChatButtonMenuPopup"/>
					</toolbarbutton>
					<toolbarbutton id="cardbookToolbarConfigurationButton"
						label="__MSG_cardbookToolbarConfigurationButtonLabel__"
						tooltiptext="__MSG_cardbookToolbarConfigurationButtonTooltip__"
						oncommand="cardbookWindowUtils.openConfigurationWindow();"
						mode="dialog"
						class="toolbarbutton-1"/>
					<toolbarbutton id="cardbookToolbarAddContactButton"
						label="__MSG_cardbookToolbarAddContactButtonLabel__"
						tooltiptext="__MSG_cardbookToolbarAddContactButtonTooltip__"
						oncommand="wdw_cardbook.newKey();"
						mode="dialog"
						class="toolbarbutton-1"/>
					<toolbarbutton id="cardbookToolbarAddListButton"
						label="__MSG_cardbookToolbarAddListButtonLabel__"
						tooltiptext="__MSG_cardbookToolbarAddListButtonTooltip__"
						oncommand="wdw_cardbook.createList();"
						mode="dialog"
						class="toolbarbutton-1"/>
					<toolbarbutton id="cardbookToolbarEditButton"
						label="__MSG_cardbookToolbarEditButtonLabel__"
						tooltiptext="__MSG_cardbookToolbarEditButtonTooltip__"
						oncommand="wdw_cardbook.editCard();"
						class="toolbarbutton-1"/>
					<toolbarbutton id="cardbookToolbarRemoveButton"
						label="__MSG_cardbookToolbarRemoveButtonLabel__"
						tooltiptext="__MSG_cardbookToolbarRemoveButtonTooltip__"
						oncommand="wdw_cardbook.deleteCardsAndValidate();"
						mode="dialog"
						class="toolbarbutton-1"/>
					<toolbarbutton id="cardbookToolbarPrintButton"
						label="__MSG_cardbookToolbarPrintButtonLabel__"
						tooltiptext="__MSG_cardbookToolbarPrintButtonTooltip__"
						oncommand="wdw_cardbook.print()"
						mode="dialog"
						class="toolbarbutton-1"/>
					<toolbarbutton id="cardbookToolbarBackButton"
						label="__MSG_cardbookToolbarBackButtonLabel__"
						tooltiptext="__MSG_cardbookToolbarBackButtonTooltip__"
						oncommand="cardbookActions.undo()"
						mode="dialog"
						class="toolbarbutton-1"/>
					<toolbarbutton id="cardbookToolbarForwardButton"
						label="__MSG_cardbookToolbarForwardButtonLabel__"
						tooltiptext="__MSG_cardbookToolbarForwardButtonTooltip__"
						oncommand="cardbookActions.redo()"
						mode="dialog"
						class="toolbarbutton-1"/>
					<toolbarbutton id="cardbookToolbarAppMenuButton"
						title="__MSG_cardbookToolbarAppMenuButtonLabel__"
						tooltiptext="__MSG_cardbookToolbarAppMenuButtonTooltip__"
						class="toolbarbutton-1 button-appmenu"
						mode="dialog"
						type="menu">
						<menupopup id="cardbook-menupopup">
							<menu id="cardbookAccountMenu" label="__MSG_cardbookAccountMenuLabel__">
								<menupopup onpopupshowing="wdw_cardbook.cardbookAccountMenuContextShowing();">
									<menuitem id="cardbookAccountMenuAddServer" label="__MSG_cardbookAccountMenuAddServerLabel__" oncommand="wdw_cardbook.addAddressbook();"/>
									<menuitem id="cardbookAccountMenuEditServer" label="__MSG_cardbookAccountMenuEditServerLabel__" oncommand="wdw_cardbook.editAddressbook();"/>
									<menuitem id="cardbookAccountMenuCloseServer" label="__MSG_cardbookAccountMenuCloseServerLabel__" oncommand="wdw_cardbook.removeAddressbook();"/>
									<menuseparator/>
									<menuitem id="cardbookAccountMenuEnableOrDisableAddressbook" oncommand="wdw_cardbook.enableOrDisableAddressbook();"/>
									<menuseparator/>
									<menuitem id="cardbookAccountMenuReadOnlyOrReadWriteAddressbook" oncommand="wdw_cardbook.readOnlyOrReadWriteAddressbook();"/>
									<menuseparator/>
									<menuitem id="cardbookAccountMenuSync" label="__MSG_cardbookAccountMenuSyncLabel__" oncommand="wdw_cardbook.syncAccountFromAccountsOrCats();"/>
									<menuitem id="cardbookAccountMenuSyncs" label="__MSG_cardbookAccountMenuSyncsLabel__" oncommand="cardbookRepository.cardbookSynchronization.syncAccounts();"/>
									<menuseparator/>
									<menuitem id="cardbookAccountMenuPrint" label="__MSG_cardbookToolbarPrintButtonLabel__" oncommand="wdw_cardbook.printFromAccountsOrCats();"/>
									<menuseparator/>
									<menuitem id="cardbookAccountMenuExportToFile" label="__MSG_exportCardToFileLabel__" oncommand="wdw_cardbook.exportCardsFromAccountsOrCats(this);"/>
									<menuitem id="cardbookAccountMenuExportToDir" label="__MSG_exportCardToDirLabel__" oncommand="wdw_cardbook.exportCardsFromAccountsOrCats(this);"/>
									<menuseparator/>
									<menuitem id="cardbookAccountMenuImportFromFile" label="__MSG_importCardFromFileLabel__" oncommand="wdw_cardbook.importCardsFromFile();"/>
									<menuitem id="cardbookAccountMenuImportFromDir" label="__MSG_importCardFromDirLabel__" oncommand="wdw_cardbook.importCardsFromDir();"/>
								</menupopup>
							</menu>
							<menu id="cardbookContactsMenu" label="__MSG_cardbookContactsMenuLabel__">
								<menupopup onpopupshowing="wdw_cardbook.cardbookContactsMenuContextShowing();">
									<menuitem id="cardbookContactsMenuAddContact" label="__MSG_cardbookToolbarAddContactButtonLabel__" oncommand="wdw_cardbook.newKey();"/>
									<menuitem id="cardbookContactsMenuAddList" label="__MSG_cardbookToolbarAddListButtonLabel__" oncommand="wdw_cardbook.createList();"/>
									<menuitem id="cardbookContactsMenuEditContact" label="__MSG_cardbookToolbarEditButtonLabel__" oncommand="wdw_cardbook.editCard();"/>
									<menuitem id="cardbookContactsMenuRemoveCard" label="__MSG_cardbookToolbarRemoveButtonLabel__" oncommand="wdw_cardbook.deleteCardsAndValidate();"/>
									<menuseparator/>
									<menu id="cardbookContactsMenuCategories" label="__MSG_categoryHeader__">
										<menupopup id="cardbookContactsMenuCategoriesMenuPopup">
											<menuitem id="cardbookContactsMenuCategoriesNew" label="__MSG_categoryMenuLabel__" oncommand="wdw_cardbook.addCategory();"/>
											<menuseparator/>
										</menupopup>
									</menu>
									<menuseparator/>
									<menuitem id="cardbookContactsMenuToEmailCards" label="__MSG_toEmailCardFromCardsLabel__" oncommand="wdw_cardbook.emailCardsFromCards('to');"/>
									<menuitem id="cardbookContactsMenuCcEmailCards" label="__MSG_ccEmailCardFromCardsLabel__" oncommand="wdw_cardbook.emailCardsFromCards('cc');"/>
									<menuitem id="cardbookContactsMenuBccEmailCards" label="__MSG_bccEmailCardFromCardsLabel__" oncommand="wdw_cardbook.emailCardsFromCards('bcc');"/>
									<menuseparator/>
									<menu id="cardbookContactsMenuIMPPCards" label="__MSG_IMPPMenuLabel__">
										<menupopup id="cardbookContactsMenuIMPPCardsMenuPopup"/>
									</menu>
									<menuseparator/>
									<menuitem id="cardbookContactsMenuFindEmails" label="__MSG_findEmailsFromCardsLabel__" oncommand="ovl_cardbookFindEmails.findEmailsFromCards();"/>
									<menuitem id="cardbookContactsMenuFindEvents" label="__MSG_findEventsFromCardsLabel__" oncommand="wdw_cardbook.findEventsFromCards();"/>
									<menuseparator/>
									<menuitem id="cardbookContactsMenuLocalizeCards" label="__MSG_localizeCardFromCardsLabel__" oncommand="wdw_cardbook.localizeCardsFromCards();"/>
									<menuseparator/>
									<menuitem id="cardbookContactsMenuOpenURL" label="__MSG_openURLCardFromCardsLabel__" oncommand="wdw_cardbook.openURLFromCards();"/>
									<menuseparator/>
									<menuitem id="cardbookContactsMenuCutCards" label="__MSG_cutCardFromCardsLabel__" oncommand="wdw_cardbook.cutCardsFromCards();"/>
									<menuitem id="cardbookContactsMenuCopyCards" label="__MSG_copyCardFromCardsLabel__" oncommand="wdw_cardbook.copyCardsFromCards();"/>
									<menuitem id="cardbookContactsMenuPasteCards" label="__MSG_pasteCardFromCardsLabel__" oncommand="wdw_cardbook.pasteCards();"/>
									<menuitem id="cardbookContactsMenuPasteEntry" label="__MSG_pasteEntryLabel__" oncommand="wdw_cardbook.pasteFieldValue();"/>
									<menuseparator/>
									<menuitem id="cardbookContactsMenuPrint" label="__MSG_cardbookToolbarPrintButtonLabel__" oncommand="wdw_cardbook.printFromCards();"/>
									<menuseparator/>
									<menuitem id="cardbookContactsMenuDuplicateCards" label="__MSG_duplicateCardFromCardsLabel__" oncommand="wdw_cardbook.duplicateCards();"/>
									<menuitem id="cardbookContactsMenuMergeCards" label="__MSG_mergeCardsFromCardsLabel__" oncommand="wdw_cardbook.mergeCards();"/>
									<menuseparator/>
									<menuitem id="cardbookContactsMenuExportCardsToFile" label="__MSG_exportCardToFileLabel__" oncommand="wdw_cardbook.exportCardsFromCards(this);"/>
									<menuitem id="cardbookContactsMenuExportCardsToDir" label="__MSG_exportCardToDirLabel__" oncommand="wdw_cardbook.exportCardsFromCards(this);"/>
								</menupopup>
							</menu>
							<menu id="cardbookToolsMenu" label="__MSG_cardbookToolsMenuLabel__">
								<menupopup onpopupshowing="wdw_cardbook.cardbookToolsMenuContextShowing();">
									<menuitem id="cardbookToolsBirthdayList" label="__MSG_cardbookToolsMenuBirthdayListLabel__" oncommand="wdw_cardbook.displayBirthdayList();"/>
									<menuitem id="cardbookToolsSyncLightning" label="__MSG_cardbookToolsMenuSyncLightningLabel__" oncommand="wdw_cardbook.displaySyncList();"/>
									<menuseparator/>
									<menuitem id="cardbookToolsMenuFindSingleDuplicates" label="__MSG_cardbookToolsMenuFindSingleDuplicatesLabel__" oncommand="wdw_cardbook.findDuplicatesFromAccountsOrCats();"/>
									<menuitem id="cardbookToolsMenuFindDuplicates" label="__MSG_cardbookToolsMenuFindAllDuplicatesLabel__" oncommand="wdw_cardbook.findDuplicates();"/>
									<menuseparator/>
									<menuitem id="cardbookToolsMenuLog" label="__MSG_wdw_logEditionTitle__" oncommand="window.ovl_cardbook.openLogEdition();"/>
									<menuseparator/>
									<menuitem id="cardbookToolsMenuOptions" label="__MSG_cardbookToolsMenuPrefsLabel__" oncommand="cardbookWindowUtils.openConfigurationWindow();"/>
								</menupopup>
							</menu>
						</menupopup>
					</toolbarbutton>
					<toolbaritem id="cardbookToolbarSearchBox" flex="1"
						title="__MSG_cardbookToolbarSearchBoxLabel__"
						tooltiptext="__MSG_cardbookToolbarSearchBoxTooltip__"
						mode="dialog"
						class="toolbaritem-noline chromeclass-toolbar-additional">
						<search-textbox id="cardbookSearchInput"
							class="searchBox"
							oncommand="wdw_cardbook.startSearch();"/>
					</toolbaritem>
					<toolbarbutton id="cardbookToolbarComplexSearch"
						label="__MSG_cardbookToolbarComplexSearchLabel__"
						tooltiptext="__MSG_cardbookToolbarComplexSearchTooltip__"
						oncommand="wdw_cardbook.editComplexSearch();"
						mode="dialog"
						class="toolbarbutton-1"/>
					<toolbarbutton id="cardbookToolbarNewEvent"
						label="__MSG_cardbookToolbarNewEventLabel__"
						tooltiptext="__MSG_cardbookToolbarNewEventTooltip__"
						oncommand="wdw_cardbook.createEvent();"
						mode="dialog"
						class="toolbarbutton-1"/>
					<toolbarbutton id="cardbookToolbarNewTodo"
						label="__MSG_cardbookToolbarNewTodoLabel__"
						tooltiptext="__MSG_cardbookToolbarNewTodoTooltip__"
						oncommand="wdw_cardbook.createTodo();"
						mode="dialog"
						class="toolbarbutton-1"/>
					<toolbarbutton id="cardbookToolbarThMenuButton"
						type="menu"
						class="toolbarbutton-1 button-appmenu"
						label="__MSG_cardbookToolbarThMenuButtonLabel__"
						mode="dialog"
						tooltiptext="__MSG_cardbookToolbarThMenuButtonTooltip__"/>
				</toolbarpalette>
		
				<toolbar is="customizable-toolbar"
					id="cardbook-toolbar" class="inline-toolbar chromeclass-toolbar"
					toolbarname="__MSG_cardbookToolbarLabel__"
					accesskey="__MSG_cardbookToolbarAccesskey__"
					fullscreentoolbar="true" mode="full"
					toolboxid="cardbook-toolbox"
					customizable="true"
					context="cardbook-toolbar-context"
					defaultset="cardbookToolbarAppMenuButton,cardbookToolbarSyncButton,cardbookToolbarWriteButton,cardbookToolbarConfigurationButton,cardbookToolbarBackButton,cardbookToolbarForwardButton,spring,cardbookToolbarSearchBox,cardbookToolbarAddContactButton,cardbookToolbarAddListButton,cardbookToolbarEditButton,cardbookToolbarRemoveButton,cardbookToolbarThMenuButton"/>
				<toolbarset id="cardbookToolbars" context="cardbook-toolbar-context"/>
			</toolbox>
			
			<menupopup id="basicFieldContextMenu"/>
	
			<menupopup id="adrTreeContextMenu" onpopupshowing="wdw_cardbook.adrTreeContextShowing();">
				<menuitem id="localizeadrTree" label="__MSG_localizeadrTreeLabel__" oncommand="wdw_cardbook.localizeCardFromTree();"/>
				<menuseparator/>
				<menuitem id="copyadrTree" oncommand="wdw_cardbook.copyEntryFromTree();"/>
			</menupopup>
	
			<menupopup id="telTreeContextMenu" onpopupshowing="wdw_cardbook.telTreeContextShowing();">
				<menuitem id="connecttelTree" label="__MSG_IMPPMenuLabel__" oncommand="wdw_cardbook.openTelFromTree();"/>
				<menuseparator/>
				<menuitem id="copytelTree" oncommand="wdw_cardbook.copyEntryFromTree();"/>
			</menupopup>
	
			<menupopup id="emailTreeContextMenu" onpopupshowing="wdw_cardbook.emailTreeContextShowing();">
				<menuitem id="toemailemailTree" label="__MSG_toEmailEmailTreeLabel__" oncommand="wdw_cardbook.emailCardFromTree('to');"/>
				<menuitem id="ccemailemailTree" label="__MSG_ccEmailEmailTreeLabel__" oncommand="wdw_cardbook.emailCardFromTree('cc');"/>
				<menuitem id="bccemailemailTree" label="__MSG_bccemailemailTreeLabel__" oncommand="wdw_cardbook.emailCardFromTree('bcc');"/>
				<menuseparator/>
				<menuitem id="findemailemailTree" label="__MSG_findemailemailTreeLabel__" oncommand="wdw_cardbook.findEmailsFromTree();"/>
				<menuitem id="findeventemailTree" label="__MSG_findeventemailTreeLabel__" oncommand="wdw_cardbook.findEventsFromTree();"/>
				<menuseparator/>
				<menuitem id="searchForOnlineKeyemailTree" label="__MSG_searchForOnlineKeyTreeLabel__" oncommand="wdw_cardbook.searchForOnlineKeyFromTree();"/>
				<menuseparator/>
				<menuitem id="copyemailTree" oncommand="wdw_cardbook.copyEntryFromTree();"/>
			</menupopup>
	
			<menupopup id="imppTreeContextMenu" onpopupshowing="wdw_cardbook.imppTreeContextShowing();">
				<menuitem id="connectimppTree" label="__MSG_IMPPMenuLabel__" oncommand="wdw_cardbook.openIMPPFromTree();"/>
				<menuseparator/>
				<menuitem id="copyimppTree" oncommand="wdw_cardbook.copyEntryFromTree();"/>
			</menupopup>
	
			<menupopup id="urlTreeContextMenu" onpopupshowing="wdw_cardbook.urlTreeContextShowing();">
				<menuitem id="openURLTree" label="__MSG_openURLTreeLabel__" oncommand="wdw_cardbook.openURLFromTree();"/>
				<menuseparator/>
				<menuitem id="copyurlTree" oncommand="wdw_cardbook.copyEntryFromTree();"/>
			</menupopup>
	
			<menupopup id="eventTreeContextMenu" onpopupshowing="wdw_cardbook.eventTreeContextShowing();">
				<menuitem id="copyeventTree" oncommand="wdw_cardbook.copyEntryFromTree();"/>
			</menupopup>
	
			<menupopup id="accountsOrCatsTreeContextMenu" onpopupshowing="wdw_cardbook.accountsOrCatsTreeContextShowing();">
				<menuitem id="addAccountFromAccountsOrCats" label="__MSG_cardbookToolbarAddServerButtonLabel__" oncommand="wdw_cardbook.addAddressbook();"/>
				<menuitem id="editAccountFromAccountsOrCats" label="__MSG_editAccountFromAccountsOrCatsLabel__" oncommand="wdw_cardbook.editAddressbook();"/>
				<menuitem id="removeAccountFromAccountsOrCats" label="__MSG_removeAccountFromAccountsOrCatsLabel__" oncommand="wdw_cardbook.removeAddressbook();"/>
				<menuseparator/>
				<menuitem id="enableOrDisableFromAccountsOrCats" oncommand="wdw_cardbook.enableOrDisableAddressbook();"/>
				<menuseparator/>
				<menuitem id="readOnlyOrReadWriteFromAccountsOrCats" oncommand="wdw_cardbook.readOnlyOrReadWriteAddressbook();"/>
				<menuseparator/>
				<menuitem id="syncAccountFromAccountsOrCats" label="__MSG_syncAccountFromAccountsOrCatsLabel__" oncommand="wdw_cardbook.syncAccountFromAccountsOrCats();"/>
				<menuseparator/>
				<menuitem id="toEmailCardsFromAccountsOrCats" label="__MSG_toEmailCardFromAccountsOrCatsLabel__" oncommand="wdw_cardbook.emailCardsFromAccountsOrCats('to');"/>
				<menuitem id="ccEmailCardsFromAccountsOrCats" label="__MSG_ccEmailCardFromAccountsOrCatsLabel__" oncommand="wdw_cardbook.emailCardsFromAccountsOrCats('cc');"/>
				<menuitem id="bccEmailCardsFromAccountsOrCats" label="__MSG_bccEmailCardFromAccountsOrCatsLabel__" oncommand="wdw_cardbook.emailCardsFromAccountsOrCats('bcc');"/>
				<menuseparator/>
				<menuitem id="shareCardsByEmailFromAccountsOrCats" label="__MSG_shareCardByEmailFromAccountsOrCatsLabel__" oncommand="wdw_cardbook.shareCardsByEmailFromAccountsOrCats();"/>
				<menuseparator/>
				<menuitem id="cutCardsFromAccountsOrCats" label="__MSG_cutCardFromAccountsOrCatsLabel__" oncommand="wdw_cardbook.cutCardsFromAccountsOrCats();"/>
				<menuitem id="copyCardsFromAccountsOrCats" label="__MSG_copyCardFromAccountsOrCatsLabel__" oncommand="wdw_cardbook.copyCardsFromAccountsOrCats();"/>
				<menuitem id="pasteCardsFromAccountsOrCats" label="__MSG_pasteCardFromAccountsOrCatsLabel__" oncommand="wdw_cardbook.pasteCards();"/>
				<menuseparator/>
				<menuitem id="editNodeFromAccountsOrCats" oncommand="wdw_cardbook.selectNodeToAction('EDIT');"/>
				<menuitem id="removeNodeFromAccountsOrCats" oncommand="wdw_cardbook.selectNodeToAction('REMOVE');"/>
				<menuitem id="convertNodeFromAccountsOrCats" oncommand="wdw_cardbook.selectNodeToAction('CONVERT');"/>
				<menuseparator/>
				<menuitem id="findDuplicatesFromAccountsOrCats" label="__MSG_findDuplicatesFromAccountsOrCatsLabel__" oncommand="wdw_cardbook.findDuplicatesFromAccountsOrCats();"/>
				<menuseparator/>
				<menuitem id="generateFnFromAccountsOrCats" label="__MSG_generateFnFromAccountsOrCatsLabel__" oncommand="wdw_cardbook.generateFnFromAccountsOrCats();"/>
				<menuseparator/>
				<menuitem id="printFromAccountsOrCats" label="__MSG_cardbookToolbarPrintButtonLabel__" oncommand="wdw_cardbook.printFromAccountsOrCats();"/>
				<menuseparator/>
				<menuitem id="exportCardsToFileFromAccountsOrCats" label="__MSG_exportCardToFileLabel__" oncommand="wdw_cardbook.exportCardsFromAccountsOrCats(this);"/>
				<menuitem id="exportCardsToDirFromAccountsOrCats" label="__MSG_exportCardToDirLabel__" oncommand="wdw_cardbook.exportCardsFromAccountsOrCats(this);"/>
				<menuseparator/>
				<menuitem id="importCardsFromFileFromAccountsOrCats" label="__MSG_importCardFromFileLabel__" oncommand="wdw_cardbook.importCardsFromFile();"/>
				<menuitem id="importCardsFromDirFromAccountsOrCats" label="__MSG_importCardFromDirLabel__" oncommand="wdw_cardbook.importCardsFromDir();"/>
			</menupopup>
	
			<menupopup id="cardsTreeContextMenu" onpopupshowing="return wdw_cardbook.cardsTreeContextShowing(event);">
				<menuitem id="addContactFromCards" label="__MSG_cardbookToolbarAddContactButtonLabel__" oncommand="wdw_cardbook.newKey();"/>
				<menuitem id="addListFromCards" label="__MSG_cardbookToolbarAddListButtonLabel__" oncommand="wdw_cardbook.createList();"/>
				<menuitem id="editCardFromCards" label="__MSG_cardbookToolbarEditButtonLabel__" oncommand="wdw_cardbook.editCard();"/>
				<menuitem id="removeCardFromCards" label="__MSG_cardbookToolbarRemoveButtonLabel__" oncommand="wdw_cardbook.deleteCardsAndValidate();"/>
				<menuseparator/>
				<menu id="categoriesFromCards" label="__MSG_categoryHeader__">
					<menupopup id="categoriesFromCardsMenuPopup">
						<menuitem id="categoriesFromCardsNew" label="__MSG_categoryMenuLabel__" oncommand="wdw_cardbook.addCategory();"/>
						<menuseparator/>
					</menupopup>
				</menu>
				<menuseparator/>
				<menuitem id="toEmailCardsFromCards" label="__MSG_toEmailCardFromCardsLabel__" oncommand="wdw_cardbook.emailCardsFromCards('to');"/>
				<menuitem id="ccEmailCardsFromCards" label="__MSG_ccEmailCardFromCardsLabel__" oncommand="wdw_cardbook.emailCardsFromCards('cc');"/>
				<menuitem id="bccEmailCardsFromCards" label="__MSG_bccEmailCardFromCardsLabel__" oncommand="wdw_cardbook.emailCardsFromCards('bcc');"/>
				<menuitem id="shareCardsByEmailFromCards" label="__MSG_shareCardByEmailFromCardsLabel__" oncommand="wdw_cardbook.shareCardsByEmailFromCards();"/>
				<menuitem id="findEmailsFromCards" label="__MSG_findEmailsFromCardsLabel__" oncommand="wdw_cardbook.findEmailsFromCards();"/>
				<menuseparator/>
				<menu id="IMPPCardFromCards" label="__MSG_IMPPMenuLabel__">
					<menupopup id="IMPPCardFromCardsMenuPopup"/>
				</menu>
				<menuseparator/>
				<menu id="eventsAndTasksFromCards" label="__MSG_eventsAndTasksLabel__">
					<menupopup id="categoriesFromCardsMenuPopup">
						<menuitem id="addEventFromCards" label="__MSG_addEventFromCardsLabel__" oncommand="wdw_cardbook.createEvent();"/>
						<menuitem id="addTodoFromCards" label="__MSG_addTodoFromCardsLabel__" oncommand="wdw_cardbook.createTodo();"/>
						<menuitem id="findEventsFromCards" label="__MSG_findEventsFromCardsLabel__" oncommand="wdw_cardbook.findEventsFromCards();"/>
					</menupopup>
				</menu>
				<menuseparator/>
				<menuitem id="localizeCardsFromCards" label="__MSG_localizeCardFromCardsLabel__" oncommand="wdw_cardbook.localizeCardsFromCards();"/>
				<menuseparator/>
				<menuitem id="openURLFromCards" label="__MSG_openURLCardFromCardsLabel__" oncommand="wdw_cardbook.openURLFromCards();"/>
				<menuseparator/>
				<menu id="publicKeysFromCards" label="__MSG_publicKeysFromCards.label__">
					<menupopup id="publicKeysFromCardsMenuPopup">
						<menuitem id="searchForOnlineKeyFromCards" label="__MSG_searchForOnlineKeyFromCards.label__" oncommand="wdw_cardbook.searchForOnlineKeyFromCards();"/>
						<menuitem id="importKeyFromCards" label="__MSG_importKeyFromCards.label__" oncommand="wdw_cardbook.importKeyFromCards();"/>
					</menupopup>
				</menu>
				<menuseparator/>
				<menuitem id="cutCardsFromCards" label="__MSG_cutCardFromCardsLabel__" oncommand="wdw_cardbook.cutCardsFromCards();"/>
				<menuitem id="copyCardsFromCards" label="__MSG_copyCardFromCardsLabel__" oncommand="wdw_cardbook.copyCardsFromCards();"/>
				<menuitem id="pasteCardsFromCards" label="__MSG_pasteCardFromCardsLabel__" oncommand="wdw_cardbook.pasteCards();"/>
				<menuitem id="pasteEntryFromCards" label="__MSG_pasteEntryLabel__" oncommand="wdw_cardbook.pasteFieldValue();"/>
				<menuseparator/>
				<menuitem id="duplicateCardsFromCards" label="__MSG_duplicateCardFromCardsLabel__" oncommand="wdw_cardbook.duplicateCards();"/>
				<menuitem id="mergeCardsFromCards" label="__MSG_mergeCardsFromCardsLabel__" oncommand="wdw_cardbook.mergeCards();"/>
				<menuseparator/>
				<menuitem id="convertListToCategoryFromCards" label="__MSG_convertListToCategoryFromCardsLabel__" oncommand="wdw_cardbook.convertListToCategory();"/>
				<menuseparator/>
				<menuitem id="printFromCards" label="__MSG_cardbookToolbarPrintButtonLabel__" oncommand="wdw_cardbook.printFromCards();"/>
				<menuseparator/>
				<menuitem id="exportCardsToFileFromCards" label="__MSG_exportCardToFileLabel__" oncommand="wdw_cardbook.exportCardsFromCards(this);"/>
				<menuitem id="exportCardsToDirFromCards" label="__MSG_exportCardToDirLabel__" oncommand="wdw_cardbook.exportCardsFromCards(this);"/>
			</menupopup>
			
			<menupopup id="imageCardContextMenu">
				<menuitem id="saveImageCard" label="__MSG_saveImageCardLabel__" oncommand="wdw_imageEdition.saveImageCard();"/>
				<menuitem id="copyImageCard" label="__MSG_copyImageCardLabel__" oncommand="wdw_imageEdition.copyImageCard();"/>
				<menuitem id="copyImageLocationCard" label="__MSG_copyImageLocationCardLabel__" oncommand="wdw_imageEdition.copyImageLocationCard();"/>
			</menupopup>
	
			<menupopup id="listsContextMenu">
				<menuitem id="editCardFromList" label="__MSG_editCardFromListLabel__" oncommand="wdw_cardbook.editCardFromList();"/>
			</menupopup>
			
			<hbox id="mainHbox" flex="1">
				<vbox id="leftPaneVbox1" persist="width collapsed">
					<vbox id="cardbookFolderPaneToolbox">
						<hbox id="cardbookFolderPaneToolbar"
							class="inline-toolbar toolbar"
							toolboxid="cardbook-toolbox"
							toolbarname="__MSG_cardbookABPaneToolbarLabel__"
							accesskey="__MSG_cardbookABPaneToolbarAccesskey__"
							context="cardbook-toolbar-context"
							collapsed="false">
							<toolbaritem id="accountsOrCatsTreeToolbaritem" align="center"
								label="__MSG_cardbookToolbarABMenuLabel__"
								tooltiptext="__MSG_cardbookToolbarABMenuTooltip__">
								<menulist id="accountsOrCatsTreeMenulist" oncommand="wdw_cardbook.changeAddressbookTreeMenu();" sizetopopup="none" crop="center" flex="1">
									<menupopup id="accountsOrCatsTreeMenupopup"/>
								</menulist>
							</toolbaritem>
						</hbox>
					</vbox>
					<tree id="accountsOrCatsTree"
						class="cardbookTreeClass cardbookAccountTreeClass"
						seltype="single"
						flex="1" editable="false" context="accountsOrCatsTreeContextMenu" enableColumnDrag="false"
						hidecolumnpicker="true" onkeyup="wdw_cardbook.selectAccountOrCatInNoSearch();" onclick="wdw_cardbook.selectAccountOrCatInNoSearch();">
						<treecols id="accountsOrCatsTreecols">
							<treecol id="accountTypeCheckbox" width="20" hideheader="true" persist="width ordinal hidden"/>
							<treecol id="accountColor" width="20" hideheader="true" persist="width ordinal hidden" tooltiptext="__MSG_colorAccountsTooltip__"/>
							<treecol id="accountName" flex="1" persist="width ordinal hidden" primary="true" hideheader="true" crop="center"/>
							<treecol id="accountId" persist="width ordinal hidden" hidden="true" hideheader="true"/>
							<treecol id="accountType" persist="width ordinal hidden" hidden="true" hideheader="true"/>
							<treecol id="accountRoot" persist="width ordinal hidden" hidden="true" hideheader="true"/>
							<treecol id="accountStatusCheckbox" persist="width ordinal hidden" width="20" hideheader="true" tooltiptext="__MSG_readonlyAccountsTooltip__"/>
							<treecol id="dummyForScroll" type="checkbox" persist="width ordinal hidden" width="17" hideheader="true"/>
						</treecols>
						<treechildren id="accountsOrCatsTreeChildren" flex="1" ondragstart="wdw_cardbook.startDrag(event);" ondrop="wdw_cardbook.dragCards(event);"
									 ondblclick="wdw_cardbook.doubleClickAccountOrCat(event);"/>
					</tree>
				</vbox>
	
				<splitter id="dirTreeSplitter" collapse="before" persist="state orient" class="cardbookVerticalSplitterClass"/>
	
				<box id="cardsBox" flex="1">
					<vbox id="rightPaneUpHbox1" flex="1" persist="width height collapsed" ondragover="wdw_cardbook.canDropOnContactBox(event);" ondrop="wdw_cardbook.dragCards(event);">
						<vbox id="searchRemoteHbox">
							<hbox flex="1" class="input-container">
								<html:input id="searchRemoteTextbox" placeholder="__MSG_searchRemoteLabel__" onchange="wdw_cardbook.searchRemote();"/>
							</hbox>
						</vbox>
						<tree id="cardsTree" class="cardbookTreeClass cardbookCardsTreeClass" context="cardsTreeContextMenu" flex="1" enableColumnDrag="true" 
							persist="width sortDirection sortResource" hidecolumnpicker="false"
							onkeyup="wdw_cardbook.selectCard(event);" onclick="wdw_cardbook.sortTrees(event);">
							<treecols id="cardsTreecols" is="cards-pane-treecols" pickertooltiptext="__MSG_columnChooser2.tooltip__"/>
						   <treechildren id="cardsTreeChildren" ondragstart="wdw_cardbook.startDrag(event);" ondblclick="wdw_cardbook.doubleClickCardsTree(event);"/>
						</tree>
					</vbox>
					
					<splitter id="resultsSplitter" collapse="after" orient="vertical" persist="state orient" class="cardbookHorizontalSplitterClass"/>
	
					<hbox id="rightPaneDownHbox1" context="" persist="width height collapsed" class="cardbookBackgroundColorClass">
						<vbox flex="1">
							<vbox>
								<hbox id="cardbookContactButtonsBox">
									<button id="generalTab" label="__MSG_generalTabLabel__" class="cardbookContactButtons" oncommand="wdw_cardbook.showPane('generalTabPanel');"/>
									<button id="mailPopularityTab" label="__MSG_mailPopularityTabLabel__" class="cardbookContactButtons" oncommand="wdw_cardbook.showPane('mailPopularityTabPanel');"/>
									<button id="technicalTab" label="__MSG_technicalTabLabel__" class="cardbookContactButtons" oncommand="wdw_cardbook.showPane('technicalTabPanel');"/>
									<button id="vcardTab" label="__MSG_vCardTabLabel__" class="cardbookContactButtons" oncommand="wdw_cardbook.showPane('vcardTabPanel');"/>
									<button id="keyTab" label="__MSG_keyTabLabel__" class="cardbookContactButtons" oncommand="wdw_cardbook.showPane('keyTabPanel');"/>
								</hbox>
							</vbox>
							<vbox id="generalTabPanel" class="cardbookTab" style="overflow:auto;" flex="1">	
								<hbox>
									<vbox flex="1">
										<hbox align="center" flex="1">
											<groupbox id="fnGroupbox" flex="1" style="border:1px blue solid">
												<label class="header">__MSG_fnLabel__</label>
												<vbox flex="1" class="indent" style="border:1px green solid">
													<grid align="center" flex="1" style="border:1px red solid">
														<columns>
															<column flex="1" style="border:1px blue yellow"/>
														</columns>
											
														<rows id="fnRows">
															<row id="fnRow" align="center">
																<html:input id="fnTextBox" fieldName="fn" style="border:1px orange solid"/>
															</row>
														</rows>
													</grid>
												</vbox>
											</groupbox>
										</hbox>
										<hbox id="persBox" flex="1">
											<groupbox id="persGroupbox" flex="1">
												<label class="header">__MSG_persTitleLabel__</label>
												<hbox flex="1" class="indent">
													<grid align="center" flex="1">
														<columns>
															<column/>
															<column flex="1"/>
														</columns>
											
														<rows id="persRows">
															<row id="lastnameRow" align="center">
																<label id="lastnameLabel" value="__MSG_lastnameLabel__" control="lastnameTextBox" class="header"/>
																<html:input id="lastnameTextBox" fieldName="lastname"/>
															</row>
															<row id="firstnameRow" align="center">
																<label id="firstnameLabel" value="__MSG_firstnameLabel__" control="firstnameTextBox" class="header"/>
																<html:input id="firstnameTextBox" fieldName="firstname"/>
															</row>
															<row id="othernameRow" align="center">
																<label id="othernameLabel" value="__MSG_othernameLabel__" control="othernameTextBox" class="header"/>
																<html:input id="othernameTextBox" fieldName="othername"/>
															</row>
															<row id="prefixnameRow" align="center">
																<label id="prefixnameLabel" value="__MSG_prefixnameLabel__" control="prefixnameTextBox" class="header"/>
																<html:input id="prefixnameTextBox" fieldName="prefixname"/>
															</row>
															<row id="suffixnameRow" align="center">
																<label id="suffixnameLabel" value="__MSG_suffixnameLabel__" control="suffixnameTextBox" class="header"/>
																<html:input id="suffixnameTextBox" fieldName="suffixname"/>
															</row>
															<row id="nicknameRow" align="center">
																<label id="nicknameLabel" value="__MSG_nicknameLabel__" control="nicknameTextBox" class="header"/>
																<html:input id="nicknameTextBox" fieldName="nickname"/>
															</row>
															<row id="genderRow" align="center">
																<label id="genderLabel" value="__MSG_genderLabel__" control="genderTextBox" class="header"/>
																<html:input id="genderTextBox" fieldName="gender"/>
															</row>
															<row id="bdayRow" align="center">
																<label id="bdayLabel" value="__MSG_bdayLabel__" control="bdayTextBox" class="header"/>
																<html:input id="bdayTextBox" fieldName="bday"/>
															</row>
															<row id="birthplaceRow" align="center">
																<label id="birthplaceLabel" value="__MSG_birthplaceLabel__" control="birthplaceTextBox" class="header"/>
																<html:input id="birthplaceTextBox" fieldName="birthplace"/>
															</row>
															<row id="deathdateRow" align="center">
																<label id="deathdateLabel" value="__MSG_deathdateLabel__" control="deathdateTextBox" class="header"/>
																<html:input id="deathdateTextBox" fieldName="deathdate"/>
															</row>
															<row id="deathplaceRow" align="center">
																<label id="deathplaceLabel" value="__MSG_deathplaceLabel__" control="deathplaceTextBox" class="header"/>
																<html:input id="deathplaceTextBox" fieldName="deathplace"/>
															</row>
															<row id="anniversaryRow" align="center">
																<label id="anniversaryLabel" value="__MSG_anniversaryLabel__" control="anniversaryTextBox" class="header"/>
																<html:input id="anniversaryTextBox" fieldName="anniversary"/>
															</row>
														</rows>
													</grid>
												</hbox>
											</groupbox>
										</hbox>
										<hbox id="orgBox" flex="1">
											<groupbox id="orgGroupbox" flex="1">
												<label class="header">__MSG_orgTitleLabel__</label>
												<hbox flex="1" class="indent">
													<grid align="center" flex="1">
														<columns>
															<column/>
															<column flex="1"/>
														</columns>
											
														<rows id="orgRows"/>
													</grid>
												</hbox>
											</groupbox>
										</hbox>
										<vbox flex="1">
											<groupbox id="categoriesclassicalGroupbox" flex="1">
												<label class="header">__MSG_categoriesHeader__</label>
												<hbox id="categoriesclassicalHbox" flex="1" class="indent">
													<vbox id="categoriesclassicalRow" flex="1"/>
												</hbox>
											</groupbox>
										</vbox>
										<hbox flex="1">
											<groupbox id="noteclassicalGroupbox" flex="1">
												<label id="noteclassicalLabel" class="header">__MSG_noteTabLabel__</label>
												<html:textarea id="noteclassicalTextBox" class="indent"/>
											</groupbox>
										</hbox>
									</vbox>
									<vbox id="imageBox" align="center" width="170px">
										<hbox align="center" height="170px">
											<html:img id="imageForSizing" hidden="true"/>
											<image id="defaultCardImage" context="imageCardContextMenu"/>
										</hbox>
									</vbox>
									<vbox flex="1">
										<grid align="center" flex="1">
											<columns>
												<column flex="1"/>
											</columns>
											<rows id="classicalRows"/>
										</grid>
									</vbox>
								</hbox>
								<hbox align="center">
									<vbox flex="1">
										<groupbox id="categoriesmodernGroupbox" flex="1">
											<label class="header">__MSG_categoriesHeader__</label>
											<hbox id="categoriesmodernHbox" flex="1" class="indent">
												<vbox id="categoriesmodernRow"/>
											</hbox>
										</groupbox>
									</vbox>
								</hbox>
								<hbox>
									<grid align="center">
										<columns>
											<column flex="1"/>
										</columns>
										<rows id="modernRows"/>
									</grid>
								</hbox>
								<hbox id="listGroupbox">
									<vbox flex="1">
										<grid align="center" flex="1">
											<columns>
												<column/>
												<column flex="1"/>
											</columns>
											<rows flex="1">
												<groupbox id="addedCardsGroupbox" flex="1"/>
											</rows>
										</grid>
									</vbox>
								</hbox>
								<hbox flex="1">
									<vbox flex="1">
										<groupbox id="notemodernGroupbox" flex="1">
											<label id="notemodernLabel" class="header">__MSG_noteTabLabel__</label>
											<html:textarea id="notemodernTextBox" class="indent"/>
										</groupbox>
									</vbox>
								</hbox>
							</vbox>
		
							<vbox id="mailPopularityTabPanel" class="cardbookTab" style="overflow:auto;" flex="1">
								<groupbox id="mailPopularityReadWriteGroupbox" flex="1">
									<grid>
										<columns flex="1">
											<column/>
											<column flex="1"/>
										</columns>
										<rows flex="1">
											<groupbox id="mailPopularityGroupbox" flex="1"/>
										</rows>
									</grid>
								</groupbox>
							</vbox>
		
							<vbox id="technicalTabPanel" class="cardbookTab" style="overflow:auto;" flex="1">
								<vbox id="miscBox">
									<groupbox id="miscGroupbox" flex="1">
										<label class="header">__MSG_miscGroupboxLabel__</label>
										<hbox flex="1" align="center" class="indent">
											<grid align="center" flex="1">
												<columns>
													<column/>
													<column flex="1"/>
												</columns>
									
												<rows>
													<row id="mailerRow" align="center">
														<label id="mailerLabel" value="__MSG_mailerLabel__" control="mailerTextBox" class="header"/>
														<html:input id="mailerTextBox"/>
													</row>
													<row id="geoRow" align="center">
														<label id="geoLabel" value="__MSG_geoLabel__" control="geoTextBox" class="header"/>
														<html:input id="geoTextBox"/>
													</row>
													<row id="sortstringRow" align="center">
														<label id="sortstringLabel" value="__MSG_sortstringLabel__" control="sortstringTextBox" class="header"/>
														<html:input id="sortstringTextBox"/>
													</row>
													<row id="class1Row" align="center">
														<label id="class1Label" value="__MSG_class1Label__" control="class1TextBox" class="header"/>
														<html:input id="class1TextBox"/>
													</row>
													<row id="tzRow" align="center">
														<label id="tzLabel" value="__MSG_tzLabel__" control="tzTextBox" class="header"/>
														<html:input id="tzTextBox"/>
													</row>
													<row id="agentRow" align="center">
														<label id="agentLabel" value="__MSG_agentLabel__" control="agentTextBox" class="header"/>
														<html:input id="agentTextBox"/>
													</row>
													<row id="keyRow" align="center">
														<label id="keyLabel" value="__MSG_keyLabel__" control="keyTextBox" class="header"/>
														<html:input id="keyTextBox"/>
													</row>
													<row id="photoLocalURIRow" align="center">
														<label id="photolocalURILabel" value="__MSG_photolocalURILabel__" control="photolocalURITextBox" class="header"/>
														<html:input id="photolocalURITextBox"/>
													</row>
													<row id="photoURIRow" align="center">
														<label id="photoURILabel" value="__MSG_photoURILabel__" control="photoURITextBox" class="header"/>
														<html:input id="photoURITextBox"/>
													</row>
													<row id="logoLocalURIRow" align="center">
														<label id="logolocalURILabel" value="__MSG_logolocalURILabel__" control="logolocalURITextBox" class="header"/>
														<html:input id="logolocalURITextBox"/>
													</row>
													<row id="logoURIRow" align="center">
														<label id="logoURILabel" value="__MSG_logoURILabel__" control="logoURITextBox" class="header"/>
														<html:input id="logoURITextBox"/>
													</row>
													<row id="soundLocalURIRow" align="center">
														<label id="soundlocalURILabel" value="__MSG_soundlocalURILabel__" control="soundlocalURITextBox" class="header"/>
														<html:input id="soundlocalURITextBox"/>
													</row>
													<row id="soundURIRow" align="center">
														<label id="soundURILabel" value="__MSG_soundURILabel__" control="soundURITextBox" class="header"/>
														<html:input id="soundURITextBox"/>
													</row>
												</rows>
											</grid>
										</hbox>
									</groupbox>
								</vbox>
										
								<vbox id="techBox">
									<groupbox id="techGroupbox" flex="1">
										<label class="header">__MSG_techGroupboxLabel__</label>
										<hbox flex="1" align="center" class="indent">
											<grid align="center" flex="1">
												<columns>
													<column/>
													<column flex="1"/>
												</columns>
									
												<rows>
													<row id="dirPrefIdRow" align="center">
														<label id="dirPrefIdLabel" value="__MSG_dirPrefIdLabel__" control="dirPrefIdTextBox" class="header"/>
														<html:input id="dirPrefIdTextBox"/>
													</row>
													<row id="versionRow" align="center">
														<label id="versionLabel" value="__MSG_versionLabel__" control="versionTextBox" class="header"/>
														<html:input id="versionTextBox"/>
													</row>
													<row id="prodidRow" align="center">
														<label id="prodidLabel" value="__MSG_prodidLabel__" control="prodidTextBox" class="header"/>
														<html:input id="prodidTextBox"/>
													</row>
													<row id="uidRow" align="center">
														<label id="uidLabel" value="__MSG_uidLabel__" control="uidTextBox" class="header"/>
														<html:input id="uidTextBox"/>
													</row>
													<row id="cardurlRow" align="center">
														<label id="cardurlLabel" value="__MSG_cardurlLabel__" control="cardurlTextBox" class="header"/>
														<html:input id="cardurlTextBox"/>
													</row>
													<!-- <row id="cacheuriRow" align="center"> -->
														<!-- <label id="cacheuriLabel" value="__MSG_cacheuriLabel__" control="cacheuriTextBox" class="header"/> -->
														<!-- <html:input id="cacheuriTextBox"/> -->
													<!-- </row> -->
													<row id="revRow" align="center">
														<label id="revLabel" value="__MSG_revLabel__" control="revTextBox" class="header"/>
														<html:input id="revTextBox"/>
													</row>
													<row id="etagRow" align="center">
														<label id="etagLabel" value="__MSG_etagLabel__" control="etagTextBox" class="header"/>
														<html:input id="etagTextBox"/>
													</row>
												</rows>
											</grid>
										</hbox>
									</groupbox>
								</vbox>
										
								<hbox id="othersGroupbox" flex="1">
									<groupbox id="othersGroupboxWrapper" flex="1">
										<label class="header">__MSG_othersGroupboxLabel__</label>
										<html:textarea id="othersTextBox"/>
									</groupbox>
								</hbox>
							</vbox>
		
							<vbox id="vcardTabPanel" class="cardbookTab" style="overflow:auto;" flex="1">
								<groupbox id="vcardTabGroupbox" flex="1">
									<html:textarea id="vcardTextBox"/>
								</groupbox>
							</vbox>
		
							<vbox id="keyTabPanel" class="cardbookTab" style="overflow:auto;" flex="1">
								<box id="keyReadOnlyGroupbox"/>
							</vbox>
						</vbox>
					</hbox>
				</box>
			</hbox>
		</box>
	</tabpanels>
	
	`);

	window.ovl_cardbook.load();

	window.ovl_filters.onLoad();

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
	window.QuickFilterBarMuxer._init();
};

function onUnload(wasAlreadyOpen) {
	window.ovl_cardbook.unload();
};
