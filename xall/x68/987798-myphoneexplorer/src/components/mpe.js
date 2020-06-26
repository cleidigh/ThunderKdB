const MPE_ADDON_VERSION = "2.0.25";
Components.utils.import("resource://gre/modules/FileUtils.jsm");
var startup_done = false;

// Hilfsfunktionen

// Quelle: http://developer.mozilla.org/en/docs/Code_snippets:File_I/O
//         http://developer.mozilla.org/en/docs/Writing_textual_data

	function myDefObserver()
	{
	  this.register();
	}
	
	myDefObserver.prototype = {
	  mpe: null,
	  
	  observe: function(subject, topic, data) {
		this.unregister();
		this.mpe.startup_done = true;
		Components.utils.reportError('calendar-startup-done catched!');
	  },
	  register: function() {
		var observerService = Components.classes["@mozilla.org/observer-service;1"].getService(Components.interfaces.nsIObserverService);
		observerService.addObserver(this, "calendar-startup-done", false);
		Components.utils.reportError('calendar-startup-done observer registred');
	  },
	  unregister: function() {
		var observerService = Components.classes["@mozilla.org/observer-service;1"].getService(Components.interfaces.nsIObserverService);
		observerService.removeObserver(this, "calendar-startup-done");
		Components.utils.reportError('calendar-startup-done observer un registred');
	  }
	}
	
	var obs = new myDefObserver();
	obs.mpe = this;

function WriteFile(path,data)
{
	try {
		var converter = Components.classes["@mozilla.org/intl/scriptableunicodeconverter"].createInstance(Components.interfaces.nsIScriptableUnicodeConverter);
		converter.charset = "UTF-8";
		//var file = Components.classes["@mozilla.org/file/local;1"].createInstance(Components.interfaces.nsILocalFile);
		//file.initWithPath(path);
		var file = new FileUtils.File(path);
		var foStream = Components.classes["@mozilla.org/network/file-output-stream;1"].createInstance(Components.interfaces.nsIFileOutputStream);
		foStream.init(file, 0x02 | 0x08 | 0x20, 0o0664, 0); // write, create, truncate
		var chunk = converter.ConvertFromUnicode(data);
		if(chunk !=null) foStream.write(chunk, chunk.length);
		foStream.close();
	}
	catch(ex) {
		Components.utils.reportError('Error writing ' + path + '\n' + (chunk != null ? chunk.length : '-') + ' Bytes: ' + ex);
	}
}

// Quelle: http://developer.mozilla.org/en/docs/Code_snippets:File_I/O
//         http://developer.mozilla.org/en/docs/Reading_textual_data
function ReadFile(path)
{
	var lines = new Array;
	var counter = 0;
	
	try {
		var converter = Components.classes["@mozilla.org/intl/scriptableunicodeconverter"].createInstance(Components.interfaces.nsIScriptableUnicodeConverter);
		converter.charset = "UTF-8";
		//var file = Components.classes["@mozilla.org/file/local;1"].createInstance(Components.interfaces.nsILocalFile);
		//file.initWithPath(path);
		var file = new FileUtils.File(path);
		var fiStream = Components.classes["@mozilla.org/network/file-input-stream;1"].createInstance(Components.interfaces.nsIFileInputStream);
		fiStream.init(file, -1, -1, 0);
		
		var lis = fiStream.QueryInterface(Components.interfaces.nsILineInputStream);
		var lineData = {};
		var cont;
		do {
			cont = lis.readLine(lineData);
			lines[counter] = converter.ConvertToUnicode(lineData.value);
			counter++;
		} while (cont);
		fiStream.close();
	}
	catch(ex) {
			Components.utils.reportError('Error reading ' + path + ': ' + ex);
	}
	
	return(lines);
}

//Quelle: http://developer.mozilla.org/en/docs/Accessing_the_Windows_Registry_Using_XPCOM
function RegRead(subkey,valuename)
{
	var out = '';

	try {
		var wrk = Components.classes["@mozilla.org/windows-registry-key;1"].createInstance(Components.interfaces.nsIWindowsRegKey);
		wrk.open(wrk.ROOT_KEY_CURRENT_USER,subkey,wrk.ACCESS_READ);
		out = wrk.readStringValue(valuename);
		wrk.close();
	}
	catch(ex) {
	// 	Components.utils.reportError('Error reading HKCU\\' + subkey + ' : ' + valuename + ' : ' + ex);
	}
	return(out);	
}

// UUID-Generator inspired by http://www.scriptsearch.com/cgi-bin/jump.cgi?ID=3530

function CreateUUID()
{
	function returnBase(num, base){
		var convert = ['0','1','2','3','4','5','6','7','8','9',
		               'A','B','C','D','E','F','G','H','I','J','K','L','M',
		               'N','O','P','Q','R','S','T','U','V','W','X','Y','Z'];

		var output;

    		if(num < base) {
			output = convert[num];
    		} else {
        		var MSD = '' + Math.floor(num / base);
        		var LSD = num - MSD*base;
        		if(MSD >= base) {
				output = returnBase(MSD,base) + convert[LSD];
			} else {
				output = convert[MSD] + convert[LSD];
			}
    		}
    		return output;
	}

	function getIntegerBits(val,start,end)
	{
		var base16 = returnBase(val,16);
		var quadArray = new Array();
		var quadString = '';
		var i;

		for(i = 0;i < base16.length;i++) {
			quadArray.push(base16.substring(i,i+1));	
		}

		for(i = Math.floor(start/4);i <= Math.floor(end/4);i++) {
			if(!quadArray[i] || quadArray[i] == '') {
				quadString += '0';
			} else {
				quadString += quadArray[i];
			}
		}
		return quadString;
	}	

	function timeInMs(d)
	{
		var ms_per_second = 1000; 
		var ms_per_minute = 60000; 
		var ms_per_hour   = 3600000; 
		var ms_per_day    = 86400000; 
		var ms_per_month  = 2073600000; 
		var ms_per_year   = 756864000000;

		return Math.abs((d.getUTCFullYear() * ms_per_year) + (d.getUTCMonth() * ms_per_month) + 
		       (d.getUTCDate() * ms_per_day) + (d.getUTCHours() * ms_per_hour) + 
	               (d.getUTCMinutes() * ms_per_minute) + (d.getUTCSeconds() * ms_per_second) + d.getUTCMilliseconds());
	}

	function randrange(min,max)
	{
		var num = Math.round(Math.random() * max);

		if(num < min) { 
			num = min;
		} else if(num > max) {
			num = max;
		}

		return num;
	}

	var dg = timeInMs(new Date(1582, 10, 15, 0, 0, 0, 0));
	var dc = timeInMs(new Date());
	var t = dc - dg;
	var h = '-';
	var tl = getIntegerBits(t,0,31);
	var tm = getIntegerBits(t,32,47);
	var thv = getIntegerBits(t,48,59) + '1';
	var csar = getIntegerBits(randrange(0,4095),0,7);
	var csl = getIntegerBits(randrange(0,4095),0,7);

	var n = getIntegerBits(randrange(0,8191),0,7) + getIntegerBits(randrange(0,8191),8,15) + 
			getIntegerBits(randrange(0,8191),0,7) + getIntegerBits(randrange(0,8191),8,15) + 
			getIntegerBits(randrange(0,8191),0,15);

	return tl + h + tm + h + thv + h + csar + csl + h + n; 
}
	
