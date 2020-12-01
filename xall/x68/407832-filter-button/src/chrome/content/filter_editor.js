Components.utils.import("chrome://filter_button/content/filter_button_shared.jsm");

//If the "Create filter" button was pressed, preselect "manual" as filter type
//As the filter button only really makes sense for manual filters
if(filter_button_shared.create_filter){
	window.addEventListener('load', function load(e) {
		filter_button_shared.create_filter=false;
		var cml=document.getElementById('contextMenuList');
		if(cml){
			window.removeEventListener('load', load, false); //remove listener, no longer needed
			var items=cml.getElementsByTagName('menuitem');
			for(var i=0; i < items.length; i++){
				if(items[i].value==='manual'){
					cml.selectedIndex=i;
					break;
				}
			}
			updateFilterType();
		}
		//For Thunderbird >=24
		var checkbox = document.getElementById('runIncoming');
		if(checkbox)
			checkbox.checked=false;
	}, false);
}
