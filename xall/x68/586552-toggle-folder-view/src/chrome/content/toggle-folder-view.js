
var toggleFolderView = {
	
	//menu_favoriteFolders
	//gFolderTreeView.toggleMode("menu_favoriteFolders")
	
	toggleFolderView: function(){
		
	
	
		//gFolderTreeView.toggleMode("menu_favoriteFolders");
		if (gFolderTreeView.mode == "all") {
			gFolderTreeView.toggleMode("favorite");
		}
		else {
			gFolderTreeView.toggleMode("all");
		}
	}
}