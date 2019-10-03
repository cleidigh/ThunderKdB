Components.utils.import('resource://gre/modules/Services.jsm');

var AutoCopyOptions = {

  acPrefs : Services.prefs.getBranch("extensions.autocopy."),
  mainWindow : Components.classes["@mozilla.org/appshell/window-mediator;1"]
                         .getService(Components.interfaces.nsIWindowMediator)
                         .getMostRecentWindow("navigator:browser"),
  appInfo : Components.classes["@mozilla.org/xre/app-info;1"]
                      .getService(Components.interfaces.nsIXULAppInfo),
  vc : Components.classes["@mozilla.org/xpcom/version-comparator;1"]
                 .getService(Components.interfaces.nsIVersionComparator),

  validateContextTimeout: function() {
      var element = document.getElementById('autocopyContextMenuHideTimeout');
      return (!isNaN(parseInt(element.value)) && (element.value >= 0));
  },

  testblacklist: function() {
    var items=AutoCopyOptions.acPrefs.getCharPref("blacklist").split(",")
    if(items!=""&&document.getElementById("urlList").childNodes.length-2==items.length){return;}
    else{
      for (var i =document.getElementById("urlList").childNodes.length-2; i<items.length; i++) {
          var item = document.createElement("listitem");
          item.setAttribute("label", items[i]);
          document.getElementById("urlList").appendChild(item);
      }
    }
  },

  showblacklist: function() {
    var items=AutoCopyOptions.acPrefs.getCharPref("blacklist").split(",")
    for (var i =0; i < items.length; i++) {
      if(items[i]!=""){
        var item = document.createElement("listitem");
        item.setAttribute("label", items[i]);
        document.getElementById("urlList").appendChild(item);
      }
    }
  },

  addtoblacklist: function() {
    var RegExp = /^(([\w]+:)?\/\/)?(([\d\w]|%[a-fA-f\d]{2,2})+(:([\d\w]|%[a-fA-f\d]{2,2})+)?@)?([\d\w][-\d\w]{0,253}[\d\w]\.)+[\w]{2,4}(:[\d]+)?(\/([-+_~.\d\w]|%[a-fA-f\d]{2,2})*)*(\?(&?([-+_~.\d\w]|%[a-fA-f\d]{2,2})=?)*)?(#([-+_~.\d\w]|%[a-fA-f\d]{2,2})*)?$/;
    if(RegExp.test(document.getElementById("nameURL").value.toLowerCase())==true){
      document.getElementById("invalidURL").hidden=true;
      document.getElementById("pageExist").hidden=true;
      var url=document.getElementById("nameURL").value.toLowerCase();
      url=url.replace("ftp:\/\/","").replace("http:\/\/","").replace("https:\/\/","").replace("www.","");
      var array = url.split('/');
      url=array[0];
      if(AutoCopyOptions.acPrefs.getCharPref("blacklist").value==""){AutoCopyOptions.acPrefs.setCharPref("blacklist",url)}
      else{
        var str=AutoCopyOptions.acPrefs.getCharPref("blacklist");
        var blacklistarr=str.split(",");
        for(var i=0;i<blacklistarr.length;i++){
          if(url==blacklistarr[i]){document.getElementById("pageExist").hidden=false;
            setTimeout(function() {document.getElementById("pageExist").hidden=true}, 3000);return;};
        }
      AutoCopyOptions.acPrefs.setCharPref("blacklist",str+","+url)
      }
      var item = document.createElement("listitem");
      item.setAttribute("label", url);
      document.getElementById("urlList").appendChild(item);
      document.getElementById("nameURL").value="";
      document.getElementById("addURLpanel").hidePopup();
    }
    else{
      document.getElementById("invalidURL").hidden=false;
      setTimeout(function() {document.getElementById("invalidURL").hidden=true}, 3000);
      document.getElementById("pageExist").hidden=true;
    }
  },

  removefromblacklist: function() {
    var str=AutoCopyOptions.acPrefs.getCharPref("blacklist");
    var blacklistarr=str.split(",")
    if(document.getElementById("urlList").selectedItem!=null){
      for(var i=0;i<blacklistarr.length;i++){
        if(document.getElementById("urlList").selectedItem.label==blacklistarr[i]){
          document.getElementById("urlList").removeChild(document.getElementById("urlList").selectedItem)
          blacklistarr.splice(i,1);
          AutoCopyOptions.acPrefs.setCharPref("blacklist",blacklistarr.join(","))
        }
      }
    }
  },

  hiddentextboxpanel: function() {
    document.getElementById("pageExist").hidden=true
    document.getElementById("invalidURL").hidden=true
    document.getElementById("nameURL").value="";
    document.getElementById("addURLpanel").hidePopup()
  },

  showHideMenu: function() {
      var state = document.getElementById("autocopyContextMenu").checked;

      document.getElementById("timeoutLabel").disabled = !state;
      document.getElementById("autocopyContextMenuHideTimeout").disabled = !state;
      document.getElementById("msLabel").disabled = !state;
  },

  shortcutChange: function() {
      var state = document.getElementById("autocopyKeyboardShortcutEnabled").checked;

      document.getElementById("chooseShortcutskeys").disabled = !state;
      document.getElementById("autocopyKeyboardShortcutKeyMeta").disabled = !state;
      document.getElementById("autocopyKeyboardShortcutKeyCtrl").disabled = !state;
      document.getElementById("autocopyKeyboardShortcutKeyShift").disabled = !state;
      document.getElementById("autocopyKeyboardShortcutKeyAlt").disabled = !state;
      document.getElementById("autocopyKeyboardShortcutKey+").disabled = !state;
      document.getElementById("autocopyKeyboardShortcutKey").disabled = !state;
      document.getElementById("hintDesc").disabled = !state;
  },

  alertDisplay: function() {
      try{
        if (!AutoCopyOptions.acPrefs.getBoolPref("optCopyWithoutFormatting")&&!CPTOver.ptPrefs.getBoolPref("trim")&&CPTOver.ptPrefs.getBoolPref("reduceLine")==false&&!CPTOver.ptPrefs.getBoolPref("reduceSpace"))
        {
          var strings = document.getElementById("autocopyStrings");
          var goToCpt = Components.classes["@mozilla.org/embedcomp/prompt-service;1"]
                       .getService(Components.interfaces.nsIPromptService).confirm(null,"AutoCopy 2",strings.getString("openCptOptions"));
          if (goToCpt)
            CPTOver.showOptions();
        }
      }
      catch(err){}
  },

  helpInfo: function() {
      var strings = document.getElementById("autocopyStrings");
      var prompts = Components.classes["@mozilla.org/embedcomp/prompt-service;1"]
                              .getService(Components.interfaces.nsIPromptService);
      var check = {value: false};
      var flags = prompts.BUTTON_POS_0 * prompts.BUTTON_TITLE_IS_STRING +
                  prompts.BUTTON_POS_2 * prompts.BUTTON_TITLE_IS_STRING  +
                  prompts.BUTTON_POS_1 * prompts.BUTTON_TITLE_CANCEL;
      var result = prompts.confirmEx(null,"AutoCopy 2",strings.getString("openCptPage"),
                          flags, strings.getString("cptInstall"), "", strings.getString("cptEnable"), null, {});
      if(navigator.userAgent.search(/Firefox/gi) >= 0 || navigator.userAgent.search(/Firefox/gi) >= 0) {
        if (result == 0){
          var openactab = AutoCopyOptions.mainWindow.gBrowser; 
          if(navigator.userAgent.search(/Firefox/gi) >= 0) {
            openactab.selectedTab = openactab.addTab("https://addons.mozilla.org/firefox/addon/copy-plain-text-2/?src=ss");
          }
          if(navigator.userAgent.search(/SeaMonkey/gi) >= 0) {
            openactab.selectedTab = openactab.addTab("https://addons.mozilla.org/seamonkey/addon/copy-plain-text-2/?src=ss");
          }
        }
        if (result == 1){
          return; 
        }
        if (result == 2){
          var openAddonManager = AutoCopyOptions.mainWindow.gBrowser;
          openAddonManager.selectedTab = openAddonManager.addTab("about:addons");
        }
      }
      if (navigator.userAgent.search(/Thunderbird/gi) >= 0) {
        if (result == 0){
          Components.classes['@mozilla.org/appshell/window-mediator;1'].getService(Components.interfaces.nsIWindowMediator)
                    .getMostRecentWindow("mail:3pane").document.getElementById("tabmail")
                    .openTab("contentTab", {contentPage: "https://addons.mozilla.org/thunderbird/addon/copy-plain-text-2/?src=ss"});
        }
        if (result == 1){
            return; 
        }
        if (result == 2){
          Components.classes['@mozilla.org/appshell/window-mediator;1'].getService(Components.interfaces.nsIWindowMediator)
                    .getMostRecentWindow("mail:3pane").document.getElementById("tabmail")
                    .openTab("contentTab", {contentPage: "about:addons"});
        }
      }
  },

  loadSettings: function() {
    if(navigator.userAgent.search(/Firefox/gi)>0&&this.vc.compare(this.appInfo.version, "4") >= 0){
    //if(this.vc.compare(this.appInfo.version, "4") >= 0){
      document.getElementById("autocopyStatusBar").hidden = true;
    } else {
      document.getElementById("autocopyToolBar").hidden = true;
    }
    if (navigator.userAgent.search(/SeaMonkey/gi) >= 0) {
      document.getElementById("autocopyEditMenuItem").hidden = true;
      document.getElementById("autocopyToolBar").hidden = true;
    }
    if(navigator.userAgent.search(/Thunderbird/gi) >= 0) {
      document.getElementById("autocopyToolBar").hidden = true;
    }
    try {
      Components.utils.import("resource://gre/modules/AddonManager.jsm");
      AddonManager.getAddonByID("copyplaintext@teo.pl", function(addon) {
        if (!addon||!addon.isActive) {
          document.getElementById("autocopyCopyWithoutFormatting").disabled = true;
          AutoCopyOptions.acPrefs.setBoolPref('optCopyWithoutFormatting', false);
        }
        else{
          document.getElementById("autocopyHelp").collapsed = true;
        }
      });
    } catch (ex) {}
  }
};

var init = function() {
  AutoCopyOptions.validateContextTimeout();
  AutoCopyOptions.shortcutChange();
  AutoCopyOptions.showHideMenu();
  AutoCopyOptions.loadSettings();
}

window.addEventListener("load", function () {init();}, false);