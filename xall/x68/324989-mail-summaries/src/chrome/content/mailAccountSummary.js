/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

var folderContextButtons = {
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
var folderContextMenu = new ContextMenu(
  document.querySelector("menu[type=\"context\"][data-kind=\"folder\"]"),
  folderContextButtons
);

/**
 * Summarize the most recent messages from the inbox (or the outbox).
 *
 * @param root The root element of the HTML for this visualization.
 */
function FolderWidget(root) {
  this.root = root;
  this.menus = {};

  // Hook up the context menus.
  this.menus.folder = folderContextMenu;
  this.menus.message = new ContextMenu(
    this.root.querySelector(
      "menu[type=\"context\"][data-kind=\"message\"]"
    ), this
  );
}

FolderWidget.prototype = {
  /**
   * The maximum number of messages to store in our cache.
   */
  maxCache: 100,

  /**
   * The maximum number of rows to display in the summary.
   */
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
  init: function() {
    this.messages = new MRUArray(this.maxRows, this.maxCache,
                                 this._messageCompare, this._messageEquals);
  },

  /**
   * Uninitialize the folder summary widget.
   */
  uninit: function() {
    if (this.folder)
      this.folder.msgDatabase.RemoveListener(this);
    delete this.messages;
  },

  /**
   * Render the folder summary.
   */
  render: function() {
    let rootFolder = this.context.server.rootMsgFolder;
    this.folder = rootFolder.getFolderWithFlags(Ci.nsMsgFolderFlags.Inbox) ||
                  rootFolder.getFolderWithFlags(Ci.nsMsgFolderFlags.Queue);
    let folderButton = this.root.querySelector(".folder_button");

    if (!this.folder) {
      folderButton.classList.add("hidden");
      this.root.querySelector(".folder_count").textContent =
        (0).toLocaleString();
      let note = document.createElement("li");
      note.textContent = formatString("noFolder");

      this.root.querySelector(".folder_list").appendChild(note);
    }
    else {
      this.root.querySelector(".folder_name").textContent =
        this.folder.prettyName;
      this.root.querySelector(".folder_icon").dataset.type =
        getSpecialFolderString(this.folder);
      this.root.querySelector(".folder_button_text").textContent =
        formatString("openFolder", [this.folder.prettyName]);

      let server = this.context.server;

      // Add click/context menu handlers
      AddCommandListener(folderButton, (event) => {
        if (event.button > 1)
          return;
        if (event.ctrlKey || event.button == 1) {
          global.document.getElementById("tabmail").openTab("folder", {
		    folder: this.folder, background: !event.shiftKey});
        }
        else
          global.gFolderTreeView.selectFolder(this.folder, true);
      });
      AddContextMenu(folderButton, this.menus.folder);

      // Find all messages in the folder
      for (let message of fixIterator(this.folder.msgDatabase
                                          .ReverseEnumerateMessages(),
                                      Ci.nsIMsgDBHdr)) {
        this.messages.add(message);
      }
      this._update();
      this.folder.msgDatabase.AddListener(this);
    }
  },

  /**
   * Update the list of folder messages.
   */
  _update: function() {
    let list = this.root.querySelector(".folder_list");

    this.root.querySelector(".folder_count").textContent =
      this.folder.getTotalMessages(false).toLocaleString();

    // First, remove all the old messages
    while (list.lastChild)
      list.removeChild(list.lastChild);

    // Build the list of recent messages
    for (let message of this.messages)
      list.appendChild(this._makeMessageItem(message));

    if (!this.messages.length) {
      let none = document.createElement("li");
      none.textContent = formatString("noMessages");
      list.appendChild(none);
    }
  },

  /**
   * Compare two message based on their dates.
   *
   * @param a the first message
   * @param b the second message
   * @return 1 if a > b, -1 if a < b, 0 if a == b
   */
  _messageCompare: function(a, b) {
    return b.date - a.date || b.messageKey - a.messageKey;
  },

  /**
   * Check if two messages are equal
   *
   * @param a the first message
   * @param b the second message
   * @return true if the messages are equal, false otherwise
   */
  _messageEquals: function(a, b) {
    return a == b;
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
   * @param onclick the onclick function
   */
  _makeMessageItem: function(message) {
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
        global.gFolderTreeView.selectFolder(this.folder, true);
        global.gFolderDisplay.selectMessage(message);
        global.document.getElementById("messagepane").focus();
      }
    });
    AddContextMenu(subjectNode, this.menus.message);

    subjectAndAuthor.appendChild(subjectNode);

    let authorNode = document.createElement("div");
    authorNode.classList.add("message_author", "cropped");
    authorNode.textContent = DisplayNameUtils.formatDisplayNameList(
      message.mime2DecodedAuthor, "from"
    );
    AddOverflowTooltip(authorNode);
    subjectAndAuthor.appendChild(authorNode);

    return row;
  },

  /**
   * Called when the top threads context menu is opened.
   *
   * @param event the triggering event
   */
  showContextMenu: function(event) {
    let item = this.menu.item("OpenInConversation");
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

  /***** nsIDBChangeListener methods *****/

  /**
   * Called when the flags on a message are changed.
   *
   * @param message the message whose flags have changed
   * @param oldFlags the old flags for the message (as a bitset)
   * @param newFlags the new flags for the message (as a bitset)
   * @param instigator the cause of this change
   */
  onHdrFlagsChanged: function(message, oldFlags, newFlags, instigator) {
    this._update();
  },

  /**
   * Called when a message has been deleted
   *
   * @param message the message that has been deleted
   * @param parentKey the key for the parent of the message
   * @param flags the flags for the message (as a bitset)
   * @param instigator the cause of this change
   */
  onHdrDeleted: function(message, parentKey, flags, instigator) {
    if (this.messages.remove(message, true)) {
      // If we ran out of cache, we need to start over and build a new one...
      this.messages = new MRUArray(this.maxRows, this.maxCache,
                                   this._messageCompare, this._messageEquals);

      for (let message of fixIterator(this.folder.msgDatabase
                                          .ReverseEnumerateMessages(),
                                      Ci.nsIMsgDBHdr)) {
        this.messages.add(message);
      }
    }

    this._update();
  },

  /**
   * Called when a message has been added
   *
   * @param message the message that has been added
   * @param parentKey the key for the parent of the message
   * @param flags the flags for the message (as a bitset)
   * @param instigator the cause of this change
   */
  onHdrAdded: function(message, parentKey, flags, instigator) {
    this.messages.update(message);
    this._update();
  },

  onParentChanged: function() {},
  onAnnouncerGoingAway: function() {},
  onReadChanged: function() {},
  onJunkScoreChanged: function() {},
  onHdrPropertyChanged: function() {},
  onEvent: function() {},
};

