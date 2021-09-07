var { cardbookRepository } = ChromeUtils.import("chrome://cardbook/content/cardbookRepository.js");

var cardbookDirTree = {
	COL_NAME: 0,
	COL_IS_CONTAINER: 1,
	COL_IS_OPEN: 2,
	COL_IS_EMPTY: 3,
	COL_ID: 4,
	COL_ENABLED: 5,
	COL_TYPE: 6,
	COL_READONLY: 7,
	COL_ROOT: 8,

	openedNodes: [],
	visibleData: [],
	childData: {},
	treeBox: null,
	selection: null,
	get rowCount() { return this.visibleData.length; },
	setTree: function(treeBox) { this.treeBox = treeBox; },
	getCellText: function(idx, column) {
		if (this.visibleData[idx]) {
			if (column.id == "accountColor") return "";
			else if (column.id == "accountName") return this.visibleData[idx][this.COL_NAME];
			else if (column.id == "accountId") return this.visibleData[idx][this.COL_ID];
			else if (column.id == "accountType") return this.visibleData[idx][this.COL_TYPE];
			else if (column.id == "accountRoot") return this.visibleData[idx][this.COL_ROOT];
			else if (column.id == "accountStatusCheckbox") return "";
			else if (column.id == "accountTypeCheckbox") return "";
			else if (column.id == "dummyForScroll") return "";
		} else {
			return false;
		}
	},
	getCellValue: function(idx, column) {
		if (column.id == "accountStatusCheckbox") return "";
		else if (column.id == "accountTypeCheckbox") return "";
		else if (column.id == "dummyForScroll") return "";
	},
	setCellValue: function(idx, column) { return false; },
	getRowProperties: function(idx) { return "" },
	getColumnProperties: function(column) { return column.id },
	getCellProperties: function(idx, column) {
		if (column.id == "accountColor" && this.visibleData[idx][this.COL_TYPE] != "SEARCH") {
			if (this.visibleData[idx][this.COL_TYPE] == "categories") {
				return "color_category_" + cardbookRepository.cardbookUtils.formatCategoryForCss(this.visibleData[idx][this.COL_NAME]);
			} else {
				return "color_" + this.visibleData[idx][this.COL_ID];
			}
		} else if (column.id == "accountTypeCheckbox" && this.getLevel(idx) == 0) {
			return cardbookRepository.getABIconType(this.visibleData[idx][this.COL_TYPE]);
		} else if (column.id == "accountStatusCheckbox" && this.getLevel(idx) == 0 && this.visibleData[idx][this.COL_ENABLED] && this.visibleData[idx][this.COL_TYPE] != "SEARCH") {
			return cardbookRepository.getABStatusType(this.visibleData[idx][this.COL_ID]);
		}
	},
	canDrop: function(idx) {
		return (this.visibleData[idx][this.COL_ENABLED]
					&& !this.visibleData[idx][this.COL_READONLY]
					&& this.visibleData[idx][this.COL_TYPE] != "SEARCH"
					&& !(this.visibleData[idx][this.COL_TYPE] == "CAT"
							&& this.visibleData[this.getParentIndex(idx)][this.COL_TYPE] == "SEARCH"));
	},
	isContainer: function(idx) { return this.visibleData[idx][this.COL_IS_CONTAINER]; },
	isContainerOpen: function(idx) { return this.visibleData[idx][this.COL_IS_OPEN]; },
	isContainerEmpty: function(idx) { return this.visibleData[idx][this.COL_IS_EMPTY]; },
	cycleHeader: function(idx) { return false },
	isSeparator: function(idx) { return false; },
	isSorted: function() { return false; },
	isEditable: function(idx, column) { return false; },
	getParentIndex: function(idx) {
		var level = this.getLevel(idx);
		if (level == 0) return -1;
		for (var t = idx - 1; t >= 0 ; t--) {
			if (this.getLevel(t) > level) return t;
		}
		return -1;
	},
	getLevel: function(idx) {
		if (this.visibleData[idx][this.COL_ID].split("::").length == 1) {
			return 0;
		} else {
			return this.visibleData[idx][this.COL_ID].split("::").length - 2; 
		}
	},
	hasNextSibling: function(idx, after) {
		var thisLevel = this.getLevel(idx);
		for (var t = idx + 1; t < this.visibleData.length; t++) {
			var nextLevel = this.getLevel(t)
			if (nextLevel == thisLevel) return true;
			else if (nextLevel < thisLevel) return false;
		}
	},
	toggleOpenState: function(idx, column){
		var item = this.visibleData[idx];
		if (!item[this.COL_IS_CONTAINER]) return;
		wdw_cardbook.expandOrContractAddressbook(item[this.COL_ID], !item[this.COL_IS_OPEN]);
		if (item[this.COL_IS_OPEN]) {
			item[this.COL_IS_OPEN] = false;
			var thisLevel = this.getLevel(idx);
			var deletecount = 0;
			for (var t = idx + 1; t < this.visibleData.length; t++) {
				if (this.getLevel(t) > thisLevel) deletecount++;
				else break;
			}
			if (deletecount) {
				this.visibleData.splice(idx + 1, deletecount);
				this.treeBox.rowCountChanged(idx + 1, -deletecount);
				this.openedNodes = Array.from(this.visibleData.filter(item => item[this.COL_IS_OPEN] === true)).map(item => item[this.COL_ID]);
			}
		} else {
			item[this.COL_IS_OPEN] = true;
			var expandedCount = cardbookDirTreeUtils.expandDescendants(idx);
			this.treeBox.rowCountChanged(idx + 1, expandedCount);
			this.openedNodes.push(item[this.COL_ID]);
		}
	}
};

