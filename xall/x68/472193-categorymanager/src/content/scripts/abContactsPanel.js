// Import any needed modules.
var { Services } = ChromeUtils.import("resource://gre/modules/Services.jsm");

// Load an additional JavaScript file.
Services.scriptloader.loadSubScript("chrome://sendtocategory/content/contactpanel/abContactsPanel_overlay.js", window, "UTF-8");

// called on window load or on add-on activation while window is already open
function onLoad(wasAlreadyOpen) {
  // make extension object available
  window.jbCatMan.extension = WL.extension;

  // historically, some locales have been mapped into variables
  window.jbCatMan.locale.prefixForPeopleSearch = window.jbCatMan.getLocalizedMessage("sendtocategory.category.label");
  window.jbCatMan.locale.placeholderText = window.jbCatMan.getLocalizedMessage("sendtocategory.categoryfilter.label");
  
  WL.injectCSS("resource://quicktext/skin/quicktext.css");
  WL.injectElements(`   
    <vbox id="results_box" flex="1">
        <vbox id="categoryfilter-box" insertafter="panel-bar">
            <separator class="thin"/>
            <hbox id="categoryfilter-panel-bar" class="toolbar" align="center" insertafter="panel-bar">
                <menulist id="CatManCategoryFilterList"
                oncommand="jbCatMan.contactPanelCategoryMenuChanged();" flex="1"
                persist="value">
                    <menupopup id="CatManCategoryFilterListPopup" writable="true"/>
                </menulist>
 
            </hbox>
        </vbox>
    </vbox>`);
  
  window.document.getElementById("addressbookList").addEventListener("command", window.jbCatMan.contactPanelCategoryMenuInit, false);
  window.jbCatMan.contactPanelCategoryMenuInit();
}

// called on window unload or on add-on deactivation while window is still open
function onUnload(isAddOnShutDown) {
    window.document.getElementById("addressbookList").removeEventListener("command", window.jbCatMan.contactPanelCategoryMenuInit, false);
    delete window.jbCatMan;
}