/**
 * Summarize the drafts for this account.
 *
 * @param root The root element of the HTML for this visualization.
 */
function DraftsWidget(root) {
  this.root = root;
  this.menu = folderContextMenu;
}

DraftsWidget.prototype = {
  /**
   * The maximum number of messages to store in our cache.
   */
  maxCache: 100,

  /**
   * The maximum number of rows to display in the summary.
   */
  maxRows: 3,

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
   * Initialize the drafts summary object.
   */
  init: function(context) {
    this.messages = new MRUArray(this.maxRows, this.maxCache,
                                 this._messageCompare, this._messageEquals);
    this.draftsFolders = [];
  },

  /**
   * Uninitialize the drafts summary widget.
   */
  uninit: function() {
    for (let folder of this.draftsFolders)
      folder.msgDatabase.RemoveListener(this);
    delete this.draftsFolders;
    delete this.messages;
  },

  /**
   * Render the drafts summary.
   */
  render: function() {
    // We also look for pending drafts in specially designated folders
    for (let folder of this.context.enumerateFolders()) {
      if (!folder.isSpecialFolder(Ci.nsMsgFolderFlags.Drafts))
        continue;

      // Find all messages in the drafts folders
      for (let message of fixIterator(folder.msgDatabase
                                            .ReverseEnumerateMessages(),
                                      Ci.nsIMsgDBHdr)) {
        this.messages.add(message);
      }
      this.draftsFolders.push(folder);
      folder.msgDatabase.AddListener(this);
    }

    let draftsButton = this.root.querySelector(".drafts_button");
    if (this.draftsFolders.length == 0) {
      draftsButton.classList.add("hidden");
    }
    else {
      let firstDrafts = this.draftsFolders[0];
      this.root.querySelector(".drafts_button_text").textContent =
        formatString("openFolder", [firstDrafts.prettyName]);

      // Add click/context menu handlers
      AddCommandListener(draftsButton, (event) => {
        if (event.button > 1)
          return;
        else if (event.ctrlKey || event.button == 1) {
          global.document.getElementById("tabmail").openTab("folder", {
		    folder: firstDrafts, background: !event.shiftKey});
        }
        else
          global.gFolderTreeView.selectFolder(firstDrafts, true);
      });
      AddContextMenu(draftsButton, this.menu);
    }

    this._update();
  },

  /**
   * Update the list of draft messages.
   */
  _update: function() {
    let list = this.root.querySelector(".drafts_list");

    let totalCount = this.draftsFolders.reduce((prev, folder) => {
      return prev + folder.getTotalMessages(false);
    }, 0);
    this.root.querySelector(".drafts_count").textContent =
      totalCount.toLocaleString();

    while (list.lastChild)
      list.removeChild(list.lastChild);

    // Build the list of recent drafts
    for (let message of this.messages)
      list.appendChild(this._makeDraftItem(message));

    if (!this.messages.length) {
      let none = document.createElement("li");
      none.textContent = formatString("noDraftsFound");
      list.appendChild(none);
    }
  },

  /**
   * Compare two message based on their dates.
   *
   * @param a the first message
   * @param b the second message
   * @return 1 if a > b, -1 if a < b, 0 if a == b
   */
  _messageCompare: function(a, b) {
    return b.date - a.date || b.messageKey - a.messageKey;
  },

  /**
   * Check if two messages are equal
   *
   * @param a the first message
   * @param b the second message
   * @return true if the messages are equal, false otherwise
   */
  _messageEquals: function(a, b) {
    return a == b;
  },

  /**
   * Given a draft message and an onclick handler, create a structure like so:
   *
   * <li class="draft">
   *   <div class="draft_subject cropped">Subject of the email</div>
   * </li>
   *
   * or, if the message has no subject:
   *
   * <li class="draft">
   *   <div class="draft_recipient cropped">Recipient of the email</div>
   * </li>
   *
   * @param message the msgHdr for the message
   */
  _makeDraftItem: function(message) {
    let row = document.createElement("li");
    row.classList.add("draft");
    row.folder = message.folder;
    row.messageKey = message.messageKey;

    let subjectNode = document.createElement("div");
    subjectNode.classList.add("draft_subject", "cropped");
    subjectNode.setAttribute("tabindex", 0);
    if (message.flags & Ci.nsMsgMessageFlags.HasRe)
      subjectNode.textContent = "Re: "; // Hardcoded to match how TB works.
    subjectNode.textContent += message.mime2DecodedSubject ||
                               formatString("noSubject");
    AddOverflowTooltip(subjectNode);

    // Add click handler
    let folder = message.folder;
    let uri = folder.getUriForMsg(message);
    AddCommandListener(subjectNode, (event) => {
      if (event.button == 0 || event.button == undefined)
        global.ComposeMessage(
          Ci.nsIMsgCompType.Draft, Ci.nsIMsgCompFormat.Default, folder, [uri]
        );
    });

    row.appendChild(subjectNode);

    let recipientNode = document.createElement("div");
    recipientNode.classList.add("draft_recipient", "cropped");
    recipientNode.textContent = DisplayNameUtils.formatDisplayNameList(
      message.mime2DecodedTo || message.mime2DecodedRecipients, "to"
    );
    AddOverflowTooltip(recipientNode);
    row.appendChild(recipientNode);

    return row;
  },

  /***** nsIDBChangeListener methods *****/

  /**
   * Called when a message has been deleted
   *
   * @param message the message that has been deleted
   * @param parentKey the key for the parent of the message
   * @param flags the flags for the message (as a bitset)
   * @param instigator the cause of this change
   */
  onHdrDeleted: function(message, parentKey, flags, instigator) {
    if (this.messages.remove(message, true)) {
      // If we ran out of cache, we need to start over and build a new one...
      this.messages = new MRUArray(this.maxRows, this.maxCache,
                                   this._messageCompare, this._messageEquals);

      for (let folder of this.draftsFolders) {
        for (let message of fixIterator(folder.msgDatabase
                                              .ReverseEnumerateMessages(),
                                        Ci.nsIMsgDBHdr)) {
          this.messages.add(message);
        }
      }
    }

    this._update();
  },

  /**
   * Called when a message has been added
   *
   * @param message the message that has been added
   * @param parentKey the key for the parent of the message
   * @param flags the flags for the message (as a bitset)
   * @param instigator the cause of this change
   */
  onHdrAdded: function(message, parentKey, flags, instigator) {
    this.messages.update(message);
    this._update();
  },

  onHdrFlagsChanged: function() {},
  onParentChanged: function() {},
  onAnnouncerGoingAway: function() {},
  onReadChanged: function() {},
  onJunkScoreChanged: function() {},
  onHdrPropertyChanged: function() {},
  onEvent: function() {},
};

