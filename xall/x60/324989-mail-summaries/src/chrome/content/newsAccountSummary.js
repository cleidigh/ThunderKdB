/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/**
 * Summarize the folders in this account.
 *
 * @param root The root element of the HTML for this visualization.
 */
function FolderWidget(root) {
  this.root = root;
  this.menus = {};

  // Hook up the context menus.
  this.menus.folder = new ContextMenu(
    this.root.querySelector(
      "menu[type=\"context\"][data-kind=\"folder\"]"
    ), this
  );
  this.menus.message = new ContextMenu(
    this.root.querySelector(
      "menu[type=\"context\"][data-kind=\"message\"]"
    ), this
  );

  this.root.querySelector(".add_groups").addEventListener(
    "click", this.addGroups.bind(this)
  );
}

FolderWidget.prototype = {
  // The number of colums to display
  numColumns: 2,

  // The maximum number of items to display for each folder
  maxRows: 5,

  /**
   * A function to be called once the widget has been registered with the main
   * summary object.
   *
   * @param context The AccountSummary object holding this widget.
   */
  onregistered: function(context) {
    this.context = context;
  },

  /**
   * Initialize the folder summary widget.
   */
  init: function(context) {
    this._prefName = "extensions.mailsummaries.folders." +
                     this.context.server.key;
  },

  /**
   * Uninitialize the folder summary widget.
   */
  uninit: function() {
  },

  /**
   * Get the list of folder URIs to be displayed in this widget.
   */
  get folderURIs() {
    if (Services.prefs.prefHasUserValue(this._prefName)) {
      try {
        return JSON.parse(Services.prefs.getCharPref(this._prefName));
      }
      catch(e) {}
    }

    // No pref stored; get all the folders, set the pref, and return the list.
    let folderURIs = [];
    for (let folder of this.context.enumerateFolders()) {
      if (folder.isSpecialFolder(Ci.nsMsgFolderFlags.Virtual |
                                 Ci.nsMsgFolderFlags.Trash))
        continue;
      folderURIs.push(folder.URI);
    }
    return this.folderURIs = folderURIs;
  },

  /**
   * Set the list of folder URIs to be displayed in this widget.
   */
  set folderURIs(val) {
    Services.prefs.setCharPref(this._prefName, JSON.stringify(val));
    return val;
  },

  /**
   * Get an array of any folders that aren't currently in the summary.
   *
   * @param currentFolderURIs (optional) The list of folder URIs to compare
   *        against.
   * @return An array of nsIMsgFolders that aren't in the summary.
   */
  extraFolders: function(currentFolderURIs) {
    if (currentFolderURIs === undefined)
      currentFolderURIs = this.folderURIs;
    return Array.from(this.context.enumerateFolders())
                .filter((i) => currentFolderURIs.indexOf(i.URI) == -1);
  },

  /**
   * Render the folder summary.
   */
  render: function() {
    let foldersList = this.root.querySelector(".list");

    let folderURIs = this.folderURIs;
    let updatePref = false;

    makeAsync(function*() {
      for (let i = 0; i < folderURIs.length; ) {
        let folder = MailUtils.getFolderForURI(folderURIs[i], true);
        if (folder) {
          foldersList.appendChild(this._makeFolder(folder));
          i++;
          yield undefined;
        }
        else {
          // The folder must have been removed, so remove it from the pref too.
          folderURIs.splice(i, 1);
          updatePref = true;
        }
      }
      // XXX: should we add the "..." filler cells back in?

      if (updatePref)
        this.folderURIs = folderURIs;

      if (!this.extraFolders().length)
        this.root.querySelector(".add_groups").classList.add("hidden");
    }.call(this));
  },

  /**
   * Save the current list of folders shown in the summary.
   */
  _saveFolders: function() {
    let folderURIs = Array.from(
      this.root.querySelectorAll(".list > div > section"),
      (i) => i.folder.URI
    );
    this.folderURIs = folderURIs;
    this.root.querySelector(".add_groups").classList.toggle(
      "hidden", !this.extraFolders(folderURIs).length
    );
  },

  /**
   * Make a placeholder element for dragging and dropping.
   *
   * @return The placerholder element.
   */
  _makePlaceholder: function() {
    let placeholder = document.createElement("section");
    placeholder.className = "placeholder";
    placeholder.addEventListener("dragover", (event) => {
      event.preventDefault();
    });
    placeholder.addEventListener("drop", (event) => {
      placeholder.parentNode.insertBefore(this.draggy, placeholder);
      event.preventDefault();
    });

    let inner = document.createElement("p");
    inner.textContent = "\u25cf \u25cf \u25cf";
    placeholder.appendChild(inner);

    return placeholder;
  },

  /**
   * Given a folder, make a summary of its newest messages, like so:
   *
   * <div>
   *   <div class="drop-target"/>
   *   <section class="hideable">
   *     <header class="list_heading_wrapper">
   *       <div class="lr_wide">
   *         <h2 class="list_heading list_heading_link cropped">Folder name</h2>
   *       </div>
   *       <div class="lr_narrow hide_button"></div>
   *     </header>
   *     <ul>
   *       <li class="message">
   *         <div class="star">
   *         <div class="subject_and_author">
   *           <div class="message_subject cropped">Subject of the email</div>
   *           <div class="message_author cropped">Author of the email</div>
   *         </div>
   *       </li>
   *       ...
   *     </ul>
   *   </section>
   * </div>
   *
   * @param folder the folder in question
   */
  _makeFolder: function(folder) {
    let cell = document.createElement("div");

    let droptarget = document.createElement("div");
    droptarget.className = "drop-target";
    cell.appendChild(droptarget);

    let content = document.createElement("section");
    content.classList.add("hideable");
    content.folder = folder;
    cell.appendChild(content);

    cell.setAttribute("draggable", true);
    cell.addEventListener("dragstart", (event) => {
      this.root.classList.add("dragging");
      event.dataTransfer.setData("text/plain", null);
      this.placeholder = this._makePlaceholder();
      cell.parentNode.insertBefore(this.placeholder, cell);
      this.draggy = cell;
      document.getElementById("drag").appendChild(cell);
    });
    cell.addEventListener("dragend", () => {
      this.root.classList.remove("dragging");
      this.placeholder.remove();
      delete this.placeholder;
      this._saveFolders();
    });
    cell.addEventListener("animationend", () => {
      cell.classList.remove("slide-left");
      cell.classList.remove("slide-right");
    });

    droptarget.addEventListener("dragover", () => {
      let parent = cell.parentNode;
      function indexOf(node) {
        return Array.prototype.indexOf.call(parent.children, node);
      }
      let old_pos = indexOf(this.placeholder), new_pos = indexOf(cell);

      if (old_pos < new_pos) {
        parent.insertBefore(this.placeholder, cell.nextSibling);
        for (let i = old_pos; i < new_pos; i++) {
          parent.children[i].classList.add("slide-left");
          parent.children[i].classList.remove("slide-right");
        }
      }
      else if (old_pos > new_pos) {
        parent.insertBefore(this.placeholder, cell);
        for (let i = new_pos + 1; i < old_pos + 1; i++) {
          parent.children[i].classList.add("slide-right");
          parent.children[i].classList.remove("slide-left");
        }
      }
    });

    content.appendChild(this._makeFolderHeader(folder, cell));

    let list = document.createElement("ul");
    content.appendChild(list);

    let j = 0;
    for (let message of fixIterator(folder.msgDatabase
                                          .ReverseEnumerateMessages(),
                                    Ci.nsIMsgDBHdr)) {
      if (j++ >= this.maxRows) break;
      list.appendChild(this._makeMessageItem(message, folder));
    }

    return cell;
  },

  /**
   * Given a folder, create a structure like so:
   *
   * <header class="list_heading_wrapper">
   *   <div class="lr_wide">
   *     <h2 class="list_heading list_heading_link cropped">Folder name</h2>
   *   </div>
   *   <div class="lr_narrow hide_button"></div>
   * </header>
   *
   * @param folder the folder in question
   * @param mainNode the topmost node for this folder, used when hiding
   */
  _makeFolderHeader: function(folder, mainNode) {
    let heading_wrapper = document.createElement("header");
    heading_wrapper.classList.add("list_heading_wrapper", "left_right");

    let heading = document.createElement("div");
    heading.classList.add("lr_wide");

    let folderLink = document.createElement("h2");
    folderLink.classList.add("list_heading", "list_heading_link", "cropped");
    folderLink.textContent = folder.prettyName;
    folderLink.folder = folder;

    // Add click/context menu handlers
    AddCommandListener(folderLink, (event) => {
      if (event.button > 1)
        return;
      if (event.ctrlKey || event.button == 1) {
        global.document.getElementById("tabmail").openTab("folder", {
	  folder: folder, background: !event.shiftKey
        });
      }
      else
        global.gFolderTreeView.selectFolder(folder, true);
    });
    AddContextMenu(folderLink, this.menus.folder);

    heading.appendChild(folderLink);
    heading_wrapper.appendChild(heading);

    let hideButton = document.createElement("div");
    hideButton.classList.add("lr_narrow", "hide_button");

    AddCommandListener(hideButton, (event) => {
      if (event.button != 0)
        return;

      mainNode.parentNode.removeChild(mainNode);
      this._saveFolders();
    });

    heading_wrapper.appendChild(hideButton);

    return heading_wrapper;
  },

  /**
   * Given a message and an onclick handler, create a structure like so:
   *
   * <li class="message">
   *   <div class="star">
   *   <div class="subject_and_author">
   *     <div class="message_subject cropped">Subject of the email</div>
   *     <div class="message_author cropped">Author of the email</div>
   *   </div>
   * </li>
   *
   * @param message the msgHdr for the message
   * @param folder the folder for the message
   * @param onclick the onclick function
   */
  _makeMessageItem: function(message, folder) {
    let row = document.createElement("li");
    row.classList.add("message");
    if (!message.isRead)
      row.classList.add("unread");
    if (message.isFlagged)
      row.classList.add("starred");
    row.message = message;

    let star = document.createElement("div");
    star.classList.add("star");
    row.appendChild(star);

    let subjectAndAuthor = document.createElement("div")
    subjectAndAuthor.classList.add("subject_and_author");
    subjectAndAuthor.folder = message.folder;
    subjectAndAuthor.messageKey = message.messageKey;
    row.appendChild(subjectAndAuthor);

    let subjectNode = document.createElement("div");
    subjectNode.classList.add("message_subject", "cropped");
    subjectNode.setAttribute("tabindex", 0);
    if (message.flags & Ci.nsMsgMessageFlags.HasRe)
      subjectNode.textContent = "Re: "; // Hardcoded to match how TB works.
    subjectNode.textContent += message.mime2DecodedSubject ||
                               formatString("noSubject");
    AddOverflowTooltip(subjectNode);

    // Add click/context menu handlers
    AddCommandListener(subjectNode, (event) => {
      if (event.button > 1)
        return;
      else if (event.ctrlKey || event.button == 1 ||
               !global.gMessageDisplay.visible) {
        DisplayMessage(message, null,
                       global.document.getElementById("tabmail"),
                       event.shiftKey);
      }
      else if (event.shiftKey) {
        MailUtils.openMessageInNewWindow(message);
      }
      else {
        global.gFolderTreeView.selectFolder(folder, true);
        global.gFolderDisplay.selectMessage(message);
        global.document.getElementById("messagepane").focus();
      }
    });
    AddContextMenu(subjectNode, this.menus.message);

    subjectAndAuthor.appendChild(subjectNode);

    let authorNode = document.createElement("div");
    authorNode.classList.add("message_author", "cropped");
    authorNode.textContent = FormatDisplayNameList(
      message.mime2DecodedAuthor, "from"
    );
    AddOverflowTooltip(authorNode);
    subjectAndAuthor.appendChild(authorNode);

    return row;
  },

  addGroups: function() {
    let folders = this.extraFolders();
    if (!folders.length)
      throw new Error("no extra folders found");

    let selection = {};
    let ok = Services.prompt.select(
      null, formatString("selectFolderTitle"), formatString("selectFolderText"),
      folders.length, Array.from(folders, (i) => i.prettyName), selection
    );
    if (!ok)
      return;

    let foldersList = this.root.querySelector(".list");
    foldersList.appendChild(this._makeFolder(folders[selection.value]));
    this._saveFolders();
  },

  /**
   * Called when the top threads context menu is opened.
   *
   * @param event the triggering event
   */
  showContextMenu: function(event) {
    let item = this.menus.message.item("OpenInConversation");
    let message = event.triggerNode.parentNode.parentNode.message;
    item.disabled = !IsMessageIndexed(message);
  },

  /**
   * Open the selected message in a new window from the context menu
   *
   * @param event the triggering event
   */
  contextOpenInNewWindow: function(event) {
    let message = event.triggerNode.parentNode.parentNode.message;
    MailUtils.openMessageInNewWindow(message);
  },

  /**
   * Open the selected message in a new tab from the context menu
   *
   * @param event the triggering event
   */
  contextOpenInNewTab: function(event) {
    // XXX: make the shift key work (this requires toolkit changes).
    let message = event.triggerNode.parentNode.parentNode.message;
    OpenMessageInTab(message, null, global.document.getElementById("tabmail"));
  },

  /**
   * Open the selected message in a conversation from the context menu
   *
   * @param event the triggering event
   */
  contextOpenInConversation: function(event) {
    let message = event.triggerNode.parentNode.parentNode.message;
    global.gConversationOpener.openConversationForMessages([message]);
  },

  /**
   * Open the selected folder in a new window from the context menu
   *
   * @param event the triggering event
   */
  contextOpenFolderInNewWindow: function(event) {
    global.MsgOpenNewWindowForFolder(event.triggerNode.folder.URI, -1);
  },

  /**
   * Open the selected folder in a new tab from the context menu
   *
   * @param event the triggering event
   */
  contextOpenFolderInNewTab: function(event) {
    var bgLoad = Services.prefs.getBoolPref("mail.tabs.loadInBackground");

    // XXX: make the shift key work (this requires toolkit changes).
    global.document.getElementById("tabmail")
          .openTab("folder", { folder: event.triggerNode.folder,
                               background: bgLoad });
  },
};

gAccountSummary.registerAnalyzer(new FolderWidget(
  document.getElementById("folders")
));
