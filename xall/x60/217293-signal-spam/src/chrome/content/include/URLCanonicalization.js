var verifromURLCanonicalization={

	parse_url:function(url) {
    var splitRegExp = new RegExp(
        '^' +
            '(?:' +
            '([^:/?#.]+)' +                         // scheme - ignore special characters
                                                    // used by other URL parts such as :,
                                                    // ?, /, #, and .
            ':)?' +
            '(?://' +
            '(?:([^/?#]*)@)?' +                     // userInfo
            '([\\s\\w\\d\\-\\u0100-\\uffff.%]*)' +     // domain - restrict to letters,
                                                    // digits, dashes, dots, percent
                                                    // escapes, and unicode characters.
            '(?::([0-9]+))?' +                      // port
            ')?' +
            '([^?#]+)?' +                           // path
            '(?:\\?([^#]*))?' +                     // query
            '(?:#(.*))?' +                          // fragment
            '$');

    var split = url.match(splitRegExp);
    var splitUserPwd = split[2] ? split[2].match(/([^:@]*):{0,1}(.*)/) : undefined;
        return {
            'scheme':split[1]===undefined ? "" : split[1],
            'host':split[3]===undefined ? "" : split[3],
            'port':split[4]===undefined ? "" : split[4],
            'path':split[5]===undefined ? "" : split[5],
            'query':split[6]===undefined ? "" : '?'+split[6],
            'searchObject': undefined,
            'hash':split[7]===undefined ? "" : '#'+split[7],
        	'href':url,
            'username':splitUserPwd ? splitUserPwd[1] : '',
            'password':splitUserPwd ? splitUserPwd[2] : ''
        }
		
		/*if (!url.match(/^https?:\/\//))
			url=url.replace(/^(\/\/){0,1}(.*)/,'http://$2')
		var parser = document.createElement('a'),
	        searchObject = {},
	        queries, split, i;
	    // Let the browser do the work
	    parser.href = url;
	    // Convert query string to object
	    queries = parser.search.replace(/^\?/, '').split('&');
	    for( i = 0; i < queries.length; i++ ) {
	        split = queries[i].split('=');
	        searchObject[split[0]] = split[1];
	    }
	    var username = url.replace(new RegExp('^(https?:(\/\/){0,1}){0,1}([^:@]*):?(.*)@'+parser.host),'$3');
	    var password = url.replace(new RegExp('^(https?:(\/\/){0,1}){0,1}([^:@]*):?(.*)@'+parser.host),'$4');
	    return {
	        scheme: parser.protocol.substring(0,parser.protocol.length-1),
	        host: parser.hostname,
	        //hostname: parser.hostname,
	        port: parser.port,
	        path: parser.pathname,
	        query: parser.search,
	        searchObject: searchObject,
	        hash: parser.hash,
	        href: parser.href,
	        username: username,
	        password: password
	    };*/
	},

	canonicalize:function(url){
		//Assume HTTP if no scheme is defined
		if (/^[^\S]*([a-zA-z\-0-9]*):\/\//.test(url)===false)
			url = 'http://'+url;
		
		//Remove whitespace, any tab (0x09), CR (0x0d), and LF (0x0a) characters
		url = url.trim();
		url = url.replace(/\x{09}|\x{0d}|\x{0a}/, '');

		//Remove any fragments, ie: #frag
		//url = url.replace(/#(.+)$/, '');

		//Escape any \x00-99 character
		url = url.replace(/\\x([0-9]{2})/g, '\%$1');
		
		var urlParts = this.parse_url(url);
		
		if(urlParts['host']!==undefined && urlParts['host']!==null && urlParts['host'].length===0){
			return undefined;
		}
		
		if(urlParts['path']!==undefined && urlParts['path']!==null && urlParts['path'].length===0){
			urlParts['path'] = '/';
		}
		
		urlParts['host'] = this.cleanHost(urlParts['host']);
		urlParts['path'] = this.cleanPath(urlParts['path']);

		if(urlParts['query'] && urlParts['query'].length>0){
			urlParts['query'] = urlParts['query'].replace(/#(.+)$/, '');
			urlParts['query'] = this.cleanQuery(urlParts['query']);
		}
		
		var ports = urlParts['port'] && urlParts['port'].length ? ':'+urlParts['port'] : '';
		var query = urlParts['query'] && urlParts['query'].length ? urlParts['query'] : '';
		
		//If the last character of the URL is ?, we'll add that
		if(query.length===0 && url.match(/\?$/))
			query = '?';
		
		//url = urlParts['scheme']+'://'+urlParts['host']+ports+urlParts['path']+query;
		
		//In the URL, percent-escape all characters that are <= ASCII 32, >= 127, "#", or "%". The escapes should use uppercase hex characters.
		var url_escaped="";
		var url_unescaped=urlParts['path']+query;//unescape(url);
		for (var i=0;i<url_unescaped.length;i++)
		{
		var characterCode=url_unescaped.charCodeAt(i);
			if (characterCode<=32 || characterCode>=127)
				url_escaped+=escape(url_unescaped.substring(i,i+1)).toUpperCase();
			else if (characterCode===35)
					url_escaped+='#';
				 else if (characterCode===37)
				 		url_escaped+='%';
				 	  else url_escaped+=url_unescaped.substring(i,i+1);
		}
		
		url = urlParts['scheme']+'://'+urlParts['host']+ports+url_escaped;
		return url;
	},
	
 	cleanHost: function(host){
		host = this.recursiveDecode(host);
		host = host.toLocaleLowerCase();
	
		//Remove all leading and trailing dots
		host = host.replace(/^\.*([^\.]*)\.*$/g, '$1');
		
		//Replace consecutive dots with a single dot
		host = host.replace(/\.+/g,'.');
		host = host.replace(/\.*$/g,'');

		//If the hostname can be parsed as an IP address, it should be normalized to 4 dot-separated decimal values
		var longIp = this.myip2long(host);
		
		if(longIp.length>0)
			host = this.long2ip(longIp);
		
		host = this.hexEncode(host);

		//Fix any hex encodings in the URL
		host = host.replace(/\\\x([0-9a-fA-F]{2})/, '%$1');

		return host;
	},
	
	cleanPath:function(path){ 
		//Repeatedly URL-unescape the $path until it has no more hex-encodings
		path = this.recursiveDecode(path);
		
		//The sequences "/../" and "/./" in the path should be resolved, by replacing "/./" with "/", and removing "/../" along with the preceding path component
		var path1=path.match(/([^\/]*\/\.\.\/)/g);
		if (path1)
			path1.forEach(function(item){
				path = path.replace(/([^\/]*\/\.\.[\/|$])/, '');
			});

		path = path.replace(/\/\.\//g, '/');
		path = path.replace(/\/{2,}/g, '/');
		path = path.replace(/\\[trn]/g, '');

		//Look for a trailing /xyz/..
		if(path.match(/([^\/]*.\.{2}$)/g))
			path = path.replace(/([^\/]*.\.{2}$)/g, '');

		//Runs of consecutive slashes should be replaced with a single slash character
		path = path.replace('/\/+/g','/');
		
		if(path[0] !== '/')
			path = '/' . path;
		
		path = this.hexEncode(path);		
				
		return path;	
	},
	
	cleanQuery:function(query){
		query = this.recursiveDecode(query);
		query = this.hexEncode(query);	
		return query;
	},
	
	recursiveDecode:function(string){
		string = string.replace(/[\t\r\n]*/g, '');

		decodedString = unescape(string);
		
		while(decodedString !== string){
			string = decodedString;
			decodedString = unescape(string);
		}
	
		return string;
	},
	
	//Percent-encodes special characters with their hex values
	hexEncode:function(string){
		var stringChars = string.split(/(.)/g);
		stringChars.filter(function(item){return item!==''})

		for (var i=0;i<stringChars.length;i++) {
			c=stringChars[i];
			val = c.charCodeAt(0);
			if(val < 32 || val >= 127 || val == 32 || val == 35 || val == 37)
			{
			var hexCode="00"+val.toString(16);
				hexCode=hexCode.substring(hexCode.length-2,hexCode.length);
				stringChars[i] = '%'+hexCode;
			}
		}
		
		string = stringChars.join('');
		
		return string;
	},
	
	//Like urldecode() but doesn't do + signs
	myUrlDecode:function(url){
		return (url.replace(/%([a-zA-Z0-9]{2})/g, function(match, p1, offset, string) {
			return String.fromCharCode(parseInt(p1,16));
		}));
	},
	
	//Courtesy of http://php.net/manual/en/function.ip2long.php
	myip2long:function(ip){
	    if (!isNaN(ip)){ //if ip is numeric
	        return parseFloat(ip,10).toString();
	    } else { 
	        return parseFloat(this.ip2long(ip));
	    }	
    },

    ip2long:function(IP) {
		//  discuss at: http://phpjs.org/functions/ip2long/
		// original by: Waldo Malqui Silva
		// improved by: Victor
		//  revised by: fearphage (http://http/my.opera.com/fearphage/)
		//  revised by: Theriault
		//   example 1: ip2long('192.0.34.166');
		//   returns 1: 3221234342
		//   example 2: ip2long('0.0xABCDEF');
		//   returns 2: 11259375
		//   example 3: ip2long('255.255.255.256');
		//   returns 3: false

		var i = 0;
		// PHP allows decimal, octal, and hexadecimal IP components.
		// PHP allows between 1 (e.g. 127) to 4 (e.g 127.0.0.1) components.
		IP = IP.match(
		/^([1-9]\d*|0[0-7]*|0x[\da-f]+)(?:\.([1-9]\d*|0[0-7]*|0x[\da-f]+))?(?:\.([1-9]\d*|0[0-7]*|0x[\da-f]+))?(?:\.([1-9]\d*|0[0-7]*|0x[\da-f]+))?$/i
		); // Verify IP format.
		if (!IP) {
		return false; // Invalid format.
		}
		// Reuse IP variable for component counter.
		IP[0] = 0;
		for (i = 1; i < 5; i += 1) {
		IP[0] += !! ((IP[i] || '')
		  .length);
		IP[i] = parseInt(IP[i]) || 0;
		}
		// Continue to use IP for overflow values.
		// PHP does not allow any component to overflow.
		IP.push(256, 256, 256, 256);
		// Recalculate overflow of last component supplied to make up for missing components.
		IP[4 + IP[0]] *= Math.pow(256, 4 - IP[0]);
		if (IP[1] >= IP[5] || IP[2] >= IP[6] || IP[3] >= IP[7] || IP[4] >= IP[8]) {
		return false;
		}
		return IP[1] * (IP[0] === 1 || 16777216) + IP[2] * (IP[0] <= 2 || 65536) + IP[3] * (IP[0] <= 3 || 256) + IP[4] * 1;
	},
	long2ip:function(ip) {
		//  discuss at: http://phpjs.org/functions/long2ip/
		// original by: Waldo Malqui Silva
		//   example 1: long2ip( 3221234342 );
		//   returns 1: '192.0.34.166'

		if (!isFinite(ip))
		return false;

		return [ip >>> 24, ip >>> 16 & 0xFF, ip >>> 8 & 0xFF, ip & 0xFF].join('.');
	}
}
