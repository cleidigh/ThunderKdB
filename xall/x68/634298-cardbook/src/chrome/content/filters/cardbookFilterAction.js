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
/* test
class MozAbPickerSearch extends MozSearchValue {
  connectedCallback() {
    if (this.delayConnectedCallback()) {
      return;
    }
    this.textContent = "";
    this.appendChild(MozXULElement.parseXULToFragment(`
      <menulist flex="1" class="search-value-menulist" inherits="disabled" sizetopopup="none" oncommand="this.parentNode.setAttribute('value', this.value);">
        <menupopup class="search-value-popup" anonid="abPickerSearch-menupopup"></menupopup>
      </menulist>
    `));

    let value = this.getAttribute("value");
    let menulist = document.getAnonymousNodes(this)[0];
    let menupopup = document.getAnonymousElementByAttribute(this, "anonid", "abPickerSearch-menupopup");

    var { XPCOMUtils } = ChromeUtils.import("resource://gre/modules/XPCOMUtils.jsm");
    XPCOMUtils.defineLazyModuleGetter(this, "cardbookRepository", "chrome://cardbook/content/cardbookRepository.js", "cardbookRepository");
    var defaultIndex = 0;
    var defaultValue = "";
    var found = false;
    var k = 0;
    for (let account of cardbookRepository.cardbookAccounts) {
      if (account[5] && account[6] != "SEARCH") {
        var dirPrefId = account[4];
        var dirPrefName = account[0];
        this.addDirectories(menupopup, dirPrefId, dirPrefName);
        if (!found) {
          defaultValue = dirPrefId;
          found = true;
        }
        if (dirPrefId == value) {
          defaultIndex = k;
          defaultValue = dirPrefId;
        }
        k++;

        for (let category of cardbookRepository.cardbookAccountsCategories[dirPrefId]) {
          this.addDirectories(menupopup, dirPrefId + "::" + category, dirPrefName + " / " + category);
          if (dirPrefId + "::" + category == value) {
            defaultIndex = k;
            defaultValue = dirPrefId + "::" + category;
          }
          k++;
        }
      }
    }

    menulist.selectedIndex = defaultIndex;
    menulist.setAttribute("value", defaultValue);

  }

  addDirectories(aMenuPopup, aMenuValue, aMenuLabel) {
    let newMenuItem = document.createXULElement('menuitem');
    newMenuItem.setAttribute('label', aMenuLabel);
    newMenuItem.setAttribute('value', aMenuValue);
    aMenuPopup.appendChild(newMenuItem);
  }
}
customElements.define("abPickerSearch", MozAbPickerSearch);
*/