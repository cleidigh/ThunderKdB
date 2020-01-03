/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

try {
  if (typeof Cc === "undefined") var Cc = Components.classes;
  if (typeof Ci === "undefined") var Ci = Components.interfaces;
  if (typeof Cr === "undefined") var Cr = Components.results;
} catch (e) {}

var {
  Services
} = ChromeUtils.import("resource://gre/modules/Services.jsm");

var FileUtils = Cu.import("resource://gre/modules/FileUtils.jsm").FileUtils;

if (typeof AttachmentExtractor === "undefined") {
  function AttachmentExtractor() {
    /* constants */
    this.MRUMAXCOUNT = 20;
    this.setupListenersDone = false;

    /*variables*/
    this.autoMsgs = new Array();
    this.queuedTasks = new Array();
    this.prefs = new AEPrefs();

    /* services */
    this.promptService = Cc["@mozilla.org/embedcomp/prompt-service;1"]
      .getService(Ci.nsIPromptService);
    this.windowWatcherService = Cc['@mozilla.org/embedcomp/window-watcher;1']
      .getService().QueryInterface(Ci.nsIWindowWatcher);

    /* bundles */
    this.aeStringBundle = Services.strings.createBundle(
      "chrome://attachmentextractor_cont/locale/attachmentextractor.properties");
    this.messengerStringBundle = Services.strings.createBundle(
      "chrome://messenger/locale/messenger.properties");
  }

  AttachmentExtractor.prototype.init = function() {
    if (aedebug) this.createaedumpfile();

    var aefolderListener = this.createaefolderListener();
    this.checkForAutoTag();
    Cc["@mozilla.org/messenger/services/session;1"].getService(Ci
      .nsIMsgMailSession).
    AddFolderListener(aefolderListener, Ci.nsIFolderListener.propertyChanged);
    /* Ci.nsIFolderListener.added + Ci.nsIFolderListener.removed Ci.nsIFolderListener.all */
    if (Ci.nsIMsgFolderNotificationService.msgAdded) Cc[
      "@mozilla.org/messenger/msgnotificationservice;1"].
    getService(Ci.nsIMsgFolderNotificationService).addListener(
      aefolderListener, Ci.nsIMsgFolderNotificationService.msgAdded); //tb3
    else Cc["@mozilla.org/messenger/msgnotificationservice;1"].
    getService(Ci.nsIMsgFolderNotificationService).addListener(
      aefolderListener); //tb2

    window.addEventListener('load', this.setupListeners, true);
    /*window.addEventListener('unload', attachmentextractor.unSetupListeners, true);  //unnessecary?*/

    //sync up relative pref
    var rdsp;
    try {
      if (this.prefs.hasUserValue("defaultsavepath.relative.key") && (rdsp =
          this.prefs.getRelFile("defaultsavepath.relative"))) this.prefs
        .setFile("defaultsavepath", rdsp);
    } catch (e) {
      aedump(e);
    }
    try {
      if (this.prefs.hasUserValue("autoextract.savepath.relative.key") && (
          rdsp = this.prefs.getRelFile("autoextract.savepath.relative"))) this
        .prefs.setFile("autoextract.savepath", rdsp);
    } catch (e) {
      aedump(e);
    }

    this.prefs.aeBranch.addObserver("savepathmru.enabled", this.prefObserver, false);
    this.prefs.aeBranch.addObserver("defaultsavepath", this.prefObserver, false);
    this.prefs.aeBranch.addObserver("autoextract.savepath", this.prefObserver, false);
  

    this.windowWatcherService.registerNotification(this.queuedTaskObserver);
  };

  /* access functions */

  AttachmentExtractor.prototype.doAttachmentextraction = function(event,
    savelocation, all, index) {

    aedump('{function:AttachmentExtractor.doAttachmentextraction}\n',2);
    aedump("event: " + event + "\n");
    aedump("savelocation: " + savelocation + "\n");
    aedump("index (in case of mru or favorite): " + index + "\n");
    aedump("all: " + all + "\n");

    var folder = null;
    savelocation = savelocation + "";
    var messages = (all) ? this.collectMessagesFromFolder((all === 2)) : this
      .getSelectedMessages();
    aedump("messages: " + messages + "\n");
    //aedump("//ae: saveselect: "+saveselect+" all: "+all+"\n");
    switch (savelocation) {
      case "deleteAtt":
        this.startAttachmentextraction(null, messages, null, false, true);
        break;
      case "browse":
        folder = this.getSaveFolder("messenger.save.dir", true, "");
        if (folder) this.addToMRUList(folder);
        break;
      case "default":
        folder = this.getDefaultSaveFolder();
        if (folder) this.addToMRUList(folder);
        break;
      case "favorite":
        folder = this.useFavoritefolder(index);
        if (folder) this.addToMRUList(folder);
        break;
      case "mru":
        folder = this.useMRU(index);
        break;
      case "suggest":
        folder = this.getSuggestedSaveFolder(messages);
        if (folder) this.addToMRUList(folder);
        break;
    }

    var fnp = false;
    // Only show fnp dialog, if attachments would be saved
    if ((savelocation !== "deleteAtt") && (this.prefs.get("extract.enabled"))) {
      // If pref is true, show the fnp edit dialog before extracting
      if (this.prefs.get("filenamepattern.askalwaysfnp")) {
        fnp = this.getFilenamePattern();
        aedump("fnp after extra fnp dialog: " + fnp + "\n");
      }
    }

    //aedump("folder: "+folder);
    if (folder) this.startAttachmentextraction(folder, messages, fnp, false,
      false);
  };

  AttachmentExtractor.prototype.doIndividualAttachmentextraction = function(
    savelocation, mode, index) {
    
    aedump('{function:AttachmentExtractor.doIndividualAttachmentextraction}\n',2);
    aedump("savelocation: " + savelocation + "\n");
    aedump("index (in case of mru or favorite): " + index + "\n");
    aedump("mode: " + mode + "\n");

    var attachments = null;

    switch (mode) {
      case "selected":
        attachments = this.getSelectedAttachments();
        break;
      case "all":
        attachments = currentAttachments;
        break;
      default:
    }
    //if (!attachments) return;
    var folder;
    savelocation = savelocation + "";
    aedump("//ae: attachments: " + attachments + " \n");
    switch (savelocation) {
      case "browse":
        folder = this.getSaveFolder("messenger.save.dir", true, "");
        if (folder) this.addToMRUList(folder);
        break;
      case "default":
        folder = this.getDefaultSaveFolder();
        if (folder) this.addToMRUList(folder);
        break;
      case "favorite":
        folder = this.useFavoritefolder(index);
        if (folder) this.addToMRUList(folder);
        break;
      case "mru":
        folder = this.useMRU(index);
        break;
      case "suggest":
        folder = this.getSuggestedSaveFolder(this.getSelectedMessages());
        if (folder) this.addToMRUList(folder);
        break;
      }

      var fnp = false;
      // Only show fnp dialog, if attachments would be saved
      if (this.prefs.get("extract.enabled")) {
        // If pref is true, show the fnp edit dialog before extracting
        if (this.prefs.get("filenamepattern.askalwaysfnp")) {
          fnp = this.getFilenamePattern();
          aedump("fnp after extra fnp dialog: " + fnp + "\n");
        }
      }
  
    //aedump("folder: "+folder);
    //aedump("getSelectedMessages()[0]: " + this.getSelectedMessages()[0] + "\n");
    if (folder) aewindow.createAEIndTask(folder, this.getSelectedMessages()[
      0], attachments, fnp);
  };

  AttachmentExtractor.prototype.doBackgroundAttachmentextraction = function() {
    this.startAttachmentextraction(this.getAutoSaveFolder(), this.autoMsgs,
      null, true, false);
    this.autoMsgs = new Array();
  };

  AttachmentExtractor.prototype.doSingleBackgroundAttachmentextraction =
    function(message) {
      this.startAttachmentextraction(this.getAutoSaveFolder(), [message], null,
        true, false);
    };


  /* begining and ending functions */

  AttachmentExtractor.prototype.startAttachmentextraction = function(savefolder,
    messages, filenamepattern, background, deleteAtt) {
    if (this.prefs.get("queuerequests")) {
      var aew = progress_tracker.getWindowByType("mail:AEDialog");
      if (aew && aew.document.getElementById("aemessagepane")) {
        this.queuedTasks.push([savefolder, messages, filenamepattern,
          background, deleteAtt
        ]);
        return;
      }
    }
    this.openAEDialog(savefolder, messages, filenamepattern, background,
      deleteAtt);
  }

  AttachmentExtractor.prototype.queuedTaskObserver = {
    observe: function(subject, topic, d) {
      var windowtype;
      try {
        var win = subject.QueryInterface(Ci.nsIDOMWindow);
        windowtype = win.document.documentElement.getAttribute(
        'windowtype');
      } catch (e) {}
      if (windowtype !== "mail:AEDialog") return;
      if (attachmentextractor.queuedTasks.length > 0) {
        var l = attachmentextractor.queuedTasks.shift();
        if (l) attachmentextractor.openAEDialog(l[0], l[1], l[2], l[3], l[
          4]);
      } else {

      }
    }
  };

  AttachmentExtractor.prototype.openAEDialog = function(savefolder, messages,
    filenamepattern, background, deleteAtt) {
    return window.openDialog(
      "chrome://attachmentextractor_cont/content/aec_dialog_detachProgress.xul",
      "_blank",
      "chrome,extrachrome,menubar,resizable,scrollbars,status,toolbar",
      savefolder, messages, filenamepattern, gDBView, background, deleteAtt);
  };

  /* anxillary functions */

  AttachmentExtractor.prototype.collectMessagesFromFolder = function(deep) {

    function getSimpleEnumerator(nsIEnum) {
      // makes a nsISimpleEnumerator from a nsIEnumerator
      return {
        hasMoreElements: function() {
          try {
            nsIEnum.currentItem();
          } catch (e) {
            return false;
          }
          return true;
        },
        getNext: function() {
          var c = nsIEnum.currentItem();
          try {
            nsIEnum.next();
          } catch (e) {}
          return c;
        },
        QueryInterface: function(iid) {
          if ((iid === Ci.nsISimpleEnumerator) || (iid === Ci.nsISupports))
            return this;
          throw Cr.NS_NOINTERFACE;
        }
      };
    }

    function getAllMessages_sub(folder, msgs, deep) {
      var enumr;
      if (view.msgFolder === folder) {
        var treeView = view.QueryInterface(Ci.nsITreeView);
        var msgdb = null;
        try {
          msgdb = mail.folder.getMsgDatabase(null);
        } catch (e) {} // only needed for TB2 - will fail in TB3
        for (let i = 0; i < treeView.rowCount; i++) {
          var hdr = (view.getMsgHdrAt) ? view.getMsgHdrAt(i) : msgdb
            .GetMsgHdrForKey(view.getKeyAt(i));
          msgs.push(hdr);
        }
      } else {
        enumr = (folder.messages) ? folder.messages : folder.getMessages(
          msgWindow);
        while (enumr.hasMoreElements()) {
          var msg = enumr.getNext().QueryInterface(Ci.nsIMsgDBHdr);
          if (msg) msgs.push(msg);
        }
      }
      if (deep && folder.hasSubFolders) {
        enumr = (folder.subFolders ? folder.subFolders : getSimpleEnumerator(
          folder.GetSubFolders()));
        try {
          while (enumr.hasMoreElements()) {
            getAllMessages_sub(enumr.getNext().QueryInterface(Ci
              .nsIMsgFolder), msgs, deep);
          }
        } catch (e) {
          aedump("//ae: " + e + "\n", 2);
        }
      }
    }

    var folders = (typeof gFolderTreeView === "function") ? gFolderTreeView
      .getSelectedFolders() : GetSelectedMsgFolders();
    var msgs = new Array();
    var view = gDBView;

    for (var m = 0; m < folders.length; m++) {
      getAllMessages_sub(folders[m], msgs, deep);
    }

    return msgs;
  };

  AttachmentExtractor.prototype.getSelectedAttachments = function() {
    var selectedAttachments = document.getElementById('attachmentList')
      .selectedItems;
    var atts = new Array(selectedAttachments.length);
    for (let i = 0; i < selectedAttachments.length; i++) {
      atts[i] = selectedAttachments[i].attachment;
      if (!atts[i].uri) atts[i].uri = atts[i]
      .messageUri; //not used in tb3 - tb2 uses messageUri rather than uri.
    }
    return atts;
  }

  AttachmentExtractor.prototype.getSelectedMessages = function() {
    if (typeof gFolderDisplay !== "undefined") return gFolderDisplay
      .selectedMessages; //tb3
    var uris = GetSelectedMessages(); //tb2 have to mock it up
    if (uris.length === 0) return null;
    var hdrs = new Array(uris.length);
    for (let i = 0; i < hdrs.length; i++) {
      hdrs[i] = messenger.msgHdrFromURI(uris[i]);
    }
    return hdrs;
    /*else return gDBView.getMsgHdrsForSelection();*/
  }

  AttachmentExtractor.prototype.getSaveFolder = function(pref, updatepref, branch) {
    var fp = Cc["@mozilla.org/filepicker;1"].createInstance(Ci.nsIFilePicker);

    switch (pref) {
      case "defaultsavepath":
        var branch = "extensions.attachextract_cont.";
        windowTitle = this.aeStringBundle.GetStringFromName(
          "FolderPickerDialogTitleDefaultSavePath");
        break;
      case "autoextract.savepath":
        var branch = "extensions.attachextract_cont.";
        windowTitle = this.aeStringBundle.GetStringFromName(
          "FolderPickerDialogTitleDefaultAutoextractPath");
        break;
      default:
        windowTitle = this.aeStringBundle.GetStringFromName(
          "FolderPickerDialogTitle");
      }

    try {
      fp.init(window, windowTitle, Ci.nsIFilePicker.modeGetFolder);
      aedump("getSaveFolder pref: " + pref + "\n");
      aedump("getSaveFolder pref.value: " + pref.value + "\n");
      try {
        if (pref.value) fp.displayDirectory = pref.value;
      } catch (e) {
        aedump(e, 1);
      }

      // must use this lazy file picker method to wait for the dir result
      //
      let done = false;
      let rv, result;
      fp.open(result => {
        rv = result;
        done = true;
      });
      let thread = Cc["@mozilla.org/thread-manager;1"]
        .getService().currentThread;
      while (!done) {
        thread.processNextEvent(true);
      }
      dir = fp.file.path;
      if (updatepref) this.prefs.setFile(pref, dir, branch);
      return dir;
      //
      // end of the lazy file picker method
    } catch (e) {
      aedump(e, 0);
    }
  };

  AttachmentExtractor.prototype.getDefaultSaveFolder = function() {
    aedump('{function:AttachmentExtractor.getDefaultSaveFolder}\n',2);
    if (this.prefs.hasUserValue("defaultsavepath")) {
      return this.prefs.get("defaultsavepath");
    } else {
      return this.getSaveFolder("defaultsavepath", true);
    }
  };

  AttachmentExtractor.prototype.getAutoSaveFolder = function() {
    if (this.prefs.hasUserValue("autoextract.savepath")) {
      return this.prefs.getFile("autoextract.savepath");
    } else {
      return this.getSaveFolder("autoextract.savepath", true);
    }
  };

  AttachmentExtractor.prototype.getSuggestedSaveFolder = function(messages) {

    function extractKeywords(str, nodupes, excludedwords) {
      var out = str.toLowerCase().replace(/[\(\)\[\]\\\/\{\}\"\'\:\;\,\$\&]/g,
        "").split(/[ \-\_]/g);
      if (!excludedwords) excludedwords = new Array();
      return out.filter(function(element, index, array) {
        return (element !== "" && excludedwords.indexOf(element) === -1 && (
          !nodupes || index === 0 || array.lastIndexOf(element, index -
            1) === -1));
      });
    }

    function matchKeywords(keywords, leafName, nodupes) {
      aedump("{function matchKeywords} Keyword:  " + keywords + "\n");
      aedump("{function matchKeywords} leafName: " + leafName + "\n");
      aedump("{function matchKeywords} nodupes:  " + nodupes + "\n");
      var folderwords = extractKeywords(leafName, true, null);
      var numMatches = 0;
      for (let i = 0; i < folderwords.length; i++) {
        var wordmatch = 0;
        while (wordmatch !== -1) {
          wordmatch = keywords.indexOf(folderwords[i], wordmatch);
          if (wordmatch !== -1) {
            numMatches++;
            if (nodupes) wordmatch = -1;
            else wordmatch++;
          }
        }
      }
      //if (numMatches>0) aedump({toString:function() {return "folderwords ("+leafName+"): "+folderwords.join(",")+" matched against "+keywords.join(",")+"\n";}},3);
      return numMatches;
    }

    if (!this.prefs.hasUserValue("suggestfolder.parent.1")) return false;

    var nodupes = this.prefs.get("suggestfolder.disregardduplicates");
    var excludedwords = this.prefs.get("suggestfolder.excludekeywords").split(
      ",");
    var subjects = "";
    for (let i = 0; i < messages.length; i++) {
      subjects += messages[i].mime2DecodedSubject + " ";
    }
    var keywords = extractKeywords(subjects, nodupes, excludedwords);
    // aedump(keywords.join(",")+"\n");

    var matchedFolders = new Array();

    var ps = this.prefs.aeBranch;
    var pfc = 1;
    var enumr;
    while (ps.prefHasUserValue("suggestfolder.parent." + pfc)) {
      try {
        var folder = ps.getStringPref("suggestfolder.parent." + pfc);

        folder = new FileUtils.File(folder);

        aedump("Match folders and keywords: folder:          " + folder +
          "\n");
        aedump("Match folders and keywords: folder.leafName: " + folder
          .leafName + "\n");

        var numMatches = matchKeywords(keywords, folder.leafName, nodupes);
        if (numMatches > 0) matchedFolders.push({
          f: folder,
          ct: numMatches
        });
        enumr = folder.directoryEntries;
        aedump("enumr: " + enumr + "\n");
        while (enumr.hasMoreElements()) {
          folder = enumr.getNext().QueryInterface(Ci.nsIFile);
          if (folder.isFile()) continue;
          numMatches = matchKeywords(keywords, folder.leafName, nodupes);
          aedump("numMatches: " + numMatches + "\n");
          if (numMatches > 0) matchedFolders.push({
            f: folder,
            ct: numMatches
          });
        }
      } catch (e) {
        aedump("//ae suggestfolder: " + e + "\n", 2);
      }
      pfc++;
    }

    matchedFolders.sort(function(a, b) {
      return b.ct - a.ct;
    });
    aedump({
      toString: function() {
        return matchedFolders.map(function(f) {
          return f.f.leafName + " [" + f.ct + "]";
        }).join(",") + "\n";
      }
    }, 3);
    var maxm = this.prefs.get("suggestfolder.maxmatches");
    if (matchedFolders.length > maxm) matchedFolders.length = maxm;

    var out = {
      selectedIndex: -1,
      browse: null
    }

    // var matches=matchedFolders;
    // for (var i=0;i < matches.length;i++) {
    // aedump("matchedFolders: "+matches[i].f.path+"\n");
    // }

    window.openDialog(
      "chrome://attachmentextractor_cont/content/aec_dialog_suggestedFolder.xul",
      "",
      "chrome, dialog, modal, resizable", matchedFolders, out);
    if (out.browse) {
      return this.addToMRUList(
        this.getSaveFolder("messenger.save.dir", true, ""));
    }
    if (out.selectedIndex !== -1) {
      return matchedFolders[out.selectedIndex].f;
    }
    return false;
  };

  AttachmentExtractor.prototype.getFilenamePattern = function() {
    //var prompts = Cc["@mozilla.org/embedcomp/prompt-service;1"].getService(Ci.nsIPromptService);
    var input = {
      value: this.prefs.get("filenamepattern")
    };
    var check = {
      value: false
    };
    var askalwaysfnp = {
      value: true
    };
    var out = {
      value: false
    };
    // 
    window.openDialog(
      "chrome://attachmentextractor_cont/content/aec_dialog_filenamePattern.xul",
      "",
      "chrome, dialog, modal", input, check, askalwaysfnp, out);
    if (!out.value) return null;
    try {
      var fm = new AttachmentFileMaker(null, null, null);
      input.value = fm.fixFilenamePattern(input.value);
    } catch (e) {
      aedump(e);
    }
    if (check.value && input.value) this.prefs.set("filenamepattern", input
      .value);
    this.prefs.set("filenamepattern.askalwaysfnp", askalwaysfnp.value);
    return input.value;
  }

  AttachmentExtractor.prototype.checkForAutoTag = function() {
    var aec_tag = this.prefs.get("autoextract.triggertag");
    if (!this.prefs.prefService.getBranch("").getPrefType("mailnews.tags." +
        aec_tag + ".tag")) {
      aedump("// AE's auto-tag not found so add it.\n", 0);
      var tagService = Cc["@mozilla.org/messenger/tagservice;1"].getService(Ci
        .nsIMsgTagService);
      tagService.addTagForKey(aec_tag, 'AE AutoExtract', '', '');
    }
  };

  /* ********* listener and gui code ****************** */

  AttachmentExtractor.prototype.setupListeners = function() {
    if (attachmentextractor.setupListenersDone) return;
    aedump("{function:AttachmentExtractor.setupListeners}\n", 3);
    try {
      attachmentextractor.clearMRU(attachmentextractor.MRUMAXCOUNT,
        attachmentextractor.prefs.get("savepathmru.count") + 1
        ); //clear any extra mru slots.

        var t;
        if ((t = document.getElementById('folderPaneContext'))) t
          .addEventListener('popupshowing', attachmentextractor
            .updateMRUVisability, false);
        if ((t = document.getElementById('mailContext'))) t.addEventListener(
          'popupshowing', attachmentextractor.updateMRUVisability, false
          );
  
        if ((t = document.getElementById('messageMenuPopup'))) t
          .addEventListener('popupshowing', attachmentextractor
            .updateMRUVisability, false);
  
        document.getElementById('folderTree').addEventListener('select',
        attachmentextractor.updateAECommands, false);
      document.getElementById('threadTree').addEventListener('select',
        attachmentextractor.updateAECommands, false);
    } catch (e) {
      aedump("// setuplisteners failed.\n" + e);
    }
    attachmentextractor.setupListenersDone = true;
  };

  AttachmentExtractor.prototype.updateAECommands = function() {
    aedump('{function:AttachmentExtractor.updateAECommands}\n',2);
    var view = gDBView;

    if (view) document.getElementById('aec_commandset_folder')
      .removeAttribute('disabled');
    else document.getElementById('aec_commandset_folder').setAttribute(
      'disabled', 'true');
    if (view && view.numSelected > 0) document.getElementById(
      'aec_commandset_msg').removeAttribute('disabled');
    else document.getElementById('aec_commandset_msg').setAttribute(
      'disabled', 'true');
  };

  AttachmentExtractor.prototype.updateFavoriteMenuItems = function(parent) {
    aedump('{function:AttachmentExtractor.updateFavoriteMenuItems}\n',2);

    var prefs = Services.prefs.getBranch(
      "extensions.attachextract_cont.");

    // clear the old menuitems
    var children = parent.childNodes;
    for (let i = children.length - 1; i >= 0; i--) {
      // aedump("remove Favorite-child-number: " + i + "\n", 2);
      if (children[i].getAttribute("aec_favoritefolder_menuitem") === 
        "GENERATED") parent.removeChild(children[i]);
    }

    // we proceed here and build the new menuitems
    var oncommand = "attachmentextractor.do";
    if (parent.getAttribute("paramIndividual") === "true") oncommand +=
      "IndividualAttachmentextraction('favorite', " + parent.getAttribute(
      "paramAll") + ", '#'); event.stopPropagation();"
    else oncommand += "Attachmentextraction(event,'favorite', " + parent.getAttribute(
      "paramAll") + ", '#'); event.stopPropagation();"
    
    /***********************
    // not more working in Thunderbird 69+ 
    var obj = {};
    prefs.getChildList("favoritefolder.", obj);
    var count = obj.value;
    // aedump("favoritefolder count = obj.value: " + count + "\n", 2);
    *************************/

    // Thunderbird 69+
    var obj = {};
    obj = prefs.getChildList("favoritefolder.", obj);
    var count = obj.length;
    // aedump("favoritefolder count = obj.length: " + count + "\n", 2);

    for (let i = 1; i <= count; i++) {
      var accesskey = i-1;
      var folderpath ="";
      var folderlabel= "";
      if (aec_versionChecker.compare(aec_currentVersion, "69") >= 0) {
        // use document.createXULElement for Thunderbird 69+
        var menuitem = document.createXULElement("menuitem");
      } else {
        // use document.createElement for Thunderbird 60 and 68
        var menuitem = document.createElement("menuitem");
      }
      menuitem.setAttribute("crop", "center");
      if (i <= 10) menuitem.setAttribute("accesskey", "" + accesskey);
      menuitem.setAttribute("command", "");
      menuitem.setAttribute("aec_favoritefolder_menuitem", "GENERATED");
      menuitem.setAttribute("oncommand", oncommand.replace(/#/, i));
      var folderpath = (prefs.prefHasUserValue("favoritefolder." + i)) ? 
        prefs.getStringPref("favoritefolder." + i) : null;
      if (i <= 10)
        folderlabel = "(" + accesskey + ") " + folderpath;
      else
        folderlabel = "      " + folderpath; // 6 spaces to be in line
      menuitem.setAttribute('label', folderlabel);
      menuitem.setAttribute('tooltiptext', folderpath);
      parent.appendChild(menuitem);
    }
    // aedump('{end of function:AttachmentExtractor.updateFavoriteMenuItems}\n',2);
  };

  AttachmentExtractor.prototype.useFavoritefolder = function(index) {
    aedump('{function:AttachmentExtractor.useFavoritefolder(' + index + ')}\n', 2);
    var path = this.prefs.hasUserValue("favoritefolder." + index) ? this.prefs
      .getFile("favoritefolder." + index) : null;
      // aedump('path = ' + path + ')}\n', 2);
      if (!path) return null;
      return path;
  }

  AttachmentExtractor.prototype.updatePopupMenus = function(event) {
    aedump('{function:AttachmentExtractor.updatePopupMenus}\n',2);

    var prefs = Services.prefs.getBranch(
      "extensions.attachextract_cont.");

    // -----  En-/Disable favorite folder submenu -----

    /***********************
    // not more working in Thunderbird 69+ 
    var favoriteObj = {};
    prefs.getChildList("favoritefolder.", favoriteObj);
    var count = favoriteObj.value;
    // aedump("favoritefolder count = favoriteObj.value: " + count + "\n", 2);
    *************************/

    // Thunderbird 69+: 
    var favoriteObj = {};
    favoriteObj = prefs.getChildList("favoritefolder.", favoriteObj);
    var favoriteCount = favoriteObj.length;
    //aedump("favoritefolder count = favoriteObj.length: " + favoriteCount + "\n", 2);

    var favoriteItems = [
      "menu_aec_extractToFavorite_toolbar",
      "menu_aec_extractToFavorite_messageMenu",
      "menu_aec_extractToFavorite_mailContext",
      "menu_aec_extractAllToFavorite_fileMenu",
      "menu_aec_extractDeepToFavorite_fileMenu",
      "menu_aec_extractAllToFavorite_folderPaneContext",
      "menu_aec_extractDeepToFavorite_folderPaneContext",
      "menu_aec_extractToFavorite_attachmentSaveAllMultiple",
      "menu_aec_extractToFavorite_attachmentSaveAllSingle",
      "menu_aec_extractToFavorite_attachmentListContext",
      "menu_aec_extractToFavorite_attachmentItemContext"
    ];

    for (let i = 0; i < favoriteItems.length; i++) { 
      try {
        if (favoriteCount === 0)
          document.getElementById(favoriteItems[i]).setAttribute("disabled", "true");
        else
          document.getElementById(favoriteItems[i]).removeAttribute("disabled");
      } catch {}
    }

    // -----  En-/Disable mru folder submenu -----

    /***********************
    // not more working in Thunderbird 69+ 
    var mruObj = {};
    prefs.getChildList("favoritefolder.", mruObj);
    var count = mruObj.value;
    // aedump("favoritefolder count = mruObj.value: " + count + "\n", 2);
    *************************/

    // Thunderbird 69+: 
    var mruObj = {};
    mruObj = prefs.getChildList("savepathmrufolder.", mruObj);
    var mruCount = mruObj.length;
    //aedump("mrufolder count = mruObj.length: " + mruCount + "\n", 2);

    var mruEnabled = Services.prefs.getBoolPref(
      "extensions.attachextract_cont.savepathmru.enabled");

    var mruItems = [
      "menu_aec_extractToMRU_toolbar",
      "menu_aec_extractToMRU_messageMenu",
      "menu_aec_extractToMRU_mailContext",
      "menu_aec_extractAllToMRU_fileMenu",
      "menu_aec_extractDeepToMRU_fileMenu",
      "menu_aec_extractAllToMRU_folderPaneContext",
      "menu_aec_extractDeepToMRU_folderPaneContext",
      "menu_aec_extractToMRU_attachmentSaveAllMultiple",
      "menu_aec_extractToMRU_attachmentSaveAllSingle",
      "menu_aec_extractToMRU_attachmentListContext",
      "menu_aec_extractToMRU_attachmentItemContext"
    ];

    for (let i = 0; i < mruItems.length; i++) { 
      try {
        if ((mruCount === 0) || (!mruEnabled))
          document.getElementById(mruItems[i]).setAttribute("disabled", "true");
        else
          document.getElementById(mruItems[i]).removeAttribute("disabled");
      } catch {}
    }

    // -----  En-/Disable suggest folder menuitem -----

    /***********************
    // not more working in Thunderbird 69+ 
    var suggestObj = {};
    prefs.getChildList("favoritefolder.", suggestObj);
    var count = suggestObj.value;
    // aedump("favoritefolder count = suggestObj.value: " + count + "\n", 2);
    *************************/

    // Thunderbird 69+: 
    var suggestObj = {};
    suggestObj = prefs.getChildList("suggestfolder.parent.", suggestObj);
    var suggestCount = suggestObj.length;
    //aedump("suggestfolder count = suggestObj.length: " + suggestCount + "\n", 2);

    var suggestItems = [
      "menu_aec_extractToSuggest_toolbar",
      "menu_aec_extractToSuggest_messageMenu",
      "menu_aec_extractToSuggest_mailContext",
      "menu_aec_extractAllToSuggest_fileMenu",
      "menu_aec_extractDeepToSuggest_fileMenu",
      "menu_aec_extractAllToSuggest_folderPaneContext",
      "menu_aec_extractDeepToSuggest_folderPaneContext",
      "menu_aec_extractToSuggest_attachmentSaveAllMultiple",
      "menu_aec_extractToSuggest_attachmentSaveAllSingle",
      "menu_aec_extractToSuggest_attachmentListContext",
      "menu_aec_extractToSuggest_attachmentItemContext"
    ];

    for (let i = 0; i < suggestItems.length; i++) { 
      try {
        if (suggestCount === 0)
          document.getElementById(suggestItems[i]).setAttribute("disabled", "true");
        else
          document.getElementById(suggestItems[i]).removeAttribute("disabled");
      } catch {}
    }

  };

  AttachmentExtractor.prototype.onShowAttachmentContextMenu = function(event) {
    aedump('{function:AttachmentExtractor.onShowAttachmentContextMenu}\n',2);
    var attachmentList = document.getElementById('attachmentList');

    var canOpen = false;
    if (document.getElementById('context-saveAttachment').getAttribute(
        'disabled') !== "true") {
      for (let i = 0; i < attachmentList.selectedItems.length && !
        canOpen; i++) {
        canOpen = !attachmentList.selectedItems[i].attachment
          .isExternalAttachment;
        aedump(" * "+attachmentList.selectedItems[i].attachment.isExternalAttachment);
      } aedump(" post: "+canOpen+" | "+attachmentList.selectedItems.length+"\n");
    } 
    aedump("//canOpen: "+canOpen+"\n");  
    if (canOpen) document.getElementById('aec_commandset_ind')
      .removeAttribute('disabled');
    else document.getElementById('aec_commandset_ind').setAttribute(
      'disabled', "true");

    aedump('{end of function:AttachmentExtractor.onShowAttachmentContextMenu}\n',2);
  };

  AttachmentExtractor.prototype.updateMRUMenuItems = function(parent) {
    aedump('{function:AttachmentExtractor.updateMRUMenuItems}\n',2);
    var ps = attachmentextractor.prefs.prefService.getBranch(
      "extensions.attachextract_cont.");
    
    // clear the old menuitems
    var children = parent.childNodes;
    for (let i = children.length - 1; i >= 0; i--) {
      // aedump("remove MRU-child-number: " + i + "\n", 2);
      if (children[i].getAttribute("aec_mru_menuitem") === "GENERATED") parent
        .removeChild(children[i]);
    }

    // if savepathmru is disabled do not build the new menuitems
    if (!ps.getBoolPref("savepathmru.enabled")) return;

    // if savepathmru is enabled we proceed here and build the new menuitems
    var oncommand = "attachmentextractor.do";
    if (parent.getAttribute("paramIndividual") === "true") oncommand +=
      "IndividualAttachmentextraction('mru', " + parent.getAttribute(
      "paramAll") + ", '#'); event.stopPropagation();"
    else oncommand += "Attachmentextraction(event,'mru', " + parent.getAttribute(
      "paramAll") + ", '#'); event.stopPropagation();"

    var count = ps.getIntPref("savepathmru.count");
    for (let i = 1; i <= count; i++) {
      var accesskey = i-1;
      var folderpath ="";
      var folderlabel= "";
      if (aec_versionChecker.compare(aec_currentVersion, "69") >= 0) {
        // use document.createXULElement for Thunderbird 69+
        var menuitem = document.createXULElement("menuitem");
      } else {
        // use document.createElement for Thunderbird 60 and 68
        var menuitem = document.createElement("menuitem");
      }
      menuitem.setAttribute("crop", "center");
      if (i <= 10) menuitem.setAttribute("accesskey", "" + accesskey);
      menuitem.setAttribute("command", "");
      menuitem.setAttribute("aec_mru_menuitem", "GENERATED");
      menuitem.setAttribute("oncommand", oncommand.replace(/#/, i));
      var folderpath = (ps.prefHasUserValue("savepathmrufolder." + i)) ? 
        ps.getStringPref("savepathmrufolder." + i) : null;
      if (!folderpath || folderpath === "") folderpath = "< ... >";
      if (i <= 10)
        folderlabel = "(" + accesskey + ") " + folderpath;
      else
        folderlabel = "      " + folderpath; // 6 spaces to be in line
      menuitem.setAttribute('label', folderlabel);
      menuitem.setAttribute('tooltiptext', folderpath);
      parent.appendChild(menuitem);
    }
    // aedump('{end of function:AttachmentExtractor.updateMRUMenuItems}\n',2);
  };

  AttachmentExtractor.prototype.addToMRUList = function(path) {
    aedump('{function:AttachmentExtractor.addToMRUList(' + path + ')}\n', 2);
    var ps = this.prefs.aeBranch;
    if (!ps.getBoolPref("savepathmru.enabled") || !path) return path;
    var count = ps.getIntPref("savepathmru.count");
    var old = (ps.prefHasUserValue("savepathmrufolder.1")) ? ps.getStringPref(
      "savepathmrufolder.1") : null;
    if (old && (path === old)) return path;
    ps.setStringPref("savepathmrufolder.1", path);
    if (!old) return path;
    var prev = old;
    var i = 2;
    for (; i <= count; i++) {
      old = (ps.prefHasUserValue("savepathmrufolder." + i)) ? ps.getStringPref(
        "savepathmrufolder." + i) : null;
      ps.setStringPref("savepathmrufolder." + i, prev);
      if (!old || (path === old)) break;
      prev = old;
    }
    return path;
  };

  AttachmentExtractor.prototype.useMRU = function(index) {
    aedump('{function:AttachmentExtractor.useMRU(' + index + ')}\n', 2);
    var path = this.prefs.hasUserValue("savepathmrufolder." + index) ? this.prefs
      .getFile("savepathmrufolder." + index) : null;
    if (!path) return null;
    return this.addToMRUList(path);
  }

  AttachmentExtractor.prototype.clearMRU = function(max, min) {
    aedump('{function:AttachmentExtractor.clearMRU}\n', 2);
    if (!min || min < 1) min = 1;
    if (!max || max > this.MRUMAXCOUNT) max = this.MRUMAXCOUNT;
    var ps = this.prefs.prefService.getBranch(
      "extensions.attachextract_cont.");
    for (let i = min; i <= max; i++) {
      if (ps.prefHasUserValue("savepathmrufolder." + i)) ps.clearUserPref(
        "savepathmrufolder." + i);
    }
  };

  AttachmentExtractor.prototype.createaedumpfile = function() {

    function printPrefValues(includeDefault, excludereg) {
      var branch = attachmentextractor.prefs.aeBranch;
      var children = branch.getChildList("", {});
      var out = null;
      for (let i = 0; i < children.length; i++) {
        if (!excludereg.test(children[i]) &&
          (includeDefault || branch.prefHasUserValue(children[i]))) {
          if (!out) out = "";
          else out += ", \r\n";
          var val;
          switch (branch.getPrefType(children[i])) {
            case branch.PREF_BOOL:
              val = branch.getBoolPref(children[i]);
              break;
            case branch.PREF_INT:
              val = branch.getIntPref(children[i]);
              break;
            case branch.PREF_STRING:
              val = '"' + branch.getCharPref(children[i]) + '"';
              break;
            default:
          }
          out += children[i] + ":" + val;
        }
      }
      return out;
    }

    try {
      aedebug.init(aedebugFile, 0x02 | 0x08 | 0x20, 0664, 0);
      var str = "//log start \r\n";
      aedebug.write(str, str.length);

      /* following enabled by build script in xpi only: */
      str = "AE Set Preferences: {\r\n" + printPrefValues(false,
        /.*\.[0-9]*$/i) + "}\r\n";
      aedebug.write(str, str.length);

      /* end */

      aedebug.close();
    } catch (e) {
      dump(e);
    }
  }

  AttachmentExtractor.prototype.createaefolderListener = function() {
    return {
      /*OnItemAdded: function(parentItem, item) {
        aedump("{function:aefolderlistener.OnItemAdded}\n",3);
        if (!attachmentextractor.prefs.get("autoextract.enabled")) return;
                      
        var mail;
        try{
          mail=item.QueryInterface(Ci.nsIMsgDBHdr);}
        catch (e) {return;}
        var folder=parentItem.QueryInterface(Ci.nsIMsgFolder); 
        if (!(!mail.isRead && (mail.flags & 0x10000))) {
          //aedump("// not a new mail so don't extract\n",3);
          return; 
        }
        aedump("{function:aefolderlistener.onItemAdded("+folder.prettyName+","+mail.subject+")}\n",2);
        if (!folder.getMsgDatabase(null).HasAttachments(mail.messageKey)) {
          aedump("// message has no attachments so ignoring.\n",3);
          return;
        }
        var tagsArray= mail.getStringProperty("keywords").split(" ");
        var triggerTag=attachmentextractor.prefs.get("autoextract.triggertag");
        //aedump("[tags array: "+mail.getStringProperty("keywords")+"]\n",0);
        //aedump("[trigger tag: "+attachmentextractor.prefs.get("autoextract.triggertag")+"]\n",0);
        if (attachmentextractor.prefs.get("autoextract.ontriggeronly") && (tagsArray.indexOf(triggerTag)===-1) ) {
          aedump("// only tagged emails and tag doesn't match\n",3);
          return;
        }
        if (attachmentextractor.prefs.get("autoextract.waitforall")) {
          attachmentextractor.autoUris.push(mail.folder.getUriForMsg(mail));
        }
        else attachmentextractor.doSingleBackgroundAttachmentextraction(mail.folder.getUriForMsg(mail));
      },*/

      OnItemPropertyChanged: function(item, property, oldValue, newValue) {
        //aedump("{function:aefolderlistener.onItemPropertyChanged}\n",3);
        if (!attachmentextractor.prefs.get("autoextract.waitforall"))
      return;
        var folder;
        try {
          folder = item.QueryInterface(Ci.nsIMsgFolder);
        } catch (e) {
          return;
        }
        aedump("{function:OnItemPropertyChanged(" + folder.prettyName +
          "," + property + oldValue + "," + newValue + ")}\n", 2);
        if (newValue > oldValue && attachmentextractor.autoMsgs.length !==
          0) {
          attachmentextractor.doBackgroundAttachmentextraction();
        }
      },

      /*OnItemRemoved: function(parentItem, item) {
      if (!attachmentextractor.prefs.get("linkedfiles")) return;  

      var mail,folder;
      try{
        mail=item.QueryInterface(Ci.nsIMsgDBHdr);
        folder=parentItem.QueryInterface(Ci.nsIMsgFolder); 
      }catch (e) {return;}
      if (!folder.getFlag( 0x0100) ) return;
      aedump("{function:OnItemRemoved("+folder.prettyName+","+mail.subject+","+mail.folder.prettyName+")}\n",4);
      //if (mail.getStringProperty("AEMetaData.savedfiles")!=="") attachmentextractor.deleteLinkedFile(mail);
      },*/

      /*
      OnItemIntPropertyChanged: function(item, property, oldValue, newValue) {aedump("{function:OnItemIntPropertyChanged("+argexpand(arguments)+")}\n",4);},
      OnItemBoolPropertyChanged: function(item, property, oldValue, newValue) {aedump("{function:OnItemBoolPropertyChanged("+argexpand(arguments)+")}\n",4);},
      OnItemUnicharPropertyChanged: function(item, property, oldValue, newValue){aedump("{function:OnItemUnicharPropertyChanged("+argexpand(arguments)+")}\n",4);},
      OnItemPropertyFlagChanged: function(item, property, oldFlag, newFlag) {aedump("{function:OnItemPropertyFlagChanged("+argexpand(arguments)+")}\n",4);},
      OnItemEvent: function(folder, event) {aedump("{function:OnItemEvent("+argexpand(arguments)+")}\n",4);},  
      */

      // new msg or folder added - tb2 only
      itemAdded: function(item) {
        //aedump("{function:aefolderlistener.itemAdded}\n",3);
        var mail;
        try {
          mail = item.QueryInterface(Ci.nsIMsgDBHdr);
        } catch (e) {
          return;
        }
        this.msgAdded(mail);
      },

      //tb3 only but called by itemAdded above.
      msgAdded: function(mail) {
        //aedump("{function:aefolderlistener.msgAdded}\n",3);
        var prefs = attachmentextractor.prefs;
        if (!prefs.get("autoextract.enabled")) return;

        if (!(!mail.isRead && (mail.flags & 0x10000))) {
          aedump("// not a new mail so don't extract\n", 4);
          return;
        }
        aedump("{function:aefolderlistener.msgAdded(" + mail.folder
          .prettyName + "," + mail.subject + ")}\n", 2);
        var msgdb;
        try {
          msgdb = (mail.folder.msgDatabase) ? mail.folder.msgDatabase : mail
            .folder.getMsgDatabase(null);
        } catch (e) {
          msgdb = mail.folder.getDBFolderInfoAndDB(null);
        }
        if (prefs.get("autoextract.onattachmentsonly") && !msgdb
          .HasAttachments(mail.messageKey)) {
          aedump("// message has no attachments so ignoring.\n", 3);
          return;
        }
        msgdb = null;
        var tagsArray = mail.getStringProperty("keywords").split(" ");
        var triggerTag = prefs.get("autoextract.triggertag");
        if (prefs.get("autoextract.ontriggeronly") && (tagsArray.indexOf(
            triggerTag) === -1)) {
          aedump("// only tagged emails and tag doesn't match\n", 3);
          return;
        }
        if (prefs.get("autoextract.waitforall")) {
          attachmentextractor.autoMsgs.push(mail);
        } else attachmentextractor.doSingleBackgroundAttachmentextraction(
          mail);
      },

      // folder or msg deleted (no trash)
      itemDeleted: function(item) {
        /*if (!attachmentextractor.prefs.get("linkedfiles")) return;  
        
        var mail,folder;
        try{
        	try{folder=item.QueryInterface(Ci.nsIMsgFolder); }catch (ee){}
        	if (!folder) {
        		mail=item.QueryInterface(Ci.nsIMsgDBHdr);
        		folder=mail.folder; 
        	}
        }catch (e) {aedump(e);aedump(item);return;}
        aedump("{function:itemDeleted("+folder.prettyName+")}\n",4);
        alert("test");*/
      },

      itemMoveCopyCompleted: function(aMove, srcItems, destFolder) {},
      folderRenamed: function(aOrigFolder, aNewFolder) {},
      itemEvent: function(aItem, aEvent, aData) {}
    };
  };

  AttachmentExtractor.prototype.prefObserver = {
    observe: function(subject, topic, data) {
      //aedump("// "+topic+","+data+"\n");
      if (topic !== "nsPref:changed") return;
      if (data === "savepathmru.enabled" || data === "savepathmru.count") {
        if (attachmentextractor.prefs.get("savepathmru.enabled")) {
          attachmentextractor.clearMRU(attachmentextractor.MRUMAXCOUNT,
            attachmentextractor.prefs.get("savepathmru.count") + 1
            ); //clear any extra mru slots.
        }
        return
      }
      if (data === "defaultsavepath" || data ===
        "defaultsavepath.relative.key") {
        if (attachmentextractor.prefs.hasUserValue(
            "defaultsavepath.relative.key")) {
          var key = attachmentextractor.prefs.get(
            "defaultsavepath.relative.key");
          var dpf = attachmentextractor.prefs.getFile("defaultsavepath");
          attachmentextractor.prefs.setRelFile("defaultsavepath.relative",
            dpf, key);
        }
        return;
      }
      if (data === "autoextract.savepath" || data ===
        "autoextract.savepath.relative.key") {
        if (attachmentextractor.prefs.hasUserValue(
            "autoextract.savepath.relative.key")) {
          var key = attachmentextractor.prefs.get(
            "autoextract.savepath.relative.key");
          var dpf = attachmentextractor.prefs.getFile(
            "autoextract.savepath");
          attachmentextractor.prefs.setRelFile(
            "autoextract.savepath.relative", dpf, key);
        }
        return;
      }
    }
  };
}
/* *****  end of AttachmentExtractor Class Definition ****** */

if (!attachmentextractor) var attachmentextractor = new AttachmentExtractor();


// 