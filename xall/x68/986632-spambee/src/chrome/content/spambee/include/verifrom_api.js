
var verifrom = {
    appInfo : extensionConfig.appInfo,
    console : {
        getLog:function()
        {
        },
        storeLog: function()
        {
        },
        logoutput:null,
        log: function ()
        {
            if (verifrom.appInfo.logLevel<0)
            {
                return;
            }
            if (extensionConfig.appInfo.consoleAvailable!==true)
            {
                if (typeof Components ==='undefined')
                {
                    if (typeof thisWorker !== 'undefined')
                    {
                        for (var i = 1; i < arguments.length; i++)
                        {
                            var info;
                            try {
                                if (typeof arguments[i].toString==='function')
                                    info=arguments[i].toString();
                                info=JSON.stringify(arguments[i]);
                            } catch(e) {
                                if (info===null)
                                    info="<not stringified>";
                            }
                            thisWorker.postMessage(info,{channel:"log"});
                        }
                    }
                    return;
                }

                if (!verifrom.logoutput)
                {
                    var path="/tmp";
                    var file = Components.classes["@mozilla.org/file/local;1"].createInstance(Components.interfaces.nsILocalFile);

                    file.initWithPath(path);
                    file.append("signalspam.log");

                    var outputStream = Components.classes["@mozilla.org/network/file-output-stream;1"].createInstance( Components.interfaces.nsIFileOutputStream );
                    outputStream.init( file, 0x04 | 0x10, 0664, 0 );
                    verifrom.logoutput=outputStream;
                }
                try {
                    for (var i = 1; i < arguments.length; i++)
                        verifrom.logoutput.write(""+arguments[i]+"\n", (""+arguments[i]+"\n").length);
                } catch(e)
                {

                }
            } else {
                var argArray=Array.prototype.constructor.apply(null,arguments);
                if (argArray.length>1 && typeof argArray[0]==='number')
                {
                    if (argArray[0]<=verifrom.appInfo.logLevel) {
                        argArray[0]=verifrom.appInfo.extensionCodeName+':';
                        console.log.apply(null, argArray);
                    }
                }
                else if (verifrom.appInfo.logLevel>1)
                {
                    argArray.unshift(verifrom.appInfo.extensionCodeName+':');
                    if (typeof console.log==='function')
                    console.log.apply(null, argArray);
                }
            }
        },
        error: function ()
        {
            if (verifrom.appInfo.logLevel<0)
            {
                return;
            }
            if (extensionConfig.appInfo.consoleAvailable!==true)
            {
                console.error=console.log;
                void 0;
            } else {
                var argArray=Array.prototype.constructor.apply(null,arguments);
                if (argArray.length>1 && typeof argArray[0]==='number')
                {
                    if (argArray[0]<=verifrom.appInfo.logLevel) {
                        argArray[0]=verifrom.appInfo.extensionCodeName+':';
                        console.error.apply(null, argArray);
                    }
                }
                else if (verifrom.appInfo.logLevel>1)
                {
                    argArray.unshift(verifrom.appInfo.extensionCodeName+':');
                    console.error.apply(null, argArray);
                }
            }
        }
    },
    prefs : {
        addListener: function(preferenceNames, preferenceChangeHandler) {
            for (var i=0; i<preferenceNames.length; i++)
            {
                var prefName=preferenceNames[i];
                require("sdk/simple-prefs").on(prefName, preferenceChangeHandler.bind(this,prefName));
            }
        },
        get: function(name) {
            return verifrom.preferences[name];
        }
    },
    credentials:
        {
            passwordManager:null,
            get: function(username) {
                if (!verifrom.credentials.passwordManager)
                    verifrom.credentials.passwordManager= Components.classes["@mozilla.org/login-manager;1"]
                    .getService(Components.interfaces.nsILoginManager);





                var hostname = verifrom.appInfo.credHostname;
                var formSubmitURL = 'User SignIn';  
                var httprealm = null;

                var loginInfo=null;


                var logins = verifrom.credentials.passwordManager.findLogins(hostname, formSubmitURL, httprealm);
                for (var i = 0; i < logins.length; i++) {
                    if (logins[i].username === username) {
                        loginInfo = logins[i];
                        break;
                    }
                }
                return loginInfo;
            },
            set: function(username, password) {

                verifrom.credentials.clean(username);

                if (!verifrom.credentials.passwordManager)
                    verifrom.credentials.passwordManager= Components.classes["@mozilla.org/login-manager;1"]
                        .getService(Components.interfaces.nsILoginManager);

                var nsLoginInfo = new Components.Constructor("@mozilla.org/login-manager/loginInfo;1",
                    Components.interfaces.nsILoginInfo,
                    "init");

                var oldLoginInfo=verifrom.credentials.get(username);

                var hostname = verifrom.appInfo.credHostname;
                var formSubmitURL = 'User SignIn';  
                var httprealm = null;

                var extLoginInfo = new nsLoginInfo(hostname,formSubmitURL, httprealm,
                    username, password, "username", "password");
                if (oldLoginInfo)
                    verifrom.credentials.passwordManager.modifyLogin(oldLoginInfo,extLoginInfo);
                else verifrom.credentials.passwordManager.addLogin(extLoginInfo);
            },
            delete: function(username) {
                if (!verifrom.credentials.passwordManager)
                    verifrom.credentials.passwordManager= Components.classes["@mozilla.org/login-manager;1"]
                        .getService(Components.interfaces.nsILoginManager);
                var hostname = verifrom.appInfo.credHostname;
                var formSubmitURL = 'User SignIn';  
                var httprealm = null;

                var logins = verifrom.credentials.passwordManager.findLogins(hostname, formSubmitURL, httprealm);
                for (var i = 0; i < logins.length; i++) {
                    if (logins[i].username === username) {
                        verifrom.credentials.passwordManager.removeLogin(logins[i]);
                        break;
                    }
                }
            },
            clean: function(username) {
                if (!verifrom.credentials.passwordManager)
                    verifrom.credentials.passwordManager= Components.classes["@mozilla.org/login-manager;1"]
                        .getService(Components.interfaces.nsILoginManager);
                var hostnames=["chrome://signalspam@verifrom.com","chrome://signal-spam@signal-spam.fr","chrome://signal-spam-direct@signal-spam.fr"]
                for (var j=0;j<hostnames.length;j++)
                {
                    if (hostnames[j]===verifrom.appInfo.credHostname)
                        continue;
                    var hostname = hostnames[j];
                    void 0;
                    var formSubmitURL = 'User SignIn';  
                    var httprealm = null;

                    var logins = verifrom.credentials.passwordManager.findLogins(hostname, formSubmitURL, httprealm);
                    for (var i = 0; i < logins.length; i++) {
                        if (logins[i].username === username) {
                            verifrom.credentials.passwordManager.removeLogin(logins[i]);
                            break;
                        }
                    }
                }
            }
        },
    preferences: typeof require==='function' ? require("sdk/simple-prefs").prefs : undefined,
    isMatchPages: function(url)
    {
        return true;
    },
    isDebugMode: function()
    {
        return false;
    },
    time: {
        minutesAgo: function (delay) {
            var currentTime= +new Date();
            return (currentTime-(delay*60*1000));
        },
        secondsFromNow: function (delay) {
            var currentTime= +new Date();
            return (currentTime+(delay*1000));
        },
        now: function() {
            return (+new Date());
        }
    },
    date: {
        toString: function (timeStamp) {
            function pad(number) {
                return number < 10 ? '0' + number : number;
            }

            var dateToFormat=new Date(timeStamp);
            return dateToFormat.getFullYear() +
                '-' + pad( dateToFormat.getMonth() + 1 ) +
                '-' + pad( dateToFormat.getDate() ) +
                ' ' + pad( dateToFormat.getHours() ) +
                ':' + pad( dateToFormat.getMinutes() ) +
                ':' + pad( dateToFormat.getSeconds() ) +
                '.' + (dateToFormat.getMilliseconds() / 1000).toFixed(3).slice(2, 5);
        }
    },
    insertElement: function (tagName, attributesList) {

    },
    insertCSSSheet: function (domElement, stylesheetURL) {

    },
    URLCanonicalization: {
        normalizeHostName: function(hostname)
        {
            var decodedHostname=unescape(hostname);
            while (decodedHostname !== unescape(decodedHostname))
                decodedHostname=unescape(decodedHostname);
            decodedHostname=decodedHostname.replace(/([^:]*:[\/]{1,2})(.*)/,'$2');
            decodedHostname=decodedHostname.replace(/^\.*/,'');
            decodedHostname=decodedHostname.replace(/\.*$/,'');
            decodedHostname=decodedHostname.toLowerCase();
            decodedHostname=decodedHostname.replace(/^www\./,'');
            decodedHostname=escape(decodedHostname);
            return decodedHostname;
        },

        canonicalize:function(url){
            if (/^[^\S]*([a-zA-z\-0-9]*):\/\//.test(url)===false)
                url = 'http://'+url;

            url = url.trim();
            url = url.replace(/\x{09}|\x{0d}|\x{0a}/, '');


            url = url.replace(/\\x([0-9]{2})/g, '\%$1');

            var urlParts = verifrom.parseUrl(url);

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
    },
    parseUrl: function(url) {
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
            'domain':split[3]===undefined ? "" : split[3].split('.').splice(-2,2).join('.'),
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
    getExtensionURL:function(documentName) {
        if (typeof self !== 'undefined' && self.options)
            return self.options.extensionURI+verifrom.appInfo.htmlFilesFolder+documentName;
    },
    customEvent: {
        customEventListeners:new Map(),
        oneEventListeners:new Map(),
        one:function(eventName, eventHandler) {
            if (verifrom.customEvent.oneEventListeners.has(eventName) && verifrom.customEvent.oneEventListeners.get(eventName)===eventHandler)
                return;
            verifrom.customEvent.oneEventListeners.set(eventName, eventHandler);
            $(window.top.document).one(verifrom.appInfo.extensionCodeName+eventName, eventHandler);
        },
        addEventListener:function(eventName, eventHandler) {
            if (verifrom.customEvent.customEventListeners.has(eventName) && verifrom.customEvent.customEventListeners.get(eventName)===eventHandler)
                return;
            verifrom.customEvent.customEventListeners.set(eventName, eventHandler);
            window.top.document.addEventListener(verifrom.appInfo.extensionCodeName+eventName, eventHandler);
        },
        removeEventListener:function(eventName, eventHandler) {
            verifrom.customEvent.customEventListeners.delete(eventName);
            window.top.document.removeEventListener(verifrom.appInfo.extensionCodeName+eventName, eventHandler);
        },
        dispatchEvent:function(event) {
            try {
                window.top.document.dispatchEvent(event);
            } catch(e) {
                void 0;
                void 0;
            }
        },
        CustomEvent:function(eventName, eventDetails) {
            try {
                if (eventDetails && eventDetails.detail)
                    eventDetails.detail.extensionCodeName=verifrom.appInfo.extensionCodeName;
                else {
                    eventDetails={};
                    eventDetails.detail={extensionCodeName:verifrom.appInfo.extensionCodeName};
                }
                var cloned=cloneInto(eventDetails.detail, document.defaultView);
                var returnEvent=new CustomEvent(verifrom.appInfo.extensionCodeName+eventName, {bubbles:false, detail:cloned});
                return returnEvent;
            }
            catch(e) {
                void 0;
                void 0;
            }
        }
    },
    LZString : function(){function o(o,r){if(!t[o]){t[o]={};for(var n=0;n<o.length;n++)t[o][o.charAt(n)]=n}return t[o][r]}var r=String.fromCharCode,n="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=",e="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+-$",t={},i={compressToBase64:function(o){if(null==o)return"";var r=i._compress(o,6,function(o){return n.charAt(o)});switch(r.length%4){default:case 0:return r;case 1:return r+"===";case 2:return r+"==";case 3:return r+"="}},decompressFromBase64:function(r){return null==r?"":""==r?null:i._decompress(r.length,32,function(e){return o(n,r.charAt(e))})},compressToUTF16:function(o){return null==o?"":i._compress(o,15,function(o){return r(o+32)})+" "},decompressFromUTF16:function(o){return null==o?"":""==o?null:i._decompress(o.length,16384,function(r){return o.charCodeAt(r)-32})},compressToUint8Array:function(o){for(var r=i.compress(o),n=new Uint8Array(2*r.length),e=0,t=r.length;t>e;e++){var s=r.charCodeAt(e);n[2*e]=s>>>8,n[2*e+1]=s%256}return n},decompressFromUint8Array:function(o){if(null===o||void 0===o)return i.decompress(o);for(var n=new Array(o.length/2),e=0,t=n.length;t>e;e++)n[e]=256*o[2*e]+o[2*e+1];var s=[];return n.forEach(function(o){s.push(r(o))}),i.decompress(s.join(""))},compressToEncodedURIComponent:function(o){return null==o?"":i._compress(o,6,function(o){return e.charAt(o)})},decompressFromEncodedURIComponent:function(r){return null==r?"":""==r?null:(r=r.replace(/ /g,"+"),i._decompress(r.length,32,function(n){return o(e,r.charAt(n))}))},compress:function(o){return i._compress(o,16,function(o){return r(o)})},_compress:function(o,r,n){if(null==o)return"";var e,t,i,s={},p={},u="",c="",a="",l=2,f=3,h=2,d=[],m=0,v=0;for(i=0;i<o.length;i+=1)if(u=o.charAt(i),Object.prototype.hasOwnProperty.call(s,u)||(s[u]=f++,p[u]=!0),c=a+u,Object.prototype.hasOwnProperty.call(s,c))a=c;else{if(Object.prototype.hasOwnProperty.call(p,a)){if(a.charCodeAt(0)<256){for(e=0;h>e;e++)m<<=1,v==r-1?(v=0,d.push(n(m)),m=0):v++;for(t=a.charCodeAt(0),e=0;8>e;e++)m=m<<1|1&t,v==r-1?(v=0,d.push(n(m)),m=0):v++,t>>=1}else{for(t=1,e=0;h>e;e++)m=m<<1|t,v==r-1?(v=0,d.push(n(m)),m=0):v++,t=0;for(t=a.charCodeAt(0),e=0;16>e;e++)m=m<<1|1&t,v==r-1?(v=0,d.push(n(m)),m=0):v++,t>>=1}l--,0==l&&(l=Math.pow(2,h),h++),delete p[a]}else for(t=s[a],e=0;h>e;e++)m=m<<1|1&t,v==r-1?(v=0,d.push(n(m)),m=0):v++,t>>=1;l--,0==l&&(l=Math.pow(2,h),h++),s[c]=f++,a=String(u)}if(""!==a){if(Object.prototype.hasOwnProperty.call(p,a)){if(a.charCodeAt(0)<256){for(e=0;h>e;e++)m<<=1,v==r-1?(v=0,d.push(n(m)),m=0):v++;for(t=a.charCodeAt(0),e=0;8>e;e++)m=m<<1|1&t,v==r-1?(v=0,d.push(n(m)),m=0):v++,t>>=1}else{for(t=1,e=0;h>e;e++)m=m<<1|t,v==r-1?(v=0,d.push(n(m)),m=0):v++,t=0;for(t=a.charCodeAt(0),e=0;16>e;e++)m=m<<1|1&t,v==r-1?(v=0,d.push(n(m)),m=0):v++,t>>=1}l--,0==l&&(l=Math.pow(2,h),h++),delete p[a]}else for(t=s[a],e=0;h>e;e++)m=m<<1|1&t,v==r-1?(v=0,d.push(n(m)),m=0):v++,t>>=1;l--,0==l&&(l=Math.pow(2,h),h++)}for(t=2,e=0;h>e;e++)m=m<<1|1&t,v==r-1?(v=0,d.push(n(m)),m=0):v++,t>>=1;for(;;){if(m<<=1,v==r-1){d.push(n(m));break}v++}return d.join("")},decompress:function(o){return null==o?"":""==o?null:i._decompress(o.length,32768,function(r){return o.charCodeAt(r)})},_decompress:function(o,n,e){var t,i,s,p,u,c,a,l,f=[],h=4,d=4,m=3,v="",w=[],A={val:e(0),position:n,index:1};for(i=0;3>i;i+=1)f[i]=i;for(p=0,c=Math.pow(2,2),a=1;a!=c;)u=A.val&A.position,A.position>>=1,0==A.position&&(A.position=n,A.val=e(A.index++)),p|=(u>0?1:0)*a,a<<=1;switch(t=p){case 0:for(p=0,c=Math.pow(2,8),a=1;a!=c;)u=A.val&A.position,A.position>>=1,0==A.position&&(A.position=n,A.val=e(A.index++)),p|=(u>0?1:0)*a,a<<=1;l=r(p);break;case 1:for(p=0,c=Math.pow(2,16),a=1;a!=c;)u=A.val&A.position,A.position>>=1,0==A.position&&(A.position=n,A.val=e(A.index++)),p|=(u>0?1:0)*a,a<<=1;l=r(p);break;case 2:return""}for(f[3]=l,s=l,w.push(l);;){if(A.index>o)return"";for(p=0,c=Math.pow(2,m),a=1;a!=c;)u=A.val&A.position,A.position>>=1,0==A.position&&(A.position=n,A.val=e(A.index++)),p|=(u>0?1:0)*a,a<<=1;switch(l=p){case 0:for(p=0,c=Math.pow(2,8),a=1;a!=c;)u=A.val&A.position,A.position>>=1,0==A.position&&(A.position=n,A.val=e(A.index++)),p|=(u>0?1:0)*a,a<<=1;f[d++]=r(p),l=d-1,h--;break;case 1:for(p=0,c=Math.pow(2,16),a=1;a!=c;)u=A.val&A.position,A.position>>=1,0==A.position&&(A.position=n,A.val=e(A.index++)),p|=(u>0?1:0)*a,a<<=1;f[d++]=r(p),l=d-1,h--;break;case 2:return w.join("")}if(0==h&&(h=Math.pow(2,m),m++),f[l])v=f[l];else{if(l!==d)return null;v=s+s.charAt(0)}w.push(v),f[d++]=s+v.charAt(0),h--,s=v,0==h&&(h=Math.pow(2,m),m++)}}};return i}(),
    dbStorage:
        {
            store:  (typeof require !== 'undefined') ? require("sdk/simple-storage") : null,
            getAll:function() {
                return this.store;
            },
            removeItem:function(id) {
                delete this.store[id];
            },
            remove:function(id) {
                delete this.store[id];
            },
            get:function(id) {
                var item=this.store[id];
                if (item===undefined || item===null)
                    return undefined;
                else {
                    try {
                        item=jQuery.parseJSON(item);
                        if (item && item.DBtimeout)
                        {
                            var currentTime= +new Date();
                            if (item.DBtimeout>=currentTime)
                            {
                                delete item['DBtimeout'];
                                return item;
                            }
                            else {
                                delete this.store[id];
                                return undefined;
                            }
                        }
                        return item;
                    } catch (e) {
                        return undefined;
                    }
                }
            },

            set:function(id, data, timeout) {
                try {
                    if (timeout)
                    {
                        data['DBtimeout']=timeout;
                    }
                    this.store[id]=JSON.stringify(data);
                    return true;
                } catch (e) {
                    void 0;
                    return null;
                }
            }
        },
    db:
        {
            removeItem:function(id) {
                return sessionStorage.removeItem(id);
            },
            remove:function(id) {
                return sessionStorage.removeItem(id);
            },
            get:function(id) {
                var item=sessionStorage.getItem(id);
                if (item===undefined || item===null)
                    return undefined;
                else {
                    try {
                        item=jQuery.parseJSON(item);
                        if (item && item.DBtimeout)
                        {
                            var currentTime= +new Date();
                            if (item.DBtimeout>=currentTime)
                            {
                                delete item['DBtimeout'];
                                return item;
                            }
                            else {
                                sessionStorage.removeItem(id);
                                return undefined;
                            }
                        }
                        return item;
                    } catch (e) {
                        return undefined;
                    }
                }
            },

            set:function(id, data, timeout) {
                try {
                    if (timeout)
                    {
                        data['DBtimeout']=timeout;
                    }
                    sessionStorage.setItem(id, JSON.stringify(data));
                    return true;
                } catch (e) {
                    void 0;
                    return null;
                }
            }
        },
    indexeddb : {
        openedDBs:[],
        _enabled:null,
        enabled: function() {
            if (verifrom.indexeddb._enabled!==null)
                return verifrom.indexeddb._enabled;
            try {
                let idb=indexedDB;
                verifrom.indexeddb._enabled = true;
            } catch(e) {
                verifrom.indexeddb._enabled = false;
            }
            return verifrom.indexeddb._enabled;
        },
        close: function(dbName)
        {
            if (verifrom.indexeddb.openedDBs[dbName])
            {
                try {
                    if (verifrom.indexeddb.enabled())
                        verifrom.indexeddb.openedDBs[dbName].close();
                } finally {
                    delete verifrom.indexeddb.openedDBs[dbName];
                }
            }
        },
        delete: function(dbName, onSuccessCallBack, onErrorCallBack)
        {
            if (verifrom.indexeddb.enabled()===false) {

                onSuccessCallBack();
                return;
            }
            verifrom.indexeddb.close(dbName);
            var deleteRequest=indexedDB.deleteDatabase(dbName);
            if ('function' === typeof onSuccessCallBack)
                deleteRequest.onsuccess=onSuccessCallBack;
            if ('function' === typeof onErrorCallBack)
                deleteRequest.onerror=onErrorCallBack;
        },
        openOnSuccess : function(dbName, objectStoreName, objectStoreOptions, dbVersion, onSuccessCallBack, onErrorCallBack, onUpgradeCallBack, dbEvent)
        {
            var objectStore;
            void 0;

            verifrom.indexeddb.openedDBs[dbName]=dbEvent.target.result;
            if (verifrom.indexeddb.enabled()===false) {
                onSuccessCallBack();
                return;
            }


            verifrom.indexeddb.openedDBs[dbName].onversionchange = function(event) {
                verifrom.indexeddb.close(dbName);
            };
            if(!verifrom.indexeddb.openedDBs[dbName].objectStoreNames.contains(objectStoreName)) {
                objectStore=verifrom.indexeddb.objectStore.create(verifrom.indexeddb.openedDBs[dbName], objectStoreName, objectStoreOptions);
                objectStore.transaction.oncomplete=onSuccessCallBack;
            }
            else {
                onSuccessCallBack(dbEvent);
            }
        },
        openOnUpgrade : function(dbName, objectStoreName, objectStoreOptions, dbVersion, onSuccessCallBack, onErrorCallBack, onUpgradeCallBack, dbEvent)
        {
            var thisDB = dbEvent.target.result;
            void 0;

            if(!thisDB.objectStoreNames.contains(objectStoreName)) {
                var objectStore=verifrom.indexeddb.objectStore.create(thisDB, objectStoreName, objectStoreOptions);
                objectStore.createIndex("id", "id", {unique:true});
                if (typeof onUpgradeCallBack === 'function')
                    objectStore.transaction.oncomplete=onUpgradeCallBack;
                return;
            }
            if (typeof onUpgradeCallBack === 'function')
                onUpgradeCallBack(dbEvent);

        },
        open : function(dbName, objectStoreName, objectStoreOptions, dbVersion, onSuccessCallBack, onErrorCallBack, onUpgradeCallBack)
        {
            void 0;
            if (verifrom.indexeddb.enabled()===false) {
                if (!verifrom.indexeddb.openedDBs[dbName])
                    verifrom.indexeddb.openedDBs[dbName] = {};
                verifrom.indexeddb.openedDBs[dbName][objectStoreName] = { m:new Map(), k:objectStoreOptions.keyPath};
                onSuccessCallBack();
                return;
            }
            var openRequest=verifrom.indexeddb.openedDBs[dbName] ? verifrom.indexeddb.openedDBs[dbName] : indexedDB.open(dbName, dbVersion);
            if ((typeof onSuccessCallBack !== 'function') || (typeof onErrorCallBack !== 'function'))
                throw 'VF - missing argument for opening indexedDB';

            openRequest.onupgradeneeded = verifrom.indexeddb.openOnUpgrade.bind(this, dbName, objectStoreName, objectStoreOptions, dbVersion, onSuccessCallBack, onErrorCallBack, onUpgradeCallBack);
            openRequest.onsuccess = verifrom.indexeddb.openOnSuccess.bind(this, dbName, objectStoreName, objectStoreOptions, dbVersion, onSuccessCallBack, onErrorCallBack, onUpgradeCallBack);
            openRequest.onerror = function(dbEvent) {
                onErrorCallBack(dbEvent);
            };
        },
        get : function(dbName)
        {
            return verifrom.indexeddb.openedDBs[dbName];
        },
        transaction : function(dbName, objectStores, transactionMode) {
            if (verifrom.indexeddb.openedDBs[dbName])
            {
                return verifrom.indexeddb.openedDBs[dbName].transaction(typeof objectStores==='string' ? [objectStores] : objectStores, transactionMode);
            }
            else void 0;
        },
        objectStoreStandard: {
            create: function(dbObject, objectStoreName, objectStoreOptions) {
                return dbObject.createObjectStore(objectStoreName, objectStoreOptions);
            },
            get : function(dbName, objectStoreName, options)
            {
                if (verifrom.indexeddb.enabled()===false) {
                    if (!verifrom.indexeddb.openedDBs[dbName])
                        verifrom.indexeddb.openedDBs[dbName] = {};
                    verifrom.indexeddb.openedDBs[dbName][objectStoreName] = new Map();
                    return;
                }
                if (verifrom.indexeddb.openedDBs[dbName] && verifrom.indexeddb.openedDBs[dbName].objectStoreNames.contains(objectStoreName))
                    return verifrom.indexeddb.openedDBs[dbName].transaction(objectStoreName, options?options:"readwrite").objectStore(objectStoreName);
                else throw 'DB '+dbName+' with '+objectStoreName+' is not opened';
            },
            createIndex: function(objectStore, indexName, keyId, indexOptions) {
                objectStore.createInxdex(indexName, keyId, indexOptions);
            },
            clear : function(dbName, objectStoreName, onSuccessCallBack) {
                var store=verifrom.indexeddb.objectStore.get(dbName, objectStoreName);
                store.clear().onsuccess = function (dbEvent) {
                    void 0;
                    if (typeof onSuccessCallBack === 'function')
                        onSuccessCallBack(dbEvent);
                };
            },
            operationItem: function(dbName, storeName, operation, object, onSuccessCallBack, onErrorCallBack) {
                var transaction=verifrom.indexeddb.transaction(dbName,[storeName],'readwrite');
                var addedItemsCounter=0;
                var objectStore;
                try {
                    transaction.oncomplete=function(dbEvent){
                        void 0;

                        if (object.forEach)
                        {
                            if (addedItemsCounter===object.length && typeof onSuccessCallBack==='function')
                                onSuccessCallBack();
                            else if (typeof onErrorCallBack==='function')
                                onErrorCallBack()
                            else throw 'Error in DB operation '+arguments.caller;
                        } else if (typeof onSuccessCallBack==='function')
                            onSuccessCallBack(dbEvent);
                    };
                    transaction.onerror=function(dbEvent){
                        void 0;
                        if (typeof onErrorCallBack==='function')
                            onErrorCallBack(dbEvent);
                    };
                    transaction.onabort=function(dbEvent){
                        void 0;
                        if (typeof onErrorCallBack==='function')
                            onErrorCallBack(dbEvent);
                    };
                    objectStore=transaction.objectStore(storeName);
                } catch (e) {
                    void 0;
                    if (transaction)
                        transaction.abort();
                }

                if (!object || !objectStore || !objectStore.add)
                    throw 'Store is not accessible';
                if (object.forEach)
                {
                    try {
                        object.forEach(function(item) {
                            var request=objectStore[operation](item);
                            request.onsuccess=function(dbEvent) {
                                addedItemsCounter++;
                            };
                            request.onerror=function(dbEvent) {
                                void 0;
                                transaction.abort();
                            };
                        });
                    } catch (e) {
                        void 0;
                        transaction.abort();
                    }
                }
                else {
                    try {
                        var request=objectStore[operation](object);
                        request.onsuccess=function(dbEvent) {
                            void 0;
                        };
                        request.onerror=function(dbEvent) {
                            void 0;
                            transaction.abort();
                        };
                    } catch (e) {
                        void 0;
                        transaction.abort();
                    }
                }
            },
            addItem: function(dbName, storeName, object, onSuccessCallBack, onErrorCallBack) {
                verifrom.indexeddb.objectStore.operationItem(dbName, storeName, 'add', object, onSuccessCallBack, onErrorCallBack);
            },
            putItem: function(dbName, storeName, object, onSuccessCallBack, onErrorCallBack) {
                verifrom.indexeddb.objectStore.operationItem(dbName, storeName, 'put', object, onSuccessCallBack, onErrorCallBack);
            },
            deleteItem: function(dbName, storeName, keyValue, onSuccessCallBack, onErrorCallBack) {
                var transaction;
                try {
                    var deleteRequest;
                    transaction=verifrom.indexeddb.transaction(dbName,[storeName],'readwrite');
                    transaction.oncomplete=function(dbEvent){
                        void 0;
                    };
                    transaction.onerror=function(dbEvent){
                        void 0;
                        if (typeof onErrorCallBack==='function')
                            onErrorCallBack(dbEvent);
                    };
                    transaction.onabort=function(dbEvent){
                        void 0;
                        if (typeof onErrorCallBack==='function')
                            onErrorCallBack(dbEvent);
                    };
                    var objectStore=transaction.objectStore([storeName]);

                    if (objectStore && objectStore.get && keyValue)
                    {
                        deleteRequest=objectStore.delete(keyValue);
                        deleteRequest.onsuccess=onSuccessCallBack(deleteRequest);
                        deleteRequest.onerror=onErrorCallBack;
                    }
                    else throw 'Bad store argument';
                } catch (e)
                {
                    void 0;
                    transaction.abort();
                }
            },
            getItem: function(dbName, storeName, keyValue, onSuccessCallBack, onErrorCallBack) {
                var transaction;
                try {
                    var getRequest;
                    transaction=verifrom.indexeddb.transaction(dbName,[storeName],'readonly');
                    transaction.oncomplete=function(dbEvent){
                        void 0;
                        onSuccessCallBack(getRequest);
                    };
                    transaction.onerror=function(dbEvent){
                        void 0;
                        if (typeof onErrorCallBack==='function')
                            onErrorCallBack(dbEvent);
                    };
                    transaction.onabort=function(dbEvent){
                        void 0;
                        if (typeof onErrorCallBack==='function')
                            onErrorCallBack(dbEvent);
                    };
                    var objectStore=transaction.objectStore([storeName]);

                    if (objectStore && objectStore.get && keyValue)
                    {
                        getRequest=objectStore.get(keyValue);
                        getRequest.onsuccess=function(dbEvent) {
                            void 0;
                        };
                        getRequest.onerror=onErrorCallBack;
                    }
                    else onErrorCallBack('Bad storeName :'+storeName+' for DB '+dbName);
                } catch(e) {
                    void 0;
                    transaction.abort();
                }
            },
            getAllItems: function(dbName, storeName, onSuccessCallBack, onErrorCallBack) {
                var transaction;
                try {
                    var itemsArray=[];
                    transaction=verifrom.indexeddb.transaction(dbName,[storeName],'readonly');
                    transaction.oncomplete=function(dbEvent){
                        void 0;
                        if (typeof onSuccessCallBack==='function')
                        {
                            onSuccessCallBack(itemsArray);
                        }
                    };
                    transaction.onerror=function(dbEvent){
                        void 0;
                        if (typeof onErrorCallBack==='function')
                            onErrorCallBack(dbEvent);
                    };
                    transaction.onabort=function(dbEvent){
                        void 0;
                        if (typeof onErrorCallBack==='function')
                            onErrorCallBack(dbEvent);
                    };
                    var objectStore=transaction.objectStore([storeName]);
                    var request=objectStore.mozGetAll();
                    request.onsuccess = function(dbEvent) {
                        itemsArray=dbEvent.target.result;
                    };
                } catch (e) {
                    void 0;
                    transaction.abort();
                }
            }
        },
        objectStoreFile: {
            encoder:TextEncoder ? new TextEncoder() : null,
            decoder:TextDecoder ? new TextDecoder() : null,
            files:{},
            open: function(dbObject,objectStoreName,objectStoreOptions) {
                if (verifrom.indexeddb.objectStoreFile.files[`${extensionConfig.appInfo.extensionName}${objectStoreName}`]) {
                    void 0;
                    return Promise.resolve(verifrom.indexeddb.objectStoreFile.files[`${extensionConfig.appInfo.extensionName}${objectStoreName}`]);
                } else return new Promise((resolve,reject)=>{
                    void 0;
                    let storage = OS.Path.join(OS.Constants.Path.profileDir, `${extensionConfig.appInfo.extensionName}${objectStoreName}.txt`);
                    OS.File.open(storage,{read:true,write:true,append:false})
                        .then(File=>{
                            verifrom.indexeddb.objectStoreFile.files[`${extensionConfig.appInfo.extensionName}${objectStoreName}`]=File;
                            void 0;
                            resolve(File);
                        })
                        .catch((reason)=>{
                            void 0;
                            reject(reason);
                        });
                });
            },
            create: function(dbObject,objectStoreName,objectStoreOptions) {
                void 0
                return new Promise((resolve,reject)=>{
                    if (verifrom.indexeddb.objectStoreFile.files[`${extensionConfig.appInfo.extensionName}${objectStoreName}`])
                        verifrom.indexeddb.objectStoreFile.files[`${extensionConfig.appInfo.extensionName}${objectStoreName}`].close();
                    verifrom.indexeddb.objectStoreFile.files[`${extensionConfig.appInfo.extensionName}${objectStoreName}`] = null;
                    let storage = OS.Path.join(OS.Constants.Path.profileDir, `${extensionConfig.appInfo.extensionName}${objectStoreName}.txt`);
                    OS.File.open(storage,{read:true,write:true,append:false})
                        .then(File=>{
                            verifrom.indexeddb.objectStoreFile.files[`${extensionConfig.appInfo.extensionName}${objectStoreName}`]=File;
                            resolve(File);
                        })
                        .catch((reason)=>{
                            void 0;
                            reject(reason);
                        });
                });
            },
            clear: function(dbName, objectStoreName, onSuccessCallBack) {
                if (!verifrom.indexeddb.openedDBs[dbName][objectStoreName])
                    throw new Error(`indexedDBMemory - store ${dbName}.${objectStoreName} not created`);
                verifrom.indexeddb.openedDBs[dbName][objectStoreName].m.clear();
                verifrom.indexeddb.objectStoreFile.create(null,objectStoreName, null)
                    .then((File)=>{
                        if (typeof onSuccessCallBack==="function")
                            onSuccessCallBack();
                    })
                    .catch((reason)=>{
                        void 0;
                    });
            },
            serialize: function(map) {
                return JSON.stringify([...map.entries()]);
            },
            deserialize: function(string, map) {
                return JSON.parse(string).reduce((m, [key, val])=> m.set(key, val) , map);
            },
            addItem: function(dbName, objectStoreName, object, onSuccessCallBack, onErrorCallBack) {
                if (!verifrom.indexeddb.openedDBs[dbName][objectStoreName])
                    throw new Error(`indexedDBMemory - store ${dbName}.${objectStoreName} not created`);
                let s = verifrom.indexeddb.openedDBs[dbName][objectStoreName];
                s.m.set(object[s.k],object);
                verifrom.indexeddb.objectStoreFile.open(null,objectStoreName, null)
                    .then((File)=>{
                        let content = verifrom.indexeddb.objectStoreFile.serialize(s.m)+String.fromCharCode(26);
                        let array = verifrom.indexeddb.objectStoreFile.encoder.encode(content);
                        File.setPosition(0, OS.File.POS_START)
                            .then(()=>{
                                File.write(array)
                                    .then(()=>{
                                        if (typeof onSuccessCallBack==="function")
                                            onSuccessCallBack();
                                    })
                                    .catch(reason=>{
                                        void 0;
                                        if (typeof onErrorCallBack==="function")
                                            onErrorCallBack();
                                    });
                            })
                            .catch(reason=>{
                                void 0;
                                if (typeof onErrorCallBack==="function")
                                    onErrorCallBack();
                            });
                    })
                    .catch((reason)=>{
                        void 0;
                        if (typeof onErrorCallBack==="function")
                            onErrorCallBack()
                    });
            },
            putItem: function(dbName, objectStoreName, object, onSuccessCallBack, onErrorCallBack) {
                if (!verifrom.indexeddb.openedDBs[dbName][objectStoreName])
                    throw new Error(`indexedDBMemory - store ${dbName}.${objectStoreName} not created`);
                let s = verifrom.indexeddb.openedDBs[dbName][objectStoreName];
                s.m.set(object[s.k],object);
                verifrom.indexeddb.objectStoreFile.open(null,objectStoreName, null)
                    .then((File)=>{
                        let content = verifrom.indexeddb.objectStoreFile.serialize(s.m)+String.fromCharCode(26);;
                        let array = verifrom.indexeddb.objectStoreFile.encoder.encode(content);
                        File.setPosition(0, OS.File.POS_START)
                            .then(()=>{
                                File.write(array)
                                    .then(()=>{
                                        if (typeof onSuccessCallBack==="function")
                                            onSuccessCallBack();
                                    })
                                    .catch(reason=>{
                                        void 0;
                                        if (typeof onErrorCallBack==="function")
                                            onErrorCallBack();
                                    });
                            })
                            .catch(reason=>{
                                void 0;
                                if (typeof onErrorCallBack==="function")
                                    onErrorCallBack();
                            });
                    })
                    .catch((reason)=>{
                        void 0;
                    });
            },
            deleteItem: function(dbName, objectStoreName, keyValue, onSuccessCallBack, onErrorCallBack) {
                if (!verifrom.indexeddb.openedDBs[dbName][objectStoreName])
                    throw new Error(`indexedDBMemory - store ${dbName}.${objectStoreName} not created`);
                let s = verifrom.indexeddb.openedDBs[dbName][objectStoreName];
                s.m.delete(keyValue);
                verifrom.indexeddb.objectStoreFile.open(null,objectStoreName, null)
                    .then((File)=>{
                        let content = verifrom.indexeddb.objectStoreFile.serialize(s.m)+String.fromCharCode(26);
                        let array = verifrom.indexeddb.objectStoreFile.encoder.encode(content);
                        File.setPosition(0, OS.File.POS_START)
                            .then(()=>{
                                File.write(array)
                                    .then(()=>{
                                        if (typeof onSuccessCallBack==="function")
                                            onSuccessCallBack();
                                    })
                                    .catch(reason=>{
                                        void 0;
                                        if (typeof onErrorCallBack==="function")
                                            onErrorCallBack();
                                    });
                            })
                            .catch(reason=>{
                                void 0;
                                if (typeof onErrorCallBack==="function")
                                    onErrorCallBack();
                            });
                    })
                    .catch((reason)=>{
                        void 0;
                        if (typeof onErrorCallBack==="function")
                            onErrorCallBack();
                    });
            },
            getItem: function(dbName, objectStoreName, keyValue, onSuccessCallBack, onErrorCallBack) {
                if (!verifrom.indexeddb.openedDBs[dbName][objectStoreName])
                    throw new Error(`indexedDBMemory - store ${dbName}.${objectStoreName} not created`);
                let s = verifrom.indexeddb.openedDBs[dbName][objectStoreName];
                if (s.m.size===0) {
                    verifrom.indexeddb.objectStoreFile.open(null,objectStoreName, null)
                        .then((File)=>{
                            File.setPosition(0, OS.File.POS_START)
                                .then(()=>{
                                    File.read()
                                        .then((array)=>{
                                            array = array.slice(0,array.findIndex((c)=>{return c===26}));
                                            let content = verifrom.indexeddb.objectStoreFile.decoder.decode(array);
                                            verifrom.indexeddb.objectStoreFile.deserialize(content,s.m);
                                            if (typeof onSuccessCallBack==="function")
                                                onSuccessCallBack({result:s.m.get(keyValue)});
                                        })
                                        .catch(reason=>{
                                            void 0;
                                            if (typeof onErrorCallBack==="function")
                                                onErrorCallBack();
                                        });
                                })
                                .catch(reason=>{
                                    void 0;
                                    if (typeof onErrorCallBack==="function")
                                        onErrorCallBack();
                                });
                        })
                        .catch((reason)=>{
                            void 0;
                            if (typeof onErrorCallBack==="function")
                                onErrorCallBack();
                        });
                } else {
                    if (typeof onSuccessCallBack==="function")
                        onSuccessCallBack({result:s.m.get(keyValue)});
                }
            },
            getAllItems: function(dbName, objectStoreName, onSuccessCallBack, onErrorCallBack) {
                if (!verifrom.indexeddb.openedDBs[dbName][objectStoreName])
                    throw new Error(`indexedDBMemory - store ${dbName}.${objectStoreName} not created`);
                let s = verifrom.indexeddb.openedDBs[dbName][objectStoreName];
                if (s.m.size===0) {
                    verifrom.indexeddb.objectStoreFile.open(null,objectStoreName, null)
                        .then((File)=>{
                            File.setPosition(0, OS.File.POS_START)
                                .then(()=>{
                                    File.read()
                                        .then((array)=>{
                                            array = array.slice(0,array.findIndex((c)=>{return c===26}));
                                            let content = verifrom.indexeddb.objectStoreFile.decoder.decode(array);
                                            verifrom.indexeddb.objectStoreFile.deserialize(content,s.m);

                                            const i = s.m.values();
                                            const a = new Array();
                                            for (let item of i) {
                                                a.push(item);
                                            }
                                            if (typeof onSuccessCallBack==="function")
                                                onSuccessCallBack(a);

                                        })
                                        .catch(reason=>{
                                            void 0;
                                            if (typeof onErrorCallBack==="function")
                                                onErrorCallBack();
                                        });
                                })
                                .catch(reason=>{
                                    void 0;
                                    if (typeof onErrorCallBack==="function")
                                        onErrorCallBack();
                                });
                        })
                        .catch((reason)=>{
                            void 0;
                            if (typeof onErrorCallBack==="function")
                                onErrorCallBack();
                        });
                } else {
                    const i = s.m.values();
                    const a = new Array();
                    for (let item of i) {
                        a.push(item);
                    }
                    if (typeof onSuccessCallBack==="function")
                        onSuccessCallBack(a);
                }
            }
        },
        objectStoreMemory : {
            create: function(dbObject,objectStoreName,objectStoreOptions) {
                throw new Error("Not implemented");
            },
            clear: function(dbName, objectStoreName, onSuccessCallBack) {
                if (!verifrom.indexeddb.openedDBs[dbName][objectStoreName])
                    throw new Error(`indexedDBMemory - store ${dbName}.${objectStoreName} not created`);
                verifrom.indexeddb.openedDBs[dbName][objectStoreName].m.clear();
                if (typeof onSuccessCallBack==="function")
                    onSuccessCallBack();
            },
            addItem: function(dbName, objectStoreName, object, onSuccessCallBack, onErrorCallBack) {
                if (!verifrom.indexeddb.openedDBs[dbName][objectStoreName])
                    throw new Error(`indexedDBMemory - store ${dbName}.${objectStoreName} not created`);
                let s = verifrom.indexeddb.openedDBs[dbName][objectStoreName];
                s.m.set(object[s.k],object);
                if (typeof onSuccessCallBack==="function")
                    onSuccessCallBack(object);
            },
            putItem: function(dbName, objectStoreName, object, onSuccessCallBack, onErrorCallBack) {
                if (!verifrom.indexeddb.openedDBs[dbName][objectStoreName])
                    throw new Error(`indexedDBMemory - store ${dbName}.${objectStoreName} not created`);
                let s = verifrom.indexeddb.openedDBs[dbName][objectStoreName];
                s.m.set(object[s.k],object);
                if (typeof onSuccessCallBack==="function")
                    onSuccessCallBack(object);
            },
            deleteItem: function(dbName, objectStoreName, keyValue, onSuccessCallBack, onErrorCallBack) {
                if (!verifrom.indexeddb.openedDBs[dbName][objectStoreName])
                    throw new Error(`indexedDBMemory - store ${dbName}.${objectStoreName} not created`);
                let s = verifrom.indexeddb.openedDBs[dbName][objectStoreName];
                if (typeof onSuccessCallBack==="function")
                    s.m.delete(keyValue);
            },
            getItem: function(dbName, objectStoreName, keyValue, onSuccessCallBack, onErrorCallBack) {
                if (!verifrom.indexeddb.openedDBs[dbName][objectStoreName])
                    throw new Error(`indexedDBMemory - store ${dbName}.${objectStoreName} not created`);
                let s = verifrom.indexeddb.openedDBs[dbName][objectStoreName];
                if (typeof onSuccessCallBack==="function")
                    onSuccessCallBack({result:s.m.get(keyValue)});
            },
            getAllItems: function(dbName, objectStoreName, onSuccessCallBack, onErrorCallBack) {
                if (!verifrom.indexeddb.openedDBs[dbName][objectStoreName])
                    throw new Error(`indexedDBMemory - store ${dbName}.${objectStoreName} not created`);
                let s = verifrom.indexeddb.openedDBs[dbName][objectStoreName];
                const i = s.m.values();
                const a = new Array();
                for (let item of i) {
                    a.push(item);
                }
                if (typeof onSuccessCallBack==="function")
                    onSuccessCallBack(a);
            }
        },
        objectStore : null
    },
    browser: {
        name : (typeof jQuery !== 'undefined') ? $.browser.name : null
    },

    os: {
        name : (typeof jQuery !== 'undefined') ? $.os.name : null
    },
    dom: {
        location:{
            href: (typeof window !== 'undefined') ? window.location.href : null
        },
        isIframe:function() {
            return (typeof window !== 'undefined') ? (window.self !== window.top) : null;
        },
        createHTMLDocument: function(title, htmlContent)
        {
            var doc = document.implementation.createHTMLDocument(title);
            var range=doc.createRange();
            range.selectNode(doc.body);
            var parser=new DOMParser;
            var newdoc=parser.parseFromString(htmlContent, "text/html");
            var newNode=doc.importNode(newdoc.documentElement,true);
            doc.replaceChild(newNode,doc.documentElement)
            return doc;
        },
        replaceHTMLDocument: function(doc, htmlContent)
        {
            var range=doc.createRange();
            range.selectNode(doc.body);
            var parser=new DOMParser;
            var newdoc=parser.parseFromString(htmlContent, "text/html");
            var newNode=doc.importNode(newdoc.documentElement,true);
            doc.replaceChild(newNode,doc.documentElement)
            return doc;
        }
    },
    JSON: {
        parse:function(string) {
            return jQuery.parseJSON(string);
        }
    },
    Request:function(params) {
        try {
            var newReq=new Object();
            newReq.url=params.url;
            newReq.timeout=params.timeout;
            newReq.oncomplete=params.onComplete;
            newReq.contentType=params.contentType;
            newReq.headers=params.headers;
            newReq.content=params.content;
            newReq.context=params.context;
            newReq.get=function() {
                var req = new XMLHttpRequest();

                if (params.content)
                {
                    this.url=this.url+"?"+Object
                            .keys(params.content)
                            .map(function(key){
                                return key+"="+encodeURIComponent(params.content[key])
                            })
                            .join("&");
                }
                req.open("GET", this.url);
                if (this.contentType)
                    req.setRequestHeader("Content-type", this.contentType);
                if (typeof this.headers!=='undefined') {
                    Object.keys(this.headers).forEach(function(key){
                       req.setRequestHeader(key, this.headers[key]);
                    }.bind(this));
                }
                if (typeof this.timeout!=='undefined')
                    req.timeout = this.timeout;
                req.onreadystatechange = function (event) {
                    if (event.originalTarget.readyState == 4) {
                        if (this.context)
                            this.oncomplete(event.originalTarget).call(this.context);
                        else this.oncomplete(event.originalTarget);
                    }
                }.bind(this);
                req.send();
            };
            newReq.post=function() {
                var req = new XMLHttpRequest();
                req.open("POST", this.url);
                if (typeof this.contentType!=='undefined')
                    req.setRequestHeader("Content-type", this.contentType);
                if (typeof this.headers!=='undefined') {
                    Object.keys(this.headers).forEach(function(key){
                        req.setRequestHeader(key, this.headers[key]);
                    }.bind(this));
                }
                if (typeof this.timeout!=='undefined')
                    req.timeout = this.timeout;
                req.onreadystatechange = function (event) {
                    if (event.originalTarget.readyState == 4) {
                        this.oncomplete(event.originalTarget);
                    }
                }.bind(this);
                req.send(this.content);
            };
            newReq.delete=function() {
                var req = new XMLHttpRequest();
                req.open("DELETE", this.url);
                if (typeof this.contentType!=='undefined')
                    req.setRequestHeader("Content-type", this.contentType);
                if (typeof this.headers!=='undefined') {
                    Object.keys(this.headers).forEach(function(key){
                        req.setRequestHeader(key, this.headers[key]);
                    }.bind(this));
                }
                if (typeof this.timeout!=='undefined')
                    req.timeout = this.timeout;
                req.onreadystatechange = function (event) {
                    if (event.originalTarget.readyState == 4) {
                        this.oncomplete(event.originalTarget);
                    }
                }.bind(this);
                req.send(this.content);
            };
            return newReq;
        } catch (err)
        {
            void 0;
        }
    },
    request: {
        queue:function() {
            this.requestsQueue=[];
            this.nbRequestsQueued=0;
            this.nbError=0;
            this.nbSuccess=0;
            this.callback=undefined;
        },
        get:function(paramObject) {
            if (typeof jQuery !== 'undefined') {
                if (!paramObject.url || !paramObject.onSuccess || !paramObject.onFailure || !paramObject.onFailure || !paramObject.contentType || !paramObject.responseDataType)
                    throw "Missing argument";
                jQuery.support.cors = true;
                $.ajax({url:paramObject.url, context:paramObject.context, success:paramObject.onSuccess, error:paramObject.onFailure, contentType:paramObject.contentType, type:"get", dataType:paramObject.responseDataType, crossDomain:true, headers:paramObject.additionalRequestHeaders ?  paramObject.additionalRequestHeaders : {}});
            } else {
                var request=verifrom.Request;
                request({
                    url:paramObject.url,
                    timeout:paramObject.timeout,
                    contentType:paramObject.contentType,
                    headers:paramObject.additionalRequestHeaders,
                    onComplete:function (result) {
                        if (result.status>=200 && result.status<300) {
                            if (this.responseDataType==='json')
                            {
                                try {
                                    result.data=JSON.parse(result.responseText);
                                } catch(e)
                                {
                                    if (typeof this.onFailure==='function')
                                    {
                                        if (this.context)
                                            this.onFailure.call(this.context, res.status);
                                        else this.onFailure(res.status);
                                    }
                                }
                            } else result.data=result.response;
                            if (typeof this.onSuccess==='function') {
                                if (this.context)
                                    this.onSuccess.call(this.context, result.data);
                                else this.onSuccess(result.data);
                            }
                        } else {
                            if (typeof this.onFailure==='function')
                            {
                                if (this.context)
                                    this.onFailure.call(this.context, res.status);
                                else this.onFailure(res.status);
                            }
                        }
                    }.bind(paramObject),
                }).get();
            }
        }
    },
    setTimeout:function(callback, timer) {
        return window.setTimeout(callback, timer);
    },
    clearTimeout:function(timeoutID) {
        if(typeof timeoutID === "number")
            window.clearTimeout(timeoutID);
    },
    openURL:function(optionObject) {
        if (optionObject && optionObject.url && optionObject.where)
            self.port.emit("openWindow",optionObject);
    },
    worker: function(worker,sharedWorkerDisabled) {

            void 0;
            if (sharedWorkerDisabled===undefined) {
                sharedWorkerDisabled = false;
                try {
                    try {
                        let w=new SharedWorker("");
                        w=null;
                    } catch(e) {
                        sharedWorkerDisabled = /insecure/i.test(e.message);
                    }
                    void 0;
                } catch(e) {
                    void 0;
                }
            }
            this._sharedWorkerDisabled = sharedWorkerDisabled;
            if (sharedWorkerDisabled) {
                void 0;
                worker = typeof opener !== "undefined" ? opener || window : window;
                if (typeof worker==='object' && typeof worker.postMessage==='function')
                    this.worker={port:worker};
                else throw new Error("Missing worker for worker instance");
                void 0;
            } else {
                if (typeof worker==='string')
                {
                    try {
                        this.worker=new Worker(worker);
                        this.worker.port = this.worker;
                        if (typeof this.worker.port.start==="function") 
                            this.worker.port.start();
                    } catch(e) {
                        void 0;
                    }
                }
                else if (typeof worker==='object' && typeof worker.postMessage==='function')
                    this.worker={port:worker};
                else throw new Error("Missing uri or worker for worker instance");
            }
            var text = "";
            var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
            for( var i=0; i < 16; i++ )
                text += possible.charAt(Math.floor(Math.random() * possible.length));
            this._id=text;
            void 0;
            this.messageChannels={};
            this.messageChannelsOnce={};
            this.messageListener = function(event) {
                if (event && event.origin) {
                    void 0;
                }
                if (event && event.data && event.data.source===this._id)
                {
                    void 0;
                    return;
                }
                if (event && event.data && event.data.channel)
                {
                    if (typeof this.messageChannelsOnce[event.data.channel]==='function')
                    {
                        var handler=this.messageChannelsOnce[event.data.channel];
                        handler(event.data.payload);
                    } else if (typeof this.messageChannels[event.data.channel]==='function') {
                        this.messageChannels[event.data.channel](event.data.payload);
                    } else {
                        void 0;
                    }
                } else {
                    void 0;
                    throw new Error("worker onmessage : invalid event");
                }
            }.bind(this);
            if (!this.worker) {
                void 0
                void 0;
                return;
            }
            if (sharedWorkerDisabled===true)
                this.worker.port.addEventListener("message",this.messageListener,false);
            else this.worker.port.onmessage = this.messageListener;
    },
    debugapi:{
        sendEvent:function(){},
        sendException:function(){}
    },
    notifications : {
        enabled:false,
        checkEnabled:function() {
            if (!Notification)
            {
                verifrom.notifications.enabled=false;
                return false;
            }
            else if (Notification.permission === "granted")
            {
                verifrom.notifications.enabled=true;
                return true;
            }
            else if (Notification.permission !== 'denied') {
                Notification.requestPermission(function (permission) {
                    if (!('permission' in Notification)) {
                        Notification.permission = permission;
                    }
                    if (permission === "granted") {
                        verifrom.notifications.enabled = true;
                        return true;
                    }
                });
            }
        },
        display:function(msg) {
            if (!verifrom.notifications.enabled)
            {
                void 0;
                return;
            }
            try {
                var id=extensionConfig.appInfo.extensionName+(msg.id || "Message");
                var n={
                    "tag": id,
                    "icon": msg.iconUrl ? msg.iconUrl : undefined,
                    "body": msg.message ? msg.message : ""
                };
                var notification = new Notification(msg.title ? msg.title : extensionConfig.appInfo.extensionName, n);
                if (typeof msg.onClicked==='function') {
                    notification.onclick=msg.onClicked;
                }
                if (typeof msg.onClosed==='function') {
                    notification.onclosed=msg.onClosed;
                }
                void 0;
            } catch (e) {
                void 0;
            }
        }
    },
    notifier:
        {
            createdNotifiers:{},
            divElement:undefined,
            show: function(notifierParams)
            {
                if (typeof jQuery === 'undefined')
                    return;

                function insertNotifier(params)
                {
                    divElement=document.createElement ("div");
                    divElement.setAttribute('class','verifromNotifier-'+params.position);
                    divElement.setAttribute('style','width: '+params.width);

                    var ntfElement=document.createElement('div');
                    ntfElement.setAttribute('class','verifromNotifier-ntf');
                    ntfElement.setAttribute('style','display: block; width: '+params.width+';');
                    ntfElement.setAttribute('width',params.width);

                    var divContent=document.createElement('div');
                    divContent.setAttribute('class','verifromNotifier-ntf-content-theme-'+(params.theme ? params.theme : 'default'));
                    divContent.setAttribute('style','cursor:default');

                    var divClose=document.createElement('div');
                    divClose.setAttribute('class','verifromNotifier-close-theme-'+(params.theme ? params.theme : 'default'));

                    var divHeader=document.createElement('div');
                    divHeader.setAttribute('class','verifromNotifier-header-theme-'+(params.theme ? params.theme : 'default'));

                    var divTitle=document.createElement('div');
                    divTitle.setAttribute('class','verifromNotifier-title-theme-'+(params.theme ? params.theme : 'default'));
                    divTitle.textContent=params.title;

                    var divBody=document.createElement('div');
                    divBody.setAttribute('class','verifromNotifier-body-theme-'+(params.theme ? params.theme : 'default'));
                    divBody.textContent=params.body;

                    divHeader.appendChild(divTitle);
                    divContent.appendChild(divClose);
                    divContent.appendChild(divHeader);
                    divContent.appendChild(divBody);
                    ntfElement.appendChild(divContent);
                    divElement.appendChild(ntfElement);
                    document.body.insertBefore(divElement, document.body.firstChild);
                };

                function updateNotifier(params)
                {
                    divElement=document.querySelector('.verifromNotifier-'+params.position);
                    divElement.setAttribute('style','width: '+params.width);

                    var ntfElement=document.querySelector('.verifromNotifier-ntf','.verifromNotifier-'+params.position);
                    ntfElement.setAttribute('style','display: block; width: '+params.width+';');
                    ntfElement.setAttribute('width',params.width);
                    var divContent=ntfElement.childNodes[0];

                    divContent.setAttribute('class','verifromNotifier-ntf-content-theme-'+(params.theme ? params.theme : 'default'));

                    var divClose=divContent.childNodes[0];
                    divClose.setAttribute('class','verifromNotifier-close-theme-'+(params.theme ? params.theme : 'default'));

                    var divHeader=divContent.childNodes[1];
                    divHeader.setAttribute('class','verifromNotifier-header-theme-'+(params.theme ? params.theme : 'default'));

                    var divBody=divContent.childNodes[2];
                    divBody.setAttribute('class','verifromNotifier-body-theme-'+(params.theme ? params.theme : 'default'));
                    divBody.textContent=params.body;

                    var divTitle=divHeader.childNodes[0];
                    divTitle.setAttribute('class','verifromNotifier-title-theme-'+(params.theme ? params.theme : 'default'));
                    divTitle.textContent=params.title;
                }

                if (!(notifierParams.position in this.createdNotifiers))
                    this.createdNotifiers[notifierParams.position]=insertNotifier(notifierParams);
                else updateNotifier(notifierParams);

                if (!notifierParams.close)
                {
                    $('.verifromNotifier-close-theme-'+(notifierParams.theme ? notifierParams.theme : 'default')).css('display','none');
                }
                else {
                    $('.verifromNotifier-close-theme-'+(notifierParams.theme ? notifierParams.theme : 'default')).css('display','block');
                    $('.verifromNotifier-close-theme-'+(notifierParams.theme ? notifierParams.theme : 'default')).css("background", "url('https://www.verifrom.com/extension/images/close.png') no-repeat");

                }
                if (!notifierParams.sticky)
                {
                    verifrom.setTimeout(function() {$('.verifromNotifier-'+notifierParams.position).fadeOut(500);}, (notifierParams.fadeAfter ? notifierParams.fadeAfter : 10000));
                }
                $('.verifromNotifier-'+notifierParams.position).fadeIn(500);
                if (notifierParams.closeWhenClicked && notifierParams.closeWhenClicked===true)
                {
                    $('.verifromNotifier-'+notifierParams.position).click(function() {
                        $('.verifromNotifier-'+notifierParams.position).fadeOut(500);
                    });
                }

            }
        }
};

verifrom.worker.prototype = {
    loaded:function() {
        return this.worker !== null;
    },
    addListener:function(channel,callback) {
        if (typeof callback !== 'function')
            throw "callback not a function :"+typeof callback;
        this.messageChannels[channel]=callback;
    },
    on:function(channel,callback) {
        if (typeof callback !== 'function')
            throw "verifrom.worker.on callback not a function :"+typeof callback;
        this.messageChannels[channel]=callback;
    },
    addListenerOnce:function(channel,callback) {
        if (typeof callback !== 'function')
            throw "callback not a function :"+typeof callback;
        this.messageChannelsOnce[channel]=callback;
    },
    removeAllListeners:function() {
        for (channel in this.messageChannels) {
            if (channel!=="connect")
                this.removeListener(channel);
        }
    },
    removeListener:function(channel) {
        if (this.messageChannels && typeof this.messageChannels[channel]==='function')
        {
            delete this.messageChannels[channel];
            void 0;
        }
        else void 0;
    },
    postMessage:function(message,options) {
        try {
            this.worker.port.postMessage({"source":this._id,"channel":options.channel,"payload":message});
        } catch(e) {
            void 0;
        }
    },
    emit:function (channel,message) {
        try {
            this.worker.port.postMessage({"source":this._id, "channel":channel, "payload":message});
        } catch(e)
        {
            void 0;
        }
    },
    close:function (shutdown) {
        if (!shutdown) {
            void 0;
            return;
        }
        try {
            this.removeAllListeners();
            if (this._sharedWorkerDisabled===true) {
                this.worker.port.removeEventListener("message",this.messageListener);
            }
            else if (this.worker.port.onmessage === this.messageListener)
                this.worker.port.onmessage = null;
            if ("function"===typeof this.worker.port.close && this._sharedWorkerDisabled!==true && spambee_verifromSafeBrowsing.worker.port instanceof Window === false)
                this.worker.port.close();
            if ("function"===typeof this.worker.port.terminate)
                this.worker.port.terminate();
        } catch(e) {
            void 0;
        }
    }
};

verifrom.request.queue.prototype = {
    addRequest:function(requestParams)
    {
        var params=$.extend(true,{},requestParams);
        var onSuccess=function(data, textStatus, jqXHR) {
            this.nbRequestsQueued--;
            this.nbSuccess++;
            this.done();
        };
        var onError=function(jqXHR, textStatus, errorThrown) {
            void 0;
            this.nbRequestsQueued--;
            this.nbError++;
            this.done();
        };
        params.context=this;
        var jqxhr=$.ajax(params);
        this.requestsQueue.push(jqxhr);
        this.nbRequestsQueued++;
        jqxhr.done(onSuccess);
        jqxhr.fail(onError);
    },
    done:function(callback)
    {
        if ("undefined" !== typeof callback)
            this.callback=callback;
        if (this.callback && this.nbRequestsQueued===0)
            this.callback(this.requestsQueue);
    }
};

verifrom.notifications.checkEnabled();
if (verifrom.indexeddb.enabled() !== true && (!OS || !OS.File) && typeof SharedWorker !== "undefined")
    var {TextDecoder, TextEncoder, OS} = Cu.import("resource://gre/modules/osfile.jsm", {});
verifrom.indexeddb.objectStore = verifrom.indexeddb.enabled() ? verifrom.indexeddb.objectStoreStandard : (typeof OS.File !== "undefined" ? verifrom.indexeddb.objectStoreFile : verifrom.indexeddb.objectStoreMemory);