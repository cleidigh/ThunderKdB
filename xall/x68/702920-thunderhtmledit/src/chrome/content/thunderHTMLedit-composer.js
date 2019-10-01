/*
 * description: This is JS file for composer window.
 */

var {iteratorUtils} = ChromeUtils.import('resource:///modules/iteratorUtils.jsm');
// var {Services} = ChromeUtils.import('resource://gre/modules/Services.jsm');

window.document.getElementById("msgcomposeWindow").addEventListener("compose-send-message", function (e) {
  // See comment below (***) to see why we're doing this.
  ThunderHTMLedit_.WYSIWYG_ChangeCount = -1000;
  ThunderHTMLedit_.Source_ResetUndo = true;
  try {
    //synchronize WYSIWYG editor to Source editor, if currently user edit source.
    if(document.getElementById('thunderHTMLedit-content-tab').selectedIndex != 0) ThunderHTMLedit_.SelectEditMode(0, true);
  } catch (ex) {}
  // Services.console.logStringMessage("ThunderHTMLedit - compose-send-message");
});

ThunderHTMLedit_.CheckLicense = function() {
  const numNoNags = 25;
  const numNags = 5;

  let useCount = ThunderHTMLedit.getPref('UseCount');
  useCount++;
  // Don't overflow. Could also test Number.MAX_SAFE_INTEGER.
  if (useCount == 16000000)
    useCount = 0;
  ThunderHTMLedit.setPref('UseCount', useCount);
  // Services.console.logStringMessage("ThunderHTMLedit - use count " + useCount);

  ThunderHTMLedit_.ClearStatusText = false;

  useCount = useCount % (numNoNags+numNags);
  if (useCount < numNoNags) {
    if (ThunderHTMLedit_.ResetTheme) {
      ThunderHTMLedit.getEditor(window).setTheme("ace/theme/sqlserver");
      ThunderHTMLedit_.ResetTheme = false;
    }
    return;
  }

  // Now really check the license.
  let license = ThunderHTMLedit.getPref('License');
  if (license != "unlicensed") {
    for (let identity of fixIterator(ThunderHTMLedit.accounts.allIdentities,
                                     Components.interfaces.nsIMsgIdentity)) {
      if (!identity.email)
        continue;
      if (license == btoa(identity.email.toLowerCase())) {
        // Services.console.logStringMessage("ThunderHTMLedit - "+identity.email+" - license: "+license);
        if (ThunderHTMLedit_.ResetTheme) {
          ThunderHTMLedit.getEditor(window).setTheme("ace/theme/sqlserver");
          ThunderHTMLedit_.ResetTheme = false;
        }
        return;
      }
    }
  }

  ThunderHTMLedit_.ClearStatusText = true;
  let pleaseDonate = ThunderHTMLedit.getl10nString("pleaseDonate");
  let statusText = document.getElementById("statusText");
  statusText.setAttribute("label", pleaseDonate);
  statusText.setAttribute("style", "font-weight: bold; color:red");

  // Change the theme.
  if (!ThunderHTMLedit_.ResetTheme)
    ThunderHTMLedit.getEditor(window).setTheme("ace/theme/kr_theme");
  ThunderHTMLedit_.ResetTheme = true;
}

ThunderHTMLedit_.PrepareHTMLtab = function() {
  try {
    document.getElementById('thunderHTMLedit-content-tab').selectedIndex = 0; //switch back to WYSIWYG tab

    // (***) This counting bussiness doesn't really work well. If you do:
    // Type in souce, save, switch to HTML, you get count 0.
    // Switch to edit, type, save, switch to HTML, count still 0 after save, so you missed the last bit.
    // That's why ThunderHTMLedit Mark 1 had (expensive) action/transaction listeners.
    // To avoid that, I'll just reset the count in the send/save listener and force a
    // rebuild after each save/send.
    ThunderHTMLedit_.WYSIWYG_ChangeCount = -1000;
    ThunderHTMLedit_.Source_ResetUndo = true;
    ThunderHTMLedit_.ResetTheme = false;

    ThunderHTMLedit_.Undo = window.document.getElementById('menu_undo');
    ThunderHTMLedit_.Redo = window.document.getElementById('menu_redo');

    ThunderHTMLedit.sourceEditor.initialize(window);

    // Always show the HTML tab, even in a plain text editor.
    // Like this, users will understand that there is really no plain text editor.
    // It's all HTML ;-)
    document.getElementById('thunderHTMLedit-content-tab').removeAttribute('collapsed');

  } catch (e) { ThunderHTMLedit.handleException(e); }
}

