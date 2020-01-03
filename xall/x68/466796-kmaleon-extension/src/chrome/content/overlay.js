var consoleOverlay = Components.classes['@mozilla.org/consoleservice;1'].getService(Components.interfaces.nsIConsoleService);
var fecha = new Date();
var myPanel;
var buttonexterior;
var myPanel2;
var buttonexterior2;
var acabado = true;
var inicializado = false;
var pathemail = "empty";
var pathtemp = "empty";
var time = new Date();	
var subject = "empty";
var recipients = "empty";
var autor = "empty";
var email = "empty";
var AppData = "";
var messageHeader = "";
var tipoAnexado = "";


window.addEventListener("load", function(e) { 
	startup(); 
}, false);

var interval = window.setInterval(
	function() {
		startup(); 
	}, 5000); 

function startup() {	
	myPanel = document.getElementById("my-panel");
	myPanel.label = "Anexar a expediente";	buttonexterior = document.getElementById("buttonexterior");
	myPanel2 = document.getElementById("my-panel2");
	myPanel2.label = "Anexar a referencia";
	buttonexteriorR = document.getElementById("buttonexteriorR");
	
	if(buttonexterior != null)
	{
		buttonexterior.label = "Anexar a expediente";
	}
	if(buttonexteriorR != null)
	{
		buttonexteriorR.label = "Anexar a referencia";
	}
	if(acabado)
	{		
		myPanel.label = "Anexar a expediente";
		myPanel.disabled = false;
		if(buttonexterior != null)
		{
			buttonexterior.label = "Anexar a expediente";
			buttonexterior.disabled = false;
		}
		myPanel2.label = "Anexar a referencia";
		myPanel2.disabled = false;
		if(buttonexteriorR != null)
		{
			buttonexteriorR.label = "Anexar a referencia";
			buttonexteriorR.disabled = false;
		}
	}
	
	var boolPref = Services.prefs.getBoolPref("mailnews.sendInBackground");
	
	if(boolPref == false)
	{
		Services.prefs.setBoolPref("mailnews.sendInBackground",true);
	}
}

var funciones = 
{
	SaveMail: function (tAnex)
	{
		if ((gFolderDisplay != null) && (gFolderDisplay.selectedCount > 0)) 
		{
			acabado = false;
			try
			{
				tipoAnexado = tAnex;
				if(tipoAnexado == "ANEXAREMAIL")
				{
					myPanel.label = "Anexando...";
					myPanel.disabled = true;
											
					if(buttonexterior != null)
					{
						buttonexterior.label = "Anexando...";
						buttonexterior.disabled = true;
					}
				}else
				{
					myPanel2.label = "Anexando...";
					myPanel2.disabled = true;
											
					if(buttonexterior != null)
					{
						buttonexteriorR.label = "Anexando...";
						buttonexteriorR.disabled = true;
					}
				}		
				
				messageHeader = gFolderDisplay.selectedMessage;				
				var content = ""; 
				var MessageURI = gFolderDisplay.selectedMessageUris[0]; 
				var MessageURIString = MessageURI.toString().toUpperCase();
				var MsgService = messenger.messageServiceFromURI(MessageURI);
				var MsgStream = Components.classes["@mozilla.org/network/sync-stream-listener;1"].createInstance(); 
				var ScriptInput = Components.classes["@mozilla.org/scriptableinputstream;1"].createInstance(); 
				var ScriptInputStream = ScriptInput.QueryInterface(Components.interfaces.nsIScriptableInputStream); 
				ScriptInputStream.init(MsgStream); 
				try 
				{ 
					MsgService.streamMessage(MessageURI,MsgStream, msgWindow, null, false, null); 
				} 
				catch (ex) 
				{ 
					consoleOverlay.logStringMessage("Error: "+ex);
				} 
				ScriptInputStream.available(); 
				while (ScriptInputStream.available()) 
				{ 
					content = content + ScriptInputStream.read(512); 
				} 
			}catch(ex)
			{
				consoleOverlay.logStringMessage("ErrorOverlay.js: "+ex);
			}
			
			try
			{
				time.setTime((gFolderDisplay.selectedMessage.date/1000));
			}catch(ex)
			{
				consoleOverlay.logStringMessage("Error. "+ex);
				time = "empty";
			}
			subject = gFolderDisplay.selectedMessage.mime2DecodedSubject;
			if(subject.length<1)
			{
				subject = "empty";
			}
						
			recipients = gFolderDisplay.selectedMessage.mime2DecodedRecipients;
			if(recipients.length<1)
			{
				recipients = "empty";
			}
						
			autor = gFolderDisplay.selectedMessage.mime2DecodedAuthor;
			if(autor.length<1)
			{
				autor = "empty";
			}
						
			try
			{
				if((MessageURIString.search("SENT")==-1)&&(MessageURIString.search("ENVIADO")==-1)&&
				(MessageURIString.search("ENVIADOS")==-1)&&(MessageURIString.search("SEND")==-1)&&
				(MessageURIString.search("ENVIATS")==-1)&&(MessageURIString.search("ENVIAT")==-1)&&
				(MessageURIString.search("OUTBOX")==-1))
				{
					guardarEmail("emailguardado.eml", content);
				}else
				{	
					var auxSend = recipients;
					
					recipients = autor;
					autor = auxSend;
					guardarEmail("emailguardadoE.eml", content);
				}
			}catch(ex)
			{
				consoleOverlay.logStringMessage("Error: " + ex);
			}
		}
	}
}

