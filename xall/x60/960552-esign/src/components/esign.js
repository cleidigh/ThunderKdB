"use strict";

/**
 * Регистрация обработчика mime сообщения
 */
function registerContentTypeHandler() {
	let reg = Components.manager.QueryInterface(Components.interfaces.nsIComponentRegistrar);
	let mimeClass = Components.classes["@mozilla.org/mimecth;1?type=multipart/encrypted"];

	reg.registerFactory(
		mimeClass,
		"Esign verification",
		"@mozilla.org/mimecth;1?type=multipart/signed",
		null
	);
}

registerContentTypeHandler();