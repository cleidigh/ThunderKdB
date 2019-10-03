var EXPORTED_SYMBOLS = [ 'DEBUG', 'Cc', 'Ci', 'Cu', 'load', 'logger', 'log', 'bundle' ];

//デバッグフラグ
var DEBUG = false;

//ログレベル[1,2,3,4] = [error,warn,info,debug]
var LOGLEVEL = 2;

//ショートカット
var Cc = Components.classes;
var Ci = Components.interfaces;
var Cu = Components.utils;

//ロケール
var bundle_service = Cc["@mozilla.org/intl/stringbundle;1"].getService(Ci.nsIStringBundleService);
var bundle_string = bundle_service.createBundle("chrome://redthunderminebird/locale/application.properties");
var bundle = {
	GetStringFromName : function(name) {
		return bundle_string.GetStringFromName(name);
	},
	getLocalString : function(name, args) {
		var result = bundle_string.GetStringFromName(name);
		if (args !== undefined)
		{
			if (!(args instanceof Array))
			{
				args = [ args ];
			}
			for (var i = 0; i < args.length; i++)
			{
				var regex = new RegExp('([^\\$])\\$' + (i + 1), 'g');
				result = result.replace(regex, '$1' + args[i]);
			}
		}
		result = result.replace(/\$\$/g, '$');
		return result;
	}
};

//ロガー
var Logger = function(level) {
	this.level = level;

	var consoleService = Cc["@mozilla.org/consoleservice;1"].getService(Ci.nsIConsoleService);

	this.log = function() {
		if (!DEBUG)
			return;

		var message = '';
		for (var i = 0; i < arguments.length; i++)
		{
			if (arguments[i] === undefined)
				arguments[i] = typeof (arguments[i]);

			if (typeof (arguments[i]) == 'string')
			{
				message += arguments[i];
			}
			else
			{
				message += JSON.stringify(arguments[i], null, 2);
			}
		}
		consoleService.logStringMessage(message);
	};
	this.error = function() {
		if (this.level >= 1)
			return this.log.apply(this, arguments);
	};
	this.warn = function() {
		if (this.level >= 2)
			return this.log.apply(this, arguments);
	};
	this.info = function() {
		if (this.level >= 3)
			return this.log.apply(this, arguments);
	};
	this.debug = function() {
		if (this.level >= 4)
			return this.log.apply(this, arguments);
	};
};

var logger = new Logger(LOGLEVEL);
var log = logger.log;

//キャッシュ無効モジュール読み込み
var load = function(module, scope) {
	var query = DEBUG ? '?' + (new Date()).getTime() : '';
	return Cu.import(module + query, scope);
};