ThunderHTMLedit_.SelectEditMode = function(mode, syncOnly) {
//modes: 0 - WYSIWYG, 1- HTML source
  try {
    if (window.gMsgCompose == null) return;//function called when composer window is not constructed completly yet, just after overlay loads

    // Copy content from WYSIWYG to HTML tab, only when WYSIWYG is changed.
    if (mode == 1) {
      // When using the HTLM tab, check the license.
      ThunderHTMLedit_.CheckLicense();

      if (ThunderHTMLedit_.WYSIWYG_ChangeCount != window.GetCurrentEditor().getModificationCount()) {
        ThunderHTMLedit_.MoveContentFromWYSIWYGtoSource(ThunderHTMLedit_.Source_ResetUndo);
        ThunderHTMLedit_.WYSIWYG_ChangeCount = window.GetCurrentEditor().getModificationCount();
        ThunderHTMLedit_.Source_ResetUndo = false;
      }
      // Switch tabs.
      if(!syncOnly) {
        window.document.getElementById('thunderHTMLedit-content-source-box').removeAttribute('collapsed');
        window.document.getElementById('content-frame').setAttribute('collapsed', true);
        window.document.getElementById('thunderHTMLedit-content-source-ace').focus();

        // Now hack the undo/redo commands.
        ThunderHTMLedit_.Undo.removeAttribute("command");
        ThunderHTMLedit_.Undo.setAttribute("oncommand", "ThunderHTMLedit_.AceUndo();");
        ThunderHTMLedit_.Undo.setAttribute("disabled", false);
        ThunderHTMLedit_.Redo.removeAttribute("command");
        ThunderHTMLedit_.Redo.setAttribute("oncommand", "ThunderHTMLedit_.AceRedo();");
        ThunderHTMLedit_.Redo.setAttribute("disabled", false);
      }
    }

    // User switches back to WYSIWYG, if HTML changed copy it back.
    if (mode == 0) {
      // Clear donation reminder.
      if (ThunderHTMLedit_.ClearStatusText) {
        document.getElementById("statusText").setAttribute("label", "");
        document.getElementById("statusText").setAttribute("style", "");
      }
      // Services.console.logStringMessage(`ThunderHTMLedit - modified ${ThunderHTMLedit.sourceEditor.isModified(window)}`);

      if (ThunderHTMLedit.sourceEditor.isModified(window)) {
        ThunderHTMLedit_.MoveContentFromSourceToWYSIWYG();
        ThunderHTMLedit.sourceEditor.setNotModified(window);
        ThunderHTMLedit_.WYSIWYG_ChangeCount = window.GetCurrentEditor().getModificationCount();
      }
      // Switch tabs.
      if(!syncOnly) {
        window.document.getElementById('thunderHTMLedit-content-source-box').setAttribute('collapsed', true);
        window.document.getElementById('content-frame').removeAttribute('collapsed');
        window.document.getElementById('content-frame').focus();

        // Restore undo/redo commands.
        ThunderHTMLedit_.Undo.removeAttribute("oncommand");
        ThunderHTMLedit_.Undo.setAttribute("command", "cmd_undo");
        ThunderHTMLedit_.Redo.removeAttribute("oncommand");
        ThunderHTMLedit_.Redo.setAttribute("command", "cmd_redo");
      }
    }

  } catch (e) { ThunderHTMLedit.handleException(e); }
}

