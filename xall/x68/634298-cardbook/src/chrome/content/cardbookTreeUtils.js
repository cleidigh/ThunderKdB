if ("undefined" == typeof(cardbookTreeUtils)) {
	var { Services } = ChromeUtils.import("resource://gre/modules/Services.jsm");

	var { XPCOMUtils } = ChromeUtils.import("resource://gre/modules/XPCOMUtils.jsm");
	XPCOMUtils.defineLazyModuleGetter(this, "cardbookRepository", "chrome://cardbook/content/cardbookRepository.js", "cardbookRepository");

	var cardbookTreeUtils = {
		
		setColumnsStateForAccount: function (aDirPrefId) {
			if (cardbookRepository.cardbookSearchMode === "SEARCH") {
				return;
			}
			cardbookTreeUtils.setAccountColumnsState();

			var columnStatesString = cardbookRepository.cardbookPreferences.getDisplayedColumns(aDirPrefId);
			var columnStatesArray = columnStatesString.split(',');
			cardbookTreeUtils.setColumnsState(columnStatesArray);

			var columnSortResource = cardbookRepository.cardbookPreferences.getSortResource(aDirPrefId);
			var columnSortDirection = cardbookRepository.cardbookPreferences.getSortDirection(aDirPrefId);
			cardbookTreeUtils.seColumnsSort(columnSortResource, columnSortDirection);
		},

		// this function is only there as a workaround for Thunderbird 60
		// the dummy column for the scrollbar is no set in the correct ordinal
		setAccountColumnsState: function () {
			var colChildren = document.getElementById("accountsOrCatsTreecols").children;
			var aColumnStatesArray = ["accountEnabled", "accountTypeCheckbox", "accountColor", "accountName", "accountStatusCheckbox", "dummyForScroll"];
			var myHiddenOrdinal = aColumnStatesArray.length * 2 - 1;
			for (let i = 0; i < colChildren.length; i++) {
				var colChild = colChildren[i];
				if (colChild == null) {
					continue;
				}
				// We only care about treecols.  The splitters do not need to be marked
				//  hidden or un-hidden.
				if (colChild.tagName == "treecol") {
					var myIndex = aColumnStatesArray.indexOf(colChild.id);
					if (myIndex != -1) {
						var myShownOrdinal = 1 + 2 * myIndex;
						if (colChild.getAttribute("ordinal") != myShownOrdinal) {
							colChild.setAttribute("ordinal", myShownOrdinal);
						}
						if (colChild.getAttribute("hidden") == "true") {
							colChild.removeAttribute("hidden");
						}
					} else {
						if (colChild.getAttribute("ordinal") != myHiddenOrdinal) {
							colChild.setAttribute("ordinal", myHiddenOrdinal);
						}
						if (colChild.getAttribute("hidden") != "true") {
							colChild.setAttribute("hidden", "true");
						}
						myHiddenOrdinal = myHiddenOrdinal + 2;
					}
				}
			}
		},

		setColumnsState: function (aColumnStatesArray) {
			cardbookRepository.cardbookReorderMode = "REORDER";
			var colChildren = document.getElementById("cardsTreecols").children;
			var myHiddenOrdinal = aColumnStatesArray.length * 2 - 1;
			for (let i = 0; i < colChildren.length; i++) {
				var colChild = colChildren[i];
				if (colChild == null) {
					continue;
				}
				// We only care about treecols.  The splitters do not need to be marked
				//  hidden or un-hidden.
				if (colChild.tagName == "treecol") {
					var myIndex = -1;
					var myWidth = -1;
					for (let j = 0; j < aColumnStatesArray.length; j++) {
						var myColumnArray = aColumnStatesArray[j].split(":");
						if (colChild.id == myColumnArray[0]) {
							myIndex = j;
							if (myColumnArray[1] && myColumnArray[1] != "") {
								myWidth = myColumnArray[1];
							}
							break;
						}
					}
					if (myIndex != -1) {
						var myShownOrdinal = 1 + 2 * myIndex;
						if (colChild.getAttribute("ordinal") != myShownOrdinal) {
							colChild.setAttribute("ordinal", myShownOrdinal);
							colChild.style.MozBoxOrdinalGroup = myShownOrdinal;
						}
						if (colChild.getAttribute("hidden") == "true") {
							colChild.removeAttribute("hidden");
						}
						if (myWidth != -1) {
							colChild.setAttribute("width", myWidth);
						}
					} else {
						if (colChild.getAttribute("ordinal") != myHiddenOrdinal) {
							colChild.setAttribute("ordinal", myHiddenOrdinal);
							colChild.style.MozBoxOrdinalGroup = myHiddenOrdinal;
						}
						if (colChild.getAttribute("hidden") != "true") {
							colChild.setAttribute("hidden", "true");
						}
						myHiddenOrdinal = myHiddenOrdinal + 2;
					}
				}
			}
			cardbookRepository.cardbookReorderMode = "NOREORDER";
		},
  
		seColumnsSort: function (aColumnSortResource, aColumnSortDirection) {
			document.getElementById("cardsTree").setAttribute("sortDirection", aColumnSortDirection);
			document.getElementById("cardsTree").setAttribute("sortResource", aColumnSortResource);
		},

		getColumnsState: function () {
			var columnStates = [];
			var colChildren = document.getElementById("cardsTreecols").children;
			for (let i = 0; i < colChildren.length; i++) {
				var colChild = colChildren[i];
				if (colChild.tagName != "treecol") {
					continue;
				}
				if (colChild.getAttribute("hidden") != "true") {
					columnStates.push([colChild.id + ":" + colChild.getAttribute("width"), colChild.getAttribute("ordinal")]);
				}
			}
			cardbookRepository.cardbookUtils.sortArrayByNumber(columnStates,1,1);
			var result = [];
			for (let i = 0; i < columnStates.length; i++) {
				result.push(columnStates[i][0]);
			}
			return result.join(',');
		},

		saveColumnsState: function () {
			if (cardbookRepository.cardbookSearchMode === "SEARCH") {
				return;
			}
			var myTree = document.getElementById('accountsOrCatsTree');
			if (myTree.currentIndex != -1) {
				var myAccountId = myTree.view.getCellText(myTree.currentIndex, myTree.columns.getNamedColumn('accountRoot'));
				cardbookRepository.cardbookPreferences.setDisplayedColumns(myAccountId, cardbookTreeUtils.getColumnsState());
			}
		},

		saveColumnsSort: function () {
			if (cardbookRepository.cardbookSearchMode === "SEARCH") {
				return;
			}
			var myTree = document.getElementById('accountsOrCatsTree');
			if (myTree.currentIndex != -1) {
				var myAccountId = myTree.view.getCellText(myTree.currentIndex, myTree.columns.getNamedColumn('accountRoot'));
				cardbookRepository.cardbookPreferences.setSortDirection(myAccountId, document.getElementById("cardsTree").getAttribute("sortDirection"));
				cardbookRepository.cardbookPreferences.setSortResource(myAccountId, document.getElementById("cardsTree").getAttribute("sortResource"));
			}
		},

		setSelectedAccount: function (aAccountId, aFirstVisibleRow, aLastVisibleRow) {
			var myTree = document.getElementById('accountsOrCatsTree');
			if (aAccountId == "" || myTree.view.rowCount <= 0) {
				return;
			}
			var foundIndex = Array.from(cardbookDirTree.visibleData.map(item => item[cardbookDirTree.COL_ID])).indexOf(aAccountId) || 0;
			myTree.view.selection.select(foundIndex);
			if (foundIndex < aFirstVisibleRow || foundIndex > aLastVisibleRow) {
				myTree.scrollToRow(foundIndex);
			} else {
				myTree.scrollToRow(aFirstVisibleRow);
			}
		}

	};
};
