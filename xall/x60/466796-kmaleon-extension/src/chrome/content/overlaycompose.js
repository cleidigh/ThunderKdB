Components.utils.import("resource://gre/modules/NetUtil.jsm");
Components.utils.import("chrome://kmaleonext/content/modules/leerID.jsm");

var consoleOverlayCompose = Components.classes['@mozilla.org/consoleservice;1'].getService(Components.interfaces.nsIConsoleService);
var i = 0;
var aleat = Math.floor((Math.random()*10)+1);
var leido = false; //Se utiliza para saber cuando se ha acabado de leer todos los .txt
var leiendo = false;
var contador = 0;
var fecha2 = new Date();
var solo_cargar = false; //Estara a false si se quiere enviar el mensaje automatico, true si solo hay que cargar el mensaje.
var codigoasunto = "";  //Para saber el codigo del asunto.
var button_enviar = document.getElementById("button-send");
var toolbar_compose = document.getElementById("composeToolbar2");
var timeC = new Date();	
var subjectC = "empty";
var recipientsC = "empty";
var autorC = "empty";
var emailC = "empty";
var body = "";
var pathC = "";
var pathTempC = "";
var intervalEnviar = "";
var intervalEnviarDraft = "";
var pathemailC = "";
var kmaleon = false;
var kmaleonopen = false;
var accountdefaultC =  Services.prefs.getCharPref("mail.accountmanager.defaultaccount");
var accountdefaultidentityC =  Services.prefs.getCharPref("mail.account." + accountdefaultC + ".identities");
var emailNormal = true; //Si es un email que no interviene el usuario.
var contFocus = 0;
var enviardirecto = false;
var intervalActivado = true;
var intentandoEnviar = false;
var contIntEnviados = 1;
var contIntEnviadosDraft = 1;
var guardarEnDraft = false;
var intentandoEnviarDraft = false;
var hayCuerpo = false;
var startupActivo = false;
var cuerpoPegado = true;
var pathDoc = "";
var IDProgMsg = ""; //Para saber de dnd  viene el msg.
var rutaFichConf = "";

var myStateListenerCompose = { //Lista de eventos que se pueden utilizar en el compose
  NotifyComposeFieldsReady: function() {
  },

  NotifyComposeBodyReady: function() {	  
		var stringExport = "";
		var file2 = Components.classes["@mozilla.org/file/local;1"].createInstance(Components.interfaces.nsIFile);
		var stringExport2 = "";
		
		try{
			if(pathDoc != null && pathDoc != ""){
				file2.initWithPath(pathDoc);
				NetUtil.asyncFetch(file2, function(inputStream, status) {
					if (!Components.isSuccessCode(status)) {
						return "";
					}
							 
					stringExport = NetUtil.readInputStreamToString(inputStream, inputStream.available());
				
					if(stringExport.length > 0){			
						stringExport2 = stringExport;
					}
					addTextToBody(stringExport);
					return stringExport2;
				});
			}
		}catch(ex){
			consoleOverlayCompose.logStringMessage("No se ha podido cargar el mensaje: " + ex);
		}
  },

  ComposeProcessDone: function(aResult) {
  },

  SaveInFolderDone: function(folderURI) {
  }
};


var interval = window.setInterval(
		function() {
			startup(); 
		}, 100);
		
window.addEventListener("load", function(e) {
	inicializar(); 
}, false);
window.addEventListener("focus", function(e) { 
        abiertoCompose(); 
}, false);
window.addEventListener("close", function(e) { 
	cerradoCompose(); 
}, false);
window.addEventListener("open", function(e) { 
	cerradoCompose(); 
}, false);
window.addEventListener("input", function(e) 
{
    try
    {        
        var subj = document.getElementById("msgSubject").value;
        var subj2 = "";
        if (gMsgCompose != null) subj2 = gMsgCompose.compFields.subject;
        if((intervalActivado == false) && ((buscarString(subj2,"[KMALEONSEND]") == 1) || (buscarString(subj2,"[KMALEONEDIT]") == 1) 
                || (buscarString(subj2,"[date=") == 1) || (buscarString(subj2,"[KMALEON]") == 1) || (buscarString(subj2,"[KMALEONOPEN]") == 1) || (buscarString(subj2,"[KMALEONDATE=") == 1)))
        {
            guardarEnDraft = false;
            intervalActivado = true;
            contador = 0;
            interval = window.setInterval(
                   function() {
                           startup(); 
                   }, 100); 
        }
    }catch (ex)
    {
        consoleOverlayCompose.logStringMessage(ex);
    }
}, false);

