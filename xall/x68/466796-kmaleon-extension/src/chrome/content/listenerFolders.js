Components.utils.import("chrome://kmaleonext/content/modules/leerID.jsm");		

var consoleList = Components.classes['@mozilla.org/consoleservice;1'].getService(Components.interfaces.nsIConsoleService)
var folderEnviar = null;
var rootFolder = null;
var lastMsgSent = null;
var accountdefault2 = Services.prefs.getCharPref("mail.accountmanager.defaultaccount");
var accountdefaultidentity2 = Services.prefs.getCharPref("mail.account." + accountdefault2 + ".identities");
		
window.addEventListener("load", function(e) { 
	listenerFolders.anyadirListener(); 
}, false);


var folderListenerKmaleon = 
{
	OnItemAdded: function(parent, item, viewString) 
	{  	
		consoleList.logStringMessage("Se ha anyadido un mensaje a la carpeta de enviados.");
		var defaultFolderSend2 = Services.prefs.getCharPref("mail.identity." + accountdefaultidentity2 + ".fcc_folder");
        consoleList.logStringMessage("Carpeta en la que ha entrado: " + parent.URI + " <> Carpeta de Enviados encontrada: " +  defaultFolderSend2);
		
		try
		{	
			var Header = item.QueryInterface(Components.interfaces.nsIMsgDBHdr);
			var UriMsg = Header.folder.getUriForMsg(Header);
			var contenidoMsg = listenerFolders.obtenerStringMensaje(UriMsg);
		
			if(lastMsgSent != contenidoMsg)
			{	
				consoleList.logStringMessage("Procesando el mensaje.");
				lastMsgSent = contenidoMsg;
				listenerFolders.comprobarTagEjecutarPrograma(contenidoMsg, Header);
			}			
		}catch(ex)
		{
			consoleList.logStringMessage("Error: " + ex);
		}			
	},
	OnItemRemoved: function(parent, item, viewString) {},
	OnItemPropertyChanged: function(parent, item, viewString) {},
	OnItemIntPropertyChanged: function(item, property, oldValue, newValue) {},
	OnItemBoolPropertyChanged: function(item, property, oldValue, newValue) {},
	OnItemUnicharPropertyChanged: function(item, property, oldValue, newValue) {},
	OnItemPropertyFlagChanged: function(item, property, oldFlag, newFlag) {},
	OnItemEvent: function(item, event) {},
	OnFolderLoaded: function(aFolder){},
	OnDeleteOrMoveMessagesCompleted: function( aFolder){}
}

