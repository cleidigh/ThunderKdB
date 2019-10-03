var AutoCopyAppSm = {

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
      AutoCopyAppSm.cachePrefs();
      AutoCopyAppSm.initAutoCopyStatus();
    }
  },

  acExtLoad: function (force_re_load){
    try{
      if(!AutoCopyAppSm.acExtInit){
        AutoCopyAppSm.docOnload();
        AutoCopyAppSm.acExtInit = true;
      }
      else{
        var last_view = window.content.location.host;
        if(last_view != AutoCopyAppSm.acExtLastView || force_re_load == true){
          AutoCopyAppSm.acExtLastView = last_view;
          AutoCopyAppSm.docOnload();
        }
      }
    }catch(err){}
  },

  addtoblacklist: function () {
    if(AutoCopyAppSm.autocopyPrefs.getCharPref("blacklist")==""){
      var url=window.content.location.host.replace("www.","")
      AutoCopyAppSm.autocopyPrefs.setCharPref("blacklist",url)
    }
    else{
      var str=AutoCopyAppSm.autocopyPrefs.getCharPref("blacklist");
      var blacklistarr=str.split(",")
      for(var i=0;i<blacklistarr.length;i++){
        var url=window.content.location.host.replace("www.","");
        if(url==blacklistarr[i]){return;}
      }
      AutoCopyAppSm.autocopyPrefs.setCharPref("blacklist",AutoCopyAppSm.autocopyPrefs.getCharPref("blacklist")+","+url)
      var image = document.getElementById("autocopy-status-image");
      var tooltip = document.getElementById("autocopy-tooltip-value");
      var strings = document.getElementById("autocopyStrings");
      image.setAttribute("src", "chrome://autocopy/skin/disabled.png");
      tooltip.setAttribute("value", strings.getString("statusbar-tooltip-disabled"));
    }
  },

  onLoad: function() {
    window.removeEventListener("load", AutoCopyAppSm.onLoad, false);
    if (navigator.userAgent.search(/SeaMonkey/gi || /Firefox/gi) >= 0) {
    Components.utils.import("resource://gre/modules/AddonManager.jsm");
    AddonManager.getAddonByID("autocopy2@teo.pl", function(addon) {
      Components.utils.import("resource://gre/modules/Services.jsm");
      var prevVersion = AutoCopyAppSm.autocopyPrefs.getCharPref("lastVersion");
      if (Services.vc.compare(prevVersion, addon.version) < 0) {
        var acurl = "chrome://autocopy/content/update.xhtml";
        gBrowser.loadOneTab(acurl, { relatedToCurrent: false, inBackground: false });
        AutoCopyAppSm.autocopyPrefs.setCharPref("lastVersion", addon.version);
      }
    });
    }
  },

  isInput: function(target) {
    return target.toString().match(/InputElement|TextAreaElement/i)
  },

  toggle: function(option) {
    var opt = document.getElementById("autocopy-statusbar-" + option);
    if (!opt) return;
    var val = !AutoCopyAppSm.autocopyPrefs.getBoolPref("opt" + option);
    AutoCopyAppSm.autocopyPrefs.setBoolPref("opt" + option, val);
    opt.setAttribute("checked", val);
  },

  ClipboardContents: function(type, data, len) {
    this.dataType = type;
    this.data = data;
    this.dataLength = len;
  },

  ContextHide: function() {
    var ctxmenu = AutoCopyAppSm.autocopyPrefs.getBoolPref("optAddToBlacklistMenu")==false;
    var ctxmenu1 = AutoCopyAppSm.autocopyPrefs.getBoolPref("optContextMenuItem")==false;
    let ctxmenu2 = AutoCopyAppSm.autocopyPrefs.getIntPref("StatusBarState") == 0;
    let str=AutoCopyAppSm.autocopyPrefs.getCharPref("blacklist");

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
      var blacklistarr=str.split(",")
      for(var i=0;i<blacklistarr.length;i++){
        if(window.content.location.host.replace("www.","")==blacklistarr[i]) {
          document.getElementById("autocopy-context-menuitem").hidden = true;
          document.getElementById("autocopy-context-menu-addtoblacklist").hidden = true;
        }
      }
    }

    var contextmenuitem = document.getElementById("autocopy-context-menuitem").hidden;
    var contextmenu = document.getElementById("autocopy-context-menu-addtoblacklist").hidden;
    if(contextmenuitem && contextmenu) {
      document.getElementById("autocopy-context-menuitem-separator").hidden = true;    
    } else {
       document.getElementById("autocopy-context-menuitem-separator").hidden = false;
    }
  },

  setAutoCopyStatus: function() {
    if (!AutoCopyAppSm.autocopyPrefs.getBoolPref("optStatusBar")) {
      return;
    }
    var status = document.getElementById("autocopy-status");
    var image = document.getElementById("autocopy-status-image");
    var tooltip = document.getElementById("autocopy-tooltip-value");
    if (!status || !image) {
      return;
    }
    image.setAttribute("src", "chrome://autocopy/skin/enabled.png");
    var strings = document.getElementById("autocopyStrings");
    tooltip.setAttribute("value", strings.getString("statusbar-tooltip-enabled"));
  },

  initAutoCopyStatus: function() {
    AutoCopyAppSm.cachePrefs();
    document.getElementById("cmd_selectAll").addEventListener("command", function() { goDoCommand("cmd_selectAll"); AutoCopyAppSm.SelectAll(); }, false);
    var strings = document.getElementById("autocopyStrings"); 
    // Make sure the status bar panel is in the right state
    var panel = document.getElementById("autocopy-statuspanel");
    var button = document.getElementById("autocopy-status");
    var image = document.getElementById("autocopy-status-image");
    var tooltip = document.getElementById("autocopy-tooltip-value");
    if (button && image) {
      if (AutoCopyAppSm.autocopyPrefs.getBoolPref("optStatusBar")) {
        if (panel.collapsed) {
          panel.collapsed = false;
        }
      } else if (!panel.collapsed) {
        panel.collapsed = true;
      }
      if ((AutoCopyAppSm.autocopyPrefs.getIntPref("StatusBarState") == 0) && AutoCopyAppSm.autocopyPrefs.getBoolPref("optStatusBar")) {
        ac2state = "disabled";
      } else {
        ac2state = "enabled";
      }
      button.setAttribute("status", ac2state);
      image.setAttribute("src", "chrome://autocopy/skin/" + ac2state + ".png");
      tooltip.setAttribute("value", strings.getString("statusbar-tooltip-" + ac2state));
    }

    var menuitem = document.getElementById("autocopy-edit-menuitem");
    var separator = document.getElementById("autocopy-edit-menuitem-separator");
    if (menuitem) {
      if (AutoCopyAppSm.autocopyPrefs.getIntPref("StatusBarState") == 0) {
        menuitem.setAttribute("checked", false);
      } else {
        menuitem.setAttribute("checked", true);
      }
      var hidden = !AutoCopyAppSm.autocopyPrefs.getBoolPref("optEditMenuItem");
      separator.setAttribute("hidden", hidden);
      menuitem.setAttribute("hidden", hidden);
    }
    var ctxmenuitem = document.getElementById("autocopy-context-menuitem");
    if (ctxmenuitem && document.getElementById("contentAreaContextMenu")) {
      document.getElementById("contentAreaContextMenu").addEventListener("popupshowing", AutoCopyAppSm.ContextHide, false);
    }

    window.addEventListener("keypress", this.onKeyPress, false);

    // Set status bar option states
    for each (var i in AutoCopyAppSm.modes) {
      var opt = document.getElementById("autocopy-statusbar-" + i);
      if (!opt) continue;
      opt.setAttribute("checked", AutoCopyAppSm.autocopyPrefs.getBoolPref("opt" + i));
    }
  },

  cachePrefs: function() {
    AutoCopyAppSm.prefCache = {
      "optKeyboardShortcutEnabled": AutoCopyAppSm.autocopyPrefs.getBoolPref("optKeyboardShortcutEnabled"),
      "optKeyboardShortcutKey": AutoCopyAppSm.autocopyPrefs.getCharPref("optKeyboardShortcutKey"),
      "optKeyboardShortcutKeyMeta": AutoCopyAppSm.autocopyPrefs.getBoolPref("optKeyboardShortcutKeyMeta"),
      "optKeyboardShortcutKeyCtrl": AutoCopyAppSm.autocopyPrefs.getBoolPref("optKeyboardShortcutKeyCtrl"),
      "optKeyboardShortcutKeyShift": AutoCopyAppSm.autocopyPrefs.getBoolPref("optKeyboardShortcutKeyShift"),
      "optKeyboardShortcutKeyAlt": AutoCopyAppSm.autocopyPrefs.getBoolPref("optKeyboardShortcutKeyAlt")
    };
  },

  switchautocopystatusstate: function() {
    var str=AutoCopyAppSm.autocopyPrefs.getCharPref("blacklist");
    var blacklistarr=str.split(",")
    for(var i=0;i<blacklistarr.length;i++){
      if(window.content.location.host.replace("www.","")==blacklistarr[i]) {return}
    }
    if (AutoCopyAppSm.autocopyPrefs.getIntPref("StatusBarState") == 0) {
      AutoCopyAppSm.autocopyPrefs.setIntPref("StatusBarState", 1);
      let image = document.getElementById("autocopy-status-image");
      let tooltip = document.getElementById("autocopy-tooltip-value"); 
      let strings = document.getElementById("autocopyStrings");
      image.setAttribute("src", "chrome://autocopy/skin/enabled.png");
      tooltip.setAttribute("value", strings.getString("statusbar-tooltip-enabled"));
    } else {
      AutoCopyAppSm.autocopyPrefs.setIntPref("StatusBarState", 0);
      let image = document.getElementById("autocopy-status-image");
      let tooltip = document.getElementById("autocopy-tooltip-value");
      let strings = document.getElementById("autocopyStrings");
      image.setAttribute("src", "chrome://autocopy/skin/disabled.png");
      tooltip.setAttribute("value", strings.getString("statusbar-tooltip-disabled"));
    }
    //AutoCopyAppSm.initAutoCopyStatus();
  },

  onKeyPress: function(event) {
    if (AutoCopyAppSm.prefCache["optKeyboardShortcutEnabled"]
      && event.ctrlKey == AutoCopyAppSm.prefCache["optKeyboardShortcutKeyCtrl"]
      && event.altKey == AutoCopyAppSm.prefCache["optKeyboardShortcutKeyAlt"]
      && event.metaKey == AutoCopyAppSm.prefCache["optKeyboardShortcutKeyMeta"]
      && event.shiftKey == AutoCopyAppSm.prefCache["optKeyboardShortcutKeyShift"]
      && event.key == AutoCopyAppSm.prefCache["optKeyboardShortcutKey"]) {
      AutoCopyAppSm.switchautocopystatusstate();
      event.preventDefault();
      event.stopPropagation();
    }
  },

  onKeyUpCheck: function(e) {
    if (e.keyCode == e.DOM_VK_A && e.ctrlKey) {
      AutoCopyAppSm.onMouseUp(e);
    }
  },

  docOnload: function() {
    try{
      var str=AutoCopyAppSm.autocopyPrefs.getCharPref("blacklist");
      var image = document.getElementById("autocopy-status-image");
      var tooltip = document.getElementById("autocopy-tooltip-value");
      var strings = document.getElementById("autocopyStrings");
      var blacklistarr=str.split(",")
      var tst=0
      for(var i=0;i<blacklistarr.length;i++){
        if(window.content.location.host.replace("www.","")==blacklistarr[i]) {tst=1}
      }
      if(tst==1) {
        image.setAttribute("src", "chrome://autocopy/skin/disabled.png");
        tooltip.setAttribute("value", strings.getString("statusbar-tooltip-disabled"));
        return;
      }
      else {
        if (AutoCopyAppSm.autocopyPrefs.getIntPref("StatusBarState") == 0) {
          image.setAttribute("src", "chrome://autocopy/skin/disabled.png");
          tooltip.setAttribute("value", strings.getString("statusbar-tooltip-disabled"));
        } 
        else {
          image.setAttribute("src", "chrome://autocopy/skin/enabled.png");
          tooltip.setAttribute("value", strings.getString("statusbar-tooltip-enabled"));
        }
      }
    }catch(err){}
  },

  onMouseUp: function(e) {
    var str=AutoCopyAppSm.autocopyPrefs.getCharPref("blacklist");
    var blacklistarr=str.split(",")
    var image = document.getElementById("autocopy-status-image");
    var tooltip = document.getElementById("autocopy-tooltip-value");
    var strings = document.getElementById("autocopyStrings");
    var tst=0
    for(var i=0;i<blacklistarr.length;i++){
      if(window.content.location.host.replace("www.","")==blacklistarr[i]) {tst=1}
    }
    if(tst==1) {
        image.setAttribute("src", "chrome://autocopy/skin/disabled.png");
        tooltip.setAttribute("value", strings.getString("statusbar-tooltip-disabled"));
      return;
    }
    else {
      if (AutoCopyAppSm.autocopyPrefs.getIntPref("StatusBarState") == 0) {
        image.setAttribute("src", "chrome://autocopy/skin/disabled.png");
        tooltip.setAttribute("value", strings.getString("statusbar-tooltip-disabled"));
      } 
      else {
        image.setAttribute("src", "chrome://autocopy/skin/enabled.png");
        tooltip.setAttribute("value", strings.getString("statusbar-tooltip-enabled"));
      }
    }
    if((e.target.id=="urlbar"||"row")&&AutoCopyAppSm.autocopyPrefs.getBoolPref("optEnableInTextBoxes")==false&&e.target=="[object XULElement]"){return;}
    if(e.target=="[object XULElement]"&&e.target.tagName!="textbox"){return;}
      if ((e.ctrlKey) && (!e.keyCode)) {
        return;
      }
    gautocopy_target=e.target
    if (AutoCopyAppSm.autocopyPrefs.getIntPref("StatusBarState") != 1) {
      return;
    }
    var targetclassname = e.target.toString();
    if (targetclassname.match(/SelectElement|OptionElement/i)) {
      return;
    }
    if ((e.target.tagName=="TEXTAREA"||e.target.tagName=="INPUT"||e.target.tagName=="TEXTBOX") && AutoCopyAppSm.autocopyPrefs.getBoolPref("optEnableInTextBoxes")==false) {
      return;
    }
    var selection = AutoCopyAppSm.getSelection();
    var selectionurl = window.content.location.href;
    if ((selection.length == 0) || (AutoCopyAppSm.gautocopy_lastSelection == selection)) {
      return;
    }
    AutoCopyAppSm.gautocopy_lastSelection = selection;
    AutoCopyAppSm.gautocopy_clipboardcontents.unshift(selection.toString()); //adds to the begining of array
    AutoCopyAppSm.gautocopy_clipboardcontentsurl.unshift(selectionurl.toString());
    if (AutoCopyAppSm.gautocopy_clipboardcontents.length > 10) {
      AutoCopyAppSm.gautocopy_clipboardcontents.pop();  //remove last one if length to long
      AutoCopyAppSm.gautocopy_clipboardcontentsurl.pop();  //remove last one if length to long
    }
    var editable = AutoCopyAppSm.isTargetEditable(e.target);
    try{
      if (!editable && AutoCopyAppSm.autocopyPrefs.getBoolPref("optCopyWithoutFormatting")) {
        CPTOver.copyplaintext(); // Doesn"t work in text boxes
      } else {
        goDoCommand("cmd_copy");
      }
    }
    catch(err){goDoCommand("cmd_copy")}
    if (AutoCopyAppSm.autocopyPrefs.getBoolPref("optStatusbarBlink")) {
      AutoCopyAppSm.BlinkStatusbarButton(3);
    }
    if (AutoCopyAppSm.autocopyPrefs.getBoolPref("optContextMenu")) {
      var x = e.screenX;
      var y = e.screenY;
      if (x == 0 && y == 0) {
        document.popupNode = document.documentElement;
        x = document.documentElement.boxObject.x;
        y = document.documentElement.boxObject.y + 100;
      } else {
        document.popupNode = null;
      }
      document.getElementById("autocopy-context-menu").showPopup(document.documentElement, x, y, "context");
      AutoCopyAppSm.timedhidemenu();
    }

    if (AutoCopyAppSm.autocopyPrefs.getBoolPref("optDeselectAfterCopy")) {
      AutoCopyAppSm.DeselectAfterCopy();
    }
  },

  SelectAll: function() {
    if (AutoCopyAppSm.autocopyPrefs.getIntPref("StatusBarState") != 1) {
      return;
    }
    var targetclassname = "";
    if (document.commandDispatcher.focusedElement) {
      targetclassname = document.commandDispatcher.focusedElement.toString();
    }
    if (targetclassname.match(/SelectElement|OptionElement/i)) {
      return;
    }
    if (!(AutoCopyAppSm.getSelection().length > 0)) {
      return;
    }
    if (!AutoCopyAppSm.isTargetEditableDispatcher(document.commandDispatcher)) {
      AutoCopyAppSm.gautocopy_lastSelection = AutoCopyAppSm.getSelection();
      AutoCopyAppSm.saveclipboard();
      try{
        if (AutoCopyAppSm.autocopyPrefs.getBoolPref("optCopyWithoutFormatting")) {
          CPTOver.copyplaintext();
        } else {
        goDoCommand("cmd_copy");
        }
      }
      catch(err){goDoCommand("cmd_copy")}
    } else if (AutoCopyAppSm.autocopyPrefs.getBoolPref("optEnableInTextBoxes")) {
      if (AutoCopyAppSm.gautocopy_lastSelection == AutoCopyAppSm.getSelection()) {
        return;
      }
      AutoCopyAppSm.gautocopy_lastSelection = AutoCopyAppSm.getSelection();
      AutoCopyAppSm.saveclipboard();
      goDoCommand("cmd_copy");
    }
    if (AutoCopyAppSm.autocopyPrefs.getBoolPref("optStatusbarBlink")) {
      AutoCopyAppSm.BlinkStatusbarButton(3);
    }
    if (AutoCopyAppSm.autocopyPrefs.getBoolPref("optContextMenu")) {
      document.popupNode = document.documentElement;
      document.getElementById("autocopy-context-menu").showPopup(document.documentElement, document.documentElement.boxObject.x, document.documentElement.boxObject.y + 100, "context");
      AutoCopyAppSm.timedhidemenu();
    }
    if (AutoCopyAppSm.autocopyPrefs.getBoolPref("optDeselectAfterCopy")) {
      AutoCopyAppSm.DeselectAfterCopy();
    }
  },

  Pasteonmiddleclick_mousedown: function(e) {
    if (AutoCopyAppSm.autocopyPrefs.getIntPref("StatusBarState") != 1) {
      return;
    }
    if (e.ctrlKey || !AutoCopyAppSm.autocopyPrefs.getBoolPref("optPasteOnMiddleClick")) {
      return;
    }
    if (e.button != 1) {
      return;
    }
    AutoCopyAppSm.gautocopy_doPaste = false;
    if (e.target.inputField && AutoCopyAppSm.isInput(e.target.inputField)) {
      AutoCopyAppSm.gautocopy_doPaste = true;
    }
    if (e.target.mTextbox && e.target.mTextbox.inputField && AutoCopyAppSm.isInput(e.target.mTextbox.inputField)) {
      AutoCopyAppSm.gautocopy_doPaste = true;
    }
    if (AutoCopyAppSm.isTargetEditable(e.target)) {
      AutoCopyAppSm.gautocopy_doPaste = true;
    }

    if (navigator.userAgent.search(/SeaMonkey/gi) >= 0) {
      if (AutoCopyAppSm.gautocopy_doPaste && getBrowser().mCurrentBrowser.autoscrollEnabled) {
        getBrowser().mCurrentBrowser.stopScroll();
      }
    }
  },

  Pasteonmiddleclick_mouseup: function(e) {
    if (AutoCopyAppSm.autocopyPrefs.getIntPref("StatusBarState") != 1) {
      return;
    }
    if (e.ctrlKey || !AutoCopyAppSm.autocopyPrefs.getBoolPref("optPasteOnMiddleClick")) {
      return;
    }
    if (e.button != 1) {
      return;
    }
    if (AutoCopyAppSm.gautocopy_doPaste) {
      goDoCommand("cmd_paste");
    }
  },

  isTargetEditable: function(target) {
    if (target) {
      if (AutoCopyAppSm.isInput(target)) {
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
    if (commandDispatcher.focusedElement && AutoCopyAppSm.isInput(commandDispatcher.focusedElement)) {
      return true;
    } else if (commandDispatcher.focusedWindow.document.designMode && commandDispatcher.focusedWindow.document.designMode.match(/on/i)) {
      return true;
    }
    return false;
  },

  DeselectAfterCopy: function() {
    if (AutoCopyAppSm.autocopyPrefs.getBoolPref("optStatusbarBlink")) {
      var focusedElement = document.commandDispatcher.focusedElement;
      if (focusedElement) {
        var SelectionLength = focusedElement.selectionEnd - focusedElement.selectionStart;
        AutoCopyAppSm.DeselectAfterCopy_CollapseSelection_TextBox()
        setTimeout(function() { AutoCopyAppSm.DeselectAfterCopy_ExtendSelection_TextBox(SelectionLength) }, 25);
        setTimeout(function() { AutoCopyAppSm.DeselectAfterCopy_CollapseSelection_TextBox() }, 50);
        setTimeout(function() { AutoCopyAppSm.DeselectAfterCopy_ExtendSelection_TextBox(SelectionLength) }, 75);
        setTimeout(function() { AutoCopyAppSm.DeselectAfterCopy_CollapseSelection_TextBox() }, 100);
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
        AutoCopyAppSm.DeselectAfterCopy_CollapseSelection()
        setTimeout(function() { AutoCopyAppSm.DeselectAfterCopy_ExtendSelection(SelectionfocusNode, SelectionfocusOffset) }, 25);
        setTimeout(function() { AutoCopyAppSm.DeselectAfterCopy_CollapseSelection() }, 50);
        setTimeout(function() { AutoCopyAppSm.DeselectAfterCopy_ExtendSelection(SelectionfocusNode, SelectionfocusOffset) }, 75);
        setTimeout(function() { AutoCopyAppSm.DeselectAfterCopy_CollapseSelection() }, 100);
      }
    } else {
      var focusedElement = document.commandDispatcher.focusedElement;
      if (focusedElement) {
        AutoCopyAppSm.DeselectAfterCopy_CollapseSelection_TextBox()
     } else {
        goDoCommand("cmd_selectNone");
      }
    }
  },

  DeselectAfterCopy_ExtendSelection_TextBox: function(SelectionLength) {
    var focusedElement = document.commandDispatcher.focusedElement;
    if (focusedElement) {
      focusedElement.selectionEnd = focusedElement.selectionStart + SelectionLength;
    }
  },

  DeselectAfterCopy_CollapseSelection_TextBox: function() {
    var focusedElement = document.commandDispatcher.focusedElement;
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
      var str=AutoCopyAppSm.autocopyPrefs.getCharPref("blacklist");
      var button = document.getElementById("autocopy-status");
      var blacklistarr=str.split(",")
      var tst=0
      for(var i=0;i<blacklistarr.length;i++){
        if(window.content.location.host.replace("www.","")==blacklistarr[i]) {tst=1}
      }
      setTimeout(function() { AutoCopyAppSm.BlinkStatusbarButton(numberofblinks) }, 5000, 0); //resets in 5 seconds just incase
      if ((AutoCopyAppSm.autocopyPrefs.getIntPref("StatusBarState") == 0) || (!AutoCopyAppSm.autocopyPrefs.getBoolPref("optStatusBar"))) {
        return;
      }
      var image = document.getElementById("autocopy-status-image");
      if (numberofblinks <= 0||tst==1) {
        image.setAttribute("src", "chrome://autocopy/skin/enabled.png");
        return;
      }
      if (image.getAttribute("src") == "chrome://autocopy/skin/enabled.png") {
        image.setAttribute("src", "chrome://autocopy/skin/blank.png");
      } else {
        image.setAttribute("src", "chrome://autocopy/skin/enabled.png");
      }
      numberofblinks = numberofblinks - 1;
      setTimeout(function() { AutoCopyAppSm.BlinkStatusbarButton(numberofblinks) }, 300);
    }catch(err){}
  },

  getSelection: function() {
    var SelectionText = "";
    var trywindow = false;
    var focusedElement = document.commandDispatcher.focusedElement;
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
      var focusedWindow = document.commandDispatcher.focusedWindow;
      try {
        var winWrapper = new XPCNativeWrapper(focusedWindow, "document", "getSelection()");
        var Selection = winWrapper.getSelection();
      } catch(e) {
        var Selection = focusedWindow.getSelection();
      }
      SelectionText = Selection.toString();
    }
    return SelectionText;
  },

  replaceoldclipboard: function(x,id) {
    if(gautocopy_target.value!=undefined){
      gautocopy_target.value=gautocopy_target.value.substring(0,gautocopy_target.selectionStart)+AutoCopyAppSm.gautocopy_clipboardcontents[x]+gautocopy_target.value.substring(gautocopy_target.selectionStart,gautocopy_target.value.length)
    }
    var clip1=AutoCopyAppSm.gautocopy_clipboardcontents[0]
    var clip2=AutoCopyAppSm.gautocopy_clipboardcontents[x]
    var clipurl1=AutoCopyAppSm.gautocopy_clipboardcontentsurl[0]
    var clipurl2=AutoCopyAppSm.gautocopy_clipboardcontentsurl[x]
    var clip1label=document.getElementById(id).childNodes[0].label
    var clip2label=document.getElementById(id).childNodes[x].label
    Components.classes["@mozilla.org/widget/clipboardhelper;1"].getService(Components.interfaces.nsIClipboardHelper).copyString(clip2)
    AutoCopyAppSm.gautocopy_clipboardcontents[0]=clip2
    AutoCopyAppSm.gautocopy_clipboardcontents[x]=clip1
    AutoCopyAppSm.gautocopy_clipboardcontentsurl[0]=clipurl2
    AutoCopyAppSm.gautocopy_clipboardcontentsurl[x]=clipurl1
    document.getElementById(id).childNodes[0].label=clip2label
    document.getElementById(id).childNodes[x].label=clip1label
  },

  undocopy: function() {
    if(AutoCopyAppSm.gautocopy_clipboardcontents.length>=0){
      AutoCopyAppSm.gautocopy_clipboardcontents.splice(0,1);
      Components.classes["@mozilla.org/widget/clipboardhelper;1"].getService(Components.interfaces.nsIClipboardHelper).copyString(AutoCopyAppSm.gautocopy_clipboardcontents[0])
    }
  },

  pastetolocationbar: function() {
    var str = AutoCopyAppSm.gautocopy_clipboardcontents[0];
    if (!str) {
      return;
    }
    var urlbar = document.getElementById("urlbar");
    urlbar.value = str;
    urlbar.focus();
  },

  pastetosearchbar: function() {
    var str = AutoCopyAppSm.gautocopy_clipboardcontents[0];
    if (!str) {
      return;
    }
    var searchbar = document.getElementById("searchbar");
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
    AutoCopyAppSm.gautocopy_clipboardcontents[0] = AutoCopyAppSm.gautocopy_clipboardcontents[0] + "\r\n\r\n" + AutoCopyAppSm.gautocopy_clipboardcontentsurl[0];
    Components.classes["@mozilla.org/widget/clipboardhelper;1"].getService(Components.interfaces.nsIClipboardHelper).copyString(AutoCopyAppSm.gautocopy_clipboardcontents[0])
  },

  timedhidemenu: function() {
    window.clearTimeout(AutoCopyAppSm.gautocopy_hidemenu_timer);
    var timerinterval = AutoCopyAppSm.autocopyPrefs.getIntPref("optContextMenuHideTimeout");
    if (timerinterval > 0) {
      AutoCopyAppSm.gautocopy_hidemenu_timer = setTimeout(function() { AutoCopyAppSm.hide_contextMenu(); }, timerinterval, 0);
    }
  },

  canceltimedhidemenu: function() {
    window.clearTimeout(AutoCopyAppSm.gautocopy_hidemenu_timer);
  },

  hide_contextMenu: function() {
    document.getElementById("autocopy-context-menupopup-clipboards").hidePopup();
    document.getElementById("autocopy-context-menu").hidePopup();
  },

  searchForItems: function(itemid) {
    var strings = document.getElementById("autocopyStrings");
    var lcSearchFor = strings.getString("autocopy-context-menu-searchfor");
    var quotationmark1 = strings.getString("autocopy-context-menu-quot1");
    var quotationmark2 = strings.getString("autocopy-context-menu-quot2");
    var item = document.getElementById(itemid);
    if (!item) {
      return;
    }
    var SelectionText = AutoCopyAppSm.getSelection();
    if (!(SelectionText.length > 0) && AutoCopyAppSm.gautocopy_lastSelection) {
      SelectionText = AutoCopyAppSm.gautocopy_lastSelection;
    }
    if (SelectionText) {
      item.setAttribute("label", lcSearchFor + " " + quotationmark1 + SelectionText.substring(0, 12) + "..." + quotationmark2);
    } else {
      item.setAttribute("label", lcSearchFor + " ");
    }
  },

  contextmenu_onpopupshowing: function(e) {
    AutoCopyAppSm.searchForItems("autocopy-context-menu-searchforselection");
  },

  context_onpopupshowing: function(e) {
    AutoCopyAppSm.searchForItems("autocopy-context-searchforselection");
  },

  Clipboards_Handle: function(id) {
    var clipsmenu = document.getElementById(id);
    while (clipsmenu.childNodes.length > 0 && AutoCopyAppSm.gautocopy_clipboardcontents.length>0) {
      clipsmenu.removeChild(clipsmenu.childNodes[0]);
    }
    if (AutoCopyAppSm.gautocopy_clipboardcontents.length == 0) {
      return false;
    }
    for (var x = 0; x < AutoCopyAppSm.gautocopy_clipboardcontents.length & x < 10; x++) {
        var ac2pastetext = AutoCopyAppSm.gautocopy_clipboardcontents[x];
        var item = document.createElement("menuitem");
        item.addEventListener("command", function(e) {AutoCopyAppSm.replaceoldclipboard(e.target.id,id); }, false);
        item.setAttribute("label", ac2pastetext.substring(0, 24));
        clipsmenu.appendChild(item);
    }
    for(var i=0;i<AutoCopyAppSm.gautocopy_clipboardcontents.length;i++){
      document.getElementById(id).childNodes[i].id=i
    }
  },

  context_menupopup_clipboards_onpopupshowing: function() {
    return AutoCopyAppSm.Clipboards_Handle("autocopy-context-menupopup-clipboards")
  },

  context_menupopup_clipboards2_onpopupshowing: function() {
    return AutoCopyAppSm.Clipboards_Handle("autocopy-context-menupopup-clipboards2")
  },

  searchforselection: function() {
    var SelectionText = AutoCopyAppSm.getSelection();
    if (!(SelectionText.length > 0) && AutoCopyAppSm.gautocopy_lastSelection) {
      SelectionText = AutoCopyAppSm.gautocopy_lastSelection;
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
    var SelectionText = AutoCopyAppSm.getSelection();
    if (!(SelectionText.length > 0) && AutoCopyAppSm.gautocopy_lastSelection) {
      SelectionText = AutoCopyAppSm.gautocopy_lastSelection;
    }
    if(SelectionText.slice(0,8)=="https://"||SelectionText.slice(0,7)=="http://"||SelectionText.slice(0,6)=="ftp://"||SelectionText.slice(0,7)=="file://"||SelectionText.slice(0,4)=="www."){
      try {
        window.gBrowser.addTab(SelectionText)
      }catch(err){}
    } else {
      var strings = document.getElementById("autocopyStrings");
      Components.classes["@mozilla.org/embedcomp/prompt-service;1"]
                .getService(Components.interfaces.nsIPromptService).alert(null,"AutoCopy 2",strings.getString("ac2nourl"));
    }
  }
};

