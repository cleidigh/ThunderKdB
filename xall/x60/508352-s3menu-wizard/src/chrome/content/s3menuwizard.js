var s3menuwizard = {};
s3menuwizard.s3gt_translate = {};

//------------------------------------------------------------------------------
Components.utils.import("resource://gre/modules/Services.jsm");
Components.utils.import("resource://gre/modules/XPCOMUtils.jsm");

//------------------------------------------------------------------------------
//------------------------------------------------------------------------------
s3menuwizard.init = function() {
	s3menuwizard.is_Thunderbird = s3menuwizard.utils.is_Thunderbird();
	s3menuwizard.win_type = (s3menuwizard.is_Thunderbird) ? "mail:3pane" : "navigator:browser";

	try {
		Components.manager.QueryInterface(Components.interfaces.nsIComponentRegistrar).registerFactory(s3menuwizard.about.UUID, s3menuwizard.about.Description, s3menuwizard.about.Contract, s3menuwizard.about.Factory);
	} catch(e) {
	}

	//-----------------------------------------------------------------------
	var init_start_timer = 2;
	try {
		init_start_timer = s3menuwizard.utils.prefs_get('int', 'init_start_timer');
	} catch(e) {
		init_start_timer = 2;
	}

	//-----------------------------------------------------------------------
	window.setTimeout(function() { 
		s3menuwizard.start();
	}, init_start_timer * 1000);

	window.removeEventListener("load", s3menuwizard.init, false);
}
//------------------------------------------------------------------------------
s3menuwizard.start = function(without_prepare) {
	if (! without_prepare) {
		s3menuwizard.start_prepare(window);
	}
	s3menuwizard.start_move_list(window);
	s3menuwizard.start_label_list(window);
	s3menuwizard.start_style_list(window);
	s3menuwizard.start_command_list(window);
	s3menuwizard.start_disable_list(window);
	s3menuwizard.start_hotkeys_list(window);
}
//------------------------------------------------------------------------------
s3menuwizard.start_prepare = function(win) {
	var main_list = s3menuwizard.utils.create_general_items(win);
	s3menuwizard.check_dublicate_items = {};
	//-----------------------------------------------------------------------
	for (var menu_item of main_list) {
		var nodeName = s3menuwizard.utils.get_nodeName(menu_item);
		if ((nodeName == 'menupopup') && (! /place/i.test(menu_item.id)) && (! s3menuwizard.utils.check_places_menu(menu_item))) {
			try {
				//----------------------------------------------------
				win.document.popupNode = menu_item;
				if (menu_item.id == 'contentAreaContextMenu') {
					try {
						win.gContextMenu = new win.nsContextMenu(menu_item, false);
					} catch(e) {};
				}
				//----------------------------------------------------
				var event = new win.MouseEvent('popupshowing', { 'view': null, 'bubbles': true, 'cancelable': true });
				menu_item.dispatchEvent(event);

				var event = new win.MouseEvent('popupshown', { 'view': null, 'bubbles': true, 'cancelable': true });
				menu_item.dispatchEvent(event);

				var event = new win.MouseEvent('popuphiding', { 'view': null, 'bubbles': true, 'cancelable': true });
				menu_item.dispatchEvent(event);

				var event = new win.MouseEvent('popuphidden', { 'view': null, 'bubbles': true, 'cancelable': true });
				menu_item.dispatchEvent(event);
				//----------------------------------------------------
				if (menu_item.id == 'contentAreaContextMenu') {
					try {
						win.gContextMenu = null;
					} catch(e) {};
				}
				win.document.popupNode = null;
				//----------------------------------------------------
			} catch(e) {};
		}

		menu_item.addEventListener("popupshowing", s3menuwizard.popupshowing, true);
		menu_item.addEventListener("popupshown", s3menuwizard.popupshown, true);
		menu_item.addEventListener("popuphiding", s3menuwizard.popuphiding, true);
		menu_item.addEventListener("popuphidden", s3menuwizard.popuphidden, true);

		s3menuwizard.check_menu_items(win, menu_item);
	}
}
//------------------------------------------------------------------------------
s3menuwizard.check_menu_items = function(win, this_menu, is_popup) {
	//------------------------------------------------------------------------
	var this_menu_list = s3menuwizard.utils.get_element_child_list(this_menu);
	if ((is_popup != true) && (this_menu.getAttribute('id') == 'toolbar-menubar')) {
		this_menu_list = s3menuwizard.utils.get_element_child_list(win.document.getElementById('main-menubar'));
	}
	//------------------------------------------------------------------------
	for (var child_menu of this_menu_list) {
		var nodeName = s3menuwizard.utils.get_nodeName(child_menu);
		if ((nodeName == 'menu') || (nodeName == 'menuitem') || (nodeName == 'menuseparator') || (nodeName == 'splitmenu') || (nodeName == 'menupopup') || (nodeName == 'toolbarbutton')) {
			//---------------------------------------------------------
			var id =  child_menu.id || child_menu.getAttribute('id') || '';
			if (s3menuwizard.utils.check_special_conditions(child_menu)) {
				continue;
			}
			//---------------------------------------------------------
			if (id == '') {
				if (nodeName == 'menupopup') {
//					id = 's3mw....' + child_menu.parentNode.id + '...s3mw_' + nodeName;
				} else {
					try {
						id = s3menuwizard.utils.set_id_for_menu(child_menu, true);
					} catch(e) {};
				}
			}
			if (id) {
				//--------------------------------------------------
				if (/^s3mw\.\.\./.test(id) && s3menuwizard.check_dublicate_items[id]) {
					s3menuwizard.check_dublicate_items[id]++;
					id = id + '...s3mw...' + s3menuwizard.check_dublicate_items[id];
				} else {
					s3menuwizard.check_dublicate_items[id] = 1;
				}
				child_menu.setAttribute('id', id);
				//--------------------------------------------------
			}
			s3menuwizard.check_menu_items(win, child_menu);
		}
		else {
			s3menuwizard.check_menu_items(win, child_menu, true);
		}
	}

	//------------------------------------------------------------------------
	return true;
}
//------------------------------------------------------------------------------
s3menuwizard.start_disable_list = function(win) {
	//-----------------------------------------------------------------------
	var menu_prefs_disable = s3menuwizard.utils.prefs_load('menu_item_list_disable');
	//-----------------------------------------------------------------------
	for (var menu_id in menu_prefs_disable) {
		var menu_item = win.document.getElementById(menu_id);
		if (menu_item) {
			//---------------------------------------------------------
			if (s3menuwizard.utils.check_FileFolderShortcuts(menu_item)) {
				continue;
			}
			//---------------------------------------------------------
			var is_hidden = (String(menu_prefs_disable[menu_id]) == 'true');
			//---------------------------------------------------------
			if (is_hidden) {
				s3menuwizard.utils.show_hide_menuitem(menu_item, true);
			}
		}
	}
}
//------------------------------------------------------------------------------
s3menuwizard.start_label_list = function(win) {
	//-----------------------------------------------------------------------
	var menu_prefs_label = s3menuwizard.utils.prefs_load('menu_item_list_label');
	var is_change_type = false;
	//-----------------------------------------------------------------------
	for (var menu_id in menu_prefs_label) {
		if (typeof(menu_prefs_label[menu_id]) == 'string') {
			menu_prefs_label[menu_id] = { 'label' : menu_prefs_label[menu_id] };
			is_change_type = true;
		}
		var menu_item = win.document.getElementById(menu_id);
		if (menu_item) {
			//---------------------------------------------------------
			if (menu_prefs_label[menu_id].label) {
				var label = s3menuwizard.utils.get_label(menu_item);
				menu_item.setAttribute('original_label', label.value);
				menu_item.setAttribute('original_label_present', label.is_present);
				//---------------------------------------------------------
				menu_item.setAttribute('label', menu_prefs_label[menu_id].label);
			}
			//---------------------------------------------------------
			if (menu_prefs_label[menu_id].accesskey !== undefined) {
				var accesskey = s3menuwizard.utils.get_accesskey(menu_item);
				menu_item.setAttribute('original_accesskey', accesskey);
				menu_item.setAttribute('accesskey', menu_prefs_label[menu_id].accesskey);
			}
		}
	}
	//-----------------------------------------------------------------------
	if (is_change_type) {
		s3menuwizard.utils.prefs_save('menu_item_list_label', menu_prefs_label);
	}
}
//------------------------------------------------------------------------------
s3menuwizard.start_move_list = function(win) {
	//-----------------------------------------------------------------------
	var menu_prefs_move = s3menuwizard.utils.prefs_load('menu_item_list_move');
	for (var menu_pref of menu_prefs_move) {
		var menu_item = null;
		//-----------------------------------------------------------------
		if (menu_pref.before_id == 's3menuwizard_new_menu_separator') {
			menu_item = win.document.createElement('menuseparator');
			menu_item.id = menu_pref.menu_id;
			menu_item.setAttribute('s3mw_is_new_item', true);
			menu_item.setAttribute('is_moved', true);
		}
		//-----------------------------------------------------------------
		else if (menu_pref.before_id.substr(0,28)  == 's3menuwizard_new_menu_folder') {
			menu_item = win.document.createElement('menu');
			menu_item.className = 'menu-iconic ' + menu_pref.before_id;
			menu_item.setAttribute('label', document.getElementById('s3menuwizard_new_folder_name').value);
			menu_item.setAttribute('original_label', document.getElementById('s3menuwizard_new_folder_name').value);
			menu_item.setAttribute('original_label_present', true);

			var menu_item_popup = win.document.createElement('menupopup');
			menu_item_popup.id = 's3mw....' + menu_pref.menu_id + '...s3mw_menupopup';
			menu_item.appendChild(menu_item_popup);

			menu_item.id = menu_pref.menu_id;
			menu_item.setAttribute('s3mw_is_new_item', true);
			menu_item.setAttribute('is_moved', true);
		}
		//-----------------------------------------------------------------
		else if (menu_pref.before_id.substr(0,26)  == 's3menuwizard_new_menu_item') {
			menu_item = win.document.createElement('menuitem');
			menu_item.className = 'menuitem-iconic ' + menu_pref.before_id;
			menu_item.setAttribute('label', document.getElementById('s3menuwizard_new_item_name').value);
			menu_item.setAttribute('original_label', document.getElementById('s3menuwizard_new_item_name').value);
			menu_item.setAttribute('original_label_present', true);

			menu_item.id = menu_pref.menu_id;
			menu_item.setAttribute('s3mw_is_new_item', true);
			menu_item.setAttribute('is_moved', true);
		}
		//-----------------------------------------------------------------
		else {
			menu_item = win.document.getElementById(menu_pref.menu_id);
		}
		//-----------------------------------------------------------------
		//-----------------------------------------------------------------
		if (menu_item) {
			try {
				if (menu_pref.place_id == 's3mw_in_trash') {
					menu_item.parentNode.removeChild(menu_item);
				} else {
					var place_item = win.document.getElementById(menu_pref.place_id);
					if (menu_pref.place_id.substr(-17) == '...s3mw_menupopup') {
						if (place_item) {
							place_item.appendChild(menu_item);
						} else {
							place_item = win.document.getElementById(menu_pref.place_id.replace(/^s3mw\.\.\.\.(.+?)\.\.\.s3mw_menupopup$/, '$1'));
							place_item.firstChild.appendChild(menu_item);
						}
					}
					else if (menu_pref.place_down) {
						place_item.parentNode.appendChild(menu_item);
					} else {
						place_item.nextSibling.parentNode.insertBefore(menu_item, place_item.nextSibling);
					}
					menu_item.setAttribute('is_moved', true);
				}
			} catch (e){
			}
		}
	}
}
//------------------------------------------------------------------------------
s3menuwizard.start_hotkeys_list = function(win) {
	var hotkeys_prefs = s3menuwizard.utils.prefs_load('hotkeys');
	//-----------------------------------------------------------------------
	for (var key_id in hotkeys_prefs) {
		var key_node = win.document.getElementById(key_id);
		var key = { modifiers: [], key: "", keycode: "" };
		var key_current = hotkeys_prefs[key_id].key_current;

		if ((! key_node) && (! key_current.action)) {
			if (key_id.substring(key_id.length - 12) == '_s3mw_hotkey') {
				key_current.action = key_id.substring(0, key_id.length - 12);
			}
		}
		if (key_node) {
			var key_ary = key_node.getAttribute("modifiers").split(/\W+/);
			for (var km of key_ary) {
				if (km) {
					key.modifiers.push(km);
				}
			}
			var key_value = key_node.key || key_node.getAttribute('key') || '';
			var keycode_value = key_node.keycode || key_node.getAttribute('keycode') || '';
			key.key = key_value;
			key.keycode = keycode_value;
		}
		//------------------------------------------------------------------------
		hotkeys_prefs[key_id].key_original = key;
		s3menuwizard.hotkey.apply(key_current, key_id, hotkeys_prefs[key_id].disabled);
	}
	//-----------------------------------------------------------------------
	s3menuwizard.utils.prefs_save('hotkeys', hotkeys_prefs);
}
//------------------------------------------------------------------------------
s3menuwizard.start_style_list = function(win) {
	//-----------------------------------------------------------------------
	var menu_prefs_style = s3menuwizard.utils.prefs_load('style');
	//-----------------------------------------------------------------------
	for (var menu_id in menu_prefs_style) {
		var menu_item = win.document.getElementById(menu_id);
		if (menu_item) {
			var original_style = s3menuwizard.utils.get_style(menu_item);
			s3menuwizard.utils.set_style(menu_item, menu_prefs_style[menu_id].style);
			menu_prefs_style[menu_id].original = original_style;
		}
	}
	//-----------------------------------------------------------------------
	s3menuwizard.utils.prefs_save('style', menu_prefs_style);
}
//------------------------------------------------------------------------------
s3menuwizard.start_command_list = function(win) {
	//-----------------------------------------------------------------------
	var menu_prefs_command = s3menuwizard.utils.prefs_load('command');
	//-----------------------------------------------------------------------
	for (var menu_id in menu_prefs_command) {
		var menu_item = win.document.getElementById(menu_id);
		if (menu_item) {
			var original_command = s3menuwizard.utils.get_command(menu_item);

			if (menu_prefs_command[menu_id].command.oncommand) {
				menu_item.setAttribute('oncommand', menu_prefs_command[menu_id].command.oncommand);
			}
			if (menu_prefs_command[menu_id].command.onclick) {
				menu_item.setAttribute('onclick', menu_prefs_command[menu_id].command.onclick);
			}
			if (menu_prefs_command[menu_id].command.onpopupshowing) {
				menu_item.setAttribute('onpopupshowing', menu_prefs_command[menu_id].command.onpopupshowing);
			}
			if (menu_prefs_command[menu_id].command.onpopuphiding) {
				menu_item.setAttribute('onpopuphiding', menu_prefs_command[menu_id].command.onpopuphiding);
			}
			menu_prefs_command[menu_id].original = original_command;
		}
	}
	//-----------------------------------------------------------------------
	s3menuwizard.utils.prefs_save('command', menu_prefs_command);
}
//------------------------------------------------------------------------------
s3menuwizard.about = {
	'Contract' : "@mozilla.org/network/protocol/about;1?what=config-menu",
	'Description' : "Menu Wizard about module",
	'UUID' : Components.ID("fda1ee42-c5d6-12e1-b34d-0831200c9a67"),
	'Factory' : {
		createInstance: function(outer, iid) {
			if (outer != null) {
				throw Components.results.NS_ERROR_NO_AGGREGATION;
			}
			return s3menuwizard.about.aboutPage.QueryInterface(iid);
		}
	},
	'aboutPage' : {
		QueryInterface: XPCOMUtils.generateQI([Components.interfaces.nsIAboutModule]),
		getURIFlags: function(aURI) {
			return Components.interfaces.nsIAboutModule.ALLOW_SCRIPT;
		},
		newChannel: function(aURI, aLoadInfo) {
			var channel = null;
			try {
				var ios = Components.classes["@mozilla.org/network/io-service;1"].getService(Components.interfaces.nsIIOService);
				var newURI = ios.newURI("chrome://s3menuwizard/content/settings.xul", null, null);
				channel = ios.newChannelFromURIWithLoadInfo(newURI, aLoadInfo);
				channel.originalURI = aURI;
			} catch(e) {
				var uri = Services.io.newURI("chrome://s3menuwizard/content/settings.xul", null, null);
				channel = Services.io.newChannelFromURI(uri);
				channel.originalURI = aURI;
			}
			return channel;
		},
		getURIFlags: function(aURI) { 0 }
	}
};
//------------------------------------------------------------------------------
s3menuwizard.open_options_window = function() {
	if (s3menuwizard.is_Thunderbird) {
		var wm = Components.classes["@mozilla.org/appshell/window-mediator;1"].getService(Components.interfaces.nsIWindowMediator);
		var win = wm.getMostRecentWindow("mail:3pane");
		var tabmail = win.document.getElementById('tabmail');
		win.focus();
		if (tabmail) {
			tabmail.openTab('contentTab', {contentPage: 'about:config-menu'});
		}
	} else {
		var tab_download = null;
		var tabs = (gBrowser.visibleTabs) ? gBrowser.visibleTabs : gBrowser.tabs;
		for (let tab of tabs) {
			if (tab.linkedBrowser.currentURI.spec == 'about:config-menu') {
				tab_download = tab;
			}
		}
		if (tab_download == null) {
			tab_download = gBrowser.addTab('about:config-menu');
		}

		//--------------------------------------------------------------------
		if (s3menuwizard.utils.prefs_get('bool', 'focus_to_options')) {
			window.setTimeout(function(){
				gBrowser.selectedTab = tab_download;
			}, 100);
		}
	}
}
//------------------------------------------------------------------------------
s3menuwizard.popupshowing = function(event) {
	var menu_item = event.originalTarget;
	var menu_prefs_disable = s3menuwizard.utils.prefs_load('menu_item_list_disable');
	if (menu_item.is_rerender) { return; }
	//-----------------------------------------------------------------------
	if (s3menuwizard.utils.check_special_conditions(event.target)) {
		return;
	}
	//-----------------------------------------------------------------------
	if (s3menuwizard.check_livemark(menu_item))  {
		s3menuwizard.popupshowing_action_menu(menu_item, menu_prefs_disable, 'translation');
		return;
	}

	var on_collapsed = true;

	//-----------------------------------------------------------------------
	if (event.currentTarget && event.currentTarget.id && ((event.currentTarget.id == 'toolbar-menubar') || (event.currentTarget.id == 'mail-menubar'))) {
		on_collapsed = false;
	}
	if (menu_item.hasAttribute('flip')) {
		var flip = menu_item.getAttribute('flip');
		if (flip == 'both') {
			on_collapsed = false;
		}
	}
	//-----------------------------------------------------------------------
	if (s3menuwizard.utils.check_places_menu(menu_item))  {
		on_collapsed = false;
	}
	//-----------------------------------------------------------------------
	if (on_collapsed) {
		menu_item.collapsed = true;
	}

	//-----------------------------------------------------------------------
	var show_combination = s3menuwizard.utils.prefs_get('bool', 'show_hidden_menu_by_combination');
	var parent_is_ctrlKey = false;

	//-----------------------------------------------------------------------
	s3menuwizard.s3gt_translate = s3menuwizard.utils.prefs_load('menu_item_list_translate');

	//-----------------------------------------------------------------------
	if (menu_item.parentNode) {
		if (menu_item.parentNode.is_ctrlKey) {
			parent_is_ctrlKey = true;
		} else if (menu_item.parentNode.parentNode) {
			if (menu_item.parentNode.parentNode.is_ctrlKey) {
				parent_is_ctrlKey = true;
			}
		}
	}
	if ((event.ctrlKey || parent_is_ctrlKey) && show_combination) {
		menu_item.is_ctrlKey = true;
		s3menuwizard.popupshowing_action_menu(menu_item, menu_prefs_disable, 'show');
	} else {
		menu_item.is_ctrlKey = false;
	}
}
//------------------------------------------------------------------------------
s3menuwizard.popupshown = function(event) {
	var menu_item = event.originalTarget;
	var menu_prefs_disable = s3menuwizard.utils.prefs_load('menu_item_list_disable');
	if (menu_item.is_rerender) { return; }

	//-----------------------------------------------------------------------
	var target_id = event.target.id || event.target.getAttribute('id') || '';
	if (s3menuwizard.utils.check_special_conditions(event.target)) {
		menu_item.collapsed = false;
		return false;
	}
	if (target_id) {
		menu_item.target_id = 's3mw_' + target_id;
	}

	//-------------------------------------------------------------------------
	if (s3menuwizard.check_livemark(menu_item))  {
		try {
			var is_integration_with_s3gt = s3menuwizard.utils.prefs_get('bool', 'integration_with_s3gt');
			if (is_integration_with_s3gt) {
				setTimeout(function() {
					if ((! menu_item.is_rerender) && (menu_item.state != 'closed')) {
						s3menuwizard.popupshowing_action_menu(menu_item, menu_prefs_disable, 'translation');
					}
				}, 2000);
			}
		} catch(e) {
		}
		s3menuwizard.popupshowing_action_menu(menu_item, menu_prefs_disable, 'translation');
		return;
	}

	//-----------------------------------------------------------------------
	if (! menu_item.is_ctrlKey) {
		s3menuwizard.popupshowing_action_menu(menu_item, menu_prefs_disable, 'hide');
	}
	//-----------------------------------------------------------------------
	var options_panel = s3menuwizard.utils.get_element(menu_item, 's3menuwizard_options_panel');
	while (options_panel) {
		options_panel.parentNode.removeChild(options_panel);
		options_panel = s3menuwizard.utils.get_element(menu_item, 's3menuwizard_options_panel');
	}

	//-----------------------------------------------------------------------
	options_panel = document.createElement('hbox');
	options_panel.setAttribute('id', 's3menuwizard_options_panel');
	options_panel.setAttribute('flex', '1');
	options_panel.setAttribute('align', 'right');
	options_panel.hidden = false;
	menu_item.appendChild(options_panel);
	
	var show_config = s3menuwizard.popupshown_create_button_config(options_panel, menu_item, menu_prefs_disable);
	var show_all = s3menuwizard.popupshown_create_button_show(options_panel, menu_item, menu_prefs_disable);
	if (! show_config && ! show_all) {
		options_panel.hidden = true;
		if (menu_item.localName == 'menupopup') {
			if (! s3menuwizard.popupshowing_action_menu(menu_item, menu_prefs_disable, 'check_visible')) {
				if (s3menuwizard.utils.get_element_child_list(menu_item, true).length == 0) {
					return;
				}
			}
		}
	}
	menu_item.collapsed = false;
}
//------------------------------------------------------------------------------
s3menuwizard.popupshown_create_button_show = function(options_panel, menu_item, menu_prefs_disable) {
	var button_is_show = true;
	if (menu_item.is_ctrlKey) { button_is_show = false; }

	//------------------------------------------------------------------------
	if (! s3menuwizard.utils.prefs_get('bool', 'show_button_show_all')) { button_is_show = false; }

	//------------------------------------------------------------------------
	if (! s3menuwizard.popupshowing_action_menu(menu_item, menu_prefs_disable, 'check')) {
		button_is_show = false;
	}

	//------------------------------------------------------------------------
	var button_show = s3menuwizard.utils.get_element(menu_item, 's3menuwizard_button_show');
	if (! button_show) {
		button_show = document.createElement('toolbarbutton');
		button_show.setAttribute('tooltiptext', document.getElementById('s3menuwizard_button_show_label').value);
		button_show.setAttribute('id', 's3menuwizard_button_show');
		button_show.setAttribute('menu_is_hide', true);
		button_show.activeElement = document.activeElement;
		button_show.addEventListener("command", s3menuwizard.popupshowing_action, false);
		options_panel.appendChild(button_show);
	}
	button_show.hidden = ! button_is_show;
	return button_is_show;
}
//------------------------------------------------------------------------------
s3menuwizard.popupshown_create_button_config = function(options_panel, menu_item, menu_prefs_disable) {
	//------------------------------------------------------------------------
	if (! menu_item.is_ctrlKey) {
		if (! s3menuwizard.utils.prefs_get('bool', 'show_button_config_menu')) { return false; }
	}
	if (! s3menuwizard.popupshowing_action_menu(menu_item, menu_prefs_disable, 'check_id')) { return false; }

	//------------------------------------------------------------------------
	var button_config = document.createElement('toolbarbutton');
	button_config.setAttribute('tooltiptext', document.getElementById('s3menuwizard_button_config_label').value);
	button_config.setAttribute('id', 's3menuwizard_button_config');
	button_config.setAttribute('menu_is_hide', true);
	button_config.activeElement = document.activeElement;
	button_config.addEventListener("command", s3menuwizard.popupshowing_available_edit, false);

	options_panel.appendChild(button_config);
	return true;
}
//------------------------------------------------------------------------------
s3menuwizard.popupshowing_available_edit = function(event) {
	event.stopPropagation();
	var menu_item = event.originalTarget.parentNode.parentNode;
	var button_config = event.originalTarget;
	var menu_prefs_disable = s3menuwizard.utils.prefs_load('menu_item_list_disable');

	var menu_is_hide = button_config.getAttribute('menu_is_hide');
	menu_is_hide = (String(menu_is_hide) == 'true');
	if (menu_is_hide) {
		s3menuwizard.popupshowing_action_menu(menu_item, menu_prefs_disable, 'show_edit');
	} else {
		s3menuwizard.popupshowing_action_menu(menu_item, menu_prefs_disable, 'hide_edit');
	}
	button_config.setAttribute('menu_is_hide', ! menu_is_hide);
	button_config.activeElement.focus();
}
//------------------------------------------------------------------------------
s3menuwizard.popupshowing_set_disable_menu = function(event) {
	event.stopPropagation();
	var checkbox_config = event.target;

	//------------------------------------------------------------------------
	var options_panel = document.getElementById('s3menuwizard_options_panel');
	if (! options_panel) { return; }

	//------------------------------------------------------------------------
	var child_menu = checkbox_config.parentNode.lastChild;
	var menu_id =  child_menu.id || child_menu.getAttribute('id') || '';
	if (menu_id) {
		var el_checked = checkbox_config.getAttribute('checked');
		el_checked = (String(el_checked) == 'true');
		var is_hidden = ! el_checked;
		var menu_prefs_disable = s3menuwizard.utils.prefs_load('menu_item_list_disable');
		var menu_prefs_style = s3menuwizard.utils.prefs_load('style');
		//-----------------------------------------------------------------------
		if (is_hidden) {
			menu_prefs_disable[menu_id] = is_hidden;
		} else {
			delete menu_prefs_disable[menu_id];
		}
		s3menuwizard.utils.prefs_save('menu_item_list_disable', menu_prefs_disable);
		s3menuwizard.utils.show_hide_menuitem(child_menu, is_hidden);

		if (menu_prefs_style[menu_id]) {
			s3menuwizard.utils.set_style(child_menu, menu_prefs_style[menu_id].style);
		} else {
			child_menu.style.color = '';
		}

		//-----------------------------------------------------------------------
		try {
			var wm = Components.classes["@mozilla.org/appshell/window-mediator;1"].getService(Components.interfaces.nsIWindowMediator);
			var win_list = wm.getEnumerator(s3menuwizard.win_type);
			var win;
		
			while (win_list.hasMoreElements()) {
				win = win_list.getNext();
				var menu_item = win.document.getElementById(menu_id);
				menu_item.setAttribute('s3mws_hide_menu', is_hidden);
				s3menuwizard.utils.show_hide_menuitem(menu_item, is_hidden);
			}
		} catch (e){
		}

		//-----------------------------------------------------------------
		var menu_item = options_panel.parentNode;
		var button_show = s3menuwizard.utils.get_element(menu_item, 's3menuwizard_button_show');
		var menu_is_show_all = false;
		if (menu_item.is_ctrlKey) {
			menu_is_show_all = true;
		}
		if (button_show) {
			var menu_is_hide = button_show.getAttribute('menu_is_hide');
			menu_is_hide = (String(menu_is_hide) == 'true');
			if (! menu_is_hide) {
				menu_is_show_all = true;
			}
		}
		if (menu_is_show_all) {
			s3menuwizard.popupshowing_action_menu(menu_item, menu_prefs_disable, 'show');
		} else {
			s3menuwizard.popupshowing_action_menu(menu_item, menu_prefs_disable, 'hide');
		}
		s3menuwizard.popupshown_create_button_show(options_panel, menu_item, menu_prefs_disable);
	}
}
//------------------------------------------------------------------------------
s3menuwizard.popupshowing_edit_properties = function(event) {
	event.stopPropagation();
	var checkbox_config = event.target;

	//------------------------------------------------------------------------
	var options_panel = document.getElementById('s3menuwizard_options_panel');
	if (! options_panel) { return; }

	//------------------------------------------------------------------------
	var child_menu = checkbox_config.parentNode.lastChild;
	var id =  child_menu.id || child_menu.getAttribute('id') || '';
	child_menu.id = id;

	var original_label = child_menu.getAttribute('original_label') || child_menu.label || id;
	child_menu.setAttribute('original_label', original_label);

	var original_accesskey = child_menu.getAttribute('original_accesskey');
	if (! child_menu.hasAttribute('original_accesskey')) {
		original_accesskey = s3menuwizard.utils.get_accesskey(child_menu);
		child_menu.setAttribute('original_accesskey', original_accesskey);
	}

	//------------------------------------------------------------------------
	var menu_prefs_style = s3menuwizard.utils.prefs_load('style');
	if (menu_prefs_style[id]) {
		s3menuwizard.utils.set_style(child_menu, menu_prefs_style[id].style);
	} else {
		child_menu.style.color = '';
	}

	//------------------------------------------------------------------------
	s3menuwizard.utils.openDialog('chrome://s3menuwizard/content/properties.xul', 'MenuWizard :: Properties :: ' + child_menu.id, 'chrome,centerscreen,resizable', child_menu);
}
//------------------------------------------------------------------------------
s3menuwizard.popupshowing_action = function(event) {
	event.stopPropagation();
	var menu_item = event.originalTarget.parentNode.parentNode;
	var button_show = event.originalTarget;
	var menu_prefs_disable = s3menuwizard.utils.prefs_load('menu_item_list_disable');

	var menu_is_hide = button_show.getAttribute('menu_is_hide');
	menu_is_hide = (String(menu_is_hide) == 'true');
	if (menu_is_hide) {
		s3menuwizard.popupshowing_action_menu(menu_item, menu_prefs_disable, 'show');
		button_show.setAttribute('tooltiptext', document.getElementById('s3menuwizard_button_hide_label').value);
	} else {
		s3menuwizard.popupshowing_action_menu(menu_item, menu_prefs_disable, 'hide');
		button_show.setAttribute('tooltiptext', document.getElementById('s3menuwizard_button_show_label').value);
	}
	button_show.setAttribute('menu_is_hide', ! menu_is_hide);
	button_show.activeElement.focus();
}
//------------------------------------------------------------------------------
s3menuwizard.popuphiding = function(event) {
	var menu_item = event.originalTarget;
	if (menu_item.is_rerender) { return; }
	//-----------------------------------------------------------------------
	if (s3menuwizard.utils.check_special_conditions(menu_item)) {
		return;
	}

	//-----------------------------------------------------------------------
	s3menuwizard.utils.prefs_save('menu_item_list_translate', s3menuwizard.s3gt_translate);
	var menu_prefs_disable = s3menuwizard.utils.prefs_load('menu_item_list_disable');
	var options_panel = s3menuwizard.utils.get_element(menu_item, 's3menuwizard_options_panel');
	while (options_panel) {
		options_panel.parentNode.removeChild(options_panel);
		options_panel = s3menuwizard.utils.get_element(menu_item, 's3menuwizard_options_panel');
	}
	s3menuwizard.popupshowing_action_menu(menu_item, menu_prefs_disable, 'close');
	menu_item.is_ctrlKey = false;
}
//------------------------------------------------------------------------------
s3menuwizard.popuphidden = function(event) {
	var menu_item = event.originalTarget;
	if (menu_item.is_rerender) { return; }
	//-----------------------------------------------------------------------
	if (s3menuwizard.utils.check_special_conditions(menu_item)) {
		return;
	}

	if (s3menuwizard.check_livemark(menu_item))  { return; }
	if (s3menuwizard.utils.check_places_menu(menu_item))  { return; }

	var screenX = event.screenX;
	var screenY = event.screenY;

	//-----------------------------------------------------------------------
	//-- fix bug "hiding shadow in context menu" - hidden re-render
	//-----------------------------------------------------------------------
	var hiding_shadow_timer = 10;
	try {
		hiding_shadow_timer = s3menuwizard.utils.prefs_get('int', 'hiding_shadow_timer');
	} catch(e) {
		hiding_shadow_timer = 10;
	}
	//-----------------------------------------------------------------------
	var tweak_shadow_enable = false;
	try {
		tweak_shadow_enable = s3menuwizard.utils.prefs_get('bool', 'tweak_shadow_enable');
	} catch(e) {
		tweak_shadow_enable = false;
	}
	//-----------------------------------------------------------------------
	setTimeout(function() {
		if (tweak_shadow_enable || (menu_item.state == 'closed')) {
			menu_item.is_rerender = true;
			menu_item.hidden = true;
			try {
				menu_item.openPopupAtScreen(screenX, screenY, true);
				menu_item.hidePopup();
			} catch(e) {
			}
			menu_item.hidden = false;
			delete menu_item.is_rerender;
		}
	}, hiding_shadow_timer);
}
//------------------------------------------------------------------------------
s3menuwizard.popupshowing_action_menu = function(this_menu, menu_prefs_disable, action) {
	var result = false;
	var result_is_visible = false;
	//------------------------------------------------------------------------
	var this_menu_list = s3menuwizard.utils.get_element_child_list(this_menu);
	var is_highlight_hidden_menu = s3menuwizard.utils.prefs_get('bool', 'highlight_hidden_menu');
	var highlight_hidden_menu_color = s3menuwizard.utils.prefs_get('string', 'highlight_hidden_menu_color');
	var menu_prefs_label = s3menuwizard.utils.prefs_load('menu_item_list_label');
	var menu_prefs_style = s3menuwizard.utils.prefs_load('style');
	var menu_prefs_command = s3menuwizard.utils.prefs_load('command');

	var menuseparator_count = 0;
	var menuitem_count = 0;
	var last_node = null;
	var is_bookmark = s3menuwizard.check_bookmark(this_menu);

	//------------------------------------------------------------------------
	for (var child_menu of this_menu_list) {
		try {
			var id = child_menu.id || child_menu.getAttribute('id') || '';
			//-----------------------------------------------------------
			if (child_menu.getAttribute('s3mw_auto_hidden')) {
				child_menu.removeAttribute('s3mw_auto_hidden');
			}
			//-----------------------------------------------------------
			//-- fix for Tools - Mirror Tab
			//-----------------------------------------------------------
			if (id == "menu_mirrorTabCmd") {
				continue;
			}
			//-----------------------------------------------------------
			var is_hidden = child_menu.hidden || child_menu.getAttribute('hidden') || false;
			is_hidden = (String(is_hidden) == 'true');
			if (! is_hidden) {
				var is_collapsed = child_menu.collapsed || child_menu.getAttribute('collapsed') || false;
				is_collapsed = (String(is_collapsed) == 'true');
				is_hidden = is_collapsed;
				//----------------------------------------------
				if (! is_hidden) {
					if (child_menu.style && child_menu.style.display && (child_menu.style.display == 'none')) {
						is_hidden = true;
					}
				}
				//----------------------------------------------
				//-- fix for Customizations for Adblock Plus
				//----------------------------------------------
				if (! is_hidden) {
					if (s3menuwizard.utils.check_CustomizationsAdblockPlus(child_menu)) {
						is_hidden = true;
					}
				}
			}
			var nodeName = s3menuwizard.utils.get_nodeName(child_menu);
			var child_is_bookmark = is_bookmark || s3menuwizard.check_bookmark(child_menu);

			//-----------------------------------------------------------
			//-----------------------------------------------------------
			if ((action == 'hide') || (action == 'close')) {
				child_menu.removeAttribute('s3mws_hide_shortcuts_all');
				child_menu.removeAttribute('s3mws_hide_menuicons_all');
			} else {
				if (s3menuwizard.utils.prefs_get('bool', 'hide_shortcuts_all')) {
					child_menu.setAttribute('s3mws_hide_shortcuts_all', true);
				} else {
					child_menu.removeAttribute('s3mws_hide_shortcuts_all');
				}
				//-----------------------------------------------------------
				if (s3menuwizard.utils.prefs_get('bool', 'hide_menuicons_all') && (! child_is_bookmark)) {
					child_menu.setAttribute('s3mws_hide_menuicons_all', true);
				} else {
					child_menu.removeAttribute('s3mws_hide_menuicons_all');
				}
			}

			//-----------------------------------------------------------
			var is_menu_item = ((nodeName == 'menu') || (nodeName == 'menuitem') || (nodeName == 'menuseparator') || (nodeName == 'splitmenu') || ((nodeName == 'toolbarbutton') && (id.substr(0, 19) != 's3menuwizard_button'))) ? true : false;
			//-----------------------------------------------------------
			if ((id == '') && this_menu.target_id) {
				var cmd =  child_menu.cmd || child_menu.getAttribute('cmd') || '';
				if (cmd) {
					cmd = cmd.replace(/[^\w\d]/g, '_');
					cmd = cmd.replace(/\_+/g, '_');
					id = this_menu.target_id + '_' + cmd;
					child_menu.id = id;
				}
			}
			//-----------------------------------------------------------
			if (id == '') {
				id = s3menuwizard.utils.set_id_for_menu(child_menu, true);
			}
			//-----------------------------------------------------------
			if (id) {
				if (is_menu_item && (action == 'check_id')) {
					result = true;
				}
				//-----------------------------------------------------
				if (menu_prefs_style[id]) {
					s3menuwizard.utils.set_style(child_menu, menu_prefs_style[id].style);
				}
				//-----------------------------------------------------
				if (menu_prefs_command[id]) {
					if (menu_prefs_command[id].command.oncommand) {
						child_menu.setAttribute('oncommand', menu_prefs_command[id].command.oncommand);
					}
					if (menu_prefs_command[id].command.onclick) {
						child_menu.setAttribute('onclick', menu_prefs_command[id].command.onclick);
					}
					if (menu_prefs_command[id].command.onpopupshowing) {
						child_menu.setAttribute('onpopupshowing', menu_prefs_command[id].command.onpopupshowing);
					}
					if (menu_prefs_command[id].command.onpopuphiding) {
						child_menu.setAttribute('onpopuphiding', menu_prefs_command[id].command.onpopuphiding);
					}
				}
				//-----------------------------------------------------
				if (menu_prefs_disable[id]) {
					//----------------------------------------------
					if (! is_hidden) {
						result = true;
						//----------------------------------------
						if (action == 'show') {
							s3menuwizard.utils.show_hide_menuitem(child_menu, false);
							if (is_highlight_hidden_menu) {
								child_menu.style.color = highlight_hidden_menu_color;
							} else {
							}
							//-----------------------------------
							if (child_menu.parentNode.id == 's3menuwizard_hbox_panel') {
								child_menu.parentNode.hidden = false;
							}
						}
						else if ((action == 'hide') || (action == 'close')) {
							s3menuwizard.utils.show_hide_menuitem(child_menu, true);
							if (menu_prefs_style[id]) {
								s3menuwizard.utils.set_style(child_menu, menu_prefs_style[id].style);
							} else {
								child_menu.style.color = '';
							}
							//-----------------------------------
							if (child_menu.parentNode.id == 's3menuwizard_hbox_panel') {
								child_menu.parentNode.hidden = true;
							}
						}
					}
				} else {
					s3menuwizard.utils.show_hide_menuitem(child_menu, false, true);
				}
			}
			//-----------------------------------------------------------
			//-----------------------------------------------------------
			var is_s3mws_hide_menu = (String(child_menu.getAttribute('s3mws_hide_menu')) == 'true');

			//-----------------------------------------------------------
			if (nodeName == 'menugroup') {
				if (action == 'hide') {
					var is_hide_group = s3menuwizard.check_hide_group(child_menu, menu_prefs_disable, child_is_bookmark);
					if (is_hide_group) {
						child_menu.setAttribute('s3mws_autohide_menugroup', true);
					}
				} else if ((action == 'show') || (action == 'close'))  {
					child_menu.removeAttribute('s3mws_autohide_menugroup');
				}
			}
			//-----------------------------------------------------------
			if (action == 'check_visible') {
				var is_hide_group = false;
				//-----------------------------------------------------
				//-----------------------------------------------------
				if ((nodeName == 'menugroup') || (nodeName == 'menu') || (nodeName == 'menupopup')) {
					is_hide_group = s3menuwizard.check_hide_group(child_menu, menu_prefs_disable, child_is_bookmark);
				}
				//-----------------------------------------------------
				//-----------------------------------------------------
				if ((! is_hidden) && (! is_s3mws_hide_menu)) {
					if (nodeName != 'menuseparator') {
						result_is_visible = true;
						if (is_hide_group) {
							if (s3menuwizard.utils.prefs_get('bool', 'hide_empty_menu')) {
								child_menu.setAttribute('s3mw_auto_hidden', true);
								result_is_visible = false;
							}
						}
					}
				}
			}
			//-----------------------------------------------------------
			if (action == 'show_edit') {
				if ((! is_hidden) && is_menu_item) {
					var hbox_panel = document.createElement('box');
					hbox_panel.setAttribute('id', 's3menuwizard_hbox_panel');
					hbox_panel.setAttribute('orient', 'horizontal');
//					hbox_panel.setAttribute('flex', '1');
					child_menu.original_flex = child_menu.getAttribute('flex');
					child_menu.setAttribute('flex', '1');
					child_menu.style.margin = '0px';
					if (is_s3mws_hide_menu) {
						hbox_panel.hidden = true;
					}
					//---------------------------------------------------------
					var edit_is_disabled = (id) ? false : true;
					if (s3menuwizard.utils.check_FileFolderShortcuts(child_menu)) {
						edit_is_disabled = true;
					}
					//---------------------------------------------------------
					var checkbox_config = document.createElement('checkbox');
					checkbox_config.setAttribute('checked', ((id && menu_prefs_disable[id]) ? false : true));
					checkbox_config.setAttribute('disabled', edit_is_disabled);
					checkbox_config.addEventListener("command", s3menuwizard.popupshowing_set_disable_menu, false);
					hbox_panel.appendChild(checkbox_config);
	
					if ((nodeName != 'menuseparator') && (nodeName != 'splitmenu')) {
						var properties_config = document.createElement('toolbarbutton');
						properties_config.id = "s3menuwizard_template_edit_button";
						properties_config.setAttribute('disabled', edit_is_disabled);
						properties_config.addEventListener("command", s3menuwizard.popupshowing_edit_properties, false);
						hbox_panel.appendChild(properties_config);
					}
					this_menu.replaceChild(hbox_panel, child_menu);
					hbox_panel.appendChild(child_menu);
				}
			}
			//-----------------------------------------------------------
			else if ((action == 'hide_edit') || (action == 'close')) {
				if (id == 's3menuwizard_hbox_panel') {
					var child_menu_original = child_menu.lastChild; // .cloneNode(true);
					this_menu.replaceChild(child_menu_original, child_menu);
					child_menu = child_menu_original;
					if (child_menu.original_flex) {
						child_menu.setAttribute('flex', child_menu.original_flex);
					} else {
						child_menu.removeAttribute ('flex');
					}
					child_menu.original_flex = null;

					is_hidden = child_menu.hidden || child_menu.getAttribute('hidden') || false;
					is_hidden = (String(is_hidden) == 'true');
					nodeName = s3menuwizard.utils.get_nodeName(child_menu);
					if (menu_prefs_style[id]) {
						s3menuwizard.utils.set_style(child_menu, menu_prefs_style[id].style);
					} else {
						child_menu.style.margin = '';
					}
				}
			}

			//-----------------------------------------------------------
			var element_is_hidden = (is_hidden) ? true : is_s3mws_hide_menu;

			//-----------------------------------------------------------
			if ((! element_is_hidden) && ((nodeName == 'menuitem') || (nodeName == 'menu'))) {
				menuitem_count++;
			}
			if (child_menu.parentNode && (child_menu.parentNode.id == 's3menuwizard_hbox_panel')) {
				menuitem_count++;
			}

			if ((! element_is_hidden) && (id != 's3menuwizard_options_panel') && ((action == 'hide') || (action == 'check_id') || (action == 'check') || (action == 'check_visible') || (action == 'hide_edit'))) {
				var hide_unnecessary_separators = (child_is_bookmark) ? s3menuwizard.utils.prefs_get('bool', 'hide_unnecessary_separators_bookmark') : s3menuwizard.utils.prefs_get('bool', 'hide_unnecessary_separators');
				if (hide_unnecessary_separators) {
					if (nodeName == 'menuseparator') {
						if (menuitem_count == 0) {
							menuseparator_count = 1;
						}
						menuseparator_count++;
					} else {
						menuseparator_count = 0;
					}
					if (menuseparator_count > 1) {
						child_menu.setAttribute('s3mw_auto_hidden', true);
					} else {
						last_node = child_menu;
					}
				}
			}
			//-----------------------------------------------------------
			var label =  child_menu.label || child_menu.getAttribute('label') || '';
			if ((label != '') && (is_hidden != true) && (id != 's3menuwizard_hbox_panel')) {
				s3menuwizard.s3gt_check(action, child_menu, id, label, menu_prefs_label);
			}
			//-----------------------------------------------------------
			if ((nodeName != 'menupopup') && (id != 's3menuwizard_options_panel')) {
				if (! s3menuwizard.utils.check_special_conditions(child_menu)) {
					var child_nodes = s3menuwizard.utils.get_element_child_list(child_menu);
					if (child_nodes.length > 0) {
						var child_result = s3menuwizard.popupshowing_action_menu(child_menu, menu_prefs_disable, action);
						result = (child_result) ? child_result : result;
					}
				}
			}
		} catch(e) {
		}
	}
	//------------------------------------------------------------------------
	if ((last_node != null) && (s3menuwizard.utils.get_nodeName(last_node) == 'menuseparator')) {
		if (last_node.parentNode && (last_node.parentNode.id != 's3menuwizard_hbox_panel')) {
			last_node.setAttribute('s3mw_auto_hidden', true);
		}
	}

	//------------------------------------------------------------------------
	if (action == 'check_visible') {
		return result_is_visible;
	} else {
		return result;
	}
}
//------------------------------------------------------------------------------
s3menuwizard.check_hide_group = function(child_menu, menu_prefs_disable, child_is_bookmark) {
	if (child_is_bookmark) { return false; }

	var is_hide_group = false;
	var child_menu_check = child_menu;
	var check_nodeName = s3menuwizard.utils.get_nodeName(child_menu);
	if ((check_nodeName == 'menu') && (child_menu.firstChild)) {
		check_nodeName = s3menuwizard.utils.get_nodeName(child_menu.firstChild);
		if (check_nodeName == 'menupopup') {
			child_menu_check = child_menu.firstChild;
		}
	}

	var child_nodes = s3menuwizard.utils.get_element_child_list(child_menu_check);
	if (child_nodes.length > 0) {
		is_hide_group = true;
		var group_menu_list = child_nodes;
		//----------------------------------------
		for (var group_menu of group_menu_list) {
			var group_nodeName = s3menuwizard.utils.get_nodeName(group_menu);
			if ((group_nodeName == 'hbox') && (group_menu.id == 's3menuwizard_hbox_panel')) {
				is_hide_group = false;
			}

			var is_group_menu_item = ((group_nodeName == 'menu') || (group_nodeName == 'menuitem') || (group_nodeName == 'splitmenu') || (group_nodeName == 'toolbarbutton')) ? true : false;
			if (! is_group_menu_item) { continue; }

			var is_group_menu_hidden = group_menu.hidden || group_menu.getAttribute('hidden') || false;
			is_group_menu_hidden = (String(is_group_menu_hidden) == 'true');
			if (! is_group_menu_hidden) {
				var is_collapsed = group_menu.collapsed || group_menu.getAttribute('collapsed') || false;
				is_collapsed = (String(is_collapsed) == 'true');
				is_group_menu_hidden = is_collapsed;
			}
			if (! is_group_menu_hidden) {
				var check_id = group_menu.id || group_menu.getAttribute('id') || 'DDD';
				if (menu_prefs_disable[check_id]) {
					is_group_menu_hidden = true;
				}
			}

			if (! is_group_menu_hidden) {
				is_hide_group = false;
			}
		}
	}

	return is_hide_group;
}
//------------------------------------------------------------------------------
s3menuwizard.s3gt_check = function(action, menu_item, id, label_value, menu_prefs_label) {
	if (id == 's3menuwizard_button_show') { return; }

	//-----------------------------------------------------------------------
	var is_bookmark = false;
	if (menu_item.className.indexOf('bookmark') >= 0) { is_bookmark = true; }
	if (id.indexOf('bookmark') >= 0) { is_bookmark = true; }
	if (is_bookmark) {
		try {
			var parent = menu_item.parentNode.parentNode;
			var is_livemark = parent.livemark || parent.getAttribute('livemark') || false;
			is_livemark = (String(is_livemark) == 'true');
			if (is_livemark) {
				menu_item.is_livemark = true;
				is_bookmark = false;
			}
		} catch(e) {
		}
	}
	//-----------------------------------------------------------------------
	if (is_bookmark) { return; }

	var is_integration_with_s3gt = s3menuwizard.utils.prefs_get('bool', 'integration_with_s3gt');
	if (action == 'close') {
		is_integration_with_s3gt = false;
	}
	//-----------------------------------------------------------------------
	var label_s3gt_original =  menu_item.getAttribute('label_s3gt_original') || '';
	if (label_s3gt_original != '') { label_value = label_s3gt_original }
	//-----------------------------------------------------------------------
	if (! is_integration_with_s3gt) {
		if (label_s3gt_original != '') {
			menu_item.setAttribute('label', label_s3gt_original);
			menu_item.removeAttribute('label_s3gt_original');
		}
		var tooltiptext =  menu_item.getAttribute('s3gt_tooltiptext') || '';
		if (tooltiptext == 'true') {
			menu_item.removeAttribute('tooltiptext');
			menu_item.removeAttribute('s3gt_tooltiptext');
		}

	}

	//-----------------------------------------------------------------------
	if (id && menu_prefs_label[id] && menu_prefs_label[id].label) {
		is_integration_with_s3gt = false;
	}
	//-----------------------------------------------------------------------
	if (is_integration_with_s3gt) {
		if (s3menuwizard.s3gt_translate[label_value]) {
			s3menuwizard.s3gt_set(menu_item, label_value, s3menuwizard.s3gt_translate[label_value]);
		}
		//-----------------------------------------------------------------
		else {
			try {
				if ("s3gt" in window) {
					s3menuwizard.s3gt_get(menu_item, label_value);
				}
			} catch(e) {
			}
		}
	}
	return true;
}
//------------------------------------------------------------------------------
s3menuwizard.s3gt_set = function(menu_item, label_value, result_value) {
	var label_s3gt_original =  menu_item.getAttribute('label_s3gt_original') || '';
	if (label_s3gt_original == '') {
		menu_item.setAttribute('label_s3gt_original', label_value);
	}
	var tooltiptext =  menu_item.getAttribute('tooltiptext') || '';
	if (tooltiptext == '') {
		if (! menu_item.is_livemark) {
			menu_item.setAttribute('tooltiptext', label_value);
			menu_item.setAttribute('s3gt_tooltiptext', 'true');
		}
	}
	menu_item.setAttribute('label', result_value);
	s3menuwizard.s3gt_translate[label_value] = result_value;
}
//------------------------------------------------------------------------------
s3menuwizard.s3gt_get = function(menu_item, text) {
	var lang_from = s3gt.prefs.get_lang_from();
	var lang_to = s3gt.prefs.get_lang_to(true);
	s3gt.translate.google_request(text, lang_from, lang_to, false, { 'func': s3menuwizard.s3gt_response, 'args': { 'text' : text, 'menu_item': menu_item, 'lang_to': lang_to }});
}
//------------------------------------------------------------------------------
s3menuwizard.s3gt_response = function(is_ok, responseText, result, args) {
	if (is_ok && (result.detected_lang_from != args.lang_to)) {
		return s3menuwizard.s3gt_set(args.menu_item, args.text, result.text_to_value);
	} else {
		return s3menuwizard.s3gt_set(args.menu_item, args.text, args.text);
	}
}
//------------------------------------------------------------------------------
s3menuwizard.check_livemark = function(menu_item) {
	var is_livemark = false;
	try {
		var is_integration_with_s3gt = s3menuwizard.utils.prefs_get('bool', 'integration_with_s3gt');
		if (is_integration_with_s3gt && menu_item.parentNode) {
			var parent = menu_item.parentNode;
			is_livemark = parent.livemark || parent.getAttribute('livemark') || false;
			is_livemark = (String(is_livemark) == 'true');
		}
	} catch(e) {
	}
	return is_livemark;
}
//------------------------------------------------------------------------------
s3menuwizard.check_bookmark = function(menu_item) {
	var is_bookmark = false;
	var id = menu_item.id || menu_item.getAttribute('id') || '';
	if (menu_item.className.indexOf('bookmark') >= 0) { is_bookmark = true; }
	if (id.indexOf('bookmark') >= 0) { is_bookmark = true; }
	var is_placespopup = menu_item.placespopup || menu_item.getAttribute('placespopup') || false;
	is_placespopup = (String(is_placespopup) == 'true');
	if (is_placespopup) {
		is_bookmark = true;
	}
	return is_bookmark;
}

//------------------------------------------------------------------------------
window.addEventListener("load", s3menuwizard.init, false);
