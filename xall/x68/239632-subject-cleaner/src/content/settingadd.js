if("undefined" == typeof(SubjectCleanerSettingAdd)){
  var SubjectCleanerSettingAdd = {
    addDialogDto : null,

    startup : function(){
      SubjectCleanerSettingAdd.addDialogDto = window.arguments[0];
      document.getElementById("removalString").value = SubjectCleanerSettingAdd.addDialogDto.removal.removalString;
      document.getElementById("caseSensitive").checked = SubjectCleanerSettingAdd.addDialogDto.removal.caseSensitive;
      document.getElementById("regexp").checked = SubjectCleanerSettingAdd.addDialogDto.removal.regexp;
    },

    doOK : function(){
      try{
        var removal = {};
        removal.removalString = document.getElementById("removalString").value;
        removal.caseSensitive = document.getElementById("caseSensitive").checked;
        removal.regexp = document.getElementById("regexp").checked;
        SubjectCleanerSettingAdd.addDialogDto.removal = removal;
        SubjectCleanerSettingAdd.addDialogDto.confirmOK = true;
        return true;
      }catch(e){
        dump(e+"\n");
        return false;
      }
    },

    doCancel : function(){
      SubjectCleanerSettingAdd.addDialogDto.confirmOK = false;
      return true;
    }
  }
}
