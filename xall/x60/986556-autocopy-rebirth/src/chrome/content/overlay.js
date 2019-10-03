var AutoCopyApp = {

  gautocopy_lastSelection : null,
  gautocopy_hidemenu_timer : null,
  gautocopy_clipboardcontents : new Array(),
  gautocopy_clipboardcontentsurl : new Array(),
  gautocopy_doPaste : false,
  gautocopy_target : null,
  acExtInit : false,
  acExtLastView : null,
  modes : ["ContextMenu", "PasteOnMiddleClick", "DeselectAfterCopy", "EnableInTextBoxes", "StatusbarBlink"],
  autocopyPrefs : Services.prefs.getBranch("extensions.autocopy."),

  observe: function(subject, topic, data) {
    if (topic == "nsPref:changed") {
      AutoCopyApp.cachePrefs();
      AutoCopyApp.initAutoCopyStatus();
    }
  },

  acExtLoad: function (force_re_load){
    try{
      if(!AutoCopyApp.acExtInit){
        AutoCopyApp.docOnload();
        AutoCopyApp.acExtInit = true;
      }
      else{
        var last_view = window.content.location.host;
        if(last_view != AutoCopyApp.acExtLastView || force_re_load == true){
          AutoCopyApp.acExtLastView = last_view;
          AutoCopyApp.docOnload();
        }
      }
    }catch(e){}
  },

  addtoblacklist: function () {
    if(AutoCopyApp.autocopyPrefs.getCharPref("blacklist")==""){
      let url=window.content.location.host.replace("www.","")
      AutoCopyApp.autocopyPrefs.setCharPref("blacklist",url)
    }
    else{
      let str=AutoCopyApp.autocopyPrefs.getCharPref("blacklist");
      let blacklistarr=str.split(",")
      for(var i=0;i<blacklistarr.length;i++){
        var url=window.content.location.host.replace("www.","");
        if(url==blacklistarr[i]){return;}
      }
      AutoCopyApp.autocopyPrefs.setCharPref("blacklist",AutoCopyApp.autocopyPrefs.getCharPref("blacklist")+","+url)
      let toolbarButton = document.getElementById("autocopy-toolbar-button");
      let strings = document.getElementById("autocopyStrings");
      toolbarButton.image = "chrome://autocopy/skin/disabled.png";
      toolbarButton.setAttribute("tooltiptext", strings.getString("statusbar-tooltip-disabled"));
    }
  },

  onLoad: function() {
    window.removeEventListener("load", AutoCopyApp.onLoad, false);

    let firstRun = AutoCopyApp.autocopyPrefs.getBoolPref("firstrun");
    if (firstRun) {
      let toolbar = document.getElementById("nav-bar");
      if (!toolbar.currentSet.match("autocopy-toolbar-button")) {
          let newset = toolbar.currentSet.concat(",autocopy-toolbar-button");
          toolbar.currentSet = newset;
          toolbar.setAttribute("currentset", newset);
          document.persist(toolbar.id, "currentset");
      }
      AutoCopyApp.autocopyPrefs.setBoolPref("firstrun", false);
    }
    //Compare addon version
    Components.utils.import("resource://gre/modules/AddonManager.jsm");
    AddonManager.getAddonByID("autocopy2@teo.pl", function(addon) {
      Components.utils.import("resource://gre/modules/Services.jsm");
      let prevVersion = AutoCopyApp.autocopyPrefs.getCharPref("lastVersion");
      if (Services.vc.compare(prevVersion, addon.version) < 0) {
        let url = "chrome://autocopy/content/update.xhtml";
        gBrowser.loadOneTab(url, { relatedToCurrent: false, inBackground: false });
        AutoCopyApp.autocopyPrefs.setCharPref("lastVersion", addon.version);
      }
    });
  },

  isInput: function(target) {
    return target.toString().match(/InputElement|TextAreaElement/i)
  },

  toggle: function(option) {
    var opt = document.getElementById("autocopy-statusbar-" + option);
    if (!opt) return;
    var val = !AutoCopyApp.autocopyPrefs.getBoolPref("opt" + option);
    AutoCopyApp.autocopyPrefs.setBoolPref("opt" + option, val);
    opt.setAttribute("checked", val);
  },

  ClipboardContents: function(type, data, len) {
    this.dataType = type;
    this.data = data;
    this.dataLength = len;
  },

  ContextHide: function() {
    let ctxmenu = AutoCopyApp.autocopyPrefs.getBoolPref("optAddToBlacklistMenu") == false;
    let ctxmenu1 = AutoCopyApp.autocopyPrefs.getBoolPref("optContextMenuItem") == false;
    let ctxmenu2 = AutoCopyApp.autocopyPrefs.getIntPref("StatusBarState") == 0;
    let str = AutoCopyApp.autocopyPrefs.getCharPref("blacklist");

    if(ctxmenu) {
      document.getElementById("autocopy-context-menu-addtoblacklist").hidden = true;
   } else {
      document.getElementById("autocopy-context-menu-addtoblacklist").hidden = false;
    }

    if(ctxmenu1) {
      document.getElementById("autocopy-context-menuitem").hidden = true;
    } else {
       document.getElementById("autocopy-context-menuitem").hidden = false;
    }

    if(ctxmenu2) {
      document.getElementById("autocopy-context-menuitem").hidden = true;
      document.getElementById("autocopy-context-menu-addtoblacklist").hidden = true;
    }

    if(str) {
      let blacklistarr=str.split(",")
      for(var i=0;i<blacklistarr.length;i++){
        if(window.content.location.host.replace("www.","")==blacklistarr[i]) {
          document.getElementById("autocopy-context-menuitem").hidden = true;
          document.getElementById("autocopy-context-menu-addtoblacklist").hidden = true;
        }
      }
    }

    let contextmenuitem = document.getElementById("autocopy-context-menuitem").hidden;
    let contextmenu = document.getElementById("autocopy-context-menu-addtoblacklist").hidden;
    if(contextmenuitem && contextmenu) {
      document.getElementById("autocopy-context-menuitem-separator").hidden = true;    
    } else {
       document.getElementById("autocopy-context-menuitem-separator").hidden = false;
    }
  },

  initAutoCopyStatus: function() {
    AutoCopyApp.cachePrefs();
    document.getElementById("cmd_selectAll").addEventListener("command", function() { goDoCommand("cmd_selectAll"); AutoCopyApp.SelectAll(); }, false);
    let str = AutoCopyApp.autocopyPrefs.getCharPref("blacklist");
    let menuitem = document.getElementById("autocopy-edit-menuitem");
    let separator = document.getElementById("autocopy-edit-menuitem-separator");
    if (menuitem) {
      if (AutoCopyApp.autocopyPrefs.getIntPref("StatusBarState") == 0) {
        menuitem.setAttribute("checked", false);
      } else {
        menuitem.setAttribute("checked", true);
       }
      var hidden = !AutoCopyApp.autocopyPrefs.getBoolPref("optEditMenuItem");
      separator.setAttribute("hidden", hidden);
      menuitem.setAttribute("hidden", hidden);
    }
    if(str) {
      let blacklistarr=str.split(",")
      for(var i=0;i<blacklistarr.length;i++){
        if(window.content.location.host.replace("www.","")==blacklistarr[i]) {
          menuitem.hidden = true;
          separator.hidden = true;
        }
      }
    }
    let ctxmenuitem = document.getElementById("autocopy-context-menuitem");
    if (ctxmenuitem && document.getElementById("contentAreaContextMenu")) {
      document.getElementById("contentAreaContextMenu").addEventListener("popupshowing", AutoCopyApp.ContextHide, false);
    }

    window.addEventListener("keypress", this.onKeyPress, false);

    for each (var i in AutoCopyApp.modes) {
      var opt = document.getElementById("autocopy-statusbar-" + i);
      if (!opt) continue;
      opt.setAttribute("checked", AutoCopyApp.autocopyPrefs.getBoolPref("opt" + i));
    }
    if(document.getElementById("autocopy-toolbar-button")!=null) {
      if(AutoCopyApp.autocopyPrefs.getBoolPref("optToolBarButton")) {
        document.getElementById("autocopy-toolbar-button").hidden = false;
      } else {
        document.getElementById("autocopy-toolbar-button").hidden = true;
      }
    }
  },

  cachePrefs: function() {
    AutoCopyApp.prefCache = {
      "optKeyboardShortcutEnabled": AutoCopyApp.autocopyPrefs.getBoolPref("optKeyboardShortcutEnabled"),
      "optKeyboardShortcutKey": AutoCopyApp.autocopyPrefs.getCharPref("optKeyboardShortcutKey"),
      "optKeyboardShortcutKeyMeta": AutoCopyApp.autocopyPrefs.getBoolPref("optKeyboardShortcutKeyMeta"),
      "optKeyboardShortcutKeyCtrl": AutoCopyApp.autocopyPrefs.getBoolPref("optKeyboardShortcutKeyCtrl"),
      "optKeyboardShortcutKeyShift": AutoCopyApp.autocopyPrefs.getBoolPref("optKeyboardShortcutKeyShift"),
      "optKeyboardShortcutKeyAlt": AutoCopyApp.autocopyPrefs.getBoolPref("optKeyboardShortcutKeyAlt")
    };
  },

  switchautocopybuttonstatus: function() {
    let str=AutoCopyApp.autocopyPrefs.getCharPref("blacklist");
    let blacklistarr=str.split(",")
    for(var i=0;i<blacklistarr.length;i++){
      if(window.content.location.host.replace("www.","")==blacklistarr[i]) {return}
    }
    if (AutoCopyApp.autocopyPrefs.getIntPref("StatusBarState") == 0) {
      AutoCopyApp.autocopyPrefs.setIntPref("StatusBarState", 1);
      let toolbarButton = document.getElementById("autocopy-toolbar-button");
      toolbarButton.image = "chrome://autocopy/skin/enabled.png";
      let strings = document.getElementById("autocopyStrings");
      toolbarButton.setAttribute("tooltiptext", strings.getString("statusbar-tooltip-enabled"));
    } else {
      AutoCopyApp.autocopyPrefs.setIntPref("StatusBarState", 0);
      let toolbarButton = document.getElementById("autocopy-toolbar-button");
      toolbarButton.image = "chrome://autocopy/skin/disabled.png";
      let strings = document.getElementById("autocopyStrings");
      toolbarButton.setAttribute("tooltiptext", strings.getString("statusbar-tooltip-disabled"));
    }
  },

  onKeyPress: function(event) {
    if (AutoCopyApp.prefCache["optKeyboardShortcutEnabled"]
      && event.ctrlKey == AutoCopyApp.prefCache["optKeyboardShortcutKeyCtrl"]
      && event.altKey == AutoCopyApp.prefCache["optKeyboardShortcutKeyAlt"]
      && event.metaKey == AutoCopyApp.prefCache["optKeyboardShortcutKeyMeta"]
      && event.shiftKey == AutoCopyApp.prefCache["optKeyboardShortcutKeyShift"]
      && event.key == AutoCopyApp.prefCache["optKeyboardShortcutKey"]) {
      AutoCopyApp.switchautocopybuttonstatus();
      event.preventDefault();
      event.stopPropagation();
    }
  },

  onKeyUpCheck: function(e) {
    if (e.keyCode == e.DOM_VK_A && e.ctrlKey) {
      AutoCopyApp.onMouseUp(e);
    }
  },

  docOnload: function() {
    try{
      let str=AutoCopyApp.autocopyPrefs.getCharPref("blacklist");
      let toolbarButton = document.getElementById("autocopy-toolbar-button");
      let strings = document.getElementById("autocopyStrings");
      let blacklistarr=str.split(",")
      let tst=0
      for(var i=0;i<blacklistarr.length;i++){
        if(window.content.location.host.replace("www.","")==blacklistarr[i]) {tst=1}
      }
      if(tst==1) {
        toolbarButton.image = "chrome://autocopy/skin/disabled.png";
        toolbarButton.setAttribute("tooltiptext", strings.getString("statusbar-tooltip-disabled"));
        return;
      }
      else {
        if (AutoCopyApp.autocopyPrefs.getIntPref("StatusBarState") == 0) {
          toolbarButton.image = "chrome://autocopy/skin/disabled.png";
          toolbarButton.setAttribute("tooltiptext", strings.getString("statusbar-tooltip-disabled"));
        }
        else {
          toolbarButton.image = "chrome://autocopy/skin/enabled.png";
          toolbarButton.setAttribute("tooltiptext", strings.getString("statusbar-tooltip-enabled"));
        }
      }
    }catch(e){}
  },

  onMouseUp: function(e) {

    let str=AutoCopyApp.autocopyPrefs.getCharPref("blacklist");
    let blacklistarr=str.split(",")
    let toolbarButton = document.getElementById("autocopy-toolbar-button");
    let strings = document.getElementById("autocopyStrings");
    let tst=0
    for(var i=0;i<blacklistarr.length;i++){
      if(window.content.location.host.replace("www.","")==blacklistarr[i]) {tst=1}
    }
    if(tst==1) {
      toolbarButton.image = "chrome://autocopy/skin/disabled.png";
      toolbarButton.setAttribute("tooltiptext", strings.getString("statusbar-tooltip-disabled"));
      return;
    }
    else {
      if (AutoCopyApp.autocopyPrefs.getIntPref("StatusBarState") == 0) {
        toolbarButton.image = "chrome://autocopy/skin/disabled.png";
        toolbarButton.setAttribute("tooltiptext", strings.getString("statusbar-tooltip-disabled"));
      }
      else {
        toolbarButton.image = "chrome://autocopy/skin/enabled.png";
        toolbarButton.setAttribute("tooltiptext", strings.getString("statusbar-tooltip-enabled"));
      }
    }

    if((e.target.id=="urlbar"||"row")&&AutoCopyApp.autocopyPrefs.getBoolPref("optEnableInTextBoxes")==false&&e.target=="[object XULElement]"){return;}
    if(e.target=="[object XULElement]"&&e.target.tagName!="textbox"){return;}
      if ((e.ctrlKey) && (!e.keyCode)) {
        return;
      }
    gautocopy_target=e.target
    if (AutoCopyApp.autocopyPrefs.getIntPref("StatusBarState") != 1) {
      return;
    }
    let targetclassname = e.target.toString();
    if (targetclassname.match(/SelectElement|OptionElement/i)) {
      return;
    }
    if ((e.target.tagName=="TEXTAREA"||e.target.tagName=="INPUT"||e.target.tagName=="TEXTBOX") && AutoCopyApp.autocopyPrefs.getBoolPref("optEnableInTextBoxes")==false) {
      return;
    }
    let selection = AutoCopyApp.getSelection();
    let selectionurl = window.content.location.href;
    if ((selection.length == 0) || (AutoCopyApp.gautocopy_lastSelection == selection)) {
      return;
    }
    AutoCopyApp.gautocopy_lastSelection = selection;
    AutoCopyApp.gautocopy_clipboardcontents.unshift(selection.toString()); //adds to the begining of array
    AutoCopyApp.gautocopy_clipboardcontentsurl.unshift(selectionurl.toString());
    if (AutoCopyApp.gautocopy_clipboardcontents.length > 10) {
      AutoCopyApp.gautocopy_clipboardcontents.pop();  //remove last one if length to long
      AutoCopyApp.gautocopy_clipboardcontentsurl.pop();  //remove last one if length to long
    }
    let editable = AutoCopyApp.isTargetEditable(e.target);
    try{
      if (!editable && AutoCopyApp.autocopyPrefs.getBoolPref("optCopyWithoutFormatting")) {
        CPTOver.copyplaintext(); // Doesn't work in text boxes
      } else {
        goDoCommand("cmd_copy");
      }
    }
    catch(e){goDoCommand("cmd_copy")}
    if (AutoCopyApp.autocopyPrefs.getBoolPref("optStatusbarBlink")) {
      AutoCopyApp.BlinkStatusbarButton(3);
    }
    if (AutoCopyApp.autocopyPrefs.getBoolPref("optContextMenu")) {
      let x = e.screenX;
      let y = e.screenY;
      if (x == 0 && y == 0) {
        document.popupNode = document.documentElement;
        x = document.documentElement.boxObject.x;
        y = document.documentElement.boxObject.y + 100;
      } else {
        document.popupNode = null;
      }
    if(navigator.userAgent.search(/SeaMonkey/gi) >= 0){
      document.getElementById("autocopy-context-menu-pastesearchbar").hidden = true;
      document.getElementById("autocopy-context-menu-pastesearchbar1").hidden = true;
    }
      document.getElementById("autocopy-context-menu").showPopup(document.documentElement, x, y, "context");
      AutoCopyApp.timedhidemenu();
    }

    if (AutoCopyApp.autocopyPrefs.getBoolPref("optDeselectAfterCopy")) {
      AutoCopyApp.DeselectAfterCopy();
    }
  },

  SelectAll: function() {
    if (AutoCopyApp.autocopyPrefs.getIntPref("StatusBarState") != 1) {
      return;
    }
    let targetclassname = "";
    if (document.commandDispatcher.focusedElement) {
      targetclassname = document.commandDispatcher.focusedElement.toString();
    }
    if (targetclassname.match(/SelectElement|OptionElement/i)) {
      return;
    }
    if (!(AutoCopyApp.getSelection().length > 0)) {
      return;
    }
    if (!AutoCopyApp.isTargetEditableDispatcher(document.commandDispatcher)) {
      AutoCopyApp.gautocopy_lastSelection = AutoCopyApp.getSelection();
      AutoCopyApp.saveclipboard();
      try{
        if (AutoCopyApp.autocopyPrefs.getBoolPref("optCopyWithoutFormatting")) {
          CPTOver.copyplaintext();
        } else {
        goDoCommand("cmd_copy");
        }
      }
      catch(e){goDoCommand("cmd_copy")}
    } else if (AutoCopyApp.autocopyPrefs.getBoolPref("optEnableInTextBoxes")) {
      if (AutoCopyApp.gautocopy_lastSelection == AutoCopyApp.getSelection()) {
        return;
      }
      AutoCopyApp.gautocopy_lastSelection = AutoCopyApp.getSelection();
      AutoCopyApp.saveclipboard();
      goDoCommand("cmd_copy");
    }
    if (AutoCopyApp.autocopyPrefs.getBoolPref("optStatusbarBlink")) {
      AutoCopyApp.BlinkStatusbarButton(3);
    }
    if (AutoCopyApp.autocopyPrefs.getBoolPref("optContextMenu")) {
      document.popupNode = document.documentElement;
      document.getElementById("autocopy-context-menu").showPopup(document.documentElement, document.documentElement.boxObject.x, document.documentElement.boxObject.y + 100, "context");
      AutoCopyApp.timedhidemenu();
    }
    if (AutoCopyApp.autocopyPrefs.getBoolPref("optDeselectAfterCopy")) {
      AutoCopyApp.DeselectAfterCopy();
    }
  },

  Pasteonmiddleclick_mousedown: function(e) {
    if (AutoCopyApp.autocopyPrefs.getIntPref("StatusBarState") != 1) {
      return;
    }
    if (e.ctrlKey || !AutoCopyApp.autocopyPrefs.getBoolPref("optPasteOnMiddleClick")) {
      return;
    }
    if (e.button != 1) {
      return;
    }
    AutoCopyApp.gautocopy_doPaste = false;
    if (e.target.inputField && AutoCopyApp.isInput(e.target.inputField)) {
      AutoCopyApp.gautocopy_doPaste = true;
    }
    if (e.target.mTextbox && e.target.mTextbox.inputField && AutoCopyApp.isInput(e.target.mTextbox.inputField)) {
      AutoCopyApp.gautocopy_doPaste = true;
    }
    if (AutoCopyApp.isTargetEditable(e.target)) {
      AutoCopyApp.gautocopy_doPaste = true;
    }

    if (AutoCopyApp.gautocopy_doPaste && getBrowser().mCurrentBrowser.autoscrollEnabled) {
      getBrowser().mCurrentBrowser.stopScroll();
    }
  },

  Pasteonmiddleclick_mouseup: function(e) {
    if (AutoCopyApp.autocopyPrefs.getIntPref("StatusBarState") != 1) {
      return;
    }
    if (e.ctrlKey || !AutoCopyApp.autocopyPrefs.getBoolPref("optPasteOnMiddleClick")) {
      return;
    }
    if (e.button != 1) {
      return;
    }
    if (AutoCopyApp.gautocopy_doPaste) {
      goDoCommand("cmd_paste");
    }
  },

  isTargetEditable: function(target) {
    if (target) {
      if (AutoCopyApp.isInput(target)) {
        return true;
      }
      if (target.toString().match(/object XUL/i) && target.textbox && target.textbox.value) {
        return true;
      }
      if (target.textbox) {
        return true;
      }
      if (target.value != null) {
        return true;
      }
    }
    if (target.ownerDocument.designMode && target.ownerDocument.designMode.match(/on/i)) {
      return true;
    }
    return false;
  },

  isTargetEditableDispatcher: function(commandDispatcher) {
    if (commandDispatcher.focusedElement && AutoCopyApp.isInput(commandDispatcher.focusedElement)) {
      return true;
    } else if (commandDispatcher.focusedWindow.document.designMode && commandDispatcher.focusedWindow.document.designMode.match(/on/i)) {
      return true;
    }
    return false;
  },

  DeselectAfterCopy: function() {
    if (AutoCopyApp.autocopyPrefs.getBoolPref("optStatusbarBlink")) {
      let focusedElement = document.commandDispatcher.focusedElement;
      if (focusedElement) {
        let SelectionLength = focusedElement.selectionEnd - focusedElement.selectionStart;
        AutoCopyApp.DeselectAfterCopy_CollapseSelection_TextBox()
        setTimeout(function() { AutoCopyApp.DeselectAfterCopy_ExtendSelection_TextBox(SelectionLength) }, 25);
        setTimeout(function() { AutoCopyApp.DeselectAfterCopy_CollapseSelection_TextBox() }, 50);
        setTimeout(function() { AutoCopyApp.DeselectAfterCopy_ExtendSelection_TextBox(SelectionLength) }, 75);
        setTimeout(function() { AutoCopyApp.DeselectAfterCopy_CollapseSelection_TextBox() }, 100);
      } else {
        var focusedWindow = document.commandDispatcher.focusedWindow;
        try {
          var winWrapper = new XPCNativeWrapper(focusedWindow, "document", "getSelection()");
          var Selection = winWrapper.getSelection();
        } catch(e) {
          var Selection = focusedWindow.getSelection();
        }
        var SelectionfocusNode = Selection.focusNode;
        var SelectionfocusOffset = Selection.focusOffset;
        AutoCopyApp.DeselectAfterCopy_CollapseSelection()
        setTimeout(function() { AutoCopyApp.DeselectAfterCopy_ExtendSelection(SelectionfocusNode, SelectionfocusOffset) }, 25);
        setTimeout(function() { AutoCopyApp.DeselectAfterCopy_CollapseSelection() }, 50);
        setTimeout(function() { AutoCopyApp.DeselectAfterCopy_ExtendSelection(SelectionfocusNode, SelectionfocusOffset) }, 75);
        setTimeout(function() { AutoCopyApp.DeselectAfterCopy_CollapseSelection() }, 100);
      }
    } else {
      let focusedElement = document.commandDispatcher.focusedElement;
      if (focusedElement) {
        AutoCopyApp.DeselectAfterCopy_CollapseSelection_TextBox()
     } else {
        goDoCommand("cmd_selectNone");
      }
    }
  },

  DeselectAfterCopy_ExtendSelection_TextBox: function(SelectionLength) {
    let focusedElement = document.commandDispatcher.focusedElement;
    if (focusedElement) {
      focusedElement.selectionEnd = focusedElement.selectionStart + SelectionLength;
    }
  },

  DeselectAfterCopy_CollapseSelection_TextBox: function() {
    let focusedElement = document.commandDispatcher.focusedElement;
    if (focusedElement) {
      focusedElement.selectionEnd = focusedElement.selectionStart;
    }
  },

  DeselectAfterCopy_ExtendSelection: function(SelectionfocusNode, SelectionfocusOffset) {
    var focusedWindow = document.commandDispatcher.focusedWindow;
    try {
      var winWrapper = new XPCNativeWrapper(focusedWindow, "document", "getSelection()");
      var Selection = winWrapper.getSelection();
    } catch(e) {
      var Selection = focusedWindow.getSelection();
    }
    Selection.extend(SelectionfocusNode, SelectionfocusOffset);
  },

  DeselectAfterCopy_CollapseSelection: function() {
    var focusedWindow = document.commandDispatcher.focusedWindow;
    try {
      var winWrapper = new XPCNativeWrapper(focusedWindow, "document", "getSelection()");
      var Selection = winWrapper.getSelection();
    } catch(e) {
      var Selection = focusedWindow.getSelection();
    }
    var SelectionanchorNode = Selection.anchorNode;
    var SelectionanchorOffset = Selection.anchorOffset;
    Selection.collapse(SelectionanchorNode, SelectionanchorOffset);
  },

  BlinkStatusbarButton: function(numberofblinks) {
    try{
      let str=AutoCopyApp.autocopyPrefs.getCharPref("blacklist");
      let toolbarButton = document.getElementById("autocopy-toolbar-button");
      let blacklistarr=str.split(",")
      let tst=0
      for(var i=0;i<blacklistarr.length;i++){
        if(window.content.location.host.replace("www.","")==blacklistarr[i]) {tst=1}
      }
      setTimeout(function() { AutoCopyApp.BlinkStatusbarButton(numberofblinks) }, 5000, 0); //resets in 5 seconds just incase
      if ((AutoCopyApp.autocopyPrefs.getIntPref("StatusBarState") == 0) || (!AutoCopyApp.autocopyPrefs.getBoolPref("optStatusBar"))||tst==1) {
        return;
      }
      if (numberofblinks <= 0||tst==1) {
        toolbarButton.image = "chrome://autocopy/skin/enabled.png";
        return;
      }
      if (toolbarButton.image == "chrome://autocopy/skin/enabled.png") {
        toolbarButton.image = "chrome://autocopy/skin/blank.png";
      } else {
        toolbarButton.image = "chrome://autocopy/skin/enabled.png";
      }
      numberofblinks = numberofblinks - 1;
      setTimeout(function() { AutoCopyApp.BlinkStatusbarButton(numberofblinks) }, 300);
    }catch(e){}
  },

  getSelection: function() {
    let SelectionText = "";
    let trywindow = false;
    let focusedElement = document.commandDispatcher.focusedElement;
    if (focusedElement && null != focusedElement) {
      try {
        SelectionText = focusedElement.value.substring(focusedElement.selectionStart, focusedElement.selectionEnd);
      } catch(e) {
        trywindow = true;
       }
    } else {
      trywindow = true;
    }
    if (trywindow) {
    let focusedWindow = document.commandDispatcher.focusedWindow;
    try {
        var winWrapper = new XPCNativeWrapper(focusedWindow, "document", "getSelection()");
        var Selection = winWrapper.getSelection();
      }catch(e) {
        let Selection = focusedWindow.getSelection();
       }
      SelectionText = Selection.toString();
    }
    return SelectionText;
  },

  replaceoldclipboard: function(x,id) {
    if(gautocopy_target.value!=undefined){
      gautocopy_target.value=gautocopy_target.value.substring(0,gautocopy_target.selectionStart)+AutoCopyApp.gautocopy_clipboardcontents[x]+gautocopy_target.value.substring(gautocopy_target.selectionStart,gautocopy_target.value.length)
    }
    let clip1=AutoCopyApp.gautocopy_clipboardcontents[0]
    let clip2=AutoCopyApp.gautocopy_clipboardcontents[x]
    let clipurl1=AutoCopyApp.gautocopy_clipboardcontentsurl[0]
    let clipurl2=AutoCopyApp.gautocopy_clipboardcontentsurl[x]
    let clip1label=document.getElementById(id).childNodes[0].label
    let clip2label=document.getElementById(id).childNodes[x].label
    Components.classes["@mozilla.org/widget/clipboardhelper;1"].getService(Components.interfaces.nsIClipboardHelper).copyString(clip2)
    AutoCopyApp.gautocopy_clipboardcontents[0]=clip2
    AutoCopyApp.gautocopy_clipboardcontents[x]=clip1
    AutoCopyApp.gautocopy_clipboardcontentsurl[0]=clipurl2
    AutoCopyApp.gautocopy_clipboardcontentsurl[x]=clipurl1
    document.getElementById(id).childNodes[0].label=clip2label
    document.getElementById(id).childNodes[x].label=clip1label
  },

  undocopy: function() {
    if(AutoCopyApp.gautocopy_clipboardcontents.length>=0){
      AutoCopyApp.gautocopy_clipboardcontents.splice(0,1);
      Components.classes["@mozilla.org/widget/clipboardhelper;1"].getService(Components.interfaces.nsIClipboardHelper).copyString(AutoCopyApp.gautocopy_clipboardcontents[0])
    }
  },

  pastetolocationbar: function() {
    let str = AutoCopyApp.gautocopy_clipboardcontents[0];
    if (!str) {
      return;
    }
    let urlbar = document.getElementById("urlbar");
    urlbar.value = str;
    urlbar.focus();
  },

  pastetosearchbar: function() {
    let str = AutoCopyApp.gautocopy_clipboardcontents[0];
    if (!str) {
      return;
    }
    let searchbar = document.getElementById("searchbar");
    if (!searchbar) {
      return;
    }
    if (searchbar.textbox) {
      searchbar.textbox.focus();
      searchbar.textbox.value = str;
    }
    if (searchbar.mTextbox) {
      searchbar.mTextbox.value = str;
      searchbar.mTextbox.focus();
    }
  },

  appendurltoclipboard: function() {
    AutoCopyApp.gautocopy_clipboardcontents[0] = AutoCopyApp.gautocopy_clipboardcontents[0] + "\r\n\r\n" + AutoCopyApp.gautocopy_clipboardcontentsurl[0];
    Components.classes["@mozilla.org/widget/clipboardhelper;1"].getService(Components.interfaces.nsIClipboardHelper).copyString(AutoCopyApp.gautocopy_clipboardcontents[0])
  },

  timedhidemenu: function() {
    window.clearTimeout(AutoCopyApp.gautocopy_hidemenu_timer);
    let timerinterval = AutoCopyApp.autocopyPrefs.getIntPref("optContextMenuHideTimeout");
    if (timerinterval > 0) {
      AutoCopyApp.gautocopy_hidemenu_timer = setTimeout(function() { AutoCopyApp.hide_contextMenu(); }, timerinterval, 0);
    }
  },

  canceltimedhidemenu: function() {
    window.clearTimeout(AutoCopyApp.gautocopy_hidemenu_timer);
  },

  hide_contextMenu: function() {
    document.getElementById("autocopy-context-menupopup-clipboards").hidePopup();
    document.getElementById("autocopy-context-menu").hidePopup();
  },

  searchForItems: function(itemid) {
    let strings = document.getElementById("autocopyStrings");
    let lcSearchFor = strings.getString("autocopy-context-menu-searchfor");
    let quotationmark1 = strings.getString("autocopy-context-menu-quot1");
    let quotationmark2 = strings.getString("autocopy-context-menu-quot2");
    let item = document.getElementById(itemid);
    if (!item) {
      return;
    }
    let SelectionText = AutoCopyApp.getSelection();
    if (!(SelectionText.length > 0) && AutoCopyApp.gautocopy_lastSelection) {
      SelectionText = AutoCopyApp.gautocopy_lastSelection;
    }
    if (SelectionText) {
      item.setAttribute("label", lcSearchFor + " " + quotationmark1 + SelectionText.substring(0, 12) + "..." + quotationmark2);
    } else {
      item.setAttribute("label", lcSearchFor + " ");
    }
  },

  contextmenu_onpopupshowing: function(e) {
    AutoCopyApp.searchForItems("autocopy-context-menu-searchforselection");
  },

  context_onpopupshowing: function(e) {
    AutoCopyApp.searchForItems("autocopy-context-searchforselection");
  },

  Clipboards_Handle: function(id) {
    let clipsmenu = document.getElementById(id);
    while (clipsmenu.childNodes.length > 0 && AutoCopyApp.gautocopy_clipboardcontents.length>0) {
      clipsmenu.removeChild(clipsmenu.childNodes[0]);
    }
    if (AutoCopyApp.gautocopy_clipboardcontents.length == 0) {
      return false;
    }
    for (var x = 0; x < AutoCopyApp.gautocopy_clipboardcontents.length & x < 10; x++) {
        let ac2pastetext = AutoCopyApp.gautocopy_clipboardcontents[x];
        let item = document.createElement("menuitem");
        item.addEventListener("command", function(e) {AutoCopyApp.replaceoldclipboard(e.target.id,id); }, false);
        item.setAttribute("label", ac2pastetext.substring(0, 24));
        clipsmenu.appendChild(item);
    }
    for(var i=0;i<AutoCopyApp.gautocopy_clipboardcontents.length;i++){
      document.getElementById(id).childNodes[i].id=i
    }
  },

  context_menupopup_clipboards_onpopupshowing: function() {
    return AutoCopyApp.Clipboards_Handle("autocopy-context-menupopup-clipboards")
  },

  context_menupopup_clipboards2_onpopupshowing: function() {
    return AutoCopyApp.Clipboards_Handle("autocopy-context-menupopup-clipboards2")
  },

  searchforselection: function() {
    var SelectionText = AutoCopyApp.getSelection();
    if (!(SelectionText.length > 0) && AutoCopyApp.gautocopy_lastSelection) {
      SelectionText = AutoCopyApp.gautocopy_lastSelection;
    }
    if (BrowserSearch) {
      BrowserSearch.loadSearch(SelectionText, true)
    } else {
      OpenSearch("internet", SelectionText, true);
    }
  },

  showOptions: function() {
    var features = "chrome,titlebar,toolbar,centerscreen,resizable,";
    window.openDialog("chrome://autocopy/content/options.xul", "AutoCopy options", features);
  },

  openinnewtab: function() {
    let SelectionText = AutoCopyApp.getSelection();
    if (!(SelectionText.length > 0) && AutoCopyApp.gautocopy_lastSelection) {
      SelectionText = AutoCopyApp.gautocopy_lastSelection;
    }
    if(SelectionText.slice(0,8)=="https://"||SelectionText.slice(0,7)=="http://"||SelectionText.slice(0,6)=="ftp://"||SelectionText.slice(0,7)=="file://"||SelectionText.slice(0,4)=="www."){
      try {
        window.gBrowser.addTab(SelectionText)
      }catch(e){}
    } else {
      let strings = document.getElementById("autocopyStrings");
      Components.classes["@mozilla.org/embedcomp/prompt-service;1"]
                .getService(Components.interfaces.nsIPromptService).alert(null,"AutoCopy 2",strings.getString("ac2nourl"));
    }
  }
};

if (!AutoCopyApp.autocopyPrefs.prefHasUserValue("StatusBarState")) {
  AutoCopyApp.autocopyPrefs.setIntPref("StatusBarState", 1);
}
AutoCopyApp.autocopyPrefs.addObserver("", AutoCopyApp, false);

var init = function ()
{
  AutoCopyApp.onLoad();
  AutoCopyApp.initAutoCopyStatus();
}

window.addEventListener("load", function(){ AutoCopyApp.acExtLoad(false);}, true);
window.addEventListener("focus", function(){ AutoCopyApp.acExtLoad(false);}, true);
window.addEventListener("DOMContentLoaded", function(){AutoCopyApp.acExtLoad(false);}, true);
window.addEventListener("load", function () {init();}, false);
window.addEventListener("unload", function() { AutoCopyApp.autocopyPrefs.removeObserver("", AutoCopyApp, false); }, false);
window.addEventListener("mouseup", AutoCopyApp.onMouseUp, false);
window.addEventListener("keyup", AutoCopyApp.onKeyUpCheck, false);
window.addEventListener("mousedown", AutoCopyApp.Pasteonmiddleclick_mousedown, false);
window.addEventListener("mouseup", AutoCopyApp.Pasteonmiddleclick_mouseup, false);
