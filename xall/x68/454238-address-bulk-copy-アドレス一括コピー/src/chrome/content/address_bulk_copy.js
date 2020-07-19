"use strict";
var address_bulk_copy = {

	// メイン画面のメッセージ
	addressCopyExcludeMe: function (targetElem) {
		var addBuf = "";
		var elements = document.getElementById(targetElem);
		if ( !! elements) {
		
			// tooltipを展開する
			var elemMore = elements.more;
			if (!! elemMore) {
				elemMore.click();
				//var tooltiptext = elemMore.getAttribute("tooltiptext");
				//if (!! tooltiptext) {
				//	addBuf += (tooltiptext + ",");
				//}
			}
			
			// メールアドレス（自分以外）を取得
			var elemAddBox = elements.emailAddresses;
			if (!! elemAddBox) {
				var elemEmailAdds = elemAddBox.getElementsByTagName("mail-emailaddress");
				if (!! elemEmailAdds) {
					for (var i = 0; i < elemEmailAdds.length; i++) {
						var emailAdd = elemEmailAdds[i];
						if ((!! emailAdd) 
							&& ((emailAdd.getAttribute("label") != "(自分)") || (emailAdd.getAttribute("label") != "Me"))
							&& (emailAdd.getAttribute("hidden") != "true")) {
							addBuf += (emailAdd.getAttribute("fullAddress") + ",");
						}
					}
				}
			}
		}
		
		return addBuf;
	},
	
	bulkCopyFromMsg : function() {
		var addBuf = "";
		addBuf += this.addressCopyExcludeMe("expandedfromBox");
		addBuf += this.addressCopyExcludeMe("expandedtoBox");
		addBuf += this.addressCopyExcludeMe("expandedccBox");
		addBuf += this.addressCopyExcludeMe("expandedbccBox");
		if (addBuf != "") {
			addBuf = addBuf.substring(0, addBuf.length - 1);
			var CLIPBOARD = Components.classes["@mozilla.org/widget/clipboardhelper;1"].getService(Components.interfaces.nsIClipboardHelper);
			CLIPBOARD.copyString(addBuf);
		}
	},
	
	// 新規および返信
	bulkCopy: function () {
		var index = 1;
		var targetElem = "";
		var addBuf = "";
		while (true) {
			targetElem = "addressCol2#" + index;
			var elements = document.getElementById(targetElem);
			if ( !! elements) {
				addBuf += (elements.value + ",");
				index++;
			} else {
				break;
			}
		}
		
		if (addBuf != "") {
			addBuf = addBuf.substring(0, addBuf.length - 1);
			const CLIPBOARD = Components.classes["@mozilla.org/widget/clipboardhelper;1"].getService(Components.interfaces.nsIClipboardHelper);
			CLIPBOARD.copyString(addBuf);
		}
	},
	bulkChange: function (state) {
		var index = 1;
		var targetElem = "";
		var addBuf = "";
		while (true) {
			targetElem = "addressCol1#" + index;
			var elements = document.getElementById(targetElem);
			if ( !! elements) {
				elements.value = state;
				index++;
			} else {
				break;
			}
		}
	},
	bulkChangeTO: function () {
		this.bulkChange("addr_to");
	},
	bulkChangeCC: function () {
		this.bulkChange("addr_cc");
	},
	bulkChangeBCC: function () {
		this.bulkChange("addr_bcc");
	}
}