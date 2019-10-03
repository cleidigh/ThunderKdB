(function() {
	var project = com.namespace("com.github.shimamu.asbcustom.input_helper");

	function inputHelperCommand() {
		var peopleSearchInput = document.getElementById("peopleSearchInput");
		peopleSearchInput.value = this.label + " ";
		peopleSearchInput.focus();
		//gContentChanged=true;
		//SetComposeWindowTitle();
	}

	var Keyword = {
		create(index) {
			var keyword = Object.create(Keyword.prototype);
			keyword.index = index;
			var value = com.github.shimamu.asbcustom.customPrefs.prefs.copyUnicharPref(
				"asbcustom_input_helper.searchWord" + index);
			keyword.value = value;
			return keyword;
		},
		prototype: {
			isBlank() {
				return (this.value == "");
			},
			build(out) {
				out.put(this.value);
			}
		}
	}

	var Keywords = {
		create(element) {
			var keywords = Object.create(Keywords.prototype);
			keywords.element = element;
			keywords.list = [];
			return keywords;
		},
		length() {
			var num = com.github.shimamu.asbcustom.customPrefs.prefs.getIntPref(
				"asbcustom_input_helper.searchWord.num", 0);
			return num;
		},
		prototype: {
			clearElement() {
				while (this.element.firstChild) {
					this.element.removeChild(this.element.firstChild);
				}
			},
			load() {
				var keyLen = Keywords.length();
				for (var i = 0; i < keyLen; i++) {
					var keyword = Keyword.create(i);
					if (!keyword.isBlank()) {
						this.list.push(keyword);
					}
				}
			},
			resetElement() {
				this.clearElement();
				this.load();

				var menupopup = this.element;
				this.list.forEach(function(keyword) {
					var menuitem = document.createElement("menuitem");
					var out = {
						put(value) {
							menuitem.setAttribute("label", value);
							menuitem.addEventListener("command", inputHelperCommand, false)
							menupopup.appendChild(menuitem);
						}
					}
					keyword.build(out);
				});

			}
		}
	}

	function loadMenu(menupopup) {
		var keywords = Keywords.create(menupopup);
		keywords.resetElement();
	}

	project.loadMenu = loadMenu;
}());
