"use strict";

/**
 * API для взаимодействия с клиентом ГУЦ.
 */
const EXPORTED_SYMBOLS = ["ApiGuc"];

Components.utils.import("resource://esign/jquery.jsm"); // Export jQuery

const ApiGuc = function () {
	var localhostUrl = "http://127.0.0.1";

	return {
		/**
		 * Проверка доступности API
		 *
		 * @param port - локальный порт, на который необходимо отправить запрос
		 * @param args - объект, содержащий следующие параметры:
		 *      token - токен доступа
		 */
		isApiEnabled: function (port, args) {
			var result = 0;

			jQuery.ajax({
				method: "GET",
				url: localhostUrl + ":" + port + '/certificate_centers',
				dataType: "json",
				data: args,
				success: function (data) {
					result = 200;
				}, error: function (error) {
					result = error.status;
				},
				async: false
			});

			return result;
		},

		/**
		 * Запрос на получение списка сертификатов
		 *
		 * @param port - локальный порт, на который необходимо отправить запрос
		 * @param args - объект, содержащий следующие параметры:
		 *      token - токен доступа
		 * @param successFunction - функция, вызываемая при успешном выполнении запроса.
		 * В качестве аргумента принимает список сертификатов
		 * @param errorFunction - функция, вызываемая при ошибке. В качестве аргумента принимает текст ошибки.
		 */
		getCertificates: function (port, args, successFunction, errorFunction) {
			jQuery.ajax({
				method: "GET",
				url: localhostUrl + ":" + port + "/certificates",
				dataType: "json",
				data: args,
				success: function (certificates) {
					successFunction(certificates);
				}, error: function (error) {
					errorFunction(error);
				}
			});
		},
		/**
		 * Запрос на получение информации о сертификате
		 *
		 * @param port - локальный порт, на который необходимо отправить запрос
		 * @param args - объект, содержащий следующие параметры:
		 *      certificateId - числовой идентификатор сертификата, которым необходимо получить
		 *       token - токен доступа
		 * @param successFunction - функция, вызываемая при успешном выполнении запроса.
		 * В качестве аргумента принимает объект, содержащий информацию о сертфикате
		 * @param errorFunction - функция, вызываемая при ошибке. В качестве аргумента принимает текст ошибки.
		 * @param isAsync - является ли запрос асинхронным.
		 */
		getCertificateInfo: function (port, args, successFunction, errorFunction, isAsync) {
			jQuery.ajax({
				method: "GET",
				url: localhostUrl + ":" + port + "/certificate_info",
				data: args,
				dataType: "json",
				success: function (certificatePem) {
					successFunction(certificatePem);
				}, error: function (error) {
					errorFunction(error);
				},
				async: isAsync
			});
		},
		/**
		 * Запрос на получение списка удостоверяющих центров
		 *
		 * @param port - локальный порт, на который необходимо отправить запрос
		 * @param args - объект, содержащий следующие параметры:
		 *      token - токен доступа
		 * @param successFunction - функция, вызываемая при успешном выполнении запроса.
		 * В качестве аргумента принимает список удостоверяющих центров
		 * @param errorFunction - функция, вызываемая при ошибке. В качестве аргумента принимает текст ошибки.
		 */
		getCertificateCenters: function (port, args, successFunction, errorFunction) {
			jQuery.ajax({
				method: "GET",
				url: localhostUrl + ":" + port + "/certificate_centers",
				dataType: "json",
				data: args,
				success: function (certificateCenters) {
					successFunction(certificateCenters);
				}, error: function (error) {
					errorFunction(error);
				}
			});
		},
		/**
		 * Запрос на подпись файла
		 *
		 * @param port - локальный порт, на который необходимо отправить запрос
		 * @param args - объект, содержащий следующие параметры:
		 *      certificateId - числовой идентификатор сертификата, которым необходимо подписать данные
		 *      base64data - строка с байтами для подписи, закодированными в BASE64
		 *      fileName - имя файла для подписи
		 *      withTimestamp - boolean, необходимо ли создавать штамп времени (необязательный параметр,
		 *          по умолчанию - false)
		 *      certificateCenterId - числовой идентификатор удостоверяющего центра, у которого необходимо
		 *          получить штамп времени (обязательный при указанном withTimestamp = true)
		 *      encapsulated - boolean, необходимо ли включать исходные данные в контейнер с подписью
		 *          (необязателный параметр)
		 *      token - токен доступа
		 * @param successFunction - функция, вызываемая при успешном выполнении запроса.
		 * В качестве аргумента принимает строку с байтами контейнера, закодированными в BASE64
		 * @param errorFunction - функция, вызываемая при ошибке. В качестве аргумента принимает текст ошибки.
		 * @param isAsync - является ли запрос асинхронным.
		 */
		attachSignature: function (port, args, successFunction, errorFunction, isAsync) {
			jQuery.ajax({
				method: "POST",
				url: localhostUrl + ":" + port + "/sign",
				data: args,
				success: function (base64container) {
					successFunction(base64container);
				}, error: function (error) {
					errorFunction(error);
				},
				async: isAsync
			});
		},
		/**
		 * Запрос на проверку подписи файла
		 *
		 * @param port - локальный порт, на который необходимо отправить запрос
		 * @param args - объект, содержащий следующие параметры:
		 *      base64container - строка с байтами контейнера, закодированными в BASE64
		 *      base64data - строка с байтами для проверки подписи, закодированными в BASE64
		 *      fileName - имя файла для проверки подписи
		 *      checkTimestamp - boolean, необходимо ли проверять штамп времени (необязательный параметр,
		 *          по умолчанию - false)
		 *      certificateCenterId - числовой идентификатор удостоверяющего центра, у которого необходимо
		 *          проверить штамп времени (обязательный при указанном checkTimestamp = true)
		 *      token - токен доступа
		 * @param successFunction - функция, вызываемая при успешном выполнении запроса. В качестве аргумента
		 * принимает список объектов, представляющих результаты проверки подписи.
		 * @param errorFunction - функция, вызываемая при ошибке. В качестве аргумента принимает текст ошибки.
		 * @param isAsync - является ли запрос асинхронным.
		 */
		verifySignature: function (port, args, successFunction, errorFunction, isAsync) {
			jQuery.ajax({
				method: "POST",
				url: localhostUrl + ":" + port + "/verify",
				dataType: "json",
				data: args,
				success: function (result) {
					successFunction(result);
				}, error: function (error) {
					errorFunction(error);
				},
				async: isAsync
			});
		},

		/**
		 * Запрос на проверку подписи файла
		 *
		 * @param port - локальный порт, на который необходимо отправить запрос
		 * @param args - объект, содержащий следующие параметры:
		 *      base64container - строка с байтами контейнера, закодированными в BASE64
		 *      text - строка для проверки в формате UTF-8. Необязательный параметр, если контейнер содержит данные
		 *      checkTimestamp - boolean, необходимо ли проверять штамп времени (необязательный параметр, по умолчанию - false)
		 *      certificateCenterId - числовой идентификатор удостоверяющего центра, у которого необходимо проверить штамп времени (обязательный при указанном checkTimestamp = true)
		 *      token - токен доступа
		 * @param successFunction - функция, вызываемая при успешном выполнении запроса. В качестве аргумента
		 * принимает объект, содержащий результаты проверки подписи, а также информацию о сертификате
		 * @param errorFunction - функция, вызываемая при ошибке. В качестве аргумента принимает текст ошибки.
		 * @param isAsync - является ли запрос асинхронным.
		 */
		verifyTextSignature: function (port, args, successFunction, errorFunction, isAsync) {
			jQuery.ajax({
				method: "POST",
				url: localhostUrl + ":" + port + "/verify_text",
				dataType: "json",
				data: args,
				success: function (result) {
					successFunction(result);
				}, error: function (error) {
					errorFunction(error);
				},
				async: isAsync
			});
		},

		/**
		 * Запрос на регистрацию сервиса
		 *
		 * @param port - локальный порт, на который необходимо отправить запрос
		 * @param args - объект, содержащий следующие параметры:
		 *      token - уникальный токен сервиса
		 *      name - имя сервиса
		 *      description - описание сервиса
		 * @param successFunction - функция, вызываемая при успешном выполнении запроса.
		 * @param errorFunction - функция, вызываемая при ошибке. В качестве аргумента принимает текст ошибки.
		 */
		register: function (port, args, successFunction, errorFunction) {
			jQuery.ajax({
				method: "POST",
				url: localhostUrl + ":" + port + "/register",
				data: args,
				success: function () {
					successFunction();
				}, error: function (error) {
					errorFunction(error);
				}
			});
		}
	}
}();
