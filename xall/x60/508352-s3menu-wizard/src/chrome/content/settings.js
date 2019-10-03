var s3menuwizard = {};
Components.utils.import("resource://gre/modules/Services.jsm");

//------------------------------------------------------------------------------
s3menuwizard.init = function() {
	var wm = Components.classes["@mozilla.org/appshell/window-mediator;1"].getService(Components.interfaces.nsIWindowMediator);
	s3menuwizard.is_Thunderbird = s3menuwizard.utils.is_Thunderbird();
	s3menuwizard.win_type = (s3menuwizard.is_Thunderbird) ? "mail:3pane" : "navigator:browser";
	s3menuwizard.win = wm.getMostRecentWindow(s3menuwizard.win_type);

	window.setTimeout(function() { 
		s3menuwizard.init_0();
	}, 600);
}
//------------------------------------------------------------------------------
s3menuwizard.init_0 = function() {
	s3menuwizard.is_iframe = (document.getElementById('s3menuwizard_is_iframe')) ? true : false;
	document.getElementById("s3menuwizard_image_wait").hidden = true;
	if (! s3menuwizard.is_iframe) {
		s3menuwizard.preference_check_highlight();
		s3menuwizard.preference_check_s3gt();
		var last_panel_open = s3menuwizard.preference_get_string('last_panel_open');
		s3menuwizard.panel_show(last_panel_open);
		s3menuwizard.advertisement_status();
	}

	var main_list = s3menuwizard.utils.create_general_items(s3menuwizard.win);
	s3menuwizard.strings = document.getElementById("s3menuwizard_bundle");
	var menu_prefs_disable = s3menuwizard.utils.prefs_load('menu_item_list_disable');

	//-----------------------------------------------------------------------
	for (var menu_item of main_list) {
		var id = menu_item.id || menu_item.getAttribute('id') || '';
		//-----------------------------------------------------------------
		// only for Configure menu on the fly
		//-----------------------------------------------------------------
		if (id == 'nav-bar') { continue; }
		if (id == 'mail-bar3') { continue; }
		if (id == 'toolbar-context-menu') { continue; }
		if (id == 'PersonalToolbar') { continue; }
		if (id == 'msgComposeContext') { continue; }

		//-----------------------------------------------------------------
		var parent_menu = document.getElementById('s3menuwizard_main');
		s3menuwizard.create_template(parent_menu, menu_item, false, menu_prefs_disable);
	}
	//-----------------------------------------------------------------------
	if (s3menuwizard.is_Thunderbird) {
		var adv_box = document.getElementById('adv_box');
		if (adv_box) {
			adv_box.hidden = true;
		}
	}

	s3menuwizard.check_button_reset_all();
}
//------------------------------------------------------------------------------
s3menuwizard.create_template = function(parent_menu, this_menu, is_popup, menu_prefs_disable) {
	var s3menuwizard_template = null;

	//-----------------------------------------------------------------------
	if (is_popup != true) {
		var this_menu_id = this_menu.getAttribute('id');
		//---------------------------------------------------------
		var edit_is_disabled = (this_menu_id) ? false : true;
		if (s3menuwizard.utils.check_FileFolderShortcuts(this_menu)) {
			edit_is_disabled = true;
		}
		//---------------------------------------------------------
		var item_label = this_menu.getAttribute('view_label');
		var item_original_label = this_menu.getAttribute('original_label');
		var item_original_label_present = this_menu.getAttribute('original_label_present');
		item_original_label_present = (String(item_original_label_present) == 'true');
		//------------------------------------------------------------------
		if (s3menuwizard.utils.get_nodeName(this_menu) == 'menuseparator') {
			s3menuwizard_template = document.getElementById("s3menuwizard_template_menuseparator").cloneNode(true).firstChild;
			s3menuwizard.utils.get_element(s3menuwizard_template, 's3menuwizard_template_menuseparator_label').setAttribute("value", this_menu.getAttribute('id'));
			parent_menu.appendChild(s3menuwizard_template);
		}
		//------------------------------------------------------------------
		else {
			s3menuwizard_template = document.getElementById("s3menuwizard_template_menu").cloneNode(true).firstChild;
			//------------------------------------------------------------
			var template_label = s3menuwizard.utils.get_element(s3menuwizard_template, 's3menuwizard_template_label');
			template_label.setAttribute("value", item_label);
			//------------------------------------------------------------
			if (item_original_label_present && (item_original_label != item_label)) {
				template_label.setAttribute("change_label_name", true);
				template_label.setAttribute("tooltiptext", item_original_label);
			}
			//------------------------------------------------------------
			if (! item_original_label_present) {
				s3menuwizard.utils.get_element(s3menuwizard_template, 's3menuwizard_template_edit_button').setAttribute("disabled", true);
			}
			//------------------------------------------------------------
			s3menuwizard.utils.get_element(s3menuwizard_template, 's3menuwizard_template_edit_button').setAttribute("disabled", edit_is_disabled);

			//------------------------------------------------------------
			var template_image_label = s3menuwizard.utils.get_element(s3menuwizard_template, 's3menuwizard_template_image_label');
			var win_style = (s3menuwizard.is_iframe) ? top.window : window;
			var style_image = win_style.getComputedStyle(this_menu).getPropertyValue('list-style-image');
			if (this_menu.className.toLowerCase().indexOf('-iconic') < 0) {
//				style_image = 'none';
			}
			if (style_image && (style_image != 'none')) {
				template_image_label.style.listStyleImage = style_image;
				var style_image_region = win_style.getComputedStyle(this_menu).getPropertyValue('-moz-image-region');
				if (style_image_region && (style_image_region != 'none') && (style_image_region != 'auto')) {
					template_image_label.style.MozImageRegion = style_image_region;
				} else {
					template_image_label.style.MozImageRegion = 'auto';
				}
			} else {
				var image = this_menu.getAttribute('image');
				if (image) {
					template_image_label.style.listStyleImage = 'url("' + image + '")';
					template_image_label.style.MozImageRegion = 'auto';
					var backgroundColor = win_style.getComputedStyle(this_menu).getPropertyValue('background-color');
					if (backgroundColor) {
						template_image_label.style.backgroundColor = backgroundColor;
					}
				} else {
					template_image_label.hidden = true;
				}
			}

			//------------------------------------------------------------
			s3menuwizard.utils.get_element(s3menuwizard_template, 's3menuwizard_template_vbox_child_list').hidden = true;
			parent_menu.appendChild(s3menuwizard_template);
			parent_menu = s3menuwizard.utils.get_element(s3menuwizard_template, 's3menuwizard_template_vbox_child_list');
		}
		//-------------------------------------------------------------------
		s3menuwizard_template.id = this_menu_id;
		if (this_menu.getAttribute('is_moved')) {
			s3menuwizard.utils.get_element(s3menuwizard_template, 's3menuwizard_template_label').setAttribute('is_moved', true);
		}
		//-------------------------------------------------------------------
		s3menuwizard.utils.get_element(s3menuwizard_template, 's3menuwizard_template_checkbox').setAttribute('disabled', edit_is_disabled);
		//-------------------------------------------------------------------
		if (this_menu.getAttribute('s3mw_is_new_item')) {
			s3menuwizard.utils.get_element(s3menuwizard_template, 's3menuwizard_template_trash').hidden = false;
		}

		//-------------------------------------------------------------------
		s3menuwizard.utils.get_element(s3menuwizard_template, 's3menuwizard_template_label_check').setAttribute("value", ' ');
		//-------------------------------------------------------------------
		if (menu_prefs_disable[this_menu_id]) {
			s3menuwizard.utils.get_element(s3menuwizard_template, 's3menuwizard_template_checkbox').setAttribute('checked', false);
			s3menuwizard_template.setAttribute("is_disabled", true);
			s3menuwizard.utils.get_element(s3menuwizard_template, 's3menuwizard_template_box_checkbox').setAttribute("change_item_disable", true);
		} else {
			s3menuwizard.utils.get_element(s3menuwizard_template, 's3menuwizard_template_checkbox').setAttribute('checked', true);
		}
		//-------------------------------------------------------------------
		if (s3menuwizard_template.id == '') {
			s3menuwizard.utils.get_element(s3menuwizard_template, 's3menuwizard_template_checkbox').disabled = true;
		}
	}

	//------------------------------------------------------------------------
	if ((is_popup != true) && this_menu.getAttribute('container') == 'true') {
		return false;
	}

	var this_menu_list = this_menu.childNodes || [];
	if ((is_popup != true) && (this_menu.getAttribute('id') == 'toolbar-menubar')) {
		this_menu_list = s3menuwizard.win.document.getElementById('main-menubar').childNodes;
	}
	var is_child = (this_menu_list.length > 0) ? true : false;
	//------------------------------------------------------------------------
	for (var child_menu of this_menu_list) {
		var nodeName = s3menuwizard.utils.get_nodeName(child_menu);
		if ((nodeName == 'menu') || (nodeName == 'menuitem') || (nodeName == 'menuseparator') || (nodeName == 'splitmenu') || (nodeName == 'vbox') || (nodeName == 'toolbarbutton')) {
			//---------------------------------------------------------
			var id =  child_menu.id || child_menu.getAttribute('id') || '';
			child_menu.setAttribute('id', id);
			//---------------------------------------------------------
			var label = s3menuwizard.utils.get_label(child_menu);
			child_menu.setAttribute('view_label', label.value);
			//---------------------------------------------------------
			var original_label = child_menu.getAttribute('original_label') || label.value;
			var original_label_present = child_menu.getAttribute('original_label_present') || label.is_present;
			child_menu.setAttribute('original_label_present', original_label_present);
			child_menu.setAttribute('original_label', original_label);
			//---------------------------------------------------------
			var original_accesskey = s3menuwizard.utils.get_accesskey(child_menu);
			if (child_menu.hasAttribute('original_accesskey')) {
				original_accesskey = child_menu.getAttribute('original_accesskey');
			}
			child_menu.setAttribute('original_accesskey', original_accesskey);
			//--------------------------------------------------
			is_child = true;
			s3menuwizard.create_template(parent_menu, child_menu, false, menu_prefs_disable);
		}
		else {
			var is_child_popup = s3menuwizard.create_template(parent_menu, child_menu, true, menu_prefs_disable);
			is_child = (is_child) ? is_child : is_child_popup;
		}
	}

	//------------------------------------------------------------------------
	if (is_popup != true) {
		if (is_child) {
			if (s3menuwizard.utils.get_nodeName(this_menu) != 'menuseparator') {
				s3menuwizard.utils.get_element(s3menuwizard_template, 's3menuwizard_template_label_check').setAttribute("value", '+');
				s3menuwizard.utils.get_element(s3menuwizard_template, 's3menuwizard_template_label_check').setAttribute("onclick", 's3menuwizard.show_sub_menu(this)');
				s3menuwizard.utils.get_element(s3menuwizard_template, 's3menuwizard_template_label_check').setAttribute("is_multimenu", true);
				template_label.setAttribute("onclick", 's3menuwizard.show_sub_menu(this)');
				template_label.setAttribute("is_multimenu", true);

				var s3menuwizard_template_vbox_child_list = s3menuwizard.utils.get_element(s3menuwizard_template, 's3menuwizard_template_vbox_child_list');
				s3menuwizard_template_vbox_child_list.firstChild.id = 's3mw....' + s3menuwizard_template.id + '...s3mw_menupopup';
				s3menuwizard_template_vbox_child_list.firstChild.hidden = (s3menuwizard_template_vbox_child_list.firstChild.nextSibling) ? true : false;
				s3menuwizard.utils.get_element(s3menuwizard_template, 's3menuwizard_template_trash').setAttribute('trash_disabled', s3menuwizard_template_vbox_child_list.firstChild.hidden);
			}
		}
	}
	return is_child;
}
//------------------------------------------------------------------------------
s3menuwizard.show_sub_menu = function(e) {
	var main_hbox = s3menuwizard.search_main_node(e);
	var vbox_child_list = s3menuwizard.utils.get_element(main_hbox, 's3menuwizard_template_vbox_child_list');
	vbox_child_list.hidden = ! vbox_child_list.hidden;
	s3menuwizard.utils.get_element(main_hbox, 's3menuwizard_template_label_check').setAttribute("value", vbox_child_list.hidden ? '+' : '-');
}
//------------------------------------------------------------------------------
s3menuwizard.edit_properties = function(e) {
	var main_hbox = s3menuwizard.search_main_node(e);
	s3menuwizard.utils.openDialog('chrome://s3menuwizard/content/properties.xul', 'MenuWizard :: Properties :: ' + main_hbox.id, 'chrome,centerscreen,resizable', main_hbox);
}
//------------------------------------------------------------------------------
s3menuwizard.disable_menu_item = function(el) {
	var el_checked = el.getAttribute('checked');
	el_checked = (String(el_checked) == 'true');
	var is_hidden = ! el_checked;
	var main_hbox = s3menuwizard.search_main_node(el);

	//-----------------------------------------------------------------------
	try {
		var wm = Components.classes["@mozilla.org/appshell/window-mediator;1"].getService(Components.interfaces.nsIWindowMediator);
		var win_list = wm.getEnumerator(s3menuwizard.win_type);
		var win;
	
		while (win_list.hasMoreElements()) {
			win = win_list.getNext();
			var menu_item = win.document.getElementById(main_hbox.id);
			s3menuwizard.utils.show_hide_menuitem(menu_item, is_hidden);
		}
	} catch (e){
	}

	//-----------------------------------------------------------------------
	var menu_item = s3menuwizard.win.document.getElementById(main_hbox.id);
	var menu_prefs_disable = s3menuwizard.utils.prefs_load('menu_item_list_disable');
	if (is_hidden) {
		menu_prefs_disable[main_hbox.id] = is_hidden;
	} else {
		delete menu_prefs_disable[main_hbox.id];
	}
	s3menuwizard.utils.prefs_save('menu_item_list_disable', menu_prefs_disable);
	//-----------------------------------------------------------------------------
	s3menuwizard.utils.apply_multi_window_settings({
		'action' : 'disable',
		'main_hbox_id' : main_hbox.id,
		'is_hidden' : is_hidden
	});
}
//------------------------------------------------------------------------------
s3menuwizard.menu_item_in_trash = function(e) {
	var main_hbox = s3menuwizard.search_main_node(e);
	if (! s3menuwizard.win.document.getElementById(main_hbox.id).getAttribute('s3mw_is_new_item')) {
		return false;
	}
	var s3menuwizard_template_vbox_child_list = s3menuwizard.utils.get_element(main_hbox, 's3menuwizard_template_vbox_child_list');
	if (s3menuwizard_template_vbox_child_list) {
		if (s3menuwizard_template_vbox_child_list.firstChild.nextSibling) {
			alert(s3menuwizard.strings.getString("delete_menu_folder_not_empty"));
			return false;
		}
	}
	if (! s3menuwizard.utils.confirm()) {
		return false;
	}

	//-----------------------------------------------------------------------
	try {
		var wm = Components.classes["@mozilla.org/appshell/window-mediator;1"].getService(Components.interfaces.nsIWindowMediator);
		var win_list = wm.getEnumerator(s3menuwizard.win_type);
		var win;
	
		while (win_list.hasMoreElements()) {
			win = win_list.getNext();
			var menu_item = win.document.getElementById(main_hbox.id);
			if (menu_item) {
				menu_item.parentNode.removeChild(menu_item);
			}
		}
	} catch (e){
	}

	//-----------------------------------------------------------------------
	var menu_prefs_move = s3menuwizard.utils.prefs_load('menu_item_list_move');
	var is_save_del = true;
	var is_search = true;
	//-----------------------------------------------------------------------
	while (is_search) {
		is_search = false;
		//-----------------------------------------------------------------
		var menu_pref = menu_prefs_move.pop();
		if (menu_pref) {
			if (menu_pref.menu_id == main_hbox.id) {
				is_save_del = false;
				is_search = true;
			} else {
				menu_prefs_move.push(menu_pref);
			}
		}
	}

	//-----------------------------------------------------------------------
	if (is_save_del) {
		var place_before_id = s3menuwizard.search_main_node(main_hbox.parentNode).id;
		var place_before_down = false;
		if (main_hbox.nextSibling) {
			place_before_id = main_hbox.nextSibling.id;
			place_before_down = true;
		}
		menu_prefs_move.push({ 'menu_id': main_hbox.id, 'place_id': 's3mw_in_trash', 'place_down': true, 'before_id': place_before_id, 'before_down': place_before_down });
	}
	//-----------------------------------------------------------------------
	else {
		var menu_prefs_label = s3menuwizard.utils.prefs_load('menu_item_list_label');
		delete menu_prefs_label[main_hbox.id];
		s3menuwizard.utils.prefs_save('menu_item_list_label', menu_prefs_label);

		var menu_prefs_disable = s3menuwizard.utils.prefs_load('menu_item_list_disable');
		delete menu_prefs_disable[main_hbox.id];
		s3menuwizard.utils.prefs_save('menu_item_list_disable', menu_prefs_disable);
	}

	//-----------------------------------------------------------------------
	s3menuwizard.utils.prefs_save('menu_item_list_move', menu_prefs_move);
	//-----------------------------------------------------------------------------
	s3menuwizard.utils.apply_multi_window_settings({
		'action' : 'in_trash',
		'main_hbox_id' : main_hbox.id,
	});
}
//------------------------------------------------------------------------------
s3menuwizard.reset_prefs_all = function() {
	s3menuwizard.reset_prefs_style();
	s3menuwizard.reset_prefs_command();
	s3menuwizard.reset_prefs_disable();
	s3menuwizard.reset_prefs_label();
	s3menuwizard.reset_prefs_move();
	s3menuwizard.reset_prefs_hotkeys();
	s3menuwizard.check_button_reset_all();
}
//------------------------------------------------------------------------------
s3menuwizard.reset_prefs_custom = function() {
	if (! s3menuwizard.utils.confirm()) {
		return false;
	}

	var settings_name = document.getElementById('s3menuwizard_panel_reset_menu').value
	if (settings_name == 'rename') {
		s3menuwizard.reset_prefs_label();
	}
	else if (settings_name == 'move') {
		s3menuwizard.reset_prefs_move();
	}
	else if (settings_name == 'hidden') {
		s3menuwizard.reset_prefs_disable();
	}
	else if (settings_name == 'hotkeys') {
		s3menuwizard.reset_prefs_hotkeys();
	}
	else if (settings_name == 'style') {
		s3menuwizard.reset_prefs_style();
	}
	else if (settings_name == 'command') {
		s3menuwizard.reset_prefs_command();
	}
	s3menuwizard.check_button_reset_all();
}
//------------------------------------------------------------------------------
s3menuwizard.reset_prefs_custom_select = function() {
	var settings_name = document.getElementById('s3menuwizard_panel_reset_menu').value

	document.getElementById('s3menuwizard_reset_grid_rename_list').hidden = true;
	document.getElementById('s3menuwizard_reset_grid_hidden_list').hidden = true;
	document.getElementById('s3menuwizard_reset_grid_move_list').hidden = true;
	document.getElementById('s3menuwizard_reset_grid_hotkeys_list').hidden = true;
	document.getElementById('s3menuwizard_reset_grid_style_list').hidden = true;
	document.getElementById('s3menuwizard_reset_grid_command_list').hidden = true;

	document.getElementById('s3menuwizard_reset_empty_rename_list').hidden = true;
	document.getElementById('s3menuwizard_reset_empty_hidden_list').hidden = true;
	document.getElementById('s3menuwizard_reset_empty_move_list').hidden = true;
	document.getElementById('s3menuwizard_reset_empty_hotkeys_list').hidden = true;
	document.getElementById('s3menuwizard_reset_empty_style_list').hidden = true;
	document.getElementById('s3menuwizard_reset_empty_command_list').hidden = true;

	document.getElementById('s3menuwizard_reset_grid_' + settings_name + '_list').hidden = false;
	document.getElementById('s3menuwizard_reset_empty_' + settings_name + '_list').hidden = false;
}
//------------------------------------------------------------------------------
s3menuwizard.reset_prefs_single = function(el, settings_name) {
	var menu_id = el.getAttribute("menu_id") || '';
	if (menu_id == '') {
		return false;
	}

	if (settings_name == 'rename') {
		s3menuwizard.reset_prefs_label(menu_id);
	}
	else if (settings_name == 'move') {
		s3menuwizard.reset_prefs_move(true);
	}
	else if (settings_name == 'hidden') {
		s3menuwizard.reset_prefs_disable(menu_id);
	}
	else if (settings_name == 'hotkeys') {
		s3menuwizard.reset_prefs_hotkeys(menu_id);
	}
	else if (settings_name == 'style') {
		s3menuwizard.reset_prefs_style(menu_id);
	}
	else if (settings_name == 'command') {
		s3menuwizard.reset_prefs_command(menu_id);
	}
	//-----------------------------------------------------------------------------
	s3menuwizard.utils.apply_multi_window_settings({ 'action' : 'check_button_reset_all' });
}
//------------------------------------------------------------------------------
s3menuwizard.reset_prefs_disable = function(menu_id_only) {
	//-----------------------------------------------------------------------
	var menu_prefs_disable = s3menuwizard.utils.prefs_load('menu_item_list_disable');
	for (var menu_id in menu_prefs_disable) {
		if (menu_id_only && (menu_id_only != menu_id)) {
			continue;
		}
		var menu_el = s3menuwizard.win.document.getElementById(menu_id);
		if (menu_el) {
			//---------------------------------------------------------
			s3menuwizard.utils.apply_multi_window_settings({
				'action' : 'disable_reset',
				'menu_id' : menu_id
			});
			//---------------------------------------------------------
			try {
				var wm = Components.classes["@mozilla.org/appshell/window-mediator;1"].getService(Components.interfaces.nsIWindowMediator);
				var win_list = wm.getEnumerator(s3menuwizard.win_type);
				var win;
			
				while (win_list.hasMoreElements()) {
					win = win_list.getNext();
					var menu_item = win.document.getElementById(menu_id);
					s3menuwizard.utils.show_hide_menuitem(menu_item, false, true);
				}
			} catch (e){
			}
		}
		delete menu_prefs_disable[menu_id];
	}
	s3menuwizard.utils.prefs_save('menu_item_list_disable', menu_prefs_disable);
}
//------------------------------------------------------------------------------
s3menuwizard.reset_prefs_label = function(menu_id_only) {
	var menu_prefs_label = s3menuwizard.utils.prefs_load('menu_item_list_label');
	for (var menu_id in menu_prefs_label) {
		if (menu_id_only && (menu_id_only != menu_id)) {
			continue;
		}
		var menu_el = s3menuwizard.win.document.getElementById(menu_id);
		if (menu_el) {
			//---------------------------------------------------------
			var origin_label = menu_el.getAttribute('original_label') || menu_id;
			var origin_accesskey = menu_el.getAttribute('original_accesskey') || '';
			//-----------------------------------------------------------------------------
			s3menuwizard.utils.apply_multi_window_settings({
				'action' : 'label_reset',
				'menu_id' : menu_id,
				'origin_label' : origin_label
			});
			//--------------------------------------------------------
			try {
				var wm = Components.classes["@mozilla.org/appshell/window-mediator;1"].getService(Components.interfaces.nsIWindowMediator);
				var win_list = wm.getEnumerator(s3menuwizard.win_type);
				var win;
			
				while (win_list.hasMoreElements()) {
					win = win_list.getNext();
					var menu_item = win.document.getElementById(menu_id);
					menu_item.setAttribute('label', origin_label);
					menu_item.setAttribute('accesskey', origin_accesskey);
				}
			} catch (e){
			}
		}
		delete menu_prefs_label[menu_id];
	}
	s3menuwizard.utils.prefs_save('menu_item_list_label', menu_prefs_label);
}
//------------------------------------------------------------------------------
s3menuwizard.reset_prefs_move = function(only_single_menu) {
	var menu_prefs_move = s3menuwizard.utils.prefs_load('menu_item_list_move');
	while (menu_prefs_move.length > 0) {
		var menu_pref = menu_prefs_move.pop();
		var menu_el = s3menuwizard.win.document.getElementById(menu_pref.menu_id);
		var is_new_menu_item = false;
		var original_id = '';
		var nodeData = null;
		//-----------------------------------------------------------------
		if (menu_pref.place_id == 's3mw_in_trash') {
			for (var m of menu_prefs_move) {
				if (m.menu_id == menu_pref.menu_id) {
					original_id = m.before_id;
				}
			}
			if (original_id == 's3menuwizard_new_menu_separator') {
				nodeData = s3menuwizard.create_new_menu_separator(menu_pref.menu_id);
				is_new_menu_item = true;
			}
			else if (original_id.substr(0,28) == 's3menuwizard_new_menu_folder') {
				nodeData = s3menuwizard.create_new_menu_folder(original_id, menu_pref.menu_id);
				is_new_menu_item = true;
			}
			else if (original_id.substr(0,26) == 's3menuwizard_new_menu_item') {
				nodeData = s3menuwizard.create_new_menu_item(original_id, menu_pref.menu_id);
				is_new_menu_item = true;
			}
		}
		//-----------------------------------------------------------------
		if (menu_el || is_new_menu_item) {
			//--------------------------------------------------------
			var check_is_no_moved = true;
			for (var m of menu_prefs_move) {
				if (m.menu_id == menu_pref.menu_id) {
					check_is_no_moved = false;
				}
			}

			//--------------------------------------------------------
			if (is_new_menu_item) {
				menu_item_el = nodeData;
			} else {
				menu_item_el = document.getElementById(menu_pref.menu_id);
			}

			//-----------------------------------------------------------------------------
			s3menuwizard.utils.apply_multi_window_settings({
				'action' : 'move_reset',
				'menu_pref' : menu_pref,
				'check_is_no_moved' : check_is_no_moved,
				'is_new_menu_item' : is_new_menu_item,
				'menu_item_el' : menu_item_el
			});
			menu_item_el = document.getElementById(menu_pref.menu_id);
			//--------------------------------------------------------
			try {
				var wm = Components.classes["@mozilla.org/appshell/window-mediator;1"].getService(Components.interfaces.nsIWindowMediator);
				var win_list = wm.getEnumerator(s3menuwizard.win_type);
				var win;
			
				while (win_list.hasMoreElements()) {
					win = win_list.getNext();
					var menu_item = null;
					if (is_new_menu_item) {
						//-----------------------------------------------------------------
						if (original_id == 's3menuwizard_new_menu_separator') {
							menu_item = win.document.createElement('menuseparator');
							menu_item.id = menu_pref.menu_id;
							menu_item.setAttribute('s3mw_is_new_item', true);
							menu_item.setAttribute('is_moved', true);
						}
						//-----------------------------------------------------------------
						else if (original_id.substr(0,28)  == 's3menuwizard_new_menu_folder') {
							menu_item = win.document.createElement('menu');
							menu_item.className = 'menu-iconic ' + original_id;
							menu_item.setAttribute('label', document.getElementById('s3menuwizard_new_menu_folder_0').value);
				
							var menu_item_popup = win.document.createElement('menupopup');
							menu_item_popup.id = 's3mw....' + menu_pref.menu_id + '...s3mw_menupopup';
							menu_item.appendChild(menu_item_popup);
				
							menu_item.id = menu_pref.menu_id;
							menu_item.setAttribute('s3mw_is_new_item', true);
							menu_item.setAttribute('is_moved', true);
							menu_item.setAttribute('original_label', s3menuwizard.utils.get_element(menu_item_el, 's3menuwizard_template_label').value);
							menu_item.setAttribute('original_label_present', true);
						}
						//-----------------------------------------------------------------
						else if (original_id.substr(0,26)  == 's3menuwizard_new_menu_item') {
							menu_item = win.document.createElement('menuitem');
							menu_item.className = 'menuitem-iconic ' + original_id;
							menu_item.setAttribute('label', document.getElementById('s3menuwizard_new_menu_item_0').value);
				
							menu_item.id = menu_pref.menu_id;
							menu_item.setAttribute('s3mw_is_new_item', true);
							menu_item.setAttribute('is_moved', true);
							menu_item.setAttribute('original_label', s3menuwizard.utils.get_element(menu_item_el, 's3menuwizard_template_label').value);
							menu_item.setAttribute('original_label_present', true);
						}
					} else {
						menu_item = win.document.getElementById(menu_pref.menu_id);
					}
					menu_pref.before_id = (menu_pref.before_id == 'toolbar-menubar') ? 'main-menubar' : menu_pref.before_id;

					var menu_before_item = win.document.getElementById(menu_pref.before_id);
					//----------------------------------------------------------
					if ((menu_pref.before_id == 's3menuwizard_new_menu_separator') || (menu_pref.before_id.substr(0,28)  == 's3menuwizard_new_menu_folder') || (menu_pref.before_id.substr(0,26)  == 's3menuwizard_new_menu_item')) {
						menu_item.parentNode.removeChild(menu_item);
					}
					else if (menu_pref.before_down) {
						menu_before_item.parentNode.insertBefore(menu_item, menu_before_item);
					} else {
						if (menu_before_item.firstChild && (menu_before_item.firstChild.nodeName == 'menupopup')) {
							menu_before_item = menu_before_item.firstChild;
						}
						menu_before_item.appendChild(menu_item);
					}
				}
			} catch (e){
			}
		}
		if (only_single_menu) {
			break;
		}
	}
	if (! only_single_menu) {
		menu_prefs_move = [];
	}
	s3menuwizard.utils.prefs_save('menu_item_list_move', menu_prefs_move);
}
//------------------------------------------------------------------------------
s3menuwizard.reset_prefs_hotkeys = function(key_id_only) {
	var hotkeys_prefs = s3menuwizard.utils.prefs_load('hotkeys');

	for (var key_id in hotkeys_prefs) {
		if (key_id_only && (key_id_only != key_id)) {
			continue;
		}
		s3menuwizard.hotkey.apply(hotkeys_prefs[key_id].key_original, key_id, hotkeys_prefs[key_id].key_original.disabled);
		delete hotkeys_prefs[key_id];
	}

	s3menuwizard.utils.prefs_save('hotkeys', hotkeys_prefs);
}
//------------------------------------------------------------------------------
s3menuwizard.reset_prefs_style = function(menu_id_only) {
	//-----------------------------------------------------------------------
	var menu_prefs_style = s3menuwizard.utils.prefs_load('style');
	for (var menu_id in menu_prefs_style) {
		if (menu_id_only && (menu_id_only != menu_id)) {
			continue;
		}
		var menu_el = s3menuwizard.win.document.getElementById(menu_id);
		if (menu_el) {
			//---------------------------------------------------------
			var original_style = menu_prefs_style[menu_id].original;

			//-----------------------------------------------------------------------------
			s3menuwizard.utils.apply_multi_window_settings({});
			//---------------------------------------------------------
			try {
				var wm = Components.classes["@mozilla.org/appshell/window-mediator;1"].getService(Components.interfaces.nsIWindowMediator);
				var win_list = wm.getEnumerator(s3menuwizard.win_type);
				var win;
			
				while (win_list.hasMoreElements()) {
					win = win_list.getNext();
					var menu_item = win.document.getElementById(menu_id);
					menu_item.setAttribute('style', original_style);
				}
			} catch (e){
			}
		}
		delete menu_prefs_style[menu_id];
	}
	s3menuwizard.utils.prefs_save('style', menu_prefs_style);
}
//------------------------------------------------------------------------------
s3menuwizard.reset_prefs_command = function(menu_id_only) {
	//-----------------------------------------------------------------------
	var menu_prefs_command = s3menuwizard.utils.prefs_load('command');
	for (var menu_id in menu_prefs_command) {
		if (menu_id_only && (menu_id_only != menu_id)) {
			continue;
		}
		var menu_el = s3menuwizard.win.document.getElementById(menu_id);
		if (menu_el) {
			//---------------------------------------------------------
			var original_command = menu_prefs_command[menu_id].original;

			//-----------------------------------------------------------------------------
			s3menuwizard.utils.apply_multi_window_settings({});
			//---------------------------------------------------------
			try {
				var wm = Components.classes["@mozilla.org/appshell/window-mediator;1"].getService(Components.interfaces.nsIWindowMediator);
				var win_list = wm.getEnumerator(s3menuwizard.win_type);
				var win;
			
				while (win_list.hasMoreElements()) {
					win = win_list.getNext();
					var menu_item = win.document.getElementById(menu_id);
					menu_item.setAttribute('oncommand', original_command.oncommand);
					menu_item.setAttribute('onclick', original_command.onclick);
					menu_item.setAttribute('onpopupshowing', original_command.onpopupshowing);
					menu_item.setAttribute('onpopuphiding', original_command.onpopuphiding);
				}
			} catch (e){
			}
		}
		delete menu_prefs_command[menu_id];
	}
	s3menuwizard.utils.prefs_save('command', menu_prefs_command);
}
//------------------------------------------------------------------------------
s3menuwizard.elem_drag_start = function(e) {
	var main_hbox = null;

	if ((e.target.id.substr(0,28) == 's3menuwizard_new_menu_folder') || (e.target.id == 's3menuwizard_new_menu_separator') || (e.target.id.substr(0,26) == 's3menuwizard_new_menu_item')) {
		main_hbox = e.target;
	} else {
		main_hbox =s3menuwizard.search_main_node(e.target);
		var menu_item = s3menuwizard.win.document.getElementById(main_hbox.id);
		if (menu_item.getAttribute('s3mw_is_root_menu')) {
			return false;
		}
	}

	var dt = e.dataTransfer;
	dt.setDragImage(main_hbox, 30, 10);
	dt.mozSetDataAt('application/x-moz-node', main_hbox, 0);
	dt.effectAllowed = "move";
}
//------------------------------------------------------------------------------
s3menuwizard.elem_drag_end = function(e) {
	var main_hbox = s3menuwizard.search_main_node(e.target);
	var isNode = null;
	try {
		isNode = e.dataTransfer.mozGetDataAt("application/x-moz-node", 0);
	} catch(e) {
		isNode = e.dataTransfer.types.contains("application/x-moz-node");
	}
	var nodeData = null;
	var run_move = false;

	//------------------------------------------------------------------------
	if (isNode) {
		var nodeData_transfer = e.dataTransfer.mozGetDataAt("application/x-moz-node", 0);
		var id =  nodeData_transfer.id || nodeData_transfer.getAttribute('id') || '';
		if (id) {
			nodeData = document.getElementById(id);
			if (nodeData) {
				run_move = true;
				//------------------------------------------------------
				if (main_hbox.id == nodeData.id) {
					run_move = false;
				}
			}
		}
		//-----------------------------------------------------------------
	}
	//------------------------------------------------------------------------
	if (run_move) {
		var is_new_menu_item = false;
		var place_before_id = '';
		var place_before_id_original = '';
		if (nodeData.id == 's3menuwizard_new_menu_separator') {
			place_before_id = nodeData.id;
			nodeData = s3menuwizard.create_new_menu_separator();
			is_new_menu_item = true;
		}
		else if (nodeData.id.substr(0,28) == 's3menuwizard_new_menu_folder') {
			place_before_id = nodeData.id;
			nodeData = s3menuwizard.create_new_menu_folder(nodeData.id);
			is_new_menu_item = true;
		}
		else if (nodeData.id.substr(0,26) == 's3menuwizard_new_menu_item') {
			place_before_id = nodeData.id;
			nodeData = s3menuwizard.create_new_menu_item(nodeData.id);
			is_new_menu_item = true;
		}
		//-----------------------------------------------------------------
		try {
			var place_id = main_hbox.id;
			var place_down = false;
			place_before_id = (is_new_menu_item) ? place_before_id : s3menuwizard.search_main_node(nodeData.parentNode).id;
			var place_before_down = false;
			var menu_prefs_move = s3menuwizard.utils.prefs_load('menu_item_list_move');
			//----------------------------------------------------------
			if ((! is_new_menu_item) && nodeData.nextSibling) {
				place_before_id = nodeData.nextSibling.id;
				place_before_down = true;
			}

			//----------------------------------------------------------
			if (! main_hbox.nextSibling) {
				place_down = true;
			}
			place_before_id_original = place_before_id;

			//----------------------------------------------------------
			var menu_pref = menu_prefs_move.pop();
			if (menu_pref) {
				if (menu_pref.menu_id == nodeData.id) {
					place_before_id = menu_pref.before_id;
					place_before_down = menu_pref.before_down;
				} else {
					menu_prefs_move.push(menu_pref);
				}
			}
			//----------------------------------------------------------
			var is_error = false;
			//----------------------------------------------------------
			try {
				var wm = Components.classes["@mozilla.org/appshell/window-mediator;1"].getService(Components.interfaces.nsIWindowMediator);
				var win_list = wm.getEnumerator(s3menuwizard.win_type);
				var win;
			
				while (win_list.hasMoreElements()) {
					win = win_list.getNext();
					var menu_item = null;
					if (is_new_menu_item) {
						if (place_before_id == 's3menuwizard_new_menu_separator') {
							menu_item = win.document.createElement('menuseparator');
							menu_item.setAttribute('s3mw_is_new_item', true);
							menu_item.setAttribute('is_moved', true);
						}
						else if (place_before_id.substr(0,28) == 's3menuwizard_new_menu_folder') {
							menu_item = win.document.createElement('menu');
							menu_item.className = 'menu-iconic ' + place_before_id;
							menu_item.setAttribute('label', nodeData.label);

							var menu_item_popup = win.document.createElement('menupopup');
							menu_item_popup.id = 's3mw....' + nodeData.id + '...s3mw_menupopup';
							menu_item.appendChild(menu_item_popup);

							menu_item.setAttribute('s3mw_is_new_item', true);
							menu_item.setAttribute('is_moved', true);
							menu_item.setAttribute('original_label', nodeData.label);
							menu_item.setAttribute('original_label_present', true);
						}
						else if (place_before_id.substr(0,26) == 's3menuwizard_new_menu_item') {
							menu_item = win.document.createElement('menuitem');
							menu_item.className = 'menuitem-iconic ' + place_before_id;
							menu_item.setAttribute('label', nodeData.label);

							menu_item.setAttribute('s3mw_is_new_item', true);
							menu_item.setAttribute('is_moved', true);
							menu_item.setAttribute('original_label', nodeData.label);
							menu_item.setAttribute('original_label_present', true);
						}
						menu_item.id = nodeData.id;
					} else {
						menu_item = win.document.getElementById(nodeData.id);
					}
					//----------------------------------------------------------
					var place_item = null;
					if (is_new_menu_item) {
						place_item = win.document.getElementById(place_id);
					} else {
						place_item = win.document.getElementById(place_id.replace(/^s3mw\.\.\.\.(.+?)\.\.\.s3mw_menupopup$/, '$1'));
					}
					if (place_id.substr(-17) == '...s3mw_menupopup') {
						if (is_new_menu_item) {
							place_item.appendChild(menu_item);
						} else {
							place_item.firstChild.appendChild(menu_item);
						}
					}
					else if (place_down) {
						place_item.parentNode.appendChild(menu_item);
					} else {
						place_item.nextSibling.parentNode.insertBefore(menu_item, place_item.nextSibling);
					}

				}
			} catch(e) {
				is_error = true;
				alert(s3menuwizard.strings.getString("move_error"));
			}

			//-----------------------------------------------------------------------
			if (! is_error) {
				menu_prefs_move.push({ 'menu_id': nodeData.id, 'place_id': place_id, 'place_down': place_down, 'before_id': place_before_id, 'before_down': place_before_down });
				s3menuwizard.utils.prefs_save('menu_item_list_move', menu_prefs_move);
				//-----------------------------------------------------------------------
				s3menuwizard.utils.apply_multi_window_settings({
					'action' : 'move',
					'main_hbox_id' : main_hbox.id,
					'nodeData' : nodeData,
					'place_id' : place_id, 
					'is_new_menu_item' : is_new_menu_item,
					'place_before_id' : place_before_id_original
				});
			}
		} catch(e) {
		}
	}
	s3menuwizard.utils.get_element(main_hbox, 's3menuwizard_template_label').removeAttribute('drag_over');
	if (main_hbox.timeout_id) {
		clearTimeout(main_hbox.timeout_id);
		main_hbox.timeout_id = 0;
	}
	e.preventDefault();
} 
//------------------------------------------------------------------------------
s3menuwizard.elem_drag_over = function(e) {
	var main_hbox = s3menuwizard.search_main_node(e.target);
	//--------------------------------------------------------------------------
	if (s3menuwizard.utils.get_element(main_hbox, 's3menuwizard_template_label_check').getAttribute("is_multimenu")) {
		if (! main_hbox.timeout_id) {
			main_hbox.timeout_id = setTimeout(function() { 
				s3menuwizard.show_sub_menu(main_hbox);
				main_hbox.timeout_id = 0;
			}, 1000);
		}
	}
	//--------------------------------------------------------------------------
	var menu_item = s3menuwizard.win.document.getElementById(main_hbox.id);
	if (menu_item && menu_item.getAttribute('s3mw_is_root_menu')) {
		return false;
	}

	//--------------------------------------------------------------------------
	s3menuwizard.utils.get_element(main_hbox, 's3menuwizard_template_label').setAttribute('drag_over', true);
	e.preventDefault();
}
//------------------------------------------------------------------------------
s3menuwizard.elem_drag_leave = function(e) {
	var main_hbox = s3menuwizard.search_main_node(e.target);
	s3menuwizard.utils.get_element(main_hbox, 's3menuwizard_template_label').removeAttribute('drag_over');
	if (main_hbox.timeout_id) {
		clearTimeout(main_hbox.timeout_id);
		main_hbox.timeout_id = 0;
	}
}
//------------------------------------------------------------------------------
s3menuwizard.search_main_node = function(el) {
	var search_run = true;
	var res = null;

	while (search_run) {
		try {
			if (el.getAttribute('name') == 's3menuwizard_template_main_hbox') {
				search_run = false;
				res = el;
			} else if (el.parentNode) {
				el = el.parentNode;
			} else {
				search_run = false;
			}
		} catch(e) {
			search_run = false;
		}
	}
	return res;
}
//------------------------------------------------------------------------------
s3menuwizard.wheel = function(e) {
	var titlebox = document.getElementById('s3menuwizard_titlebox');
	var title_height = (titlebox) ? titlebox.clientHeight : 0;
	var groupbox = document.getElementById('s3menuwizard_groupbox');
	var groupbox_height = groupbox.clientHeight;
	var groupbox_width = groupbox.clientWidth;
	var mouseY = e.clientY - title_height - (10*4);
	var mouseX = e.clientX - 50;
	var scrollbox = document.getElementById('s3menuwizard_scrollbox');
	var xpcomInterface = null;
	try {
		xpcomInterface = scrollbox.boxObject.QueryInterface(Components.interfaces.nsIScrollBoxObject);
	} catch(e) {
		xpcomInterface = scrollbox;
	}

	if (mouseY < 50) {
		xpcomInterface.scrollBy(0, -5);
	}
	else if (mouseY > (groupbox_height - 50)) {
		xpcomInterface.scrollBy(0, 5);
	}
	if (mouseX < 50) {
		xpcomInterface.scrollBy(-5, 0);
	}
	else if (mouseX > (groupbox_width - 50)) {
		xpcomInterface.scrollBy(5, 0);
	}
}
//------------------------------------------------------------------------------
s3menuwizard.check_button_reset_all = function() {
	if (s3menuwizard.is_iframe) { return; }

	var s3menuwizard_button_reset_all = document.getElementById('s3menuwizard_button_reset_all');
	var menu_prefs_disable = s3menuwizard.utils.prefs_load('menu_item_list_disable');
	var menu_prefs_label = s3menuwizard.utils.prefs_load('menu_item_list_label');
	var menu_prefs_move = s3menuwizard.utils.prefs_load('menu_item_list_move');
	var hotkeys_prefs = s3menuwizard.utils.prefs_load('hotkeys');
	var menu_prefs_style = s3menuwizard.utils.prefs_load('style');
	var menu_prefs_command = s3menuwizard.utils.prefs_load('command');
	s3menuwizard_button_reset_all.removeAttribute('is_active');

	//------------------------------------------------------------------------
	// clear elements
	//------------------------------------------------------------------------
	for (var name of ['rename', 'hidden', 'move', 'hotkeys', 'style', 'command']) {
		document.getElementById("s3menuwizard_reset_empty_" + name + "_list").setAttribute('is_empty', true);
		var reset_list = document.getElementById('s3menuwizard_reset_' + name + '_list');
		while (reset_list.firstChild) {
			reset_list.removeChild(reset_list.firstChild);
	 	}
	}
	//------------------------------------------------------------------------

	//------------------------------------------------------------------------
	if (menu_prefs_disable && (Object.keys(menu_prefs_disable).length > 0)) {
		s3menuwizard_button_reset_all.setAttribute('is_active', true);
		document.getElementById("s3menuwizard_reset_empty_hidden_list").setAttribute('is_empty', false);
		var reset_hidden_list = document.getElementById('s3menuwizard_reset_hidden_list');
		reset_hidden_list.appendChild(document.getElementById("s3menuwizard_template_reset_hidden_title").cloneNode(true));
		reset_hidden_list.appendChild(document.getElementById("s3menuwizard_template_reset_hidden_separator").cloneNode(true));
		//------------------------------------------------------------------
		for (var menu_id in menu_prefs_disable) {
			var reset_hidden_item = document.getElementById("s3menuwizard_template_reset_hidden_item").cloneNode(true);
			s3menuwizard.utils.get_element(reset_hidden_item, 's3menuwizard_reset_single_hidden').setAttribute("menu_id", menu_id);
			var original_label = menu_id;
			var menu_el = s3menuwizard.win.document.getElementById(menu_id);
			if (menu_el) {
				original_label = menu_el.getAttribute('original_label') || menu_el.getAttribute('label') || original_label;
			}
			var custom_label = original_label;
			if (menu_prefs_label[menu_id] && menu_prefs_label[menu_id].label) {
				custom_label = menu_prefs_label[menu_id].label;
			}
			s3menuwizard.utils.get_element(reset_hidden_item, 's3menuwizard_template_reset_item_original_name').setAttribute('value', original_label);
			s3menuwizard.utils.get_element(reset_hidden_item, 's3menuwizard_template_reset_item_custom_name').setAttribute('value', custom_label);

			reset_hidden_item.setAttribute('tooltiptext', s3menuwizard.create_label_path(menu_id));
			reset_hidden_list.appendChild(reset_hidden_item);
			reset_hidden_list.appendChild(document.getElementById("s3menuwizard_template_reset_hidden_separator").cloneNode(true));
		}
	}
	//------------------------------------------------------------------------
	if (menu_prefs_label && (Object.keys(menu_prefs_label).length > 0)) {
		s3menuwizard_button_reset_all.setAttribute('is_active', true);
		document.getElementById("s3menuwizard_reset_empty_rename_list").setAttribute('is_empty', false);
		var reset_rename_list = document.getElementById('s3menuwizard_reset_rename_list');
		reset_rename_list.appendChild(document.getElementById("s3menuwizard_template_reset_rename_title").cloneNode(true));
		reset_rename_list.appendChild(document.getElementById("s3menuwizard_template_reset_rename_separator").cloneNode(true));
		//------------------------------------------------------------------
		for (var menu_id in menu_prefs_label) {
			var reset_rename_item = document.getElementById("s3menuwizard_template_reset_rename_item").cloneNode(true);
			s3menuwizard.utils.get_element(reset_rename_item, 's3menuwizard_reset_single').setAttribute("menu_id", menu_id);
			var original_label = menu_id;
			var original_accesskey = '';
			var menu_el = s3menuwizard.win.document.getElementById(menu_id);
			if (menu_el) {
				original_label = menu_el.getAttribute('original_label') || menu_el.getAttribute('label') || original_label;
				original_accesskey = menu_el.getAttribute('original_accesskey');
			}
			var custom_name = menu_prefs_label[menu_id].label || original_label;
			var custom_accesskey = (menu_prefs_label[menu_id].accesskey !== undefined) ? menu_prefs_label[menu_id].accesskey : original_accesskey;
			if (original_accesskey) {
				original_accesskey = ' (' + original_accesskey + ')';
			}
			if (custom_accesskey) {
				custom_accesskey = ' (' + custom_accesskey + ')';
			}

			s3menuwizard.utils.get_element(reset_rename_item, 's3menuwizard_template_reset_item_original_name').setAttribute('value', original_label + original_accesskey);
			s3menuwizard.utils.get_element(reset_rename_item, 's3menuwizard_template_reset_item_custom_name').setAttribute('value', custom_name + custom_accesskey);

			reset_rename_item.setAttribute('tooltiptext', s3menuwizard.create_label_path(menu_id));
			reset_rename_list.appendChild(reset_rename_item);
			reset_rename_list.appendChild(document.getElementById("s3menuwizard_template_reset_rename_separator").cloneNode(true));
		}
	}
	//------------------------------------------------------------------------
	if (menu_prefs_move &&  (menu_prefs_move.length > 0)) {
		s3menuwizard_button_reset_all.setAttribute('is_active', true);
		document.getElementById("s3menuwizard_reset_empty_move_list").setAttribute('is_empty', false);
		var reset_move_list = document.getElementById('s3menuwizard_reset_move_list');
		reset_move_list.appendChild(document.getElementById("s3menuwizard_template_reset_move_title").cloneNode(true));
		reset_move_list.appendChild(document.getElementById("s3menuwizard_template_reset_move_separator").cloneNode(true));
		var is_first_item = true;
		//------------------------------------------------------------------
		while (menu_prefs_move.length > 0) {
			var menu_pref = menu_prefs_move.pop();
			var menu_id = menu_pref.menu_id;
			var reset_move_item = document.getElementById("s3menuwizard_template_reset_move_item").cloneNode(true);

			//-----------------------------------------------------------
			s3menuwizard.utils.get_element(reset_move_item, 's3menuwizard_reset_single').setAttribute("menu_id", menu_id);
			if (! is_first_item) {
				s3menuwizard.utils.get_element(reset_move_item, 's3menuwizard_reset_single').setAttribute("disabled", true);
			}
			//-----------------------------------------------------------
			var action_name = 'moved';
			if ((menu_pref.before_id.substr(0,28)  == 's3menuwizard_new_menu_folder') || (menu_pref.before_id == 's3menuwizard_new_menu_separator') || (menu_pref.before_id.substr(0,26)  == 's3menuwizard_new_menu_item')) {
				action_name = 'created';
			}
			if (menu_pref.place_id  == 's3mw_in_trash') {
				action_name = 'deleted';
			}
			action_name = s3menuwizard.strings.getString(action_name);

			//-----------------------------------------------------------
			s3menuwizard.utils.get_element(reset_move_item, 's3menuwizard_template_reset_item_action').setAttribute('value', action_name);
			var original_label = menu_id;
			var node_name = '-------';
			if (s3menuwizard.win.document.getElementById(menu_id)) {
				original_label = s3menuwizard.win.document.getElementById(menu_id).getAttribute('original_label') || original_label;
				node_name = s3menuwizard.utils.get_nodeName(s3menuwizard.win.document.getElementById(menu_id)) || node_name;
			}

			s3menuwizard.utils.get_element(reset_move_item, 's3menuwizard_template_reset_item_original_name').setAttribute('value', original_label);
			s3menuwizard.utils.get_element(reset_move_item, 's3menuwizard_template_reset_item_node_name').setAttribute('value', node_name);

			reset_move_item.setAttribute('tooltiptext', s3menuwizard.create_label_path(menu_id));
			reset_move_list.appendChild(reset_move_item);
			reset_move_list.appendChild(document.getElementById("s3menuwizard_template_reset_move_separator").cloneNode(true));
			is_first_item = false;
		}
	}
	//------------------------------------------------------------------------
	if (hotkeys_prefs && (Object.keys(hotkeys_prefs).length > 0)) {
		s3menuwizard_button_reset_all.setAttribute('is_active', true);
		document.getElementById("s3menuwizard_reset_empty_hotkeys_list").setAttribute('is_empty', false);
		var reset_hotkeys_list = document.getElementById('s3menuwizard_reset_hotkeys_list');
		reset_hotkeys_list.appendChild(document.getElementById("s3menuwizard_template_reset_hotkeys_title").cloneNode(true));
		reset_hotkeys_list.appendChild(document.getElementById("s3menuwizard_template_reset_hotkeys_separator").cloneNode(true));
		//------------------------------------------------------------------
		for (var key_id in hotkeys_prefs) {
			var reset_hotkeys_item = document.getElementById("s3menuwizard_template_reset_hotkeys_item").cloneNode(true);

			s3menuwizard.utils.get_element(reset_hotkeys_item, 's3menuwizard_reset_single').setAttribute("menu_id", key_id);
			s3menuwizard.utils.get_element(reset_hotkeys_item, 's3menuwizard_template_reset_item_key').setAttribute('value', s3menuwizard.hotkey.key2string(hotkeys_prefs[key_id].key_current));
			s3menuwizard.utils.get_element(reset_hotkeys_item, 's3menuwizard_template_reset_item_id').setAttribute('value', key_id);
			var label_name = s3menuwizard.hotkey.get_key_name(key_id) || '-----';
			s3menuwizard.utils.get_element(reset_hotkeys_item, 's3menuwizard_template_reset_item_original_name').setAttribute('value', label_name);

			s3menuwizard.utils.get_element(reset_hotkeys_item, 's3menuwizard_template_reset_item_key').setAttribute('disabled', hotkeys_prefs[key_id].disabled);
			s3menuwizard.utils.get_element(reset_hotkeys_item, 's3menuwizard_template_reset_item_id').setAttribute('disabled', hotkeys_prefs[key_id].disabled);
			s3menuwizard.utils.get_element(reset_hotkeys_item, 's3menuwizard_template_reset_item_original_name').setAttribute('disabled', hotkeys_prefs[key_id].disabled);

			reset_hotkeys_list.appendChild(reset_hotkeys_item);
			reset_hotkeys_list.appendChild(document.getElementById("s3menuwizard_template_reset_hotkeys_separator").cloneNode(true));
		}
	}
	//------------------------------------------------------------------------
	if (menu_prefs_style && (Object.keys(menu_prefs_style).length > 0)) {
		s3menuwizard_button_reset_all.setAttribute('is_active', true);
		document.getElementById("s3menuwizard_reset_empty_style_list").setAttribute('is_empty', false);
		var reset_style_list = document.getElementById('s3menuwizard_reset_style_list');
		reset_style_list.appendChild(document.getElementById("s3menuwizard_template_reset_style_title").cloneNode(true));
		reset_style_list.appendChild(document.getElementById("s3menuwizard_template_reset_style_separator").cloneNode(true));
		//------------------------------------------------------------------
		for (var menu_id in menu_prefs_style) {
			var reset_style_item = document.getElementById("s3menuwizard_template_reset_style_item").cloneNode(true);

			s3menuwizard.utils.get_element(reset_style_item, 's3menuwizard_reset_single').setAttribute("menu_id", menu_id);
			s3menuwizard.utils.get_element(reset_style_item, 's3menuwizard_template_reset_item_id').setAttribute('value', menu_id);

			var label_name = menu_id;
			var menu_el = s3menuwizard.win.document.getElementById(menu_id);
			if (menu_el) {
				label_name = menu_el.getAttribute('label') || original_label;
			}
			s3menuwizard.utils.get_element(reset_style_item, 's3menuwizard_template_reset_item_original_name').setAttribute('value', label_name);
			reset_style_item.setAttribute('tooltiptext', s3menuwizard.create_label_path(menu_id));

			reset_style_list.appendChild(reset_style_item);
			reset_style_list.appendChild(document.getElementById("s3menuwizard_template_reset_style_separator").cloneNode(true));
		}
	}
	//------------------------------------------------------------------------
	if (menu_prefs_command && (Object.keys(menu_prefs_command).length > 0)) {
		s3menuwizard_button_reset_all.setAttribute('is_active', true);
		document.getElementById("s3menuwizard_reset_empty_command_list").setAttribute('is_empty', false);
		var reset_command_list = document.getElementById('s3menuwizard_reset_command_list');
		reset_command_list.appendChild(document.getElementById("s3menuwizard_template_reset_command_title").cloneNode(true));
		reset_command_list.appendChild(document.getElementById("s3menuwizard_template_reset_command_separator").cloneNode(true));
		//------------------------------------------------------------------
		for (var menu_id in menu_prefs_command) {
			var reset_command_item = document.getElementById("s3menuwizard_template_reset_command_item").cloneNode(true);
	
			s3menuwizard.utils.get_element(reset_command_item, 's3menuwizard_reset_single').setAttribute("menu_id", menu_id);
			s3menuwizard.utils.get_element(reset_command_item, 's3menuwizard_template_reset_item_id').setAttribute('value', menu_id);
	
			var label_name = menu_id;
			var menu_el = s3menuwizard.win.document.getElementById(menu_id);
			if (menu_el) {
				label_name = menu_el.getAttribute('label') || original_label;
			}
			s3menuwizard.utils.get_element(reset_command_item, 's3menuwizard_template_reset_item_original_name').setAttribute('value', label_name);
			reset_command_item.setAttribute('tooltiptext', s3menuwizard.create_label_path(menu_id));
	
			reset_command_list.appendChild(reset_command_item);
			reset_command_list.appendChild(document.getElementById("s3menuwizard_template_reset_command_separator").cloneNode(true));
		}
	}
}
//------------------------------------------------------------------------------
s3menuwizard.check_button_translate_clean_cache = function() {
	var s3menuwizard_translate_clean_cache = document.getElementById('s3menuwizard_translate_clean_cache');
	var menu_prefs_translate = s3menuwizard.utils.prefs_load('menu_item_list_translate');
	//------------------------------------------------------------------------
	if (menu_prefs_translate && (Object.keys(menu_prefs_translate).length > 0)) {
		s3menuwizard_translate_clean_cache.disabled = false;
		s3menuwizard_translate_clean_cache.setAttribute('label', Object.keys(menu_prefs_translate).length);
	} else {
		s3menuwizard_translate_clean_cache.disabled = true;
		s3menuwizard_translate_clean_cache.setAttribute('label', 0);
	}
}
//------------------------------------------------------------------------------
s3menuwizard.go_help_site = function() {
	var url = 'http://forums.mozillazine.org/viewtopic.php?f=48&t=2828771';
	//-----------------------------------------------------------------------------------
	if (s3menuwizard.is_Thunderbird) {
		s3menuwizard.win.openURL(url);
	} else {
		s3menuwizard.win.gBrowser.selectedTab = s3menuwizard.win.gBrowser.addTab(url);
	}
}
//------------------------------------------------------------------------------
s3menuwizard.panel_show = function(panel_name) {
	for (var i of ['split', 'add', 'reset_all', 'hotkeys', 'settings', 'splitter', 'split_splitter']) {
		if (i != panel_name) {
			document.getElementById('s3menuwizard_panel_' + i).hidden = true;
		}
		var s3mw_button = document.getElementById('s3menuwizard_button_' + i);
		if (s3mw_button) {
			s3mw_button.removeAttribute('is_open');
		}
	}
	//------------------------------------------------------------------------
	if (panel_name) {
		document.getElementById('s3menuwizard_panel_' + panel_name).hidden = ! document.getElementById('s3menuwizard_panel_' + panel_name).hidden;
		document.getElementById('s3menuwizard_button_' + panel_name).setAttribute('is_open', ! document.getElementById('s3menuwizard_panel_' + panel_name).hidden);
		s3menuwizard.preference_set_string('last_panel_open', document.getElementById('s3menuwizard_panel_' + panel_name).hidden ? '' : panel_name);
	}

	//------------------------------------------------------------------------
	switch(panel_name) {
		case 'add':
			break;
		case 'reset_all':
			document.getElementById('s3menuwizard_panel_splitter').hidden = document.getElementById('s3menuwizard_panel_reset_all').hidden;
			s3menuwizard.reset_prefs_custom_select();
			break;
		case 'split':
			document.getElementById('s3menuwizard_panel_split_splitter').hidden = document.getElementById('s3menuwizard_panel_split').hidden;
			break;
		case 'settings':
			s3menuwizard.check_button_translate_clean_cache();
			break;
		case 'hotkeys':
			document.getElementById('s3menuwizard_panel_splitter').hidden = document.getElementById('s3menuwizard_panel_hotkeys').hidden;
			if (! document.getElementById('s3menuwizard_panel_hotkeys').hidden) {
				s3menuwizard.hotkeys_list_create();
			}
			break;
	}
}
//------------------------------------------------------------------------------
s3menuwizard.translate_clean_cache = function() {
	s3menuwizard.utils.prefs_save('menu_item_list_translate', {});
	s3menuwizard.check_button_translate_clean_cache();
}
//------------------------------------------------------------------------------
s3menuwizard.create_new_menu_separator = function(s3id) {
	s3id = (s3id) ? s3id : 's3mw_new_separator_' + (new Date()).getTime();
	var s3menuwizard_template = document.getElementById("s3menuwizard_template_menuseparator").cloneNode(true).firstChild;

	s3menuwizard.utils.get_element(s3menuwizard_template, 's3menuwizard_template_menuseparator_label').setAttribute("value", s3id);
	s3menuwizard_template.id = s3id;
	s3menuwizard.utils.get_element(s3menuwizard_template, 's3menuwizard_template_label').setAttribute('is_moved', true);
	s3menuwizard.utils.get_element(s3menuwizard_template, 's3menuwizard_template_label_check').setAttribute("value", ' ');
	s3menuwizard.utils.get_element(s3menuwizard_template, 's3menuwizard_template_checkbox').setAttribute('checked', true);
	s3menuwizard_template.setAttribute("is_disabled", false);
	s3menuwizard.utils.get_element(s3menuwizard_template, 's3menuwizard_template_trash').hidden = false;
//	document.getElementById('s3menuwizard_panel_add').appendChild(s3menuwizard_template);
	return s3menuwizard_template;
}
//------------------------------------------------------------------------------
s3menuwizard.create_new_menu_folder = function(folder_id, s3id) {
	s3id = (s3id) ? s3id : 's3mw_new_menu_' + (new Date()).getTime();

	var item_label = document.getElementById(folder_id).value;
	var item_original_label = item_label;
	var item_original_label_present = true;
	//-------------------------------------------------------------------
	s3menuwizard_template = document.getElementById("s3menuwizard_template_menu").cloneNode(true).firstChild;
	s3menuwizard_template.id = s3id;
	var template_label = s3menuwizard.utils.get_element(s3menuwizard_template, 's3menuwizard_template_label');
	template_label.setAttribute("value", item_label);
	s3menuwizard_template.label = item_label;
	//-------------------------------------------------------------------
	var template_image_label = s3menuwizard.utils.get_element(s3menuwizard_template, 's3menuwizard_template_image_label');
	template_image_label.className = folder_id;
	if (folder_id == 's3menuwizard_new_menu_folder_0') {
		template_image_label.hidden = true;
	}
	//-------------------------------------------------------------------
	var s3menuwizard_template_vbox_child_list = s3menuwizard.utils.get_element(s3menuwizard_template, 's3menuwizard_template_vbox_child_list');
	s3menuwizard_template_vbox_child_list.hidden = true;
	s3menuwizard_template_vbox_child_list.firstChild.id = 's3mw....' + s3id + '...s3mw_menupopup';

//	document.getElementById('s3menuwizard_panel_add').appendChild(s3menuwizard_template);
	//-------------------------------------------------------------------
	s3menuwizard.utils.get_element(s3menuwizard_template, 's3menuwizard_template_label').setAttribute('is_moved', true);
	//-------------------------------------------------------------------
	s3menuwizard.utils.get_element(s3menuwizard_template, 's3menuwizard_template_trash').hidden = false;
	//-------------------------------------------------------------------
	s3menuwizard.utils.get_element(s3menuwizard_template, 's3menuwizard_template_label_check').setAttribute("value", ' ');
	//-------------------------------------------------------------------
	s3menuwizard.utils.get_element(s3menuwizard_template, 's3menuwizard_template_checkbox').setAttribute('checked', true);
	s3menuwizard_template.setAttribute("is_disabled", false);
	//-------------------------------------------------------------------
	s3menuwizard.utils.get_element(s3menuwizard_template, 's3menuwizard_template_label_check').setAttribute("value", '+');
	s3menuwizard.utils.get_element(s3menuwizard_template, 's3menuwizard_template_label_check').setAttribute("onclick", 's3menuwizard.show_sub_menu(this)');
	s3menuwizard.utils.get_element(s3menuwizard_template, 's3menuwizard_template_label_check').setAttribute("is_multimenu", true);
	template_label.setAttribute("onclick", 's3menuwizard.show_sub_menu(this)');
	template_label.setAttribute("is_multimenu", true);

	return s3menuwizard_template;
}
//------------------------------------------------------------------------------
s3menuwizard.create_new_menu_item = function(item_id, s3id) {
	s3id = (s3id) ? s3id : 's3mw_new_menu_' + (new Date()).getTime();

	var item_label = document.getElementById(item_id).value;
	var item_original_label = item_label;
	var item_original_label_present = true;
	//-------------------------------------------------------------------
	s3menuwizard_template = document.getElementById("s3menuwizard_template_menu").cloneNode(true).firstChild;
	s3menuwizard_template.id = s3id;
	var template_label = s3menuwizard.utils.get_element(s3menuwizard_template, 's3menuwizard_template_label');
	template_label.setAttribute("value", item_label);
	s3menuwizard_template.label = item_label;
	//-------------------------------------------------------------------
	var template_image_label = s3menuwizard.utils.get_element(s3menuwizard_template, 's3menuwizard_template_image_label');
	template_image_label.className = item_id;
	if (item_id == 's3menuwizard_new_menu_item_0') {
		template_image_label.hidden = true;
	}
	//-------------------------------------------------------------------
	var s3menuwizard_template_vbox_child_list = s3menuwizard.utils.get_element(s3menuwizard_template, 's3menuwizard_template_vbox_child_list');
	s3menuwizard_template_vbox_child_list.hidden = true;
	s3menuwizard_template_vbox_child_list.firstChild.id = 's3mw....' + s3id + '...s3mw_menupopup';

//	document.getElementById('s3menuwizard_panel_add').appendChild(s3menuwizard_template);
	//-------------------------------------------------------------------
	s3menuwizard.utils.get_element(s3menuwizard_template, 's3menuwizard_template_label').setAttribute('is_moved', true);
	//-------------------------------------------------------------------
	s3menuwizard.utils.get_element(s3menuwizard_template, 's3menuwizard_template_trash').hidden = false;
	//-------------------------------------------------------------------
	s3menuwizard.utils.get_element(s3menuwizard_template, 's3menuwizard_template_label_check').setAttribute("value", ' ');
	//-------------------------------------------------------------------
	s3menuwizard.utils.get_element(s3menuwizard_template, 's3menuwizard_template_checkbox').setAttribute('checked', true);
	s3menuwizard_template.setAttribute("is_disabled", false);

	return s3menuwizard_template;
}
//------------------------------------------------------------------------------
s3menuwizard.create_label_path = function(menu_id) {
	var el = document.getElementById(menu_id);
	if (! el) {
		return '';
	}
	var main_hbox = s3menuwizard.search_main_node(el);
	var label = s3menuwizard.utils.get_element(main_hbox, 's3menuwizard_template_label');
	var result = label.getAttribute('value') || menu_id;

	var main_hbox_parent = s3menuwizard.search_main_node(main_hbox.parentNode);
	if (main_hbox_parent) {
		var result_parent = s3menuwizard.create_label_path(main_hbox_parent.id);
		if (result_parent) {
			result = result_parent + ' -> ' + result;
		}
	}
	return result;
}
//------------------------------------------------------------------------------
s3menuwizard.preference_check_highlight = function() {
	var el_checked = document.getElementById('s3menuwizard_highlight_hidden_menu').getAttribute('checked');
	el_checked = (String(el_checked) == 'true');
	document.getElementById('s3menuwizard_highlight_hidden_menu_color').disabled = ! el_checked;
}
//------------------------------------------------------------------------------
s3menuwizard.preference_check_s3gt = function() {
	if ("s3gt" in s3menuwizard.win) {
		document.getElementById('s3menuwizard_integration_with_s3gt').disabled = false;
		document.getElementById('s3menuwizard_s3gt_not_installed').hidden = true;
	} else {
		document.getElementById('s3menuwizard_integration_with_s3gt').disabled = true;
		document.getElementById('s3menuwizard_s3gt_not_installed').hidden = false;
	}
}
//------------------------------------------------------------------------------
s3menuwizard.preference_set_check = function(pref_name, el) {
	var el_checked = el.getAttribute('checked');
	el_checked = (String(el_checked) == 'true');
	s3menuwizard.utils.prefs_set('bool', pref_name, el_checked);
}
//------------------------------------------------------------------------------
s3menuwizard.preference_set_string = function(pref_name, pref_value) {
	s3menuwizard.utils.prefs_set('string', pref_name, pref_value);
}
//------------------------------------------------------------------------------
s3menuwizard.preference_get_string = function(pref_name) {
	return s3menuwizard.utils.prefs_get('string', pref_name);
}
//------------------------------------------------------------------------------
s3menuwizard.hotkeys_list_create = function() {
	var s3menuwizard_hotkeys_list = document.getElementById('s3menuwizard_hotkeys_list');
	while (s3menuwizard_hotkeys_list.firstChild) {
		s3menuwizard_hotkeys_list.removeChild(s3menuwizard_hotkeys_list.firstChild);
 	}
	
	var hotkeys_prefs = s3menuwizard.utils.prefs_load('hotkeys');
	var key_list = s3menuwizard.win.document.getElementsByTagName("key");
	var key_list_temp = [];
	for (var key_node of key_list) {
		var id =  key_node.id || key_node.getAttribute('id') || '';
		if (! id) { continue; }
		key_list_temp.push({ 'key_node' : key_node, 'id' : id });
	}
	for (var key of key_list_temp.sort(s3menuwizard.hotkeys_list_sort)) {
		s3menuwizard.hotkeys_template(s3menuwizard_hotkeys_list, key.key_node, hotkeys_prefs);
	}
}
//------------------------------------------------------------------------------
s3menuwizard.hotkeys_list_sort = function(a, b) {
	if (a.id.toUpperCase() > b.id.toUpperCase()) { return 1; }
	if (a.id.toUpperCase() < b.id.toUpperCase()) { return -1; }
	return 0;
}
//------------------------------------------------------------------------------
s3menuwizard.hotkeys_template = function(s3menuwizard_hotkeys_list, key_node, hotkeys_prefs) {
	var s3menuwizard_template_hotkeys = document.getElementById("s3menuwizard_template_hotkeys").cloneNode(true);
	var key_id = key_node.id || key_node.getAttribute('id');
	s3menuwizard_template_hotkeys.key_id = key_id;

	//------------------------------------------------------------------------
	var key = s3menuwizard.hotkey.create_key_from_node(key_node);
	//------------------------------------------------------------------------
	if (hotkeys_prefs[key_id]) {
		key = hotkeys_prefs[key_id].key_current;
	}

	//------------------------------------------------------------------------
//	if (key.modifiers.length > 0) {
		//------------------------------------------------------------------
		s3menuwizard_hotkeys_list.appendChild(s3menuwizard_template_hotkeys);
		//------------------------------------------------------------------
		s3menuwizard.utils.get_element(s3menuwizard_template_hotkeys, 's3menuwizard_template_hotkeys_textbox').value = s3menuwizard.hotkey.key2string(key);
		//------------------------------------------------------------------
		var hotkey_disabled = (hotkeys_prefs[key_id] && hotkeys_prefs[key_id].disabled) ? true : false;
		s3menuwizard.hotkeys_disabled_set(s3menuwizard_template_hotkeys, hotkey_disabled);
		if (! hotkey_disabled) {
			s3menuwizard.utils.get_element(s3menuwizard_template_hotkeys, 's3menuwizard_template_hotkeys_reset').setAttribute('disabled', (hotkeys_prefs[key_id]) ? false : true);
		}
		//------------------------------------------------------------------
		s3menuwizard_template_hotkeys.key_original = (hotkeys_prefs[key_id]) ? hotkeys_prefs[key_id].key_original : key;
		s3menuwizard_template_hotkeys.key_current = key;

		//------------------------------------------------------------------------
		var label_name = s3menuwizard.hotkey.get_key_name(key_id) || key_id;
		s3menuwizard.utils.get_element(s3menuwizard_template_hotkeys, 's3menuwizard_template_hotkeys_label').setAttribute("value", label_name);
		s3menuwizard.utils.get_element(s3menuwizard_template_hotkeys, 's3menuwizard_template_hotkeys_label').setAttribute("tooltiptext", label_name);
		s3menuwizard.utils.get_element(s3menuwizard_template_hotkeys, 's3menuwizard_template_hotkeys_label_id').setAttribute("value", key_id);
		s3menuwizard.utils.get_element(s3menuwizard_template_hotkeys, 's3menuwizard_template_hotkeys_label_id').setAttribute("tooltiptext", key_id);
	
		//------------------------------------------------------------------------
		if (! hotkey_disabled) {
			var res_check = s3menuwizard.hotkey.check_hotkey(s3menuwizard_template_hotkeys.key_current, s3menuwizard_template_hotkeys.key_id);
			s3menuwizard.hotkeys_check(s3menuwizard_template_hotkeys, res_check);
		}

		//------------------------------------------------------------------------
		s3menuwizard.utils.get_element(s3menuwizard_template_hotkeys, 's3menuwizard_template_hotkeys_checkbox').setAttribute('checked', ! hotkey_disabled);
//	}

	//------------------------------------------------------------------------
	return true;
}
//------------------------------------------------------------------------------
s3menuwizard.hotkeys_disabled_set = function(s3menuwizard_template_hotkeys, hotkey_disabled) {
	for (var q of ['label', 'label_id', 'textbox', 'reset']) {
		s3menuwizard.utils.get_element(s3menuwizard_template_hotkeys, 's3menuwizard_template_hotkeys_' + q).disabled = hotkey_disabled;
	}
}
//------------------------------------------------------------------------------
s3menuwizard.hotkeys_disable_click = function(s3menuwizard_template_hotkeys, not_check_button_reset_all) {
	var hotkeys_prefs = s3menuwizard.utils.prefs_load('hotkeys');
	var key_id = s3menuwizard_template_hotkeys.key_id;
	var el_checked = s3menuwizard.utils.get_element(s3menuwizard_template_hotkeys, 's3menuwizard_template_hotkeys_checkbox').getAttribute('checked');
	el_checked = (String(el_checked) == 'true');
	s3menuwizard.hotkeys_disabled_set(s3menuwizard_template_hotkeys, ! el_checked);

	//------------------------------------------------------------------------
	if (hotkeys_prefs[key_id]) {
		hotkeys_prefs[key_id].disabled = ! el_checked;
	} else {
		hotkeys_prefs[key_id] = {
			'key_original' : s3menuwizard_template_hotkeys.key_original,
			'key_current' : s3menuwizard_template_hotkeys.key_current,
			'disabled':  ! el_checked
		};
	}

	//------------------------------------------------------------------------
	if (el_checked) {
		if (s3menuwizard.hotkey.compare_hotkey(s3menuwizard_template_hotkeys.key_original, s3menuwizard_template_hotkeys.key_current)) {
			delete hotkeys_prefs[key_id];
		}
		s3menuwizard.utils.get_element(s3menuwizard_template_hotkeys, 's3menuwizard_template_hotkeys_reset').setAttribute('disabled', (hotkeys_prefs[key_id]) ? false : true);
		var res_check = s3menuwizard.hotkey.check_hotkey(s3menuwizard_template_hotkeys.key_current, key_id);
		s3menuwizard.hotkeys_check(s3menuwizard_template_hotkeys, res_check);
	}
	//------------------------------------------------------------------------
	else {
		s3menuwizard.hotkeys_check(s3menuwizard_template_hotkeys, '');
	}
	//------------------------------------------------------------------------
	s3menuwizard.hotkey.apply(s3menuwizard_template_hotkeys.key_current, key_id, ! el_checked);
	s3menuwizard.utils.prefs_save('hotkeys', hotkeys_prefs);
	if (! not_check_button_reset_all) {
		s3menuwizard.check_button_reset_all();
	}
}
//------------------------------------------------------------------------------
s3menuwizard.hotkeys_input = function(event, s3menuwizard_template_hotkeys) {
	event.preventDefault();
	event.stopPropagation();
	event.stopImmediatePropagation();

	var is_modifiers = false;
	for (var k of [ 'ctrl','meta','alt','shift' ]) {
		if (event[k + 'Key']) {
			is_modifiers = true;
		}
	}
	if (is_modifiers == false) {
		if (event.keyCode == 13) {
			return s3menuwizard.hotkeys_apply(s3menuwizard_template_hotkeys);
		}
		if (event.keyCode == 27) {
			return s3menuwizard.hotkeys_cancel(s3menuwizard_template_hotkeys);
		}
	}

	var key_id = s3menuwizard_template_hotkeys.key_id;
	var el = s3menuwizard.utils.get_element(s3menuwizard_template_hotkeys, 's3menuwizard_template_hotkeys_textbox');
	var res_check = s3menuwizard.hotkey.input(event, el, key_id);
	s3menuwizard.hotkeys_check(s3menuwizard_template_hotkeys, res_check);

	var key_new = JSON.parse(el.getAttribute('prefs_hash')) || {};
	if (s3menuwizard.hotkey.compare_hotkey(key_new, s3menuwizard_template_hotkeys.key_current)) {
		s3menuwizard.utils.get_element(s3menuwizard_template_hotkeys, 's3menuwizard_template_hotkeys_apply').hidden = true;
		s3menuwizard.utils.get_element(s3menuwizard_template_hotkeys, 's3menuwizard_template_hotkeys_cancel').hidden = true;
	} else {
		s3menuwizard.utils.get_element(s3menuwizard_template_hotkeys, 's3menuwizard_template_hotkeys_apply').hidden = false;
		s3menuwizard.utils.get_element(s3menuwizard_template_hotkeys, 's3menuwizard_template_hotkeys_cancel').hidden = false;
	}
}
//------------------------------------------------------------------------------
s3menuwizard.hotkeys_apply = function(s3menuwizard_template_hotkeys) {
	var hotkeys_prefs = s3menuwizard.utils.prefs_load('hotkeys');
	var key_id = s3menuwizard_template_hotkeys.key_id;
	var el_checked = s3menuwizard.utils.get_element(s3menuwizard_template_hotkeys, 's3menuwizard_template_hotkeys_checkbox').getAttribute('checked');
	el_checked = (String(el_checked) == 'true');

	var el = s3menuwizard.utils.get_element(s3menuwizard_template_hotkeys, 's3menuwizard_template_hotkeys_textbox');
	if (! el.getAttribute('prefs_hash')) { return; }
	var key_new = JSON.parse(el.getAttribute('prefs_hash')) || {};
	//------------------------------------------------------------------------
	if (! hotkeys_prefs[key_id]) {
		hotkeys_prefs[key_id] = {
			'key_original' : s3menuwizard_template_hotkeys.key_original
		};
	}
	//------------------------------------------------------------------------
	hotkeys_prefs[key_id].key_current = key_new;
	hotkeys_prefs[key_id].disabled = ! el_checked;
	s3menuwizard_template_hotkeys.key_current = key_new;
	s3menuwizard.hotkey.apply(key_new, key_id, ! el_checked);

	s3menuwizard.utils.get_element(s3menuwizard_template_hotkeys, 's3menuwizard_template_hotkeys_apply').hidden = true;
	s3menuwizard.utils.get_element(s3menuwizard_template_hotkeys, 's3menuwizard_template_hotkeys_cancel').hidden = true;

	//------------------------------------------------------------------------
	if (el_checked) {
		if (s3menuwizard.hotkey.compare_hotkey(s3menuwizard_template_hotkeys.key_original, s3menuwizard_template_hotkeys.key_current)) {
			delete hotkeys_prefs[key_id];
		}
		s3menuwizard.utils.get_element(s3menuwizard_template_hotkeys, 's3menuwizard_template_hotkeys_reset').setAttribute('disabled', (hotkeys_prefs[key_id]) ? false : true);
	}

	s3menuwizard.utils.prefs_save('hotkeys', hotkeys_prefs);
	el.removeAttribute('prefs_hash');
	s3menuwizard.utils.get_element(s3menuwizard_template_hotkeys, 's3menuwizard_template_hotkeys_textbox').blur();
	s3menuwizard.check_button_reset_all();
}
//------------------------------------------------------------------------------
s3menuwizard.hotkeys_cancel = function(s3menuwizard_template_hotkeys) {
	s3menuwizard.utils.get_element(s3menuwizard_template_hotkeys, 's3menuwizard_template_hotkeys_textbox').value = s3menuwizard.hotkey.key2string(s3menuwizard_template_hotkeys.key_current);
	s3menuwizard.utils.get_element(s3menuwizard_template_hotkeys, 's3menuwizard_template_hotkeys_textbox').blur();

	var res_check = s3menuwizard.hotkey.check_hotkey(s3menuwizard_template_hotkeys.key_current, s3menuwizard_template_hotkeys.key_id);
	s3menuwizard.hotkeys_check(s3menuwizard_template_hotkeys, res_check);

	s3menuwizard.utils.get_element(s3menuwizard_template_hotkeys, 's3menuwizard_template_hotkeys_apply').hidden = true;
	s3menuwizard.utils.get_element(s3menuwizard_template_hotkeys, 's3menuwizard_template_hotkeys_cancel').hidden = true;

	var el = s3menuwizard.utils.get_element(s3menuwizard_template_hotkeys, 's3menuwizard_template_hotkeys_textbox');
	el.removeAttribute('prefs_hash');
}
//------------------------------------------------------------------------------
s3menuwizard.hotkeys_reset = function(s3menuwizard_template_hotkeys) {
	var el = s3menuwizard.utils.get_element(s3menuwizard_template_hotkeys, 's3menuwizard_template_hotkeys_textbox');
	el.value = s3menuwizard.hotkey.key2string(s3menuwizard_template_hotkeys.key_original);
	el.setAttribute('prefs_hash', JSON.stringify(s3menuwizard_template_hotkeys.key_original));

	var res_check = s3menuwizard.hotkey.check_hotkey(s3menuwizard_template_hotkeys.key_original, s3menuwizard_template_hotkeys.key_id);
	s3menuwizard.hotkeys_check(s3menuwizard_template_hotkeys, res_check);

	s3menuwizard.utils.get_element(s3menuwizard_template_hotkeys, 's3menuwizard_template_hotkeys_apply').hidden = false;
	s3menuwizard.utils.get_element(s3menuwizard_template_hotkeys, 's3menuwizard_template_hotkeys_cancel').hidden = false;
}
//------------------------------------------------------------------------------
s3menuwizard.hotkeys_check = function(s3menuwizard_template_hotkeys, res_check) {
	if (res_check == 'SKIP') {
		return;
	}
	if (res_check) {
		s3menuwizard.utils.get_element(s3menuwizard_template_hotkeys, 's3menuwizard_template_hotkeys_label_not_unique').value = res_check;
		s3menuwizard.utils.get_element(s3menuwizard_template_hotkeys, 's3menuwizard_template_hotkeys_hbox_not_unique').hidden = false;

		var title = s3menuwizard.utils.get_element(s3menuwizard_template_hotkeys, 's3menuwizard_template_hotkeys_title_not_unique').value;
		s3menuwizard.utils.get_element(s3menuwizard_template_hotkeys, 's3menuwizard_template_hotkeys_hbox_not_unique').setAttribute("tooltiptext", title + "\n" + res_check);
		s3menuwizard.utils.get_element(s3menuwizard_template_hotkeys, 's3menuwizard_template_hotkeys_textbox').setAttribute("tooltiptext", title + "\n" + res_check);
	} else {
		s3menuwizard.utils.get_element(s3menuwizard_template_hotkeys, 's3menuwizard_template_hotkeys_hbox_not_unique').hidden = true;
		s3menuwizard.utils.get_element(s3menuwizard_template_hotkeys, 's3menuwizard_template_hotkeys_textbox').removeAttribute("tooltiptext");
	}
}
//------------------------------------------------------------------------------
s3menuwizard.hotkeys_all_checkbox = function() {
	var el_checked = document.getElementById('s3menuwizard_hotkeys_all_checkbox').checked;
	var checkbox_list = document.getElementById('s3menuwizard_hotkeys_list').getElementsByTagName('checkbox');
	for (var ch_el of checkbox_list) {
		ch_el.setAttribute('checked', el_checked);
		s3menuwizard.hotkeys_disable_click(ch_el.parentNode, true);
	}
	s3menuwizard.check_button_reset_all();
}
//------------------------------------------------------------------------------
s3menuwizard.advertisement = function() {
	var winD = window.openDialog('chrome://s3menuwizard/content/advertisement.xul', 's3menuwizard_advertisement', 'chrome,modal,centerscreen,toolbar', { 'from_settings' : true });
	if (winD.result && (/^(on)|(off)$/.test(winD.result))) {
		document.getElementById('pref_advertisement').value = winD.result;
		s3menuwizard.preference_set_string('advertisement', winD.result);
		s3menuwizard.advertisement_status();
	}
}
//------------------------------------------------------------------------------
s3menuwizard.advertisement_status = function() {
	if (document.getElementById('pref_advertisement').value == 'off') {
		document.getElementById('adv_is_enabled').hidden = true;
		document.getElementById('adv_is_disabled').hidden = false;
	} else {
		document.getElementById('adv_is_enabled').hidden = false;
		document.getElementById('adv_is_disabled').hidden = true;
	}
}
//------------------------------------------------------------------------------
s3menuwizard.settings_save = function() {
	var result = [];
	//-----------------------------------------------------------------------
	var supportsString = Components.interfaces.nsISupportsString;
	var pref_branch = s3menuwizard.utils.prefs;
	var pref_list = pref_branch.getChildList('');
	//-----------------------------------------------------------------------
	for (var i in pref_list) {
		var pref_name = pref_list[i];

		try {
			var pref_type = pref_branch.getPrefType(pref_name);
			if (pref_type == pref_branch.PREF_STRING) {
				result.push(pref_name + '='  + pref_branch.getComplexValue(pref_name, supportsString).data);
			} else if (pref_type == pref_branch.PREF_BOOL) {
				result.push(pref_name + '='  + pref_branch.getBoolPref(pref_name));
			} else if (pref_type == pref_branch.PREF_INT) {
				result.push(pref_name + '='  + pref_branch.getIntPref(pref_name));
			}
		}
		catch(e) {
		}
	}

 	//-----------------------------------------------------------------------
	var  menu_pref_list = ['command', 'hotkeys', 'menu_item_list_disable', 'menu_item_list_label', 'menu_item_list_move', 'menu_item_list_translate', 'style'];
	var converter = Components.classes["@mozilla.org/intl/scriptableunicodeconverter"].createInstance(Components.interfaces.nsIScriptableUnicodeConverter);
	converter.charset = "UTF-8";

	for (var i=0; i<menu_pref_list.length; i++) {
		var pref_name = menu_pref_list[i];
		var menu_prefs = s3menuwizard.utils.prefs_load(pref_name);
		try {
			var json_str = converter.ConvertFromUnicode(JSON.stringify(menu_prefs));
			result.push('menu_prefs:'+ pref_name + '='  + json_str);
		} catch(e) {
		}
	}

 	//-----------------------------------------------------------------------
	var result_txt = result.join("\n");

	var date = (new Date()).toLocaleFormat('%Y.%m.%d.%H.%M.%S');
	var filename = 'MenuWizard.' + Services.appinfo.name + '.' +date;

	var fp = Components.classes["@mozilla.org/filepicker;1"].createInstance(Components.interfaces.nsIFilePicker);
	var stream = Components.classes["@mozilla.org/network/file-output-stream;1"].createInstance(Components.interfaces.nsIFileOutputStream);

	fp.init(window, document.getElementById('s3menuwizard_prefs').getAttribute('title'), fp.modeSave);
	fp.defaultExtension = 'txt';
	fp.defaultString = filename;
	fp.appendFilters(fp.filterText);

	if (fp.show() != fp.returnCancel) {
		if (fp.file.exists()) {
			fp.file.remove(true);
		}
		fp.file.create(fp.file.NORMAL_FILE_TYPE, 0666);
		stream.init(fp.file, 0x02, 0x200, null);
		stream.write(result_txt, result_txt.length);
		stream.close();
		alert(s3menuwizard.strings.getString("settings.saved"));
	}
}
//------------------------------------------------------------------------------
s3menuwizard.settings_load = function() {
	var result_txt = '';
 	//-----------------------------------------------------------------------
	var fp = Components.classes["@mozilla.org/filepicker;1"].createInstance(Components.interfaces.nsIFilePicker);
	var stream = Components.classes["@mozilla.org/network/file-input-stream;1"].createInstance(Components.interfaces.nsIFileInputStream);
	var streamIO = Components.classes["@mozilla.org/scriptableinputstream;1"].createInstance(Components.interfaces.nsIScriptableInputStream);
	fp.init(window, document.getElementById('s3menuwizard_prefs').getAttribute('title'), fp.modeOpen);
	fp.defaultExtension = 'txt';
	fp.appendFilters(fp.filterText);
	if (fp.show() != fp.returnCancel) {
		stream.init(fp.file, 0x01, 0444, null);
		streamIO.init(stream);
		result_txt = streamIO.read(stream.available());
		streamIO.close();
		stream.close();
	} else {
		return;
	}
 	//-----------------------------------------------------------------------
	var pref_list = result_txt.split("\n");
 	//-----------------------------------------------------------------------
	var supportsString = Components.interfaces.nsISupportsString;
	var pref_branch = s3menuwizard.utils.prefs;
	var  menu_pref_list = {'command':true, 'hotkeys':true, 'menu_item_list_disable':true, 'menu_item_list_label':true, 'menu_item_list_move':true, 'menu_item_list_translate':true, 'style':true };
	var converter = Components.classes["@mozilla.org/intl/scriptableunicodeconverter"].createInstance(Components.interfaces.nsIScriptableUnicodeConverter);
	converter.charset = "UTF-8";

	//-----------------------------------------------------------------------
	for (var i in pref_list) {
		var pref = pref_list[i];
		var p = pref.match(/^(.*?)\=(.*)$/);
		if (p && (p.length>1)) {
			try {
				var pref_name = p[1];
				var pref_value = p[2];
				//----------------------------------------------------
				if (/^menu_prefs\:/.test(pref_name)) {
					var p2 = pref_name.match(/^(.*?)\:(.*)$/);
					if (p2 && (p2.length>1)) {
						pref_name = p2[2];
					}
					if (menu_pref_list[pref_name]) {
						try {
							var json_data = '';
							menu_pref_list[pref_name] = JSON.parse(converter.ConvertToUnicode(pref_value));
						} catch(e) {
						}
					}
				}
				//----------------------------------------------------
				else {
					var pref_type = pref_branch.getPrefType( pref_name );
					if (pref_type == pref_branch.PREF_STRING) {
						var pref_unichar = Components.classes["@mozilla.org/supports-string;1"].createInstance(supportsString);
						pref_unichar.data = pref_value;
						pref_branch.setComplexValue(pref_name, supportsString, pref_unichar);
					} else if (pref_type == pref_branch.PREF_BOOL) {
						pref_branch.setBoolPref(pref_name, pref_value == 'true'  ? true : false);
					} else if (pref_type == pref_branch.PREF_INT) {
						pref_branch.setIntPref(pref_name, parseInt(pref_value));
					}
				}
			}
			catch(e) {
			}
		}
	}
	//-----------------------------------------------------------------------
	//-----------------------------------------------------------------------
	for (var pref_name in menu_pref_list) {
		if (typeof(menu_pref_list[pref_name]) != 'object') {
			menu_pref_list[pref_name] = s3menuwizard.utils.prefs_load(pref_name);
		}
	}
	//-----------------------------------------------------------------------
	s3menuwizard.reset_prefs_all();
	//-----------------------------------------------------------------------
	for (var pref_name in menu_pref_list) {
		s3menuwizard.utils.prefs_save(pref_name, menu_pref_list[pref_name]);
	}

	//-----------------------------------------------------------------------
	//-----------------------------------------------------------------------
	try {
		var wm = Components.classes["@mozilla.org/appshell/window-mediator;1"].getService(Components.interfaces.nsIWindowMediator);
		var e = wm.getEnumerator(null);
		while (e.hasMoreElements()) {
			var win = e.getNext();
			if (win.s3menuwizard && win.s3menuwizard.start) {
				win.s3menuwizard.start(true);
			}
		}
	} catch (e){
	}

	//-----------------------------------------------------------------------
	alert(s3menuwizard.strings.getString("settings.loaded"));
	window.location.reload();
}
//------------------------------------------------------------------------------
s3menuwizard.settings_reset = function() {
	var confirm_txt = s3menuwizard.strings.getString('areYouSureConfirm');
	if (! confirm(confirm_txt)) {
		return false;
	}
	//-----------------------------------------------------------------------
	var pref_branch = s3menuwizard.utils.prefs;
	var pref_list = pref_branch.getChildList('');
	for (var i in pref_list) {
		var pref_name = pref_list[i];
		pref_branch.clearUserPref(pref_name);
	}
	//-----------------------------------------------------------------------
	s3menuwizard.reset_prefs_all();
	//-----------------------------------------------------------------------
	alert(s3menuwizard.strings.getString('settings.restored'));
	window.location.reload();
}
//------------------------------------------------------------------------------