var cardbookDirTreeUtils = {
	
	newArray: [],
	
	filterTree: function() {
		if (document.getElementById('accountsOrCatsTreeMenulist')) {
			var accountsShown = document.getElementById('accountsOrCatsTreeMenulist').value;
		} else {
			var accountsShown = cardbookRepository.cardbookPreferences.getStringPref("extensions.cardbook.accountsShown");
		}
		var typeColumn = document.getElementById('accountTypeCheckbox');
		var colorColumn = document.getElementById('accountColor');
		cardbookDirTreeUtils.newArray = JSON.parse(JSON.stringify(cardbookRepository.cardbookAccounts));
		
		typeColumn.removeAttribute('hidden');
		if (cardbookRepository.useColor == "nothing") {
			colorColumn.setAttribute("hidden", true);
		} else {
			colorColumn.removeAttribute('hidden');
		}
		switch(accountsShown) {
			case "enabled":
				cardbookDirTreeUtils.newArray = cardbookDirTreeUtils.newArray.filter(child => child[cardbookDirTree.COL_ENABLED]);
				break;
			case "disabled":
				cardbookDirTreeUtils.newArray = cardbookDirTreeUtils.newArray.filter(child => (!child[cardbookDirTree.COL_ENABLED]));
				break;
			case "local":
				cardbookDirTreeUtils.newArray = cardbookDirTreeUtils.newArray.filter(child => child[cardbookDirTree.COL_TYPE] == "LOCALDB" || child[cardbookDirTree.COL_TYPE] == "FILE" || child[cardbookDirTree.COL_TYPE] == "DIRECTORY");
				typeColumn.setAttribute('hidden', 'true');
				break;
			case "remote":
				cardbookDirTreeUtils.newArray = cardbookDirTreeUtils.newArray.filter(child => cardbookRepository.cardbookUtils.isMyAccountRemote(child[cardbookDirTree.COL_TYPE]));
				typeColumn.setAttribute('hidden', 'true');
				break;
			case "search":
				cardbookDirTreeUtils.newArray = cardbookDirTreeUtils.newArray.filter(child => child[cardbookDirTree.COL_TYPE] == "SEARCH");
				typeColumn.setAttribute('hidden', 'true');
				colorColumn.setAttribute('hidden', 'true');
				break;
		};
		return cardbookDirTreeUtils.newArray;
	},

	childToVisibleDataCat: function(id, child, root, enabled, readonly, node) {
		let isContainer = false;
		let isContainerOpen = false;
		return [child, isContainer, isContainerOpen, false, id + "::" + child, enabled, node, readonly, root];
	},

	childToVisibleDataNode: function(id, child, root, enabled, readonly, node) {
		let isContainer = child.children.length > 0;
		let isContainerOpen = cardbookDirTree.openedNodes.includes(id + "::" + child.data);
		return [child.data, isContainer, isContainerOpen, false, id + "::" + child.data, enabled, node, readonly, root];
	},

	expandDescendants: function(idx) {
		var item = cardbookDirTree.visibleData[idx];
		if (!item[cardbookDirTree.COL_IS_CONTAINER] || !item[cardbookDirTree.COL_IS_OPEN]) return 0;
		var root = item[cardbookDirTree.COL_ROOT];
		var enabled = item[cardbookDirTree.COL_ENABLED];
		var readonly = item[cardbookDirTree.COL_READONLY];
		var node = cardbookRepository.cardbookPreferences.getNode(root);
		if (item[cardbookDirTree.COL_ROOT] == item[cardbookDirTree.COL_ID]) {
			id = item[cardbookDirTree.COL_ID] + "::" + node;
		} else {
			id = item[cardbookDirTree.COL_ID];
		}
		var name = item[cardbookDirTree.COL_NAME];
		if (node == "categories") {
			var toinsert = cardbookRepository.cardbookAccountsCategories[root];
			for (var i = 0; i < toinsert.length; i++) {
				let child = toinsert[i];
				cardbookDirTree.visibleData.splice(idx + i + 1, 0, this.childToVisibleDataCat(id, child, root, enabled, readonly, node));
			}
			return toinsert.length;
		} else {
			var toinsert = cardbookRepository.cardbookAccountsNodes[root].filter(child => cardbookRepository.getParentOrg(child.id) == id);
			if (toinsert) {
				for (var i = 0; i < toinsert.length; i++) {
					let child = toinsert[i];
					cardbookDirTree.visibleData.splice(idx + i + 1, 0, this.childToVisibleDataNode(id, child, root, enabled, readonly, node));
				}
				return toinsert.length;
			}
		}
		return 0;
	},

	expandVisible: function() {
		for (var idx = 0; idx < cardbookDirTree.visibleData.length; idx++) {
			let expandedCount = this.expandDescendants(idx);
		}
	}
};
