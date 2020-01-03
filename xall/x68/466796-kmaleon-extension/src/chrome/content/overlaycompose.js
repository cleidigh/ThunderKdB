Components.utils.import("resource://gre/modules/NetUtil.jsm");
Components.utils.import("chrome://kmaleonext/content/modules/leerID.jsm");

var consoleOverlayCompose = Components.classes['@mozilla.org/consoleservice;1'].getService(Components.interfaces.nsIConsoleService);
var i = 0;
var leido = false; 
var codigoasunto = ""; 
var button_enviar = document.getElementById("button-send");
var toolbar_compose = document.getElementById("composeToolbar2");
var intervalEnviar = "";
var accountdefaultC =  Services.prefs.getCharPref("mail.accountmanager.defaultaccount");
var accountdefaultidentityC =  Services.prefs.getCharPref("mail.account." + accountdefaultC + ".identities");
var intervalActivado = true;
var intentandoEnviar = false;
var contIntEnviados = 1;
var hayCuerpo = false;
var cuerpoPegado = true;
var enviarDirecto = false;
var pathDoc = "";
var IDProgMsg = ""; 
var rutaFichConf = "";
var cuerpoListo = false
var interval;


var myStateListenerCompose = { 
  NotifyComposeFieldsReady: function() {
	  consoleOverlayCompose.logStringMessage("CAMPOS CARGADOS");
  },

  NotifyComposeBodyReady: function() {	  
		
		consoleOverlayCompose.logStringMessage("CUERPO LISTO");	
		cuerpoListo = true;
		
		consoleOverlayCompose.logStringMessage("hayCuerpo:" + hayCuerpo + "-cuerpoPegado:" + cuerpoPegado + "-leido:" + leido);
		if(hayCuerpo && !cuerpoPegado && leido)
		{
			cargarCuerpo();
			
			if(leido && enviarDirecto) 
			{
				intervalEnviar = window.setInterval(
										function() {
											enviarMens(); 
										}, 100);
			}
		}else
		{
			consoleOverlayCompose.logStringMessage("Aun no se ha leido el cuerpo del fichero de datos.");	
		}
  },

  ComposeProcessDone: function(aResult) {
  },

  SaveInFolderDone: function(folderURI) {
  }
};
		
window.addEventListener("load", function(e) {
	inicializar();
	startup(); 	
}, false);

var guardar = 
{
	autoasunto: function ()
	{
		try
		{
			consoleOverlayCompose.logStringMessage("GUARDAR AUTOASUNTO");
						
			var IDProgIguales = (leerIDProg(buscarKMDDEtxt()) == IDProgMsg) ? true : false;
			setIDProgIguales(IDProgIguales);
			
			if (codigoasunto.length > 0 && IDProgIguales)
			{
				Services.prefs.setCharPref("mail.identity." + accountdefaultidentityC + ".headers", "kmaleonheader");
				Services.prefs.setCharPref("mail.identity." + accountdefaultidentityC + ".header.kmaleonheader", "X-Kmaleon: " + codigoasunto);
			}else
			{
				Services.prefs.setCharPref("mail.identity." + accountdefaultidentityC + ".header.kmaleonheader", ""); //Edita la configuración de thunderbird
			}
			
		}catch(ex)
		{
			consoleOverlayCompose.logStringMessage("ErrorHeader: " + ex);
		}
	}
};

function inicializar()
{
	consoleOverlayCompose.logStringMessage("INICIALIZAR");
	
	i = 0;
	leido = false; 
	codigoasunto = "";  
	button_enviar = document.getElementById("button-send");
	button_enviar.command="cmd_sendButton";
	toolbar_compose = document.getElementById("composeToolbar2");
	intervalEnviar = "";
	intentandoEnviar = false;
	enviarDirecto = false;
	contIntEnviados = 1;
	hayCuerpo = false;
	cuerpoListo = false;
	gMsgCompose.RegisterStateListener(myStateListenerCompose);
}

