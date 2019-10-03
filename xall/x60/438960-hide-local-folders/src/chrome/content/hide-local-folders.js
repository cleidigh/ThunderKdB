'use strict';

var hideLocalFolders = {
	// These translations were compiled from http://releases.mozilla.org/pub/mozilla.org/thunderbird/releases/latest/linux-i686/xpi/
	translations: {
		'ar': 'مجلدات محلّيّة',
		'ast': 'Carpetes llocales',
		'be': 'Мясцовыя папкі',
		'bg': 'Местни папки',
		'bn-BD': 'স্থানীয় ফোল্ডার',
		'br': 'Teuliadoù lec\'hel',
		'ca': 'Carpetes locals',
		'cs': 'Místní složky',
		'da': 'Lokale mapper',
		'de': 'Lokale Ordner',
		'el': 'Τοπικοί φάκελοι',
		'en-GB': 'Local Folders',
		'en-US': 'Local Folders',
		'es-AR': 'Carpetas locales',
		'es-ES': 'Carpetas locales',
		'et': 'Kohalikud kaustad',
		'eu': 'Karpeta lokalak',
		'fi': 'Paikalliset kansiot',
		'fr': 'Dossiers locaux',
		'fy-NL': 'Lokale mappen',
		'ga-IE': 'Fillteáin Logánta',
		'gd': 'Pasgain ionadail',
		'gl': 'Cartafoles locais',
		'he': 'תיקיות מקומיות',
		'hr': 'Lokalne mape',
		'hu': 'Helyi mappák',
		'hy-AM': 'Լոկալ թղթապանակներ',
		'id': 'Folder Lokal',
		'is': 'Staðbundnar möppur',
		'it': 'Cartelle locali',
		'ja': 'ローカルフォルダ',
		'ko': '개인 폴더',
		'lt': 'Bendrieji aplankai',
		'nb-NO': 'Lokale mapper',
		'nl': 'Lokale mappen',
		'nn-NO': 'Lokale mapper',
		'pa-IN': 'ਲੋਕਲ ਫੋਲਡਰ',
		'pl': 'Lokalne foldery',
		'pt-BR': 'Pastas Locais',
		'pt-PT': 'Pastas Locais',
		'rm': 'Ordinaturs locals',
		'ro': 'Dosare locale',
		'ru': 'Локальные папки',
		'si': 'ස්ථානීය (Local) ෆෝල්ඩර',
		'sk': 'Lokálne priečinky',
		'sl': 'Krajevne mape',
		'sq': 'Dosje Vendore',
		'sr': 'Овдашње',
		'sv-SE': 'Lokala mappar',
		'ta-LK': 'உட்கோப்புறைகள்',
		'tr': 'Yerel Dizinler',
		'uk': 'Локальні теки',
		'vi': 'Thư mục Nội bộ',
		'zh-CN': '本地文件夹',
		'zh-TW': '本機郵件匣',
	},

	hideLocalFolders: function(){
		for(let i = 0; i < gFolderTreeView._modeNames.length; i++){
			let viewName = gFolderTreeView._modeNames[i];
			let view = gFolderTreeView.getFolderTreeMode(viewName);

			// Store the old function that generates the folder view, we need it later
			view.hideLocalFolders_oldFunction = view.generateMap;

			// Override the old function with our new one that strips local folders
			view.generateMap = function(ftv){
				// Call the original function first to get the full list of folder rows.
				// We use .call() here to preserve the context of "this" within the function.
				// Without it, smart (unified) folders fail to load.
				let ftvItems = this.hideLocalFolders_oldFunction.call(view, ftv);

				// Remove the "Local Folder" row that was returned
				for(let j = 0; j < ftvItems.length; j++){
					for(let key in hideLocalFolders.translations){
						if(ftvItems[j].text == hideLocalFolders.translations[key]){
							ftvItems.splice(j, 1);
							break;
						}
					}
				}

				return ftvItems;
			};
		}
	}
};

hideLocalFolders.hideLocalFolders();
