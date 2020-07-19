if("undefined" == typeof(SubjectCleanerSetting)){
  var SubjectCleanerSetting = {
    AddDialogDto : function(removal){
      this.confirmOK = false;
      this.removal = removal;
    },

    selectedItem : null,

    startup : function(){
      document.getElementById("add").addEventListener("command", SubjectCleanerSetting.add, true);
      document.getElementById("edit").addEventListener("command", SubjectCleanerSetting.edit, true);
      document.getElementById("delete").addEventListener("command", SubjectCleanerSetting.delete, true);
      document.getElementById("test").addEventListener("command", SubjectCleanerSetting.test, true);
      document.getElementById("default").addEventListener("command", SubjectCleanerSetting.default, true);
      document.getElementById("autoRemove").addEventListener("CheckboxStateChange", SubjectCleanerSetting.setAutoFocusStatus, true);

      SubjectCleanerSetting.fill(
        SubjectCleanerPrefUtil.getRemovalList(),
        SubjectCleanerPrefUtil.isAutoRemove(),
        SubjectCleanerPrefUtil.isAutoFocus());
    },

    setSelectedItem : function(item){
      SubjectCleanerSetting.selectedItem = item;
    },

    getRemovalList : function(){
      var removalList = new Array();
      var nodes = document.getElementById("removalList").childNodes;
      for(var i=0; i<nodes.length; i++){
        if(nodes[i].nodeName === "listitem"){
          var listCells = nodes[i].childNodes;
          var removal = {};
          removal.removalString = listCells[0].getAttribute("label");
          removal.caseSensitive = JSON.parse(listCells[1].getAttribute("checked"));
          removal.regexp = JSON.parse(listCells[2].getAttribute("checked"));
          removalList.push(removal);
        }
      }
      return removalList;
    },

    createListItem : function(removalString, caseSensitive, regexp){
      var listItem = document.createElement("listitem");
      listItem.setAttribute("class", "subjectcleaner-setting-listitem");
      listItem.setAttribute("id", Math.random());

      SubjectCleanerSetting.createListCell(listItem, {"label":removalString});
      var checkboxClass = "subjectcleaner-setting-checkbox";
      SubjectCleanerSetting.createListCell(listItem, {"class":checkboxClass, "type":"checkbox", "checked":caseSensitive});
      SubjectCleanerSetting.createListCell(listItem, {"class":checkboxClass, "type":"checkbox", "checked":regexp});

      return listItem;
    },

    createListCell : function(listItem, attrs){
      var listCell = document.createElement('listcell');
      for(var key in attrs) {
        listCell.setAttribute(key, attrs[key]);
      }
      listItem.appendChild(listCell);
    },

    add : function(event){
      var removal = {};
      removal.removalString = "";
      removal.caseSensitive = false;
      removal.regexp = false;
      var addDialogDto = new SubjectCleanerSetting.AddDialogDto(removal);
      window.openDialog("chrome://subjectcleaner/content/settingadd.xul",
        "SubjectCleanerSettingDialog", "chrome,modal,titlebar,centerscreen", addDialogDto);

      if(addDialogDto.confirmOK){
        if(addDialogDto.removal.removalString.length > 0){
          var removalList = document.getElementById("removalList");
          var listItem = SubjectCleanerSetting.createListItem(
            addDialogDto.removal.removalString,
            addDialogDto.removal.caseSensitive,
            addDialogDto.removal.regexp);
          removalList.appendChild(listItem);
          var newSelectedIndex = removalList.itemCount - 1;
          removalList.ensureIndexIsVisible(newSelectedIndex);
          removalList.selectedIndex = newSelectedIndex;
        }
      }
    },

    edit : function(event){
      var listCells = SubjectCleanerSetting.selectedItem.childNodes;
      var removal = {};
      removal.removalString = listCells[0].getAttribute("label");
      removal.caseSensitive = JSON.parse(listCells[1].getAttribute("checked"));
      removal.regexp = JSON.parse(listCells[2].getAttribute("checked"));
      var addDialogDto = new SubjectCleanerSetting.AddDialogDto(removal);
      window.openDialog("chrome://subjectcleaner/content/settingadd.xul",
        "SubjectCleanerSettingDialog", "chrome,modal,titlebar,centerscreen", addDialogDto);

      if(addDialogDto.confirmOK){
        if(addDialogDto.removal.removalString.length > 0){
          listCells[0].setAttribute("label", addDialogDto.removal.removalString);
          listCells[1].setAttribute("checked", addDialogDto.removal.caseSensitive);
          listCells[2].setAttribute("checked", addDialogDto.removal.regexp);
        }
      }
    },

    delete : function(event){
      var removalList = document.getElementById("removalList");
      var removeIndex = removalList.selectedIndex;
      var nextSelectedIndex = (removeIndex > 0) ? removeIndex - 1 : 0;
      removalList.scrollToIndex(nextSelectedIndex);
      removalList.removeItemAt(removeIndex);
      removalList.selectedIndex = nextSelectedIndex;
    },

    test : function(event){
      var testBox = document.getElementById("testBox");
      if(testBox.value === null || testBox.value.length === 0){
        return;
      }
      var cleanResult = SubjectCleanerClean.clean(testBox.value, SubjectCleanerSetting.getRemovalList());
      if(testBox.value !== cleanResult){
        testBox.value = cleanResult;
      }
      testBox.focus();
    },

    default : function(event){
      SubjectCleanerSetting.fill(
        SubjectCleanerPrefUtil.getDefaultRemovalList(),
        SubjectCleanerPrefUtil.isDefaultAutoRemove(),
        SubjectCleanerPrefUtil.isDefaultAutoFocus());
    },

    fill : function(removalList, autoRemove, autoFocus){
      var viewRemovalList = document.getElementById("removalList");
      if(removalList !== null && removalList.length !== 0){
        var itemCount = viewRemovalList.itemCount;
        for(var i=itemCount-1; i>=0; i--){
          viewRemovalList.removeItemAt(i);
        }

        for(var i=0; i<removalList.length; i++){
          var listItem = SubjectCleanerSetting.createListItem(
            removalList[i].removalString,
            removalList[i].caseSensitive,
            removalList[i].regexp);
          viewRemovalList.appendChild(listItem);
        }
      }
      viewRemovalList.selectedIndex = 0;

      document.getElementById("autoRemove").setAttribute("checked", autoRemove);
      document.getElementById("autoFocus").setAttribute("checked", autoFocus);
      SubjectCleanerSetting.setAutoFocusStatus();
    },

    setAutoFocusStatus : function(){
      document.getElementById("autoFocus").setAttribute("disabled", !document.getElementById("autoRemove").checked);
    },

    doOK : function(){
      SubjectCleanerPrefUtil.setRemovalList(SubjectCleanerSetting.getRemovalList());
      var autoRemove = document.getElementById("autoRemove").checked;
      SubjectCleanerPrefUtil.setAutoRemove(autoRemove);
      var autoFocus = false;
      if(autoRemove){
        autoFocus = document.getElementById("autoFocus").checked;
      }
      SubjectCleanerPrefUtil.setAutoFocus(autoFocus);

      return true;
    },

    doCancel : function(){
      return true;
    }
  }
}
