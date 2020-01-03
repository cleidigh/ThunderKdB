var caDialog = {};

const NOT_CHECKED = "chrome://messenger/skin/icons/notchecked.gif";
const CHECK = "chrome://messenger/skin/icons/check.gif";

caDialog.startup = function () {
	var listitem;

	var onClickCheck = function (event) {
		var tree = this;
		// get the row, col and child element at the point
		var cell = tree.getCellAt(event.clientX, event.clientY);
		if (cell.col != null && cell.col.id.indexOf("CheckCol") > 0) {
			var checked = tree.view.getCellValue(cell.row, cell.col) == "true";
			var item = tree.children[1].children[cell.row];
			var cells = item.getElementsByTagName("treecell");
			for (var i = 0, len = cells.length; i < len; i++) {
				cells[i].setAttribute("properties", checked ? 'checked' : '');
			}
			caDialog.checkAllChecked();
		}
	};

	//自ドメインあて先リスト
	var internals = window.arguments[1];
	var internalList = document.getElementById("yourDomains");
	for (var i = 0, ilen = internals.length; i < ilen; i++) {
		listitem = caDialog.createListItem(internals[i]);
		internalList.appendChild(listitem);
	}
	internalList.parentNode.onclick = onClickCheck;

	//他ドメインあて先リスト
	var externals = window.arguments[2];
	var externalList = document.getElementById("otherDomains");
	for (var j = 0, elen = externals.length; j < elen; j++) {
		listitem = caDialog.createListItem(externals[j]);
		externalList.appendChild(listitem);
	}
	externalList.parentNode.onclick = onClickCheck;

	//自ドメインあて先リストヘッダ イベント設定
	var yourDomainsHeader = document.getElementById("yourDomainsCheckCol");
	var isBatchCheckYour = nsPreferences.getBoolPref(CA_CONST.IS_BATCH_CHECK_MYDOMAIN);
	if (isBatchCheckYour){
		yourDomainsHeader.setAttribute("src", NOT_CHECKED);
		yourDomainsHeader.onclick = function() {
			caDialog.switchInternalCheckBox(internalList);
		};
	}

	//他ドメインあて先リストヘッダ イベント設定
	var otherDomainsHeader = document.getElementById("otherDomainsCheckCol");
	var isBatchCheckOther = nsPreferences.getBoolPref(CA_CONST.IS_BATCH_CHECK_OTHERDOMAIN);
	if (isBatchCheckOther){
		otherDomainsHeader.setAttribute("src", NOT_CHECKED);
		otherDomainsHeader.onclick = function() {
			caDialog.switchInternalCheckBox(externalList);
		};
	}

	document.addEventListener("dialogaccept", caDialog.doOK);
	document.addEventListener("dialogcancel", caDialog.doCancel);
};

caDialog.createListItem = function (item) {
	var listitem = document.createElement("treeitem");
	var row = document.createElement("treerow");
	listitem.appendChild(row);

	var checkCell = document.createElement("treecell");
	row.appendChild(checkCell);

	var typeCell = document.createElement("treecell");
	typeCell.setAttribute("editable", "false");
	typeCell.setAttribute("label", item.type);
	row.appendChild(typeCell);

	var labelCell = document.createElement("treecell");
	labelCell.setAttribute("editable", "false");
	labelCell.setAttribute("label", item.address);
	labelCell.setAttribute("flex", "1");
	row.appendChild(labelCell);

	listitem.checkbox = checkCell;
	return listitem;
};


caDialog.checkAllChecked = function () {
	var internalComplete = true,
		externalComplete = true;

	//自ドメインのチェック状況を確認
	var yourdomains = document.getElementById("yourDomainsTree"),
		yourdomainsCheckCol = yourdomains.columns.getNamedColumn("yourDomainsCheckCol");
	if (yourdomains.view.rowCount > 0) {
		for (var i = 0, ylen = yourdomains.view.rowCount; i < ylen; i++) {
			if (yourdomains.view.getCellValue(i, yourdomainsCheckCol) !== 'true') {
				internalComplete = false;
			}
		}
	    var isBatchCheckYour = nsPreferences.getBoolPref(CA_CONST.IS_BATCH_CHECK_MYDOMAIN);
		if (isBatchCheckYour) {
			// 全て選択チェックもつけておく
			var yourDomainsHeader = document.getElementById("yourDomainsCheckCol");
			yourDomainsHeader.setAttribute("src", internalComplete ? CHECK : NOT_CHECKED);
		}
	}

	//他ドメインのチェック状況を確認
	var otherdomains = document.getElementById("otherDomainsTree"),
		otherdomainsCheckCol = otherdomains.columns.getNamedColumn("otherDomainsCheckCol");
	if (otherdomains.view.rowCount > 0) {
		for (var j = 0, len = otherdomains.view.rowCount; j < len; j++){
			if (otherdomains.view.getCellValue(j, otherdomainsCheckCol) !== 'true') {
				externalComplete = false;
			}
		}
		var isBatchCheckOther = nsPreferences.getBoolPref(CA_CONST.IS_BATCH_CHECK_OTHERDOMAIN);
		if (isBatchCheckOther) {
			// 全て選択チェックもつけておく
			var otherDomainsHeader = document.getElementById("otherDomainsCheckCol");
			otherDomainsHeader.setAttribute("src", externalComplete ? CHECK : NOT_CHECKED);
		}
	}

	//送信ボタンのdisable切り替え
	var okBtn = document.documentElement.getButton("accept");
	okBtn.disabled = !(internalComplete && externalComplete);
};


//呼び出しドメインのアドレスのすべての確認ボックスをONまたはOFFにする。
caDialog.switchInternalCheckBox = function (targetdomains) {
	var tree = targetdomains.parentNode,
		checkColId = tree.getAttribute("id").replace("Tree", "CheckCol"),
		checkCol = tree.columns.getNamedColumn(checkColId),
		checkHeader = document.getElementById(checkColId),
		items = targetdomains.children,
		view = tree.view;

	var checked = checkHeader.getAttribute("src") === NOT_CHECKED;
	for (var i = 0, len = view.rowCount; i < len; i++) {
			var listitem = items[i];
			view.setCellValue(i, checkCol, String(checked));
			var cells = listitem.getElementsByTagName("treecell");
			for (var j = 0, clen = cells.length; j < clen; j++) {
				cells[j].setAttribute("properties", checked ? 'checked' : '');
			}
	}

	caDialog.checkAllChecked();
};


caDialog.doOK = function () {
	window.arguments[0].setConfirmOK(true);
	return true;
};


caDialog.doCancel = function () {
	window.arguments[0].setConfirmOK(false);
	return true;
};

class MozTreecolImage extends customElements.get("treecol") {
  static get observedAttributes() {
    return ["src"];
  }

  connectedCallback() {
    this.image = document.createElement("image");
    this.image.classList.add("treecol-icon");

    this.appendChild(this.image);
    this._updateAttributes();
  }

  attributeChangedCallback() {
    this._updateAttributes();
  }

  _updateAttributes() {
    if (!this.isConnected || !this.image) {
      return;
    }

    const src = this.getAttribute("src");

    if (src != null) {
      this.image.setAttribute("src", src);
    } else {
      this.image.removeAttribute("src");
    }
  }
}

customElements.define("treecol-image", MozTreecolImage, { extends: "treecol" });
