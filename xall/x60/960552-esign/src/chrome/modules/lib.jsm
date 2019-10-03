"use strict";

/**
 * Подгрузка библиотеки из модулей
 */
const EXPORTED_SYMBOLS = ['Lib'];

const Ci = Components.interfaces;
const Cc = Components.classes;

// Базовые значения
let Scope = {
	window: null,
	document: null,
};

// Загрузка окна
let wm = Cc["@mozilla.org/appshell/window-mediator;1"].getService(Ci.nsIWindowMediator);
let enumerator = wm.getEnumerator(null);
if (enumerator.hasMoreElements()) {
	let win = enumerator.getNext();
	Scope.window = win;
	Scope.document = win.document;
}

let Lib = Object.create(Scope);

Lib.getLib = function (url) {
	let loader = Cc["@mozilla.org/moz/jssubscript-loader;1"].getService(Ci.mozIJSSubScriptLoader);
	loader.loadSubScript(url, Lib);
	return Lib;
};