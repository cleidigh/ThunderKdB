if("undefined" == typeof(SubjectCleanerClean)){
  var SubjectCleanerClean = {
    clean : function(srcSubject, removalList){
      var dstSubject = srcSubject;
      if(srcSubject === null || removalList === null || removalList.length === 0){
        return dstSubject;
      }

      for(var i=0; i<removalList.length; i++){
        var flags = "g";
        if(!removalList[i].caseSensitive){
          flags += "i";
        }

        if(removalList[i].regexp){
          dstSubject = dstSubject.replace(new RegExp(removalList[i].removalString, flags), '');
        }else{
          dstSubject = dstSubject.replace(removalList[i].removalString, '', flags);
        }
      }

      return dstSubject;
    }
  }
};
