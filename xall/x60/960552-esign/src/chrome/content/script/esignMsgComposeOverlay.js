"use strict";

/**
 * Взаимодействие с интерфейсом для создания сообщений
 */

const Cc = Components.classes;
const Cu = Components.utils;

Cu.import('resource://gre/modules/XPCOMUtils.jsm'); // Export XPCOMUtils
Cu.import("resource://esign/preferences.jsm");      // Export EsignPref
Cu.import("resource://esign/data.jsm");             // Export EsignData
Cu.import("resource://esign/locale.jsm");           // Export EsignLocale
Cu.import("resource://esign/apiGuc.jsm");           // Export ApiGuc

var Msg = {
	/**
	 * Инициализация.
	 */
	init: function () {
		this.updateUi();
		this.clearState();
	},

	/**
	 * Очистка состояния приложения
	 */
	clearState: function () {
		let EsignGlobal = Cc['@esign.net/esign/global;1'].getService().wrappedJSObject;
		EsignGlobal.isSendSigned = false;
		EsignGlobal.isSendSignedAttachments = false;
	},

	updateUi: function () {
		// API не доступно или не указаны настройки
		if (!Msg.checkConnection()) {
			document.getElementById('esign-api-disabled-item').classList.remove('disabled');
			document.getElementById('esign-preferences-item').classList.add('disabled');
			document.getElementById('esign-sign-item').classList.add('disabled');
			return;
		}

		// API доступно. Очистка состояния.
		document.getElementById('esign-api-disabled-item').classList.add('disabled');
		document.getElementById('esign-preferences-item').classList.remove('disabled');
		document.getElementById('esign-sign-item').classList.remove('disabled');

		// Информация по текущему сертификату
		var certificate = {};

		ApiGuc.getCertificateInfo(
			EsignPref.getPref('api.port'),
			{
				'certificateId': EsignPref.getPref('user.certificateId'),
				'token': EsignPref.getPref('user.token')
			},
			function (data) {
				certificate = data;
			},
			function () {
			},
			false
		);

		if (certificate) {
			let certificateName = '';
			let subjectName = '';
			let issuesName = '';

			if (certificate.subject.names) {
				subjectName = EsignData.getAttrValue(certificate.subject.names, EsignLocale.getString('attr.name'));
				certificateName = subjectName;
			}
			if (certificate.subject.names && certificate.issuer.names) {
				issuesName = EsignData.getAttrValue(certificate.issuer.names, EsignLocale.getString('attr.name'));
				certificateName += ' (' + (issuesName === subjectName ? EsignLocale.getString('cert.type.self') : issuesName) + ')';
			}

			document.getElementById("esign-preferences").label = 'Сертификат: ' + certificateName;
		}
	},

	/**
	 * Проверка подключения
	 */
	checkConnection: function () {
		// Доступность API
		let apiPort = EsignPref.getPref('api.port');
		let certificateId = EsignPref.getPref('user.certificateId');
		let verificationCenterId = EsignPref.getPref('user.verificationCenterId');
		let token = EsignPref.getPref('user.token');

		// Не указаны настройки подключения
		let apiStatus = ApiGuc.isApiEnabled(apiPort, {'token': token});
		if (apiStatus !== 200 ||
			!certificateId ||
			!verificationCenterId ||
			!token
		) {
			return false;
		}

		return true;
	},

	/**
	 * Глобальное сохранение статуса сообщения
	 *
	 * @param id
	 */
	toggleCheckbox: function (id) {
		let val = document.getElementById(id).checked;
		let EsignGlobal = Cc['@esign.net/esign/global;1'].getService().wrappedJSObject;

		switch (id) {
			case 'esign-sign':
				EsignGlobal.isSendSigned = val;
				break;

			case 'esign-sign-attachments':
				// Автоматически устанавливаем значение для подписи письма
				let signMsg = document.getElementById('esign-sign');
				EsignGlobal.isSendSigned = val;
				signMsg.checked = val;
				signMsg.disabled = val ? 'disabled' : '';

				// Подпись вложений
				EsignGlobal.isSendSignedAttachments = val;
				break;
		}

		// Взаимодействие для кнопки
		if (EsignGlobal.isSendSigned || EsignGlobal.isSendSignedAttachments) {
			document.getElementById('esign-sign-item-btn').setAttribute('image', 'chrome://esign/content/skin/default/icon/shield.png');
		}
		else {
			document.getElementById('esign-sign-item-btn').setAttribute('image', 'chrome://esign/content/skin/default/icon/signature.png');
		}
	},

	/**
	 * Открытие диалога настроек.
	 */
	openSettings: function (defaultTabIndex) {
		window.openDialog(
			"chrome://esign/content/component/esignSettings.xul",
			"settingsDialog",
			"modal=yes,centerscreen=yes",
			defaultTabIndex
		);
	}
};

// Инициализация
window.addEventListener("load", function () {
	Msg.init();
}, false);

// Обработка нажатия кнопки
document.getElementById("button-send").addEventListener("click", function (event) {
	if (!Msg.checkConnection() &&
		document.getElementById('esign-sign').checked === true
	) {
		alert('Пожалуйста, запустите API сервис клиента АИС «ГУЦ»');
		event.preventDefault();
	}
});