/**
 * Summarize the space usage for this account by folder.
 *
 * @param root The root element of the HTML for this visualization.
 */
function SpaceWidget(root) {
  this.root = root;

  // Hook up the context menu.
  this.menu = folderContextMenu;
}

SpaceWidget.prototype = {
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
   * Initialize the folder space summary object.
   *
   * @param context the AccountSummary object containing the object
   */
  init: function(context) {
    this.context = context;
  },

  /**
   * Uninitialize the folder space summary widget.
   */
  uninit: function() {
    let mailSession = Cc["@mozilla.org/messenger/services/session;1"]
                        .getService(Ci.nsIMsgMailSession);

    mailSession.RemoveFolderListener(this);
  },

  /**
   * Render the folder space summary.
   */
  render: function() {
    this._update();

    let mailSession = Cc["@mozilla.org/messenger/services/session;1"]
                        .getService(Ci.nsIMsgMailSession);

    // Register the folder listener to watch for folder size changes.
    let notifyFlags = Ci.nsIFolderListener.intPropertyChanged;
    mailSession.AddFolderListener(this, notifyFlags);
  },

  _update: function() {
    let [folderCount, messageCount, totalBytes, biggestInCount,
         biggestInBytes, topFolders] = this._computeFolderSizes(6, 0.02);
    let stats_list = this.root.querySelector(".stats_list");

    // Clear the stats list first
    while (stats_list.lastChild)
      stats_list.removeChild(stats_list.lastChild);

    let factoid = document.createElement("li");
    factoid.classList.add("factoid");

    let text = formatString(
      "folderCount", [folderCount.toLocaleString()], folderCount
    ) + formatString(
      "messageCount", [messageCount.toLocaleString()], messageCount
    );
    factoid.textContent = text;
    stats_list.appendChild(factoid);

    if (biggestInCount) {
      let factoid = document.createElement("li");
      factoid.classList.add("factoid");
      factoid.textContent = formatString(
        "folderWithMost", [biggestInCount.folder.prettyName,
                           biggestInCount.size.toLocaleString()]
      );
      stats_list.appendChild(factoid);
    }
    if (biggestInBytes) {
      let factoid = document.createElement("li");
      factoid.classList.add("factoid");
      factoid.textContent = formatString(
        "largestFolder", [biggestInBytes.folder.prettyName,
                          gMessenger.formatFileSize(biggestInBytes.size)]
      );
      stats_list.appendChild(factoid);
    }

    if (totalBytes > 0) {
      this.root.querySelector(".space_chart").classList.remove("hidden");
      this._showSpaceChart(topFolders, totalBytes);
    }
    else
      this.root.querySelector(".space_chart").classList.add("hidden");
  },

  /**
   * Compute the sizes of all of the folders, as well as the "top N" folders,
   * with the remaining folders combined into "other".
   *
   * @param maxFolders the maximum number of folders to return in the "top N"
   *        folders list, including "other"
   * @param minFraction the minimum size ranging from [0, 1) of folders to
   *        return in the "top N" folders list
   * @return an array containing the following: total number of folders,
   *         total number of messages, total size of all folders in bytes,
   *         the largest folder in number of messages, the largest folder in
   *         number of bytes, and an array of the largest folders (in bytes)
   */
  _computeFolderSizes: function(maxFolders, minFraction) {
    let folders = [];
    let data = [];
    let folderCount = 0;
    let messageCount = 0;
    let totalBytes = 0;
    let biggestInCount = null;
    let biggestInBytes = null;

    for (let folder of this.context.enumerateFolders()) {
      if (folder.isSpecialFolder(Ci.nsMsgFolderFlags.Virtual))
        continue;

      let count = folder.getTotalMessages(false); // don't want deep
      let size = folder.sizeOnDisk;

      folderCount += 1;
      messageCount += count;
      totalBytes += size;

      if (!biggestInCount || count > biggestInCount.size)
        biggestInCount = {folder: folder, size: count};
      if (!biggestInBytes || size > biggestInBytes.size)
        biggestInBytes = {folder: folder, size: size};

      folders.push({ name: folder.prettyName,
                     size: size, folder: folder });
    }

    // We want the top |maxFolders| folders, and we'll group all of the others
    // in an "other" category.
    folders.sort((a, b) => b.size - a.size);
    let topFolders = [];
    let cutoff = folders.length;

    for (let i = 0; i < folders.length; i++) {
      if (i >= maxFolders - 1 || folders[i].size / totalBytes < minFraction) {
        cutoff = i;
        break;
      }
    }

    topFolders = folders.slice(0, cutoff);
    if (folders.length > cutoff && folders[cutoff].size > 0) {
      if (folders.length - cutoff == 1)
        topFolders.push(folders[cutoff]);
      else if (folders.length - cutoff > 1) {
        let otherSize = folders.slice(cutoff)
                               .reduce((a, b) => a+b.size, 0);
        topFolders.push({ name: formatString("other"),
                          size: otherSize, folder: null });
      }
    }

    return [folderCount, messageCount, totalBytes, biggestInCount,
            biggestInBytes, topFolders];
  },

  /**
   * display the chart showing largest folders
   */
  _showSpaceChart: function(topFolders, totalBytes) {
    // setup the visualization context
    let vis = new pv.Panel().canvas(this.root.querySelector(
      ".space_chart > .graph"
    ));
    vis.height(150);
    vis.width(150);

    let pieScale = (2 * Math.PI) / totalBytes;

    vis.add(pv.Wedge)
      .data(topFolders)
      .left(75).top(75).innerRadius(30).outerRadius(65)
      .angle((d) => d.size * pieScale)
      .cursor((d) => d.folder ? "pointer" : "default")
      .title((d) => formatString(
        "folderSize", [d.name, gMessenger.formatFileSize(d.size)]
      ))
      .event("click", (d) => {
        if (d.folder)
          global.gFolderTreeView.selectFolder(d.folder, true);
      });

    // Display the total size of all folders in the middle
    vis.add(pv.Label)
      .left(75)
      .top(75)
      .font("14px Sans-Serif")
      .textAlign("center")
      .textBaseline("middle")
      .text(gMessenger.formatFileSize(totalBytes));

    vis.render();

    // Make a legend for the space chart
    let legend = this.root.querySelector(".space_chart > .legend");

    // Clear the legend first
    while (legend.lastChild)
      legend.removeChild(legend.lastChild);

    let i = 0;
    for (let folderInfo of topFolders) {
      let item = document.createElement("li");

      let swatch = document.createElement("div");
      swatch.classList.add("space_swatch");
      swatch.style.backgroundColor = pv.Colors.category20.values[i++];
      item.appendChild(swatch);

      let label = document.createElement("span");
      label.classList.add("space_folder_name");
      label.textContent = folderInfo.name;
      item.appendChild(label);

      if (folderInfo.folder) {
        item.classList.add("space_folder");
        label.setAttribute("tabindex", 0);

        let folder = folderInfo.folder;

        AddCommandListener(item, (event) => {
          if (event.button > 1)
            return;
          if (event.ctrlKey || event.button == 1) {
            global.document.getElementById("tabmail").openTab("folder", {
		      folder: folder, background: !event.shiftKey});
          }
          else
            global.gFolderTreeView.selectFolder(folder, true);
        });
        AddContextMenu(item, this.menu);
      }
      else
        item.classList.add("space_folder_other");

      legend.appendChild(item);
    }
  },

  /****** nsIFolderListener methods *****/

  /**
   * Called when a property is changed on the folder.
   *
   * @param item the item whose property has been changed
   * @param property the name of the property that changed
   * @param oldValue the property's old value
   * @param newValue the property's new value
   */
  OnItemIntPropertyChanged: function(item, property, oldValue, newValue) {
    if (item.server == this.context.server) {
      if (property.toString() == "FolderSize" ||
          property.toString() == "TotalMessages")
        this._update();
    }
  },
};