function abiertoCompose()
{
	if(contFocus == 0)
	{
		contFocus++;
		codigoasunto = ""; 
	}
}
	
function cerradoCompose()
{
	contFocus = 0;
	inicializar();
}

var guardar = 
{
	autoasunto: function ()
	{
		try
		{
			if(button_enviar.disabled == false)
			{
				contFocus = 0;
			}	
			
			//Comparamos el ID de programa que hay en el KMDDE con el que nos ha venido anteriormente en el correo electrónico que vamos a enviar y nos guardamos el resultado de la comparación en una
			//variables global para saber más tarde si debemos autoanexar o no cuando el correo entre en la bandeja de enviados.
			var IDProgIguales = (leerIDProg(buscarKMDDEtxt()) == IDProgMsg) ? true : false;
			setIDProgIguales(IDProgIguales);
			
			if (codigoasunto.length > 0 && !emailNormal && IDProgIguales)
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
}

function inicializar()
{
	i = 0;
	aleat = Math.floor((Math.random()*10)+1);
	leido = false; //Se utiliza para saber cuando se ha acabado de leer todos los .txt
	leiendo = false;
	contador = 0;
	fecha2 = new Date();
	solo_cargar = false; //Estara a false si se quiere enviar el mensaje automatico, true si solo hay que cargar el mensaje.
	codigoasunto = "";  //Para saber el codigo del asunto
	button_enviar = document.getElementById("button-send");
	button_enviar.command="cmd_sendButton";
	toolbar_compose = document.getElementById("composeToolbar2");
	timeC = new Date();	
	subjectC = "empty";
	recipientsC = "empty";
	autorC = "empty";
	emailC = "empty";
	pathC = "";
	pathTempC = "";
	intervalEnviar = "";
	pathemailC = "";
	kmaleon = false;
	kmaleonopen = false;
	emailNormal = true;
	contFocus = 0;
	enviardirecto = false;
	intentandoEnviar = false;
	intentandoEnviarDraft = false;
	contIntEnviados = 1;
	contIntEnviadosDraft = 0;
	guardarEnDraft = false;
	intervalEnviarDraft = "";
	hayCuerpo = false;
	startupActivo = false;
	gMsgCompose.RegisterStateListener(myStateListenerCompose);

}

/**
 * Envia el mensaje.
 */
function enviarMens()
{
    contIntEnviados++;
    if((contIntEnviados % 30) == 0)
    {
        contIntEnviados = 1;
        intentandoEnviar = false;
        window.clearInterval(intervalEnviar);
    }else
    {
	if(!button_enviar.disabled) //Cuando guarda en draft desactiva el boton de enviar por lo tanto se envia cuando se haya guardado
	{
            if(intentandoEnviar)
            {
                window.clearInterval(intervalEnviar);
                intentandoEnviar = false;
            }else
            {
				guardar.autoasunto();
                intentandoEnviar = true;
                leiendo = false;
                leido = false;
                try
                {
                        contFocus = 0;
                        goDoCommand('cmd_sendButton'); //Si no hay conexion lo enviara despues
						if(rutaFichConf != ""){
							//En modo automático crearemos aquí un archivo vacío para avisar a kmaleon de que ya hemos realizado el envio y que ya puede modificar los archivos de comunicación si quiere.
							var fileConf = Components.classes["@mozilla.org/file/local;1"].createInstance(Components.interfaces.nsIFile);
							fileConf.initWithPath(rutaFichConf);
								
							var foStreamConf = Components.classes["@mozilla.org/network/file-output-stream;1"].createInstance(Components.interfaces.nsIFileOutputStream);
							foStreamConf.init(fileConf, 0x02 | 0x08 | 0x20, 0666, 0); 
									
							var converterConf = Components.classes["@mozilla.org/intl/converter-output-stream;1"].createInstance(Components.interfaces.nsIConverterOutputStream);
							converterConf.init(foStreamConf, "UTF-8", 0, 0);
							converterConf.writeString("");
							converterConf.close();
															
							//Limpiamos la ruta dnd tenemos que dejar el fichero por si las moscas, para que no se pise con la siguiente
							rutaFichConf = "";
						}
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

function enviarMensDraft()
{
    contIntEnviadosDraft++;
    if((contIntEnviadosDraft % 30) == 0)
    {
        contIntEnviadosDraft = 1;
        intentandoEnviar = false;
        window.clearInterval(intervalEnviarDraft);
    }else
    {
		if(!button_enviar.disabled) //Cuando guarda en draft desactiva el boton de enviar por lo tanto se envia cuando se haya guardado.
		{
			if(intentandoEnviarDraft)
			{
					window.clearInterval(intervalEnviarDraft);
					intentandoEnviarDraft = false;
					window.close();
			}else
			{
				intentandoEnviarDraft = true;
				leiendo = false;
				leido = false;
				try
				{
						contFocus = 0;
						SaveAsDraft(); //Envia el email a borradores
				}catch(ex)
				{
					consoleOverlayCompose.logStringMessage("ErrorEnviarEMAILDRAFT: " + ex);
				}
			} 
		}else
		{
			try
			{
				if(intentandoEnviarDraft)
				{
					window.clearInterval(intervalEnviarDraft);
					intentandoEnviarDraft = false;
					window.close();
				}
				  
					
			}catch(ex)
			{
				consoleOverlayCompose.logStringMessage("ErrorEnviarEMAILDRAFT: " + ex);
			}
        }
    }
}

function startup() //Parece que la funcion startup se ejecuta cada vez que se carga el js
{
	if (!startupActivo && !leiendo)
	{
		startupActivo = true
	
		try
		{
			if(!leido&&!leiendo)
			{
				contador++;
				if(contador > 30) //Por si se entra en compose y no es de kmaleon para que no se este el evento todo el rato funcionando.
				{
					contador = 0;
					window.clearInterval(interval);	
					intervalActivado = false;
				}
				
				var asunto = "";
				asunto = document.getElementById("msgSubject").value

				//Todas las etiquetas tienen que estar al principio del asunto!
				var resultbusqueda = buscarString(asunto,"[KMALEON]"); //Envio automatico  
				var resultbusqueda2 = buscarString(asunto,"[KMALEONOPEN]"); //Cargar el email pero no enviarlo automaticamente
				var resultbusqueda3 = buscarString(asunto,"[KMALEONSEND]"); //Envia el email avierto (abriendo .eml)
				var resultbusqueda4 = buscarString(asunto,"[KMALEONEDIT]"); //Edita el email avierto (abriendo .eml)
				var resultbusqueda5 = buscarString(asunto,"[date="); //Envia el email actual si toca por fecha ya que sino se podra editar el mensaje
				var resultbusqueda6 = buscarString(asunto,"[KMALEONDATE="); //Enviara el mensaje a la carpeta de draft substituyendo "KMALEONDATE" por "date" para su envio correspondiente
			
				if(resultbusqueda == 1 && !leiendo) //Si ha encontrado lo del kamaleon para leerlo del archivo y enviarlo automaticamente
				{	
					emailNormal = false;
					kmaleon = true;
					solo_cargar = false; //Para cargar y enviar el mail.
					leiendo = true;
					leido = false
					enviardirecto = true;
					cuerpoPegado = false;

					var nombre_temp = asunto.substring(resultbusqueda+8,asunto.length); //Nombre del archivo que tendremos que buscar en el temporal
					leer_archivo(nombre_temp);
				}else
				{
					if(resultbusqueda2 == 1 && !leiendo)//Leemos el archivo de email y lo dejamos para editar
					{
						emailNormal = false;
						kmaleonopen=true;						
						leido = false;
						solo_cargar = true; //Para cargar y NO enviar el mail
						leiendo = true;
						cuerpoPegado = false;
					
						var nombre_temp = asunto.substring(resultbusqueda+14,asunto.length); //Nombre del archivo que tendremos que buscar en el temporal
						leer_archivo(nombre_temp);						
					}else
					{
							if(resultbusqueda3 == 1 && !leiendo)//Abrimos y enviamos el email
							{								
								enviardirecto = true;
								document.getElementById("msgSubject").value = asunto.replace("[KMALEONSEND]","");
								window.clearInterval(interval);	
								intervalActivado = false;   
								intervalEnviar = window.setInterval(
														function() {
																enviarMens(); 
														}, 100);
							}else
							{
								if(resultbusqueda4 == 1 && !leiendo) //Abrimos el email para poder editarlo
								{
									document.getElementById("msgSubject").value = asunto.replace("[KMALEONEDIT]","");
									window.clearInterval(interval);	
									intervalActivado = false;
								}else
								{
									if(resultbusqueda5 == 1 && !leiendo)//Envio retardado, si la fecha de envio es anterior a la actual se envia
									{
										var fecha_Actual = new Date();
										var resultS = asunto.search("]");
										var fecha_Envio = new Date(asunto.substring(6,resultS));
										
										if(fecha_Actual.getTime() > fecha_Envio.getTime())
										{
											gMsgCompose.compFields.subject = asunto.replace(asunto.substring(0,(resultS+1)),"");
											document.getElementById("msgSubject").value = gMsgCompose.compFields.subject;
											window.clearInterval(interval);	
											intervalActivado = false;

											intervalEnviar = window.setInterval(
											function() {
													enviarMens(); 
											}, 100);
										}else
										{
											//Se podria quitar la etiqueta de fecha pero si se quita la fecha del asunto y le da por volver a guardarlo en draft ya no se enviaria automaticamente.
											window.clearInterval(interval);	
											intervalActivado = false;
										}
									}else
									{
										if((resultbusqueda6 == 1) && !leiendo)//Leer archivo y añadirlo a borradores para el envio retardado.
										{
											enviardirecto = true;
											if(gMsgCompose != null)	gMsgCompose.compFields.subject = asunto.replace("KMALEONDATES","date");
											document.getElementById("msgSubject").value = asunto.replace("KMALEONDATE","date");
											intervalEnviarDraft = window.setInterval(
																		function() {
																						enviarMensDraft(); 
																		}, 100);                                                         
										}
									}
								}
							}
					}
				}
			}else
			{
				contador++;
				if(contador>30) //Por si se entra en compose y no es de kmaleon para que no se este el evento todo el rato funcionando.
				{
						contador = 0;
						window.clearInterval(interval);	
						intervalActivado = false;
				}

				var destinatario = document.getElementById("addressCol2#1").value;
				if(hayCuerpo && !leiendo && leido && !cuerpoPegado && !enviardirecto && destinatario.length >  4)
				{
					cuerpoPegado = true;
					SetMsgBodyFrameFocus(); //Para poner el focus al body?							
				}
				if(destinatario.length >  4 && !button_enviar.disabled && enviardirecto && !leiendo && leido)
				{
					window.clearInterval(interval);
					intervalActivado = false;

					
					if(hayCuerpo && !cuerpoPegado)
					{
						cuerpoPegado = true
						SetMsgBodyFrameFocus(); //Para poner el focus al body?
					}
					
					if(!solo_cargar && !guardarEnDraft)
					{
							intervalEnviar = window.setInterval(
													function() {
															enviarMens(); 
													}, 100); 	
					}else
					{
						if(guardarEnDraft) //Guarda el email en draft
						{
							guardarEnDraft = false;
							intervalEnviarDraft = window.setInterval(
														function() {
																enviarMensDraft(); 
														}, 100);
						}
					}
				}
			}
		}catch(ex)
		{
			consoleOverlayCompose.logStringMessage("ErrorCOMPOSE: " + ex);
			contador++;
			if(contador > 30) //Por si se entra en compose y no es de kmaleon para que no se este el evento todo el rato funcionando.
			{
				contador = 0;
				window.clearInterval(interval);	
				intervalActivado = false;
			}
		}
		startupActivo = false
	}
}

function addTextToBody(txt){
	try {
		if(txt === null || txt === "")
		{
			body = "";
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
		body = "";
	} catch(ex) {  
		consoleOverlayCompose.logStringMessage("Error añadiendo texto al cuerpo: " + ex) 
		body = "";
		return false;  
	} 
}

//Lee el archivo y añade los campos leidos.
function leer_archivo(ruta_archivo)
{
	//Quitamos el valor del autoasunto
	Services.prefs.setCharPref("mail.identity." + accountdefaultidentityC + ".header.kmaleonheader", ""); 
	
	//Leemos el archivo de configuracion linea a linea.		
	var file = Components.classes["@mozilla.org/file/local;1"].createInstance(Components.interfaces.nsIFile);
	file.initWithPath(ruta_archivo);
	
	var istream = Components.classes["@mozilla.org/network/file-input-stream;1"].createInstance(Components.interfaces.nsIFileInputStream);
	istream.init(file, 0x01, 0444, 0);
	istream.QueryInterface(Components.interfaces.nsILineInputStream);
	
	var line = {}, linea,hasmore;
	var resultbusq
	var pathapp = ""; //Aquí se inicializara el path dnd esta el .exe que trata a los emails.
	var flag = ""; //Es la parte de texto que hay delante de ###
	var contenido = ""; //Aquí se guarda lo que hay despues de ###
	
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
				if((resultbusq + 3) >= linea.length) //Si no hay nada a la derecha de ###
				{
					contenido = "";
				}else
				{
					contenido = linea.substring((resultbusq + 3), linea.length);
				}
			}else
			{	
				flag = "NADA"; //Para que no entre en ningun case
				contenido = linea;
			}
			
			switch(flag)
			{
				case "REPLYTO": //Para escoger a quien quieres que responda
					if(contenido.length > 4)
					{
						//consoleOverlayCompose.logStringMessage("REPLYTO: " + contenido);
						gMsgCompose.compFields.replyTo = contenido;
					}
					break;
				case "TO": //Emails en una lista separada por ","
					if(contenido.length > 4)
					{
						//consoleOverlayCompose.logStringMessage("TO: " + contenido);
						gMsgCompose.compFields.to = contenido;
					}
					break;
				case "CC": 
					if(contenido.length > 4)
					{
						//consoleOverlayCompose.logStringMessage("CC: " + contenido);
						gMsgCompose.compFields.cc = contenido;
					}
					break;
				case "BCC":
					if(contenido.length > 4)
					{
						//consoleOverlayCompose.logStringMessage("BCC: " + contenido);
						gMsgCompose.compFields.bcc = contenido;
					}
					break;
				case "SUBJECT": //Añadirlo al asunto y yasta
					//consoleOverlayCompose.logStringMessage("SUBJECT: " + contenido);
					document.getElementById("msgSubject").value = contenido;
					 if(buscarString(contenido,"[KMALEONDATE=") == 1)
					 {
						 guardarEnDraft = true;
						 document.getElementById("msgSubject").value = contenido.replace("KMALEONDATE", "date");
					 }
					break;
				case "ATTACHMENTS": //Idem
					//consoleOverlayCompose.logStringMessage("ATTACHMENTS: " + contenido);
					if(contenido.length > 4)
					{
						try
						{
							var attach_list = contenido.split(",");
							
							for(var i=0; i < attach_list.length; i++)
							{
								if(attach_list[i].length > 4) //Para quitar posibles errores.
								{
									var file_atach = Components.classes["@mozilla.org/file/local;1"].createInstance(Components.interfaces.nsIFile);
									//consoleOverlayCompose.logStringMessage(attach_list[i]);
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
					//consoleOverlayCompose.logStringMessage("BODY: " + contenido);
					if(contenido.length > 0)
					{
						try
						{
							//Aqui se inicializa el path del doc y cuando se ha inicializado el mensaje ya se inserta al cuerpo
							pathDoc = contenido;
							hayCuerpo = true
						}catch(ex)
						{
							pathDoc =  "";
							body = "ERROR AL LEER EL CUERPO";
							consoleOverlayCompose.logStringMessage("Error al leer el cuerpo del email: " + ex);
						}
					}					
					break;
				case "CODIGOASUNTO": //Este codigo se utilizara para saber si viene de kmaleon o no, y saber que codigo de asunto tiene
					//consoleOverlayCompose.logStringMessage("CODIGOASUNTO: " + contenido);
					if(contenido.length > 1)
					{									
						codigoasunto = contenido;
						//consoleOverlayCompose.logStringMessage("El codigo de asunto es: " + codigoasunto);
					}
					break;
				case "IDPROGRAMA": //Este codigo se utilizara para saber si viene de kmaleon o no, y saber que codigo de asunto tiene
					//consoleOverlayCompose.logStringMessage("IDPROGRAMA: " + contenido);
					if(contenido.length > 0)
					{
						IDProgMsg = extraeCadenaAleatoria(contenido);						
					}
					break;
				case "FICHCONFIRMACION": //Esta será la ruta del fichero de confirmación que indicará a Kmaleon que ya hemos terminado de enviar el correo.
					//consoleOverlayCompose.logStringMessage("FICHCONFIRMACION: " + contenido);
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
	leiendo = false;
}

function buscarString(cadena_origen, cadena_buscar) //La cadena origen es la cadena donde se quiere buscar y la cadena_buscar es la cadena que se quiere buscar
{	
	var i=0;
	if(cadena_origen.length <= 0 || cadena_buscar.length <= 0) //Las dos cadenas tienen que ser mas grandes que 0
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
		//Leemos el archivo de configuracion linea a linea.
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