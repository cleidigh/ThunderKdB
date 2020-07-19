function initTextColor(){
	document.body.style.color = window.parent.advancedTask.getParentsFontColor(); 
}
function appendJSFunctions(){
	var links = document.getElementsByTagName('A');
	for (i = 0; i < links.length; i++) {
		if(!links[i].getAttribute("href").includes("mailto") && !links[i].getAttribute("href").includes("thunderlink")){
			links[i].addEventListener("click", function (e) {
				e.stopPropagation();
		                e.preventDefault();
        			window.parent.launchBrowser(e.target.getAttribute('href'));
			},true);
		}
	}
}
