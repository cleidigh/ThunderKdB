var mutex=false;
function Tracerouter( epvp ) {

    //check OS
    var os = Components.classes["@mozilla.org/xre/app-info;1"].getService(Components.interfaces.nsIXULRuntime).OS;

    switch (os) {
    case 'Darwin':
        return new Traceroute_Darwin( epvp );
        break;
    case 'Linux':
        return new Traceroute_Linux( epvp );
        break;
	case 'WINNT':
		return new Traceroute_Windows( epvp );
		break;
    default:
        alert("Unknown operation system!");
        return;
    }
}

function Traceroute_Darwin( epvp ) {
    this.detect = function(ip, parent, maxhop) {
	
		if (ip == undefined) {
//			var po = new Processobserver(epvp,'');
//			po.observe(undefined, undefined, undefined);
			parent.processObserver.observe(undefined, undefined, undefined);
		}
	
        if (!maxhop) maxhop = 10;

        var MY_ID = 'epvp@pet-portal.eu';

        ////
        //var em = Components.classes["@mozilla.org/extensions/manager;1"].getService(Components.interfaces.nsIExtensionManager);
        ////

        var interpreter = Components.classes["@mozilla.org/file/local;1"].createInstance(Components.interfaces.nsIFile);
        interpreter.initWithPath("/bin/sh");

        ////
        //var traceroute = em.getInstallLocation(MY_ID).getItemFile(MY_ID, "traceroute_darwin.sh");
        //var output = em.getInstallLocation(MY_ID).getItemFile(MY_ID, "traceroute");
        var traceroute = initFile(MY_ID, "traceroute_darwin.sh");
        var output = initFile(MY_ID, "traceroute_" + epvp.messageid);
        ////

        var process = Components.classes["@mozilla.org/process/util;1"].createInstance(Components.interfaces.nsIProcess);
        process.init(interpreter);

        var args = [traceroute.path, ip, output.path];

        if (ip != null) {
            process.runAsync(args, args.length, parent.processObserver , false);
        }
    };

    return this;
}

function Traceroute_Linux( epvp ) {
    this.detect = function(ip, parent, maxhop) {
	
		if (ip == undefined) {
			//var po = new Processobserver(epvp,'');
			//po.observe(undefined, undefined, undefined);
            parent.processObserver.observe(undefined, undefined, undefined);
		}
	
        if (!maxhop) maxhop = 10;

        var MY_ID = 'epvp@pet-portal.eu';

        ////
        //var em = Components.classes["@mozilla.org/extensions/manager;1"].getService(Components.interfaces.nsIExtensionManager);
        ////

        var interpreter = Components.classes["@mozilla.org/file/local;1"].createInstance(Components.interfaces.nsIFile);
        interpreter.initWithPath("/bin/sh");

        ////
        //var traceroute = em.getInstallLocation(MY_ID).getItemFile(MY_ID, "traceroute_linux.sh");
        //var output = em.getInstallLocation(MY_ID).getItemFile(MY_ID, "traceroute");
        var traceroute = initFile(MY_ID, "traceroute_linux.sh");
        var output = initFile(MY_ID, "traceroute_" + epvp.messageid);
        ////

        var process = Components.classes["@mozilla.org/process/util;1"].createInstance(Components.interfaces.nsIProcess);
        process.init(interpreter);

        var args = [traceroute.path, ip, output.path];

        if (ip != null) {
            process.runAsync(args, args.length, parent.processObserver, false);
        }
    };

    return this;
}

function Traceroute_Windows( epvp ) {
    this.detect = function(ip, parent, maxhop) {
	
		if (ip == undefined) {
			//var po = new Processobserver(epvp,'');
			//po.observe(undefined, undefined, undefined);
			parent.processObserver.observe(undefined, undefined, undefined);
		}
	
        if (!maxhop) maxhop = 10;

        var MY_ID = 'epvp@pet-portal.eu';

        ////
        //var em = Components.classes["@mozilla.org/extensions/manager;1"].getService(Components.interfaces.nsIExtensionManager);
        ////

        ////
		//var traceroute = em.getInstallLocation(MY_ID).getItemFile(MY_ID, "traceroute_windows.vbs");
        //var output = em.getInstallLocation(MY_ID).getItemFile(MY_ID, "traceroute");
        var traceroute = initFile(MY_ID, "traceroute_windows.vbs");
        var output = initFile(MY_ID, "traceroute_" + epvp.messageid);
        ////

        var process = Components.classes["@mozilla.org/process/util;1"].createInstance(Components.interfaces.nsIProcess);
        process.init( traceroute );

        var args = [ ip, output.path];

		if (ip != null) {
		    process.runAsync(args, args.length, parent.processObserver, false);
		}
    };

    return this;
}


