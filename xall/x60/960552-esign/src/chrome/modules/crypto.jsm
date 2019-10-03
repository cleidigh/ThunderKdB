"use strict";

/**
 * Функции для подписи сообщений.
 */

const EXPORTED_SYMBOLS = ["EsignCrypto"];

const Cc = Components.classes;
const Ci = Components.interfaces;
const Cu = Components.utils;

Cu.import("resource://gre/modules/XPCOMUtils.jsm"); // Export XPCOMUtils
Cu.import("resource://esign/data.jsm");             // Export EsignData
Cu.import("resource://esign/dataMsg.jsm");          // Export EsignDataMsg
Cu.import("resource://esign/preferences.jsm");      // Export EsignPref
Cu.import("resource://esign/locale.jsm");           // Export EsignLocale
Cu.import("resource://esign/apiGuc.jsm");           // Export ApiGuc
Cu.import("resource://esign/jquery.jsm");           // Export jQuery
Cu.import("resource://esign/qp.jsm");               // Export quotedPrintable

var gConv = Cc["@mozilla.org/io/string-input-stream;1"].createInstance(Ci.nsIStringInputStream);

const EsignCrypto = {
	/**
	 * Инициализация объекта для проверки подписи.
	 *
	 * @param protocol
	 * @returns {MimeVerify}
	 */
	signatureVerifier: function (protocol) {
		let v = new MimeVerify(protocol);
		return v;
	},
};

// MimeVerify Constructor
function MimeVerify(protocol) {
	if (!protocol) {
		protocol = EsignDataMsg.SIGNATURE_HEADER;
	}

	this.protocol = protocol;
	this.inStream = Cc["@mozilla.org/scriptableinputstream;1"].createInstance(Ci.nsIScriptableInputStream);
}