if (!AutoCopyAppSm.autocopyPrefs.prefHasUserValue("StatusBarState")) {
  AutoCopyAppSm.autocopyPrefs.setIntPref("StatusBarState", 1);
}

AutoCopyAppSm.autocopyPrefs.addObserver("", AutoCopyAppSm, false);

var init = function ()
{
  AutoCopyAppSm.onLoad();
  AutoCopyAppSm.initAutoCopyStatus();
}

window.addEventListener("load", function(){ AutoCopyAppSm.acExtLoad(false);}, true);
window.addEventListener("focus", function(){ AutoCopyAppSm.acExtLoad(false);}, true);
window.addEventListener("DOMContentLoaded", function(){AutoCopyAppSm.acExtLoad(false);}, true);
window.addEventListener("load", function () {init();}, false);
window.addEventListener("unload", function() { AutoCopyAppSm.autocopyPrefs.removeObserver("", AutoCopyAppSm, false); }, false);
window.addEventListener("mouseup", AutoCopyAppSm.onMouseUp, false);
window.addEventListener("keyup", AutoCopyAppSm.onKeyUpCheck, false);
window.addEventListener("mousedown", AutoCopyAppSm.Pasteonmiddleclick_mousedown, false);
window.addEventListener("mouseup", AutoCopyAppSm.Pasteonmiddleclick_mouseup, false);