function GetPref(prefname,defaultvalue)
{
	var prefvalue = defaultvalue;

	try {
		var prefs = Components.classes["@mozilla.org/preferences-service;1"].
                		getService(Components.interfaces.nsIPrefBranch);

		var preftype = prefs.getPrefType(prefname);

		if(preftype == prefs.PREF_STRING) {
			prefvalue = prefs.getCharPref(prefname);
		}
		else if(preftype == prefs.PREF_BOOL) {
			prefvalue = prefs.getBoolPref(prefname);
		}
		else if(preftype == prefs.PREF_INT) {
			prefvalue = prefs.getIntPref(prefname);
		}
	}
	catch (ex) {
		// Components.utils.reportError(ex);
	}

	return prefvalue;
}

function RemoveWS(str)
{
	return str.replace(/\s*/g,'');
}
	
function EncodeQP(str)
{
	str = escape(str); //aus sonderzeichen wird %00, usw...
	str = str.replace(/%([0-7]{1}[A-F0-9]{1})/g, "=$1"); // %00 in =00 umwandeln
	str = unescape(str); // Unicode-Zeichen wieder zurückverwandeln (z.B.: %u5498)
	return str;
}
	
function DecodeQP(str)
{
	str = str.replace(/\=/g, "%");  // aus =00 wird %00
	str = unescape(str); // aus %00 wird zeichen
	return str;
}

function AddV(tag, value)
{
	var out = '';
	if (value != null) {
		value = value + '';
		if(value.length) {
			out = ";" + tag + ":" + EncodeQP(value);
		}
	}

	return(out);
}

function GetV(tag, line)
{
	var pos = line.indexOf(tag + ':');

	if(pos > -1) {
		var str = line.slice(pos+tag.length+1);
		pos = str.indexOf(';');

		if(pos == -1) pos = str.indexOf("\r");

		if(pos > -1) {
			str = DecodeQP(str.substring(0,pos));
			if(str == '') str = null;
			return str;
		}
	}

	return null;
}

function SplitV(line)
{
	var tag;
	var value;
	var pos;
	var aarray = new Object();

	var v = line.split(';');

	for(var i = 0;i < v.length;i++) {
		pos = v[i].indexOf(':');
		if(pos <= 0) continue;

		tag = v[i].substring(0,pos);
		value = DecodeQP(v[i].substring(pos+1));
		if(value == '') value = null;

		aarray[tag] = value;
	}

	return aarray;
}

function Value(tag, aarray)
{
	if(tag in aarray)
		return aarray[tag];
	else
		return null;
}

function ValueNN(tag, aarray)
{
	var value = Value(tag,aarray);

	return (value != null) ? value : '';
}

function GetUUID(ab,card)
{
	var uuid;

	try {
		uuid = card.getProperty("MyPhoneExplorerUUID",null);

		if(uuid == null || !uuid.match(/\w{8}-\w{4}-\w{4}-\w{4}-\w{12}/)) {
			uuid = card.getProperty("PhoneticLastName",null);
			if(uuid == null || !uuid.match(/\w{8}-\w{4}-\w{4}-\w{4}-\w{12}/)) {
				uuid = CreateUUID();
			}
			else {
				card.setProperty("PhoneticLastName",null); // migrate
			}
			card.setProperty("MyPhoneExplorerUUID",uuid);
			ab.modifyCard(card);
		}
	}
	catch(ex) {
		uuid = card.phoneticLastName;

		if(uuid == null || !uuid.match(/\w{8}-\w{4}-\w{4}-\w{4}-\w{12}/)) {
			uuid = CreateUUID();
			card.phoneticLastName = uuid;
			SaveCard(ab,card);
		}
	}

	return uuid;
}

function SetUUID(ab,card,uuid)
{
	try {
		card.setProperty("MyPhoneExplorerUUID",uuid);
	}
	catch(ex) {
		card.phoneticLastName = uuid;
	}

	if(ab != null) SaveCard(ab,card);
}

function GetProp(card,prop)
{
	try {
		return card.getProperty(prop,null);
	}
	catch(ex) {
		switch(prop) {
			case "PhoneticLastName":
				return card.phoneticLastName;
			case "PhoneticFirstName":
				return card.phoneticFirstName;
			case "LastModifiedDate":
				return card.lastModifiedDate;
			case "FirstName":
				return card.firstName;
		    case "LastName":
				return card.lastName;
			case "DisplayName":
				return card.displayName;
			case "PrimaryEmail":
				return card.primaryEmail;
			case "SecondEmail":
				return card.secondEmail;
			case "WorkPhone":
				return card.workPhone;
			case "CellularNumber":
				return card.cellularNumber;
			case "HomePhone":
				return card.homePhone;
			case "FaxNumber":
				return card.faxNumber;
			case "PagerNumber":
				return card.pagerNumber;
			case "HomeAddress":
				return card.homeAddress;
			case "HomeAddress2":
				return card.homeAddress2;
			case "HomeCity":
				return card.homeCity;
			case "HomeState":
				return card.homeState;
			case "HomeZipCode":
				return card.homeZipCode;
			case "HomeCountry":
				return card.homeCountry;
			case "WorkAddress":
				return card.workAddress;
			case "WorkAddress2":
				return card.workAddress2;
			case "WorkCity":
				return card.workCity;
			case "WorkState":
				return card.workState;
			case "WorkZipCode":
				return card.workZipCode;
			case "WorkCountry":
				return card.workCountry;
			case "WebPage1":
				return card.webPage1;
			case "WebPage2":
				return card.webPage2;
			case "JobTitle":
				return card.jobTitle;
			case "Company":
				return card.company;
			case "BirthYear":
				return card.birthYear;
			case "BirthMonth":
				return card.birthMonth;
			case "BirthDay":
				return card.birthDay;
			case "Notes":
				return card.notes;
			default:
				return null;
		}
	}
}

function SetProp(card,prop,value)
{
	try {
		card.setProperty(prop,value);
	}
	catch(ex) {
		switch(prop) {
			case "PhoneticLastName":
				card.phoneticLastName = value;
				break;
			case "PhoneticFirstName":
				card.phoneticFirstName = value;
				break;
			case "LastModifiedDate":
				card.lastModifiedDate;
				break;
			case "FirstName":
				card.firstName = value;
				break;
		       	case "LastName":
				card.lastName = value;
				break;
			case "DisplayName":
				card.displayName = value;
				break;
			case "PrimaryEmail":
				card.primaryEmail = value;
				break;
			case "SecondEmail":
				card.secondEmail = value;
				break;
			case "WorkPhone":
				card.workPhone = value;
				break;
			case "CellularNumber":
				card.cellularNumber = value;
				break;
			case "HomePhone":
				card.homePhone = value;
				break;
			case "FaxNumber":
				card.faxNumber = value;
				break;
			case "PagerNumber":
				card.pagerNumber = value;
				break;
			case "HomeAddress":
				card.homeAddress = value;
				break;
			case "HomeAddress2":
				card.homeAddress2 = value;
				break;
			case "HomeCity":
				card.homeCity = value;
				break;
			case "HomeState":
				card.homeState = value;
				break;
			case "HomeZipCode":
				card.homeZipCode = value;
				break;
			case "HomeCountry":
				card.homeCountry = value;
				break;
			case "WorkAddress":
				card.workAddress = value;
				break;
			case "WorkAddress2":
				card.workAddress2 = value;
				break;
			case "WorkCity":
				card.workCity = value;
				break;
			case "WorkState":
				card.workState = value;
				break;
			case "WorkZipCode":
				card.workZipCode = value;
				break;
			case "WorkCountry":
				card.workCountry = value;
				break;
			case "WebPage1":
				card.webPage1 = value;
				break;
			case "WebPage2":
				card.webPage2 = value;
				break;
			case "JobTitle":
				card.jobTitle = value;
				break;
			case "Company":
				card.company = value;
				break;
			case "BirthYear":
				card.birthYear = value;
				break;
			case "BirthMonth":
				card.birthMonth = value;
				break;
			case "BirthDay":
				card.birthDay = value;
				break;
			case "Notes":
				card.notes = value;
				break;
		}
	}
}

