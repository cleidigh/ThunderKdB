"use strict";
var miczImapDraftUnreadOSUtils =
{
    getCurrentOS:function(){
      return Components.classes["@mozilla.org/xre/app-info;1"].getService(Components.interfaces.nsIXULRuntime).OS;
    },

    onOSX:function(currentOS){
      return currentOS=='Darwin';
    },
}
