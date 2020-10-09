var verifromURLCanonicalization={

	parse_url:function(url) {
    var splitRegExp = new RegExp(
        '^' +
            '(?:' +
            '([^:/?#.]+)' +                         
            ':)?' +
            '(?://' +
            '(?:([^/?#]*)@)?' +                     
            '([\\s\\w\\d\\-\\u0100-\\uffff.%]*)' +     
            '(?::([0-9]+))?' +                      
            ')?' +
            '([^?#]+)?' +                           
            '(?:\\?([^#]*))?' +                     
            '(?:#(.*))?' +                          
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

	},

	canonicalize:function(url){
		if (/^[^\S]*([a-zA-z\-0-9]*):\/\//.test(url)===false)
			url = 'http://'+url;

		url = url.trim();
		url = url.replace(/\x{09}|\x{0d}|\x{0a}/, '');


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

		if(query.length===0 && url.match(/\?$/))
			query = '?';


		var url_escaped="";
		var url_unescaped=urlParts['path']+query;
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

		host = host.replace(/^\.*([^\.]*)\.*$/g, '$1');

		host = host.replace(/\.+/g,'.');
		host = host.replace(/\.*$/g,'');

		var longIp = this.myip2long(host);

				if(longIp.length>0)
			host = this.long2ip(longIp);

				host = this.hexEncode(host);

		host = host.replace(/\\\x([0-9a-fA-F]{2})/, '%$1');

		return host;
	},

		cleanPath:function(path){ 
		path = this.recursiveDecode(path);

		var path1=path.match(/([^\/]*\/\.\.\/)/g);
		if (path1)
			path1.forEach(function(item){
				path = path.replace(/([^\/]*\/\.\.[\/|$])/, '');
			});

		path = path.replace(/\/\.\//g, '/');
		path = path.replace(/\/{2,}/g, '/');
		path = path.replace(/\\[trn]/g, '');

		if(path.match(/([^\/]*.\.{2}$)/g))
			path = path.replace(/([^\/]*.\.{2}$)/g, '');

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

	myUrlDecode:function(url){
		return (url.replace(/%([a-zA-Z0-9]{2})/g, function(match, p1, offset, string) {
			return String.fromCharCode(parseInt(p1,16));
		}));
	},

	myip2long:function(ip){
	    if (!isNaN(ip)){ 
	        return parseFloat(ip,10).toString();
	    } else { 
	        return parseFloat(this.ip2long(ip));
	    }	
    },

    ip2long:function(IP) {

		var i = 0;
		IP = IP.match(
		/^([1-9]\d*|0[0-7]*|0x[\da-f]+)(?:\.([1-9]\d*|0[0-7]*|0x[\da-f]+))?(?:\.([1-9]\d*|0[0-7]*|0x[\da-f]+))?(?:\.([1-9]\d*|0[0-7]*|0x[\da-f]+))?$/i
		); 
		if (!IP) {
		return false; 
		}
		IP[0] = 0;
		for (i = 1; i < 5; i += 1) {
		IP[0] += !! ((IP[i] || '')
		  .length);
		IP[i] = parseInt(IP[i]) || 0;
		}
		IP.push(256, 256, 256, 256);
		IP[4 + IP[0]] *= Math.pow(256, 4 - IP[0]);
		if (IP[1] >= IP[5] || IP[2] >= IP[6] || IP[3] >= IP[7] || IP[4] >= IP[8]) {
		return false;
		}
		return IP[1] * (IP[0] === 1 || 16777216) + IP[2] * (IP[0] <= 2 || 65536) + IP[3] * (IP[0] <= 3 || 256) + IP[4] * 1;
	},
	long2ip:function(ip) {

		if (!isFinite(ip))
		return false;

		return [ip >>> 24, ip >>> 16 & 0xFF, ip >>> 8 & 0xFF, ip & 0xFF].join('.');
	}
}
