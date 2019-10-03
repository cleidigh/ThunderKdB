s3menuwizard.utils = {};
s3menuwizard.utils.prefs = Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefService).getBranch("extensions.s3menuwizard.");
s3menuwizard.utils.prefs_global = Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefBranch);

Components.utils.import("resource://gre/modules/Services.jsm");

//------------------------------------------------------------------------------
s3menuwizard.utils.console_log = function(msg) {
	var acs = Components.classes["@mozilla.org/consoleservice;1"].getService(Components.interfaces.nsIConsoleService);
	acs.logStringMessage(msg);
}
//------------------------------------------------------------------------------
s3menuwizard.utils.var_dump = function(arg) {
	var text = '';
	for (var i in arg) {
		try {
			if (! /^function/.test(arg[i])) {
				text += i + ':' + arg[i] + "\n";
			} else {
//				text += i + ': is function' + "\n";
			}
		} catch(e) {
		}
	}
	return text;
}
//------------------------------------------------------------------------------
s3menuwizard.utils.console_log_dump = function(arg) {
	s3menuwizard.utils.console_log(s3menuwizard.utils.var_dump(arg));
}
//------------------------------------------------------------------------------
s3menuwizard.utils.get_label = function(item) {
	var label = { 'value': '', 'is_present': true };
	label.value = item.label || item.getAttribute('label') || '';
	if (label.value == '') {
		label.is_present = false;
		var attr_list = item.attributes;
		for (var attr of attr_list) {
			if (attr.name.toLowerCase().substring(0,5) == "label") {
				label.value = attr.value || '';
			}
		}
	}
	if (label.value == '') {
		label.value = item.id || item.getAttribute('id');
	}
	return label;
}
//------------------------------------------------------------------------------
s3menuwizard.utils.get_accesskey = function(item) {
	var accesskey = item.accesskey || item.getAttribute('accesskey') || '';
	return (accesskey) ? accesskey.toUpperCase() : '';
}
//------------------------------------------------------------------------------
s3menuwizard.utils.get_style = function(item) {
//	var style = item.style || item.getAttribute('style') || '';
	var style = item.getAttribute('style') || '';
	return style;
}
//------------------------------------------------------------------------------
s3menuwizard.utils.set_style = function(item, style) {
	var local_name = item.localName.toLowerCase();
	if (local_name == 'menu') {
		if (! /menu\-iconic/i.test(item.className)) {
			item.className = 'menu-iconic ' + item.className;
		}
	} else if (local_name == 'menuitem') {
		if (! /menuitem\-iconic/i.test(item.className)) {
			item.className = 'menuitem-iconic ' + item.className;
		}
	}
	if (/list\-style\-image/.test(style)) {
		if (item.image) {
			item.image_bak = item.image;
			item.image = '';
		}
	} else if (item.image_bak) {
			item.image = item.image_bak;
			item.image_bak = '';
	}
	item.setAttribute('style', style);
}
//------------------------------------------------------------------------------
s3menuwizard.utils.get_command = function(item) {
	var command = {
		'oncommand' : item.getAttribute('oncommand') || '',
		'onclick' : item.getAttribute('onclick') || '',
		'onpopupshowing' : item.getAttribute('onpopupshowing') || '',
		'onpopuphiding' : item.getAttribute('onpopuphiding') || ''
	}
	return command;
}
//------------------------------------------------------------------------------
s3menuwizard.utils.get_element = function(parent, search_id) {
	if (parent == null) { return null; };

	for (var el of parent.childNodes) {
		if (el.id == search_id) {
			return el;
		}
		if (el.hasChildNodes()) {
			var res = s3menuwizard.utils.get_element(el, search_id);
			if (res != null) {
				return res;
			}
		}
	}
	return null;
}
//------------------------------------------------------------------------------
s3menuwizard.utils.get_element_child_list = function(el, only_anonymous) {
	var result_list = [];
	//----------------------------------------------------------------------
	if (only_anonymous) {
		var anonChildren = [];
		try {
			if (el.ownerDocument instanceof Components.interfaces.nsIDOMDocumentXBL) {
				anonChildren = el.ownerDocument.getAnonymousNodes(el);
			}
		} catch(e) {
		}
		if (anonChildren) {
			for (var i=0; i<anonChildren.length; i++) {
				if ((anonChildren[i].nodeType == 1) && (anonChildren[i].localName.toLowerCase() != 'arrowscrollbox')) {
					result_list.push(anonChildren[i]);
				}
			}
		}
		return result_list;
	}
	//----------------------------------------------------------------------
	for (var i=0; i<el.childNodes.length; i++) {
		if ((el.childNodes[i].nodeType == 1) && (el.childNodes[i].localName.toLowerCase() != 'arrowscrollbox')) {
			result_list.push(el.childNodes[i]);
		}
	}

	return result_list;
}
//------------------------------------------------------------------------------
s3menuwizard.utils.prefs_load = function(pref_name) {
	var pref_value = s3menuwizard.history.get_history(pref_name);
	if (! pref_value) {
		pref_value = (pref_name == 'menu_item_list_move') ? [] : {};
	}
	return pref_value;
}
//------------------------------------------------------------------------------
s3menuwizard.utils.prefs_save = function(pref_name, pref_value) {
	s3menuwizard.history.set_history(pref_name, pref_value);
	return true;
}
//------------------------------------------------------------------------------
s3menuwizard.utils.prefs_get = function(pref_type, pref_name) {
	var result = false;
	switch(pref_type) {
		case 'bool':
			result = s3menuwizard.utils.prefs.getBoolPref(pref_name);
			break;
		case 'string':
			result = s3menuwizard.utils.prefs.getCharPref(pref_name);
			break;
		case 'int':
			result = s3menuwizard.utils.prefs.getIntPref(pref_name);
			break;
	}

	return result;
}
//------------------------------------------------------------------------------
s3menuwizard.utils.prefs_set = function(pref_type, pref_name, pref_value) {
	switch(pref_type) {
		case 'bool':
			s3menuwizard.utils.prefs.setBoolPref(pref_name, pref_value);
			break;
		case 'string':
			s3menuwizard.utils.prefs.setCharPref(pref_name, pref_value);
			break;
		case 'int':
			result = s3menuwizard.utils.prefs.setIntPref(pref_name, pref_value);
			break;
	}
	return true;
}
//------------------------------------------------------------------------------
s3menuwizard.utils.get_menu_name = function(win, id) {
	var result = id;
	var el = win.document.getElementById(id);
	if (el) {
		result = el.value || id;
	}
	return result;
}
//------------------------------------------------------------------------------
s3menuwizard.utils.create_general_items = function(win) {
	var main_list = new Array();
	//-----------------------------------------------------------------------
	var general_elements = [
		{ 'id': 'appmenu-popup', 'label': s3menuwizard.utils.get_menu_name(win, 's3menuwizard_brandShortName') },	// Firefox
		{ 'id': 'toolbar-menubar', 'label': s3menuwizard.utils.get_menu_name(win, 's3menuwizard_menubarCmd') },		// Firefox, SeaMonkey
		{ 'id': 'mail-menubar', 'label': s3menuwizard.utils.get_menu_name(win, 's3menuwizard_menubarCmd') },		// Thunderbird
		{ 'id': 'tabContextMenu', 'label': s3menuwizard.utils.get_menu_name(win, 's3menuwizard_tabsToolbar') },		 // Firefox, SeaMonkey, Thunderbird
		{ 'id': 'contentAreaContextMenu', 'label': s3menuwizard.utils.get_menu_name(win, 's3menuwizard_mainContextMenu') }, // Firefox, SeaMonkey
		{ 'id': 'mailContext', 'label': s3menuwizard.utils.get_menu_name(win, 's3menuwizard_mainContextMenu') }, // Thunderbird
		{ 'id': 'toolbar-context-menu', 'label': s3menuwizard.utils.get_menu_name(win, 's3menuwizard_toolbarContextMenu') }, // Firefox, SeaMonkey
		{ 'id': 'placesContext', 'label': s3menuwizard.utils.get_menu_name(win, 's3menuwizard_bookmarksToolbar') }, // Firefox, SeaMonkey
		{ 'id': 'folderPaneContext', 'label': s3menuwizard.utils.get_menu_name(win, 's3menuwizard_folderPaneContext') }, // Thunderbird

		// only for Configure menu on the fly
		{ 'id': 'nav-bar', 'label': 'nav-bar' }, // Firefox, SeaMonkey
		{ 'id': 'mail-bar3', 'label': 'nav-bar' }, // Thunderbird
		{ 'id': 'PersonalToolbar', 'label': 'PersonalToolbar' }, // Firefox, SeaMonkey
		{ 'id': 'msgComposeContext', 'label': 'msgComposeContext' } // Thunderbird
	];

	//-----------------------------------------------------------------------
	// additional elements
	//-----------------------------------------------------------------------
	for (var menu_add_id of ['multipletab-selection-menu']) {
		if (win.document.getElementById(menu_add_id)) {
			var menu_add = win.document.getElementById(menu_add_id);
			var label =  menu_add.label || menu_add.getAttribute('label') || menu_add_id;
			general_elements.push({ 'id' : menu_add_id, 'label' : label });
		}
	}

	//-----------------------------------------------------------------------
	// toolbar buttons
	//-----------------------------------------------------------------------
/*
	if (win.document.getElementById('nav-bar')) {
		var navbar = win.document.getElementById('nav-bar');
		var toolbarbutton_list = navbar.getElementsByTagName('toolbarbutton');
		for (var toolbarbutton of toolbarbutton_list) {
			var menupopup_list = toolbarbutton.getElementsByTagName('menupopup') || [];
			if (menupopup_list.length > 0) {
				if ((menupopup_list.length == 1) && (menupopup_list[0].getElementsByTagName('menuitem').length == 0)) {
					continue;
				}

				var id =  toolbarbutton.id || toolbarbutton.getAttribute('id') || '';
				var label =  toolbarbutton.label || toolbarbutton.getAttribute('label') || toolbarbutton.id;
				if (id) {
					general_elements.push({ 'id' : id, 'label' : label });
				}
			}
		}
	}
*/
	//-----------------------------------------------------------------------
	for (var menu of general_elements) {
		//----------------------------------------------------------------
		var id =  menu.id;
		var menu_item = win.document.getElementById(id);
		//----------------------------------------------------------------
		if ((! menu_item) && (id == 'tabContextMenu')) {
			try {
				if (win.document.getAnonymousElementByAttribute(win.document.getElementById("content") , "anonid", "tabContextMenu")) {
					menu_item = win.document.getAnonymousElementByAttribute(win.document.getElementById("content") , "anonid", "tabContextMenu");
				}
				else if(win.gBrowser.tabContainer && win.gBrowser.tabContainer.contextMenu) {
					menu_item = win.gBrowser.tabContainer.contextMenu;
				}
			} catch(e) {
			};
		}

		//----------------------------------------------------------------
		if (menu_item) {
			menu_item.setAttribute('id', id);
			//---------------------------------------------------------
			menu_item.setAttribute('s3mw_is_root_menu', true);
			//---------------------------------------------------------
			var label = menu_item.getAttribute('label') || menu.label;
			menu_item.setAttribute('view_label', label);
			//---------------------------------------------------------
			var original_label = menu.label;
			menu_item.setAttribute('original_label', original_label);
			//---------------------------------------------------------
			//---------------------------------------------------------
			var original_accesskey = s3menuwizard.utils.get_accesskey(menu_item);
			menu_item.setAttribute('original_accesskey', original_accesskey);
			//---------------------------------------------------------
			main_list.push(menu_item);
		}
	}
	return main_list;
}
//------------------------------------------------------------------------------
s3menuwizard.utils.confirm = function() {
	var confirm_msg = s3menuwizard.strings.getString("areYouSureConfirm");
	var promptSer = Components.classes["@mozilla.org/embedcomp/prompt-service;1"].getService(Components.interfaces.nsIPromptService);
	return promptSer.confirm(null, "Menu Wizard", confirm_msg);
}
//------------------------------------------------------------------------------
s3menuwizard.utils.check_trash_button = function(menu_id) {
	var main_hbox = s3menuwizard.search_main_node(document.getElementById(menu_id));
	if (main_hbox) {
		var s3menuwizard_template_vbox_child_list = s3menuwizard.utils.get_element(main_hbox, 's3menuwizard_template_vbox_child_list');
		if (s3menuwizard_template_vbox_child_list) {
			s3menuwizard_template_vbox_child_list.firstChild.hidden = (s3menuwizard_template_vbox_child_list.firstChild.nextSibling) ? true : false;
			s3menuwizard.utils.get_element(main_hbox, 's3menuwizard_template_trash').setAttribute('trash_disabled', s3menuwizard_template_vbox_child_list.firstChild.hidden);
		}
	}
}
//------------------------------------------------------------------------------
s3menuwizard.utils.get_nodeName = function(el) {
	var nodeName = el.nodeName;
	if (/^xul\:/.test(nodeName)) {
		nodeName = nodeName.replace(/^xul\:/, '');
	}
	return nodeName;
}
//------------------------------------------------------------------------------
s3menuwizard.utils.apply_multi_window_settings = function(param) {
	if (s3menuwizard.utils.is_Thunderbird()) {
		var win_main = window;
		if (s3menuwizard.is_iframe) {
			win_main = top.window;
		}
		var s3menuwizard_panel_split = win_main.document.getElementById("s3menuwizard_panel_split");
		if (! s3menuwizard_panel_split) {
			return;
		}
		var win_iframe = s3menuwizard_panel_split.contentWindow;
		for (var win of [win_main, win_iframe]) {
			try {
				if (param.action == 'move') {
					s3menuwizard.utils.apply_settings_move(param, win);
				}
				else if (param.action == 'label') {
					s3menuwizard.utils.apply_settings_label(param, win);
				}
				else if (param.action == 'disable') {
					s3menuwizard.utils.apply_settings_disable(param, win);
				}
				else if (param.action == 'in_trash') {
					s3menuwizard.utils.apply_settings_in_trash(param, win);
				}
				else if (param.action == 'disable_reset') {
					s3menuwizard.utils.apply_settings_disable_reset(param, win);
				}
				else if (param.action == 'label_reset') {
					s3menuwizard.utils.apply_settings_label_reset(param, win);
				}
				else if (param.action == 'move_reset') {
					s3menuwizard.utils.apply_settings_move_reset(param, win);
				}
		
				win.s3menuwizard.check_button_reset_all();
			} catch(e) {
			}
		}
	} else {
		var wm = Components.classes["@mozilla.org/appshell/window-mediator;1"].getService(Components.interfaces.nsIWindowMediator);
		var win_list = wm.getEnumerator(s3menuwizard.win_type);
		var win_pf;

		while (win_list.hasMoreElements()) {
			win_pf = win_list.getNext();
			var tabs = (win_pf.gBrowser.visibleTabs) ? win_pf.gBrowser.visibleTabs : win_pf.gBrowser.tabs;
			for (let tab of tabs) {
				if (tab.linkedBrowser.currentURI.spec == 'about:config-menu') {
					var win_main = tab.linkedBrowser.contentWindow;
					var s3menuwizard_panel_split = win_main.document.getElementById("s3menuwizard_panel_split");
					if (! s3menuwizard_panel_split) {
						continue;
					}
					var win_iframe = s3menuwizard_panel_split.contentWindow;
					for (var win of [win_main, win_iframe]) {
						try {
							if (param.action == 'check_button_reset_all') {
								//---
							}
							else if (param.action == 'move') {
								s3menuwizard.utils.apply_settings_move(param, win);
							}
							else if (param.action == 'label') {
								s3menuwizard.utils.apply_settings_label(param, win);
							}
							else if (param.action == 'disable') {
								s3menuwizard.utils.apply_settings_disable(param, win);
							}
							else if (param.action == 'in_trash') {
								s3menuwizard.utils.apply_settings_in_trash(param, win);
							}
							else if (param.action == 'disable_reset') {
								s3menuwizard.utils.apply_settings_disable_reset(param, win);
							}
							else if (param.action == 'label_reset') {
								s3menuwizard.utils.apply_settings_label_reset(param, win);
							}
							else if (param.action == 'move_reset') {
								s3menuwizard.utils.apply_settings_move_reset(param, win);
							}
		
							win.s3menuwizard.check_button_reset_all();
						} catch(e) {
						}
					}
				}
			}
		}
	}
}
//------------------------------------------------------------------------------
s3menuwizard.utils.apply_settings_move = function(param, win) {
	var main_hbox = win.document.getElementById(param.main_hbox_id);
	//----------------------------------------------------------
	var nodeData = null;
	if (param.is_new_menu_item) {
		nodeData = param.nodeData.cloneNode(true);
	} else {
		nodeData = win.document.getElementById(param.nodeData.id);
	}
	//----------------------------------------------------------
	if (main_hbox.nextSibling) {
		main_hbox.nextSibling.parentNode.insertBefore(nodeData, main_hbox.nextSibling);
	} else {
		main_hbox.parentNode.appendChild(nodeData);
	}
	//----------------------------------------------------------
	if (param.place_id.substr(-17) == '...s3mw_menupopup') {
		main_hbox.hidden = true;
		win.s3menuwizard.utils.get_element( win.s3menuwizard.search_main_node(main_hbox.parentNode), 's3menuwizard_template_trash').setAttribute('trash_disabled', true);
	}
	if (! param.is_new_menu_item) {
		win.s3menuwizard.utils.check_trash_button(param.place_before_id);
	}
	win.s3menuwizard.utils.get_element(nodeData, 's3menuwizard_template_label').setAttribute('is_moved', true);
}
//------------------------------------------------------------------------------
s3menuwizard.utils.apply_settings_label = function(param, win) {
	var main_hbox = win.document.getElementById(param.main_hbox_id);
	var label = s3menuwizard.utils.get_element(main_hbox, 's3menuwizard_template_label');

	label.value = param.textbox_value;
	label.hidden = false;

	if (param.original_label != param.textbox_value) {
		label.setAttribute("change_label_name", true);
		label.setAttribute("tooltiptext", param.original_label);
	} else {
		label.setAttribute("change_label_name", false);
		label.removeAttribute("tooltiptext");
	}
}
//------------------------------------------------------------------------------
s3menuwizard.utils.apply_settings_disable = function(param, win) {
	var main_hbox = win.document.getElementById(param.main_hbox_id);
	main_hbox.setAttribute("is_disabled", param.is_hidden);

	win.s3menuwizard.utils.get_element(main_hbox, 's3menuwizard_template_checkbox').setAttribute('checked',  ! param.is_hidden);

	if (param.is_hidden) {
		win.s3menuwizard.utils.get_element(main_hbox, 's3menuwizard_template_box_checkbox').setAttribute("change_item_disable", true);
	} else {
		win.s3menuwizard.utils.get_element(main_hbox, 's3menuwizard_template_box_checkbox').setAttribute("change_item_disable", false);
	}
}
//------------------------------------------------------------------------------
s3menuwizard.utils.apply_settings_in_trash = function(param, win) {
	var main_hbox = win.document.getElementById(param.main_hbox_id);
	main_hbox.parentNode.removeChild(main_hbox);
}
//------------------------------------------------------------------------------
s3menuwizard.utils.apply_settings_disable_reset = function(param, win) {
	var s3menuwizard_template = win.document.getElementById(param.menu_id);
	if (s3menuwizard_template && (s3menuwizard_template != null)) {
		s3menuwizard.utils.get_element(s3menuwizard_template, 's3menuwizard_template_checkbox').setAttribute('checked', true);
		s3menuwizard_template.setAttribute("is_disabled", false);
		s3menuwizard.utils.get_element(s3menuwizard_template, 's3menuwizard_template_box_checkbox').removeAttribute("change_item_disable");
	}
}
//------------------------------------------------------------------------------
s3menuwizard.utils.apply_settings_label_reset = function(param, win) {
	var s3menuwizard_template = win.document.getElementById(param.menu_id);
	if (s3menuwizard_template && (s3menuwizard_template != null)) {
		var template_label = s3menuwizard.utils.get_element(s3menuwizard_template, 's3menuwizard_template_label');
		template_label.value = param.origin_label;
		template_label.removeAttribute("change_label_name");
		template_label.removeAttribute("tooltiptext");
	}
}
//------------------------------------------------------------------------------
s3menuwizard.utils.apply_settings_move_reset = function(param, win) {
	var menu_pref = param.menu_pref;

	var menu_item_el = null;
	if (param.is_new_menu_item) {
		menu_item_el = param.menu_item_el.cloneNode(true);
	} else {
		menu_item_el = win.document.getElementById(menu_pref.menu_id);
	}
	if (menu_item_el == null) { return; }

	//-----------------------------------------------------------------------
	var menu_before_el = win.document.getElementById(menu_pref.before_id);
	if (menu_before_el) {
		//-----------------------------------------------------------------------
		if ((menu_pref.before_id == 's3menuwizard_new_menu_separator') || (menu_pref.before_id.substr(0,28)  == 's3menuwizard_new_menu_folder') || (menu_pref.before_id.substr(0,26)  == 's3menuwizard_new_menu_item')) {
			win.s3menuwizard.reset_prefs_label(menu_pref.menu_id);
			win.s3menuwizard.reset_prefs_disable(menu_pref.menu_id);
			menu_item_el.parentNode.removeChild(menu_item_el);
		}
		else if (menu_pref.before_down) {
			menu_before_el.parentNode.insertBefore(menu_item_el, menu_before_el);
		} else {
			win.s3menuwizard.utils.get_element(menu_before_el, 's3menuwizard_template_vbox_child_list').appendChild(menu_item_el);
		}
		//-----------------------------------------------------------------------
		if (menu_pref.before_id.substr(0,14)  == 's3mw_new_menu_') {
			var menu_tmp = s3menuwizard.search_main_node(menu_before_el.parentNode);
			win.s3menuwizard.utils.check_trash_button(menu_pref.before_id);
		}
	}
	//-----------------------------------------------------------------------
	if (menu_pref.place_id.substr(0,22)  == 's3mw....s3mw_new_menu_') {
		var place_id_node = document.getElementById(menu_pref.place_id);
		if (place_id_node && place_id_node.parentNode) {
			var menu_tmp = win.s3menuwizard.search_main_node(place_id_node.parentNode);
			win.s3menuwizard.utils.check_trash_button(menu_tmp.id);
		}
	}
	if (param.check_is_no_moved) {
		win.s3menuwizard.utils.get_element(menu_item_el, 's3menuwizard_template_label').removeAttribute('is_moved');
	}
}
//------------------------------------------------------------------------------
s3menuwizard.utils.check_CustomizationsAdblockPlus = function(el) {
	try {
		if (el.className == 'abp-contextmenuitem') {
			if (s3menuwizard.utils.prefs_get('bool', 'present_CustomizationsAdblockPlus')) {
				if (s3menuwizard.utils.prefs_global.getBoolPref('extensions.abpcustomization.remove-menus')) {
					return true;
				}
			}
		}
	} catch(e){}

	return false;
}
//------------------------------------------------------------------------------
s3menuwizard.utils.check_FileFolderShortcuts = function(menu_item) {
	var context_menu = menu_item.context || menu_item.getAttribute('context') || '';
	if (context_menu == "Shortcut-Toolbar-Context") {
		return true;
	}
	return false;
}
//------------------------------------------------------------------------------
s3menuwizard.utils.check_places_menu = function(menu_item) {
	//-----------------------------------------------------------------------
	function check_parent(parent_menu) {
		//-----------------------------------------------------------------
		if (parent_menu.className && (parent_menu.className.substring(0,9) == "bookmark-")) {
				return true;
		}
		//-----------------------------------------------------------------
		if (parent_menu._placesNode || parent_menu._placesView) {
			return true;
		}
		//-----------------------------------------------------------------
		return false;
	}
	//-----------------------------------------------------------------------
	if (menu_item.parentNode) {
		if (check_parent(menu_item.parentNode)) {
			return true;
		}
		if (menu_item.parentNode.parentNode) {
			if (check_parent(menu_item.parentNode.parentNode)) {
				return true;
			}
		}
	}

	//-----------------------------------------------------------------------
	if (menu_item._placesNode || menu_item._placesView) {
		return true;
	}
	//-----------------------------------------------------------------------
	if (menu_item.anchorNode && menu_item.anchorNode.id == "historyUndoMenu") {
		return true;
	}
	if (menu_item.id == "BMB_bookmarksPopup") {
		return true;
	}
	return false;
}
//------------------------------------------------------------------------------
s3menuwizard.utils.check_special_conditions = function(menu_item) {
/*
	if (menu_item.parentNode) {
		// special conditions of the algorithm for TabMixPlus
		if (menu_item.parentNode.id && (menu_item.parentNode.id.substring(0,3) == "tm-")) {
			return true;
		}
	}
*/
	//-----------------------------------------------------------------------
	var id =  menu_item.id || menu_item.getAttribute('id') || '';
	//-----------------------------------------------------------------------
	if (! id) {
		if (menu_item.parentNode) {
			id =  menu_item.parentNode.id || menu_item.parentNode.getAttribute('id') || '';
		}
	}
	//-----------------------------------------------------------------------
	if (! id) { return false; }

	//-----------------------------------------------------------------------
	// special conditions of the algorithm for NoScript
	if (id.substring(0,8) == "noscript") {
		return true;
	}
	// special conditions of the algorithm for SiteDelta
	if (id.substring(0,9) == "sitedelta") {
		return true;
	}
	// special conditions of the algorithm for "File and Folder Shortcuts"
	if (id == "Shortcut-MainMenupopup") {
		return true;
	}
	// special conditions of the algorithm for BMB_bookmarksPopup
//	if (id == "BMB_bookmarksPopup") {
//		return true;
//	}
	// special conditions of the algorithm for "Clippings"
	if (id.substring(0,13) == "ae-clippings-") {
//		return true;
	}
	// special conditions of the algorithm for LastPass
	if (id.substring(0,4) == "lpt_") {
		return true;
	}
	// special conditions of the algorithm for TabMixPlus
	if (id.substring(0,3) == "tm-") {
		return true;
	}
	// special conditions of the algorithm for Tile Tabs
	if (id.substring(0,9) == "tiletabs-") {
		return true;
	}
	//-----------------------------------------------------------------------
	if (id == "historyUndoMenu") {
		return true;
	}
	if (id == "historyUndoPopup") {
		return true;
	}

	return false;
}
//------------------------------------------------------------------------------
s3menuwizard.utils.show_hide_menuitem = function(el, is_hide, is_attr_remove) {
	if (Services.appinfo.OS.toUpperCase() == 'DARWIN') {
		var go_super_hide = false;
		var el_parent = el.parentNode;
		while (el_parent) {
			if ((el_parent.id == 'main-menubar') || (el_parent.id == 'mail-menubar')) {
				go_super_hide = true;
				el_parent = null;
				break;
			} else {
				el_parent = el_parent.parentNode;
			}
		}
		if (go_super_hide) {
			el.hidden = is_hide;
		}
	}

	if (is_attr_remove) {
		el.removeAttribute('s3mws_hide_menu');
	} else {
		el.setAttribute('s3mws_hide_menu', is_hide);
	}
}
//------------------------------------------------------------------------------
s3menuwizard.utils.openDialog = function(url, name, features, args) {
	var not_exists = true;

	var windowManager = Components.classes['@mozilla.org/appshell/window-mediator;1'].getService(Components.interfaces.nsIWindowMediator);
	var enumerator = windowManager.getEnumerator(null);
	while (enumerator.hasMoreElements()) {
		var win = enumerator.getNext();
		if (win.name == name) {
			not_exists = false;
			win.focus();
		}
	}
	if (not_exists) {
		var winD = window.openDialog( url, name, features, args );
		winD.focus();
	}
}
//------------------------------------------------------------------------------
s3menuwizard.utils.set_id_for_menu = function(el, is_initial) {
	var set_id_for_menu = s3menuwizard.utils.prefs_get('bool', 'set_id_for_menu');
	if (! set_id_for_menu) { return ''; }
	var id =  el.id || el.getAttribute('id') || '';
	if (id) { return ''; }
	if (s3menuwizard.utils.check_places_menu(el)) { return ''; }

	var nodeName = s3menuwizard.utils.get_nodeName(el);

	var el_text = { 'value': '' };
	el_text.value = el.image || el.getAttribute('image') || '';
	if (el_text.value == '') {
		el_text = s3menuwizard.utils.get_label(el);
	}
	if (el_text.value == '') {
		try {
			el_text.value = 's3mw....' + nodeName + '.' + ((el.previousSibling) ? (el.previousSibling.id || el.previousSibling.getAttribute('id') || '----') : '----') + '.' + ((el.nextSibling) ? (el.nextSibling.id || el.nextSibling.getAttribute('id') || '----') : '----');
		} catch(e) {
		}
	}
	if (el_text.value == '') { return ''; }

	var tmp_id = el_text.value + '|||' + nodeName + '|||';
	if (is_initial && el.parentNode) {
		tmp_id += s3menuwizard.utils.set_id_for_menu(el.parentNode, false);
		var parent_id =  el.parentNode.id || el.parentNode.getAttribute('id') || '';
		tmp_id += parent_id + '|||';
		if (el.parentNode.parentNode) {
			tmp_id += s3menuwizard.utils.set_id_for_menu(el.parentNode.parentNode, false);
			var parent2_id =  el.parentNode.parentNode.id || el.parentNode.parentNode.getAttribute('id') || '';
			tmp_id += parent2_id + '|||';
		}
	}

	if (is_initial) {
		var new_id = s3menuwizard.utils.get_md5(tmp_id);
		new_id = 's3mw....createID_' + new_id;
		el.id = new_id;
		el.setAttribute('id', new_id);
		return new_id;
	}

	return '';
}
//------------------------------------------------------------------------------
s3menuwizard.utils.get_md5 = function(str) {
	var converter = Components.classes["@mozilla.org/intl/scriptableunicodeconverter"].createInstance(Components.interfaces.nsIScriptableUnicodeConverter);
	converter.charset = "UTF-8";
	var result = {};
	var data = converter.convertToByteArray(str, result);
	var ch = Components.classes["@mozilla.org/security/hash;1"].createInstance(Components.interfaces.nsICryptoHash);
	ch.init(ch.MD5);
	ch.update(data, data.length);
	var hash = ch.finish(false);

	// convert the binary hash data to a hex string.
	var s = '';
	for (var i in hash) {
		s += s3menuwizard.utils.toHexString(hash.charCodeAt(i));
	}
	return s;
}
//------------------------------------------------------------------------------
s3menuwizard.utils.toHexString = function(charCode) {
	return ("0" + charCode.toString(16)).slice(-2);
}
//------------------------------------------------------------------------------
s3menuwizard.utils.is_Thunderbird = function() {
//	return (Services.appinfo.name == 'Thunderbird') ? true : false;
	return (Services.appinfo.ID == '{3550f703-e582-4d05-9a08-453d09bdfdc6}') ? true : false;
}
//------------------------------------------------------------------------------
