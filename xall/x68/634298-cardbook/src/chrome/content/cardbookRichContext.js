if ("undefined" == typeof(cardbookRichContext)) {
	var { cardbookRepository } = ChromeUtils.import("chrome://cardbook/content/cardbookRepository.js");

	var cardbookRichContext = {

		loadRichContext: function(aEvent) {
			if (aEvent.target.id == "textbox-contextmenu") {
				var textbox = document.activeElement;
				var menu = aEvent.target;
				var nodes = menu.querySelectorAll(".cardbookMenuItem");
				for (var node of nodes) {
					node.remove();
				}
	
				var menuSeparator = document.createXULElement("menuseparator");
				menuSeparator.setAttribute("id", 'cardbookSeparator::' + textbox.id);
				menuSeparator.setAttribute("class", "cardbookMenuItem");
				menu.appendChild(menuSeparator);
	
				var menuItem = document.createXULElement("menuitem");
				menuItem.setAttribute("id", 'cardbookToUpperCase::' + textbox.id);
				menuItem.addEventListener("command", function(aEvent) {
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
						myTextbox.dispatchEvent(new Event('input'));
					}, false);
				menuItem.setAttribute("label", cardbookRepository.extension.localeData.localizeMessage("toUpperCase"));
				menuItem.setAttribute("class", "cardbookMenuItem");
				menu.appendChild(menuItem);
				if (aEvent.target.getAttribute("readonly") == "true") {
					menuItem.disabled = true;
				} else if (textbox.selectionStart == textbox.selectionEnd) {
					menuItem.disabled = true;
				} else {
					menuItem.disabled = false;
				}
				
				var menuItem = document.createXULElement("menuitem");
				menuItem.setAttribute("id", 'cardbookToLowerCase::' + textbox.id);
				menuItem.addEventListener("command", function(aEvent) {
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
						myTextbox.dispatchEvent(new Event('input'));
					}, false);
				menuItem.setAttribute("label", cardbookRepository.extension.localeData.localizeMessage("toLowerCase"));
				menuItem.setAttribute("class", "cardbookMenuItem");
				menu.appendChild(menuItem);
				if (aEvent.target.getAttribute("readonly") == "true") {
					menuItem.disabled = true;
				} else if (textbox.selectionStart == textbox.selectionEnd) {
					menuItem.disabled = true;
				} else {
					menuItem.disabled = false;
				}
			}
		},

		// don't have found a better way to add a contextual menu to a html:textarea or html:input
		fireBasicFieldContext: function(aEvent) {
			var textbox = document.activeElement;
			if (!textbox.getAttribute('fieldName')) {
				return;
			}
			aEvent.stopImmediatePropagation();
			var menu = document.getElementById("basicFieldContextMenu");
			while (menu.hasChildNodes()) {
				menu.lastChild.remove();
			}

			var menuItem = document.createXULElement("menuitem");
			menuItem.setAttribute("id", 'cardbookCopyFieldValue::' + textbox.id);
			if (textbox.getAttribute('fieldLabel')) {
				var fieldLabel = textbox.getAttribute('fieldLabel');
			} else {
				var fieldLabel = cardbookRepository.extension.localeData.localizeMessage(textbox.getAttribute('fieldName') + "Label");
			}
			var message = cardbookRepository.extension.localeData.localizeMessage("copyFieldValue", [fieldLabel]);
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

			var myPoint = document.elementFromPoint(event.clientX, event.clientY);
			document.getElementById('basicFieldContextMenu').openPopup(myPoint, 'after_start', 0, 0, true);
		},

		// don't have found a better way to add a contextual menu to a html:textarea or html:input
		fireTypeContext: function(aEvent) {
			if (wdw_cardbook) {
				aEvent.stopImmediatePropagation();
				var myType = event.target.id.split('_')[0];
				wdw_cardbook.setCurrentTypeFromEvent(aEvent);
				var myPoint = document.elementFromPoint(aEvent.clientX, aEvent.clientY);
				document.getElementById(myType +'TreeContextMenu').openPopup(myPoint, 'after_start', 0, 0, true);
			}
		}
	};
};