/*
 * copied from addressbook
 */

function getPhotosDir() {
  var file = Components.classes["@mozilla.org/file/directory_service;1"]
                       .getService(Components.interfaces.nsIProperties)
                       .get("ProfD", Components.interfaces.nsIFile);
  // Get the Photos directory
  file.append("Photos");
  if (!file.exists() || !file.isDirectory())
    file.create(Components.interfaces.nsIFile.DIRECTORY_TYPE, 0o0777);
  return file;
}

function makePhotoFile(aDir, aExtension) {
  var filename, newFile;
  // Find a random filename for the photo that doesn't exist yet
  do {
    filename = new String(Math.random()).replace("0.", "") + aExtension;
    newFile = aDir.clone();
    newFile.append(filename);
  } while (newFile.exists());
  return newFile;
}

/*
 *
 */

function getPhotoFile(Card)
{
	try {
		var photoname = Card.getProperty("PhotoName",null);

		if(photoname != null) {
			var photodir = getPhotosDir();
			var photofile = photodir.clone();
			photofile.append(photoname);

			if(photofile.exists()) {
				return photofile;
			}
		}
	}
	catch(ex) {}

	return null;
}

function getPhoto(Card)
{
	var photofile = getPhotoFile(Card);

	if(photofile != null) {
		return photofile.path;
	}
	else {
		return null;
	}
}

function setPhoto(Card,filename)
{
	try {
		var photoname = Card.getProperty("PhotoName",null);
		var phototype = Card.getProperty("PhotoType",null);
		var photodir = getPhotosDir();
		var photofile = null;
		var oldfoto = null;

		if(photoname != null) {
			photofile = photodir.clone();
			photofile.append(photoname);

			if(photofile.exists()) {
				oldfoto = photofile.path;
			}
		}

		if(filename == null || filename == '' || filename == oldfoto) return;
	
		var ext = filename.substring(filename.lastIndexOf('.'));
		ext = ext.toLowerCase();

		if(photofile != null && photofile.exists()) {
			photofile.remove(false);
			Card.setProperty("PhotoName",null);
			Card.setProperty("PhotoURI",null);
			Card.setProperty("PhotoType",null);
		}
	
		if(filename != "DELETE") {
			if(ext != '.jpg' && ext != '.gif' && ext != '.png') return;

			//var newphoto = Components.classes["@mozilla.org/file/local;1"].createInstance(Components.interfaces.nsILocalFile);
			//newphoto.initWithPath(filename);

			var newphoto = new FileUtils.File(filename);
			
			if(newphoto.exists()) {
				photofile = makePhotoFile(photodir,ext);
				photoname = photofile.leafName;
				newphoto.copyTo(photodir,photoname);

				if(photofile.exists()) {
					var photouri = Components.classes["@mozilla.org/network/io-service;1"]
        	           		               .getService(Components.interfaces.nsIIOService)
                	   		               .newFileURI(photofile).spec; 

					Card.setProperty("PhotoName",photoname);
					Card.setProperty("PhotoURI",photouri);
					Card.setProperty("PhotoType","file");
				}
			}
		}
	}
	catch(ex) {}
}

function EnsureDecimalTS(num)
{
	if(num != null && num != 0 && num.length < 9) {
		return parseInt(num,16);
	}
	else {
		return num;
	}
}

function CardToLine(Card, AB, ABook)
{
	var out = '';

	if(ABook != null) {
		out = 'ABKID:' + EncodeQP(ABook) + ';';
	}

	Card = Card.QueryInterface(Components.interfaces.nsIAbCard);

	out += 'CARID:' + EncodeQP(GetUUID(AB,Card)) +
	       ';LEDIT:' + EnsureDecimalTS(GetProp(Card,"LastModifiedDate")) +
	       AddV('FNAME', GetProp(Card,"FirstName")) +
	       AddV('LNAME', GetProp(Card,"LastName"))  +
	       AddV('DNAME', GetProp(Card,"DisplayName")) +
	       AddV('NNAME', GetProp(Card,"NickName")) +
	       AddV('PMAIL', GetProp(Card,"PrimaryEmail")) +
	       AddV('SMAIL', GetProp(Card,"SecondEmail")) +
	       AddV('TWORK', GetProp(Card,"WorkPhone")) +
	       AddV('TCELL', GetProp(Card,"CellularNumber")) +
	       AddV('THOME', GetProp(Card,"HomePhone")) +
	       AddV('TEFAX', GetProp(Card,"FaxNumber")) +
	       AddV('TPAGE', GetProp(Card,"PagerNumber")) +
	       AddV('HSTR1', GetProp(Card,"HomeAddress")) +
	       AddV('HSTR2', GetProp(Card,"HomeAddress2")) +
	       AddV('HCITY', GetProp(Card,"HomeCity")) +
	       AddV('HSTAT', GetProp(Card,"HomeState")) +
	       AddV('HZIPC', GetProp(Card,"HomeZipCode")) +
	       AddV('HCOUN', GetProp(Card,"HomeCountry")) +
	       AddV('WSTR1', GetProp(Card,"WorkAddress")) +
	       AddV('WSTR2', GetProp(Card,"WorkAddress2")) +
	       AddV('WCITY', GetProp(Card,"WorkCity")) +
	       AddV('WSTAT', GetProp(Card,"WorkState")) +
	       AddV('WZIPC', GetProp(Card,"WorkZipCode")) +
	       AddV('WCOUN', GetProp(Card,"WorkCountry")) +
	       AddV('WURL1', GetProp(Card,"WebPage1")) +
	       AddV('WURL2', GetProp(Card,"WebPage2")) +
	       AddV('TITLE', GetProp(Card,"JobTitle")) +
	       AddV('COMPA', GetProp(Card,"Company")) +
	       AddV('BYEAR', GetProp(Card,"BirthYear")) +
	       AddV('BMONT', GetProp(Card,"BirthMonth")) +
	       AddV('BIDAY', GetProp(Card,"BirthDay")) +
	       AddV('NOTES', GetProp(Card,"Notes")) +
	       AddV('CGOOG', GetProp(Card,"_GoogleTalk")) +
	       AddV('CAIMN', GetProp(Card,"_AimScreenName")) +
	       AddV('CYAHO', GetProp(Card,"_Yahoo")) +
	       AddV('CSKYP', GetProp(Card,"_Skype")) +
	       AddV('CHAQQ', GetProp(Card,"_QQ")) +
	       AddV('CHMSN', GetProp(Card,"_MSN")) +
	       AddV('CHICQ', GetProp(Card,"_ICQ")) +
	       AddV('CJABB', GetProp(Card,"_JabberId")) +
	       AddV('PHOTO', getPhoto(Card));
	return out;
}

