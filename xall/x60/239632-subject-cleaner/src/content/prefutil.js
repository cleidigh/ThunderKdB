if("undefined" == typeof(SubjectCleanerPrefUtil)){
  var SubjectCleanerPrefUtil = {
    PREF_DEFAULT : Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefService).getDefaultBranch("extensions.subjectcleaner."),
    PREF_USER : Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefService).getBranch("extensions.subjectcleaner."),

    PREF_KEY_REMOVALLIST : "removalList",
    PREF_KEY_AUTOREMOVE : "autoRemove",
    PREF_KEY_AUTOFOCUS : "autoFocus",

    getInterfaceComplexValueAtype : function(){
      var appInfo = Components.classes["@mozilla.org/xre/app-info;1"].getService(Components.interfaces.nsIXULAppInfo);
      var versionChecker = Components.classes["@mozilla.org/xpcom/version-comparator;1"].getService(Components.interfaces.nsIVersionComparator);
      var atype = versionChecker.compare(appInfo.version, "60.0") >= 0 ? Components.interfaces.nsIPrefLocalizedString : Components.interfaces.nsISupportsString;
      return atype;
    },
    getDefaultRemovalList : function(){
      try{
        return JSON.parse(SubjectCleanerPrefUtil.PREF_DEFAULT.getComplexValue(SubjectCleanerPrefUtil.PREF_KEY_REMOVALLIST, SubjectCleanerPrefUtil.getInterfaceComplexValueAtype()).data);
      }catch(e){
        console.log(e);
        return new Array();
      }
    },
    getRemovalList : function(){
      // compatible with ver.1.2.0
      var removalList = SubjectCleanerPrefUtil.getRemovalListFromOldPref();
      if(removalList.length !== 0){
        return removalList;
      }

      try{
        return JSON.parse(SubjectCleanerPrefUtil.PREF_USER.getComplexValue(SubjectCleanerPrefUtil.PREF_KEY_REMOVALLIST, SubjectCleanerPrefUtil.getInterfaceComplexValueAtype()).data);
      }catch(e){
        console.log(e);
        return new Array();
      }
    },
    setRemovalList : function(removalList){
      var str = Components.classes["@mozilla.org/supports-string;1"].createInstance(Components.interfaces.nsISupportsString);
      str.data = JSON.stringify(removalList);
      SubjectCleanerPrefUtil.PREF_USER.setComplexValue(SubjectCleanerPrefUtil.PREF_KEY_REMOVALLIST, SubjectCleanerPrefUtil.getInterfaceComplexValueAtype(), str);
    },

    isDefaultAutoRemove : function(){
      return SubjectCleanerPrefUtil.PREF_DEFAULT.getBoolPref(SubjectCleanerPrefUtil.PREF_KEY_AUTOREMOVE);
    },
    isAutoRemove : function(){
      // compatible with ver.1.2.0
      var autoRemove = SubjectCleanerPrefUtil.isAutoRemoveFromOldPref();
      if(autoRemove !== null){
        return autoRemove;
      }

      return SubjectCleanerPrefUtil.PREF_USER.getBoolPref(SubjectCleanerPrefUtil.PREF_KEY_AUTOREMOVE);
    },
    setAutoRemove : function(autoRemove){
      SubjectCleanerPrefUtil.PREF_USER.setBoolPref(SubjectCleanerPrefUtil.PREF_KEY_AUTOREMOVE, autoRemove);
    },

    isDefaultAutoFocus : function(){
      return SubjectCleanerPrefUtil.PREF_DEFAULT.getBoolPref(SubjectCleanerPrefUtil.PREF_KEY_AUTOFOCUS);
    },
    isAutoFocus : function(){
      return SubjectCleanerPrefUtil.PREF_USER.getBoolPref(SubjectCleanerPrefUtil.PREF_KEY_AUTOFOCUS);
    },
    setAutoFocus : function(autoFocus){
      SubjectCleanerPrefUtil.PREF_USER.setBoolPref(SubjectCleanerPrefUtil.PREF_KEY_AUTOFOCUS, autoFocus);
    },

    // compatible with ver.1.2.0
    getRemovalListFromOldPref : function(){
      var oldPref = Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefService).getBranch("subjectcleaner.");

      var removalListStr = null;
      try{
        removalListStr = oldPref.getComplexValue("removalList", SubjectCleanerPrefUtil.getInterfaceComplexValueAtype()).data;
      }catch(e){
      }
      var removalListLengthsStr = null;
      try{
        removalListLengthsStr = oldPref.getComplexValue("removalListLengths", SubjectCleanerPrefUtil.getInterfaceComplexValueAtype()).data;
      }catch(e){
      }
      var removalStringArray = new Array();
      if(removalListStr !== null && removalListStr.length !== 0 && removalListLengthsStr !== null && removalListLengthsStr.length !== 0){
        // restore ver.1.2.0 setting
        var removalListLengths = removalListLengthsStr.split(",");
        var startIndex = 0;
        for(var i=0; i<removalListLengths.length; i++){
          var removalListLength = parseInt(removalListLengths[i]);
          var removalString = removalListStr.substring(startIndex, startIndex + removalListLength);
          removalStringArray.push(removalString);
          startIndex += removalListLength + 1;
        }
      }else{
        // restore ver.1.0.1 setting
        if(removalListStr !== null && removalListStr.length !== 0){
          removalStringArray = removalListStr.split(",");
        }
      }

      var caseSensitive = false;
      try{
        caseSensitive = !oldPref.getBoolPref("isIgnoreCase");
      }catch(e){
      }
      var regexp = true;
      try{
        regexp = oldPref.getBoolPref("isRegExp");
      }catch(e){
      }
      var removalList = new Array();
      for(var i=0; i<removalStringArray.length; i++){
        var removal = {};
        removal.removalString = removalStringArray[i];
        removal.caseSensitive = caseSensitive;
        removal.regexp = regexp;
        removalList.push(removal);
      }

      return removalList;
    },

    // compatible with ver.1.2.0
    isAutoRemoveFromOldPref : function(){
      var oldPref = Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefService).getBranch("subjectcleaner.");

      var autoRemove = null;
      try{
        autoRemove = oldPref.getBoolPref("isAuto");
      }catch(e){
      }

      return autoRemove;
    },

    // compatible with ver.1.2.0
    deleteOldPref : function(){
      try{
        Components.classes["@mozilla.org/preferences-service;1"]
          .getService(Components.interfaces.nsIPrefService)
          .getBranch("subjectcleaner.")
          .deleteBranch("");
      }catch(e){
      }
    }
  }
};
