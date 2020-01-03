var consolemW = Components.classes['@mozilla.org/consoleservice;1'].getService(Components.interfaces.nsIConsoleService);
var intervalMW = null;
var contador = 0;

window.addEventListener("load", function(e) {    
    intervalMW = window.setInterval(
						function() {
							comprobarAsunto(); 
						}, 100);
}, false);

/**
 * Comprueba el campo del asunto, si esta la string [KMALEONSEND] al principio lo envia automaticamente.
 * @returns {undefined}
 */
function comprobarAsunto()
{
    contador++;
    try
    {
       var subject = (document.getElementById("expandedsubjectBox").boxObject).firstChild.innerHTML;
       if(contador > 30)
       {
           window.clearInterval(intervalMW);
           contador = 0;
       }else
       {
           if(buscarStringMW(subject,"[KMALEONSEND]") == 1 || buscarStringMW(subject,"[KMALEONEDIT]") == 1 || buscarStringMW(subject,"[KMALEONDATE=") == 1)
           {
               window.clearInterval(intervalMW);
               contador = 0;
               goDoCommand("cmd_editAsNew");
               window.close();
           }
       }
    }catch(ex)
    {
       consolemW.logStringMessage(ex);
    }
}

function buscarStringMW(cadena_origen, cadena_buscar) 
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