function LineToCard(Card, Line)
{
	var vs = SplitV(Line);

	Card = Card.QueryInterface(Components.interfaces.nsIAbCard);

	SetUUID(null,Card,ValueNN("CARID",vs));
	
	SetProp(Card,"FirstName",       ValueNN("FNAME",vs));
	SetProp(Card,"LastName",        ValueNN("LNAME",vs));
	SetProp(Card,"DisplayName",     ValueNN("DNAME",vs));
	SetProp(Card,"NickName",        ValueNN("NNAME",vs));
	SetProp(Card,"PrimaryEmail",    ValueNN("PMAIL",vs));
	SetProp(Card,"SecondEmail",     ValueNN("SMAIL",vs));
	SetProp(Card,"WorkPhone",       ValueNN("TWORK",vs));
	SetProp(Card,"HomePhone",       ValueNN("THOME",vs));
	SetProp(Card,"FaxNumber",       ValueNN("TEFAX",vs));
	SetProp(Card,"CellularNumber",  ValueNN("TCELL",vs));
	SetProp(Card,"PagerNumber",     ValueNN("TPAGE",vs));
	SetProp(Card,"HomeAddress",     ValueNN("HSTR1",vs));
	SetProp(Card,"HomeAddress2",    ValueNN("HSTR2",vs));
	SetProp(Card,"HomeState",       ValueNN("HSTAT",vs));
	SetProp(Card,"HomeZipCode",     ValueNN("HZIPC",vs));
	SetProp(Card,"HomeCity",        ValueNN("HCITY",vs));
	SetProp(Card,"HomeCountry",     ValueNN("HCOUN",vs));
	SetProp(Card,"WorkAddress",     ValueNN("WSTR1",vs));
	SetProp(Card,"WorkAddress2",    ValueNN("WSTR2",vs));
	SetProp(Card,"WorkState",       ValueNN("WSTAT",vs));
	SetProp(Card,"WorkZipCode",     ValueNN("WZIPC",vs));
	SetProp(Card,"WorkCity",        ValueNN("WCITY",vs));
	SetProp(Card,"WorkCountry",     ValueNN("WCOUN",vs));
	SetProp(Card,"WebPage1",        ValueNN("WURL1",vs));
	SetProp(Card,"WebPage2",        ValueNN("WURL2",vs));
	SetProp(Card,"JobTitle",        ValueNN("TITLE",vs));
	SetProp(Card,"Company",         ValueNN("COMPA",vs));
	SetProp(Card,"BirthYear",       ValueNN("BYEAR",vs));
	SetProp(Card,"BirthMonth",      ValueNN("BMONT",vs));
	SetProp(Card,"BirthDay",        ValueNN("BIDAY",vs));
	SetProp(Card,"Notes",           ValueNN("NOTES",vs));
	SetProp(Card,"_GoogleTalk",     ValueNN("CGOOG",vs));
	SetProp(Card,"_AimScreenName",  ValueNN("CAIMN",vs));
	SetProp(Card,"_Yahoo",          ValueNN("CYAHO",vs));
	SetProp(Card,"_Skype",          ValueNN("CSKYP",vs));
	SetProp(Card,"_QQ",             ValueNN("CHAQQ",vs));
	SetProp(Card,"_MSN",            ValueNN("CHMSN",vs));
	SetProp(Card,"_ICQ",            ValueNN("CHICQ",vs));
	SetProp(Card,"_JabberId",       ValueNN("CJABB",vs));
	setPhoto(Card,Value("PHOTO",vs));
}

function CardsSimpleEnum() {};

CardsSimpleEnum.prototype = {
	buffer : null,
	atend : false,
	enumerator : null,

	hasMoreElements : function () {
		if(this.buffer != null) return true;

		if(this.atend) return false;

		try {
			this.buffer = this.enumerator.currentItem();

			try {
				this.enumerator.next();
			}
			catch (ex) {
				this.atend = true;
			}

			return true;
		}
		catch (ex) {}

		return false;
	},

	getNext : function () {
		if(this.buffer != null) {
			var tmp = this.buffer;
			this.buffer = null;
			return tmp;
		}
		else {
			throw("hasMoreElements() was not called");
		}
	}
};

function GetCards(ab)
{
	var cards_enum = ab.childCards;

	try {
		cards_enum.hasMoreElements();
	}
	catch(ex) {
		try {
			cards_enum.first();
		}
		catch(ex) {}

		var cse = new CardsSimpleEnum();

		cse.enumerator = cards_enum;

		return cse;
	}

	return cards_enum;
}

function GetNextValidCard(cards_enum)
{
	var card;

	while(cards_enum.hasMoreElements()) {
		card = cards_enum.getNext();
		card = card.QueryInterface(Components.interfaces.nsIAbCard);
		if (!card.isMailList) {
			return card;
		}
	}
	return null;
}

function GetABURI(dir)

{
	try {
		return dir.directoryProperties.URI; // thunderbird <= 2
	}
	catch(ex) {
		return dir.URI;	// thunderbird 3
	}
}

function SaveCard(ab,card)
{
	try {
		ab.modifyCard(card);
	}
	catch (ex) {
		try {
			card.editCardToDatabase(GetABURI(ab));
		}
		catch (ex2) {}
	}
}

function GetAddressBook(abook)
{
	var ab;
	var abName;
	var SubDirs;

	try {
		var abm = Components.classes["@mozilla.org/abmanager;1"].getService(Components.interfaces.nsIAbManager);
  		SubDirs = abm.directories.QueryInterface(Components.interfaces.nsISimpleEnumerator);
	}
	catch(ex) {
		var Rdf = Components.classes["@mozilla.org/rdf/rdf-service;1"].getService(Components.interfaces.nsIRDFService);
		var RootDir = Rdf.GetResource("moz-abdirectory://").QueryInterface(Components.interfaces.nsIAbDirectory);
		SubDirs = RootDir.childNodes.QueryInterface(Components.interfaces.nsISimpleEnumerator);
	}

	while (SubDirs.hasMoreElements()) {
		ab = SubDirs.getNext().QueryInterface(Components.interfaces.nsIAbDirectory);
		if (!ab.isMailList) {
			abName = GetABURI(ab);
			if (abook.length > 0) {
				if (abName == abook) return ab;
			}
			else {
				if (abName.indexOf("//abook.mab") >= 0) {
					return ab;
				}
			}
		}
	}
	
	throw("Addressbook " + abook + " not found !");
}

function ScanCards(ab)
{
	var cards = new Object();

	var cards_enum = GetCards(ab);
	var curCard;
	var curCardUUID;

	while(curCard = GetNextValidCard(cards_enum)) {
		curCardUUID = GetUUID(ab,curCard);
		cards[curCardUUID] = curCard;
	}

	return cards;
}
	
function FindCard(ab,cards,carid)
{
	if(carid in cards)
		return cards[carid];
	else
		return null;
}

function DeleteCard(ab,cards,carid)
{
	if(carid in cards && cards[carid] != null) {
		try {
			var delArray = Components.classes["@mozilla.org/array;1"].
					createInstance(Components.interfaces.nsIMutableArray);

			delArray.appendElement(cards[carid],false);
			ab.deleteCards(delArray);
		}
		catch(ex) {
			var delArray = Components.classes["@mozilla.org/supports-array;1"].
					createInstance(Components.interfaces.nsISupportsArray);

			delArray.AppendElement(cards[carid]);
			ab.deleteCards(delArray);
		}
		cards[carid] = null;
	}
}

function isEvent(aObject) { return aObject instanceof Components.interfaces.calIEvent; }

function isToDo(aObject) { return aObject instanceof Components.interfaces.calITodo; }

function Date2String(dt, realyear)
{
	try {
		var dt2 = dt.clone();
		var ltz =  GetPref("calendar.timezone.local","UTC");	// Kalender-Zeitzone
		var tzs;
		
		var tzs = Components.classes["@mozilla.org/calendar/timezone-service;1"].
			    getService(Components.interfaces.calITimezoneService);

		if(dt.timezone.toString() == "floating" || (dt.isDate && dt.timezone.toString() != ltz)) {
			dt2.resetTo(dt.year,dt.month,dt.day,dt.hour,dt.minute,dt.second,tzs.getTimezone(ltz));
			dt2.isDate = dt.isDate;
		}

		var nativetime = dt2.nativeTime+"";

		nativetime = parseInt(nativetime.slice(0,-6));

		if (realyear == 1000){
			return ltz + "-" + tzs + "-" + tzs.getTimezone(ltz) + "/" + nativetime;
		}

		if(realyear != null) {
			while(realyear < dt2.year) {
				nativetime = nativetime - (86400 * 365);

				if((dt.month < 2 && realyear%4 == 0 && (realyear%100 != 0 || realyear%400 == 0)) ||
				   (dt.month > 1 && (realyear+1)%4 == 0 && ((realyear+1)%100 != 0 || (realyear+1)%400 == 0))) {
					nativetime = nativetime - 86400;
				}

				realyear++;
			}
		}
					
		return (dt2.isDate ? 'D' : '') + nativetime;
	}
	catch (ex) {
		Components.utils.reportError(ex);
	}
}