ThunderHTMLedit_.AceUndo = function() {
  // Services.console.logStringMessage("ThunderHTMLedit - Undo");
  const editor = ThunderHTMLedit.getEditor(window);
  editor.commands.exec('undo', editor);
}

ThunderHTMLedit_.AceRedo = function() {
  // Services.console.logStringMessage("ThunderHTMLedit - Redo");
  const editor = ThunderHTMLedit.getEditor(window);
  editor.commands.exec('redo', editor);
}

ThunderHTMLedit_.MoveContentFromSourceToWYSIWYG = function() {
  try{
    // Services.console.logStringMessage("ThunderHTMLedit - setting Source");
    let source = ThunderHTMLedit.sourceEditor.getHTML(window);
    // Services.console.logStringMessage("ThunderHTMLedit: "+ source);
    window.gMsgCompose.editor.QueryInterface(Components.interfaces.nsIHTMLEditor).rebuildDocumentFromSource(source);
  } catch (e) { ThunderHTMLedit.handleException(e); }
}


ThunderHTMLedit_.MoveContentFromWYSIWYGtoSource = function(resetUndo) {
  try{
    // Services.console.logStringMessage("ThunderHTMLedit - setting HTML");
    let html = window.GetCurrentEditor().outputToString('text/html', 2+134217728 /* OutputFormatted + OutputDisallowLineBreaking */);
    html = html.replace(/\xA0/g, "&nbsp;").replace(/\t/g, "&#x09;"); // Make NBSP and tabs visible
    ThunderHTMLedit.sourceEditor.setHTML(window, "<!DOCTYPE html>" + html, resetUndo);
  } catch (e) { ThunderHTMLedit.handleException(e); }
}

ThunderHTMLedit_.stateListener = {
  NotifyComposeBodyReady: function() {
    // Services.console.logStringMessage("ThunderHTMLedit - stateListener: NotifyComposeBodyReady");

    ThunderHTMLedit.onComposeBodyReady(window);

    // Observer to fix some images in WYSIWYG mode.
    let WYSIWYGEditor = document.getElementById('content-frame');

    // This was added to fix the missing cursor for a reply :-(
    // Global from MsgComposeCommands.js.
    switch (gComposeType) {
    case Ci.nsIMsgCompType.Reply:
    case Ci.nsIMsgCompType.ReplyAll:
    case Ci.nsIMsgCompType.ReplyToSender:
    case Ci.nsIMsgCompType.ReplyToGroup:
    case Ci.nsIMsgCompType.ReplyToSenderAndGroup:
    case Ci.nsIMsgCompType.ReplyWithTemplate:
    case Ci.nsIMsgCompType.ReplyToList:
      // No idea why a timeout is required here :-(
      setTimeout(() => window.document.getElementById('content-frame').focus());
    default:
      break;
    }
    WYSIWYGEditor = WYSIWYGEditor.getEditor(WYSIWYGEditor.contentWindow);
    try {
      ThunderHTMLedit.fixImagesPaths(WYSIWYGEditor.rootElement.ownerDocument);
    } catch (e) { ThunderHTMLedit.handleException(e); }
  }
}

window.document.getElementById("msgcomposeWindow").addEventListener("compose-window-init", function (e) {
  gMsgCompose.RegisterStateListener(ThunderHTMLedit_.stateListener);
  // Services.console.logStringMessage("ThunderHTMLedit - compose-window-init: RegisterStateListener");
});

window.addEventListener('unload', function(event) {
  // Debugging showed that gMsgCompose is null by the time we get here.
  // From TB 48 we can listen to "compose-window-unload" ... if we care.
  if (gMsgCompose) {
    gMsgCompose.UnregisterStateListener(ThunderHTMLedit_.stateListener);
  }
  // Services.console.logStringMessage("ThunderHTMLedit - unload");
});
