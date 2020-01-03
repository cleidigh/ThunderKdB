/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

// global AEC preferences
var AECprefs = Cc["@mozilla.org/preferences-service;1"]
  .getService(Ci.nsIPrefBranch);

if (typeof (wdw_aecOptions) === "undefined") {
  var {
    Services
  } = ChromeUtils.import("resource://gre/modules/Services.jsm");

  try {
    var filemaker = new AttachmentFileMaker(null, null, null);
    var exampleDate = new Date();
  } catch (e) {}

  var wdw_aecOptions = {

    mSuggestFolderListBox:  null,
    limitSuggestFolders: 100,

    mFavoriteFolderListBox:  null,
    limitFavoriteFolders: 10,

    init: function() {
      wdw_aecOptions.aeStringBundle = Services.strings.createBundle(
        "chrome://attachmentextractor_cont/locale/attachmentextractor.properties");

      wdw_aecOptions.loadInitialPane();

      // enableFields in general pane
      wdw_aecOptions.enableField(document.getElementById(
        'afterextractpolicydetach'), 'afterextractpolicydetachconfirm');
      
      wdw_aecOptions.enableField(document.getElementById(
        'afterextractsavemessage'), ['fnpsavemessage',
        'fnpsavemessagecountpattern']);

      // enableFields in folders pane
      wdw_aecOptions.enableField(document.getElementById(
        'savepathmruenabled'), 'savepathmrucount');

      wdw_aecOptions.mSuggestFolderListBox = document.getElementById("suggestfolderlist");
      wdw_aecOptions.buildSuggestFolderList();

      wdw_aecOptions.mFavoriteFolderListBox = document.getElementById("favoritefolderlist");
      wdw_aecOptions.buildFavoriteFolderList();
      
      // enableFields in auto pane
      // the different elements have to be en-/disabled in the following function
      wdw_aecOptions.enableAutoPaneFields();

      // enableFields in advanced pane
      wdw_aecOptions.enableField(document.getElementById('iep0false'),
        'excludepatternstextbox');
      wdw_aecOptions.enableField(document.getElementById('iep1true'),
        'includepatternstextbox');

      wdw_aecOptions.enableField(document.getElementById(
        'extractmode1'), ['setdatetoemailbox', 'minimumsize']);
      wdw_aecOptions.enableField(document.getElementById(
        'returnreceiptsenabled'), ['override']);

      // enableFields in protocoll pane
      wdw_aecOptions.enableField(document.getElementById('reportgenenabled'),
        ['reportname', 'reportgenthumbnail', 'reportgencssfile',
          'reportgencssfilebutton', 'reportgenembedcss']);


      document.getElementById('filenamepattern_exampledate').value =
        exampleDate.toLocaleString();
      wdw_aecOptions.updateexamplefilename();

      wdw_aecOptions.showTab();
    },

    enableAutoPaneFields: function() {
      let autoextract = document.getElementById('autoextractenabled');
      // enable or disable simply all elements in groupbox 'autoextractoptions'
      let autoextractoptions = document.getElementById(
      'autoextractoptions');
      if (autoextractoptions.hasChildNodes()) {
        // get all child and deeper nodes by simply using the TagNames '*'
        let nodeList = autoextractoptions.getElementsByTagName('*');
        for (let i = 0; i < nodeList.length; i++) {
          // we can only en-/disable node elements with an ID
          if (nodeList[i].id) {
            wdw_aecOptions.enableField(document.getElementById(
              'autoextractenabled'), nodeList[i].id);
          }
        }
      }
      // enable or disable different child elements if autoextract option is enabled
      if (autoextract.checked) {
        wdw_aecOptions.enableField(document.getElementById(
          'autotriggeronly'), 'autotriggertag');
        wdw_aecOptions.enableField(document.getElementById(
          'autodetach'), 'autoextractpolicydetachconfirm');
        wdw_aecOptions.enableField(document.getElementById(
          'autosavemessage'), ['autofnpsavemessage',
          'autofnpsavemessagecountpattern'
        ]);
      }
    },

    enableField: function(aCheckbox, fieldID) {
      let field = null;
      if (fieldID instanceof Array) {
        if (fieldID.length > 0) field = document.getElementById(fieldID
          .shift());
      } else field = document.getElementById(fieldID);
      if (!field) return;

      if ((aCheckbox.localName === "radio" && aCheckbox.selected) ||
        (aCheckbox.localName === "checkbox" && aCheckbox.checked)) {
        if (field.localName === "radiogroup") {
          field.disabled = false;
        } else {
          field.removeAttribute("disabled");
        }
      } else {
        if (field.localName === "radiogroup") {
          field.disabled = true;
        } else {
          field.setAttribute("disabled", "true");
        }
      }
      if (fieldID instanceof Array) wdw_aecOptions.enableField(
        aCheckbox, fieldID);

      // start of disabling not working objects in options dialog for now
      var notWorkingFeatures = [
        "reportgencssfile",
        "reportgencssfilebutton",
        "reportgenembedcss",
        "setdatetoemailbox",
        "minimumsize",
        "suggestfolderexcludekeywordstextbox"
      ];
      for (let i = 0; i < notWorkingFeatures.length; i++) {
        let object = document.getElementById(notWorkingFeatures[i]);
        if (object)
          object.setAttribute("disabled", "true");
      }
      // end of disabling not working objects in options dialog for now

    },

    showPane: function(paneID) {
      if (!paneID) {
        return;
      }

      let pane = document.getElementById(paneID);
      if (!pane) {
        return;
      }
      document.getElementById("aec-selector").value = paneID;

      let currentlySelected = document.getElementById("aec-paneDeck")
        .querySelector("#aec-paneDeck > prefpane[selected]");
      if (currentlySelected) {
        if (currentlySelected === pane) {
          return;
        }
        currentlySelected.removeAttribute("selected");
      }

      pane.setAttribute("selected", "true");
      pane.dispatchEvent(new CustomEvent("paneSelected", {
        bubbles: true
      }));

      document.documentElement.setAttribute("lastSelected", paneID);
      Services.xulStore.persist(document.documentElement, "lastSelected");
    },

    loadInitialPane: function() {
      if (document.documentElement.hasAttribute("lastSelected")) {
        wdw_aecOptions.showPane(document.documentElement.getAttribute(
          "lastSelected"));
      } else {
        wdw_aecOptions.showPane("aec-generalPane");;
      }
    },

    showTab: function() {
      if (window.arguments) {
        if (window.arguments[0].showTab) {
          wdw_aecOptions.showPane(window.arguments[0].showTab);
        }
      }
    },

    showDetachWarning: function(checkbox) {
      if (!checkbox.checked) return;
      let amessage = this.aeStringBundle.GetStringFromName(
        "ConfirmDetachSettingDialogMessage2");
      alert(amessage);
    },

    showAutoDetachWarning: function(checkbox) {
      if (!checkbox.checked) return;
      let amessage = this.aeStringBundle.GetStringFromName(
        "ConfirmAutoDetachSettingDialogMessage2");
      alert(amessage);
    },

    setComplexPref: function(prefname, value) {
      if (AECprefs.setStringPref) {
        AECprefs.setStringPref(prefname, value);
      } else {
        let str = Cc["@mozilla.org/supports-string;1"]
          .createInstance(Ci.nsISupportsString);
        str.data = value;
        AECprefs.setComplexValue(prefname, Ci.nsISupportsString, str);
      }
    },

    getComplexPref: function(prefname) {
      let value;
      if (AECprefs.getStringPref)
        value = AECprefs.getStringPref(prefname);
      else
        value = AECprefs.getComplexValue(prefname, Ci.nsISupportsString)
        .data;
      return value;
    },

    browseForFolder: function(prefname) {
      let pref = wdw_aecOptions.getComplexPref(prefname);
      let nsIFilePicker = Ci.nsIFilePicker;
      let fp = Cc["@mozilla.org/filepicker;1"].
        createInstance(nsIFilePicker);
      let windowTitle =
        this.aeStringBundle.GetStringFromName(
          "FolderPickerDialogTitle");
      try {
        fp.init(window, windowTitle, Ci.nsIFilePicker.modeGetFolder);
        try {
          if (pref) {
            let localFile = Cc["@mozilla.org/file/local;1"].createInstance(
              Ci.nsIFile);
            localFile.initWithPath(pref);
            fp.displayDirectory = localFile;
          }
        } catch (e) {
          aedump(e, 1);
        }
        fp.open(r => {
          if (r !== Ci.nsIFilePicker.returnOK || !fp.file) {
            return;
          }
          wdw_aecOptions.setComplexPref(prefname, fp.file.path);
        });
      } catch (e) {
        aedump(e, 0);
      }
    },

    browseForExecutable: function(prefname) {
      let pref = wdw_aecOptions.getComplexPref(prefname);
      let nsIFilePicker = Ci.nsIFilePicker;
      let fp = Cc["@mozilla.org/filepicker;1"]
        .createInstance(nsIFilePicker);
      let windowTitle =
        this.aeStringBundle.GetStringFromName(
          "ExecutableFilePickerDialogTitle");
      try {
        fp.init(window, windowTitle, Ci.nsIFilePicker.modeOpen);
        fp.appendFilters(Ci.nsIFilePicker.filterApps || Ci.nsIFilePicker
          .filterAll);
        try {
          if (pref) {
            let localFile = Cc["@mozilla.org/file/local;1"].createInstance(
              Ci.nsIFile);
            localFile.initWithPath(pref);
            localFile = localFile.parent;
            fp.displayDirectory = localFile;
          }
        } catch (e) {
          aedump(e, 1);
        }
        fp.open(r => {
          if (r !== Ci.nsIFilePicker.returnOK || !fp.file) {
            return;
          }
          wdw_aecOptions.setComplexPref(prefname, fp.file.path);
        });
      } catch (e) {
        aedump(e, 0);
      }
    },

    browseForCss: function(prefname) {
      let pref = wdw_aecOptions.getComplexPref(prefname);
      let nsIFilePicker = Ci.nsIFilePicker;
      let fp = Cc["@mozilla.org/filepicker;1"]
        .createInstance(nsIFilePicker);
      let windowTitle =
        this.aeStringBundle.GetStringFromName(
          "CSSFilePickerDialogTitle");
      try {
        fp.init(window, windowTitle, Ci.nsIFilePicker.modeOpen);
        fp.appendFilter(this.aeStringBundle.GetStringFromName(
          "CSSFileFilterDescription"), "*.css");
        try {
          if (pref) {
            let localFile = Cc["@mozilla.org/file/local;1"].createInstance(
              Ci.nsIFile);
            localFile.initWithPath(pref);
            localFile = localFile.parent;
            fp.displayDirectory = localFile;
          }
        } catch (e) {
          aedump(e, 1);
        }
        fp.open(r => {
          if (r !== Ci.nsIFilePicker.returnOK || !fp.file) {
            return;
          }
          wdw_aecOptions.setComplexPref(prefname, fp.file.path);
        });
      } catch (e) {
        aedump(e, 0);
      }
    },

    filltaglist: function() {
      let taglist = document.getElementById('autotriggertag');
      if (taglist.selectedItem !== null)
        return; //sometimes triggers twice. don't know why but stop it anyway.
      let tagService = Cc["@mozilla.org/messenger/tagservice;1"]
        .getService(Ci.nsIMsgTagService);
      let tagArray = tagService.getAllTags({});
      if (tagArray) {
        for (let tagInfo of tagArray) {
          if (tagInfo.tag) taglist.appendItem(tagInfo.tag, tagInfo.key);
        }
      }
      return;
    },

    fillcountlist: function() {
      let countlist = document.getElementById('savepathmrucount');
      if (countlist.selectedItem !== null)
        return; //sometimes triggers twice. don't know why but stop it anyway.
      for (let i = 1; i <= attachmentextractor.MRUMAXCOUNT; i++) {
        countlist.appendItem(i + "", i);
      }
      return;
    },

    /************** filenamepattern functions *********************/
    check_filenamepattern: function(element, countpattern) {
      if ((!countpattern && filemaker.isValidFilenamePattern(element
        .value)) || (
          filemaker.isValidCountPattern(element.value))) return;
      let prompts = Cc["@mozilla.org/embedcomp/prompt-service;1"]
        .getService(Ci
          .nsIPromptService);

      let bundle = document.getElementById("aestrbundle");
      let fixed = (!countpattern) ? filemaker.fixFilenamePattern(element
          .value) :
        filemaker.fixCountPattern(element.value);
      if (prompts.confirmEx(window,
          bundle.getString("FileNamePatternFixTitle"),
          bundle.getString("FileNamePatternFixMessage").replace("%1$s",
            fixed),
          prompts.STD_YES_NO_BUTTONS,
          "",
          "",
          "",
          null, {}) === 0) {
        element.value = fixed;
      }
    },

    updateexamplefilename: function() {
      let fnpbox = document.getElementById('filenamepatternbox');
      let pattern = fnpbox.value;
      let countpattern = document.getElementById('filenamepatterncount')
        .value;
      let datepattern = document.getElementById('filenamepatterndate')
        .value;
      let docleansubject = document.getElementById(
          'filenamepatterncleansubject')
        .checked;
      let exname = document.getElementById('filenamepattern_examplename')
        .value;
      let cleansubjectstrings = AECprefs.getStringPref(
          "extensions.attachextract_cont.filenamepattern.cleansubject.strings"
          )
        .toLowerCase().split(',');


      let excache = new AttachmentFileMaker.AttachmentFileMakerCache();
      excache.subject = document.getElementById(
          'filenamepattern_examplesubject')
        .value.replace(filemaker.tokenregexs.subject, "_");
      excache.author = document.getElementById(
          'filenamepattern_exampleauthor')
        .value.replace(filemaker.tokenregexs.author, "");
      excache.authoremail = document.getElementById(
          'filenamepattern_exampleauthor')
        .value.replace(filemaker.tokenregexs.authoremail, "");
      excache.datetime = filemaker.formatdatestring(datepattern,
        exampleDate);
      excache.mailfolder = document.getElementById(
          'filenamepattern_examplefolder')
        .value.replace(filemaker.tokenregexs.folder, "");

      let cleansubject = filemaker.cleanSubjectLine(excache.subject,
        cleansubjectstrings);
      if (docleansubject) excache.subject = cleansubject;

      let st = filemaker.generate(pattern.replace(/#count#/g, ""), null,
        exname, 1,
        excache);
      let st2 = filemaker.generate(pattern.replace(/#count#/g,
        countpattern), null,
        exname, 1, excache);

      document.getElementById('filenamepattern_examplecleansubject').value =
        cleansubject;
      document.getElementById('filenamepattern_exampledategenerated')
        .value =
        excache.datetime;
      document.getElementById('filenamepattern_examplegenerated').value =
      st;
      document.getElementById('filenamepattern_examplegenerated2').value =
        st2;
    },

    add_to_pattern: function(button) {
      let fnpbox = document.getElementById('filenamepatternbox');
      let postindex = fnpbox.selectionStart + button.label.length;
      fnpbox.value = fnpbox.value.substring(0, fnpbox.selectionStart) +
        button
        .label + fnpbox.value.substring(fnpbox.selectionEnd);
      fnpbox.setSelectionRange(postindex, postindex);
    },

    /************** suggestfolder functions *********************/
    browseForSuggestfolder(prefname,i) {
      let nsIFilePicker = Ci.nsIFilePicker;
      let fp = Cc["@mozilla.org/filepicker;1"]
      .createInstance(nsIFilePicker);
      let windowTitle =
        this.aeStringBundle.GetStringFromName(
          "FolderPickerDialogTitle");
      try {
        fp.init(window, windowTitle, Ci.nsIFilePicker.modeGetFolder);
        fp.open(r => {
          if (r !== Ci.nsIFilePicker.returnOK || !fp.file) {
            return;
          }
          wdw_aecOptions.setComplexPref(prefname, fp.file.path);
          this.appendSuggestFolderItem(fp.file.path, i);
        });
      } catch (e) {
        aedump(e, 0);
      }
    },

    appendSuggestFolderItem: function (aFolderName, aKey) {
      let item = this.mSuggestFolderListBox.appendItem(aFolderName, aKey);

      // focus on the new appended item
      this.mSuggestFolderListBox.ensureIndexIsVisible(item);
      this.mSuggestFolderListBox.selectItem(item);
      this.mSuggestFolderListBox.focus();

      this.setSuggestButtonStatus();

      return item;
    },
  
    buildSuggestFolderList: function () {
      let i = 0;
      let moreloops = true;
      do {
        i += 1;
        try {
          pref = AECprefs.getStringPref('extensions.attachextract_cont.suggestfolder.parent.' + i);
          this.appendSuggestFolderItem(pref, i);
        } catch {
          moreloops = false; 
        }
      } while (moreloops && i < this.limitSuggestFolders);
    },
  
    removeSuggestFolder: function () {
      var index = this.mSuggestFolderListBox.selectedIndex;

      if (index >= 0) {
        var itemToRemove = this.mSuggestFolderListBox.getItemAtIndex(index);
        var itemToRemoveKey = index+1;

        // move all following prefs to close the resulting gap
        var i = itemToRemoveKey;
        var n = i + 1;
        var moreloops = true;
        do {
          var cpref = " ";
          var npref = " ";
          cpref = AECprefs.getStringPref('extensions.attachextract_cont.suggestfolder.parent.' + i);
          // aedump('AEC ' + i + ': ' + cpref + '\n');
          try {
            npref = AECprefs.getStringPref('extensions.attachextract_cont.suggestfolder.parent.' + n);
            // aedump('AEC ' + n + ': ' + npref + '\n');
            if (npref) {
              AECprefs.setStringPref('extensions.attachextract_cont.suggestfolder.parent.' + i, npref);
              // aedump("AEC " + i + " neu: " + AECprefs.getStringPref('extensions.attachextract_cont.suggestfolder.parent.' + i) + '\n');
            }
          } catch {
            moreloops = false;
            // aedump('AEC no more npref' + '\n');
            AECprefs.clearUserPref('extensions.attachextract_cont.suggestfolder.parent.' + i);
            // aedump('AEC clear last cpref without a following npref' + '\n');
          }
          i += 1;
          n += 1;
        } while (moreloops && i < this.limitSuggestFolders);

        itemToRemove.remove();
        var numItemsInListBox = this.mSuggestFolderListBox.getRowCount();
        this.mSuggestFolderListBox.selectedIndex = index < numItemsInListBox ? index : numItemsInListBox - 1;

        this.setSuggestButtonStatus();
      }
    },

    addSuggestFolder: function () {
      /************************************************
       * This would loop through prefs to count existing 
       * suggest folders. As an advantage, in case of a 
       * (theoretically nonexistent) gap in the 
       * suggest folders prefs numbers, the gap would 
       * be filled.
      let i = 0;
      let moreloops = true;
      do {
        i += 1;
        try {
          pref = AECprefs.getStringPref('extensions.attachextract_cont.suggestfolder.parent.' + i);
        } catch {
          moreloops = false; 
        }
      } while (moreloops && i < this.limitSuggestFolders);
      *************************************************/
      /************************************************
       * Using the simple richlistbox.count function to
       * get the existing suggest folders number.
       * **********************************************/
      i = this.mSuggestFolderListBox.itemCount;
      n = i + 1;

      if (i < this.limitSuggestFolders) {
        this.browseForSuggestfolder('extensions.attachextract_cont.suggestfolder.parent.' + n);
      } else {
        //aedump("AEC: There are a maximum of " + this.limitSuggestFolders + " suggest folders allowed by an internal setting in var limitSuggestFolders." + "\n");
      }
    },
  
    setSuggestButtonStatus: function () {
      let btnRemove = document.getElementById("removeSuggestfolderButton");
      let btnAdd = document.getElementById("addSuggestfolderButton");
  
      if (this.mSuggestFolderListBox.selectedCount > 0)
        btnRemove.removeAttribute("disabled");
      else
        btnRemove.setAttribute("disabled", "true");

      if (this.mSuggestFolderListBox.itemCount < this.limitSuggestFolders) {
        btnAdd.removeAttribute("disabled");
      }
      else {
        btnAdd.setAttribute("disabled", "true");
      }
    },

    /************** favoritefolder functions *********************/
    browseForFavoritefolder(prefname,i) {
      let nsIFilePicker = Ci.nsIFilePicker;
      let fp = Cc["@mozilla.org/filepicker;1"]
      .createInstance(nsIFilePicker);
      let windowTitle =
        this.aeStringBundle.GetStringFromName(
          "FolderPickerDialogTitle");
      try {
        fp.init(window, windowTitle, Ci.nsIFilePicker.modeGetFolder);
        fp.open(r => {
          if (r !== Ci.nsIFilePicker.returnOK || !fp.file) {
            return;
          }
          wdw_aecOptions.setComplexPref(prefname, fp.file.path);
          this.appendFavoriteFolderItem(fp.file.path, i);
        });
      } catch (e) {
        aedump(e, 0);
      }
    },

    appendFavoriteFolderItem: function (aFolderName, aKey) {
      let item = this.mFavoriteFolderListBox.appendItem(aFolderName, aKey);

      // focus on the new appended item
      this.mFavoriteFolderListBox.ensureIndexIsVisible(item);
      this.mFavoriteFolderListBox.selectItem(item);
      this.mFavoriteFolderListBox.focus();

      this.setFavoriteButtonStatus();

      return item;
    },
  
    buildFavoriteFolderList: function () {
      let i = 0;
      let moreloops = true;
      do {
        i += 1;
        try {
          pref = AECprefs.getStringPref('extensions.attachextract_cont.favoritefolder.' + i);
          this.appendFavoriteFolderItem(pref, i);
        } catch {
          moreloops = false; 
        }
      } while (moreloops && i < this.limitFavoriteFolders);
    },
  
    removeFavoriteFolder: function () {
      var index = this.mFavoriteFolderListBox.selectedIndex;

      if (index >= 0) {
        var itemToRemove = this.mFavoriteFolderListBox.getItemAtIndex(index);
        var itemToRemoveKey = index+1;

        // move all following prefs to close the resulting gap
        var i = itemToRemoveKey;
        var n = i + 1;
        var moreloops = true;
        do {
          var cpref = " ";
          var npref = " ";
          cpref = AECprefs.getStringPref('extensions.attachextract_cont.favoritefolder.' + i);
          // aedump('AEC ' + i + ': ' + cpref + '\n');
          try {
            npref = AECprefs.getStringPref('extensions.attachextract_cont.favoritefolder.' + n);
            // aedump('AEC ' + n + ': ' + npref + '\n');
            if (npref) {
              AECprefs.setStringPref('extensions.attachextract_cont.favoritefolder.' + i, npref);
              // aedump("AEC " + i + " neu: " + AECprefs.getStringPref('extensions.attachextract_cont.favoritefolder.' + i) + '\n');
            }
          } catch {
            moreloops = false;
            // aedump('AEC no more npref' + '\n');
            AECprefs.clearUserPref('extensions.attachextract_cont.favoritefolder.' + i);
            // aedump('AEC clear last cpref without a following npref' + '\n');
          }
          i += 1;
          n += 1;
        } while (moreloops && i < this.limitFavoriteFolders);

        itemToRemove.remove();
        var numItemsInListBox = this.mFavoriteFolderListBox.getRowCount();
        this.mFavoriteFolderListBox.selectedIndex = index < numItemsInListBox ? index : numItemsInListBox - 1;

        this.setFavoriteButtonStatus();
      }
    },

    addFavoriteFolder: function () {
      /************************************************
       * This would loop through prefs to count existing 
       * favorite folders. As an advantage, in case of a 
       * (theoretically nonexistent) gap in the 
       * favorite folders prefs numbers, the gap would 
       * be filled.
      let i = 0;
      let moreloops = true;
      do {
        i += 1;
        try {
          pref = AECprefs.getStringPref('extensions.attachextract_cont.favoritefolder.' + i);
        } catch {
          moreloops = false; 
        }
      } while (moreloops && i < this.limitFavoriteFolders);
      *************************************************/
      /************************************************
       * Using the simple richlistbox.count function to
       * get the existing favorite folders number.
       * **********************************************/
      i = this.mFavoriteFolderListBox.itemCount;
      n = i + 1;

      if (i < this.limitFavoriteFolders) {
        this.browseForFavoritefolder('extensions.attachextract_cont.favoritefolder.' + n);
      } else {
        // aedump("AEC: There are a maximum of " + this.limitFavoriteFolders + " favorite folders allowed by an internal setting in var limitFavoriteFolders.");
      }
    },
  
    setFavoriteButtonStatus: function () {
      let btnRemove = document.getElementById("removeFavoritefolderButton");
      let btnAdd = document.getElementById("addFavoritefolderButton");
  
      if (this.mFavoriteFolderListBox.selectedCount > 0)
        btnRemove.removeAttribute("disabled");
      else
        btnRemove.setAttribute("disabled", "true");

      if (this.mFavoriteFolderListBox.itemCount < this.limitFavoriteFolders) {
        btnAdd.removeAttribute("disabled");
      }
      else {
        btnAdd.setAttribute("disabled", "true");
      }
    },

  };
}
