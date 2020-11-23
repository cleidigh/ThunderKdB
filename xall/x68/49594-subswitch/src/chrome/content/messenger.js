// Import any needed modules.
const { Services } = ChromeUtils.import("resource://gre/modules/Services.jsm");

// Load an additional JavaScript file.
Services.scriptloader.loadSubScript("chrome://subjects_prefix_switch/content/const.js", window, "UTF-8");
Services.scriptloader.loadSubScript("chrome://subjects_prefix_switch/content/utils.js", window, "UTF-8");
Services.scriptloader.loadSubScript("chrome://subjects_prefix_switch/content/date_utils.js", window, "UTF-8");
Services.scriptloader.loadSubScript("chrome://subjects_prefix_switch/content/items.js", window, "UTF-8");
Services.scriptloader.loadSubScript("chrome://subjects_prefix_switch/content/subjects_prefix_switch.js", window, "UTF-8");
Services.scriptloader.loadSubScript("chrome://subjects_prefix_switch/content/messenger-overlay-toolbar.js", window, "UTF-8");

function onLoad(activatedWhileWindowOpen) {
    console.log("Init of subswitch - onLoad - START");

    WL.injectCSS("resource://subjects_prefix_switch/subjects_prefix_switch.css");
    WL.injectElements(`
        <menupopup id="taskPopup">
          <menuitem id="subjects_prefix_switch-settings" label="&subjects_prefix_switch.label.toolbar;" 
            oncommand="subswitchOptionsHandler.openSettings();" insertbefore="prefSep" class="menu-iconic subjects_prefix_switch-icon menuitem-iconic" />
        </menupopup>`,
        ["chrome://subjects_prefix_switch/locale/subjects_prefix_switch.dtd"]);

    //FIXME: It doesn't work in 78 :/ Somehow the newMsg button is 'protected'
    /*WL.injectCSS("resource://subjects_prefix_switch/messenger-overlay-toolbar.css");
    WL.injectElements(`
        <toolbarbutton is="toolbarbutton-menu-button" id="button-newmsg" type="menu-button" wantdropmarker="true" >
            <menupopup id="button-newMsgPopup" onpopupshowing="com.ktsystems.subswitch.SubSwitchMOToolbar.initMsgWindowToolbar()">
              <menuitem id="newMsgButton-mail-menuitem"
                        label="&newMessageCmd.label;"
                        class="menuitem-iconic"
                        oncommand="event.stopPropagation(); MsgNewMessage(event)"/>
              <menuseparator id="subjects_prefix_switchContextSeparator" insertbefore="subjects_prefix_switch_RD_0" />
            </menupopup>
        </toolbarbutton>`,
        ["chrome://messenger/locale/mailOverlay.dtd"]);

    window.com.ktsystems.subswitch.SubSwitchMOToolbar.initMsgWindowToolbar();
    */
    console.log("Init of subswitch - onLoad - END");
}

function onUnload(deactivatedWhileWindowOpen) {
}