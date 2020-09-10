// Import any needed modules.
var { Services } = ChromeUtils.import(
  "resource://gre/modules/Services.jsm"
);

// Load an additional JavaScript file.
Services.scriptloader.loadSubScript("chrome://getsendbutton/content/getsendbutton_functions.js", window, "UTF-8");
Services.scriptloader.loadSubScript("chrome://getsendbutton/content/getsendbutton_buttonListeners.js", window, "UTF-8");
Services.scriptloader.loadSubScript("chrome://getsendbutton/content/getsendbutton_prefsListener.js", window, "UTF-8");

function onLoad(activatedWhileWindowOpen) {
  
  WL.injectCSS("resource://getsendbutton/skin/getsendbutton.css");
  WL.injectElements(`
  <toolbarpalette id="MailToolbarPalette">
    <toolbarbutton
      id="button-getsendbutton" 
      label="&getsendbutton.buttonGetsend.label;"
      label-getMsg="&getMsgButton1.label;" 
      label-getAndSend="&getsendbutton.buttonGetsend.label;"
      class="toolbarbutton-1"
      is="toolbarbutton-menu-button"
      type="menu-button"
      oncommand="GetSendButton_functions.GetSingleAccountOrGetAndSend(event.target._folder,event);">
      <menupopup id="button-getsendbutton-popup" 
        onpopupshowing="file_init();">
        <menu id="GetSendButton_messenger_menupopup_ReceiveAccount" 
          label="&getNewMsgForCmd.label;" 
          tooltiptext="&getNewMsgForCmd.label;">
          <menupopup onpopupshowing="getMsgToolbarMenu_init();" 
            is="folder-menupopup" 
            expandFolders="false" 
            mode="getMail">
            <menuitem id="GetSendButton_messenger_menupopup_ReceiveAll" 
              class="menuitem-iconic" 
              label="&getsendbutton.menuGetall.label;" 
              tooltiptext="&getsendbutton.menuGetall.tooltip;" 
              oncommand="GetSendButton_functions.GetMessagesForAllAccounts();event.stopPropagation();" />
            <menuitem id="GetSendButton_messenger_menupopup_ReceiveAuth" 
              class="menuitem-iconic" 
              label="&getsendbutton.menuGetauth.label;" 
              tooltiptext="&getsendbutton.menuGetauth.tooltip;" 
              oncommand="goDoCommand('cmd_getMsgsForAuthAccounts');event.stopPropagation();" />
            <menuseparator id="button-getAllNewMsgSeparator"/>
          </menupopup>
        </menu>
        <menuitem id="GetSendButton_messenger_menupopup_sendUnsent" 
          class="menuitem-iconic" 
          label="&getsendbutton.menuSendall.label;" 
          tooltiptext="&getsendbutton.menuSendall.tooltip;" 
          oncommand="goDoCommand('cmd_sendUnsentMsgs');event.stopPropagation();">
        </menuitem>
        <menuseparator/>
        <menuitem id="GetSendButton_messenger_menupopup_SyncAll" 
          label="&synchronizeOfflineCmd.label;" 
          tooltiptext="&getsendbutton.menuSyncAll.tooltip;" 
          oncommand="goDoCommand('cmd_synchronizeOffline');event.stopPropagation();">
        </menuitem>
        <menuitem id="GetSendButton_messenger_menupopup_SyncFlagged" 
          class="menuitem-iconic" 
          label="&downloadStarredCmd.label;" 
          oncommand="goDoCommand('cmd_downloadFlagged');event.stopPropagation();">
        </menuitem>
        <menuitem id="GetSendButton_messenger_menupopup_SyncSelected" 
          label="&downloadSelectedCmd.label;" 
          oncommand="goDoCommand('cmd_downloadSelected');event.stopPropagation();">
        </menuitem>
      </menupopup>
    </toolbarbutton>
  </toolbarpalette>

  <toolbarpalette id="MailToolbarPalette">
    <toolbarbutton id="GetSendButton_S_all" 
      class="toolbarbutton-1" 
      label="&getsendbutton.buttonSendall.label;" 
      tooltiptext="&getsendbutton.buttonSendall.tooltip;" 
      oncommand="goDoCommand('cmd_sendUnsentMsgs')">
    </toolbarbutton>
  </toolbarpalette>
  `, ["chrome://getsendbutton/locale/getsendbutton.dtd","chrome://messenger/locale/messenger.dtd"]);

  window.GetSendButton_status.startup();
  window.GetSendButton_label.startup();

}

function onUnload(deactivatedWhileWindowOpen) {

  window.GetSendButton_status.shutdown();
  window.GetSendButton_label.shutdown();

}
