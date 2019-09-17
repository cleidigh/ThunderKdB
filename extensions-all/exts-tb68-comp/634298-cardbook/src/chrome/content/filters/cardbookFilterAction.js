var { MailServices } = ChromeUtils.import("resource:///modules/MailServices.jsm");
var { Services } = ChromeUtils.import("resource://gre/modules/Services.jsm");

class MozRuleactiontargetCardBookActionABPicker extends MozXULElement {
	connectedCallback() {
		const menulist = document.createXULElement("menulist");
		const menuPopup = document.createXULElement("menupopup");

		menulist.classList.add("ruleactionitem");
		menulist.setAttribute("flex", "1");
		menulist.appendChild(menuPopup);

		var { cardbookRepository } = ChromeUtils.import("chrome://cardbook/content/cardbookRepository.js");
		var { cardbookPreferences } = ChromeUtils.import("chrome://cardbook/content/preferences/cardbookPreferences.js");
		var result = [];
		result = cardbookPreferences.getAllPrefIds();
		for (let i = 0; i < result.length; i++) {
			var myPrefId = result[i];
			var myPrefName = cardbookPreferences.getName(myPrefId);
			if (cardbookPreferences.getEnabled(myPrefId) && (cardbookPreferences.getType(myPrefId) !== "SEARCH") && !cardbookPreferences.getReadOnly(myPrefId)) {
				const newMenuItem = document.createXULElement("menuitem");
				newMenuItem.setAttribute('label', myPrefName);
				newMenuItem.setAttribute('value', myPrefId);
				menuPopup.appendChild(newMenuItem);

				for (let category of cardbookRepository.cardbookAccountsCategories[myPrefId]) {
					const newMenuItem = document.createXULElement("menuitem");
					newMenuItem.setAttribute('label', myPrefName + " / " + category);
					newMenuItem.setAttribute('value', myPrefId + "::" + category);
					menuPopup.appendChild(newMenuItem);
				}
			}
		}

		this.appendChild(menulist);
		updateParentNode(this.closest(".ruleaction"));
	}
}

customElements.define("cardbookABActionPicker", MozRuleactiontargetCardBookActionABPicker);

// MozRuleactiontargetWrapper.prototype._getChildNode
(function() {
	// Keep a reference to the original function.
	var _original = MozRuleactiontargetWrapper.prototype._getChildNode;
	
	// Override a function.
	MozRuleactiontargetWrapper.prototype._getChildNode = function() {
		
		// Execute some action afterwards.
		switch(arguments[0]) {
			case "cardbook#addFrom":
			case "cardbook#addTo":
			case "cardbook#addCc":
			case "cardbook#addBcc":
			case "cardbook#addAll":
			case "cardbook#removeFrom":
			case "cardbook#removeTo":
			case "cardbook#removeCc":
			case "cardbook#removeBcc":
			case "cardbook#removeAll":
				return document.createXULElement("cardbookABActionPicker");
				break;
			default:
				return _original.apply(null, arguments);
				break;
		}
	};
})();
