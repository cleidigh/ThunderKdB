"use strict";

/**
 * Реализует подпись.
 */

const Cc = Components.classes;
const Ci = Components.interfaces;
const Cu = Components.utils;

Cu.import("resource://gre/modules/XPCOMUtils.jsm"); // Export XPCOMUtils
Cu.import("resource:///modules/jsmime.jsm");        // Export jsmime
Cu.import("resource://esign/data.jsm");             // Export EsignData
Cu.import("resource://esign/dataMsg.jsm");          // Export EsignDataMsg
Cu.import("resource://esign/preferences.jsm");      // Export EsignPref
Cu.import("resource://esign/locale.jsm");           // Export EsignLocale
Cu.import("resource://esign/apiGuc.jsm");           // Export ApiGuc
Cu.import("resource://esign/jquery.jsm");           // Export jQuery
Cu.import("resource://esign/qp.jsm");               // Export quotedPrintable
Cu.import("resource://esign/purify.jsm");           // Export DOMPurify

const MIME_JS_ENCRYPT_CID = Components.ID("{933366b2-248a-4379-8862-e617c0f77d67}");
const MIME_JS_ENCRYPT_CONTRACTID = "@esign.net/esign/composesecure;1";
const ESIGN_GLOBAL = Cc['@esign.net/esign/global;1'].getService().wrappedJSObject;

function EsignMimeEncrypt() {
}

