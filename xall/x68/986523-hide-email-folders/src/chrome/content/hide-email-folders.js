'use strict';

var hideEmailFolders = {

	hideEmailFolders: function(){

		for(let i = 0; i < gFolderTreeView._modeNames.length; i++){
			let viewName = gFolderTreeView._modeNames[i];
			
			if (viewName != "smart")
				continue;
			
			let view = gFolderTreeView.getFolderTreeMode(viewName);

			// Store the old function that generates the folder view, we need it later
			view.hideEmailFolders_oldFunction = view.generateMap;

			// Override the old function with our new one that strips Email folders
			view.generateMap = function(ftv){
				// Call the original function first to get the full list of folder rows.
				// We use .call() here to preserve the context of "this" within the function.
				// Without it, smart (unified) folders fail to load.
				let ftvItems = this.hideEmailFolders_oldFunction.call(view, ftv);

				// Remove row
				for(let j = 0; j < ftvItems.length; j++){
					if(ftvItems[j].text.includes("@")){
						ftvItems.splice(j, 1);
						if(j-1 > 0) j--;
					}
				}

				return ftvItems;
			};
		} 
	}
};

hideEmailFolders.hideEmailFolders();
