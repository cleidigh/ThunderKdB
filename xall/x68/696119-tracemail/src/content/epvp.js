function LOG(text) {
	var t = "";
	if (typeof text == 'object') {
		for (var a in text) {
			t += a+': ';
			try { t += text[a]; } catch (e) { t += 'err'; }
			t += "\n";
		}
	} else {
		t = text;
	}
	var consoleService = Components.classes["@mozilla.org/consoleservice;1"].getService(Components.interfaces.nsIConsoleService);
	consoleService.logStringMessage(t);
}

function dump(arr,level) {
	var dumped_text = "";
	if(!level) level = 0;

	//The padding given at the beginning of the line.
	var level_padding = "";
	for(var j=0;j<level+1;j++) level_padding += "    ";

	if(typeof(arr) == 'object') { //Array/Hashes/Objects
		for(var item in arr) {
			var value = arr[item];

			if(typeof(value) == 'object') { //If it is an array,
				dumped_text += level_padding + "'" + item + "' ...\n";
				dumped_text += dump(value,level+1);
			} else {
				dumped_text += level_padding + "'" + item + "' => \"" + value + "\"\n";
			}
		}
	} else { //Stings/Chars/Numbers etc.
		dumped_text = "===>"+arr+"<===("+typeof(arr)+")";
	}
	return dumped_text;
}

function decode(input) {
	return input.replace(/=([A-F0-9]{2})/g, function (match, p1, offset, string) {
		try {
			return decodeURIComponent('%'+p1);
		} catch (e) {
			return match;
		}
	});
}