function String2Date(str)
{
	if(str == null) return null;

	var dt = null;

	try {
		var ltz =  GetPref("calendar.timezone.local","UTC");	// Kalender-Zeitzone
		
		dt = Components.classes["@mozilla.org/calendar/datetime;1"].
				createInstance(Components.interfaces.calIDateTime);

		var isdate = (str.slice(0,1) == 'D');
		
		if (str.match(/D\d{4}-\d{2}-\d{2}/)){
			dt.year = str.slice(1,5);
			dt.month = str.slice(6,8) - 1;
			dt.day = str.slice(9,11);
		}
		else{
			var nativetime = (isdate ? str.slice(1) : str);
			if (nativetime < 0 && isdate == false){ltz = "UTC";}
			nativetime = nativetime + '000000';
			dt.nativeTime = nativetime;	// setzt UTC
		}

		var tzs = Components.classes["@mozilla.org/calendar/timezone-service;1"].
			    getService(Components.interfaces.calITimezoneService);
		
		dt = dt.getInTimezone(tzs.getTimezone(ltz));	
		dt.isDate = isdate;		// erst jetzt darf man isDate setzen

		//if(dt.nativeTime != nativetime) {	// vermutlich falsche Zeitzone im Kalender
		//	dt.nativeTime = nativetime;	// dann lieber den Termin richtig in UTC statt ganztaegig und falsch
		//
		//	var tzs = Components.classes["@mozilla.org/calendar/timezone-service;1"].
		//		    getService(Components.interfaces.calITimezoneService);
		//	
		//	dt = dt.getInTimezone(tzs.getTimezone(ltz));
		//}
	}
	catch (ex) {
		Components.utils.reportError(ex);
	}

	return dt;	
}

function RItem2String(ri)
{
	return ri.icalProperty.icalString;
}

function ItemRecurrence(Item)
{
	try {
		var riarray = Item.recurrenceInfo.getRecurrenceItems({});
		var str = '';

		for(var i = 0;i < riarray.length;i++) {
			str += RItem2String(riarray[i]) + "\r\n";
		}

		return AddV('RINFO',str);
	}
	catch (ex) {
		//Components.utils.reportError(ex);
		return '';
	}
}

function ParseRecurrence(item,rinfostr)
{
	try {
		var ICSService = Components.classes["@mozilla.org/calendar/ics-service;1"].
					getService(Components.interfaces.calIICSService);

		var rinfo = Components.classes["@mozilla.org/calendar/recurrence-info;1"].
					createInstance(Components.interfaces.calIRecurrenceInfo);

		var ritem;

		rinfo.item = item;

		var icalcomp;

		var tzs = Components.classes["@mozilla.org/calendar/timezone-service;1"].
			    getService(Components.interfaces.calITimezoneService);

		icalcomp = ICSService.parseICS("BEGIN:VEVENT\r\n" + rinfostr + "\r\nEND:VEVENT\r\n",tzs);

		for(var recprop = icalcomp.getFirstProperty("ANY");
		    recprop;
		    recprop = icalcomp.getNextProperty("ANY")) {

			if(recprop.propertyName == "RRULE" || recprop.propertyName == "EXRULE") {
				ritem = Components.classes["@mozilla.org/calendar/recurrence-rule;1"].
						createInstance(Components.interfaces.calIRecurrenceRule);
			}
			else if(recprop.propertyName == "RDATE" || recprop.propertyName == "EXDATE") {
				ritem = Components.classes["@mozilla.org/calendar/recurrence-date;1"].
						createInstance(Components.interfaces.calIRecurrenceDate);
			}
			else continue;

			ritem.icalProperty = recprop;
			rinfo.appendRecurrenceItem(ritem);
		}

		return rinfo;
	}
	catch (ex) {
		Components.utils.reportError(ex);
	}

	return null;
}

function ItemAlarm(Item)
{
	var related = null;
	var offset = null;

	try {
		var alarms = Item.getAlarms({});

		if(alarms.length > 0) {
			switch(alarms[0].related) {
				case alarms[0].ALARM_RELATED_START:
					related = 'START';
					offset = alarms[0].offset.inSeconds;
					break;
				case alarms[0].ALARM_RELATED_END:
					related = 'END';
					offset = alarms[0].offset.inSeconds;
					break;
				case alarms[0].ALARM_RELATED_ABSOLUTE:
					related = 'ABSOLUTE';
					offset = Date2String(alarms[0].alarmDate,null);
					break;
			}

		}
	}
	catch(ex) {
		try {
			offset = Item.alarmOffset.inSeconds;
			related = (Item.alarmRelated == Item.ALARM_RELATED_START ? 'START' : 'END');
		}
		catch(ex) {}
	}

	if(offset != null && related != null) {
		return ';ALTYP:' + related + ';ALOFF:' + offset;
	}
	else {
		return '';
	}
}

function ItemToLine(Item, ReadOnly)
{
	var line = '';
	var calid = Item.calendar.id;

	var description = Item.getProperty('DESCRIPTION');
	var recurrence = ItemRecurrence(Item);

	var realyear = null;

	if(description != null && description.match(/^\d{4}$/) && recurrence != '') {
		realyear = parseInt(description);
	}

	if(isEvent(Item)) {
		line = 'ITYPE:EVENT' + AddV('CALID',calid)
		  + AddV('ITMID',Item.id) + AddV('TITLE',Item.title) 
		  + AddV('DSCPN',((calid.slice(0,19) == 'moz-abmdbdirectory:') ? Item.startDate.year : Item.getProperty('DESCRIPTION')))
		  + AddV('LOCTN',Item.getProperty('LOCATION'))
	          + AddV('SDATE',Date2String(Item.startDate,realyear)) + AddV('EDATE',Date2String(Item.endDate,realyear))
	          + AddV('CTIME',Date2String(Item.creationDate,null)) + AddV('MTIME',Date2String(Item.lastModifiedTime,null))
	          + AddV('PRIOR',Item.priority) + AddV('PRVCY',Item.privacy)
	          + AddV('RONLY',ReadOnly ? '1' : null)
	          + AddV('STATS',Item.status) + ItemAlarm(Item) + ItemRecurrence(Item) + '\r\n';
	}
	else if(isToDo(Item)) {
		line = 'ITYPE:TODO' + AddV('CALID',calid)
		  + AddV('ITMID',Item.id) + AddV('TITLE',Item.title)
		  + AddV('DSCPN',Item.getProperty('DESCRIPTION')) + AddV('LOCTN',Item.getProperty('LOCATION'))
	          + AddV('SDATE',Date2String(Item.entryDate,null)) + AddV('EDATE',Date2String(Item.dueDate,null))
	          + AddV('CMPLT',(Item.isCompleted ? 'YES' : 'NO'))
	          + AddV('CTIME',Date2String(Item.creationDate,null)) + AddV('MTIME',Date2String(Item.lastModifiedTime,null))
	          + AddV('PRIOR',Item.priority) + AddV('PRVCY',Item.privacy)
	          + AddV('RONLY',ReadOnly ? '1' : null)
	          + AddV('STATS',Item.status) + ItemAlarm(Item) + ItemRecurrence(Item) + '\r\n';
	}
	else {
		Components.utils.reportError("Unknown item type: " + Item.id);
	}

	return line;
}

