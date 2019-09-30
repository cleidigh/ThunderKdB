if ("undefined" == typeof(cardbookRichContext)) {
	var { XPCOMUtils } = ChromeUtils.import("resource://gre/modules/XPCOMUtils.jsm");
	XPCOMUtils.defineLazyModuleGetter(this, "cardbookRepository", "chrome://cardbook/content/cardbookRepository.js", "cardbookRepository");

	var cardbookRichContext = {

		loadRichContext: function(aEvent) {
			if (aEvent.target.inputField) {
				var myTextbox = document.popupNode.parentNode.parentNode;
				var myInputbox = document.getAnonymousElementByAttribute(myTextbox, "anonid", "moz-input-box");
				var myMenu = myInputbox.menupopup;
				var nodes = myMenu.querySelectorAll(".cardbookMenuItem");
				for (var node of nodes) {
					node.remove();
				}
	
				var myMenuSeparator = document.createXULElement("menuseparator");
				myMenuSeparator.setAttribute("id", 'cardbookSeparator::' + aEvent.target.id);
				myMenuSeparator.setAttribute("class", "cardbookMenuItem");
				myMenu.appendChild(myMenuSeparator);
	
				var myMenuItem = document.createXULElement("menuitem");
				myMenuItem.setAttribute("id", 'cardbookToUpperCase::' + aEvent.target.id);
				myMenuItem.addEventListener("command", function(aEvent) {
						var tmpArray = this.id.split('::');
						var myTextbox = document.getElementById(tmpArray[1]);
						var myTextboxValue = myTextbox.value;
						var result = "";
						for (var i = 0; i < myTextboxValue.length; i++) {
							if (i >= myTextbox.selectionStart && i < myTextbox.selectionEnd) {
								result = result + myTextboxValue[i].toUpperCase();
							} else {
								result = result + myTextboxValue[i];
							}
						}
						myTextbox.value = result;
						if (myTextbox.oninput) {
							myTextbox.oninput();
						}
					}, false);
				myMenuItem.setAttribute("label", cardbookRepository.strBundle.GetStringFromName("toUpperCase"));
				myMenuItem.setAttribute("class", "cardbookMenuItem");
				myMenu.appendChild(myMenuItem);
				if (aEvent.target.getAttribute("readonly") == "true") {
					myMenuItem.disabled = true;
				} else if (aEvent.target.selectionStart == aEvent.target.selectionEnd) {
					myMenuItem.disabled = true;
				} else {
					myMenuItem.disabled = false;
				}
				
				var myMenuItem = document.createXULElement("menuitem");
				myMenuItem.setAttribute("id", 'cardbookToLowerCase::' + aEvent.target.id);
				myMenuItem.addEventListener("command", function(aEvent) {
						var tmpArray = this.id.split('::');
						var myTextbox = document.getElementById(tmpArray[1]);
						var myTextboxValue = myTextbox.value;
						var result = "";
						for (var i = 0; i < myTextboxValue.length; i++) {
							if (i >= myTextbox.selectionStart && i < myTextbox.selectionEnd) {
								result = result + myTextboxValue[i].toLowerCase();
							} else {
								result = result + myTextboxValue[i];
							}
						}
						myTextbox.value = result;
						if (myTextbox.oninput) {
							myTextbox.oninput();
						}
					}, false);
				myMenuItem.setAttribute("label", cardbookRepository.strBundle.GetStringFromName("toLowerCase"));
				myMenuItem.setAttribute("class", "cardbookMenuItem");
				myMenu.appendChild(myMenuItem);
				if (aEvent.target.getAttribute("readonly") == "true") {
					myMenuItem.disabled = true;
				} else if (aEvent.target.selectionStart == aEvent.target.selectionEnd) {
					myMenuItem.disabled = true;
				} else {
					myMenuItem.disabled = false;
				}
			}
		},

		loadCopyContext: function(aEvent) {
			if (aEvent.target.inputField) {
				var textbox = document.popupNode.parentNode.parentNode;
				if (!textbox.getAttribute('fieldName')) {
					return;
				}
				var inputbox = document.getAnonymousElementByAttribute(textbox, "anonid", "moz-input-box");
				var menu = inputbox.menupopup;
				while (menu.hasChildNodes()) {
					menu.lastChild.remove();
				}

				var menuItem = document.createXULElement("menuitem");
				menuItem.setAttribute("id", 'cardbookCopyFieldValue::' + aEvent.target.id);
				if (textbox.getAttribute('fieldLabel') != "") {
					var fieldLabel = textbox.getAttribute('fieldLabel');
				} else {
					var fieldLabel = cardbookRepository.strBundle.GetStringFromName(textbox.getAttribute('fieldName') + "Label");
				}
				var message = cardbookRepository.strBundle.formatStringFromName("copyFieldValue", [fieldLabel], 1);
				menuItem.addEventListener("command", function(aEvent) {
						var tmpArray = this.id.split('::');
						var textbox1 = document.getElementById(tmpArray[1]);
						var fieldName = textbox1.getAttribute('fieldName');
						if (cardbookRepository.dateFields.includes(fieldName)) {
							wdw_cardbook.copyFieldValue(fieldName, fieldLabel, "", "");
						} else if (cardbookRepository.newFields.includes(fieldName)) {
							wdw_cardbook.copyFieldValue(fieldName, fieldLabel, "", "");
						} else if (fieldName.startsWith("X-") || fieldName == 'org') {
							wdw_cardbook.copyFieldValue(fieldName, fieldLabel, "", textbox1.value);
						} else if (fieldName.startsWith("org.")) {
							wdw_cardbook.copyFieldValue(fieldName, fieldLabel, "", textbox1.value, textbox1.getAttribute('allValue'));
						} else {
							wdw_cardbook.copyFieldValue(fieldName, fieldLabel, "", "");
						}
					}, false);
				menuItem.setAttribute("label", message);
				menu.appendChild(menuItem);
			} else {
				aEvent.stopImmediatePropagation();
			}
		}
	};
};
