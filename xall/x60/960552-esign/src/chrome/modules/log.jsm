"use strict";

/**
 * Логирование данных.
 */

Components.utils.import("resource://gre/modules/Console.jsm"); // Export Console

const EXPORTED_SYMBOLS = ["Log"];

const Log = {

	/**
	 * Форматирует и распечатывает лог в консоли
	 *
	 * @param msg
	 */
	print: function (msg) {
		switch (typeof msg) {
			case 'object':
				msg = JSON.stringify(msg, null, 2);
				break;
			default:
				break;
		}

		console.log(msg);
	},

	/**
	 * Распечатывает лог в консоли
	 *
	 * @param msg
	 */
	out: function (msg) {
		console.log(msg);
	}

};