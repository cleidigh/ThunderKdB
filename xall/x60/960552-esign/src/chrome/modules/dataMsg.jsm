"use strict";

/**
 * Вспомогательные функции для преобразования данных Email сообщения.
 */
const EXPORTED_SYMBOLS = ["EsignDataMsg"];

const Cu = Components.utils;
Cu.import("resource://esign/data.jsm"); // Export EsignData
Cu.import("resource://esign/qp.jsm");   // Export quotedPrintable

const EsignDataMsg = {
	SIGNATURE_HEADER: 'application/client-guc-signature',

	/**
	 * Парсит заголовок и извлекает значения.
	 * e.g. ContentType: xyz; Aa=b; cc=d
	 *
	 * @param data string Заголовки в виде строки.
	 *
	 * @return |array| of |arrays| Заголовки сообщения.
	 */
	getHeaderData: function (data) {
		var a = data.split(/\n/);
		var res = {};

		for (let i = 0; i < a.length; i++) {
			if (a[i].length === 0) break;
			let b = a[i].split(/;/);

			// extract "abc = xyz" tuples
			for (let j = 0; j < b.length; j++) {
				let m = b[j].match(/^(\s*)([^=\s;]+)(\s*)(=)(\s*)(.*)(\s*)$/);
				if (m) {
					// m[2]: identifier / m[6]: data
					res[m[2].toLowerCase()] = m[6].replace(/\s*$/, "").replace(/[\'\"]/g, "");
				}
			}
			if (i === 0 && a[i].indexOf(";") < 0) break;
			if (i > 0 && a[i].search(/^\s/) < 0) break;
		}

		return res;
	},

	/**
	 * Генерация секции "boundary" для сообщения электронной почты
	 */
	generateBoundary: function () {
		return EsignData.generateRandomString(33);
	},

	/***
	 * Определение "boundary" часть типа содержимого почты
	 *
	 * @param contentTypeStr string Часть content-type (e.g. multipart/mixed; boundary="xyz") --> возвращает "xyz"
	 *
	 * @return string string Строка, которая содержит "boundary" часть; или null
	 */
	getBoundary: function (contentTypeStr) {
		contentTypeStr = contentTypeStr.replace(/[\r\n]/g, "");
		let boundary = "";
		let ct = contentTypeStr.split(/;/);
		for (let i = 0; i < ct.length; i++) {
			if (ct[i].search(/[ \t]*boundary[ \t]*=/i) >= 0) {
				boundary = ct[i];
				break;
			}
		}
		boundary = boundary.replace(/\s*boundary\s*=/i, "").replace(/[\'\"]/g, "");

		return boundary;
	},

	/**
	 * Удаляет стандартные вложения из письма.
	 */
	removeAttachmentsFromEmail: function (eml) {
		// Получение информации о вложениях
		let attachmentsInfo = this.getAttachmentsFromEmail(eml, false);

		// Вырезаем вложения из сообщения
		if (attachmentsInfo.startIndex && attachmentsInfo.endIndex) {
			return eml.slice(0, attachmentsInfo.startIndex) + eml.slice(attachmentsInfo.endIndex);
		}

		return eml;
	},

	/**
	 * Получение информации о вложениях письма.
	 */
	getAttachmentsFromEmail: function (eml, includeAttachments) {
		let result = {
			startIndex: 0,
			endIndex: 0
		};

		// Информация по вложениям
		if (includeAttachments) {
			result.attachments = [];
		}

		// Вложений не существует
		if (!eml || eml.indexOf('Content-Disposition: attachment;') === -1) {
			return result;
		}

		let re = /--------------(.*)/g;
		let blockIndexes = [];
		let match;

		// Получаем все блоки, которые разделены границей
		while ((match = re.exec(eml)) != null) {
			blockIndexes.push({
				index: match.index,
				val: match[0]
			});
		}

		if (!blockIndexes) {
			return result;
		}

		// Выполняем поиск вложения в блоках
		for (let i = 0; i < blockIndexes.length - 1; i++) {
			// Определяем границы блока
			let startBlockInd = blockIndexes[i].index;
			let endBlockInd = blockIndexes[i + 1].index;
			let block = eml.slice(startBlockInd, endBlockInd);

			// Парсим вложение.
			if (block.indexOf('Content-Disposition: attachment;') > -1 &&
				block.indexOf('Content-Description: Esign') === -1
			) {
				// Сохраняем позиции.
				result.startIndex = result.startIndex ? result.startIndex : startBlockInd;
				result.endIndex = endBlockInd;

				// Информация по вложениям.
				if (includeAttachments) {
					let nameStartPhrase = ' name="';
					let parsingNameBlock = block.slice(block.indexOf(nameStartPhrase) + nameStartPhrase.length);
					let filename = parsingNameBlock.slice(0, parsingNameBlock.indexOf('"'));
					let base64name = '';

					// Парсим base64 контент
					let utf8BReg = /=\?UTF-8\?B\?(.*)\?=/g;
					while ((match = utf8BReg.exec(filename)) != null) {
						base64name += match[1];
					}
					// Парсим quoted-printable контент
					let utf8QReg = /=\?UTF-8\?Q\?(.*)\?=/g;
					while ((match = utf8QReg.exec(filename)) != null) {
						base64name += EsignData.encodeBase64(quotedPrintable.decode(match[1]));
					}
					// Если данные не были распарсены, то переводим контент в base64
					if (!base64name) {
						base64name = EsignData.encodeBase64(filename);
					}

					// Форматируем имя
					let name = EsignData.convertBase64ToUtf8(base64name);
					name = EsignDataMsg.transliterate(name);

					// Формируем данные
					let dataParse = block.slice(block.indexOf("\r\n\r\n"));
					let base64data = dataParse ? dataParse.replace(/\r\n/g, '').trim() : '';
					let data = EsignData.convertBase64ToBinary(base64data);

					result.attachments.push({
						// Текст в формате base64
						name: name,
						data: data,
					});
				}
			}
		}

		return result;
	},

	/**
	 * Транслитерация
	 *
	 * @param text
	 * @returns {string}
	 */
	transliterate: function (text) {
		text = text
			.replace(/\u0401/g, 'YO')
			.replace(/\u0419/g, 'I')
			.replace(/\u0426/g, 'TS')
			.replace(/\u0423/g, 'U')
			.replace(/\u041A/g, 'K')
			.replace(/\u0415/g, 'E')
			.replace(/\u041D/g, 'N')
			.replace(/\u0413/g, 'G')
			.replace(/\u0428/g, 'SH')
			.replace(/\u0429/g, 'SCH')
			.replace(/\u0417/g, 'Z')
			.replace(/\u0425/g, 'H')
			.replace(/\u042A/g, '')
			.replace(/\u0451/g, 'yo')
			.replace(/\u0439/g, 'i')
			.replace(/\u0446/g, 'ts')
			.replace(/\u0443/g, 'u')
			.replace(/\u043A/g, 'k')
			.replace(/\u0435/g, 'e')
			.replace(/\u043D/g, 'n')
			.replace(/\u0433/g, 'g')
			.replace(/\u0448/g, 'sh')
			.replace(/\u0449/g, 'sch')
			.replace(/\u0437/g, 'z')
			.replace(/\u0445/g, 'h')
			.replace(/\u044A/g, "'")
			.replace(/\u0424/g, 'F')
			.replace(/\u042B/g, 'I')
			.replace(/\u0412/g, 'V')
			.replace(/\u0410/g, 'a')
			.replace(/\u041F/g, 'P')
			.replace(/\u0420/g, 'R')
			.replace(/\u041E/g, 'O')
			.replace(/\u041B/g, 'L')
			.replace(/\u0414/g, 'D')
			.replace(/\u0416/g, 'ZH')
			.replace(/\u042D/g, 'E')
			.replace(/\u0444/g, 'f')
			.replace(/\u044B/g, 'i')
			.replace(/\u0432/g, 'v')
			.replace(/\u0430/g, 'a')
			.replace(/\u043F/g, 'p')
			.replace(/\u0440/g, 'r')
			.replace(/\u043E/g, 'o')
			.replace(/\u043B/g, 'l')
			.replace(/\u0434/g, 'd')
			.replace(/\u0436/g, 'zh')
			.replace(/\u044D/g, 'e')
			.replace(/\u042F/g, 'Ya')
			.replace(/\u0427/g, 'CH')
			.replace(/\u0421/g, 'S')
			.replace(/\u041C/g, 'M')
			.replace(/\u0418/g, 'I')
			.replace(/\u0422/g, 'T')
			.replace(/\u042C/g, "'")
			.replace(/\u0411/g, 'B')
			.replace(/\u042E/g, 'YU')
			.replace(/\u044F/g, 'ya')
			.replace(/\u0447/g, 'ch')
			.replace(/\u0441/g, 's')
			.replace(/\u043C/g, 'm')
			.replace(/\u0438/g, 'i')
			.replace(/\u0442/g, 't')
			.replace(/\u044C/g, "'")
			.replace(/\u0431/g, 'b')
			.replace(/\u044E/g, 'yu');

		return text;
	}

};