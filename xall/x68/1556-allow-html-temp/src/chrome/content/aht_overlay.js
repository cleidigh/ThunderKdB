// Import any needed modules.
var { Services } = ChromeUtils.import(
  "resource://gre/modules/Services.jsm"
);

// Load an additional JavaScript file.
Services.scriptloader.loadSubScript("chrome://allowhtmltemp/content/aht_functions.js", window, "UTF-8");
Services.scriptloader.loadSubScript("chrome://allowhtmltemp/content/aht_buttonsListeners.js", window, "UTF-8");
Services.scriptloader.loadSubScript("chrome://allowhtmltemp/content/aht_statusbarListeners.js", window, "UTF-8");
Services.scriptloader.loadSubScript("chrome://messenger/content/mailWindowOverlay.js", window, "UTF-8");

function onLoad(activatedWhileWindowOpen) {
  
  WL.injectCSS("resource://allowhtmltemp/skin/aht_buttons.css");
  WL.injectCSS("resource://allowhtmltemp/skin/aht_statusbar.css");
  WL.injectElements(`
    <keyset>
      <key id="ahtButton-key" 
          modifiers="accel alt" 
          keycode="VK_F5" 
          oncommand="ahtFunctions.AllowHTMLtemp(false, 'keyboard');"/>
    </keyset>

    <toolbarpalette id="MailToolbarPalette">
      <toolbarbutton id="AllowHTMLtemp"
          class="toolbarAHTButton toolbarbutton-1"
          label="&allowhtmltemp.button.label;"
          tooltiptext="&allowhtmltemp.button.tooltip;"
          key="extensions.AHT.key.allowHTMLonce"
          labelAHT-htmlStatusPlus="&allowhtmltemp.button.label;"
          labelAHT-htmlStatusOriginal="&allowhtmltemp.button.label;"
          labelAHT-htmlStatusSanitized="&allowhtmltemp.button.label;"
          labelAHT-htmlStatusPlaintext="&bodyAsPlaintext.label;"
          oncommand="ahtFunctions.AllowHTMLtemp(event, 'button');">
      </toolbarbutton>
    </toolbarpalette>

    <hbox id="header-view-toolbar">
      <toolbarbutton id="hdrAHTButton"
          class="hdrAHTButton toolbarbutton-1 msgHeaderView-button customize-header-toolbar-button"
          label="&allowhtmltemp.button.label;"
          tooltiptext="&allowhtmltemp.button.tooltip;"
          labelAHT-htmlStatusPlus="&allowhtmltemp.button.label;"
          labelAHT-htmlStatusOriginal="&allowhtmltemp.button.label;"
          labelAHT-htmlStatusSanitized="&allowhtmltemp.button.label;"
          labelAHT-htmlStatusPlaintext="&bodyAsPlaintext.label;"
          insertafter="hdrJunkButton"
          oncommand="ahtFunctions.AllowHTMLtemp(event, 'button');RestoreFocusAfterHdrButton();">
      </toolbarbutton>
    </hbox>

    <menupopup id="remoteContentOptions">
      <menuitem id="aht_remoteContentOptionAllowForMsg"
          insertafter="remoteContentOptionAllowForMsg"
          label="&remoteContentOptionsAllowForMsg.label;"
          accesskey="&remoteContentOptionsAllowForMsg.accesskey;"
          oncommand="ahtFunctions.AllowHTMLtemp(false, 'remoteButton');"
          hidden="true"/>
    </menupopup>



    <hbox id="status-bar">

      <hbox insertafter="statusTextBox">

        <hbox id="AHT-feed-statusbarpanel"
            context="AHT-feed-statusbarpanel-menu">
          <hbox class="aht-statusbarpanel" align="center">
            <image id="AHT-feed-statusbarpanel-icon" class="aht-menu-iconic-icon"/>
            <label id="AHT-feed-statusbarpanel-text" class="aht-menu-iconic-text statusbarpanel" flex="1" crop="right"
                value="Feed-HTML-Status"
                labelAHT-viewFeedWebPage="&viewFeedWebPage.label;"
                labelAHT-viewFeedSummary="&viewFeedSummary.label;"
                labelAHT-viewFeedSummaryFeedPropsPref="&viewFeedSummaryFeedPropsPref.label;"
            />
          </hbox>
        </hbox>

        <hbox id="AHT-statusbarpanel"
            context="AHT-statusbarpanel-menu"
            onload="view_init();">
          <hbox class="aht-statusbarpanel" align="center">
            <image id="AHT-statusbarpanel-icon" class="aht-menu-iconic-icon"/>
            <label id="AHT-statusbarpanel-text" class="aht-menu-iconic-text statusbarpanel" flex="1" crop="right"
                value="HTML-Status"
                labelAHT-htmlStatusOriginal="&bodyAllowHTML.label;"
                labelAHT-htmlStatusSanitized="&bodySanitized.label;"
                labelAHT-htmlStatusPlaintext="&bodyAsPlaintext.label;"
            />
          </hbox>
        </hbox>
        <popupset>
          <menupopup id="AHT-statusbarpanel-menu"
                onpopupshowing="InitViewBodyMenu();">
            <menuitem id="AHTbodyAllowHTML"
                type="radio"
                name="AHTbodyPlaintextVsHTMLPref"
                label="&bodyAllowHTML.label;"
                accesskey="&bodyAllowHTML.accesskey;"
                oncommand="MsgBodyAllowHTML()">
              <observes element="bodyAllowHTML" attribute="checked"/>
            </menuitem>
            <menuitem id="AHTbodySanitized"
                type="radio"
                name="AHTbodyPlaintextVsHTMLPref"
                label="&bodySanitized.label;"
                accesskey="&bodySanitized.accesskey;"
                oncommand="MsgBodySanitized()">
              <observes element="bodySanitized" attribute="checked"/>
            </menuitem>
            <menuitem id="AHTbodyAsPlaintext"
                type="radio"
                name="AHTbodyPlaintextVsHTMLPref"
                label="&bodyAsPlaintext.label;"
                accesskey="&bodyAsPlaintext.accesskey;"
                oncommand="MsgBodyAsPlaintext()">
              <observes element="bodyAsPlaintext" attribute="checked"/>
            </menuitem>
          </menupopup>
        </popupset>

        </hbox>

      </hbox>`,
  ["chrome://allowhtmltemp/locale/allowhtmltemp.dtd","chrome://messenger/locale/messenger.dtd"]);

  window.ahtFunctions.ahtResetJavaScriptToDefaultOnce();
  window.ahtFunctions.startup();
  window.ahtStatusbarSetLabelIcon.startup();
  window.ahtHideAndShowStatusbarElements.startup();
  window.ahtButtonSetIcon.startup();
  window.ahtButtonStatus.startup();
}

function onUnload(deactivatedWhileWindowOpen) {

  window.ahtFunctions.shutdown();
  window.ahtStatusbarSetLabelIcon.shutdown();
  window.ahtHideAndShowStatusbarElements.shutdown();
  window.ahtButtonSetIcon.shutdown();
  window.ahtButtonStatus.shutdown();

}