EsignMimeEncrypt.prototype = {
	classDescription: "Esign JS Encryption Handler",
	classID: MIME_JS_ENCRYPT_CID,
	contractID: MIME_JS_ENCRYPT_CONTRACTID,
	QueryInterface: XPCOMUtils.generateQI([Ci.nsIMsgComposeSecure]),

	// Основные аттрибуты
	msgSignatures: [],
	msgCard: '',
	encHeader: '',
	cryptoBoundary: '',
	outStringStream: null,
	outQueue: '',
	originalMsg: '',

	// nsIMsgComposeSecure interface ---------------------------------------------
	requiresCryptoEncapsulation: function (msgIdentity, msgCompFields) {
		// Проверяем, доступно ли API для осуществления подписи
		let port = EsignPref.getPref('api.port');
		let token = EsignPref.getPref('user.token');
		if (ApiGuc.isApiEnabled(port, {'token': token}) !== 200) {
			return false;
		}

		return ESIGN_GLOBAL.isSendSigned || ESIGN_GLOBAL.isSendSignedAttachments;
	},

	beginCryptoEncapsulation: function (outStream, recipientList, msgCompFields, msgIdentity, sendReport, isDraft) {
		try {
			// Инициализация
			this.outStringStream = Cc["@mozilla.org/io/string-input-stream;1"].createInstance(Ci.nsIStringInputStream);
			this.outStream = outStream;
			this.msgCompFields = msgCompFields;
			this.encHeader = EsignDataMsg.generateBoundary();
			this.cryptoBoundary = EsignDataMsg.generateBoundary();

			// Устанавливаем заголовки
			this.startCryptoHeaders();
		}
		catch (ex) {
			throw ex;
		}
	},

	mimeCryptoWriteBlock: function (buffer, length) {
		let line = buffer.substr(0, length);
		this.writeOut(line);
		this.writeOutOriginalMsg(line);
	},

	finishCryptoEncapsulation: function (abort, sendReport) {

		// Подпись текста сообщения
		if (ESIGN_GLOBAL.isSendSigned) {
			// Завершаем формирование сообщения для подписи
			this.writeOutOriginalMsg("\r\n--" + this.encHeader + "--");

			// Генерация
			this.generateSignature();
			this.generateCard();

			// Добавление
			this.insertCard();
			this.attachSignature();

			// Закрываем границы сообщения
			this.writeOut(
				"\r\n--" + this.encHeader + "--\r\n" +
				"\r\n--" + this.cryptoBoundary + "--\r\n"
			);

			// Подменяем сообщение
			this.flushOutput();
		}
	},

	// Вспомогательные функции -------------------------------------------------------------------------------------------

	/**
	 * Управление заголовками
	 */
	startCryptoHeaders: function () {
		// Подпись текста сообщения
		if (ESIGN_GLOBAL.isSendSigned) {
			this.signedHeaders();
		}

		this.writeSecureHeaders();
	},

	/**
	 * Назначает заголовки для подписи
	 */
	signedHeaders: function () {
		this.writeOut("Content-Type: multipart/signed; micalg=undefined;" +
			"protocol=\"" + EsignDataMsg.SIGNATURE_HEADER + "\";" +
			"boundary=\"" + this.cryptoBoundary + "\"\r\n\r\n" +
			"This is client GUC signed message\r\n" +
			"--" + this.cryptoBoundary + "\r\n");
	},

	/**
	 * Общие заголовки
	 */
	writeSecureHeaders: function () {
		let headers = this.getAllHeaders();
		let data = 'Content-Type: multipart/mixed; boundary="' + this.encHeader + '";' + 'protected-headers="v1"\r\n' +
			headers.all + '\r\n' +
			"--" + this.encHeader + "\r\n";

		this.writeOut(data);
		this.writeOutOriginalMsg(data);
	},

	/**
	 * Получение всех заголовков письма
	 */
	getAllHeaders: function () {
		let allHdr = "";
		let visibleHdr = "";

		let addrParser = jsmime.headerparser.parseAddressingHeader;
		let noParser = function (s) {
			return s;
		};

		let h = {
			from: {
				field: "From",
				parser: addrParser
			},
			replyTo: {
				field: "Reply-To",
				parser: addrParser
			},
			to: {
				field: "To",
				parser: addrParser
			},
			cc: {
				field: "Cc",
				parser: addrParser
			},
			newsgroups: {
				field: "Newsgroups",
				parser: noParser
			},
			followupTo: {
				field: "Followup-To",
				parser: addrParser
			},
			messageId: {
				field: "Message-Id",
				parser: noParser
			},
			subject: {
				field: "Subject",
				parser: noParser
			}
		};

		// visible headers list
		let vH = {
			'from': 1,
			'to': 1,
			'subject': 1,
			'cc': 1
		};

		let val = '';

		for (let i in h) {
			if (this.msgCompFields[i] && this.msgCompFields[i].length > 0) {
				allHdr += jsmime.headeremitter.emitStructuredHeader(h[i].field, h[i].parser(this.msgCompFields[i]), {});
			}

			if (i in vH && this.msgCompFields[i].length > 0) {
				visibleHdr += jsmime.headeremitter.emitStructuredHeader(h[i].field, h[i].parser(this.msgCompFields[i]), {});
			}
		}

		return {
			all: allHdr,
			visible: visibleHdr
		};
	},

	/**
	 * Подписывает отправляемое сообщение
	 */
	generateSignature: function () {
		let _this = this;

		// Очищаем контейнер вложений
		this.msgSignatures = [];

		// Письмо без вложений
		if (ESIGN_GLOBAL.isSendSigned) {
			this.msgSignatures.push({
				id: 'message',
				name: 'message.eml',
				data: EsignDataMsg.removeAttachmentsFromEmail(this.originalMsg)
			});
		}

		// Формируем данные для вложений
		if (ESIGN_GLOBAL.isSendSigned && ESIGN_GLOBAL.isSendSignedAttachments) {
			let attachmentsInfo = EsignDataMsg.getAttachmentsFromEmail(this.originalMsg, true);
			for (let i = 0; i < attachmentsInfo.attachments.length; i++) {
				this.msgSignatures.push({
					id: 'file',
					name: attachmentsInfo.attachments[i].name,
					data: attachmentsInfo.attachments[i].data
				});
			}
		}

		let certId = EsignPref.getPref('user.certificateId');
		let certCenterId = EsignPref.getPref('user.verificationCenterId');
		let token = EsignPref.getPref('user.token');

		for (let i = 0; i < this.msgSignatures.length; i++) {
			ApiGuc.attachSignature(
				EsignPref.getPref('api.port'), {
					'certificateId': certId,
					'base64data': EsignData.encodeBase64(_this.msgSignatures[i].data),
					'fileName': _this.msgSignatures[i].name,
					'encapsulated': true,
					'withTimestamp': true,
					'certificateCenterId': certCenterId,
					'token': token
				},
				function (base64container) {
					if (base64container) {
						_this.msgSignatures[i].signature = base64container;
					}
				},
				function () {
				},
				false
			);
		}
	},

	/**
	 * Генерация карточки подписи
	 */
	generateCard: function () {
		let signature = {};
		let msgSignature = this.msgSignatures.find(item => item.id === 'message');

		ApiGuc.verifySignature(
			EsignPref.getPref('api.port'),
			{
				'base64container': msgSignature.signature,
				'fileName': msgSignature.name,
				'checkTimestamp': true,
				'certificateCenterId': EsignPref.getPref('user.verificationCenterId'),
				'token': EsignPref.getPref('user.token')
			},
			function (data) {
				signature = data;
			},
			function () {
			},
			false
		);

		// Ошибка при получении подписи
		if (!signature) {
			return;
		}
		let html = jQuery('<html/>');

		// Head
		let head = jQuery('<head/>');

		// Мета-теги
		let meta = jQuery('<meta/>', {
			'name': 'viewport',
			'content': 'width=device-width, initial-scale=1'
		});
		head.append(meta);

		meta = jQuery('<meta/>', {
			'http-equiv': 'content-type',
			'content': 'text/html; charset=utf-8'
		});
		head.append(meta);

		// Шрифты
		let link = jQuery('<link/>', {
			'href': 'https://fonts.googleapis.com/css?family=Roboto:300,400',
			'rel': 'stylesheet'
		});
		head.append(link);

		html.append(head);

		// --------------------------------------
		// Карточка подписи
		let card = jQuery('<div/>', {
			'style': 'font-family:Roboto,Arial,Helvetica,sans-serif;font-weight:400;font-size:16px;line-height:22px;padding:24px;background-color:#fff;border-radius:2px;border:2px solid #e6e6e6;max-width:590px;width:100%;margin:24px auto 0 auto;'
		});
		let cardTable = jQuery('<table/>', {
			'border': '0',
			'cellpadding': '0',
			'cellspacing': '0'
		});

		// -------------------- start <tr>
		// Заголовок
		let tr = jQuery('<tr></tr>');

		let cardHeader = jQuery("<td/>", {
			'style': 'vertical-align:top;font-size:24px;line-height:32px;padding-bottom:24px;color:#212121;font-weight:400;',
			'colspan': '3'
		});

		let subjectName = EsignData.getAttrValue(signature.certificate.subject.names, EsignLocale.getString('attr.name'));
		let issuerName = EsignData.getAttrValue(signature.certificate.issuer.names, EsignLocale.getString('attr.name'));

		cardHeader.text((subjectName === issuerName ?
			'Сообщение подписано электронной подписью (самоподписным сертификатом)' :
			'Сообщение подписано усиленной квалифицированной электронной подписью')
		);
		tr.append(cardHeader);
		cardTable.append(tr);
		// -------------------- end <tr>

		// -------------------- start <tr>
		tr = jQuery('<tr/>');

		// Логотип
		let cardLogo = jQuery('<td/>', {
			'rowspan': '5',
			'style': 'vertical-align:top;width:100px;padding-right:24px;'
		});
		let cardLogoImg = jQuery('<img/>', {
			'style': 'width:100px;height:auto;',
			'src': 'https://certauth.minsvyazdnr.ru/sites/default/files/downloads/esing.png',
		});
		cardLogo.append(cardLogoImg);
		tr.append(cardLogo);

		// Владелец
		let ownerH = jQuery('<td/>', {
			'style': 'font-size:14px;vertical-align:top;padding-right:16px;width:160px;color:#555;',
			'text': 'Владелец сертификата'
		});
		tr.append(ownerH);

		// Владелец - значение
		let owner = jQuery('<td/>', {
			'style': 'font-size:14px;vertical-align:top;color:#000;font-weight:400;padding-bottom:8px;',
		});
		let subjectPhone = EsignData.getAttrValue(signature.certificate.subject.names, EsignLocale.getString('attr.phone'));
		let subjectEmail = EsignData.getAttrValue(signature.certificate.subject.names, EsignLocale.getString('attr.email'));

		// Sanitize data
		let ownerValName = jQuery('<div/>', {
			'text': EsignData.encodeUtf8(DOMPurify.sanitize(subjectName))
		});
		owner.append(ownerValName);

		let ownerValPhone = jQuery('<div/>', {
			'text': EsignData.encodeUtf8(DOMPurify.sanitize(subjectPhone))
		});
		owner.append(ownerValPhone);

		let ownerValEmail = jQuery('<div/>');
		let ownerValEmailLink = jQuery('<a/>', {
			'href': 'mailto:' + DOMPurify.sanitize(subjectEmail),
			'text': EsignData.encodeUtf8(DOMPurify.sanitize(subjectEmail)),
		});
		ownerValEmail.append(ownerValEmailLink);
		owner.append(ownerValEmail);

		tr.append(owner);

		cardTable.append(tr);
		// -------------------- end <tr>

		// -------------------- start <tr>
		tr = jQuery('<tr/>');

		// Сертификат
		let certH = jQuery('<td/>', {
			'style': 'font-size:14px;vertical-align:top;padding-right:16px;width:160px;color:#555;',
			'text': 'Кем выдан сертификат',
		});
		tr.append(certH);

		// Сертификат - значение
		let cert = jQuery('<td/>', {
			'style': 'font-size:14px;vertical-align:top;color:#000;font-weight:400;padding-bottom:8px;',
		});
		cert.text(EsignData.encodeUtf8(DOMPurify.sanitize(issuerName + (issuerName === subjectName ? ' (' + EsignLocale.getString('cert.type.self') + ')' : ''))));
		tr.append(cert);

		cardTable.append(tr);
		// -------------------- end <tr>

		// -------------------- start <tr>
		tr = jQuery('<tr/>');

		// Действителен
		let validH = jQuery('<td/>', {
			'style': 'vertical-align:top;font-size:14px;vertical-align:top;padding-right:16px;width:160px;color:#555;',
			'text': 'Действителен',
		});
		tr.append(validH);

		// Действителен - значение
		let valid = jQuery('<td/>', {
			'style': 'font-size:14px;vertical-align:top;color:#000;font-weight:400;padding-bottom:8px;',
		});
		let before = EsignData.toHumanReadableDate(signature.certificate.notBefore);
		let after = EsignData.toHumanReadableDate(signature.certificate.notAfter);
		valid.text(DOMPurify.sanitize('С ' + before + ' по ' + after));
		tr.append(valid);

		cardTable.append(tr);
		// -------------------- end <tr>

		// -------------------- start <tr>
		tr = jQuery('<tr/>');

		// Штамп времени
		let tsH = jQuery('<td/>', {
			'style': 'font-size:14px;vertical-align:top;padding-right:16px;width:160px;color:#555;',
			'text': 'Штамп времени ГУЦ',
		});
		tr.append(tsH);

		// Штамп времени - значение
		let ts = jQuery('<td/>', {
			'style': 'font-size:14px;vertical-align:top;color:#000;font-weight:400;padding-bottom:8px;',
		});

		if (signature.results.length > 0) {
			let timestamp = signature.results[0].timestamp;

			let timestampVal = jQuery('<div/>', {
				'text': DOMPurify.sanitize(timestamp.success ? 'Прошёл проверку' : 'Не прошел проверку'),
			});
			ts.append(timestampVal);

			if (timestamp.success) {
				timestampVal = jQuery('<div/>', {
					'text': DOMPurify.sanitize('Создан ' + EsignData.toHumanReadableDate(timestamp.generationTime, true)),
				});
				ts.append(timestampVal);
			}
		}
		tr.append(ts);

		cardTable.append(tr);
		// -------------------- end <tr>

		// -------------------- start <tr>
		tr = jQuery('<tr/>');

		// Алгоритм
		let algH = jQuery('<td/>', {
			'style': 'font-size:14px;vertical-align:top;padding-right:16px;width:160px;color:#555;',
			'text': 'Алгоритм',
		});
		tr.append(algH);

		// Алгоритм - значение
		let alg = jQuery('<td/>', {
			'style': 'font-size:14px;vertical-align:top;color:#000;font-weight:400;padding-bottom:8px;',
		});
		alg.text(DOMPurify.sanitize(EsignData.encodeUtf8(signature.certificate.publicKeyAlgorithm)));
		tr.append(alg);

		cardTable.append(tr);
		// -------------------- end <tr>

		// Информация о плагине
		// При парсинге сообщения плагином вырезается строка <div class="esign-plugin-info">...</div>
		let pluginInfo = jQuery('<div/>', {
			'class': 'esign-plugin-info',
			'style': 'padding-top:16px;font-size:13px;color:#888;'
		});
		let pluginInfoLinkEsign = jQuery('<a>', {
			'href': 'https://addons.thunderbird.net/ru/thunderbird/addon/esign',
			'text': 'Esign',
			'style': 'color:#2857fd;text-decoration:none;'
		});
		let pluginInfoLinkTb = jQuery('<a>', {
			'href': 'https://www.thunderbird.net/ru/',
			'text': 'Mozilla Thunderbird',
			'style': 'color:#2857fd;text-decoration:none;'
		});
		pluginInfo.append('Письмо подписано при помощи дополнения ');
		pluginInfo.append(pluginInfoLinkEsign);
		pluginInfo.append(' для почтового клиента ');
		pluginInfo.append(pluginInfoLinkTb);

		// Формируем карточку
		card.append(cardTable);
		card.append(pluginInfo);

		// Добавляем подпись к html документу
		let body = jQuery('<body/>');
		body.append(card);
		html.append(body);

		let msgCardHtmlDirty = '<html>' + html.html() + '</html>';

		// Данные очищаются выше. Заменяем html для корректного отображения.
		let msgCardHtmlStripped = msgCardHtmlDirty.replace(/(\sxmlns)=[\'"]?((?:(?!\/>|>|"|\'|\s).)+)[\'"]/g, "");
		this.msgCard = quotedPrintable.encode(msgCardHtmlStripped);
	},

	/**
	 * Добавляет подпись в письмо в виде вложения (zip-архив)
	 */
	attachSignature: function () {
		if (this.msgSignatures.length === 0) {
			return false;
		}

		// Вставляем подпись в сообщение
		for (let i = 0; i < this.msgSignatures.length; i++) {
			// Начальные границы
			this.writeOut('\r\n--' + this.encHeader + '\r\n');

			// Контент
			let filename = this.msgSignatures[i].name + '.zip';
			let contentDesc = this.msgSignatures[i].id === 'file' ? 'Esign file signature' : 'Esign signature';

			let attachSection = 'Content-Type: application/zip; name="' + filename + '"\r\n' +
				'Content-Transfer-Encoding: base64\r\n' +
				'Content-Description: ' + contentDesc + '\r\n' +
				'Content-Disposition: attachment; filename="' + filename + '"\r\n' +
				'\r\n' + this.msgSignatures[i].signature + '\r\n';

			this.writeOut(attachSection);
		}
	},

	/**
	 * Добавляет карточку подписи
	 */
	insertCard: function () {
		// Начальные границы
		this.writeOut('\r\n--' + this.encHeader + '\r\n');
		this.writeOutOriginalMsg('\r\n--' + this.encHeader + '\r\n');

		// Контент
		let cardSection =
			'Content-Type: text/html; charset=utf-8\r\n' +
			'Content-Transfer-Encoding: quoted-printable\r\n' +
			'\r\n' + this.msgCard + '\r\n';

		this.writeOut(cardSection);
		this.writeOutOriginalMsg(cardSection);
	},

	/**
	 * Составления сообщения вместе с крипто оберткой
	 *
	 * @param str String Часть сообщения.
	 */
	writeOut: function (str) {
		this.outQueue += str;
	},

	/**
	 * Составление исходного сообщения
	 *
	 * @param str String Часть сообщения.
	 */
	writeOutOriginalMsg(str) {
		this.originalMsg += str;
	},

	flushOutput: function () {
		// Удаляем оригинальные вложения из письма, они есть в контейнере подписи
		if (ESIGN_GLOBAL.isSendSignedAttachments) {
			this.outQueue = EsignDataMsg.removeAttachmentsFromEmail(this.outQueue);
		}

		this.outStringStream.setData(this.outQueue, this.outQueue.length);
		this.outStream.writeFrom(this.outStringStream, this.outQueue.length);
		this.outQueue = '';
	}

};

var NSGetFactory = XPCOMUtils.generateNSGetFactory([EsignMimeEncrypt]);