// mpecli.js
//
// command line arguments for the MPE extension
//

Components.utils.import("resource://gre/modules/XPCOMUtils.jsm");
Components.utils.import("resource://gre/modules/FileUtils.jsm");

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

function generateQI(iid){
	var qi = null;
	try{
		qi = ChromeUtils.generateQI(iid);
	}
	catch(e)
	{
		qi = XPCOMUtils.generateQI(iid);
	}
	return qi;
};

function mpeCliHandler() {}

mpeCliHandler.prototype =
{
	classID:		Components.ID("{ce17443a-943a-401c-8955-ed0c173c729d}"),
	classDescription:	"MyPhoneExplorer CLI Handler",
	contractID:		"@mozilla.org/commandlinehandler/general-startup;1?type=mpe",
	QueryInterface:		generateQI([Components.interfaces.nsICommandLineHandler]),
  	_xpcom_categories:	[{category: "command-line-handler", entry: "m-mpe"}],

	helpInfo:		"-mpe                Execute MyPhoneExplorer Commands.\n",

	handle : function clh_handle(cmdLine) 
	{
		var args = Components.classes["@mozilla.org/supports-string;1"].createInstance(Components.interfaces.nsISupportsString);

		try {
			var command = cmdLine.handleFlagWithParam("mpe", false);
			//WriteFile("E:\error.txt","detected commandline: " + command);
			//Components.utils.reportError("detected commandline: " + command);
			var mpe = Components.classes["@fjsoft.at/MyPhoneExplorer;1"].getService().wrappedJSObject;
			var com,filename,chosen;
			var notify = true;

			if(command == null) {
				return;
			}

			var ww = Components.classes["@mozilla.org/embedcomp/window-watcher;1"].
					getService(Components.interfaces.nsIWindowWatcher);
			var window_opened = false;

			var i = command.indexOf('=');
			if(i >= 0) {
				com = command.substring(i+1).split(';');
				command = command.substring(0,i);
				filename = com[0];
				chosen = com[1];
				notify = (com[2] != 'quiet'); 
			}

			if(command == 'version' || command == 'info' || command == 'list-info') {
				mpe.ListInfo(filename ? filename : mpe.GetFilePath("MozillaInfo"));
				if(notify) mpe.Notify(command);
			} 
			else if(command == 'list-abooks' || command == 'list-addressbooks') {
				mpe.ListABooks(filename ? filename : mpe.GetFilePath("MozillaAddressBooks"));
				if(notify) mpe.Notify(command);
			}
			else if(command == 'export-cards') {
				mpe.WriteCards(chosen ? chosen : mpe.ChosenABook,filename ? filename : mpe.GetFilePath("MozillaCards"));
				if(notify) mpe.Notify(command);
			}
			else if(command == 'import-cards') {
				mpe.ReadCards(chosen ? chosen : mpe.ChosenABook,filename ? filename : mpe.GetFilePath("MozillaCards"));
				if(notify) mpe.Notify(command);
			}
			else if((command == 'showcontact' || command == 'show-card') && mpe.HasABook) {
				if(filename != null && filename != '') { // filename contains card id
					mpe.RequestedCardId = filename;
					mpe.RequestedABook = chosen ? chosen : mpe.ChosenABook;

					ww.openWindow(null, "chrome://myphoneexplorer/content/mpeShowCard.xul",
                                               	      null, 'chrome,centerscreen', null );

					window_opened = true;
				} 
			}
			else if(command == 'list-cals' || command == 'list-calendars') {
				mpe.ListCalendars(filename ? filename : mpe.GetFilePath("MozillaCalendars"));
				if(notify) mpe.Notify(command);
			}
			else if(command == 'export-items') {
				var export_items_aac = {
					AsyncActionComplete: function(success) {
						if(notify && success) mpe.Notify('export-items');
					}
				};

				mpe.WriteItems(chosen ? chosen : mpe.ChosenCalendar,
				               filename ? filename : mpe.GetFilePath("MozillaItems"),
				               export_items_aac);
			}
			else if(command == 'import-items') {
				var import_items_aac = {
					AsyncActionComplete: function(success) {
						if(notify && success) mpe.Notify('import-items');
					}
				};

				mpe.ReadItems(chosen ? chosen : mpe.ChosenCalendar,
				              filename ? filename : mpe.GetFilePath("MozillaItems"),
				              import_items_aac);
			}
			else {
				Components.utils.reportError("Unknown suboption -mpe " + command);
				return;
			}

	  		cmdLine.preventDefault = true;

			if(!window_opened) {
				ww.openWindow(null, "chrome://myphoneexplorer/content/mpeDummyWindow.xul",
			        	      null, null, null);
			}
    	}
		catch (ex) {
			//WriteFile("E:\error.txt","Exception caught during -mpe "+command+": "+ex);
			Components.utils.reportError("Exception caught during -mpe "+command+": "+ex);
    	}
  	}
};

if(XPCOMUtils.generateNSGetFactory)
    var NSGetFactory = XPCOMUtils.generateNSGetFactory([mpeCliHandler]);
else
    var NSGetModule = XPCOMUtils.generateNSGetModule([mpeCliHandler]);
