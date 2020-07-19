if("undefined" == typeof(SubjectCleanerOptions)){
  var SubjectCleanerOptions = {
    COLINDEX_NO : 0,
    COLINDEX_REMOVAL_STRING : 1,
    COLINDEX_CASE_SENSITIVE : 2,
    COLINDEX_REGULAR_EXPRESSION : 3,
    COLINDEX_DELETE : 4,

    getRemovalListTree : function(){
      return document.getElementById("removalListTree");
    },

    startup : function(){
      let tree = SubjectCleanerOptions.getRemovalListTree();
      tree.isEditing = function(){
        return this.editingRow !== -1 && this.editingColumn !== null;
      }
      // ignore empty removal string
      tree.view.setCellText = (function(row, col, value){
        let context = tree.view;
        let baseFunc = tree.view.setCellText;
        return function(row, col, value){
          // for Escape key at new treeItem
          if(tree.view.rowCount <= row){
            return;
          }
          if(value === ""){
            let prevValue = context.getCellText(row, col);
            if(prevValue === ""){
              SubjectCleanerOptions.deleteTreeItem(tree, row);
            }
          }else{
            baseFunc.call(context, row, col, value);
            tree.view.selection.select(row);
          }
        };
      })();

      tree.addEventListener("click", SubjectCleanerOptions.treeClick, true);
      tree.addEventListener("keydown", SubjectCleanerOptions.treeKeyDown, true);

      document.getElementById("add").addEventListener("command", SubjectCleanerOptions.add, true);
      document.getElementById("autoRemove").addEventListener("CheckboxStateChange", SubjectCleanerOptions.setAutoFocusStatus, true);
      document.getElementById("test").addEventListener("command", SubjectCleanerOptions.test, true);
      document.getElementById("default").addEventListener("command", SubjectCleanerOptions.default, true);
      document.getElementById("apply").addEventListener("command", SubjectCleanerOptions.apply, true);

      SubjectCleanerOptions.fill(
        SubjectCleanerPrefUtil.getRemovalList(),
        SubjectCleanerPrefUtil.isAutoRemove(),
        SubjectCleanerPrefUtil.isAutoFocus());
    },

    treeClick : function(event){
      if(event.target.localName === "treechildren"){
        let tree = SubjectCleanerOptions.getRemovalListTree();
        let treeCellInfo = tree.getCellAt(event.clientX, event.clientY);
        if(treeCellInfo.row >= 0){
          switch(treeCellInfo.col.index){
          case SubjectCleanerOptions.COLINDEX_REMOVAL_STRING:
            tree.startEditing(treeCellInfo.row, treeCellInfo.col);
            break;
          case SubjectCleanerOptions.COLINDEX_DELETE:
            SubjectCleanerOptions.deleteTreeItem(tree, treeCellInfo.row);
            break;
          default:
            break;
          }
        }
      }
    },

    treeKeyDown : function(event){
      // ignore empty removal string when Escape key down
      if(event.key === "Escape"){
        let tree = SubjectCleanerOptions.getRemovalListTree();
        if(tree.isEditing() && tree.view.getCellText(tree.editingRow, tree.editingColumn) === ""){
          SubjectCleanerOptions.deleteTreeItem(tree, tree.editingRow);
        }
      }
    },

    getCurrentRemovalList : function(){
      let removalList = new Array();
      let tree = SubjectCleanerOptions.getRemovalListTree();
      for(let i=0; i<tree.treeBody.children.length; i++){
        let removal = {};
        removal.removalString = tree.view.getCellText(i, tree.columns.getColumnAt(SubjectCleanerOptions.COLINDEX_REMOVAL_STRING));
        removal.caseSensitive = tree.view.getCellValue(i, tree.columns.getColumnAt(SubjectCleanerOptions.COLINDEX_CASE_SENSITIVE));
        removal.regexp = tree.view.getCellValue(i, tree.columns.getColumnAt(SubjectCleanerOptions.COLINDEX_REGULAR_EXPRESSION));
        removalList.push(removal);
      }
      return removalList;
    },

    createTreeItem : function(removalString, caseSensitive, regexp){
      let createTreeElement = function(name){
        let treeElement = document.createElement(name);
        treeElement.setAttribute("id", Math.random());
        return treeElement;
      }
      let createTreeCell = function(attrs){
        let treeCell = createTreeElement("treecell");
        for(let key in attrs) {
          treeCell.setAttribute(key, attrs[key]);
        }
        return treeCell;
      };

      let treeRow = createTreeElement("treerow");
      treeRow.appendChild(createTreeCell({"label":"", "editable":"false"}));
      treeRow.appendChild(createTreeCell({"label":removalString, "properties":"inputtext"}));
      treeRow.appendChild(createTreeCell({"value":caseSensitive}));
      treeRow.appendChild(createTreeCell({"value":regexp}));
      treeRow.appendChild(createTreeCell({"value":"true", "editable":"false", "properties":"delete"}));
      let treeItem = createTreeElement("treeitem");
      treeItem.appendChild(treeRow);

      return treeItem;
    },

    addTreeItem : function(tree, row, _removalString, _caseSensitive, _regexp){
      let removalString = _removalString || "";
      let caseSensitive = _caseSensitive || false;
      let regexp = _regexp || false;

      let newTreeItem = SubjectCleanerOptions.createTreeItem(removalString, caseSensitive, regexp);
      tree.treeBody.appendChild(newTreeItem);
      SubjectCleanerOptions.resfreshNo(tree);
    },

    deleteTreeItem : function(tree, row){
      tree.treeBody.removeChild(tree.treeBody.children[row])
      SubjectCleanerOptions.resfreshNo(tree)
    },

    resfreshNo : function(tree){
      for(let i=0; i<tree.treeBody.children.length; i++){
        tree.view.setCellText(i, tree.columns.getColumnAt(SubjectCleanerOptions.COLINDEX_NO), i + 1);
      }
    },

    add : function(event){
      let tree = SubjectCleanerOptions.getRemovalListTree();
      let row = tree.view.rowCount;
      SubjectCleanerOptions.addTreeItem(tree, row);
      tree.startEditing(row, tree.columns.getColumnAt(SubjectCleanerOptions.COLINDEX_REMOVAL_STRING));
    },

    test : function(event){
      let testBox = document.getElementById("testBox");
      let testBoxResult = document.getElementById("testBoxResult");

      let testValue = testBox.value;
      if(testBox.value === null || testBox.value.length === 0){
        testValue = testBox.placeholder;
      }
      let cleanResult = SubjectCleanerClean.clean(testValue, SubjectCleanerOptions.getCurrentRemovalList());
      if(testBoxResult.value !== cleanResult){
        testBoxResult.value = cleanResult;
      }
    },

    fill : function(removalList, autoRemove, autoFocus){
      let tree = SubjectCleanerOptions.getRemovalListTree();
      if(removalList !== null && removalList.length !== 0){
        // clear current
        for(let i=tree.view.rowCount-1; i>=0; i--){
          SubjectCleanerOptions.deleteTreeItem(tree, i);
        }

        for(let i=0; i<removalList.length; i++){
          SubjectCleanerOptions.addTreeItem(tree, i, removalList[i].removalString, removalList[i].caseSensitive, removalList[i].regexp);
        }
        tree.view.selection.clearSelection();
      }

      document.getElementById("autoRemove").checked = autoRemove;
      document.getElementById("autoFocus").checked = autoFocus;
      SubjectCleanerOptions.setAutoFocusStatus();
    },

    setAutoFocusStatus : function(){
      document.getElementById("autoFocus").setAttribute("disabled", !document.getElementById("autoRemove").checked);
    },

    default : function(event){
      SubjectCleanerOptions.fill(
        SubjectCleanerPrefUtil.getDefaultRemovalList(),
        SubjectCleanerPrefUtil.isDefaultAutoRemove(),
        SubjectCleanerPrefUtil.isDefaultAutoFocus());
    },

    apply : function(){
      SubjectCleanerPrefUtil.setRemovalList(SubjectCleanerOptions.getCurrentRemovalList());

      let autoRemove = document.getElementById("autoRemove").checked || false;
      SubjectCleanerPrefUtil.setAutoRemove(autoRemove);

      let autoFocus = false;
      if(autoRemove){
        autoFocus = document.getElementById("autoFocus").checked || false;
      }
      SubjectCleanerPrefUtil.setAutoFocus(autoFocus);

      return true;
    },
  }
}