function LineToItem(Item,Line)
{
	var vs = SplitV(Line);

	var itype  = Value("ITYPE",vs);

	Item.id	   = Value("ITMID",vs);
	Item.title = Value("TITLE",vs);

	if(Value("DSCPN",vs) != null && Value("CALID",vs).slice(0,19) != 'moz-abmdbdirectory:')
		Item.setProperty('description',Value("DSCPN",vs));
	else
		Item.deleteProperty('description');

	if(Value("LOCTN",vs) != null)
		Item.setProperty('location',Value("LOCTN",vs));
	else
		Item.deleteProperty('location');

	if(itype == "TODO")
		Item.isCompleted = (Value("CMPLT",vs) == "YES");

	Item.priority = Value("PRIOR",vs);
	Item.privacy  = Value("PRVCY",vs);
	Item.status   = Value("STATS",vs);

	if(itype == "EVENT")
		Item.startDate = String2Date(Value("SDATE",vs));
	else 
		Item.entryDate = String2Date(Value("SDATE",vs));

	if(itype == "EVENT")
		Item.endDate = String2Date(Value("EDATE",vs));
	else 
		Item.dueDate = String2Date(Value("EDATE",vs));

	if(Value("ALTYP",vs) != null && Value("ALOFF",vs) != null) {
		try {
			var Alarm = Components.classes["@mozilla.org/calendar/alarm;1"].
					createInstance(Components.interfaces.calIAlarm);

			if(Value("ALTYP",vs) == 'ABSOLUTE') {
				Alarm.related = Alarm.ALARM_RELATED_ABSOLUTE;
				Alarm.alarmDate = String2Date(Value("ALOFF",vs));
			}
			else {
				if(Value("ALTYP",vs) == 'START')
					Alarm.related = Alarm.ALARM_RELATED_START;
				else
					Alarm.related = Alarm.ALARM_RELATED_END;

				Alarm.offset = Components.classes["@mozilla.org/calendar/duration;1"].
						createInstance(Components.interfaces.calIDuration);
				Alarm.offset.inSeconds = Value("ALOFF",vs);
			}

			Item.clearAlarms();
			Item.addAlarm(Alarm);
		}
		catch(ex) {
	 		Item.alarmRelated = (Value("ALTYP",vs) == "START" ? Item.ALARM_RELATED_START : Item.ALARM_RELATED_END);

			Item.alarmOffset = Components.classes["@mozilla.org/calendar/duration;1"].
						createInstance(Components.interfaces.calIDuration);
			Item.alarmOffset.inSeconds = Value("ALOFF",vs);
		}
	}
	else {
		try {
			Item.clearAlarms();
		}
		catch(ex) {
			Item.alarmRelated = null;
			Item.alarmOffset = null;
		}
	}

	if(Value("RINFO",vs) != null) {
		Item.recurrenceInfo = ParseRecurrence(Item,Value("RINFO",vs));
	}
	else
		Item.recurrenceInfo = null;

	if(Value("RINFO",vs) != null && Value("DSCPN",vs) != null && Value("DSCPN",vs).match(/^\d{4}/) &&
	   GetPref('extensions.myphoneexplorer.set_birthday_category',false)) { // set birthday category
		var bcat = GetPref('extensions.myphoneexplorer.birthday_category','');
		if(bcat != null && bcat != '') {
			try {
				Item.setCategories(1,[bcat]);
			}
			catch(ex) {
				Item.setProperty('categories',bcat);
			}
		}
	}
}

function GetCalendar(calendar)
{
	var calendarManager = Components.classes["@mozilla.org/calendar/manager;1"]
               	                     .getService(Components.interfaces.calICalendarManager);
	var cals = calendarManager.getCalendars({});

	var c;

	for(c = 0;c < cals.length;c++) { // Zuerst gegen die ID matchen
		if(cals[c].id == calendar) {
			return cals[c];
		}
	}

	for(c = 0;c < cals.length;c++) { // dann gegen die URI
		if(cals[c].uri.asciiSpec == calendar) {
			return cals[c];
		}
	}

	for(c = 0;c < cals.length;c++) { // dann gegen den Namen
		if(cals[c].name == calendar) {
			return cals[c];
		}
	}
	
	throw("Calender " + calendar + " not found!");
}

// XPCOM

Components.utils.import("resource://gre/modules/XPCOMUtils.jsm")

function MyPhoneExplorer() {
	this.wrappedJSObject = this;
};

function generateQI(iid){
	var qi = null;
	try{
		qi = ChromeUtils.generateQI(iid);
		startup_done = true; //ab Thunderbird 68 funktioniert der calendar-startup-done Observer nichtmehr
	}
	catch(e)
	{
		qi = XPCOMUtils.generateQI(iid);
	}
	return qi;
};


