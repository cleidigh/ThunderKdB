/* eslint-disable */
// adopted from https://github.com/Chialab/ajax-js/
var _createClass = function () { 
  function defineProperties(target, props) {
    for (var i = 0; i < props.length; i++) {
      var descriptor = props[i];
      descriptor.enumerable = descriptor.enumerable || false;
      descriptor.configurable = true;
      
      if ("value" in descriptor) {
        descriptor.writable = true;
      }
      
      Object.defineProperty(target, descriptor.key, descriptor);
    }
  }
  
  return function (Constructor, protoProps, staticProps) {
    if (protoProps) {
      defineProperties(Constructor.prototype, protoProps);
    } 
    
    if (staticProps) {
      defineProperties(Constructor, staticProps);
    } 
    
    return Constructor;
  };

}();

function _classCallCheck(instance, Constructor) {
  if (!(instance instanceof Constructor)) {
    throw new TypeError("Cannot call a class as a function");
  }
}

/**
 * A XMLHttpRequest wrapper.
 * @class Ajax
 */
var Ajax = function () {
    _createClass(Ajax, null, [{
        key: 'create',

        /**
         * Instantiate a XMLHttpRequest.
         * @return {XMLHttpRequest}
         */
        value: function create() {
            var XHR = window.XMLHttpRequest || window.ActiveXObject;
            return new XHR('MSXML2.XMLHTTP.3.0');
        }
        /**
         * Exec a XMLHttpRequest.
         *
         * @static
         * @param {Object|String} options A set of options (or the url) for the XMLHttpRequest
         * @property {String}   options.url           The requested url.
         * @property {Object}   options.headers       A set of headers to set (key => value).
         * @property {String}   options.responseType  The response type mime.
         * @property {Number}   options.timeout       A value for request timeout (0 => no timeout).
         * @property {Function} options.notify        A callback function for progress event.
         * @property {Boolean}  options.async         Should exec the request asynchronously.
         * @property {XMLHttpRequest}  options.xhr    The xhr instance to use (optional).
         * @return {Promise}
         */

    }, {
        key: 'request',
        value: function request() {
            var options = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};

            if (typeof options === 'string') {
                options = {
                    url: options
                };
            }
            return new Promise(function (resolve, reject) {
                var request = options.xhr || Ajax.create();
                var resolved = false;
                for (var k in Ajax.defaultOptions) {
                    if (typeof options[k] === 'undefined') {
                        options[k] = Ajax.defaultOptions[k];
                    }
                }
                request.open(options.method || 'GET', options.url, !!options.async);
                if (options.headers) {
                    var headers = options.headers;
                    for (var _k in headers) {
                        if (headers.hasOwnProperty(_k)) {
                            request.setRequestHeader(_k, headers[_k]);
                        }
                    }
                }

                if (options.responseType) {
                    request.responseType = options.responseType;
                }

                request.onreadystatechange = function () {
                    if (request.readyState === 4) {
                        var parse = function parse(req) {
                            var result = void 0;
                            if (options.responseType === 'text' && typeof req.responseText === 'string') {
                                result = req.responseText;
                            } else if (typeof req.response !== 'undefined') {
                                if (options.responseType === 'json' && typeof req.response === 'string') {
                                    result = JSON.parse(req.response);
                                } else {
                                    result = req.response;
                                }
                            } else {
                                // IE workaround
                                try {
                                    if (options.responseType === 'json' && typeof req.responseText === 'string') {
                                        result = JSON.parse(req.responseText);
                                    } else {
                                        result = req.responseText;
                                    }
                                } catch (ex) {
                                    result = req.responseText;
                                }
                            }
                            return result;
                        };
                        resolved = true;
                        if (request.status >= 200 && request.status < 300 || request.status === 304) {
                            resolve(parse(request));
                        } else {
                            reject(request);
                        }
                    }
                };

                request.onerror = function () {
                    resolved = true;
                    reject(request);
                };

                request.onabort = function () {
                    resolved = true;
                    reject(request);
                };

                request.addEventListener('progress', function (e) {
                    var done = e.loaded || e.position;
                    var total = e.total || e.totalSize;

                    if (typeof options.notify === 'function') {
                        options.notify(done, total);
                    }
                }, false);

                if (request.upload) {
                    request.upload.onprogress = function (e) {
                        var done = e.loaded || e.position;
                        var total = e.total || e.totalSize;
                        if (typeof options.notify === 'function') {
                            options.notify(done, total);
                        }
                    };
                }

                var data = options.data;
                if (data !== undefined) {
                    request.send(options.data);
                } else {
                    request.send();
                }

                if (options.timeout) {
                    setTimeout(function () {
                        if (!resolved) {
                            request.timeout = true;
                            request.status = 0;
                            reject(request);
                        }
                    }, options.timeout);
                }
            });
        }
        /**
         * Exec a XMLHttpRequest with method HEAD.
         * @static
         * @param {String} url The url for the XMLHttpRequest.
         * @param {Object} options A set of options for the XMLHttpRequest.
         * @return {Promise}
         */

    }, {
        key: 'head',
        value: function head(url) {
            var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};

            options.url = url;
            options.method = 'HEAD';
            return this.request(options);
        }
        /**
         * Exec a XMLHttpRequest with method GET.
         * @static
         * @param {String} url The url for the XMLHttpRequest.
         * @param {Object} options A set of options for the XMLHttpRequest.
         * @return {Promise}
         */

    }, {
        key: 'get',
        value: function get(url) {
            var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};

            options.url = url;
            options.method = 'GET';
            return this.request(options);
        }
        /**
         * Exec a XMLHttpRequest with method POST.
         * @static
         * @param {String} url The url for the XMLHttpRequest.
         * @param {Object} options A set of options for the XMLHttpRequest.
         * @param {Object} data The data to send in the POST request.
         * @return {Promise}
         */

    }, {
        key: 'post',
        value: function post(url) {
            var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
            var data = arguments[2];

            options.url = url;
            options.method = 'POST';
            if (data !== undefined) {
                options.data = data;
            }
            return this.request(options);
        }
        /**
         * Exec a XMLHttpRequest with method PATCH.
         * @static
         * @param {String} url The url for the XMLHttpRequest.
         * @param {Object} options A set of options for the XMLHttpRequest.
         * @param {Object} data The data to send in the PATCH request.
         * @return {Promise}
         */

    }, {
        key: 'patch',
        value: function post(url) {
            var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
            var data = arguments[2];

            options.url = url;
            options.method = 'PATCH';
            if (data !== undefined) {
                options.data = data;
            }
            return this.request(options);
        }
        /**
         * Exec a XMLHttpRequest with method PUT.
         * @static
         * @param {String} url The url for the XMLHttpRequest.
         * @param {Object} options A set of options for the XMLHttpRequest.
         * @param {Object} data The data to send in the PUT request.
         * @return {Promise}
         */

    }, {
        key: 'put',
        value: function put(url) {
            var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
            var data = arguments[2];

            options.url = url;
            options.method = 'PUT';
            if (data !== undefined) {
                options.data = data;
            }
            return this.request(options);
        }
        /**
         * Exec a XMLHttpRequest with method DELETE.
         * @static
         * @param {String} url The url for the XMLHttpRequest.
         * @param {Object} options A set of options for the XMLHttpRequest.
         * @return {Promise}
         */

    }, {
        key: 'delete',
        value: function _delete(url) {
            var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};

            options.url = url;
            options.method = 'DELETE';
            return this.request(options);
        }
        /**
         * Create an Ajax instance.
         * @property {XMLHttpRequest} this.xhr The XMLHttpRequest to use.
         */

    }, {
        key: 'defaultOptions',
        get: function get() {
            return {
                async: true,
                timeout: 1000 * 60,
                responseType: 'json',
                headers: {
                    'X-Requested-With': 'XMLHttpRequest',
                    'Content-type': 'application/x-www-form-urlencoded'
                }
            };
        }
    }]);

    function Ajax() {
        _classCallCheck(this, Ajax);

        this.xhr = this.constructor.create();
    }
    /**
     * Exec a XMLHttpRequest.
     * @see Ajax.request
     */


    _createClass(Ajax, [{
        key: 'request',
        value: function request() {
            var options = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};

            if (typeof options === 'string') {
                options = {
                    url: options
                };
            }
            options.xhr = this.xhr;
            return Ajax.request(options);
        }
        /**
         * Exec a XMLHttpRequest with method HEAD.
         * @see Ajax.head
         */

    }, {
        key: 'head',
        value: function head() {
            var _Ajax$head;

            for (var _len = arguments.length, args = Array(_len), _key = 0; _key < _len; _key++) {
                args[_key] = arguments[_key];
            }

            return (_Ajax$head = Ajax.head).call.apply(_Ajax$head, [this].concat(args));
        }
        /**
         * Exec a XMLHttpRequest with method GET.
         * @see Ajax.get
         */

    }, {
        key: 'get',
        value: function get() {
            var _Ajax$get;

            for (var _len2 = arguments.length, args = Array(_len2), _key2 = 0; _key2 < _len2; _key2++) {
                args[_key2] = arguments[_key2];
            }

            return (_Ajax$get = Ajax.get).call.apply(_Ajax$get, [this].concat(args));
        }
        /**
         * Exec a XMLHttpRequest with method POST.
         * @see Ajax.post
         */

    }, {
        key: 'post',
        value: function post() {
            var _Ajax$post;

            for (var _len3 = arguments.length, args = Array(_len3), _key3 = 0; _key3 < _len3; _key3++) {
                args[_key3] = arguments[_key3];
            }

            return (_Ajax$post = Ajax.post).call.apply(_Ajax$post, [this].concat(args));
        }
        /**
         * Exec a XMLHttpRequest with method PATCH.
         * @see Ajax.patch
         */

    }, {
        key: 'patch',
        value: function patch() {
            var _Ajax$patch;

            for (var _len3 = arguments.length, args = Array(_len3), _key3 = 0; _key3 < _len3; _key3++) {
                args[_key3] = arguments[_key3];
            }

            return (_Ajax$patch = Ajax.patch).call.apply(_Ajax$patch, [this].concat(args));
        }
        /**
         * Exec a XMLHttpRequest with method PUT.
         * @see Ajax.put
         */

    }, {
        key: 'put',
        value: function put() {
            var _Ajax$put;

            for (var _len4 = arguments.length, args = Array(_len4), _key4 = 0; _key4 < _len4; _key4++) {
                args[_key4] = arguments[_key4];
            }

            return (_Ajax$put = Ajax.put).call.apply(_Ajax$put, [this].concat(args));
        }
        /**
         * Exec a XMLHttpRequest with method DELETE.
         * @see Ajax.delete
         */

    }, {
        key: 'delete',
        value: function _delete() {
            var _Ajax$delete;

            for (var _len5 = arguments.length, args = Array(_len5), _key5 = 0; _key5 < _len5; _key5++) {
                args[_key5] = arguments[_key5];
            }

            return (_Ajax$delete = Ajax.delete).call.apply(_Ajax$delete, [this].concat(args));
        }
    }]);

    return Ajax;
}();