/**
 * Summarize the sent messages, building 1) a list of frequent correspondens,
 * 2) a distribution of the times of day messages are sent, and 3) the
 * percentage of sent messages that are replies.
 *
 * @param root The root element of the HTML for the sent messages.
 * @param graphRoot The root element of the HTML for the graphs.
 */
function SentWidget(root, graphRoot) {
  this.root = root;
  this.graphRoot = graphRoot;
  this.menus = {};

  // Hook up the context menus.
  this.menus.compose = new ContextMenu(
    this.root.querySelector(
      "menu[type=\"context\"][data-kind=\"compose\"]"
    ), this
  );

  this.menus.correspondent = new ContextMenu(
    this.root.querySelector(
      "menu[type=\"context\"][data-kind=\"correspondent\"]"
    ), this
  );
}

SentWidget.prototype = {
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
   * Initialize the sent messages summary object.
   */
  init: function(context) {
  },

  /**
   * Uninitialize the sent messages summary widget.
   */
  uninit: function() {
  },

  /**
   * Render the sent messages summary.
   */
  render: function() {
    let composeButton = this.root.querySelector(".compose_button");

    // Add click/context menu handlers
    let server = this.context.server;
    AddCommandListener(composeButton, (event) => {
      if (event.button == 0 || event.button == undefined) {
        let format = event.shiftKey ? Ci.nsIMsgCompFormat.OppositeOfDefault :
                                      Ci.nsIMsgCompFormat.Default;
        global.ComposeMessage(
          Ci.nsIMsgCompType.New, format, server.rootFolder, null
        );
      }
    });
    AddContextMenu(composeButton, this.menus.compose);

    this._collectSentData((stats) => {
      // Now we'll display the most popular recipients.
      let peeps_list = this.root.querySelector(".peeps_list");

      for (let i = 0; i < Math.min(5, stats.recipients.length); i++) {
        peeps_list.appendChild(this._makePeepItem(stats.recipients[i]));
      }
      if (!stats.recipients.length) {
        let noone = document.createElement("li");
        noone.classList.add("peep");
        noone.textContent = formatString("noRecentCorrespondents");
        peeps_list.appendChild(noone);
      }

      // Show stats on the sent messages.
      if (stats.replyStats.replies || stats.replyStats.originals) {
        this._showTimeOfDayData(stats.sentTimes.data());
        this._showReplyPercentage(stats.replyStats.replies,
                                  stats.replyStats.originals);
      }
      else {
        this.graphRoot.querySelector(".no_stats").classList.remove("hidden");
      }
    });
  },

  /**
   * Process outgoing folders, looking for people we email to a lot, or
   * recently. We have a hybrid score that takes into account both frequency of
   * emailings, and recency of emailings. While we're iterating over a possibly
   * large number of messages, we also gather interesting statistics, such as
   * time of day, and whether they're replies or not.
   *
   * @param callback A callback function that takes an object with members
   *   `recipients`, `replyStats`, and `sentTimes`.
   */
  _collectSentData: function(callback) {
    makeAsync(function*() {
      let recipientScores = {};
      let foundRecipients = [];
      let replyStats = { originals: 0, replies: 0 };
      // Put messages in half-hour bins.
      let sentTimes = new AccumulatingHistogram(bin_by_time(0.5));

      let messagesProcessed = 0;
      for (let folder of this.context.enumerateFolders()) {
        // Only look at Sent folders
        if (!folder.isSpecialFolder(Ci.nsMsgFolderFlags.SentMail))
          continue;
        for (let message of fixIterator(folder.messages, Ci.nsIMsgDBHdr)) {
          messagesProcessed++;
          if (messagesProcessed % 500 == 0) yield undefined;

          // Count messages based on whether they were a reply or a new message.
          if (message.flags & Ci.nsMsgMessageFlags.HasRe)
            replyStats.replies++;
          else
            replyStats.originals++;

          // Count messages by the time of day they were sent.
          sentTimes.add(message.date);

          // Loop through the recipients, to identify the most relevant.
          let recipients = MailServices.headerParser.parseDecodedHeader(
            message.mime2DecodedRecipients
          );
          for (let recipient of recipients) {
            if (!(recipient.email in recipientScores)) {
              recipientScores[recipient.email] = 0;
              foundRecipients.push(recipient);
            }

            // Compute a score for this person based on the age of the email.
            // For now, the score is 5 / (number of elapsed days since the
            // email). We might want something more refined.
            let numDays = Math.max(5, (Date.now() - (message.date/1000)) /
                                   (24*60*60*1000));
            recipientScores[recipient.email] += 5/numDays;
          }
        }
      }

      // We want to display the highest-scoring individuals.
      foundRecipients.sort((a, b) => {
        return recipientScores[b.email] - recipientScores[a.email];
      });
      callback({
        recipients: foundRecipients,
        replyStats: replyStats,
        sentTimes: sentTimes
      });
    }.call(this));
  },

  /**
   * Display a histogram showing the distribution of the times at which a
   * message was sent.
   *
   * @param data a list containing 48 histogrammed bins of counts, mapping from
   *        midnight to midnight
   */
  _showTimeOfDayData: function(data) {
    this.graphRoot.querySelector(".timeofday").classList.remove("hidden");

    let barWidth = 4;
    let barSpacer = 1;
    let maxHeight = 40;
    let xLabelPadding = 12;
    let padding = 4;

    let timeofday_histo = new pv.Panel()
      .canvas(this.graphRoot.querySelector(".timeofday > .graph"))
      .width(48 * (barWidth+barSpacer) + 2*padding)
      .height(maxHeight + xLabelPadding + 2*padding);
    let maxScale = Math.max.apply(this, data);
    // If we have no maxScale, we found no emails to plot, so let's not.
    if (maxScale == 0)
      return;
    let scale = maxHeight / maxScale;

    let temp_function = this.temperature;
    timeofday_histo.add(pv.Bar)
      .data(data)
      .width(barWidth)
      .bottom(xLabelPadding + padding)
      .fillStyle(function(d) {
        return temp_function(this.index/2, d/maxScale).toHex();
      })
      .left(function(d) {
        return padding + this.index * (barWidth + barSpacer);
      })
      .height((d) => d * scale);
    timeofday_histo.add(pv.Bar)
      .left(padding)
      .bottom(xLabelPadding + padding)
      .width(0)
      .height(0)
      .anchor("bottom")
      .add(pv.Label)
        .textAlign("left")
        .textBaseline("top")
        .text(formatString("firstmidnight"));
    timeofday_histo.add(pv.Bar)
      .left(padding + 24 * (barWidth + barSpacer))
      .bottom(padding + xLabelPadding)
      .width(barWidth)
      .height(0)
      .anchor("bottom")
      .add(pv.Label)
        .textAlign("center")
        .textBaseline("top")
        .text(formatString("noon"));
    timeofday_histo.add(pv.Bar)
      .left(padding + 48*(barWidth + barSpacer))
      .bottom(padding + xLabelPadding)
      .width(0)
      .height(0)
      .anchor("bottom")
      .add(pv.Label)
        .textAlign("right")
        .textBaseline("top")
        .text(formatString("lastmidnight"));

    timeofday_histo.render();
  },

  /**
   * Display the percentage of emails sent that were replies.
   *
   * @param numReplies number of messages that were replies
   * @param numOriginals number of messages that were not.
   */
  _showReplyPercentage: function(
    numReplies, numOriginals) {
    var piePanel = this.graphRoot.querySelector(".reply_pie");
    piePanel.classList.remove("hidden");

    let reply_pie = new pv.Panel()
      .canvas(piePanel.querySelector(".graph"));
    reply_pie.width(100);
    reply_pie.height(100);
    let data = [numReplies   / (numOriginals + numReplies),
                numOriginals / (numOriginals + numReplies)];

    reply_pie.add(pv.Wedge)
      .data(data)
      .fillStyle(function(d) {
        return pv.Colors.category19.values[this.index];
      })
      .left(50).top(50).outerRadius(40)
      .angle((d) => d * 2 * Math.PI);
    reply_pie.render();

    let percentage = Math.round(100 * data[0]);
    piePanel.querySelector(".percentage").textContent =
      String(percentage) + "%";
  },

  /**
   * Given a full email address (display name and address) and an onclick
   * handler, create a structure like so:
   *
   * <li class="peep">
   *   <div class="peep_name cropped">Name of the person</div>
   *   <div class="peep_email cropped">Email address of the person</div>
   * </li>
   *
   * @param address the full name/address of the contact, as an
   *   msgIAddressObject
   */
  _makePeepItem: function(address) {
    let row = document.createElement("li");
    row.classList.add("peep");
    row.address = address;

    let name = formatDisplayNameNoYou(address.email, address.name);

    let nameNode = document.createElement("div");
    nameNode.classList.add("peep_name", "cropped");
    nameNode.setAttribute("tabindex", 0);
    nameNode.textContent = name || address.toString();
    AddOverflowTooltip(nameNode);

    // Add click/context menu handlers
    let server = this.context.server;
    AddCommandListener(nameNode, (event) => {
      if (event.button == 0 || event.button == undefined) {
        let format = event.shiftKey ? Ci.nsIMsgCompFormat.OppositeOfDefault :
          Ci.nsIMsgCompFormat.Default;
        let fullAddress = MailServices.headerParser.makeMimeHeader(
          [address], 1
        );
        let fields = address.email.indexOf("@") != -1 ?
                     { to: fullAddress } : { newsgroups: fullAddress };
        ComposeMessageToAddress(fields, server, format);
      }
    });
    AddContextMenu(nameNode, this.menus.correspondent);

    row.appendChild(nameNode);

    if (name) {
      let emailNode = document.createElement("div");
      emailNode.classList.add("peep_email", "cropped");
      emailNode.textContent = address.email;
      AddOverflowTooltip(emailNode);
      row.appendChild(emailNode);
    }

    return row;
  },

  /**
   * Return a Color object corresponding to the time of day (between 0 and 24),
   * possibly taking into account the value (between 0 and 1)
   *
   * @param time time of day (between 0 and 24)
   * @param value number between 0 and 1 (where 1 means "lots")
   * @return a Color object
   */
  temperature: function(time, value) {
    /* this function is a quick hack trying to make noon be hot, and midnight
      be cold */
    let hue = (235 + 120 * (1-Math.abs(time - 12) / 12)) % 360;
    hue = hue / 360;
    let saturation = .8; // avoid being garish
    let lightness = .3;
    return hsla(hue, saturation, lightness, 1);
  },

  /**
   * Compose a message in HTML from the context menu
   *
   * @param event the triggering event
   */
  contextComposeHTML: function(event) {
    global.ComposeMessage(Ci.nsIMsgCompType.New, Ci.nsIMsgCompFormat.HTML,
                          this.context.server.rootFolder, null);
  },

  /**
   * Compose a message in text from the context menu
   *
   * @param event the triggering event
   */
  contextComposeText: function(event) {
    global.ComposeMessage(Ci.nsIMsgCompType.New, Ci.nsIMsgCompFormat.PlainText,
                          this.context.server.rootFolder, null);
  },

  /**
   * Compose a message to the selected correspondent from the context menu
   *
   * @param event the triggering event
   */
  contextComposeMessageTo: function(event) {
    // XXX: make the shift key work (this requires toolkit changes).
    let address = event.triggerNode.parentNode.address;
    let server = global.gFolderDisplay.displayedFolder.server;
    let fullAddress = MailServices.headerParser.makeMimeHeader([address], 1);
    let fields = address.email.indexOf("@") != -1 ?
                 { to: fullAddress } : { newsgroups: fullAddress };
    ComposeMessageToAddress(fields, server);
  },

  /**
   * Copy the address of the selected correspondent from the context menu
   *
   * @param event the triggering event
   */
  contextCopyAddress: function(event) {
    let address = event.triggerNode.parentNode.address;

    Cc['@mozilla.org/widget/clipboardhelper;1']
      .getService(Ci.nsIClipboardHelper)
      .copyString(address.email);
  },
};

gAccountSummary.registerAnalyzer(new FolderWidget(
  document.getElementById("reading_cell")
));
gAccountSummary.registerAnalyzer(new DraftsWidget(
  document.getElementById("writing_cell")
));
gAccountSummary.registerAnalyzer(new SpaceWidget(
  document.getElementById("space_cell")
));
gAccountSummary.registerAnalyzer(new SentWidget(
  document.getElementById("writing_cell"),
  document.getElementById("stats_cell")
));
