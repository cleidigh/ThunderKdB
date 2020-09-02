var { ExtensionCommon } = ChromeUtils.import("resource://gre/modules/ExtensionCommon.jsm");
var { ExtensionSupport } = ChromeUtils.import("resource:///modules/ExtensionSupport.jsm");
var { Services } = ChromeUtils.import("resource://gre/modules/Services.jsm");
var { BrowserUtils } = ChromeUtils.import("resource://gre/modules/BrowserUtils.jsm");
var xulAppInfo = Components.classes["@mozilla.org/xre/app-info;1"].getService(Components.interfaces.nsIXULAppInfo);

var recentWindow = Services.wm.getMostRecentWindow("mail:3pane");

var phoenityIconsApi = class extends ExtensionCommon.ExtensionAPI {
  getAPI(context) {
    //context.callOnClose(this);
    return {
      phoenityIconsApi: {
        async phoenityIcons() {
          ExtensionSupport.registerWindowListener("phoenityIconsListener", {
            chromeURLs: [
              "chrome://messenger/content/customizeToolbar.xhtml",
              "chrome://messenger/content/messenger.xhtml",
              "chrome://messenger/content/messageWindow.xhtml",
              "chrome://messenger/content/messengercompose/messengercompose.xhtml"
            ],
            onLoadWindow(window) {

              let buttonAppmenu = window.document.getElementById("button-appmenu");
              let buttonAppmenuIcon = context.extension.rootURI.resolve("icons/button-appmenu.png");
              if (buttonAppmenu) buttonAppmenu.setAttribute("image", buttonAppmenuIcon);

              let buttonAddons = window.document.getElementById("button-addons");
              let buttonAddonsIcon = context.extension.rootURI.resolve("icons/button-addons.png");
              if (buttonAddons) buttonAddons.setAttribute("image", buttonAddonsIcon);

              let buttonTag = window.document.getElementById("button-tag");
              let buttonTagIcon = context.extension.rootURI.resolve("icons/button-tag.png");
              if (buttonTag) buttonTag.setAttribute("image", buttonTagIcon);

              let buttonGetmsg = window.document.getElementById("button-getmsg");
              let buttonGetmsgIcon = context.extension.rootURI.resolve("icons/button-getmsg.png");
              if (buttonGetmsg) buttonGetmsg.setAttribute("image", buttonGetmsgIcon);

              let buttonNewmsg = window.document.getElementById("button-newmsg");
              let buttonNewmsgIcon = context.extension.rootURI.resolve("icons/button-newmsg.png");
              if (buttonNewmsg) buttonNewmsg.setAttribute("image", buttonNewmsgIcon);

              let buttonChat = window.document.getElementById("button-chat");
              let buttonChatIcon = context.extension.rootURI.resolve("icons/button-chat.png");
              if (buttonChat) buttonChat.setAttribute("image", buttonChatIcon);

              let buttonAddress = window.document.getElementById("button-address");
              let buttonAddressIcon = context.extension.rootURI.resolve("icons/button-address.png");
              if (buttonAddress) buttonAddress.setAttribute("image", buttonAddressIcon);

              let buttonReply = window.document.getElementById("button-reply");
              let buttonReplyIcon = context.extension.rootURI.resolve("icons/button-reply.png");
              if (buttonReply) buttonReply.setAttribute("image", buttonReplyIcon);

              let hdrReplyButton = window.document.getElementById("hdrReplyButton");
              if (hdrReplyButton) hdrReplyButton.setAttribute("image", buttonReplyIcon);

              let hdrReplyToSenderButton = window.document.getElementById("hdrReplyToSenderButton");
              if (hdrReplyToSenderButton) hdrReplyToSenderButton.setAttribute("image", buttonReplyIcon);

              let buttonReplyall = window.document.getElementById("button-replyall");
              let buttonReplyallIcon = context.extension.rootURI.resolve("icons/button-replyall.png");
              if (buttonReplyall) buttonReplyall.setAttribute("image", buttonReplyallIcon);

              let hdrReplyAllButton = window.document.getElementById("hdrReplyAllButton");
              if (hdrReplyAllButton) hdrReplyAllButton.setAttribute("image", buttonReplyallIcon);

              let buttonReplylist = window.document.getElementById("button-replylist");
              let buttonReplylistIcon = context.extension.rootURI.resolve("icons/button-replyall.png");
              if (buttonReplylist) buttonReplylist.setAttribute("image", buttonReplylistIcon);

              let hdrReplyListButton = window.document.getElementById("hdrReplyListButton");
              if (hdrReplyListButton) hdrReplyListButton.setAttribute("image", buttonReplylistIcon);

              let hdrFollowupButton = window.document.getElementById("hdrFollowupButton");
              if (hdrFollowupButton) hdrFollowupButton.setAttribute("image", buttonReplylistIcon);

              let buttonForward = window.document.getElementById("button-forward");
              let buttonForwardIcon = context.extension.rootURI.resolve("icons/button-forward.png");
              if (buttonForward) buttonForward.setAttribute("image", buttonForwardIcon);

              let hdrForwardButton = window.document.getElementById("hdrForwardButton");
              if (hdrForwardButton) hdrForwardButton.setAttribute("image", buttonForwardIcon);

              let buttonArchive = window.document.getElementById("button-archive");
              let buttonArchiveIcon = context.extension.rootURI.resolve("icons/button-archive.png");
              if (buttonArchive) buttonArchive.setAttribute("image", buttonArchiveIcon);

              let hdrArchiveButton = window.document.getElementById("hdrArchiveButton");
              if (hdrArchiveButton) hdrArchiveButton.setAttribute("image", buttonArchiveIcon);

              let buttonJunk = window.document.getElementById("button-isJunk");
              let buttonJunkIcon = context.extension.rootURI.resolve("icons/button-isJunk.png");
              if (buttonJunk) buttonJunk.setAttribute("image", buttonJunkIcon);

              let hdrJunkButton = window.document.getElementById("hdrJunkButton");
              if (hdrJunkButton) hdrJunkButton.setAttribute("image", buttonJunkIcon);

              let buttonDelete = window.document.getElementById("button-mark-deleted");
              let buttonDeleteIcon = context.extension.rootURI.resolve("icons/button-mark-deleted.png");
              if (buttonDelete) buttonDelete.setAttribute("image", buttonDeleteIcon);

              let hdrTrashButton = window.document.getElementById("hdrTrashButton");
              if (hdrTrashButton) hdrTrashButton.setAttribute("image", buttonDeleteIcon);

              let buttonGoback = window.document.getElementById("button-goback");
              let buttonGobackIcon = context.extension.rootURI.resolve("icons/button-goback.png");
              if (buttonGoback) buttonGoback.setAttribute("image", buttonGobackIcon);

              let buttonGoforward = window.document.getElementById("button-goforward");
              let buttonGoforwardIcon = context.extension.rootURI.resolve("icons/button-goforward.png");
              if (buttonGoforward) buttonGoforward.setAttribute("image", buttonGoforwardIcon);

              let buttonNextMessage = window.document.getElementById("button-nextMsg");
              let buttonNextMessageIcon = context.extension.rootURI.resolve("icons/button-nextMsg.png");
              if (buttonNextMessage) buttonNextMessage.setAttribute("image", buttonNextMessageIcon);

              let buttonPreviousMessage = window.document.getElementById("button-previousMsg");
              let buttonPreviousMessageIcon = context.extension.rootURI.resolve("icons/button-previousMsg.png");
              if (buttonPreviousMessage) buttonPreviousMessage.setAttribute("image", buttonPreviousMessageIcon);

              let buttonNextUnread = window.document.getElementById("button-nextUnread");
              let buttonNextUnreadIcon = context.extension.rootURI.resolve("icons/button-nextUnread.png");
              if (buttonNextUnread) buttonNextUnread.setAttribute("image", buttonNextUnreadIcon);

              let buttonPreviousUnread = window.document.getElementById("button-previousUnread");
              let buttonPreviousUnreadIcon = context.extension.rootURI.resolve("icons/button-previousUnread.png");
              if (buttonPreviousUnread) buttonPreviousUnread.setAttribute("image", buttonPreviousUnreadIcon);

              let buttonQuickFilter = window.document.getElementById("qfb-show-filter-bar");
              let buttonQuickFilterIcon = context.extension.rootURI.resolve("icons/button-quickFilter.png");
              if (buttonQuickFilter) buttonQuickFilter.setAttribute("image", buttonQuickFilterIcon);

              let buttonShowConversation = window.document.getElementById("button-showconversation");
              let buttonShowConversationIcon = context.extension.rootURI.resolve("icons/button-showconversation.png");
              if (buttonShowConversation) buttonShowConversation.setAttribute("image", buttonShowConversationIcon);

              let buttonPrint = window.document.getElementById("button-print");
              let buttonPrintIcon = context.extension.rootURI.resolve("icons/button-print.png");
              if (buttonPrint) buttonPrint.setAttribute("image", buttonPrintIcon);

              let buttonMark = window.document.getElementById("button-mark");
              let buttonMarkIcon = context.extension.rootURI.resolve("icons/button-mark.png");
              if (buttonMark) buttonMark.setAttribute("image", buttonMarkIcon);

              let buttonFile = window.document.getElementById("button-file");
              let buttonFileIcon = context.extension.rootURI.resolve("icons/button-file.png");
              if (buttonFile) buttonFile.setAttribute("image", buttonFileIcon);

              let buttonCompact = window.document.getElementById("button-compact");
              let buttonCompactIcon = context.extension.rootURI.resolve("icons/button-compact.png");
              if (buttonCompact) buttonCompact.setAttribute("image", buttonCompactIcon);

              let buttonStop = window.document.getElementById("button-stop");
              let buttonStopIcon = context.extension.rootURI.resolve("icons/button-stop.png");
              if (buttonStop) buttonStop.setAttribute("image", buttonStopIcon);

              let buttonCalendar = window.document.getElementById("calendar-tab-button");
              let buttonCalendarIcon = context.extension.rootURI.resolve("icons/calendar/calendar-small.png");
              if (buttonCalendar) buttonCalendar.setAttribute("image", buttonCalendarIcon);

              let buttonTask = window.document.getElementById("task-tab-button");
              let buttonTaskIcon = context.extension.rootURI.resolve("icons/calendar/task-small.png");
              if (buttonTask) buttonTask.setAttribute("image", buttonTaskIcon);

              let extractEventButton = window.document.getElementById("extractEventButton");
              let extractEventButtonIcon = context.extension.rootURI.resolve("icons/calendar/newevent.png");
              if (extractEventButton) extractEventButton.setAttribute("image", extractEventButtonIcon);

              let extractTaskButton = window.document.getElementById("extractTaskButton");
              let extractTaskButtonIcon = context.extension.rootURI.resolve("icons/calendar/newtask.png");
              if (extractTaskButton) extractTaskButton.setAttribute("image", extractTaskButtonIcon);

              let lightningEventButton = window.document.getElementById("lightning-button-calendar");
              let lightningEventButtonIcon = context.extension.rootURI.resolve("icons/calendar/event.png");
              if (lightningEventButton) lightningEventButton.setAttribute("image", lightningEventButtonIcon);

              let lightningTaskButton = window.document.getElementById("lightning-button-tasks");
              let lightningTaskButtonIcon = context.extension.rootURI.resolve("icons/calendar/task.png");
              if (lightningTaskButton) lightningTaskButton.setAttribute("image", lightningTaskButtonIcon);

              let configButton = window.document.getElementById("configbutton_dillinger-browserAction-toolbarbutton");
              let configButtonIcon = context.extension.rootURI.resolve("icons/buttons/configButton.png");
              if (configButton) configButton.setAttribute("image", configButtonIcon);

              let prefsButton = window.document.getElementById("prefsbutton_dillinger-browserAction-toolbarbutton");
              let prefsButtonIcon = context.extension.rootURI.resolve("icons/buttons/prefsButton.png");
              if (prefsButton) prefsButton.setAttribute("image", prefsButtonIcon);

              let devToolsButton = window.document.getElementById("devtoolsbutton_dillinger-browserAction-toolbarbutton");
              let devToolsButtonIcon = context.extension.rootURI.resolve("icons/buttons/devToolsButton.png");
              if (devToolsButton) devToolsButton.setAttribute("image", devToolsButtonIcon);

              let restartButton = window.document.getElementById("restartbutton_dillinger-browserAction-toolbarbutton");
              let restartButtonIcon = context.extension.rootURI.resolve("icons/buttons/restartButton.png");
              if (restartButton) restartButton.setAttribute("image", restartButtonIcon);

              let buttonSend = window.document.getElementById("button-send");
              let buttonSendIcon = context.extension.rootURI.resolve("icons/compose/button-send.png");
              if (buttonSend) buttonSend.setAttribute("image", buttonSendIcon);

              let buttonSave = window.document.getElementById("button-save");
              let buttonSaveIcon = context.extension.rootURI.resolve("icons/compose/button-save.png");
              if (buttonSave) buttonSave.setAttribute("image", buttonSaveIcon);

              let buttonSecurity = window.document.getElementById("button-security");
              let buttonSecurityIcon = context.extension.rootURI.resolve("icons/compose/button-security.png");
              if (buttonSecurity) buttonSecurity.setAttribute("image", buttonSecurityIcon);

              let spellingButton = window.document.getElementById("spellingButton");
              let spellingButtonIcon = context.extension.rootURI.resolve("icons/compose/spellingButton.png");
              if (spellingButton) spellingButton.setAttribute("image", spellingButtonIcon);

              let quoteButton = window.document.getElementById("quoteButton");
              let quoteButtonIcon = context.extension.rootURI.resolve("icons/compose/quoteButton.png");
              if (quoteButton) quoteButton.setAttribute("image", quoteButtonIcon);

              let copyButton = window.document.getElementById("copy-button");
              let copyButtonIcon = context.extension.rootURI.resolve("icons/compose/copy-button.png");
              if (copyButton) copyButton.setAttribute("image", copyButtonIcon);

              let cutButton = window.document.getElementById("cut-button");
              let cutButtonIcon = context.extension.rootURI.resolve("icons/compose/cut-button.png");
              if (cutButton) cutButton.setAttribute("image", cutButtonIcon);

              let pasteButton = window.document.getElementById("paste-button");
              let pasteButtonIcon = context.extension.rootURI.resolve("icons/compose/paste-button.png");
              if (pasteButton) pasteButton.setAttribute("image", pasteButtonIcon);

              let buttonAttach = window.document.getElementById("button-attach");
              let buttonAttachIcon = context.extension.rootURI.resolve("icons/compose/button-attach.png");
              if (buttonAttach) buttonAttach.setAttribute("image", buttonAttachIcon);

              let buttonContacts = window.document.getElementById("button-contacts");
              let buttonContactsIcon = context.extension.rootURI.resolve("icons/compose/button-contacts.png");
              if (buttonContacts) buttonContacts.setAttribute("image", buttonContactsIcon);

              let buttonReturnReceipt = window.document.getElementById("button-returnReceipt");
              let buttonReturnReceiptIcon = context.extension.rootURI.resolve("icons/compose/button-returnReceipt.png");
              if (buttonReturnReceipt) buttonReturnReceipt.setAttribute("image", buttonReturnReceiptIcon);

              let searchButton = window.document.getElementById("searchbutton_pharqcon_com-browserAction-toolbarbutton");
              let searchButtonIcon = context.extension.rootURI.resolve("icons/buttons/searchButton.png");
              if (searchButton) searchButton.setAttribute("image", searchButtonIcon);

              //let cardbookTabButton = window.document.getElementById("cardbookTabButton");
              //let cardbookTabButtonIcon = context.extension.rootURI.resolve("icons/compose/button-contacts.png");
              //if (cardbookTabButton) cardbookTabButton.setAttribute("image", cardbookTabButtonIcon);

              //let cardbookToolbarButton = window.document.getElementById("cardbookToolbarButton");
              //let cardbookToolbarButtonIcon = context.extension.rootURI.resolve("icons/compose/button-contacts.png");
              //if (cardbookToolbarButton) cardbookToolbarButton.setAttribute("image", cardbookToolbarButtonIcon);

            },
          });
        },
        //async loadCardbookButtons() {
          //if (recentWindow) {
            //recentWindow.addEventListener('DOMContentLoaded', (event) => {

              //let cardbookTabButton = recentWindow.document.getElementById("cardbookTabButton");
              //let cardbookTabButtonIcon = context.extension.rootURI.resolve("icons/compose/button-contacts.png");
              //if (cardbookTabButton) cardbookTabButton.setAttribute("image", cardbookTabButtonIcon);

              //let cardbookToolbarButton = recentWindow.document.getElementById("cardbookToolbarButton");
              //let cardbookToolbarButtonIcon = context.extension.rootURI.resolve("icons/compose/button-contacts.png");
              //if (cardbookToolbarButton) cardbookToolbarButton.setAttribute("image", cardbookToolbarButtonIcon);

              //console.log("cardbook icons loaded");

            //}, false, { once: true });
          //}
        //},
      },
    };
  }

  //close() {
  onShutdown(isAppShutdown) {
  if (isAppShutdown) return;
    for (let window of Services.wm.getEnumerator("mail:3pane")) {

      let buttonAppmenu = window.document.getElementById("button-appmenu");
      if (buttonAppmenu) buttonAppmenu.removeAttribute("image");

      let buttonAddons = window.document.getElementById("button-addons");
      if (buttonAddons) buttonAddons.removeAttribute("image");

      let buttonTag = window.document.getElementById("button-tag");
      if (buttonTag) buttonTag.removeAttribute("image");

      let buttonGetmsg = window.document.getElementById("button-getmsg");
      if (buttonGetmsg) buttonGetmsg.removeAttribute("image");

      let buttonNewmsg = window.document.getElementById("button-newmsg");
      if (buttonNewmsg) buttonNewmsg.removeAttribute("image");

      let buttonChat = window.document.getElementById("button-chat");
      if (buttonChat) buttonChat.removeAttribute("image");

      let buttonAddress = window.document.getElementById("button-address");
      if (buttonAddress) buttonAddress.removeAttribute("image");

      let buttonReply = window.document.getElementById("button-reply");
      if (buttonReply) buttonReply.removeAttribute("image");

      let hdrReplyButton = window.document.getElementById("hdrReplyButton");
      if (hdrReplyButton) hdrReplyButton.removeAttribute("image");

      let hdrReplyToSenderButton = window.document.getElementById("hdrReplyToSenderButton");
      if (hdrReplyToSenderButton) hdrReplyToSenderButton.removeAttribute("image");

      let buttonReplyall = window.document.getElementById("button-replyall");
      if (buttonReplyall) buttonReplyall.removeAttribute("image");

      let hdrReplyAllButton = window.document.getElementById("hdrReplyAllButton");
      if (hdrReplyAllButton) hdrReplyAllButton.removeAttribute("image");

      let buttonReplylist = window.document.getElementById("button-replylist");
      if (buttonReplylist) buttonReplylist.removeAttribute("image");

      let hdrReplyListButton = window.document.getElementById("hdrReplyListButton");
      if (hdrReplyListButton) hdrReplyListButton.removeAttribute("image");

      let hdrFollowupButton = window.document.getElementById("hdrFollowupButton");
      if (hdrFollowupButton) hdrFollowupButton.removeAttribute("image");

      let buttonForward = window.document.getElementById("button-forward");
      if (buttonForward) buttonForward.removeAttribute("image");

      let buttonArchive = window.document.getElementById("button-archive");
      if (buttonArchive) buttonArchive.removeAttribute("image");

      let buttonJunk = window.document.getElementById("button-isJunk");
      if (buttonJunk) buttonJunk.removeAttribute("image");

      let buttonDelete = window.document.getElementById("button-mark-deleted");
      if (buttonDelete) buttonDelete.removeAttribute("image");

      let buttonGoback = window.document.getElementById("button-goback");
      if (buttonGoback) buttonGoback.removeAttribute("image");

      let buttonGoforward = window.document.getElementById("button-goforward");
      if (buttonGoforward) buttonGoforward.removeAttribute("image");

      let buttonNextMessage = window.document.getElementById("button-nextMsg");
      if (buttonNextMessage) buttonNextMessage.removeAttribute("image");

      let buttonPreviousMessage = window.document.getElementById("button-previousMsg");
      if (buttonPreviousMessage) buttonPreviousMessage.removeAttribute("image");

      let buttonNextUnread = window.document.getElementById("button-nextUnread");
      if (buttonNextUnread) buttonNextUnread.removeAttribute("image");

      let buttonPreviousUnread = window.document.getElementById("button-previousUnread");
      if (buttonPreviousUnread) buttonPreviousUnread.removeAttribute("image");

      let buttonQuickFilter = window.document.getElementById("qfb-show-filter-bar");
      if (buttonQuickFilter) buttonQuickFilter.removeAttribute("image");

      let buttonShowConversation = window.document.getElementById("button-showconversation");
      if (buttonShowConversation) buttonShowConversation.removeAttribute("image");

      let buttonPrint = window.document.getElementById("button-print");
      if (buttonPrint) buttonPrint.removeAttribute("image");

      let buttonMark = window.document.getElementById("button-mark");
      if (buttonMark) buttonMark.removeAttribute("image");

      let buttonFile = window.document.getElementById("button-file");
      if (buttonFile) buttonFile.removeAttribute("image");

      let buttonCompact = window.document.getElementById("button-compact");
      if (buttonCompact) buttonCompact.removeAttribute("image");

      let buttonStop = window.document.getElementById("button-stop");
      if (buttonStop) buttonStop.removeAttribute("image");

      let buttonCalendar = window.document.getElementById("calendar-tab-button");
      if (buttonCalendar) buttonCalendar.removeAttribute("image");

      let buttonTask = window.document.getElementById("task-tab-button");
      if (buttonTask) buttonTask.removeAttribute("image");

      let extractEventButton = window.document.getElementById("calendar-tab-button");
      if (extractEventButton) extractEventButton.removeAttribute("image");

      let extractTaskButton = window.document.getElementById("task-tab-button");
      if (extractTaskButton) extractTaskButton.removeAttribute("image");

      let lightningEventButton = window.document.getElementById("calendar-tab-button");
      if (lightningEventButton) lightningEventButton.removeAttribute("image");

      let lightningTaskButton = window.document.getElementById("task-tab-button");
      if (lightningTaskButton) lightningTaskButton.removeAttribute("image");

      let configButton = window.document.getElementById("configbutton_dillinger-browserAction-toolbarbutton");
      if (configButton) configButton.removeAttribute("image");

      let prefsButton = window.document.getElementById("prefsbutton_dillinger-browserAction-toolbarbutton");
      if (prefsButton) prefsButton.removeAttribute("image");

      let devToolsButton = window.document.getElementById("devtoolsbutton_dillinger-browserAction-toolbarbutton");
      if (devToolsButton) devToolsButton.removeAttribute("image");

      let restartButton = window.document.getElementById("restartbutton_dillinger-browserAction-toolbarbutton");
      if (restartButton) restartButton.removeAttribute("image");

      let searchButton = window.document.getElementById("searchbutton_pharqcon_com-browserAction-toolbarbutton");
      if (searchButton) searchButton.removeAttribute("image");

      //let cardbookTabButton = window.document.getElementById("cardbookTabButton");
      //if (cardbookTabButton) cardbookTabButton.removeAttribute("image");

      //let cardbookToolbarButton = window.document.getElementById("cardbookToolbarButton");
      //if (cardbookToolbarButton) cardbookToolbarButton.removeAttribute("image");

    }

    for (let window of Services.wm.getEnumerator("msgcompose")) {

      let buttonSend = window.document.getElementById("button-send");
      if (buttonSend) buttonSend.removeAttribute("image");

      let buttonSave = window.document.getElementById("button-save");
      if (buttonSave) buttonSave.removeAttribute("image");

      let buttonSecurity = window.document.getElementById("button-security");
      if (buttonSecurity) buttonSecurity.removeAttribute("image");

      let spellingButton = window.document.getElementById("spellingButton");
      if (spellingButton) spellingButton.removeAttribute("image");

      let quoteButton = window.document.getElementById("quoteButton");
      if (quoteButton) quoteButton.removeAttribute("image");

      let copyButton = window.document.getElementById("copy-button");
      if (copyButton) copyButton.removeAttribute("image");

      let cutButton = window.document.getElementById("cut-button");
      if (cutButton) cutButton.removeAttribute("image");

      let pasteButton = window.document.getElementById("paste-button");
      if (pasteButton) pasteButton.removeAttribute("image");

      let buttonAttach = window.document.getElementById("button-attach");
      if (buttonAttach) buttonAttach.removeAttribute("image");

      let buttonContacts = window.document.getElementById("button-contacts");
      if (buttonContacts) buttonContacts.removeAttribute("image");

      let buttonReturnReceipt = window.document.getElementById("button-returnReceipt");
      if (buttonReturnReceipt) buttonReturnReceipt.removeAttribute("image");

    }
    ExtensionSupport.unregisterWindowListener("phoenityIconsListener");
    console.log("Phoenity Icons disabled");
  }
};
