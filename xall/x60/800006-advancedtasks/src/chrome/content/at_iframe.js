function initTextColor(){
	document.body.style.color = window.parent.advancedTask.getParentsFontColor(); 
}
function appendJSFunctions(){
	var links = document.getElementsByTagName('A');
	for (i = 0; i < links.length; i++) {
		if(!links[i].getAttribute("href").includes("mailto")){
			links[i].addEventListener("click", function (e) {
				e.stopPropagation();
                e.preventDefault();
        		window.parent.launchBrowser(e.target.getAttribute('href'));
			},true);
		}
	}
	// clickable Checkbox
	var liLabels = document.getElementsByTagName('LABEL');
	for (i = 0; i < liLabels.length; i++) {
		if(liLabels[i].hasAttribute("for")){
			if(liLabels[i].getAttribute("for").includes("checkbox")){
				liLabels[i].addEventListener("click", function (e) {
			    	var checkbox = document.getElementById(e.target.getAttribute("for"));
					checkbox.checked ? checkbox.removeAttribute('checked') : checkbox.setAttribute('checked','checked');
			    	save_at();
				},true);
			}
		}
	}

	// sending forms
	var forms = document.getElementsByTagName('FORM');
	for (i = 0; i < forms.length; i++) {
		forms[i].setAttribute('target','at_form');
	}
	// save button
	var buttons = document.getElementsByTagName('BUTTON');
	for (i = 0; i < buttons.length; i++) {
		let label = buttons[i].innerHTML;
		if(label.includes("Save") || label.includes("Speichern")){
			buttons[i].setAttribute('onclick','save_at()');
		}
	}
	//disable textarea and input events
    var inputs = document.getElementsByTagName('INPUT');
    var textareas = document.getElementsByTagName('TEXTAREA');
	for (j = 0; j < inputs.length; j++) {
		if(!inputs[j].getAttribute('type').includes("checkbox")){
	        inputs[j].addEventListener("select", function (e) {
	         e.stopPropagation();
        	 e.preventDefault();
	        }, true);
		}
	}
	for (j = 0; j < textareas.length; j++) {
	    textareas[j].addEventListener("select", function (e) {
	     e.stopPropagation();
         e.preventDefault();
	    }, true);
	}


}

function save_at(){
	//save inputs
	var inputs = document.getElementsByTagName('INPUT');
	for (i = 0; i < inputs.length; i++) {
		if(!inputs[i].getAttribute('type').includes("checkbox")){
         inputs[i].setAttribute("value", inputs[i].value);
		}
	}
	//save textarea
	var textareas = document.getElementsByTagName('TEXTAREA');
	for (i = 0; i < textareas.length; i++) {
		textareas[i].innerHTML = textareas[i].value;
	}
	window.parent.advancedTask.htmlToMarkdown(document.getElementById("marked-generated").innerHTML);
}
