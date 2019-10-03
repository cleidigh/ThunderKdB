"use strict";

/**
 * Вспомогательные функции для преобразования данных.
 */

const EXPORTED_SYMBOLS = ["EsignData"];

const Ci = Components.interfaces;
const Cc = Components.classes;

var appShellSvc = Cc["@mozilla.org/appshell/appShellService;1"].getService(Ci.nsIAppShellService);
var window = appShellSvc.hiddenDOMWindow;

const EsignData = {
	/**
	 * Кодирование строки в base64.
	 */
	encodeBase64: function (str) {
		try {
			return btoa(str);
		}
		catch (e) {
		}

		return str;
	},

	/**
	 * Конвертация base64 данных в строку UTF8
	 *
	 * @param str
	 * @returns {string}
	 */
	convertBase64ToUtf8: function (str) {
		try {
			str = str.replace(/\s/g, '');
			return decodeURIComponent(escape(window.atob(str)));
		}
		catch (e) {
			return str;
		}
	},

	/**
	 * Конвертирование base64 в бинарные данные.
	 *
	 * @param str
	 */
	convertBase64ToBinary(str) {
		try {
			return atob(str);
		}
		catch (e) {
		}

		return str;
	},

	/**
	 * Создайте строку случайных символов набора A-Z a-z 0-9 с длиной numChars,
	 * с использованием API-интерфейса браузера crypto, который получает криптографически сильные случайные значения
	 *
	 * @param numChars: Number - длина строки для возврата
	 *
	 * @return String
	 */
	generateRandomString: function (numChars) {
		if (!numChars) {
			return '';
		}

		// Массив символов, которые могут быть возвращены
		const charMap = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M",
			"N", "O", "P", "Q", "R", "S", "T", "U", "V", "W", "X", "Y", "Z",
			"a", "b", "c", "d", "e", "f", "g", "h", "i", "j", "k", "l", "m",
			"n", "o", "p", "q", "r", "s", "t", "u", "v", "w", "x", "y", "z",
			"0", "1", "2", "3", "4", "5", "6", "7", "8", "9"];

		const charMapLength = charMap.length;

		let randNumArray = new Uint16Array(numChars);
		window.crypto.getRandomValues(randNumArray);

		let randomString = "";

		for (let i = 0; i < numChars; i++) {
			// Вычислить modulo для получения чисел между 0 и (charMapLength - 1)
			// Диапазон Uint16 65536 по модулю 62 равен всего 2, этот минимальный статистический дисбаланс является приемлемым
			let modulo = randNumArray[i] % charMapLength;

			randomString += charMap[modulo];
		}

		return randomString;
	},

	/**
	 * Кодирует строку в UTF8
	 * @param s
	 * @returns {string}
	 */
	encodeUtf8: function (s) {
		if (!s) {
			return "";
		}
		for (var c, i = -1, l = (s = s.split("")).length, o = String.fromCharCode; ++i < l;
		     s[i] = (c = s[i].charCodeAt(0)) >= 127 ? o(0xc0 | (c >>> 6)) + o(0x80 | (c & 0x3f)) : s[i]
		) ;
		return s.join("");
	},

	/**
	 * Декодирует строку из UTF8
	 * @param s
	 * @returns {string}
	 */
	decodeUtf8: function (s) {
		if (!s) {
			return "";
		}
		for (var a, b, i = -1, l = (s = s.split("")).length, o = String.fromCharCode, c = "charCodeAt"; ++i < l;
		     ((a = s[i][c](0)) & 0x80) &&
		     (s[i] = (a & 0xfc) == 0xc0 && ((b = s[i + 1][c](0)) & 0xc0) == 0x80 ?
			     o(((a & 0x03) << 6) + (b & 0x3f)) : o(128), s[++i] = "")
		) ;
		return s.join("");
	},

	/**
	 * Получаем значение по названию аттрибута
	 *
	 * @param arr array Массив для поиска данных.
	 * @param key string Ключ по которому осуществляется поиск.
	 */
	getAttrValue: function (arr, key) {
		if (arr.length === 0) {
			return '';
		}

		for (let i = 0; i < arr.length; i++) {
			if (arr[i]['key'] === key) {
				return arr[i]['value'];
			}
		}

		return '';
	},

	/**
	 * Форматирование даты.
	 */
	toHumanReadableDate: function (timestamp, includeTime = false) {
		if (!timestamp) {
			return '';
		}

		let date = new Date();
		date.setTime(timestamp);

		let day = this.parseTimeElement(date.getDate());
		let month = this.parseTimeElement(date.getMonth() + 1);
		let year = date.getFullYear();

		let result = day + "." + month + "." + year;

		// Добавляем время
		if (includeTime) {
			let hours = date.getHours();
			let minutes = "0" + date.getMinutes();
			let seconds = "0" + date.getSeconds();

			result += ' ' + hours + ':' + minutes.substr(-2) + ':' + seconds.substr(-2);
		}

		return result;
	},

	/**
	 * Вспомошательная функция для форматирования даты
	 *
	 * @param element
	 * @returns {string}
	 */
	parseTimeElement: function (element) {
		return (element < 10 ? '0' + element : element);
	}

};