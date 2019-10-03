/*
function log(aText){
  var console = Components.classes["@mozilla.org/consoleservice;1"].getService(Components.interfaces.nsIConsoleService);
  console.logStringMessage(aText);
}
*/

if("undefined" == typeof(SubjectCleanerChrome)){
  var SubjectCleanerChrome = {
    BUNDLE : Components.classes["@mozilla.org/intl/stringbundle;1"].getService(Components.interfaces.nsIStringBundleService).createBundle("chrome://subjectcleaner/locale/subjectcleaner.properties"),

    notify : function(timer){
      SubjectCleanerChrome.init();
    },

    stateListener : {
      NotifyComposeFieldsReady: function(){},
      NotifyComposeBodyReady: function(){
        // StateListener only works in reply-cases.("Undo" operation)
        // So activate later.
        Components.classes["@mozilla.org/timer;1"]
          .createInstance(Components.interfaces.nsITimer)
          .initWithCallback(SubjectCleanerChrome, 0, Components.interfaces.nsITimer.TYPE_ONE_SHOT);
      },
      ComposeProcessDone: function(aResult){},
      SaveInFolderDone: function(folderURI){}
    },

    load : function(){
      var msgcomposeWindow = document.getElementById("msgcomposeWindow");
      if(msgcomposeWindow !== null){
        msgcomposeWindow.addEventListener("compose-window-init", function(){gMsgCompose.RegisterStateListener(SubjectCleanerChrome.stateListener);}, false);
      }
    },

    init : function(){
      if(SubjectCleanerPrefUtil.isAutoRemove()){
        SubjectCleanerChrome.clean();
      }

      var msgSubjectLabel = null;
      var appInfo = Components.classes["@mozilla.org/xre/app-info;1"].getService(Components.interfaces.nsIXULAppInfo);
      var versionChecker = Components.classes["@mozilla.org/xpcom/version-comparator;1"].getService(Components.interfaces.nsIVersionComparator);
      if(versionChecker.compare(appInfo.version, "31.0") >= 0){
        msgSubjectLabel = document.getElementById("subjectLabel");
      }else if(versionChecker.compare(appInfo.version, "5.0") >= 0){
        msgSubjectLabel = document.getElementById("msgSubject").previousSibling.firstChild;
      }else{
        msgSubjectLabel = document.getElementById("msgSubject").previousSibling;
      }
      if(msgSubjectLabel.nodeName === "label" && msgSubjectLabel.control === "msgSubject"){
        msgSubjectLabel.setAttribute("tooltiptext", SubjectCleanerChrome.BUNDLE.GetStringFromName("msgcomposewindow.msgsubject.label.tooltiptext"));
        msgSubjectLabel.setAttribute("class", "subjectcleaner-label");
        msgSubjectLabel.removeEventListener("click", SubjectCleanerChrome.clean, false);
        msgSubjectLabel.addEventListener("click", SubjectCleanerChrome.clean, false);
      }
    },

    clean : function(){
      var msgSubject = document.getElementById("msgSubject");
      if(msgSubject.value === null || msgSubject.value.length === 0){
        return;
      }

      var cleanResult = SubjectCleanerClean.clean(msgSubject.value, SubjectCleanerPrefUtil.getRemovalList());
      if(msgSubject.value === cleanResult){
        return;
      }

      msgSubject.value = cleanResult;
      if(SubjectCleanerPrefUtil.isAutoFocus()){
        msgSubject.focus();
      }
      //gContentChanged = true;
      SetComposeWindowTitle();
    }
  }

  SubjectCleanerChrome.load();
};
