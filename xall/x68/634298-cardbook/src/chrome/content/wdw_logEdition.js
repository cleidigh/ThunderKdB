if ("undefined" == typeof(wdw_logEdition)) {
	var { Services } = ChromeUtils.import("resource://gre/modules/Services.jsm");
	var { XPCOMUtils } = ChromeUtils.import("resource://gre/modules/XPCOMUtils.jsm");
	XPCOMUtils.defineLazyModuleGetter(this, "cardbookRepository", "chrome://cardbook/content/cardbookRepository.js", "cardbookRepository");

	var wdw_logEdition = {
		
		load: function () {
			var myLogArray = cardbookRepository.statusInformation;
			var myTree = document.getElementById('logEditionTree');
			var myTreeView = {
				rowCount : myLogArray.length,
				isContainer: function(row) { return false },
				cycleHeader: function(row) { return false },
				getRowProperties: function(row) { return myLogArray[row][1] },
				getCellText : function(row,column){
					if (column.id == "logEditionValue") return myLogArray[row][0];
					else if (column.id == "logEditionType") return myLogArray[row][1];
				}
			}
			var currentFirstVisibleRow = myTree.getFirstVisibleRow();
			myTree.view = myTreeView;
			myTree.scrollToRow(currentFirstVisibleRow);
		},

		selectAllKey: function () {
			var myTree = document.getElementById('logEditionTree');
			myTree.view.selection.selectAll();
		},

		clipboard: function () {
			try {
				var myTree = document.getElementById('logEditionTree');
				var myLogArray = [];
				var numRanges = myTree.view.selection.getRangeCount();
				if (numRanges > 0) {
					for (var i = 0; i < numRanges; i++) {
						var start = new Object();
						var end = new Object();
						myTree.view.selection.getRangeAt(i,start,end);
						for (var j = start.value; j <= end.value; j++){
							myLogArray.push(myTree.view.getCellText(j, myTree.columns.getNamedColumn('logEditionValue')));
						}
					}
				} else {
					for (var i = 0; i < myTree.view.rowCount; i++) {
						myLogArray.push(myTree.view.getCellText(i, myTree.columns.getNamedColumn('logEditionValue')));
					}
				}
				cardbookClipboard.clipboardSetText('text/unicode', myLogArray.join("\n"));
			}
			catch (e) {
				var errorTitle = "clipboard error";
				Services.prompt.alert(null, errorTitle, e);
			}
		},

		flush: function () {
			cardbookRepository.statusInformation = [];
			wdw_logEdition.load();
		},

		cancel: function () {
			close();
		}

	};

};
