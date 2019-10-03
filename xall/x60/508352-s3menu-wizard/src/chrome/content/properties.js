var s3menuwizard = {};

//------------------------------------------------------------------------------
s3menuwizard.dialog_init = function() {
	var wm = Components.classes["@mozilla.org/appshell/window-mediator;1"].getService(Components.interfaces.nsIWindowMediator);
	s3menuwizard.win_type = (s3menuwizard.utils.is_Thunderbird()) ? "mail:3pane" : "navigator:browser";
	s3menuwizard.win = wm.getMostRecentWindow(s3menuwizard.win_type);

	var innerWidth = s3menuwizard.utils.prefs_get('int', 'size_window_properties_width');
	if (innerWidth > 0) {
		window.innerWidth = innerWidth;
	}
	var innerHeight = s3menuwizard.utils.prefs_get('int', 'size_window_properties_height');
	if (innerHeight > 0) {
		window.innerHeight = innerHeight;
	}
	s3menuwizard.setActivationApplyButton(false);

	var main_hbox = (window.arguments && window.arguments[0]);
	if (main_hbox) {
		if (s3menuwizard.win.document.getElementById(main_hbox.id)) {
			s3menuwizard.properties_init(main_hbox);
			return;
		}
	}
	window.close();
}
//------------------------------------------------------------------------------
s3menuwizard.properties_init = function(main_hbox) {
	s3menuwizard.main_hbox = main_hbox;
	//-----------------------------------------------------------------------
	var this_menu = s3menuwizard.win.document.getElementById(main_hbox.id);
	window.document.title += ' ' + this_menu.getAttribute('original_label');

	//-----------------------------------------------------------------------
	if (this_menu.getAttribute('label')) {
		document.getElementById('s3menuwizard_label').value = this_menu.getAttribute('label');
	}
	s3menuwizard.label_reset_check();
	//-----------------------------------------------------------------------
	if (this_menu.getAttribute('accesskey')) {
		document.getElementById('s3menuwizard_accesskey').value = this_menu.getAttribute('accesskey').toUpperCase();
	}
	s3menuwizard.accesskey_reset_check();

	//-----------------------------------------------------------------------
	document.getElementById('s3menuwizard_menu_id').value = main_hbox.id;
	//-----------------------------------------------------------------------
	var menu_prefs_disable = s3menuwizard.utils.prefs_load('menu_item_list_disable');
	document.getElementById('s3menuwizard_show').checked = (menu_prefs_disable[main_hbox.id]) ? false : true;
	//-----------------------------------------------------------------------
	var command = s3menuwizard.utils.get_command(this_menu);
	document.getElementById('s3menuwizard_oncommand').value = command.oncommand;
	document.getElementById('s3menuwizard_onclick').value = command.onclick;
	document.getElementById('s3menuwizard_onpopupshowing').value = command.onpopupshowing;
	document.getElementById('s3menuwizard_onpopuphiding').value = command.onpopuphiding;
	//-----------------------------------------------------------------------
	var style = s3menuwizard.utils.get_style(this_menu);
	document.getElementById('s3menuwizard_style').value = style;

	//-----------------------------------------------------------------------
	var hotkey_ok = false;
	if (this_menu.getAttribute('key')) {
		var key_id = this_menu.getAttribute('key');
		var key_node = s3menuwizard.win.document.getElementById(key_id);
		if (key_node) {
			var hotkeys_prefs = s3menuwizard.utils.prefs_load('hotkeys');
			var key = s3menuwizard.hotkey.create_key_from_node(key_node);
			s3menuwizard.hotkey_original = key;
			if (hotkeys_prefs[key_id]) {
				key = hotkeys_prefs[key_id].key_current;
				s3menuwizard.hotkey_original = hotkeys_prefs[key_id].key_original;
			}
			//-----------------------------------------------------------
//			if (key.modifiers.length > 0) {
				var s3menuwizard_template_hotkeys = document.getElementById('s3menuwizard_template_hotkeys');
				s3menuwizard_template_hotkeys.key_id = key_id;
				s3menuwizard_template_hotkeys.key_original = s3menuwizard.hotkey_original;
				s3menuwizard_template_hotkeys.key_current = key;
				//----------------------------------------------------
				s3menuwizard.utils.get_element(s3menuwizard_template_hotkeys, 's3menuwizard_template_hotkeys_textbox').value = s3menuwizard.hotkey.key2string(key);
				//------------------------------------------------------------------
				var hotkey_disabled = (hotkeys_prefs[key_id] && hotkeys_prefs[key_id].disabled) ? true : false;
				s3menuwizard.hotkeys_disabled_set(s3menuwizard_template_hotkeys, hotkey_disabled);
				//----------------------------------------------------
				if (! hotkey_disabled) {
					var res_check = s3menuwizard.hotkey.check_hotkey(s3menuwizard_template_hotkeys.key_current, s3menuwizard_template_hotkeys.key_id);
					s3menuwizard.hotkeys_check(s3menuwizard_template_hotkeys, res_check);
				}
		
				//----------------------------------------------------
				s3menuwizard.utils.get_element(s3menuwizard_template_hotkeys, 's3menuwizard_template_hotkeys_checkbox').setAttribute('checked', ! hotkey_disabled);
				hotkey_ok = true;
//			}
		}
	}
	if (! hotkey_ok) {
		var key_id = main_hbox.id + '_s3mw_hotkey';
		var key = { modifiers: [], key: "", keycode: "", disabled: true };
		s3menuwizard.hotkey_original = key;
		//-----------------------------------------------------------
		var s3menuwizard_template_hotkeys = document.getElementById('s3menuwizard_template_hotkeys');
		s3menuwizard_template_hotkeys.key_id = key_id;
		s3menuwizard_template_hotkeys.key_original = s3menuwizard.hotkey_original;
		var hotkey_disabled = true;
		s3menuwizard.hotkeys_disabled_set(s3menuwizard_template_hotkeys, hotkey_disabled);
		//----------------------------------------------------
		s3menuwizard_template_hotkeys.key_original = key;
		s3menuwizard_template_hotkeys.key_current = key;
		//----------------------------------------------------
		s3menuwizard.utils.get_element(s3menuwizard_template_hotkeys, 's3menuwizard_template_hotkeys_checkbox').setAttribute('checked', ! hotkey_disabled);
	}
	//-----------------------------------------------------------------------
}
//------------------------------------------------------------------------------
s3menuwizard.onresize = function() {
	s3menuwizard.utils.prefs_set('int', 'size_window_properties_width', window.innerWidth);
	s3menuwizard.utils.prefs_set('int', 'size_window_properties_height', window.innerHeight);
}
//------------------------------------------------------------------------------
s3menuwizard.accept = function() {
	if (s3menuwizard.win.document.getElementById(s3menuwizard.main_hbox.id)) {
		s3menuwizard.label_accept();
		s3menuwizard.style_accept();
		s3menuwizard.command_accept();
		s3menuwizard.disable_menu_item_accept();
		s3menuwizard.hotkeys_accept();
	}
	s3menuwizard.setActivationApplyButton(false);
}
//------------------------------------------------------------------------------
s3menuwizard.disable_menu_item_accept = function() {
	var el = document.getElementById('s3menuwizard_show');
	var el_checked = el.getAttribute('checked');
	el_checked = (String(el_checked) == 'true');
	var is_hidden = ! el_checked;
	var main_hbox = s3menuwizard.main_hbox;

	//-----------------------------------------------------------------------
	try {
		var wm = Components.classes["@mozilla.org/appshell/window-mediator;1"].getService(Components.interfaces.nsIWindowMediator);
		var win_list = wm.getEnumerator(s3menuwizard.win_type);
		var win;
	
		while (win_list.hasMoreElements()) {
			win = win_list.getNext();
			var menu_item = win.document.getElementById(main_hbox.id);
			s3menuwizard.utils.show_hide_menuitem(menu_item, is_hidden);
			menu_item.style.color = '';
		}
	} catch (e){
	}

	//-----------------------------------------------------------------------
	var menu_item = s3menuwizard.win.document.getElementById(main_hbox.id);
	var menu_prefs_disable = s3menuwizard.utils.prefs_load('menu_item_list_disable');
	if (is_hidden) {
		menu_prefs_disable[main_hbox.id] = true;
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
s3menuwizard.hotkeys_disabled_set = function(s3menuwizard_template_hotkeys, hotkey_disabled) {
	for (var q of ['textbox', 'reset']) {
		s3menuwizard.utils.get_element(s3menuwizard_template_hotkeys, 's3menuwizard_template_hotkeys_' + q).disabled = hotkey_disabled;
	}
	s3menuwizard.hotkeys_reset_check(hotkey_disabled);
}
//------------------------------------------------------------------------------
s3menuwizard.hotkeys_check = function(s3menuwizard_template_hotkeys, res_check) {
	if (res_check == 'SKIP') {
		return;
	}
	if (res_check) {
		s3menuwizard.utils.get_element(s3menuwizard_template_hotkeys, 's3menuwizard_template_hotkeys_label_not_unique').value = '(' + res_check + ')';
		s3menuwizard.utils.get_element(s3menuwizard_template_hotkeys, 's3menuwizard_template_hotkeys_hbox_not_unique').hidden = false;
	} else {
		s3menuwizard.utils.get_element(s3menuwizard_template_hotkeys, 's3menuwizard_template_hotkeys_hbox_not_unique').hidden = true;
	}
}
//------------------------------------------------------------------------------
s3menuwizard.hotkeys_disable_click = function(s3menuwizard_template_hotkeys) {
	var hotkeys_prefs = s3menuwizard.utils.prefs_load('hotkeys');
	var key_id = s3menuwizard_template_hotkeys.key_id;
	var el_checked = s3menuwizard.utils.get_element(s3menuwizard_template_hotkeys, 's3menuwizard_template_hotkeys_checkbox').getAttribute('checked');
	el_checked = (String(el_checked) == 'true');
	s3menuwizard.hotkeys_disabled_set(s3menuwizard_template_hotkeys, ! el_checked);
	//------------------------------------------------------------------------
	if (el_checked) {
		var res_check = s3menuwizard.hotkey.check_hotkey(s3menuwizard_template_hotkeys.key_current, key_id);
		s3menuwizard.hotkeys_check(s3menuwizard_template_hotkeys, res_check);
	}
	//------------------------------------------------------------------------
	else {
		s3menuwizard.hotkeys_check(s3menuwizard_template_hotkeys, '');
	}
	s3menuwizard.setActivationApplyButton(true);
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

	var key_id = s3menuwizard_template_hotkeys.key_id;
	var el = s3menuwizard.utils.get_element(s3menuwizard_template_hotkeys, 's3menuwizard_template_hotkeys_textbox');
	var res_check = s3menuwizard.hotkey.input(event, el, key_id);
	s3menuwizard.hotkeys_check(s3menuwizard_template_hotkeys, res_check);
	s3menuwizard.setActivationApplyButton(true);
	s3menuwizard.hotkeys_reset_check();
}
//------------------------------------------------------------------------------
s3menuwizard.hotkeys_reset = function(s3menuwizard_template_hotkeys) {
	var el = s3menuwizard.utils.get_element(s3menuwizard_template_hotkeys, 's3menuwizard_template_hotkeys_textbox');
	el.value = s3menuwizard.hotkey.key2string(s3menuwizard_template_hotkeys.key_original);
	el.setAttribute('prefs_hash', JSON.stringify(s3menuwizard_template_hotkeys.key_original));

	var res_check = s3menuwizard.hotkey.check_hotkey(s3menuwizard_template_hotkeys.key_original, s3menuwizard_template_hotkeys.key_id);
	s3menuwizard.hotkeys_check(s3menuwizard_template_hotkeys, res_check);
	s3menuwizard.setActivationApplyButton(true);
	s3menuwizard.hotkeys_reset_check();
}
//------------------------------------------------------------------------------
s3menuwizard.hotkeys_reset_check = function(hotkey_disabled) {
	if (hotkey_disabled) {
		document.getElementById('s3menuwizard_template_hotkeys_reset').disabled = true;
		return;
	}

	var s3menuwizard_template_hotkeys = document.getElementById('s3menuwizard_template_hotkeys');
	var key_new = s3menuwizard_template_hotkeys.key_current;
	var el = s3menuwizard.utils.get_element(s3menuwizard_template_hotkeys, 's3menuwizard_template_hotkeys_textbox');
	if (el.getAttribute('prefs_hash')) {
		key_new = JSON.parse(el.getAttribute('prefs_hash')) || {};
	}

	document.getElementById('s3menuwizard_template_hotkeys_reset').disabled = false;
	if (s3menuwizard.hotkey.compare_hotkey(s3menuwizard_template_hotkeys.key_original, key_new)) {
		document.getElementById('s3menuwizard_template_hotkeys_reset').disabled = true;
	}
}
//------------------------------------------------------------------------------
s3menuwizard.hotkeys_accept = function() {
	var main_hbox = s3menuwizard.main_hbox;
	var s3menuwizard_template_hotkeys = document.getElementById('s3menuwizard_template_hotkeys');
	var el_checked = s3menuwizard.utils.get_element(s3menuwizard_template_hotkeys, 's3menuwizard_template_hotkeys_checkbox').getAttribute('checked');
	el_checked = (String(el_checked) == 'true');

	var key_new = s3menuwizard_template_hotkeys.key_current;
	var el = s3menuwizard.utils.get_element(s3menuwizard_template_hotkeys, 's3menuwizard_template_hotkeys_textbox');
	if (el.getAttribute('prefs_hash')) {
		key_new = JSON.parse(el.getAttribute('prefs_hash')) || {};
	}

	//------------------------------------------------------------------------
	var this_menu = s3menuwizard.win.document.getElementById(main_hbox.id);
	if (! this_menu.getAttribute('key')) {
		if (el_checked) {
			var key_value = s3menuwizard.hotkey.key2string(key_new);
			if (! key_value) {
				return;
			}
		} else {
			return;
		}
	}

	//------------------------------------------------------------------------
	if (! this_menu.getAttribute('key')) {
		key_new.action = main_hbox.id;
	}

	//------------------------------------------------------------------------
	var hotkeys_prefs = s3menuwizard.utils.prefs_load('hotkeys');
	var key_id = s3menuwizard_template_hotkeys.key_id;
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

	//------------------------------------------------------------------------
	if (s3menuwizard_template_hotkeys.key_original.disabled == key_new.disabled) {
		if (s3menuwizard.hotkey.compare_hotkey(s3menuwizard_template_hotkeys.key_original, key_new)) {
			delete hotkeys_prefs[key_id];
		}
	}
	//------------------------------------------------------------------------
	s3menuwizard.utils.prefs_save('hotkeys', hotkeys_prefs);
	//-----------------------------------------------------------------------------

	s3menuwizard.utils.apply_multi_window_settings({});
}
//------------------------------------------------------------------------------
s3menuwizard.setActivationApplyButton = function(is_enable) {
	if (document.documentElement.getButton('extra1')) {
		document.documentElement.getButton('extra1').setAttribute('disabled', !is_enable);
	}
}
//------------------------------------------------------------------------------
s3menuwizard.label_accept = function() {
	var main_hbox = s3menuwizard.main_hbox;
	var textbox_label = document.getElementById('s3menuwizard_label');
	var textbox_accesskey = document.getElementById('s3menuwizard_accesskey');
	textbox_accesskey.value = textbox_accesskey.value.toUpperCase();
	var original_label = s3menuwizard.win.document.getElementById(main_hbox.id).getAttribute('original_label');
	//-----------------------------------------------------------------------
	if (/^\s*$/.test(textbox_label.value)) {
		textbox_label.value = (original_label && (original_label != main_hbox.id)) ? original_label : '';
	}

	//-----------------------------------------------------------------------
	try {
		var wm = Components.classes["@mozilla.org/appshell/window-mediator;1"].getService(Components.interfaces.nsIWindowMediator);
		var win_list = wm.getEnumerator(s3menuwizard.win_type);
		var win;
	
		while (win_list.hasMoreElements()) {
			win = win_list.getNext();
			var menu_item = win.document.getElementById(main_hbox.id);
			menu_item.setAttribute('label', textbox_label.value);
			menu_item.setAttribute('accesskey', textbox_accesskey.value);
		}
	} catch (e){
	}

	//-----------------------------------------------------------------------
	var original_accesskey = s3menuwizard.win.document.getElementById(main_hbox.id).getAttribute('original_accesskey');
	//-----------------------------------------------------------------------
	var menu_prefs_label = s3menuwizard.utils.prefs_load('menu_item_list_label');
	if (typeof(menu_prefs_label[main_hbox.id]) == 'string') {
		menu_prefs_label[main_hbox.id] = { 'label' : menu_prefs_label[main_hbox.id] };
	}

	//-----------------------------------------------------------------------
	var is_change_label = false;
	var new_settings = {
		'label' : textbox_label.value,
		'accesskey' : textbox_accesskey.value
	};

	//-----------------------------------------------------------------------
	if (original_label != textbox_label.value) {
		is_change_label = true;
	}
	//-----------------------------------------------------------------------
	if (original_accesskey.toUpperCase() != textbox_accesskey.value.toUpperCase()) {
		is_change_label = true;
	} else {
		delete new_settings.accesskey;
	}
	//-----------------------------------------------------------------------
	if (is_change_label) {
		menu_prefs_label[main_hbox.id] = new_settings;
	} else {
		delete menu_prefs_label[main_hbox.id];
	}
	//-----------------------------------------------------------------------
	s3menuwizard.utils.prefs_save('menu_item_list_label', menu_prefs_label);
	//-----------------------------------------------------------------------------
	s3menuwizard.utils.apply_multi_window_settings({
		'action' : 'label',
		'main_hbox_id' : main_hbox.id,
		'original_label' : original_label,
		'textbox_value' : textbox_label.value
	});
}
//------------------------------------------------------------------------------
s3menuwizard.label_reset = function() {
	var main_hbox = s3menuwizard.main_hbox;
	document.getElementById('s3menuwizard_label').value = s3menuwizard.win.document.getElementById(main_hbox.id).getAttribute('original_label');
	s3menuwizard.setActivationApplyButton(true);
	s3menuwizard.label_reset_check();
}
//------------------------------------------------------------------------------
s3menuwizard.label_reset_check = function() {
	var main_hbox = s3menuwizard.main_hbox;
	var original_label = s3menuwizard.win.document.getElementById(main_hbox.id).getAttribute('original_label');
	var textbox_label = document.getElementById('s3menuwizard_label');
	document.getElementById('s3menuwizard_label_button_reset').disabled = (original_label == textbox_label.value) ? true : false;
}
//------------------------------------------------------------------------------
s3menuwizard.label_input = function(el) {
	s3menuwizard.setActivationApplyButton(true);
	s3menuwizard.label_reset_check();
}
//------------------------------------------------------------------------------
s3menuwizard.accesskey_reset = function() {
	var main_hbox = s3menuwizard.main_hbox;
	document.getElementById('s3menuwizard_accesskey').value = s3menuwizard.win.document.getElementById(main_hbox.id).getAttribute('original_accesskey');
	s3menuwizard.setActivationApplyButton(true);
	s3menuwizard.accesskey_reset_check();
}
//------------------------------------------------------------------------------
s3menuwizard.accesskey_reset_check = function() {
	var main_hbox = s3menuwizard.main_hbox;
	var original_accesskey = s3menuwizard.win.document.getElementById(main_hbox.id).getAttribute('original_accesskey');
	var textbox_accesskey = document.getElementById('s3menuwizard_accesskey');
	document.getElementById('s3menuwizard_accesskey_button_reset').disabled = (original_accesskey.toUpperCase() == textbox_accesskey.value.toUpperCase()) ? true : false;
}
//------------------------------------------------------------------------------
s3menuwizard.accesskey_input = function(el) {
	el.select();
	el.value = el.value.toUpperCase();
	s3menuwizard.setActivationApplyButton(true);
	s3menuwizard.accesskey_reset_check();
}
//------------------------------------------------------------------------------
s3menuwizard.style_accept = function() {
	var main_hbox = s3menuwizard.main_hbox;
	var menu_prefs_style = s3menuwizard.utils.prefs_load('style');
	var style = document.getElementById('s3menuwizard_style').value;
	var original_style = s3menuwizard.utils.get_style(s3menuwizard.win.document.getElementById(main_hbox.id));
	//-----------------------------------------------------------------------
	if (menu_prefs_style[main_hbox.id]) {
		original_style = menu_prefs_style[main_hbox.id].original;
	}
	if (style == '') {
		style = original_style;
	}
	if (original_style == style) {
		delete menu_prefs_style[main_hbox.id];
	} else {
		menu_prefs_style[main_hbox.id] = {
			'style' : style,
			'original' : original_style
		};
	}
	s3menuwizard.utils.prefs_save('style', menu_prefs_style);

	//-----------------------------------------------------------------------
	try {
		var wm = Components.classes["@mozilla.org/appshell/window-mediator;1"].getService(Components.interfaces.nsIWindowMediator);
		var win_list = wm.getEnumerator(s3menuwizard.win_type);
		var win;
	
		while (win_list.hasMoreElements()) {
			win = win_list.getNext();
			var menu_item = win.document.getElementById(main_hbox.id);
			s3menuwizard.utils.set_style(menu_item, style);
		}
	} catch (e){
	}

	//-----------------------------------------------------------------------
	s3menuwizard.utils.apply_multi_window_settings({});
}
//------------------------------------------------------------------------------
s3menuwizard.style_input = function(el) {
	s3menuwizard.setActivationApplyButton(true);
}
//------------------------------------------------------------------------------
s3menuwizard.command_accept = function() {
	var main_hbox = s3menuwizard.main_hbox;
	var menu_prefs_command = s3menuwizard.utils.prefs_load('command');
	var original_command = s3menuwizard.utils.get_command(s3menuwizard.win.document.getElementById(main_hbox.id));
	//-----------------------------------------------------------------------
	if (menu_prefs_command[main_hbox.id]) {
		original_command = menu_prefs_command[main_hbox.id].original;
	}
	//-----------------------------------------------------------------------
	var command_oncommand = document.getElementById('s3menuwizard_oncommand').value;
	if (command_oncommand == '') {
		command_oncommand = original_command.oncommand;
		document.getElementById('s3menuwizard_oncommand').value = original_command.oncommand;
	}
	//-----------------------------------------------------------------------
	var command_onclick = document.getElementById('s3menuwizard_onclick').value;
	if (command_onclick == '') {
		command_onclick = original_command.onclick;
		document.getElementById('s3menuwizard_onclick').value = original_command.onclick;
	}
	//-----------------------------------------------------------------------
	var command_onpopupshowing = document.getElementById('s3menuwizard_onpopupshowing').value;
	if (command_onpopupshowing == '') {
		command_onpopupshowing = original_command.onpopupshowing;
		document.getElementById('s3menuwizard_onpopupshowing').value = original_command.onpopupshowing;
	}
	//-----------------------------------------------------------------------
	var command_onpopuphiding = document.getElementById('s3menuwizard_onpopuphiding').value;
	if (command_onpopuphiding == '') {
		command_onpopuphiding = original_command.onpopuphiding;
		document.getElementById('s3menuwizard_onpopuphiding').value = original_command.onpopuphiding;
	}

	//-----------------------------------------------------------------------
	if (
		(original_command.oncommand == command_oncommand) && 
		(original_command.onclick == command_onclick) && 
		(original_command.onpopupshowing == command_onpopupshowing) && 
		(original_command.onpopuphiding == command_onpopuphiding)
	) {
		delete menu_prefs_command[main_hbox.id];
	} else {
		menu_prefs_command[main_hbox.id] = {
			'command' : {
				'oncommand' : (original_command.oncommand == command_oncommand) ? '' : command_oncommand,
				'onclick' : (original_command.onclick == command_onclick) ? '' : command_onclick,
				'onpopupshowing' : (original_command.onpopupshowing == command_onpopupshowing) ? '' : command_onpopupshowing,
				'onpopuphiding' : (original_command.onpopuphiding == command_onpopuphiding) ? '' : command_onpopuphiding
			},
			'original' : original_command
		};
	}
	s3menuwizard.utils.prefs_save('command', menu_prefs_command);

	//-----------------------------------------------------------------------
	try {
		var wm = Components.classes["@mozilla.org/appshell/window-mediator;1"].getService(Components.interfaces.nsIWindowMediator);
		var win_list = wm.getEnumerator(s3menuwizard.win_type);
		var win;
	
		while (win_list.hasMoreElements()) {
			win = win_list.getNext();
			var menu_item = win.document.getElementById(main_hbox.id);
			menu_item.setAttribute('oncommand', command_oncommand);
			menu_item.setAttribute('onclick', command_onclick);
			menu_item.setAttribute('onpopupshowing', command_onpopupshowing);
			menu_item.setAttribute('onpopuphiding', command_onpopuphiding);
		}
	} catch (e){
	}

	//-----------------------------------------------------------------------
	s3menuwizard.utils.apply_multi_window_settings({});
}
//------------------------------------------------------------------------------
s3menuwizard.command_input = function(el) {
	s3menuwizard.setActivationApplyButton(true);
}
//------------------------------------------------------------------------------
s3menuwizard.textbox_exchange = function(id, is_close) {
	var from = document.getElementById(id);
	var to = document.getElementById('s3menuwizard_edit_textbox');
	document.getElementById('s3menuwizard_edit_close').tmp_id = id;

	document.getElementById('s3menuwizard_main_pane').hidden = ! is_close;
	document.getElementById('s3menuwizard_edit_pane').hidden = is_close;

	from.id = 's3menuwizard_edit_textbox';
	to.value = from.value;
	to.id = id;
	to.focus();

	var edit_type = document.getElementById(id + '_label').value;
	var edit_label = document.getElementById('s3menuwizard_label').value;
	var edit_id = document.getElementById('s3menuwizard_menu_id').value;

	var title_ary = [];
	title_ary.push(edit_type);
	if (edit_label) { title_ary.push(edit_label); }
	if (edit_id) { title_ary.push(edit_id); }

	document.getElementById('s3menuwizard_edit_title').value = title_ary.join(' : ');
}
//------------------------------------------------------------------------------