function enviarMens()
{
	consoleOverlayCompose.logStringMessage("Enviando mensaje.");
	
    contIntEnviados++;
    if((contIntEnviados % 30) == 0)
    {
        contIntEnviados = 1;
        intentandoEnviar = false;
        window.clearInterval(intervalEnviar);
    }else
    {
		if(!button_enviar.disabled) 
		{
			if(intentandoEnviar)
			{
				window.clearInterval(intervalEnviar);
				intentandoEnviar = false;
			}else
			{
				guardar.autoasunto();
				intentandoEnviar = true;
				leido = false;
				
				try
				{
						goDoCommand('cmd_sendButton'); 
						if(rutaFichConf != ""){
							var fileConf = Components.classes["@mozilla.org/file/local;1"].createInstance(Components.interfaces.nsIFile);
							fileConf.initWithPath(rutaFichConf);
								
							var foStreamConf = Components.classes["@mozilla.org/network/file-output-stream;1"].createInstance(Components.interfaces.nsIFileOutputStream);
							foStreamConf.init(fileConf, 0x02 | 0x08 | 0x20, 0666, 0); 
									
							var converterConf = Components.classes["@mozilla.org/intl/converter-output-stream;1"].createInstance(Components.interfaces.nsIConverterOutputStream);
							converterConf.init(foStreamConf, "UTF-8", 0, 0);
							converterConf.writeString("");
							converterConf.close();
															
							rutaFichConf = "";
						}
						intentandoEnviar = false;
				}catch(ex)
				{
					consoleOverlayCompose.logStringMessage("ErrorEnviarEMAIL: " + ex);
				}
			} 
		}else
		{
			try
			{
				if(intentandoEnviar)
				{
					window.clearInterval(intervalEnviar);
					intentandoEnviar = false;
				} 
			}catch(ex)
			{
				consoleOverlayCompose.logStringMessage("ErrorEnviarEMAIL: " + ex);
			}
		}
	}
}

function startup() 
{
	consoleOverlayCompose.logStringMessage("ENTER STARTUP");
	
	try
	{
		if(!leido)
		{
			var asunto = "";
			asunto = document.getElementById("msgSubject").value
			
			consoleOverlayCompose.logStringMessage("Asunto recibido: " + asunto);
			
			var resultbusqueda = buscarString(asunto,"[KMALEON]"); 
			var resultbusqueda2 = buscarString(asunto,"[KMALEONOPEN]"); 
		
			if(resultbusqueda == 1) 
			{	
				consoleOverlayCompose.logStringMessage("MODO : [KMALEON]");
				leido = false
				cuerpoPegado = false;
				enviarDirecto = true;

				var nombre_temp = asunto.substring(resultbusqueda+8,asunto.length);
				leer_archivo(nombre_temp);
			}else
			{
				if(resultbusqueda2 == 1)
				{
					consoleOverlayCompose.logStringMessage("MODO : [KMALEONOPEN]");				
					leido = false;						
					cuerpoPegado = false;
				
					var nombre_temp = asunto.substring(resultbusqueda+14,asunto.length); 					
					leer_archivo(nombre_temp);					
				}
			}
			
			consoleOverlayCompose.logStringMessage("hayCuerpo:" + hayCuerpo + "-cuerpoListo:" + cuerpoListo + "-leido:" + leido + "-cuerpoPegado" + cuerpoPegado);								
			if(hayCuerpo && cuerpoListo && leido && !cuerpoPegado) 
			{
				cargarCuerpo();
			}
			
			consoleOverlayCompose.logStringMessage("hayCuerpo:" + hayCuerpo + "-cuerpoListo:" + cuerpoListo + "-cuerpoPegado" + cuerpoPegado + "-leido:" + leido + "-enviarDirecto:" + enviarDirecto);	
			if(((hayCuerpo && cuerpoListo && cuerpoPegado) || !hayCuerpo) && leido && enviarDirecto) 
			{
				intervalEnviar = window.setInterval(
										function() {
											enviarMens(); 
										}, 100);
			}				
		}
	}catch(ex)
	{
		consoleOverlayCompose.logStringMessage("ErrorCOMPOSE: " + ex);
	}
	
	consoleOverlayCompose.logStringMessage("EXIT STARTUP");
}

function cargarCuerpo()
{
	consoleOverlayCompose.logStringMessage("Cargando cuerpo del correo.");
	
	try
	{
		if(pathDoc != null && pathDoc != "")
		{
			var file2 = Components.classes["@mozilla.org/file/local;1"].createInstance(Components.interfaces.nsIFile);
			file2.initWithPath(pathDoc);
							
			var istream = Components.classes["@mozilla.org/network/file-input-stream;1"].createInstance(Components.interfaces.nsIFileInputStream);
			istream.init(file2, 0x01, 0444, 0);
			istream.QueryInterface(Components.interfaces.nsILineInputStream);

			var line = {};
			var linea = "";
			var hasmore = false;
			
			do 
			{
				hasmore = istream.readLine(line);
				linea += line.value + "\n";									
			} while(hasmore);

			istream.close();
			
			addTextToBody(linea);
		}
	}catch(ex){
		consoleOverlayCompose.logStringMessage("No se ha podido cargar el mensaje: " + ex);
	}
}

