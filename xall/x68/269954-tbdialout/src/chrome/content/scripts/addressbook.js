// Import any needed modules.
//var { Services } = ChromeUtils.import("resource://gre/modules/Services.jsm");
//var { gQuicktext } = ChromeUtils.import("chrome://quicktext/content/modules/wzQuicktext.jsm");

// Load additional JavaScript files.
Services.scriptloader.loadSubScript("chrome://tbdialout/content/scripts/i18n.js", window, "UTF-8");
Services.scriptloader.loadSubScript("chrome://tbdialout/content/utils.js", window, "UTF-8");
Services.scriptloader.loadSubScript("chrome://tbdialout/content/tbdialout.js", window, "UTF-8");


function onLoad(activatedWhileWindowOpen) {
  
  WL.injectCSS("resource://tbdialout/skin/overlay.css");
  WL.injectElements(`
    <menupopup id="abResultsTreeContext">
        <menuitem id="tbdialout-home" label="__MSG_tbdialoutHome.label__" 
                oncommand="tbdialout.onMenuItemCommandDial('HomePhone');"/>
        <menuitem id="tbdialout-work" label="__MSG_tbdialoutWork.label__" 
                oncommand="tbdialout.onMenuItemCommandDial('WorkPhone');"/>
        <menuitem id="tbdialout-cell" label="__MSG_tbdialoutCell.label__" 
                oncommand="tbdialout.onMenuItemCommandDial('CellularNumber');"/>
    </menupopup>

    <toolbarpalette id="AddressBookToolbarPalette">
        <toolbarbutton id="tbdialout-home-toolbar-button"
        label="__MSG_tbdialoutToolbarHome.label__"
        tooltiptext="__MSG_tbdialoutToolbarHome.tooltip__"
        oncommand="tbdialout.onToolbarButtonCommandDial('HomePhone')"
        class="toolbarbutton-1 chromeclass-toolbar-additional"/>
        <toolbarbutton id="tbdialout-work-toolbar-button"
        label="__MSG_tbdialoutToolbarWork.label__"
        tooltiptext="__MSG_tbdialoutToolbarWork.tooltip__"
        oncommand="tbdialout.onToolbarButtonCommandDial('WorkPhone')"
        class="toolbarbutton-1 chromeclass-toolbar-additional"/>
        <toolbarbutton id="tbdialout-cell-toolbar-button"
        label="__MSG_tbdialoutToolbarCell.label__"
        tooltiptext="__MSG_tbdialoutToolbarCell.tooltip__"
        oncommand="tbdialout.onToolbarButtonCommandDial('CellularNumber')"
        class="toolbarbutton-1 chromeclass-toolbar-additional"/>
        <toolbarbutton id="tbdialout-menu-toolbar-button"
        label="__MSG_tbdialoutToolbarMenu.label__"
        tooltiptext="__MSG_tbdialoutToolbarMenu.tooltip__"
        type="menu"
        class="toolbarbutton-1 chromeclass-toolbar-additional" >
            <menupopup id="tbdialout-menu-toolbar-menu">
            <menuitem id="tbdialout-menu-toolbar-menu-home" label="__MSG_tbdialoutButtonMenuHome.label__" 
                        oncommand="tbdialout.onToolbarButtonCommandDial('HomePhone');"/>
            <menuitem id="tbdialout-menu-toolbar-menu-work" label="__MSG_tbdialoutButtonMenuWork.label__" 
                        oncommand="tbdialout.onToolbarButtonCommandDial('WorkPhone');"/>
            <menuitem id="tbdialout-menu-toolbar-menu-cell" label="__MSG_tbdialoutButtonMenuCell.label__" 
                        oncommand="tbdialout.onToolbarButtonCommandDial('CellularNumber');"/>
            </menupopup>
        </toolbarbutton>
    </toolbarpalette>`
  );
  
  window.tbdialout.onLoad();
  
}

function onUnload(deactivatedWhileWindowOpen) {
    window.tbdialout.onUnload();
}