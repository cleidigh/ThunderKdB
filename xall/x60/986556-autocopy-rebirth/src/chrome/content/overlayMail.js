var AutoCopyAppMail = {

  gautocopy_lastSelection : null,
  gautocopy_hidemenu_timer : null,
  gautocopy_clipboardcontents : new Array(),
  gautocopy_clipboardcontentsurl : new Array(),
  gautocopy_doPaste : false,
  gautocopy_target : null,
  modes : ["ContextMenu", "PasteOnMiddleClick", "DeselectAfterCopy", "EnableInTextBoxes", "StatusbarBlink"],
  autocopyPrefs : Services.prefs.getBranch("extensions.autocopy."),

  observe: function(subject, topic, data) {
    if (topic == "nsPref:changed") {
      AutoCopyAppMail.cachePrefs();
      AutoCopyAppMail.initAutoCopyStatus();
    }
  },

  onLoad: function() {
    window.removeEventListener("load", AutoCopyAppMail.onLoad, false);
    if (navigator.userAgent.search(/Thunderbird/gi) >= 0) {
    Components.utils.import("resource://gre/modules/AddonManager.jsm");
    AddonManager.getAddonByID("autocopy2@teo.pl", function(addon) {
      Components.utils.import("resource://gre/modules/Services.jsm");
      var prevVersion = AutoCopyAppMail.autocopyPrefs.getCharPref("lastVersion");
      if (Services.vc.compare(prevVersion, addon.version) < 0) {
        Components.classes["@mozilla.org/appshell/window-mediator;1"].getService(Components.interfaces.nsIWindowMediator)
                  .getMostRecentWindow("mail:3pane").document.getElementById("tabmail")
                  .openTab("contentTab", {contentPage: "chrome://autocopy/content/update.xhtml"});
        AutoCopyAppMail.autocopyPrefs.setCharPref("lastVersion", addon.version);
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
    var val = !AutoCopyAppMail.autocopyPrefs.getBoolPref("opt" + option);
    AutoCopyAppMail.autocopyPrefs.setBoolPref("opt" + option, val);
    opt.setAttribute("checked", val);
  },

  ClipboardContents: function(type, data, len) {
    this.dataType = type;
    this.data = data;
    this.dataLength = len;
  },

  ContextHide: function() {
    let ctxmenu1 = AutoCopyAppMail.autocopyPrefs.getBoolPref("optContextMenuItem") == false;
    let ctxmenu2 = AutoCopyAppMail.autocopyPrefs.getIntPref("StatusBarState") == 0;

    if(ctxmenu1) {
      document.getElementById("autocopy-context-menuitem").hidden = true;
    } else {
       document.getElementById("autocopy-context-menuitem").hidden = false;
    }

    if(!ctxmenu1) {
      document.getElementById("autocopy-context-menuitem").hidden = (gContextMenu.onImage);
      document.getElementById("autocopy-context-menuitem-separator").hidden = (gContextMenu.onImage);
    }

    if(ctxmenu2) {
      document.getElementById("autocopy-context-menuitem").hidden = true;
    }

    let contextmenuitem = document.getElementById("autocopy-context-menuitem").hidden;
    if(contextmenuitem) {
      document.getElementById("autocopy-context-menuitem-separator").hidden = true;    
    } else {
       document.getElementById("autocopy-context-menuitem-separator").hidden = false;
    }
  },

  setAutoCopyStatus: function() {
    if (!AutoCopyAppMail.autocopyPrefs.getBoolPref("optStatusBar")) {
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
    AutoCopyAppMail.cachePrefs();
    document.getElementById("cmd_selectAll").addEventListener("command", function() { goDoCommand("cmd_selectAll"); AutoCopyAppMail.SelectAll(); }, false);
    var strings = document.getElementById("autocopyStrings"); 
    // Make sure the status bar panel is in the right state
    var panel = document.getElementById("autocopy-statuspanel");
    var button = document.getElementById("autocopy-status");
    var image = document.getElementById("autocopy-status-image");
    var tooltip = document.getElementById("autocopy-tooltip-value");
    if (button && image) {
    
      if (AutoCopyAppMail.autocopyPrefs.getBoolPref("optStatusBar")) {
        if (panel.collapsed) {
          panel.collapsed = false;
        }
      } else if (!panel.collapsed) {
        panel.collapsed = true;
      }
    
      if ((AutoCopyAppMail.autocopyPrefs.getIntPref("StatusBarState") == 0) && AutoCopyAppMail.autocopyPrefs.getBoolPref("optStatusBar")) {
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

      if (AutoCopyAppMail.autocopyPrefs.getIntPref("StatusBarState") == 0) {
        menuitem.setAttribute("checked", false);
      } else {
        menuitem.setAttribute("checked", true);
      }

      var hidden = !AutoCopyAppMail.autocopyPrefs.getBoolPref("optEditMenuItem");
      separator.setAttribute("hidden", hidden);
      menuitem.setAttribute("hidden", hidden);

    }

    var ctxmenuitem = document.getElementById("autocopy-context-menuitem");
    if (ctxmenuitem && document.getElementById("contentAreaContextMenu")) {
      document.getElementById("contentAreaContextMenu").addEventListener("popupshowing", AutoCopyAppMail.ContextHide, false);
    }
    if (navigator.userAgent.search(/Thunderbird/gi) >= 0) {
      var ctxmenuitem = document.getElementById("autocopy-context-menuitem");
      if (ctxmenuitem && document.getElementById("mailContext")) {
        document.getElementById("mailContext").addEventListener("popupshowing", AutoCopyAppMail.ContextHide, false);
      }
    }
    window.addEventListener("keypress", this.onKeyPress, false);

    // Set status bar option states
    for (let i of AutoCopyAppMail.modes) {
      var opt = document.getElementById("autocopy-statusbar-" + i);
      if (!opt) continue;
      opt.setAttribute("checked", AutoCopyAppMail.autocopyPrefs.getBoolPref("opt" + i));
    }
  },

  cachePrefs: function() {
    AutoCopyAppMail.prefCache = {
      "optKeyboardShortcutEnabled": AutoCopyAppMail.autocopyPrefs.getBoolPref("optKeyboardShortcutEnabled"),
      "optKeyboardShortcutKey": AutoCopyAppMail.autocopyPrefs.getCharPref("optKeyboardShortcutKey"),
      "optKeyboardShortcutKeyMeta": AutoCopyAppMail.autocopyPrefs.getBoolPref("optKeyboardShortcutKeyMeta"),
      "optKeyboardShortcutKeyCtrl": AutoCopyAppMail.autocopyPrefs.getBoolPref("optKeyboardShortcutKeyCtrl"),
      "optKeyboardShortcutKeyShift": AutoCopyAppMail.autocopyPrefs.getBoolPref("optKeyboardShortcutKeyShift"),
      "optKeyboardShortcutKeyAlt": AutoCopyAppMail.autocopyPrefs.getBoolPref("optKeyboardShortcutKeyAlt")
    };
  },

  switchautocopystatusstate: function() {
    if (AutoCopyAppMail.autocopyPrefs.getIntPref("StatusBarState") == 0) {
      AutoCopyAppMail.autocopyPrefs.setIntPref("StatusBarState", 1);
    } else {
      AutoCopyAppMail.autocopyPrefs.setIntPref("StatusBarState", 0);
    }
    AutoCopyAppMail.initAutoCopyStatus();
  },

  onKeyPress: function(event) {
    if (AutoCopyAppMail.prefCache["optKeyboardShortcutEnabled"]
      && event.ctrlKey == AutoCopyAppMail.prefCache["optKeyboardShortcutKeyCtrl"]
      && event.altKey == AutoCopyAppMail.prefCache["optKeyboardShortcutKeyAlt"]
      && event.metaKey == AutoCopyAppMail.prefCache["optKeyboardShortcutKeyMeta"]
      && event.shiftKey == AutoCopyAppMail.prefCache["optKeyboardShortcutKeyShift"]
      && event.key == AutoCopyAppMail.prefCache["optKeyboardShortcutKey"]) {
      AutoCopyAppMail.switchautocopystatusstate();
      event.preventDefault();
      event.stopPropagation();
    }
  },

  onKeyUpCheck: function(e) {
    if (e.keyCode == e.DOM_VK_A && e.ctrlKey) {
      AutoCopyAppMail.onMouseUp(e);
    }
  },

  onMouseUp: function(e) {
    if((e.target.id=="urlbar"&&AutoCopyAppMail.autocopyPrefs.getBoolPref("optEnableInTextBoxes")==false)){
      return;
    }

    if(e.target=="[object XULElement]"&&e.target.tagName!="textbox"){
      return;
    }

      if ((e.ctrlKey) && (!e.keyCode)) {
        return;
      }

    gautocopy_target=e.target
    if (AutoCopyAppMail.autocopyPrefs.getIntPref("StatusBarState") != 1) {
      return;
    }

    var targetclassname = e.target.toString();
    if (targetclassname.match(/SelectElement|OptionElement/i)) {
      return;
    }

    if ((e.target.tagName=="TEXTAREA"||e.target.tagName=="INPUT"||e.target.tagName=="TEXTBOX") && AutoCopyAppMail.autocopyPrefs.getBoolPref("optEnableInTextBoxes")==false) {
      return;
    }

    var selection = AutoCopyAppMail.getSelection();
    var selectionurl = window.content.location.href;
    if ((selection.length == 0) || (AutoCopyAppMail.gautocopy_lastSelection == selection)) {
      return;
    }

    AutoCopyAppMail.gautocopy_lastSelection = selection;
    AutoCopyAppMail.gautocopy_clipboardcontents.unshift(selection.toString()); //adds to the begining of array
    AutoCopyAppMail.gautocopy_clipboardcontentsurl.unshift(selectionurl.toString());
    if (AutoCopyAppMail.gautocopy_clipboardcontents.length > 10) {
      AutoCopyAppMail.gautocopy_clipboardcontents.pop();  //remove last one if length to long
      AutoCopyAppMail.gautocopy_clipboardcontentsurl.pop();  //remove last one if length to long
    }

    var editable = AutoCopyAppMail.isTargetEditable(e.target);
    try{
      if (!editable && AutoCopyAppMail.autocopyPrefs.getBoolPref("optCopyWithoutFormatting")) {
        CPTOver.copyplaintext(); // Doesn"t work in text boxes
      } else {
        goDoCommand("cmd_copy");
      }
    }
    catch(err){goDoCommand("cmd_copy")}

    if (AutoCopyAppMail.autocopyPrefs.getBoolPref("optStatusbarBlink")) {
      AutoCopyAppMail.BlinkStatusbarButton(3);
    }

    if (AutoCopyAppMail.autocopyPrefs.getBoolPref("optContextMenu")) {

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
      AutoCopyAppMail.timedhidemenu();

    }

    if (AutoCopyAppMail.autocopyPrefs.getBoolPref("optDeselectAfterCopy")) {
      AutoCopyAppMail.DeselectAfterCopy();
    }

  },

  SelectAll: function() {
    if (AutoCopyAppMail.autocopyPrefs.getIntPref("StatusBarState") != 1) {
      return;
    }

    var targetclassname = "";
    if (document.commandDispatcher.focusedElement) {
      targetclassname = document.commandDispatcher.focusedElement.toString();
    }

    if (targetclassname.match(/SelectElement|OptionElement/i)) {
      return;
    }

    if (!(AutoCopyAppMail.getSelection().length > 0)) {
      return;
    }

    if (!AutoCopyAppMail.isTargetEditableDispatcher(document.commandDispatcher)) {
    
      AutoCopyAppMail.gautocopy_lastSelection = AutoCopyAppMail.getSelection();
      AutoCopyAppMail.saveclipboard();
      try{
      if (AutoCopyAppMail.autocopyPrefs.getBoolPref("optCopyWithoutFormatting")) {
        CPTOver.copyplaintext();
      } else {
      goDoCommand("cmd_copy");
      }
      }
      catch(err){goDoCommand("cmd_copy")}
    
    } else if (AutoCopyAppMail.autocopyPrefs.getBoolPref("optEnableInTextBoxes")) {

      if (AutoCopyAppMail.gautocopy_lastSelection == AutoCopyAppMail.getSelection()) {
        return;
      }

      AutoCopyAppMail.gautocopy_lastSelection = AutoCopyAppMail.getSelection();
      AutoCopyAppMail.saveclipboard();
      // Copy Plain Text doesn"t work in textboxes
      goDoCommand("cmd_copy");
    }

    if (AutoCopyAppMail.autocopyPrefs.getBoolPref("optStatusbarBlink")) {
      AutoCopyAppMail.BlinkStatusbarButton(3);
    }

    if (AutoCopyAppMail.autocopyPrefs.getBoolPref("optContextMenu")) {
      document.popupNode = document.documentElement;
      document.getElementById("autocopy-context-menu").showPopup(document.documentElement, document.documentElement.boxObject.x, document.documentElement.boxObject.y + 100, "context");
      AutoCopyAppMail.timedhidemenu();
    }

    if (AutoCopyAppMail.autocopyPrefs.getBoolPref("optDeselectAfterCopy")) {
      AutoCopyAppMail.DeselectAfterCopy();
    }

  },

  Pasteonmiddleclick_mousedown: function(e) {
    if (AutoCopyAppMail.autocopyPrefs.getIntPref("StatusBarState") != 1) {
      return;
    }

    if (e.ctrlKey || !AutoCopyAppMail.autocopyPrefs.getBoolPref("optPasteOnMiddleClick")) {
      return;
    }

    if (e.button != 1) {
      return;
    }

    AutoCopyAppMail.gautocopy_doPaste = false;

    if (e.target.inputField && AutoCopyAppMail.isInput(e.target.inputField)) {
      AutoCopyAppMail.gautocopy_doPaste = true;
    }

    if (e.target.mTextbox && e.target.mTextbox.inputField && AutoCopyAppMail.isInput(e.target.mTextbox.inputField)) {
      AutoCopyAppMail.gautocopy_doPaste = true;
    }

    if (AutoCopyAppMail.isTargetEditable(e.target)) {
      AutoCopyAppMail.gautocopy_doPaste = true;
    }

    if (navigator.userAgent.search(/SeaMonkey/gi) >= 0) {
      if (AutoCopyAppMail.gautocopy_doPaste && getBrowser().mCurrentBrowser.autoscrollEnabled) {
        getBrowser().mCurrentBrowser.stopScroll();
      }
    }
  },

  Pasteonmiddleclick_mouseup: function(e) {
    if (AutoCopyAppMail.autocopyPrefs.getIntPref("StatusBarState") != 1) {
      return;
    }

    if (e.ctrlKey || !AutoCopyAppMail.autocopyPrefs.getBoolPref("optPasteOnMiddleClick")) {
      return;
    }

    if (e.button != 1) {
      return;
    }

    if (AutoCopyAppMail.gautocopy_doPaste) {
      goDoCommand("cmd_paste");
    }

  },

  isTargetEditable: function(target) {
    if (target) {

      if (AutoCopyAppMail.isInput(target)) {
        return true;
      }

      if (target.toString().match(/object XUL/i) && target.textbox && target.textbox.value) {
        return true;
      }

      if (target.textbox) {
        return true;
      }

      if (target.value!=null) {
        return true;
      }
    }

    if (target.ownerDocument.designMode && target.ownerDocument.designMode.match(/on/i)) {
      return true;
    }

    return false;

  },

  isTargetEditableDispatcher: function(commandDispatcher) {
    if (commandDispatcher.focusedElement && AutoCopyAppMail.isInput(commandDispatcher.focusedElement)) {
      return true;
    } else if (commandDispatcher.focusedWindow.document.designMode && commandDispatcher.focusedWindow.document.designMode.match(/on/i)) {
      return true;
    }

    return false;

  },

  DeselectAfterCopy: function() {
    if (AutoCopyAppMail.autocopyPrefs.getBoolPref("optStatusbarBlink")) {

      var focusedElement = document.commandDispatcher.focusedElement;
      if (focusedElement) {

        var SelectionLength = focusedElement.selectionEnd - focusedElement.selectionStart;
        AutoCopyAppMail.DeselectAfterCopy_CollapseSelection_TextBox()
        setTimeout(function() { AutoCopyAppMail.DeselectAfterCopy_ExtendSelection_TextBox(SelectionLength) }, 25);
        setTimeout(function() { AutoCopyAppMail.DeselectAfterCopy_CollapseSelection_TextBox() }, 50);
        setTimeout(function() { AutoCopyAppMail.DeselectAfterCopy_ExtendSelection_TextBox(SelectionLength) }, 75);
        setTimeout(function() { AutoCopyAppMail.DeselectAfterCopy_CollapseSelection_TextBox() }, 100);

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
        AutoCopyAppMail.DeselectAfterCopy_CollapseSelection()
        setTimeout(function() { AutoCopyAppMail.DeselectAfterCopy_ExtendSelection(SelectionfocusNode, SelectionfocusOffset) }, 25);
        setTimeout(function() { AutoCopyAppMail.DeselectAfterCopy_CollapseSelection() }, 50);
        setTimeout(function() { AutoCopyAppMail.DeselectAfterCopy_ExtendSelection(SelectionfocusNode, SelectionfocusOffset) }, 75);
        setTimeout(function() { AutoCopyAppMail.DeselectAfterCopy_CollapseSelection() }, 100);

      }

    } else {

      var focusedElement = document.commandDispatcher.focusedElement;
      if (focusedElement) {
        AutoCopyAppMail.DeselectAfterCopy_CollapseSelection_TextBox()
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
    setTimeout(function() { AutoCopyAppMail.BlinkStatusbarButton(numberofblinks) }, 5000, 0); //resets in 5 seconds just incase
    if ((AutoCopyAppMail.autocopyPrefs.getIntPref("StatusBarState") == 0) || (!AutoCopyAppMail.autocopyPrefs.getBoolPref("optStatusBar"))) {
      return;
    }

    var button = document.getElementById("autocopy-status");
    var image = document.getElementById("autocopy-status-image");
    var tooltip = document.getElementById("autocopy-tooltip-value");

    if (numberofblinks <= 0) {
      image.setAttribute("src", "chrome://autocopy/skin/enabled.png");
      return;
    }

    if (image.getAttribute("src") == "chrome://autocopy/skin/enabled.png") {
      image.setAttribute("src", "chrome://autocopy/skin/blank.png");
    } else {
      image.setAttribute("src", "chrome://autocopy/skin/enabled.png");
    }

    numberofblinks = numberofblinks - 1;
    setTimeout(function() { AutoCopyAppMail.BlinkStatusbarButton(numberofblinks) }, 300);

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
      gautocopy_target.value=gautocopy_target.value.substring(0,gautocopy_target.selectionStart)+AutoCopyAppMail.gautocopy_clipboardcontents[x]+gautocopy_target.value.substring(gautocopy_target.selectionStart,gautocopy_target.value.length)
    }
    var clip1=AutoCopyAppMail.gautocopy_clipboardcontents[0]
    var clip2=AutoCopyAppMail.gautocopy_clipboardcontents[x]
    var clipurl1=AutoCopyAppMail.gautocopy_clipboardcontentsurl[0]
    var clipurl2=AutoCopyAppMail.gautocopy_clipboardcontentsurl[x]
    var clip1label=document.getElementById(id).childNodes[0].label
    var clip2label=document.getElementById(id).childNodes[x].label
    Components.classes["@mozilla.org/widget/clipboardhelper;1"].getService(Components.interfaces.nsIClipboardHelper).copyString(clip2)
    AutoCopyAppMail.gautocopy_clipboardcontents[0]=clip2
    AutoCopyAppMail.gautocopy_clipboardcontents[x]=clip1
    AutoCopyAppMail.gautocopy_clipboardcontentsurl[0]=clipurl2
    AutoCopyAppMail.gautocopy_clipboardcontentsurl[x]=clipurl1
    document.getElementById(id).childNodes[0].label=clip2label
    document.getElementById(id).childNodes[x].label=clip1label
  },

  undocopy: function() {
    if(AutoCopyAppMail.gautocopy_clipboardcontents.length>1){AutoCopyAppMail.gautocopy_clipboardcontents.splice(0,1)}
    Components.classes["@mozilla.org/widget/clipboardhelper;1"].getService(Components.interfaces.nsIClipboardHelper).copyString(AutoCopyAppMail.gautocopy_clipboardcontents[0])
  },

  pastetolocationbar: function() {

    var str = AutoCopyAppMail.gautocopy_clipboardcontents[0];
    if (!str) {
      return;
    }

    var urlbar = document.getElementById("urlbar");
    urlbar.value = str;
    urlbar.focus();

  },

  pastetosearchbar: function() {
    var str = AutoCopyAppMail.gautocopy_clipboardcontents[0];
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
    AutoCopyAppMail.gautocopy_clipboardcontents[0] = AutoCopyAppMail.gautocopy_clipboardcontents[0] + "\r\n\r\n" + AutoCopyAppMail.gautocopy_clipboardcontentsurl[0];
    Components.classes["@mozilla.org/widget/clipboardhelper;1"].getService(Components.interfaces.nsIClipboardHelper).copyString(AutoCopyAppMail.gautocopy_clipboardcontents[0])
  },

  timedhidemenu: function() {
    window.clearTimeout(AutoCopyAppMail.gautocopy_hidemenu_timer);
    var timerinterval = AutoCopyAppMail.autocopyPrefs.getIntPref("optContextMenuHideTimeout");
    if (timerinterval > 0) {
      AutoCopyAppMail.gautocopy_hidemenu_timer = setTimeout(function() { AutoCopyAppMail.hide_contextMenu(); }, timerinterval, 0);
    }
  },

  canceltimedhidemenu: function() {
    window.clearTimeout(AutoCopyAppMail.gautocopy_hidemenu_timer);
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

    var SelectionText = AutoCopyAppMail.getSelection();
    if (!(SelectionText.length > 0) && AutoCopyAppMail.gautocopy_lastSelection) {
      SelectionText = AutoCopyAppMail.gautocopy_lastSelection;
    }

    if (SelectionText) {
      item.setAttribute("label", lcSearchFor + " " + quotationmark1 + SelectionText.substring(0, 12) + "..." + quotationmark2);
    } else {
      item.setAttribute("label", lcSearchFor + " ");
    }
  },

  contextmenu_onpopupshowing: function(e) {
    AutoCopyAppMail.searchForItems("autocopy-context-menu-searchforselection");
  },

  context_onpopupshowing: function(e) {
    AutoCopyAppMail.searchForItems("autocopy-context-searchforselection");
  },

  Clipboards_Handle: function(id) {
    var clipsmenu = document.getElementById(id);
    while (clipsmenu.childNodes.length > 0 && AutoCopyAppMail.gautocopy_clipboardcontents.length>0) {
      clipsmenu.removeChild(clipsmenu.childNodes[0]);
    }

    if (AutoCopyAppMail.gautocopy_clipboardcontents.length == 0) {
      return false;
    }

    for (var x = 0; x < AutoCopyAppMail.gautocopy_clipboardcontents.length & x < 10; x++) {

        var ac2pastetext = AutoCopyAppMail.gautocopy_clipboardcontents[x];


        var item = document.createElement("menuitem");

        item.addEventListener("command", function(e) {AutoCopyAppMail.replaceoldclipboard(e.target.id,id); }, false);
        item.setAttribute("label", ac2pastetext.substring(0, 24));
        clipsmenu.appendChild(item);

    }
    for(var i=0;i<AutoCopyAppMail.gautocopy_clipboardcontents.length;i++){
      document.getElementById(id).childNodes[i].id=i
    }
  },

  context_menupopup_clipboards_onpopupshowing: function() {
    return AutoCopyAppMail.Clipboards_Handle("autocopy-context-menupopup-clipboards")
  },

  context_menupopup_clipboards2_onpopupshowing: function() {
    return AutoCopyAppMail.Clipboards_Handle("autocopy-context-menupopup-clipboards2")
  },

  searchforselection: function() {
    var SelectionText = AutoCopyAppMail.getSelection();
    if (!(SelectionText.length > 0) && AutoCopyAppMail.gautocopy_lastSelection) {
      SelectionText = AutoCopyAppMail.gautocopy_lastSelection;
    }

    // Apparently BrowserSearch and OpenSearch are magically available
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
    var SelectionText = AutoCopyAppMail.getSelection();
    if (!(SelectionText.length > 0) && AutoCopyAppMail.gautocopy_lastSelection) {
      SelectionText = AutoCopyAppMail.gautocopy_lastSelection;
    }
    if(SelectionText.slice(0,8)=="https://"||SelectionText.slice(0,7)=="http://"||SelectionText.slice(0,6)=="ftp://"||SelectionText.slice(0,7)=="file://"){
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

if (!AutoCopyAppMail.autocopyPrefs.prefHasUserValue("StatusBarState")) {
  AutoCopyAppMail.autocopyPrefs.setIntPref("StatusBarState", 1);
}

AutoCopyAppMail.autocopyPrefs.addObserver("", AutoCopyAppMail, false);

var init = function ()
{
  AutoCopyAppMail.onLoad();
  AutoCopyAppMail.initAutoCopyStatus();
}

window.addEventListener("load", function () {init();}, false);
window.addEventListener("unload", function() { AutoCopyAppMail.autocopyPrefs.removeObserver("", AutoCopyAppMail, false); }, false);
window.addEventListener("mouseup", AutoCopyAppMail.onMouseUp, false);
window.addEventListener("keyup", AutoCopyAppMail.onKeyUpCheck, false);
window.addEventListener("mousedown", AutoCopyAppMail.Pasteonmiddleclick_mousedown, false);
window.addEventListener("mouseup", AutoCopyAppMail.Pasteonmiddleclick_mouseup, false);