var listenerFolders = 
{
	anyadirListener: function ()
	{		
		try
		{	
			consoleList.logStringMessage("Anyadiendo Listener");
			var acctMgr = Components.classes["@mozilla.org/messenger/account-manager;1"].getService(Components.interfaces.nsIMsgAccountManager);
			var accountdefault =  Services.prefs.getCharPref(("mail.accountmanager.defaultaccount"));
			var accountdefaultidentity =  Services.prefs.getCharPref("mail.account." + accountdefault + ".identities");
			var defaultFolderSend = Services.prefs.getCharPref(("mail.identity." + accountdefaultidentity + ".fcc_folder"));
			var account = acctMgr.defaultAccount;
			rootFolder = account.incomingServer.rootFolder;
			var mailSession = Components.classes["@mozilla.org/messenger/services/session;1"].getService(Components.interfaces.nsIMsgMailSession); 
			mailSession.AddFolderListener(folderListenerKmaleon, Components.interfaces.nsIFolderListener.all);			
		}catch(ex)
		{
			consoleList.logStringMessage("Error -> Es posible que no haya cuenta definida como predeterminada: " + ex);
		}
		
	},
	
	obtenerStringMensaje: function(urimensaje)
	{
		try
		{
			var contentheader = ""; 
			var MessageURI = urimensaje; 	
			messenger = Components.classes["@mozilla.org/messenger;1"].createInstance(Components.interfaces.nsIMessenger);
			var MsgService = messenger.messageServiceFromURI(MessageURI);  
			var MsgStream = Components.classes["@mozilla.org/network/sync-stream-listener;1"].createInstance(); 
			var MsgStrem_Inputstream = MsgStream.QueryInterface(Components.interfaces.nsIInputStream); 
			var ScriptInput = Components.classes["@mozilla.org/scriptableinputstream;1"].createInstance(); 
			var ScriptInputStream = ScriptInput .QueryInterface(Components.interfaces.nsIScriptableInputStream); 
			ScriptInputStream.init(MsgStream); 
			try 
			{ 
				MsgService.streamMessage(MessageURI, MsgStream, msgWindow, null, false, null); 
			} 
			catch (ex) 
			{ 
				consoleList.logStringMessage("Error: " + ex);
			} 
			ScriptInputStream.available(); 
			while (ScriptInputStream.available()) 
			{ 
				contentheader = contentheader + ScriptInputStream .read(512); 
			}
			return contentheader;
		}catch(ex)
		{
			consoleList.logStringMessage("Error: " + ex);
			return null;
		}
	},
	
	comprobarTagEjecutarPrograma: function (stringMensaje, headerMensaje)
	{
		var strAux = "";				
		var resultBus = stringMensaje.search("X-Kmaleon:");
				
		if (resultBus != -1 && getIDProgIguales())
		{
			setIDProgIguales(false);
			resultBus += 10;
			var acabado = false;
			
			do
			{
				if(stringMensaje[resultBus] != "\n")
				{
					if(stringMensaje[resultBus] != "\r" && stringMensaje[resultBus] != " " && stringMensaje[resultBus] != "\r")
					{
						strAux += stringMensaje[resultBus];
						resultBus++;
					}else
					{
						resultBus++;
					}
				}else
				{
					acabado = true;
				}
			} while (acabado == false);
			strAux.replace(" ",""); 
			
			if (strAux.length > 1)
			{
				var timeL = new Date();	
				var subjectL = "empty";
				var recipientsL = "empty";
				var autorL = "empty";
				var emailL = "empty";
				var pathL = "";
				var pathTempL = "";
				var pathemailL = "";
								
				try
				{
					timeL.setTime((headerMensaje.date/1000));
				}catch(ex)
				{
					consoleList.logStringMessage("Error. " + ex);
					timeL = "empty";
				}
				
				subjectL = headerMensaje.mime2DecodedSubject;
				if(subjectL.length<1)
				{
					subjectL = "empty";
				}
				
				if(headerMensaje.mime2DecodedRecipients.length>4)
				{
					recipientsL = headerMensaje.mime2DecodedRecipients;
				}
					
				autorL = headerMensaje.mime2DecodedAuthor;
				if(autorL.length<1)
				{
					autorL = "empty";
				}
				
				var result = autorL.search("<");
				if(result == -1)
				{
					emailL = autorL;
				}else
				{
					emailL =  autorL.substring((result+1),(autorL.length-1));
					var aux = autorL.substring(0,(result-1));
					autorL = aux;
					if(emailL.length<1)
					{
						emailL = "empty";
					}
				}
				
				var filename = "emailguardadoautE.eml";
				var file2 = Components.classes["@mozilla.org/file/directory_service;1"].getService(Components.interfaces.nsIProperties).get("TmpD", Components.interfaces.nsIFile);
				pathTempL = file2.path;
				
				var file = Components.classes["@mozilla.org/file/local;1"].createInstance(Components.interfaces.nsIFile);				
				pathemailL = pathTempL + "\\" + filename;
				file.initWithPath(pathemailL);
				
				var foStream = Components.classes["@mozilla.org/network/file-output-stream;1"].createInstance(Components.interfaces.nsIFileOutputStream);
				foStream.init(file, 0x02 | 0x08 | 0x20, 0666, 0); 
				var converter = Components.classes["@mozilla.org/intl/converter-output-stream;1"].createInstance(Components.interfaces.nsIConverterOutputStream);
				converter.init(foStream, "UTF-8", 0, 0);
				converter.writeString(stringMensaje);
				converter.close();
			
				var pathAppData = buscarKMDDEtxt();					
				
				var file3 = Components.classes["@mozilla.org/file/local;1"].createInstance(Components.interfaces.nsIFile);
				file3.initWithPath(pathAppData);
								
				var istream = Components.classes["@mozilla.org/network/file-input-stream;1"].createInstance(Components.interfaces.nsIFileInputStream);
				istream.init(file3, 0x01, 0444, 0);
				istream.QueryInterface(Components.interfaces.nsILineInputStream);

				var line = {}, linea, hasmore;
				var fin = false;
				var resultbusq;
				var pathapp = ""; 
				
				do 
				{
					hasmore = istream.readLine(line);
					linea = line.value;

					resultbusq = linea.search("APP_PATH");
					if(resultbusq!=-1) 
					{
						fin = true;
						pathapp = linea.substring((linea.search("=")+1),linea.length)+"\\GuardarEmail.exe";
					}
			  
				} while((hasmore) && (fin==false));

				istream.close();
							
				var file4 = Components.classes["@mozilla.org/file/local;1"].createInstance(Components.interfaces.nsIFile);
				file4.initWithPath(pathapp);
				
				var process = Components.classes["@mozilla.org/process/util;1"].createInstance(Components.interfaces.nsIProcess);
				process.init(file4);
				
				var auxTimeStringL	= timeL.getDate() + "/" + (timeL.getMonth() + 1) + "/"+timeL.getFullYear() + " " + timeL.getHours() + ":" + timeL.getMinutes();
												
				var args = [pathemailL, emailL, recipientsL, auxTimeStringL, autorL, subjectL, 3, strAux, "ANEXAREMAIL"]; 
				
				consoleList.logStringMessage("Params Auto: " + args);
				
				process.run(false, args, args.length);
							
				admintags.anyadirtag(headerMensaje);
			}
		}else{
			consoleList.logStringMessage("No existe el XHeader o los IDs de programa no son iguales.");
		}
	},
	
	buscarSubFolderEnviar: function (folder, stringFolderBuscar)
	{
		if (folder.hasSubFolders) 
		{
			if(folder.URI == stringFolderBuscar)
			{
				return folder;
			}else
			{
			
				var subFolders = folder.subFolders;
				while(subFolders.hasMoreElements()) 
				{
					var folder2 = subFolders.getNext().QueryInterface(Components.interfaces.nsIMsgFolder);
					
					var folderAux = listenerFolders.buscarSubFolderEnviar(folder2, stringFolderBuscar);

					if(folderAux != null)
					{
						return folderAux;
					}
				}
				return null;
			}
		}else
		{
			if(folder.URI == stringFolderBuscar)
			{			
				return folder;
			}else
			{				
				return null;
			}
		}
	
	},
	
	recargarFolderDefault: function()
	{
		folderEnviar = listenerFolders.buscarSubFolderEnviar(rootFolder, defaultFolderSend);
	}
	
	
}