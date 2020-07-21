
function LOG(text) {
    var t = "";
    if (typeof text == 'object' && text !== null) {
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

function Ip(attributes) {

	//copy attributes
	for (var i in attributes) {
		this[i] = attributes[i];
	}

    this.my_id = 'epvp@pet-portal.eu';
    this.database = 'iplocator_1.sqlite';

    var dbFile = initFile(this.my_id, this.database);
    ////

    var dbService = Components.classes["@mozilla.org/storage/service;1"].getService(Components.interfaces.mozIStorageService);

    var dbConnection;

    if (!dbFile.exists()) {
        alert('The database file not found!');
        return;
    }
    else {
        dbConnection = dbService.openDatabase(dbFile);
    }


    try {
    var statement = dbConnection.createStatement("SELECT * FROM ip2location_1 JOIN country ON country.code = ip2location_1.countrycode WHERE :ip BETWEEN ipStart AND ipEnd LIMIT 1");
    } catch (e) { LOG(e); }
    ////-
    
    //split ip to bytes
    var ipbytes = this.ip.split('.');

    //calculate ip code
    this.ipcode = ((ipbytes[0] * 256 + ipbytes[1] * 1) * 256 + ipbytes[2] * 1) * 256 + ipbytes[3] * 1;
    statement.params.ip = this.ipcode;

    //execute query
    var res = statement.executeStep();
    var dataAvailable = false;

    this.BubbleLink = 'bubblelink';
    this.NodeIP = this.ip;


    ////-
    if (res && statement.row.countryname) {
        dataAvailable = true;
    } else {
        //try the other database file
        this.database = 'iplocator_2.sqlite';
        dbFile = initFile(this.my_id, this.database);

        if (!dbFile.exists()) {
            alert('The database file not found!');
            return;
        } else {
            dbConnection = dbService.openDatabase(dbFile);
        }

        ////-
        try {
            statement = dbConnection.createStatement("SELECT * FROM ip2location_2 JOIN country ON country.code = ip2location_2.countrycode WHERE :ip BETWEEN ipStart AND ipEnd LIMIT 1");
        } catch (e) {
            LOG(e);
        }

        statement.params.ip = this.ipcode;
        //execute query
        res = statement.executeStep();

        if (res && statement.row.countryname) {
            dataAvailable = true;
        }
    }



    if (dataAvailable) {
        this.Code = statement.row.alpha3code;
        this.CountryName = statement.row.countryname;
        this.City = statement.row.city;
        this.Latitude = statement.row.latitude;
        this.Longitude = statement.row.longitude;
        this.DataRet = statement.row.dataretention == '1' ? true : false;
        this.Warrantless = statement.row.warrantless == '1' ? true : false;
        this.DataRetText = statement.row.dataretentiontext;
        this.WarrantlessText = statement.row.warrantlesstext;
    } else {
        this.Code = "";
        this.CountryName = "Reserved";
        this.City = '';
        this.Latitude = '';
        this.Longitude = '';
        this.DataRet = true;
        this.Warrantless = true;
        this.DataRetText = '';
        this.WarrantlessText = '';
    }
    ////-
	this.Comment = '';

    return this;
}