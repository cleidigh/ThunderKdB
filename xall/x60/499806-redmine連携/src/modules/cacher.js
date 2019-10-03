var EXPORTED_SYMBOLS = [ 'cacher' ];

Components.utils.import("resource://redthunderminebird/common.js");

var Cacher = function() {
	logger.debug('Cacher constractor');

	this.cache_table = {};

	this.default_expire_second = DEBUG ? 5 : 30;

	this.set = function(key, value, expire_second) {
		logger.debug('set:', key);

		if (expire_second === undefined)
		{
			expire_second = this.default_expire_second;
		}

		var result = this.get(key);

		this.cache_table[key] = {
			value : value,
			expire : parseInt((new Date()) / 1000) + expire_second
		};

		return result;
	};

	this.get = function(key) {
		logger.debug('get:', key);

		var result = this.cache_table[key];

		if (result === undefined)
		{
			logger.debug('get:undefined ', key);
			return undefined;
		}

		if (result.expire < parseInt((new Date()) / 1000))
		{
			logger.debug('get:expire ', key);
			return undefined;
		}

		return result.value;
	};

	this.getorset = function(key, callback, expire_second) {
		logger.debug('getorset:', key);

		var result = this.get(key);
		if (result === undefined)
		{
			logger.debug('getorset:call callback');
			result = callback();
			this.set(key, result, expire_second);
		}

		return result;
	};

	this.remove = function(key) {
		logger.debug('remove:', key);

		return this.set(key, null, -1);
	};

	this.removes = function(pattern) {
		logger.debug('removes:', pattern.toString());

		var keys = Object.keys(this.cache_table);
		for (var i = 0; i < keys.length; i++)
		{
			var key = keys[i];
			if (key.match(pattern))
			{
				this.remove(key);
			}
		}
	};

	this.expire = function() {
		logger.debug('expire');

		var keys = Object.keys(this.cache_table);
		for (var i = 0; i < keys.length; i++)
		{
			var key = keys[i];
			var value = this.cache_table[key];
			if (value.expire < parseInt((new Date()) / 1000))
			{
				this.cache_table[key] = undefined;
			}
		}
	};
};

var cacher = new Cacher();