function addTextToBody(txt)
{
	consoleOverlayCompose.logStringMessage("Anyadiendo texto del cuerpo al correo.") 
	
	try 
	{
		if(txt === null || txt === "")
		{
			return  false;
		}
		var editor = GetCurrentEditor();  
		var editor_type = GetCurrentEditorType();  
		editor.beginTransaction();  
		editor.beginningOfDocument();   
		
		if( editor_type == "textmail" || editor_type == "text" ) 
		{
			editor.insertText(txt);  
			editor.insertLineBreak();  
		} else 
		{  
			editor.insertHTML( "<p>"+txt.replace(/(?:\r\n|\r|\n)/g, '<br />')+"</p>" );  
		}  
		editor.endTransaction(); 

		cuerpoPegado = true;	
	} catch(ex) {  
		consoleOverlayCompose.logStringMessage("Error anyadiendo texto al cuerpo: " + ex) 
		return false;  
	} 
}

function leer_archivo(ruta_archivo)
{
	consoleOverlayCompose.logStringMessage("Leyendo los datos obtenidos de Kmaleon.")
	
	Services.prefs.setCharPref("mail.identity." + accountdefaultidentityC + ".header.kmaleonheader", ""); 
	
	var file = Components.classes["@mozilla.org/file/local;1"].createInstance(Components.interfaces.nsIFile);
	file.initWithPath(ruta_archivo);
	
	var istream = Components.classes["@mozilla.org/network/file-input-stream;1"].createInstance(Components.interfaces.nsIFileInputStream);
	istream.init(file, 0x01, 0444, 0);
	istream.QueryInterface(Components.interfaces.nsILineInputStream);
	
	var line = {}, linea = "", hasmore = false;
	var resultbusq
	var flag = ""; 
	var contenido = ""; 
	
	do 
	{
		hasmore = istream.readLine(line);
		linea = line.value;

		if(linea)
		{
			resultbusq = linea.search("###");
			
			if(resultbusq != -1)
			{
				flag = linea.substring(0, resultbusq);
				if((resultbusq + 3) >= linea.length) 
				{
					contenido = "";
				}else
				{
					contenido = linea.substring((resultbusq + 3), linea.length);
				}
			}else
			{	
				flag = "NADA"; 
				contenido = linea;
			}
			
			switch(flag)
			{
				case "REPLYTO": 
					consoleOverlayCompose.logStringMessage("REPLYTO: " + contenido) 
					if(contenido.length > 4)
					{						
						gMsgCompose.compFields.replyTo = contenido;
					}					
					break;
				case "TO": 
					if(contenido.length > 4)
					{						
						consoleOverlayCompose.logStringMessage("TO: " + contenido);
						gMsgCompose.compFields.to = contenido						
					}					
					break;
				case "CC": 
					if(contenido.length > 4)
					{					
						consoleOverlayCompose.logStringMessage("CC: " + contenido);
						gMsgCompose.compFields.cc = contenido						
					}
					break;
				case "BCC":
					if(contenido.length > 4)
					{	
						consoleOverlayCompose.logStringMessage("BCC: " + contenido);
						gMsgCompose.compFields.bcc = contenido						
					}
					break;
				case "SUBJECT":
					consoleOverlayCompose.logStringMessage("SUBJECT: " + contenido);				
					document.getElementById("msgSubject").value = contenido;					
					break;
				case "ATTACHMENTS": 
					consoleOverlayCompose.logStringMessage("ATTACHMENTS: " + contenido);					
					if(contenido.length > 4)
					{
						try
						{
							var attach_list = contenido.split(",");
							
							for(var i=0; i < attach_list.length; i++)
							{
								if(attach_list[i].length > 4) 
								{
									var file_atach = Components.classes["@mozilla.org/file/local;1"].createInstance(Components.interfaces.nsIFile);									
									file.initWithPath(attach_list[i]);									
									AddAttachments([FileToAttachment(file)]);
								}
							}
						}catch(ex)
						{
							consoleOverlayCompose.logStringMessage("Error: " + ex);
						}
					}
					break;
				case "BODY":
				case "CUERPO":
					consoleOverlayCompose.logStringMessage("BODY: " + contenido);	
					if(contenido.length > 0)
					{
						try
						{						
							pathDoc = contenido;
							hayCuerpo = true
						}catch(ex)
						{
							pathDoc =  "";
							consoleOverlayCompose.logStringMessage("Error al leer el cuerpo del email: " + ex);
						}
					}					
					break;
				case "CODIGOASUNTO":
					consoleOverlayCompose.logStringMessage("CODIGOASUNTO: " + contenido);				
					if(contenido.length > 1)
					{									
						codigoasunto = contenido;						
					}
					break;
				case "IDPROGRAMA": 
					consoleOverlayCompose.logStringMessage("IDPROGRAMA: " + contenido);				
					if(contenido.length > 0)
					{
						IDProgMsg = extraeCadenaAleatoria(contenido);						
					}
					break;
				case "FICHCONFIRMACION": 
					consoleOverlayCompose.logStringMessage("FICHCONFIRMACION: " + contenido);				
					if(contenido.length > 0)
					{
						rutaFichConf = contenido;						
					}
					break;			
			}
		}		
	} while (hasmore);
	istream.close();
	leido = true;
	
	consoleOverlayCompose.logStringMessage("Fin de la lectura de los datos de Kmaleon.");
}

