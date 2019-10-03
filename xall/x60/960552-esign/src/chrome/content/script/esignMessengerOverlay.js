"use strict";

/**
 * Взаимодействие с интерфейсом для обновления статуса сообщений
 */

const Cu = Components.utils;

Cu.import("resource://esign/apiGuc.jsm");           // Export ApiGuc
Cu.import("resource://esign/jquery.jsm");           // Export jQuery
Cu.import("resource://esign/preferences.jsm");      // Export EsignPref
Cu.import("resource://esign/locale.jsm");           // Export EsignLocale
Cu.import("resource://esign/data.jsm");             // Export EsignData
Cu.import("resource://esign/purify.jsm");           // Export DOMPurify

/**
 * Управление уведомлениями
 */
var EsignNotification = {
	/**
	 * Слушатель новых сообщений
	 */
	listener: {
		onStartHeaders: function () {
			// По умолчанию скрываем панель
			EsignNotification.notificationBarHide();
		},
		onEndHeaders: function () {
		},
		onEndAttachments: function () {
			// Глобальный "кэш" данных
			let EsignGlobal = Cc['@esign.net/esign/global;1'].getService().wrappedJSObject;

			// Нет данных для проверки подписи
			if (EsignGlobal.msgSigData === '' || !EsignGlobal.msgOriginalContent === '') {
				return false;
			}

			// Проверка подписи
			ApiGuc.verifyTextSignature(
				EsignPref.getPref('api.port'),
				{
					'base64container': EsignGlobal.msgSigData,
					'text': EsignGlobal.msgOriginalContent,
					'checkTimestamp': true,
					'certificateCenterId': EsignPref.getPref('user.verificationCenterId'),
					'token': EsignPref.getPref('user.token')
				},
				function (data) {
					let status = ((data['results'][0] && data['results'][0]['signature']) ? 'valid' : 'invalid');
					EsignNotification.changeNotificationStatus(status, data);
				},
				function (error) {
					let status = '';
					switch (error.status) {
						case 401:
							status = 'api_unauthorized';
							break;
						default:
							status = 'api_disabled';
							break;
					}

					// Добавляем задержку в 200 ms для корректной работы анимации
					setTimeout(function() {
						EsignNotification.changeNotificationStatus(status, {});
					}, 200);
				},
				true
			);
		},
		onBeforeShowHeaderPane: function () {
			// Очищаем глобальный кэш данных по текущему сообщению
			let EsignGlobal = Cc['@esign.net/esign/global;1'].getService().wrappedJSObject;
			EsignGlobal.msgSigData = '';
			EsignGlobal.msgOriginalContent = '';
		}
	},

	/**
	 * Изменение оформления панели статуса подписи
	 *
	 * @param status string Статус тулбара (valid|invalid|api_disabled)
	 * @param data object Данные подписи
	 */
	changeNotificationStatus: function (status, data) {
		// Данные подписи
		let signature = (data.results ? data['results'][0] : {});
		let certificate = (data.certificate ? data.certificate : {});

		// Параметры для оформления панели уведомлений
		let status_class = '';
		let title = '';
		let info = '';
		let clean_text = '';

		switch (status) {
			case 'valid':
				let subjectName = EsignData.getAttrValue(certificate.subject.names, EsignLocale.getString('attr.name'));
				let subjectPhone = EsignData.getAttrValue(certificate.subject.names, EsignLocale.getString('attr.phone'));
				let issuerName = EsignData.getAttrValue(certificate.issuer.names, EsignLocale.getString('attr.name'));
				status_class = (subjectName === issuerName ? 'warning' : 'correct');

				// Очистка данных
				clean_text = DOMPurify.sanitize(EsignLocale.getString('msg.signature.valid'));
				title = clean_text;

				// Базовая структура ----------------------------------------------------
				info = jQuery('<grid/>');
				let columns = jQuery('<columns/>');
				let col1 = jQuery('<column/>');
				let col2 = jQuery('<column/>');
				columns.append(col1);
				columns.append(col2);
				info.append(columns);
				let rows = jQuery('<rows/>');

				// Начало стоки --------------------------------------------------------
				let row = jQuery('<row/>', {
					'class': 'esign-info-val--row'
				});
				let head = jQuery('<vbox/>', {
					'class': 'esign-info-val--head'
				});

				// Очистка данных
				clean_text = DOMPurify.sanitize(EsignLocale.getString('msg.signature.signed'));
				head.text(clean_text);

				let val = jQuery('<vbox/>', {
					'class': 'esign-info-val--data'
				});
				clean_text = DOMPurify.sanitize(subjectName + ' (' + (subjectName === issuerName ? EsignLocale.getString('cert.type.self') : issuerName) + '), ' + EsignLocale.getString('common.phone') + ': ' + subjectPhone);
				val.text(clean_text);

				row.append(head);
				row.append(val);
				rows.append(row);
				// Конец стоки ---------------------------------------------------------

				// Начало стоки --------------------------------------------------------
				let timestamp = signature.timestamp;
				if (timestamp) {
					row = jQuery('<row/>', {
						'class': 'esign-info-val--row'
					});
					head = jQuery('<vbox/>', {
						'class': 'esign-info-val--head'
					});

					// Очистка данных
					clean_text = DOMPurify.sanitize(EsignLocale.getString('msg.signature.timestamp'));
					head.text(clean_text);

					// Статус проверки штампа времени
					val = jQuery('<vbox/>', {
						'class': 'esign-info-val--data'
					});
					let timestampStatus = timestamp.success ? 'Прошёл проверку. ' : 'Не прошел проверку';
					if (timestamp.success) {
						timestampStatus += 'Создан ' + EsignData.toHumanReadableDate(timestamp.generationTime, true);
					}

					// Очистка данных
					clean_text = DOMPurify.sanitize(timestampStatus);
					val.text(clean_text);

					row.append(head);
					row.append(val);
					rows.append(row);
				}
				// Конец стоки ---------------------------------------------------------

				info.append(rows);
				break;

			case 'invalid':
				status_class = 'wrong';

				// Очистка данных
				clean_text = DOMPurify.sanitize(EsignLocale.getString('msg.signature.invalid'));
				title = clean_text;

				// Очистка данных
				clean_text = DOMPurify.sanitize(EsignLocale.getString('msg.signature.invalid.info'));
				info = clean_text;
				break;

			case 'api_disabled':
				status_class = 'primary';

				// Очистка данных
				clean_text = DOMPurify.sanitize(EsignLocale.getString('msg.signature.api_disabled'));
				title = clean_text;

				// Очистка данных
				clean_text = DOMPurify.sanitize(EsignLocale.getString('api.service.disabled'));
				info = clean_text;

				break;

			case 'api_unauthorized':
				status_class = 'primary';

				// Очистка данных
				clean_text = DOMPurify.sanitize(EsignLocale.getString('msg.signature.api_disabled'));
				title = clean_text;

				// Очистка данных
				clean_text = DOMPurify.sanitize(EsignLocale.getString('api.service.unauthorized'));
				info = clean_text;
				break;
		}

		// Применяем оформление к панели уведомлений
		let msgNotificationBarClass = document.getElementById('esignNotification').classList;
		if (msgNotificationBarClass) {
			// Удаление всех классов
			let classesArr = msgNotificationBarClass.toString().split(' ');
			for (let i = 0; i < classesArr.length; i++) {
				msgNotificationBarClass.remove(classesArr[i]);
			}
			// Добавление классов
			msgNotificationBarClass.add(status_class);
		}

		// Добавляем html
		jQuery('#esign-info-title').html(title);
		jQuery('#esign-info-val').html(info);
	},

	/**
	 * Скрывает тулбар
	 */
	notificationBarHide: function () {
		document.getElementById('esignNotification').classList.add('disabled');
	}
};

// При смене окна, скрываем панель уведомлений
let observer = new MutationObserver(function () {
	document.getElementById('esignNotification').classList.add('disabled');
});
observer.observe(document.getElementById('msgHeaderView'), {attributes: true});

// Добавляем слушатель событий
gMessageListeners.push(EsignNotification.listener);