function EPVP( client ) {

	var _epvp = this;

	this.client = client;

	this.init = function() {

		this.tracerouter = new Tracerouter( this );
		this.processObserver = new ProcessObserver_2( this );

		var Prefs = Components.classes["@mozilla.org/preferences-service;1"]
			.getService(Components.interfaces.nsIPrefService);
		Prefs = Prefs.getBranch("extensions.emailtraceroutevisualizer.");

		try {
			var firstrun = Prefs.getBoolPref("firstrun");
			if (firstrun)
			{
				window.setTimeout(function(){
					_epvp.client.openTab("http://www.privacyinternational.org/");
				}, 1500);
			}
		} catch(e) {
			window.setTimeout(function(){
				_epvp.client.openTab("http://www.privacyinternational.org/");
			}, 1500);
		} finally {
			Prefs.setBoolPref("firstrun",false);
		}
	};

	this.visualize = function( content, id ) {
		if (!this.tracerouter) {
			this.init();
		}

		////
		//var em = Components.classes["@mozilla.org/extensions/manager;1"].
		//         getService(Components.interfaces.nsIExtensionManager);
		var MY_ID = "epvp@pet-portal.eu";
		//var cache = em.getInstallLocation(MY_ID).getItemFile(MY_ID, "content/visualize/"+"visualizer_"+id+".html");
		var cache = initFile(MY_ID, "content/visualize/"+"visualizer_"+id+".html");
		////

		////- ////---130203 átkerült ide a dolog, mert felesleges elvégezni a köv. műveleteket, ha meglévő eredményeket használunk.
		var cache_attachment = initFile(MY_ID, "content/visualize/"+"visualizer_"+id+"_attachment.html");
		var cache_attachment_hideip = initFile(MY_ID, "content/visualize/"+"visualizer_"+id+"_attachment_hideip.html");

		if (_epvp.reply) {
			if (cache_attachment.exists() && cache_attachment_hideip.exists() && cache.exists()) {
				var response = confirm('The route visualization of this message was generated earlier. Would you like to reply with the cached result?');

				if ( response )
				{
					////---130302
					_epvp.routeips = readIPsFromHTML(cache);
					////---
					_epvp.client.openTab('chrome://epvp/content/visualize/visualizer_'+id+'.html',1);
					var hideip = confirm("Would you like to hide IP addresses?");
					if (hideip) {
						ReplyAndAttach(_epvp, 'chrome://epvp/content/visualize/visualizer_'+id+'_attachment_hideip.html');
					} else {
						ReplyAndAttach(_epvp, 'chrome://epvp/content/visualize/visualizer_'+id+'_attachment.html');
					}
					return;
				}
			}
		} else {
			if ( cache.exists() ) {
				var response = confirm('The route visualization of this message was generated earlier. Would you like to display the result?');

				if ( response )
				{
					////---130302
					_epvp.routeips = readIPsFromHTML(cache);
					////---
					_epvp.client.openTab('chrome://epvp/content/visualize/visualizer_'+id+'.html',1);
					return;
				}
			}
		}
		////- ////---

		this.messageid = id;

		////---130203 a számításigényes műveletek előtt nyitjuk meg a lapot, hogy ne essen kétségbe a felhasználó.
		_epvp.client.openTab('chrome://epvp/content/visualize/plw.html',1);
		////---

		//split content to header and other content
		var pieces = content.split(/\r?\n\r?\n/);
		var header = pieces[0];

		//split header to lines
		var headerlines = header.split(/\r?\n/);

		//regexp that match received ips
		var ipregexp = /Received:.*[\[ ](\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})[\] ].*/;

		//regexp that match X-originating-ip
		var xorigregexp = /X-Originating-IP:.*\[(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})\].*/;

		//regexp that match X-EPVP-Route-Point
		var xroutepointregexp = /X-EPVP-Route-Point:.*\[(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})\].*/;

		//regexp that match address of sender
		////-
		var senderregexp = /From:.*?[\<\s]([a-zA-Z\.\_\-0-9=]+\@[a-zA-Z\.\_\-0-9]+\.[a-z]{1,4})\>?.*/;
		////-

		//regexp that match address of receiver
		var receiverregexp = /^((Delivered-To)|(To)):.*?[\<\s]([a-zA-Z\.\_\-0-9=]+\@[a-zA-Z\.\_\-0-9]+\.[a-z]{1,4})\>?.*/;

		//regexp that match date of email
		////-
		//var dateregexp = /Date:.*, (.*) \+?.*/;
		var dateregexp = /Date:(.*, ?)?([^\+\-]*\d\d:\d\d:\d\d)/;
		////-

		var ips = new Array();

		//match x-route-point
		for (var i in headerlines)
		{
			var matches = xroutepointregexp.exec(headerlines[i]);
			if (! matches) continue;
			ips.push(new Ip({
				"ip": matches[1],
				"remark": "Routepoint"
			}));
		}

		//match x-originating
		if (ips.length == 0) {
			for (var i in headerlines)
			{
				var matches = xorigregexp.exec(headerlines[i]);
				if (! matches) continue;
				ips.push(new Ip({
					"ip": matches[1],
					"remark": "Sender"
				}));
				break;
			}
		}

		//match ips
		for (var i in headerlines)
		{
			var matches = ipregexp.exec(headerlines[i]);
			if (! matches) continue;
			ips.push(new Ip({
				"ip":matches[1]
			}));
		}

		//match sender
		for (var i in headerlines)
		{
			var line = headerlines[i];
			var line1 = headerlines[parseInt(i)+1];
			if (typeof line1 != 'undefined') line += ' '+line1;
			var matches = senderregexp.exec(decode(line));
			if (! matches) continue;
			_epvp.sender = matches[1];
			break;
		}

		//match receiver
		for (var i in headerlines)
		{
			var line = headerlines[i];
			var line1 = headerlines[parseInt(i)+1];
			if (typeof line1 != 'undefined') line += ' '+line1;
			var matches = receiverregexp.exec(decode(line));
			if (! matches) continue;
			_epvp.receiver = matches[4];
			if (matches[2]) break;
		}

		//match date
		for (var i in headerlines)
		{
			var matches = dateregexp.exec(decode(headerlines[i]));
			if (! matches) continue;
			_epvp.date = matches[2];
			break;
		}

		this.routeips = ips;

		////
		/*if(mutex==true)
		{
			alert("Be patient! Other traceroute is running!");
			return;
		}*/
		mutex=true;
		////

		//traceroute
		this.tracerouter.detect( _epvp.smtp , _epvp );

