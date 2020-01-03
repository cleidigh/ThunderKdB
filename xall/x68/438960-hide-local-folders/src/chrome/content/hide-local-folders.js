'use strict';

var hideLocalFolders = {
	load: function() {
		window.removeEventListener('load', hideLocalFolders.load, false);
		let f = gFolderTreeView._rebuild;
		gFolderTreeView._rebuild = function(){
			f.call(gFolderTreeView);
			hideLocalFolders.cleanTree();
		};
		gFolderTreeView._rebuild();
	},

	cleanTree: function() {
		for(let i = gFolderTreeView._rowMap.length - 1; i >= 0 ; i--){
			if(gFolderTreeView._rowMap[i]._folder.hostname == 'Local Folders'){
				gFolderTreeView._rowMap.splice(i, 1);
				gFolderTreeView._tree.rowCountChanged(i, -1);
			}
		}
	}
};

window.addEventListener('load', hideLocalFolders.load, true);
