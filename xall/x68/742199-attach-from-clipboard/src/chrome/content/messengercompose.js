// Import any needed modules.
var { Services } = ChromeUtils.import("resource://gre/modules/Services.jsm");

function onLoad(activatedWhileWindowOpen) {

    let xul = `<commandset id="composeCommands">
    <commandset id="attachFromClipboardCmds" commandupdater="true" events="clipboard" oncommandupdate="clipboardAttachment.updateCommand()">
      <command id="attachFromClipboardCmd" oncommand="clipboardAttachment.attachFromClipboard()" />
    </commandset>
  </commandset>
  <keyset id="tasksKeys">
    <keyset id="attachFromClipboardKeys">
      <key id="attachFromClipboardKey" modifiers="control alt" key="v" command="attachFromClipboardCmd" />
    </keyset>
  </keyset>
  <menupopup id="button-attachPopup">
    <menuitem id="button-attachPopup_attachClipboard" insertafter="button-attachPopup_attachPageItem"
      label="&attachFromClipboard.label;" accesskey="&attachFromClipboard.accesskey;"
      command="attachFromClipboardCmd" />
  </menupopup>
  <menupopup id="menu_EditPopup">
    <menuitem id="menu_Attach_Clipboard" insertafter="menu_pasteNoFormatting" label="&attachFromClipboard.label;" accesskey="&attachFromClipboard.accesskey;"
      command="attachFromClipboardCmd" key="attachFromClipboardKey" position="4" />
  </menupopup>
  <menupopup id="msgComposeAttachmentListContext">
    <menuitem id="msgComposeAttachmentListContext_attachClipboard" insertafter="attachmentListContext_attachPageItem"
      label="&attachFromClipboardContextMenu.label;" accesskey="&attachFromClipboard.accesskey;"
      command="attachFromClipboardCmd" />
  </menupopup>`;

    WL.injectElements(xul, ["chrome://clipboard/locale/clipboard.dtd"]);

    Services.scriptloader.loadSubScript("chrome://clipboard/content/overlay.js", this, "UTF-8");
}

function onUnload(deactivatedWhileWindowOpen) {
    // Cleaning up the window UI is only needed when the
    // add-on is being deactivated/removed while the window
    // is still open. It can be skipped otherwise.
    if (!deactivatedWhileWindowOpen) {
        return
    }
    
    window.clipboardAttachment.unload();
}