//		alert('Please wait!');
		//_epvp.client.openTab('chrome://epvp/content/visualize/plw.html',1);
	};

	/* ez nincs használatban...
    this.save = function() {
        var nsIFilePicker = Components.interfaces.nsIFilePicker;
        var fp = Components.classes["@mozilla.org/filepicker;1"].createInstance(nsIFilePicker);
        fp.init(window, "Select a file to the result of visualizer", nsIFilePicker.modeSave);

        fp.appendFilters(nsIFilePicker.filterHTML);

        var res = fp.show();
        if (res == nsIFilePicker.returnOK){
          var thefile = fp.file;
        alert(thefile);
        }
    }
    */

	this.init();

	return this;
}

//PT: Ezt a fuggvenyt PT irta
////-
function createVisualizerHTML(routeobject, id, maildata, isAttachment, hideIP)
////-
{
	// the extension's id from install.rdf
//	var newname ="visulizer"+Math.random()*10000000000000000+".html";
	var newname = "visualizer_"+id+(isAttachment ? "_attachment" : "")+(hideIP ? "_hideip" : "")+".html";
	var MY_ID = "epvp@pet-portal.eu";
	////-
	var websiteUrl = "tracemail.eu";
	var offeredname = maildata.date+'_'+maildata.sender;
	////-

	//referenacia szerzese az eredeti allomanyra
	////
	//var em = Components.classes["@mozilla.org/extensions/manager;1"].
	//         getService(Components.interfaces.nsIExtensionManager);
	// the path may use forward slash ("/") as the delimiter
	// returns nsIFile for the extension's install.rdf
	//var originalfile = em.getInstallLocation(MY_ID).getItemFile(MY_ID, "content/visualize/visualizer.html");
	var originalfile = initFile(MY_ID, "content/visualize/visualizer.html");
	var d3File = initFile(MY_ID, "content/visualize/d3.min.txt");
	var topojsonFile = initFile(MY_ID, "content/visualize/topojson.min.txt");
	var datamapsFile = initFile(MY_ID, "content/visualize/datamaps.world.hires.min.txt");
	////

	//az eredeti fajl tartalmanak felolvasasa
	var is = Components.classes["@mozilla.org/network/file-input-stream;1"]
		.createInstance( Components.interfaces.nsIFileInputStream );
	is.init(originalfile, 0x01, 00004, null);
	var sis = Components.classes["@mozilla.org/scriptableinputstream;1"]
		.createInstance( Components.interfaces.nsIScriptableInputStream );
	sis.init( is );
	var originalcontent = sis.read( sis.available() );

	//d3 olvasása
	var is1 = Components.classes["@mozilla.org/network/file-input-stream;1"]
		.createInstance( Components.interfaces.nsIFileInputStream );
	is1.init(d3File, 0x01, 00004, null);
	var sis1 = Components.classes["@mozilla.org/scriptableinputstream;1"]
		.createInstance( Components.interfaces.nsIScriptableInputStream );
	sis1.init( is1 );
	var d3Content = sis1.read( sis1.available() );

    //topojson olvasása
    var is2 = Components.classes["@mozilla.org/network/file-input-stream;1"]
        .createInstance( Components.interfaces.nsIFileInputStream );
    is2.init(topojsonFile, 0x01, 00004, null);
    var sis2 = Components.classes["@mozilla.org/scriptableinputstream;1"]
        .createInstance( Components.interfaces.nsIScriptableInputStream );
    sis2.init( is2 );
    var topojsonContent = sis2.read( sis2.available() );

    //datamaps olvasása
    var is3 = Components.classes["@mozilla.org/network/file-input-stream;1"]
        .createInstance( Components.interfaces.nsIFileInputStream );
    is3.init(datamapsFile, 0x01, 00004, null);
    var sis3 = Components.classes["@mozilla.org/scriptableinputstream;1"]
        .createInstance( Components.interfaces.nsIScriptableInputStream );
    sis3.init( is3 );
    var datamapsContent = sis3.read( sis3.available() );

	//az eredeti fajl masolasa es igy az uj letrehozasa
	try {
		originalfile.copyTo(null,newname);
	}
	catch (e){
		////
		//var temp = em.getInstallLocation(MY_ID).getItemFile(MY_ID, "content/visualize/"+newname);
		var temp = initFile(MY_ID, "content/visualize/"+newname);
		////
		temp.remove(false);

		originalfile.copyTo(null,newname);
	}
	////
	//var newfile = em.getInstallLocation(MY_ID).getItemFile(MY_ID, "content/visualize/"+newname);
	var newfile = initFile(MY_ID, "content/visualize/"+newname);
	////
	//alert(newfile.exists());

	//a tartalom modositasa
//	var newcontent=originalcontent;
//	newcontent.replace('//initdatas',"init("+JSON.stringify(routeobject)+");")
//	var newcontent=originalcontent+"init(eval("+routeobject.toSource()+"));</script></body></html>";
	var newcontent=
		"<!DOCTYPE html>\n" +
		"<html lang=\"en\">" +
		"<script>" + d3Content + "</script>\n" +
        "<script>" + topojsonContent + "</script>\n" +
        "<script>" + datamapsContent + "</script>\n" +
		"<script>" + "RouteItems = " + JSON.stringify(routeobject) + ";</script>\n" +
		originalcontent +
		"RouteItems = " + JSON.stringify(routeobject) +
		"; init(); </script></body></html>";

	offeredname = offeredname.replace('@','_at_');
	offeredname = offeredname.replace(/\./g,'_dot_');
	offeredname = offeredname.replace(/[ \:]/g,'_');
	////-
	newcontent = newcontent
		.replace(/#filename#/g, offeredname)
		.replace(/#websiteurl#/g, websiteUrl)
		.replace(/#email\.date#/g, maildata.date)
		.replace(/#email\.sender#/g, maildata.sender)
		.replace(/#email\.receiver#/g, maildata.receiver);
	if (isAttachment) {
		//cleaning
		newcontent = newcontent.replace(/<!-- Save result start -->[\s\S]*<!-- Save result end -->/, "");
	}
	if (hideIP) {
		newcontent = newcontent.replace(/(\d{1,3}\.\d{1,3})\.\d{1,3}\.\d{1,3}/g, "$1.x.x");
	}
	////-

	//a modositott tartalom kiirasa
	var outputStream = Components.classes["@mozilla.org/network/file-output-stream;1"]
		.createInstance( Components.interfaces.nsIFileOutputStream );
	outputStream.init( newfile, 0x04 | 0x08 | 0x20, 420, 0 );
	var result = outputStream.write( newcontent, newcontent.length );
	outputStream.close();

	mutex=false;

	return 'chrome://epvp/content/visualize/'+newname;
//	return 'file://'+newfile.path;
}

function ProcessObserver_2( epvp )
{
	this.observe = function(subject, topic, data) {
		//route object
		var route = new Array();

		var tracerouteRegexp = /(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})/;

		if (subject != undefined)
		{
			var MY_ID = 'epvp@pet-portal.eu';
			////
			//var output = Components.classes["@mozilla.org/extensions/manager;1"].getService(Components.interfaces.nsIExtensionManager).getInstallLocation(MY_ID).getItemFile(MY_ID, "traceroute");
			var output = initFile(MY_ID, "traceroute_" + epvp.messageid);
			////

			// open an input stream from file
			var istream = Components.classes["@mozilla.org/network/file-input-stream;1"].createInstance(Components.interfaces.nsIFileInputStream);
			try {
				istream.init(output, 0x01, 0444, 0);
			} catch (e) {
				return this;
			}
			istream.QueryInterface(Components.interfaces.nsILineInputStream);

			// read lines into array
			var line = {},
				lines = [],
				hasmore;
			do {
				hasmore = istream.readLine(line);
				lines.push(line.value);
			} while (hasmore);

			istream.close();

			////-
			try {
				output.remove(false);
			} catch (e) {}
			////-

			//parsing ips
			var ips = [];

			for (var i = 2; i < lines.length; i++)
			{
				var traceip = tracerouteRegexp.exec( lines[i] );
				if ( traceip ) {
					////-
					/*
                    ips.push( new Ip({
                        "ip": traceip[1]
                    }) );
                    */
					// we need the reverse of the list
					ips.unshift( new Ip({
						"ip": traceip[1]
					}) );
					////-
				}
			}

			ips = epvp.routeips.concat(ips);
			epvp.routeips = ips;
		}

		////-
		var maildata = {
			date: epvp.date,
			sender: epvp.sender,
			receiver: epvp.receiver
		};
		//htmlurl
		var htmlurl = createVisualizerHTML(ips, epvp.messageid, maildata);
		//create attachment also
		var htmlurl_attachment = createVisualizerHTML(ips, epvp.messageid, maildata, true);
		var htmlurl_attachment_hideip = createVisualizerHTML(ips, epvp.messageid, maildata, true, true);

		epvp.client.openTab(htmlurl);

		if (epvp.reply) {
			var hideip = confirm("Would you like to hide IP addresses?");
			if (hideip) {
				ReplyAndAttach(epvp, htmlurl_attachment_hideip);
			} else {
				ReplyAndAttach(epvp, htmlurl_attachment);
			}
		}
		////-

	};

	return this;
}

////-
function ReplyAndAttach(epvp, htmlurl) {
	var aData = Components.classes["@mozilla.org/messengercompose/attachment;1"]
		.createInstance(Components.interfaces.nsIMsgAttachment);
	aData.url = htmlurl;
	aData.name = "TracEmail:" + epvp.sender + "~" + epvp.smtp + ".html";
	aData.urlCharset = "utf-8";
	//aData.contentType = "text/html";

	var fields = Cc["@mozilla.org/messengercompose/composefields;1"]
		.createInstance(Ci.nsIMsgCompFields);
	fields.addAttachment(aData);

	var msgHdr = epvp.msgHdr;
	var uri = msgHdr.folder.getUriForMsg(msgHdr);

	var params = Cc["@mozilla.org/messengercompose/composeparams;1"]
		.createInstance(Ci.nsIMsgComposeParams);
	params.composeFields = fields;
	params.format = Components.interfaces.nsIMsgCompFormat.Default;
	params.type = Components.interfaces.nsIMsgCompType.ReplyToSender;
	params.originalMsgURI = uri;

	var MsgCompose =
		Components.classes["@mozilla.org/messengercompose;1"]
			.getService(Components.interfaces.nsIMsgComposeService);
	MsgCompose.OpenComposeWindowWithParams(null, params);
}
////-

////---130302
function readIPsFromHTML(hfile) {
	//a fajl tartalmanak beolvasasa
	var is = Components.classes["@mozilla.org/network/file-input-stream;1"]
		.createInstance(Components.interfaces.nsIFileInputStream);
	is.init(hfile, 0x01, 00004, null);
	var sis = Components.classes["@mozilla.org/scriptableinputstream;1"]
		.createInstance(Components.interfaces.nsIScriptableInputStream);
	sis.init(is);
	var content = sis.read(sis.available());

	try {
		var data = content.match(/RouteItems = (\[[^;]+\]);/)[1];
		var ips = JSON.parse(data);
	} catch (e) {
		return [];
	}
	return ips;
}
////---