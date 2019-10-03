"use strict";

/**
 * Настройки плагина Esign.
 */

const Cu = Components.utils;

Cu.import("resource://esign/apiGuc.jsm");      // Export ApiGuc
Cu.import("resource://esign/preferences.jsm"); // Export EsignPref
Cu.import("resource://esign/locale.jsm");      // Export EsignLocale
Cu.import("resource://esign/data.jsm");        // Export EsignData

/**
 * Параметры по умолчанию
 */
function settingsOnLoad() {
	// Вкладка по умолчанию
	if (typeof window.arguments !== 'undefined' && window.arguments[0]) {
		document.getElementById('esignSettingsTabBox').selectedIndex = window.arguments[0];
	}

	// Параметры по умолчанию
	document.getElementById("apiPort").value = EsignPref.getPref('api.port');
	updateElements();

	// Обновление данных при переключении табов
	document.getElementById("esignSettingsTabBox").onselect = function (ev) {
		updateElements();
	}
}

/**
 * Обновление элементов формы
 */
function updateElements() {
	let apiPort = document.getElementById("apiPort").value;
	let token = EsignPref.getPref('user.token');

	// Задаем уникальный токен
	if (!token) {
		EsignPref.setPref('user.token', EsignData.generateRandomString(16));
		token = EsignPref.getPref('user.token');
	}

	switch (ApiGuc.isApiEnabled(apiPort, {'token': token})) {
		case 200:
			document.getElementById("error-api-service").classList.add('disabled');
			break;
		case 401:
			// Вызываем запрос на регистрацию
			ApiGuc.register(apiPort, {
				'token': token,
				'name': 'Esign',
				'description': 'Addon for Thunderbird'
			}, function () {
				if (confirm('Подтвердите запрос на регистрацию Esign в ПО клиента АИС «ГУЦ» и нажмите ОК')) {
					updateElements();
				}
			}, function () {
			});
			break;
		default:
			document.getElementById("userCertificate").value = '';
			document.getElementById("userVerificationCenter").value = '';
			document.getElementById("error-api-service").classList.remove('disabled');
			break;
	}
	// Запускаем update список только в том случае, если значения не выбраны
	if (!document.getElementById("userCertificate").value) {
		updateCertificateList();
	}

	if (!document.getElementById("userVerificationCenter").value) {
		updateVerificationCenterList();
	}
}

/**
 * Сохранение параметров в конфигурации
 */
function settingsOnAccept() {
	// Порт API
	let apiPort = document.getElementById("apiPort").value;
	if (apiPort) {
		EsignPref.setPref('api.port', apiPort);
	}

	// Информация о сертификате
	let userCert = document.getElementById("userCertificate");
	if (userCert.value) {
		EsignPref.setPref('user.certificateId', userCert.value);
	}

	// Информация об удостоверяющем центре
	let centerId = document.getElementById("userVerificationCenter").value;
	if (centerId) {
		EsignPref.setPref('user.verificationCenterId', centerId);
	}
}

/**
 * Обновление списка сертификатов
 */
function updateCertificateList() {
	ApiGuc.getCertificates(
		document.getElementById("apiPort").value,
		{'token': EsignPref.getPref('user.token')},
		certSuccessCallback,
		certErrorCallback
	);
}

/**
 * Обновления списка удостовреяющих центров
 */
function updateVerificationCenterList() {
	ApiGuc.getCertificateCenters(
		document.getElementById("apiPort").value,
		{'token': EsignPref.getPref('user.token')},
		vcSuccessCallback,
		vcErrorCallback
	);
}

/**
 * Функция обратного вызова для получения сертификатов
 *
 * @param data
 * @returns {boolean}
 */
function certSuccessCallback(data) {
	if (data.length === 0) {
		return false;
	}

	// Рендер списка сертификатов
	let userCertificateDefaultValue = parseInt(EsignPref.getPref('user.certificateId'));
	let menu = document.getElementById("userCertificate");

	// Очистка данных
	menu.removeAllItems();

	// Формирование элементов списка
	let type = '';
	for (let i = 0; i < data.length; i++) {
		menu.appendItem(
			data[i]['subject'] + ' (' + (data[i]['issuer'] === data[i]['subject'] ? EsignLocale.getString('cert.type.self') : data[i]['issuer']) + ')',
			data[i]['id']
		);
	}

	// Значение по умолчанию
	if (userCertificateDefaultValue) {
		menu.value = userCertificateDefaultValue;
	}
}

/**
 * Функция обратного вызова для получения сертификатов
 *
 * @param data
 * @returns {boolean}
 */
function vcSuccessCallback(data) {
	if (data.length === 0) {
		return false;
	}

	// Рендер списка сертификатов
	let verificationCenterDefaultValue = parseInt(EsignPref.getPref('user.verificationCenterId'));
	let menu = document.getElementById("userVerificationCenter");

	// Очистка данных
	menu.removeAllItems();

	// Формирование элементов списка
	for (let i = 0; i < data.length; i++) {
		menu.appendItem(data[i]['address'], data[i]['id']);

		if (!verificationCenterDefaultValue && data[i]['byDefault']) {
			menu.value = data[i]['id'];
		}
	}

	// Значение по умолчанию
	if (verificationCenterDefaultValue) {
		menu.value = verificationCenterDefaultValue;
	}
}

/**
 * Функция обратного вызова для ошибок
 */
function certErrorCallback() {
	// Очистка данных
	let menu = document.getElementById("userCertificate");
	menu.removeAllItems();
}

/**
 * Функция обратного вызова для ошибок
 */
function vcErrorCallback() {
	// Очистка данных
	let menu = document.getElementById("userVerificationCenter");
	menu.removeAllItems();
}