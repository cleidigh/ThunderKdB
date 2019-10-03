s3menuwizard.hotkey = {};
Components.utils.import("resource://gre/modules/Services.jsm");

//------------------------------------------------------------------------------
s3menuwizard.hotkey.input = function(event, el, key_id_current) {
	event.preventDefault();
	event.stopPropagation();
	event.stopImmediatePropagation();

	var key = { modifiers: [], key: "", keycode: "" };
	for (var k of [ 'ctrl','meta','alt','shift' ]) {
		if (event[k + 'Key']) {
			if (k == 'ctrl') {
				k = 'control';
			}
			key.modifiers.push(k);
		}
	}
	if (key.modifiers.length == 0) {
//		el.select();
//		return 'SKIP';
	}
	if (key.modifiers.length == 1) {
//		if (key.modifiers[0] == 'shift') {
//			el.select();
//			return 'SKIP';
//		}
	}

	if (event.charCode == Components.interfaces.nsIDOMKeyEvent.DOM_VK_SPACE) {
		key.keycode = "VK_SPACE";
	} else if (event.keyCode == 8) {
		key.keycode = "VK_BACK";
	} else if (event.charCode) {
		key.key = String.fromCharCode(event.charCode).toUpperCase();
	} else {
		for (let [keycode, val] in Iterator(Components.interfaces.nsIDOMKeyEvent)) {
			if (val == event.keyCode) {
				key.keycode = keycode.replace("DOM_","");
				break;
			}
		}
	}
	if ((key.key == '') && (key.keycode == '')) {
		el.select();
		return 'SKIP';
	}
	el.value = s3menuwizard.hotkey.key2string(key);
	var res_check = s3menuwizard.hotkey.check_hotkey(key, key_id_current);
	el.select();
	el.setAttribute('prefs_hash', JSON.stringify(key));
	return res_check;
}
//------------------------------------------------------------------------------
s3menuwizard.hotkey.key2string = function(key) {
	var result = [];
	var platformKeys_string = Services.strings.createBundle("chrome://global-platform/locale/platformKeys.properties");

	if (key.modifiers.length > 0) {
		for (var k of key.modifiers) {
			if (k == 'accel') {
				k = s3menuwizard.hotkey.get_accel_key();
			}
			try {
				result.push(platformKeys_string.GetStringFromName("VK_" + k.toUpperCase()));
			} catch(e) {
			}
		}
	}

	if (key.key == " ") {
		key.key = "";
		key.keycode = "VK_SPACE";
	}
	if (key.key) {
		result.push(key.key.toUpperCase());
	}
	else if (key.keycode) {
		try {
			var keys_string = Services.strings.createBundle("chrome://global/locale/keys.properties");
			result.push(keys_string.GetStringFromName(key.keycode));
		} catch (e) {
			result.push('<' + key.keycode + '>');
		}
	}
	var separator = platformKeys_string.GetStringFromName("MODIFIER_SEPARATOR");
	return result.join(' ' + separator + ' ');
}
//------------------------------------------------------------------------------
s3menuwizard.hotkey.get_accel_key = function() {
	var prefs = Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefService).QueryInterface(Components.interfaces.nsIPrefBranch);
	switch (prefs.getIntPref("ui.key.accelKey")) {
		case 17:  return "control"; break;
		case 18:  return "alt"; break;
		case 224: return "meta"; break;
    	}
	return "control";
}
//------------------------------------------------------------------------------
s3menuwizard.hotkey.check_hotkey = function(key, skip_id) {
	var wm = Components.classes["@mozilla.org/appshell/window-mediator;1"].getService(Components.interfaces.nsIWindowMediator);
	var win = wm.getMostRecentWindow((s3menuwizard.hotkey.is_Thunderbird()) ? "mail:3pane" : "navigator:browser");

	var keys = win.document.getElementsByTagName("key");
	var accel_key = s3menuwizard.hotkey.get_accel_key();
	var result = '';

	//-----------------------------------------------------------------------------------
	if ((key.modifiers.length == 0) && (key.key == '') && (key.keycode == '')) {
		return result;
	}
	//-----------------------------------------------------------------------------------
	for (var k of keys) {
		var key_id = k.id || k.getAttribute('id') || 'unknown';
		if (key_id == skip_id) {
			continue;
		}

		//---------------------------------------------------------------------------
		try {
			var key_modifiers = k.getAttribute("modifiers");
			var key_ary = (key_modifiers) ? k.getAttribute("modifiers").split(/\W+/) : [];
			var key_length = key.modifiers.length;
			for (var km of key_ary) {
				for (var km2 of key.modifiers) {
					if (km == 'accel') { km = accel_key; }
					if (km2 == 'accel') { km2 = accel_key; }
					if (km.toUpperCase() == km2.toUpperCase()) {
						key_length--;
					}
				}
			}
			if ((key_length == 0) && (key.modifiers.length == key_ary.length)) {
				var key_value = k.key || k.getAttribute('key') || '';
				var keycode_value = k.keycode || k.getAttribute('keycode') || '';
				if ((key_value.toUpperCase() == key.key.toUpperCase()) && (keycode_value.toUpperCase() == key.keycode.toUpperCase())) {
					var label_name = s3menuwizard.hotkey.get_key_name(key_id);
					if (label_name) {
						result = label_name + ' : ' + key_id;
					} else {
						result = key_id;
					}
				}
			}
		}
		catch (e) {
		}
	}

	return result;
}
//------------------------------------------------------------------------------
s3menuwizard.hotkey.apply = function(key, key_id, is_disabled) {
	try {
		var wm = Components.classes["@mozilla.org/appshell/window-mediator;1"].getService(Components.interfaces.nsIWindowMediator);
		var e = wm.getEnumerator(null);
		var win;

		var modifiers = key.modifiers.join(' ').replace(s3menuwizard.hotkey.get_accel_key(),"accel");

		while (e.hasMoreElements()) {
			win = e.getNext();
			var key_node = win.document.getElementById( key_id );
			var keyset_node = null;
			if ((! key_node) && (key.action)) {
				var s3menuwizard_keyset = win.document.getElementById('s3menuwizard_keyset');
				var menu_item = win.document.getElementById(key.action);
				if (s3menuwizard_keyset && menu_item) {
					key_node = win.document.createElement('key');
					s3menuwizard_keyset.appendChild(key_node);
					key_node.id = key_id;
					menu_item.setAttribute("key", key_id);
					key_node.oncommand = menu_item.oncommand || menu_item.onclick;
					key_node.setAttribute('oncommand', menu_item.getAttribute('oncommand') || menu_item.getAttribute('onclick'));
				}
			}

			if (key_node) {
				key_node.removeAttribute("keycode");
				key_node.removeAttribute("charcode");
				key_node.removeAttribute("keytext");
				key_node.removeAttribute("key");
				key_node.removeAttribute("modifiers");

				//------------------------------------------------
				var check_disabled = true;
				if (modifiers && (modifiers != '')) {
					check_disabled = false;
				} else if ((key.key !== undefined) && (key.key != '')) {
					check_disabled = false;
				} else if ((key.keycode !== undefined) && (key.keycode != '')) {
					check_disabled = false;
				}
				//------------------------------------------------
				if (is_disabled || check_disabled) {
					key_node.setAttribute("modifiers", '');
					key_node.setAttribute("key", '');
					key_node.setAttribute("keycode", '');
				} else {
					if (modifiers && (modifiers != '')) {
						key_node.setAttribute("modifiers", modifiers);
					}
					if ((key.key !== undefined) && (key.key != '')) {
						key_node.setAttribute("key", key.key);
					} 
					if ((key.keycode !== undefined) && (key.keycode != '')) {
						key_node.setAttribute("keycode", key.keycode);
					}
				}

				var keyset_node = key_node.parentNode;
				while (keyset_node.parentNode && keyset_node.parentNode.localName == "keyset") {
					keyset_node = keyset_node.parentNode;
				}
				keyset_node.parentNode.insertBefore(keyset_node, keyset_node.nextSibling);

				var menuitems = win.document.getElementsByAttribute("key", key_id);
				for (var m of menuitems) {
					m.setAttribute("acceltext","");
					m.removeAttribute("acceltext");
				}
			}
		}
	}
	catch (e) {
	}
}
//------------------------------------------------------------------------------
s3menuwizard.hotkey.compare_hotkey = function(key_original, key_current) {
	var accel_key = s3menuwizard.hotkey.get_accel_key();
	var result = false;

	//-----------------------------------------------------------------------------------
	var key_length = key_original.modifiers.length;
	for (var km of key_original.modifiers) {
		for (var km2 of key_current.modifiers) {
			if (km == 'accel') { km = accel_key; }
			if (km2 == 'accel') { km2 = accel_key; }
			if (km.toUpperCase() == km2.toUpperCase()) {
				key_length--;
			}
		}
	}

	if ((key_length == 0) && (key_original.modifiers.length == key_current.modifiers.length)) {
		if ((key_original.key.toUpperCase() == key_current.key.toUpperCase()) && (key_original.keycode.toUpperCase() == key_current.keycode.toUpperCase())) {
			result = true;
		}
	}

	return result;
}
//------------------------------------------------------------------------------
s3menuwizard.hotkey.get_key_name = function(key_id) {
	var wm = Components.classes["@mozilla.org/appshell/window-mediator;1"].getService(Components.interfaces.nsIWindowMediator);
	var win = wm.getMostRecentWindow((s3menuwizard.hotkey.is_Thunderbird()) ? "mail:3pane" : "navigator:browser");

	var label_name = '';
	var key_items = win.document.getElementsByAttribute("key", key_id);
	for (var k of key_items) {
		var label = k.label || k.getAttribute('label') || '';
		if (label) {
			label_name = label;
			break;
		}
	}
	return label_name;
}
//------------------------------------------------------------------------------
s3menuwizard.hotkey.create_key_from_node = function(key_node) {
	var key = { modifiers: [], key: "", keycode: "" };
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

	return key;
}
//------------------------------------------------------------------------------
s3menuwizard.hotkey.is_Thunderbird = function() {
//	return (Services.appinfo.name == 'Thunderbird') ? true : false;
	return (Services.appinfo.ID == '{3550f703-e582-4d05-9a08-453d09bdfdc6}') ? true : false;
}
//------------------------------------------------------------------------------