function buscarString(cadena_origen, cadena_buscar)
{	
	var i=0;
	if(cadena_origen.length <= 0 || cadena_buscar.length <= 0) 
	{
		return -1;
	}
	if(cadena_origen.length<cadena_buscar.length)
	{
		return -1;
	}
	
	do
	{
		if(cadena_origen[i] == cadena_buscar[i])
		{
			i++;
		}else
		{
			return -1;
		}		
	}while(i<cadena_buscar.length&&i<cadena_origen.length);

	return 1;
}

function buscarKMDDEtxt()
{
	try{
		var fRuta = Components.classes["@mozilla.org/file/directory_service;1"].getService(Components.interfaces.nsIProperties).get("TmpD", Components.interfaces.nsIFile);
		var pathTL = fRuta.path;				
		var encontrado = false;
		var auxiliar = "";
		var x = pathTL.toString().length - 1;
		var addAppData = "";
								
		do
		{
			if((pathTL[x] == "\\") || (x == 0))
			{
				encontrado = true;
			}else
			{
				x--;
			}
		}while(encontrado ==  false);
		
				
		if(x>0)
		{
			auxiliar = pathTL.substring(x+1,(pathTL.length));
			if (auxiliar != "Temp")
			{
				addAppData = "\\" + auxiliar + "\\";
			}
		}					
		var index = pathTL.search("AppData");
		var appData = pathTL.substring(0, (index+8)) + "Roaming\\Kmaleon\\" + addAppData + "KMDDE.txt";
		
		return appData
	}catch(ex)
	{
		consoleOverlayCompose.logStringMessage("Error: " + ex);
	}
}

function leerIDProg(pathAppData)
{
	try{
		var file3 = Components.classes["@mozilla.org/file/local;1"].createInstance(Components.interfaces.nsIFile);
		file3.initWithPath(pathAppData);
				
		var istream = Components.classes["@mozilla.org/network/file-input-stream;1"].createInstance(Components.interfaces.nsIFileInputStream);
		istream.init(file3, 0x01, 0444, 0);
		istream.QueryInterface(Components.interfaces.nsILineInputStream);
		
		var line = {}, linea,hasmore;
		var fin = false;
		var resultbusq
		var idprog = "";
		do 
		{
			hasmore = istream.readLine(line);
			linea = line.value;
			resultbusq = linea.search("IDTIPOPROGRAMA");
			if(resultbusq != -1) 
			{
				fin = true;
				idprog = linea.substring((linea.search("=")+1),linea.length);
			}
			  
		}while((hasmore)&&(fin==false));
		istream.close();
		
		return extraeCadenaAleatoria(idprog);
	}catch(ex)
	{
		consoleOverlayCompose.logStringMessage("Error: " + ex);
	}
}

function extraeCadenaAleatoria(cadenaAleatoria)
{
	var i = 0;
	var cadena = "";
	for (i = 11; i <= cadenaAleatoria.length; i++)
	{
		if(i % 2 != 0)
		{
			cadena += cadenaAleatoria.substr(i, 1);
		}
	}
	return cadena;
}