MyPhoneExplorer.prototype = {

classDescription: 	"MyPhoneExplorer XPCOM Component",
classID:		Components.ID("{cd51fa3f-2663-49d0-91c9-fdf81fb87fc2}"),
contractID:		"@fjsoft.at/MyPhoneExplorer;1",
QueryInterface: 	generateQI([Components.interfaces.nsISupports]),

//
// Allgemeines
//

get VERSION() { return MPE_ADDON_VERSION; },

ListInfo: function(filename)
{
	WriteFile(filename,"Version:     "+this.VERSION+"\r\n"+
	                   "Addressbook: "+(this.HasABook ? "YES" : "NO")+"\r\n"+
	                   "Calendar:    "+(this.HasCalendar ? "YES" : "NO")+"\r\n");
},

// Quelle: http://developer.mozilla.org/en/docs/Code_snippets:Running_applications
Run: function(args)
{
	//var file = Components.classes["@mozilla.org/file/local;1"].createInstance(Components.interfaces.nsILocalFile);
	var process = Components.classes["@mozilla.org/process/util;1"].createInstance(Components.interfaces.nsIProcess);
	
	var path = RegRead("Software\\MyPhoneExplorer", "PathToExe");
	if (path.length != 0) {
		try
		{
			//file.initWithPath(path);
			var file = new FileUtils.File(path);
			process.init(file);
			process.run(false, [args], 1);
			return;
		}
		catch(ex)
		{
			Components.utils.reportError('Could not run ' + path);
			return;
		}
	}
	Components.utils.reportError("Could not find MyPhoneExplorer.exe");
},

SendMessage: function(num)
{
	this.Run("action=sendmessage flags=fromjumplist number="+RemoveWS(num));
},

DialNumber: function(num)
{
	this.Run("action=dial number="+RemoveWS(num));
},

Notify: function(action)
{
	this.Run("mozilla-notify="+action);
},

SyncAll: function()
{
	this.Run("action=sync syncitem=multi");
},

GetFilePath: function(filename)
{
	var filepath = RegRead("Software\\MyPhoneExplorer\\Mozilla", filename);

	if(filepath != '') return filepath;

	filepath = RegRead("Software\\MyPhoneExplorer", "Database");
	if(filepath == '') {
		filepath = RegRead("Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Shell Folders", "AppData");
	}

	if(filepath != '') {
		filepath += "\\MyPhoneExplorer\\" + filename;
	}

	return filepath;
},

GetRegEntry: function(keyvalue)
{
	var key = "Software\\MyPhoneExplorer";
	var value;

	var n = keyvalue.lastIndexOf("\\");

	if(n > 0) key += "\\" + keyvalue.slice(0,n-1);
	value = keyvalue.slice(n+1);

	return RegRead(key,value);
},

//
// Adressbuchfunktionen
//

get HasABook()
{
	try {
		var abm = Components.classes["@mozilla.org/abmanager;1"].getService(Components.interfaces.nsIAbManager);
  		var SubDirs = abm.directories.QueryInterface(Components.interfaces.nsISimpleEnumerator);
  
		if(SubDirs.hasMoreElements() == true) return true;
	}
	catch (ex) {
		try {
			var Rdf = Components.classes["@mozilla.org/rdf/rdf-service;1"].getService(Components.interfaces.nsIRDFService);
			var RootDir = Rdf.GetResource("moz-abdirectory://").QueryInterface(Components.interfaces.nsIAbDirectory);

			if(RootDir != null) return true;
		}
		catch (ex2) {}
	}

	return false;
},

ListABooks: function(filename)
{
	var folderlist = new Array();

	try {
		var SubDirs;

		try {
			var abm= Components.classes["@mozilla.org/abmanager;1"].getService(Components.interfaces.nsIAbManager);
  			SubDirs = abm.directories.QueryInterface(Components.interfaces.nsISimpleEnumerator);
		}
		catch (ex2) {
			var Rdf = Components.classes["@mozilla.org/rdf/rdf-service;1"].getService(Components.interfaces.nsIRDFService);
			var RootDir = Rdf.GetResource("moz-abdirectory://").QueryInterface(Components.interfaces.nsIAbDirectory);
			SubDirs = RootDir.childNodes.QueryInterface(Components.interfaces.nsISimpleEnumerator);
  		}

		while (SubDirs.hasMoreElements()) {
			var dir = SubDirs.getNext().QueryInterface(Components.interfaces.nsIAbDirectory);

			if (!dir.isMailList) {
				folderlist.push(dir.dirName + "\t" + GetABURI(dir) + "\r\n");
			}
		}
	}
	catch (ex) {}

	folderlist.sort();

	WriteFile(filename,folderlist.join(''));
},

get ChosenABook() { return RegRead("Software\\MyPhoneExplorer\\Mozilla", "AddressBook"); },

WriteCards: function(abook,filename)
{
	var abooks = abook.split('|');
	var cards = 'AddOn-Version='+MPE_ADDON_VERSION+'\r\n';

	var ab;

	for(var i = 0;i < abooks.length;i++) {
		ab = GetAddressBook(abooks[i]);

		var cards_enum = GetCards(ab);
		var nextCard;

		while(nextCard = GetNextValidCard(cards_enum)) {
			cards += CardToLine(nextCard,ab,abooks[i]) + '\r\n';
		}
	}

	WriteFile(filename,cards);
},

ReadCards: function(abook,filename)
{
	var abooks = abook.split('|');

	var i;
	var ab_lookup = new Object();
	var ab = new Array();
	var ab_cards = new Array();

	for(i = 0;i < abooks.length;i++) {
		ab[i] = GetAddressBook(abooks[i]);
		ab_lookup[abooks[i]] = i;
		ab_cards[i] = ScanCards(ab[i]);
	}

	var lines = ReadFile(filename);
	var op;
	var card;
	var carid;
	var cur_abook;
	var cur_ab_i;
	
	for (i = 1;lines.length > i;i++) { // Erste Zeile nicht benötigt, weil Versionsinfo
		op = lines[i].substring(0,lines[i].indexOf(';'));

		cur_abook = GetV('ABKID',lines[i]);
		if(cur_abook in ab_lookup)
			cur_ab_i = ab_lookup[cur_abook];
		else
			cur_ab_i = 0;

		carid = GetV('CARID',lines[i]);
		if(carid != null && carid != '')
			card = FindCard(ab[cur_ab_i],ab_cards[cur_ab_i],carid);
		else
			card = null;

		if(op == "NEW" || op == "EDIT") {
			if(card != null) {
				op = "EDIT";
			}
			else {
				card = Components.classes["@mozilla.org/addressbook/cardproperty;1"].
						createInstance(Components.interfaces.nsIAbCard);
				op = "NEW";
			}

			LineToCard(card,lines[i]);

			if(op == "NEW")
				ab[cur_ab_i].addCard(card);
			else
				SaveCard(ab[cur_ab_i],card);
		}
		else if(op == "DELETE") {
			if(card != null) {
				DeleteCard(ab[cur_ab_i],ab_cards[cur_ab_i],carid);
			}
		}
		else if(op.slice(0,9) == "IDCHANGE=") {
			if(card != null) {
				SetUUID(ab[cur_ab_i],card,op.slice(9));
			}
		}
	}
},

RAB: "",

get RequestedABook()
{
	return this.RAB;
},

set RequestedABook(ab)
{
	this.RAB = ab;
},

RCI: "",

get RequestedCardId()
{
	return this.RCI;
},

set RequestedCardId(id)
{
	this.RCI = id;
},

GetCard: function(abook,id)
{
	if(abook == null || abook.value == null || abook.value == '' ||
	   id == null || id == '') { return null; }

	var abooks = abook.value.split('|');

	for(var i = 0;i < abooks.length;i++) {
		var ab = GetAddressBook(abooks[i]);

		var cards_enum = GetCards(ab);
		var curCard;
		var curCardUUID;
	
		while(curCard = GetNextValidCard(cards_enum)) {
			curCardUUID = GetUUID(ab,curCard);
			if(id.match(/\w{8}-\w{4}-\w{4}-\w{4}-\w{12}/)) {
				if(curCardUUID == id) {
					abook.value = abooks[i];
					return curCard;
				}
			} else if(curCard.displayName == id) {
				abook.value = abooks[i];
				return curCard;
			} else if(curCard.firstName + ' ' + curCard.lastName == id) {
				abook.value = abooks[i];
				return curCard;
			}
		}
	}

	return null;
},

SyncABook: function()
{
	this.Run("action=sync syncitem=phonebook");
},

//
// Kalenderfunktionen
//

get HasCalendar()
{
	try {
		var calendarManager = Components.classes["@mozilla.org/calendar/manager;1"]
        	       	                     .getService(Components.interfaces.calICalendarManager);

		if(calendarManager != null) return true;
	}
	catch (ex) {}

	return false;
},

ListCalendars: function(filename)
{
	var callist = new Array();
	var calcolor; 

	try {
		var calendarManager = Components.classes["@mozilla.org/calendar/manager;1"]
               		                     .getService(Components.interfaces.calICalendarManager);
		var cals = calendarManager.getCalendars({});

		for(var c = 0;c < cals.length;c++) {
			try {
				calcolor = calendarManager.getCalendarPref_(cals[c],'color');
			}
			catch(gcp2) {
				calcolor = "#ffffff";
			}


			if(calcolor == null || calcolor == '') {
				calcolor = "#a8c2e1";
			}

			callist.push(cals[c].name + "\t" + cals[c].id + "\t"
			           + (cals[c].readOnly ? "RO" : "RW") + "\t" + calcolor.toUpperCase() + "\r\n");
		}
	}
	catch (ex) {
		Components.utils.reportError(ex);
	}

	callist.sort();

	WriteFile(filename,callist.join(''));
},

get ChosenCalendar() { return RegRead("Software\\MyPhoneExplorer\\Mozilla", "Calendar"); },

ItemCache: null,

CalendarCache: null,

CROCache: null,

ItemCacheTimeStamp: 0,

FillItemCache: function(calendar,aac)

{
	var calendars = calendar.split('|');

	var cstat = new Array();

	function CacheFiller() {};

	CacheFiller.prototype = {
		complete_already_called : false,
		mpe: null,
		calIndex: null,
		calCount: null,
		items: null,
		
		onOperationComplete: function(aCalendar, aStatus, aOperationType, aId, aDetail) 
		{
			if(this.complete_already_called) return;
			else this.complete_already_called = true;

			this.mpe.ItemCache[this.calIndex] = this.items;
			cstat[this.calIndex] = true;

			for(var i = 0;i < this.calCount;i++) { // Der Letzte schreibt die Ergebnisse
				if(!cstat[i]) return;
			}

			this.mpe.ItemCacheTimeStamp = Date.now();

			aac.AsyncActionComplete(true);
		},

        	onGetResult: function(aCalendar, aStatus, aItemType, aDetail, aCount, aItems)
        	{
			for(var i = 0;i < aItems.length;i++) {
				this.items.push(aItems[i]);
			}
        	}
	};

	var cf;
	var i;
	var cal;

	for(i = 0;i < calendars.length;i++) {
		cstat[i] = false;
	}

	this.ItemCache = new Array();
	this.CalendarCache = calendar;
	this.CROCache = new Array();
	
	for(i = 0;i < calendars.length;i++) {
		cal = GetCalendar(calendars[i]);
		this.CROCache[i] = cal.readOnly;

		cf = new CacheFiller();
		cf.calIndex = i;
		cf.calCount = calendars.length;
		cf.mpe = this;
		cf.items = new Array();

		cal.getItems(Components.interfaces.calICalendar.ITEM_FILTER_ALL_ITEMS, 0, null, null, cf);
	}
},

WriteItems: function(calendar,filename,aac)
{
	function myWriteObserver()
	{
	  this.register();
	}
	
	myWriteObserver.prototype = {
	  mpe: null,
	  
	  observe: function(subject, topic, data) {
			this.unregister();
			
				function ItemWriter() {};
				ItemWriter.prototype = {
					mpe: null,
			
					AsyncActionComplete: function(success)
					{
						
						var itemdata = 'AddOn-Version='+MPE_ADDON_VERSION+'\r\n';
			
						for(var i = 0;i < this.mpe.ItemCache.length;i++) {
							for(var j = 0;j < this.mpe.ItemCache[i].length;j++) {
								itemdata += ItemToLine(this.mpe.ItemCache[i][j],this.mpe.CROCache[i]);
							}
						}
			
						WriteFile(filename,itemdata);
			
						aac.AsyncActionComplete(true);
					}
				};

				var iw = new ItemWriter();
				iw.mpe = this.mpe;
				this.mpe.FillItemCache(calendar,iw);
	
	  },
	  register: function() {
		var observerService = Components.classes["@mozilla.org/observer-service;1"].getService(Components.interfaces.nsIObserverService);
		observerService.addObserver(this, "calendar-startup-done", false);
		Components.utils.reportError('calendar-startup-done myWriteObserver registred');
	  },
	  
	  unregister: function() {
		var observerService = Components.classes["@mozilla.org/observer-service;1"].getService(Components.interfaces.nsIObserverService);
		observerService.removeObserver(this, "calendar-startup-done");
		Components.utils.reportError('calendar-startup-done myWriteObserver unregistred');
	  }
	}
	
	var observer = new myWriteObserver();
	observer.mpe = this;
	
	if (startup_done == true){
		Components.utils.reportError('manually observed');
		observer.observe("manually observed",null,null);
	}
},


ReadItems: function(calendar,filename,aac)
{
	function myReadObserver()
	{
	  this.register();
	}
	
	myReadObserver.prototype = {
	  mpe: null,
	  
	  observe: function(subject, topic, data) {
			this.unregister();
			
			function ItemReader() {};
			ItemReader.prototype = {
				mpe: null,
		
				AsyncActionComplete: function(success)
				{
					var lines = ReadFile(filename);
					var op;
					var calid;
					var itmid;
					var itype;
					var calIndex;
					var itmIndex;
					var i;
					var j;
		
					var calendars = this.mpe.CalendarCache.split('|');
					var cals = new Array();
					var item;
		
					for(i = 0;i < calendars.length;i++) {
						cals[i] = GetCalendar(calendars[i]);
					}
					
					for(i = 1;i < lines.length;i++) { // Erste Zeile nicht benoetigt, weil Versionsinfo
						try {
							calid = GetV('CALID',lines[i]);
							itmid = GetV('ITMID',lines[i]);
							itype = GetV('ITYPE',lines[i]);
		
							op = lines[i].substring(0,lines[i].indexOf(';'));
		
							if(op != 'NEW' && op != 'DELETE' && op != 'EDIT') {
								continue;
							}
		
							if(itmid == null && op != "NEW") {
								throw "Missing item ID in line "+i;
							}
		
							calIndex = 0;
		
							if(calid != null) {
								for(j = 0;j < calendars.length;j++) {
									if(calid == calendars[j]) {
										calIndex = j;
										break;
									}
								}
							}
		
							itmIndex = null;
		
							for(j = 0;j < this.mpe.ItemCache[calIndex].length;j++) {
								if(this.mpe.ItemCache[calIndex][j] == null) continue;
		
								if(itmid == this.mpe.ItemCache[calIndex][j].id) {
									itmIndex = j;
									break;
								}
							}
		
							if(op == "DELETE") {
								if(itmIndex == null) throw "Missing or wrong item ID in line "+i;
		
								cals[calIndex].deleteItem(this.mpe.ItemCache[calIndex][itmIndex],null);
								this.mpe.ItemCache[calIndex][itmIndex] = null;
							}
							else if(op == "NEW" || op == "EDIT") {
								if(itmIndex != null) {
									item = this.mpe.ItemCache[calIndex][itmIndex].clone();
									if(item == null) throw "Clone of old item failed";
								}
								else {
									if(itype == 'EVENT') {
										item = Components.classes["@mozilla.org/calendar/event;1"].
											createInstance(Components.interfaces.calIEvent);
									}
									else if(itype == 'TODO') {
										item = Components.classes["@mozilla.org/calendar/todo;1"].
											createInstance(Components.interfaces.calITodo);
									}
									else throw "Missing or unknown item type";
		
									if(item == null) throw "Creation of new item failed";
								}
		
								LineToItem(item,lines[i]);
		
								if(itmIndex != null) {
									cals[calIndex].modifyItem(item,this.mpe.ItemCache[calIndex][itmIndex],null);
								}
								else {
									cals[calIndex].addItem(item,null);
								}
							}
						}
						catch(ex) {
							Components.utils.reportError(ex);
						}
					}
		
					this.mpe.ItemCache = null;
					this.mpe.CalendarCache = null;
					this.mpe.CROCache = null;
					this.mpe.ItemCacheTimeStamp = 0;
		
					aac.AsyncActionComplete(true);
				}
			};
		
			var ir = new ItemReader();
		
			ir.mpe = this.mpe;
			var now = Date.now();
		
			if(this.mpe.ItemCache == null || this.mpe.CalendarCache != calendar || now - this.mpe.ItemCacheTimeStamp > 600000) {
				this.mpe.FillItemCache(calendar,ir);
			}
			else {
				ir.AsyncActionComplete(true);
			} 
		  },
	  register: function() {
		var observerService = Components.classes["@mozilla.org/observer-service;1"].getService(Components.interfaces.nsIObserverService);
		observerService.addObserver(this, "calendar-startup-done", false);
	  },
	  
	  unregister: function() {
		var observerService = Components.classes["@mozilla.org/observer-service;1"].getService(Components.interfaces.nsIObserverService);
		observerService.removeObserver(this, "calendar-startup-done");
	  }
	}
	
	var observer = new myReadObserver();
	observer.mpe = this;
	
	if (startup_done == true){
		observer.observe("manually observed",null,null);
	}
},

SyncCalendar: function()
{
	this.Run("action=sync syncitem=organizer");
}

};

if(XPCOMUtils.generateNSGetFactory)
    var NSGetFactory = XPCOMUtils.generateNSGetFactory([MyPhoneExplorer]);
else
    var NSGetModule = XPCOMUtils.generateNSGetModule([MyPhoneExplorer]);