function guardarEmail(filename, data)
{
	var file2 = Components.classes["@mozilla.org/file/directory_service;1"].getService(Components.interfaces.nsIProperties).get("TmpD", Components.interfaces.nsIFile);
	pathtemp = file2.path;
	pathemail = pathtemp + "\\" + filename;
		
	var file = Components.classes["@mozilla.org/file/local;1"].createInstance(Components.interfaces.nsIFile);
	file.initWithPath(pathemail);

	var foStream = Components.classes["@mozilla.org/network/file-output-stream;1"].createInstance(Components.interfaces.nsIFileOutputStream);
	foStream.init(file, 0x02 | 0x08 | 0x20, 0666, 0); 
	foStream.write(data, data.length);
	foStream.close();
	
	ejecutarProgramaGuardado();
}

function ejecutarProgramaGuardado()
{		
	var result = autor.search("<");
	if (result == -1)
	{
		email = autor;
	}else
	{
		email =  autor.substring((result + 1),(autor.length - 1));
		var aux = autor.substring(0,(result - 1));
		autor = aux;
		if (email.length < 1)
		{
			email = "empty";
		}
	}

	var encontrado = false;
	var aux = "";
	var i= pathtemp.toString().length - 1;
	var anyadirAppdata = "";
		
	do
	{
		if ((pathtemp[i] == "\\") || (i==0))
		{
			encontrado = true;
		}else
		{
			i = i - 1;
		}	
	}while(encontrado ==  false);
		
	if (i > 0)
	{
		aux = pathtemp.substring(i+1,(pathtemp.length));
		
		if (aux != "Temp")
		{
			anyadirAppdata = "\\"+aux+"\\";	
		}
	}
	
	var pathAppData = buscarKMDDEtxt();	
	var file = Components.classes["@mozilla.org/file/local;1"].createInstance(Components.interfaces.nsIFile);
	file.initWithPath(pathAppData);

	if (file.exists())
	{
		var istream = Components.classes["@mozilla.org/network/file-input-stream;1"].createInstance(Components.interfaces.nsIFileInputStream);
		istream.init(file, 0x01, 0444, 0);
		istream.QueryInterface(Components.interfaces.nsILineInputStream);

		var line = {}, linea,hasmore;
		var fin = false;
		var resultbusq
		var pathapp = ""; 
		do 
		{
			hasmore = istream.readLine(line);
			linea = line.value;

			resultbusq = linea.search("APP_PATH");
			if(resultbusq != - 1) 
			{
				fin = true;
				pathapp = linea.substring((linea.search("=") + 1), linea.length) + "\\GuardarEmail.exe";
			}	  
		} while((hasmore)&&(fin==false));

		istream.close();

		if(autor == null || autor == "" || autor.length < 1) autor = "Sin autor";
			
		var file = Components.classes["@mozilla.org/file/local;1"].createInstance(Components.interfaces.nsIFile);
		file.initWithPath(pathapp);
				
		var process = Components.classes["@mozilla.org/process/util;1"].createInstance(Components.interfaces.nsIProcess);
		process.init(file);
		
		var auxTimeString = time.getDate() + "/" + (time.getMonth() + 1) + "/" + time.getFullYear() + " " + time.getHours() + ":" + time.getMinutes();
				
		var args = [pathemail, email, recipients, auxTimeString, autor, subject, 1, tipoAnexado];
		
		consoleOverlay.logStringMessage("Params: " + args);
		
		process.run(false, args, args.length);
		
		acabado = true;
		
		admintags.anyadirtag(messageHeader);
	}else
	{
		consoleOverlay.logStringMessage("El fichero de appdata no existe: " + file.path);
	}
}

function buscarKMDDEtxt()
{
	var fRuta = Components.classes["@mozilla.org/file/directory_service;1"].getService(Components.interfaces.nsIProperties).get("TmpD", Components.interfaces.nsIFile);
	var pathTL = fRuta.path;
	
	var encontrado = false;
	var auxiliar = "";
	var x = pathTL.toString().length - 1;
	var addAppData = "";
							
	do
	{
		if ((pathTL[x] == "\\") || (x == 0))
		{
			encontrado = true;
		}else
		{
			x--;
		}
	}while(encontrado ==  false);
				
	if (x > 0)
	{
		auxiliar = pathTL.substring(x + 1, (pathTL.length));
		if (auxiliar != "Temp")
		{
			addAppData = "\\" + auxiliar + "\\";		
		}
	}

	var index = pathTL.search("AppData");
	var appData = pathTL.substring(0, (index+8)) + "Roaming\\Kmaleon\\" + addAppData + "KMDDE.txt";
	
	var fileCheck = Components.classes["@mozilla.org/file/local;1"].createInstance(Components.interfaces.nsIFile);
	fileCheck.initWithPath(appData);
	
	if(!fileCheck.exists()){
		appData = pathTL + "\\KMDDE.txt";
	}
	
	consoleOverlay.logStringMessage("Ruta KMDDE: " + appData);
	
	return appData;
}