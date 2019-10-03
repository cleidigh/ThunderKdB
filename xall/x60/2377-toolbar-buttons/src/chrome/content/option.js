toolbar_buttons.toolbar_button_loader(toolbar_buttons, {
	loadTranslate: function() {
		var currentValue = toolbar_buttons.interfaces.ExtensionPrefBranch.getCharPref("translate.lang");
		var promtValue = toolbar_buttons.interfaces.ExtensionPrefBranch.getCharPref("translate.promt");
	
		var menulist = document.getElementById('translate-languages-menu');
		var promtlist = document.getElementById('translate-languages-promt');
			
		var loading = document.getElementById('translate-loading');
		if(!loading || !menulist || !promtlist) {
			return;
		}
		loading.setAttribute('value', currentValue);
		menulist.selectedItem = loading;
		var promtLoading = document.getElementById('translate-promt-loading');
		promtLoading.setAttribute('value', promtValue);
		promtlist.selectedItem = promtLoading;
		
		var XMLhttp = new XMLHttpRequest();
		XMLhttp.open("GET", "https://translate.google.com/");
		XMLhttp.onload = toolbar_buttons.loadTranslateOnload;
		XMLhttp.send(null);
	},
	loadTranslateOnload: function(XMLhttp) {
		var currentValue = toolbar_buttons.interfaces.ExtensionPrefBranch.getCharPref("translate.lang");
		var promtValue = toolbar_buttons.interfaces.ExtensionPrefBranch.getCharPref("translate.promt");
		var service = toolbar_buttons.interfaces.ExtensionPrefBranch.getCharPref("translate.service");
	
		var menulist = document.getElementById('translate-languages-menu');
		var promtlist = document.getElementById('translate-languages-promt');
			
		if(XMLhttp.target.readyState != 4 && XMLhttp.target.status != 200) {
			return;
		}
		
		var promt_values = ['ru', 'de', 'en', 'fr', 'es', 'it', 'pt'];
		var promt_setting = ['ar', 'ag', 'ae', 'af', 'as', 'ai', 'ap'];
			
		var data = XMLhttp.target.responseText.match(/<select[^>]*name=tl[^>]*>.*?<\/select>/);
		var items = data.toString().match(/<option.*?value="?[^>"]+"?>.*?<\/option>/g);
		var menu = document.getElementById('translate-languages-popup');
		var promt = document.getElementById('translate-promt-popup');
		while(menu.firstChild) {
			menu.removeChild(menu.firstChild);
		}
		while(promt.firstChild) {
			promt.removeChild(promt.firstChild);
		}
		for(var item in items) {
			var lang = items[item].toString().match(/<option.*?value="?([^>"]+)"?.*?>(.*?)<\/option>/);
			var menuItem = document.createElement("menuitem");
			menuItem.setAttribute("value", lang[1]);
			menuItem.setAttribute("label", lang[2] + " (" + lang[1] + ")");
			menu.appendChild(menuItem);
			if(lang[1] == currentValue) {
				menuItem.setAttribute("selected", "true");
				menulist.selectedItem = menuItem;
			}
			if(promt_values.indexOf(lang[1]) != -1) {
				var promtItem = document.createElement("menuitem");
				var value = promt_setting[promt_values.indexOf(lang[1])];
				promtItem.setAttribute("value", value);
				promtItem.setAttribute("label", lang[2] + " (" + lang[1] + ")");
				promt.appendChild(promtItem);
				if(value == promtValue) {
					promtItem.setAttribute("selected", "true");
					promtlist.selectedItem = promtItem;
				}
			}		
		}
		menulist.removeAttribute('disabled');
		promtlist.setAttribute('hidden', service != 'promt');
		menulist.setAttribute('hidden', service == 'promt');
	},
	showOtherTranslate: function() {
		var menulist = document.getElementById('translate-languages-menu');
		var promtlist = document.getElementById('translate-languages-promt');
		promtlist.setAttribute('hidden', true);
		menulist.setAttribute('hidden', false);
	},
	showPromtTranslate: function() {
		var menulist = document.getElementById('translate-languages-menu');
		var promtlist = document.getElementById('translate-languages-promt');
		promtlist.setAttribute('hidden', false);
		menulist.setAttribute('hidden', true);
	},
	loadMenuSettings: function() {
		var obj = {};
		var prefs = toolbar_buttons.interfaces.ExtensionPrefBranch;
		var children = prefs.getChildList("all-menus._menus.", obj);
		var stringBundle = toolbar_buttons.interfaces.StringBundleService
			.createBundle("chrome://toolbar-buttons/locale/button.properties");
		var tabs = document.getElementById('all-menus-tabs');
		var panels = document.getElementById('all-menus-panels');
		if(obj.value == 1) {
			tabs.setAttribute('hidden', 'true');
		}
		var counted = 0;
		for(var i = 0; i < obj.value; i++) {
			var prefName = children[i].replace('all-menus._menus.', '');
			var tabLabel = null;
			if(prefName == 'browser.main-menubar' || prefName == 'navigator.main-menubar') {
				tabLabel = stringBundle.GetStringFromName("tb-all-menus.browser.main-menubar");
			} else if (prefName == 'messenger.mail-menubar') {
				tabLabel = stringBundle.GetStringFromName("tb-all-menus.messenger.mail-menubar");
			} else if (prefName == 'messengercompose.mail-menubar') {
				tabLabel = stringBundle.GetStringFromName("tb-all-menus.messengercompose.mail-menubar");
			} else if (prefName == 'messageWindow.mail-menubar') {
				tabLabel = stringBundle.GetStringFromName("tb-all-menus.messageWindow.mail-menubar");
			}  else {
				continue;
			}
			var tab = document.createElement('tab');
			if(counted == 0) {
				tab.setAttribute('selected', true);
			}
			tab.setAttribute('label', tabLabel);
			tabs.appendChild(tab);
			var panel = document.createElement('tabpanel');
			var listbox = document.createElement('richlistbox');
			listbox.setAttribute('flex', 1);
			
			var listcols = document.createElement('listcols');
			var firstCol = document.createElement('listcol');
			firstCol.setAttribute('flex', 1);
			listcols.appendChild(firstCol);
			listcols.appendChild(document.createElement('listcol'));
			listcols.appendChild(document.createElement('listcol'));
			listbox.appendChild(listcols);
			
			var count = {};
			var rows = prefs.getChildList("all-menus." + prefName + '.label.', count);
			for(var j = 0; j < count.value; j++) {
				var menuPrefName = rows[j].replace("all-menus." + prefName + '.label.', '');
				
				var label = prefs.getCharPref(rows[j]);
				var show = prefs.getBoolPref("all-menus." + prefName + '.in-menu.' + menuPrefName);
				var collapsed = prefs.getBoolPref("all-menus." + prefName + '.collapsed.' + menuPrefName);
				var row = document.createElement('richlistitem');
				
				var cellLabel = document.createElement('label');
				cellLabel.setAttribute('value', label);
				cellLabel.setAttribute('flex', 1);
				row.appendChild(cellLabel);
	
				var cellShow = document.createElement('checkbox');
				cellShow.setAttribute('label', stringBundle.GetStringFromName("tb-all-menus.option.show"));
				cellShow.setAttribute('checked', show);
				cellShow.setAttribute('pref', "all-menus." + prefName + '.in-menu.' + menuPrefName);
				cellShow.addEventListener('command', function(event) {
					var cell = event.target;
					prefs.setBoolPref(cell.getAttribute('pref'), cell.getAttribute('checked') == 'true');
				}, false);
				row.appendChild(cellShow);
				
				var cellCollapsed = document.createElement('checkbox');
				cellCollapsed.setAttribute('label', stringBundle.GetStringFromName("tb-all-menus.option.menubar"));
				cellCollapsed.setAttribute('checked', !collapsed);
				cellCollapsed.setAttribute('pref', "all-menus." + prefName + '.collapsed.' + menuPrefName);
				cellCollapsed.addEventListener('command', function(event) {
					var cell = event.target;
					prefs.setBoolPref(cell.getAttribute('pref'), cell.getAttribute('checked') != 'true');
				}, false);
				row.appendChild(cellCollapsed);
				
				listbox.appendChild(row);
			}
			
			panel.appendChild(listbox);
			panels.appendChild(panel);
			if(counted == 0) {
				tab.focus();
			}
			counted++;
		}
	}
});
window.addEventListener("load", toolbar_buttons.loadTranslate, false);
toolbar_buttons.loadMenuSettings();
window.addEventListener('load', function() {
	if(window.arguments && window.arguments.length) {
		window.document.documentElement.showPane(document.getElementById(window.arguments[0]));
	}
}, false);