// MimeVerify реализация.
// Проверка подписи через клиент ГУЦ.
MimeVerify.prototype = {
	QueryInterface: XPCOMUtils.generateQI([Ci.nsIStreamListener]),

	inStream: null,

	onStartRequest: function (request, uri) {
		this.uri = uri ? uri.QueryInterface(Ci.nsIURI).clone() : null;
		this.mimeSvc = request.QueryInterface(Ci.nsIPgpMimeProxy);
		this.dataCount = 0;
		this.boundary = "";
		this.readMode = 0;
		this.keepData = "";
		this.msgData = "";      // Выводимые для просмотра данные
		this.originalMsg = "";  // Подписываемое сообщение
		this.sigPart = "";      // Вложение подписи
		this.sigData = "";      // Контейнер подписи

		this.parseContentType();
	},

	onDataAvailable: function (req, sup, stream, offset, count) {
		if (count > 0) {
			this.inStream.init(stream);
			let data = this.inStream.read(count);
			this.onTextData(data);
		}
	},

	onStopRequest: function () {
		// Мы получили неполные данные; просто верните то, что мы получили
		if (this.readMode < 4) {
			this.returnData(this.msgData.length > 0 ? this.msgData : this.keepData);
			return false;
		}
		else {
			this.returnData(this.msgData);
		}

		// Хранение данных по текущему сообщению.
		// Требуется для выполнения проверки подписи только при просмотре сообщения.
		if (this.protocol === EsignDataMsg.SIGNATURE_HEADER) {
			let EsignGlobal = Cc['@esign.net/esign/global;1'].getService().wrappedJSObject;
			EsignGlobal.msgSigData = this.sigData;
			EsignGlobal.msgOriginalContent = EsignData.encodeBase64(this.originalMsg);
		}
	},

	// Вспомогательные функции -------------------------------------------------------------------------------------------

	/**
	 * Парсим информацию из заголовков
	 */
	parseContentType: function () {
		let contentTypeLine = this.mimeSvc.contentType;
		contentTypeLine = contentTypeLine.replace(/[\n]/g, "");
		let reSignature = new RegExp(EsignDataMsg.SIGNATURE_HEADER, "g");

		if (contentTypeLine.search(reSignature) > 0) {
			let hdr = EsignDataMsg.getHeaderData(contentTypeLine);
			hdr.boundary = hdr.boundary || "";
			this.boundary = hdr.boundary.replace(/[\'\"]/g, "");
		}
	},

	/**
	 * Получаем сохраненные значения
	 *
	 * @param data string Данные просматриваемого сообщения
	 */
	onTextData: function (data) {
		this.dataCount += data.length;
		this.keepData += data;

		if (this.readMode === 0) {
			// Данные заголовков
			let i = this.findNextMimePart();
			if (i >= 0) {
				i += 2 + this.boundary.length;
				if (this.keepData[i] == "\n") {
					++i;
				}
				else if (this.keepData[i] == "\r") {
					++i;
					if (this.keepData[i] == "\n") ++i;
				}

				this.keepData = this.keepData.substr(i);
				data = this.keepData;
				this.readMode = 1;
			}
			else {
				this.keepData = data.substr(-this.boundary.length - 3);
			}
		}

		if (this.readMode === 1) {
			// "Реальные данные"
			if (data.indexOf("-") >= 0) {
				let i = this.findNextMimePart();
				if (i >= 0) {
					// Конец поиска "Реальных данных"
					if (this.keepData[i - 2] == '\r' && this.keepData[i - 1] == '\n') {
						--i;
					}

					// Вырезаем контейнер подписи из письма
					let sig_part = this.findSignaturePart();
					let endMsg = '--' + sig_part.originMsgHdr.boundary + '--';
					let rawData = this.keepData.substr(0, sig_part.signature.index_start) + endMsg;
					this.sigPart = sig_part;

					// Вырезаем карточку подписи из письма
					let regex = new RegExp('--' + sig_part.originMsgHdr.boundary + "\$", "gm");
					let indexes = this.indexOfAll(this.originalMsg, regex);
					let start = (indexes.length > 0 ? indexes[indexes.length - 1] : -1);
					let end = this.originalMsg.indexOf('--' + sig_part.originMsgHdr.boundary + '--');
					let signCard = this.originalMsg.substr(start, end - start);
					this.originalMsg = this.originalMsg.replace(signCard, '');

					// Устанавливаем значения
					this.msgData = this.keepData.substr(0, i - 1);
					this.keepData = this.keepData.substr(i);
					this.readMode = 2;
				}
			}
			else
				return;
		}

		if (this.readMode === 2) {
			let i = this.keepData.indexOf("--" + this.boundary + "--");
			if (i >= 0) {
				// Убедитесь, что мы храним все до тех пор, пока не получим "конечную" границу
				if (this.keepData[i - 2] == '\r' && this.keepData[i - 1] == '\n') {
					--i;
				}

				this.readMode = 3;
			}
		}

		if (this.readMode === 3) {
			// Парсим подпись
			let data = this.sigPart.signature.data;
			let start = data.indexOf('Content-Disposition: attachment');

			data = data.substr(start, data.length).split('\n');
			let result = '';
			for (let i = 0; i < data.length; i++) {
				if (data[i].indexOf('Content-Disposition') >= 0 || !data[i]) {
					continue;
				}
				result += data[i];
			}

			this.sigData = result.replace(/[\r|\n|\s]/g, "");
			this.keepData = "";
			this.readMode = 4;
		}
	},

	/**
	 * Определение позиции текста сообщения
	 *
	 * @returns {{start: number, end: number}}
	 */
	getBodyPart: function () {
		let start = this.keepData.search(/(\n\n|\r\n\r\n)/);
		if (start < 0) {
			start = 0;
		}
		let end = this.keepData.indexOf("--" + this.boundary + "--") - 1;
		if (end < 0) {
			end = this.keepData.length;
		}

		return {
			start: start,
			end: end
		};
	},

	/**
	 * Поиск mime фрагмента
	 * @returns {number}
	 */
	findNextMimePart: function () {
		let startOk = false;
		let endOk = false;

		let i = this.keepData.indexOf("--" + this.boundary);
		if (i === 0) startOk = true;
		if (i > 0) {
			if (this.keepData[i - 1] == '\r' || this.keepData[i - 1] == '\n') startOk = true;
		}

		if (!startOk) return -1;

		if (i + this.boundary.length + 2 < this.keepData.length) {
			if (this.keepData[i + this.boundary.length + 2] == '\r' ||
				this.keepData[i + this.boundary.length + 2] == '\n' ||
				this.keepData.substr(i + this.boundary.length + 2, 2) == '--') endOk = true;
		}

		if (i >= 0 && startOk && endOk) {
			return i;
		}
		return -1;
	},

	/**
	 * Поиск позиции контейнера подписи
	 */
	findSignaturePart: function () {
		let start = this.keepData.indexOf("Content-Description: Esign signature");
		if (start === -1) {
			return false;
		}

		// Парсинг заголовков для нативного сообщения
		let hoStart = this.keepData.indexOf('Content-Type: multipart/mixed;');
		let hoEnd = this.keepData.indexOf('protected-headers="v1"');
		if (hoStart < 0 || hoEnd < 0) {
			return false;
		}
		let originMsgHdr = EsignDataMsg.getHeaderData(this.keepData.substr(hoStart, hoEnd - hoStart));
		if (!originMsgHdr.boundary) {
			return false;
		}

		// Получаем часть контейнера подписи
		let regex = new RegExp("--" + originMsgHdr.boundary + "\$", "gm");
		let indexes = this.indexOfAll(this.keepData, regex);
		let index_start = (indexes.length > 0 ? indexes[indexes.length - 1] : -1);
		let index_end = this.keepData.indexOf("--" + originMsgHdr.boundary + "--");
		let data = this.keepData.substr(index_start, index_end - index_start);

		return {
			signature: {
				index_start: index_start,
				index_end: index_end,
				data: data
			},
			originMsgHdr: originMsgHdr
		};
	},

	/**
	 * Возвращает все найденные индексы
	 */
	indexOfAll: function (str, regex) {
		var result, indexes = [];

		while ((result = regex.exec(str))) {
			indexes.push(result.index);
		}

		return indexes;
	},

	/**
	 * Возвращаем данные в libMime
	 *
	 * @param data string Содержимое сообщения
	 */
	returnData: function (data) {
		let m = data.match(/^(content-type: +)([\w\/]+)/im);
		if (m && m.length >= 3) {
			let contentType = m[2];
			if (contentType.search(/^text/i) === 0) {
				// Добавление multipart/mixed boundary для обхода TB-ошибки (пустое отправленное сообщение)
				let boundary = EsignDataMsg.generateBoundary();
				data = 'Content-Type: multipart/mixed; boundary="' + boundary + '"\n' +
					'Content-Disposition: inline\n\n--' +
					boundary + '\n' +
					data +
					'\n--' + boundary + '--\n';
			}
		}

		// Замена данных сообщения
		gConv.setData(data, data.length);

		try {
			this.mimeSvc.onStartRequest(null, null);
			this.mimeSvc.onDataAvailable(null, null, gConv, 0, data.length);
			this.mimeSvc.onStopRequest(null, null, 0);
		}
		catch (ex) {
		}
	},

};