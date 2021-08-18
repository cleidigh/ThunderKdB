if ("undefined" == typeof(wdw_imageEdition)) {
	var { Services } = ChromeUtils.import("resource://gre/modules/Services.jsm");
	var { NetUtil } = ChromeUtils.import("resource://gre/modules/NetUtil.jsm");
	var { FileUtils } = ChromeUtils.import("resource://gre/modules/FileUtils.jsm");
	var { AppConstants } = ChromeUtils.import("resource://gre/modules/AppConstants.jsm");
	var { cardbookRepository } = ChromeUtils.import("chrome://cardbook/content/cardbookRepository.js");
	
	var loader = Services.scriptloader;
	loader.loadSubScript("chrome://cardbook/content/cardbookWebDAV.js", this);
	
	var wdw_imageEdition = {
		
		setMediaContentForCard: function(aDisplayDefault, aCard, aType, aExtension, aValue) {
			document.getElementById(aType + 'URITextBox').value = aValue;
			document.getElementById(aType + 'ExtensionTextBox').value = aExtension;
			// edition
			if (aDisplayDefault && aType == "photo") {
				aCard[aType].extension = cardbookRepository.cardbookUtils.formatExtension(aExtension, aCard.version);
				aCard[aType].value = aValue;
				aCard[aType].URI = "";
			}
		},

		clearImageCard: function () {
			document.getElementById('defaultCardImage').src = "";
			document.getElementById('imageForSizing').src = "";
			document.getElementById('imageBox').setAttribute('hidden', 'true');
		},

		displayImageCard: async function (aCard, aDisplayDefault) {
			let dirname = cardbookRepository.cardbookPreferences.getName(aCard.dirPrefId);
			wdw_imageEdition.setMediaContentForCard(aDisplayDefault, aCard, "logo", aCard.logo.extension, aCard.logo.value);
			wdw_imageEdition.setMediaContentForCard(aDisplayDefault, aCard, "sound", aCard.sound.extension, aCard.sound.value);
			await cardbookIDBImage.getImage("photo", dirname, aCard.cbid, aCard.fn)
				.then( image => {
					wdw_imageEdition.resizeImageCard(image, aDisplayDefault);
				}).catch( () => {
					if (aDisplayDefault) {
						wdw_imageEdition.resizeImageCard(null, aDisplayDefault);
					} else {
						document.getElementById('imageBox').setAttribute('hidden', 'true');
					}
				});
		},

		resizeImageCard: function (aContent, aDisplayDefault) {
			let myImage = document.getElementById('defaultCardImage');
			let myDummyImage = document.getElementById('imageForSizing');
			let content = 	"";
			if (aContent && aContent.content) {
				content = 'data:image/' + aContent.extension + ';base64,' + aContent.content;
				wdw_imageEdition.setMediaContentForCard(aDisplayDefault, wdw_cardEdition.workingCard, "photo", aContent.extension, aContent.content);
			} else {
				content = cardbookRepository.defaultCardImage;
				document.getElementById('photoURITextBox').value = "";
				document.getElementById('photoExtensionTextBox').value = "";
			}

			myImage.src = "";
			myDummyImage.src = "";
			myDummyImage.src = content;
			myDummyImage.onload = function(e) {
				var myImageWidth = 170;
				var myImageHeight = 170;
				if (myDummyImage.width >= myDummyImage.height) {
					widthFound = myImageWidth + "px" ;
					heightFound = Math.round(myDummyImage.height * myImageWidth / myDummyImage.width) + "px" ;
				} else {
					widthFound = Math.round(myDummyImage.width * myImageHeight / myDummyImage.height) + "px" ;
					heightFound = myImageHeight + "px" ;
				}
				myImage.width = widthFound;
				myImage.height = heightFound;
				myImage.src = content;
				document.getElementById('imageBox').removeAttribute('hidden');
			}
			myDummyImage.onerror = function(e) {
				document.getElementById('photoURITextBox').value = "";
				document.getElementById('photoExtensionTextBox').value = "";
				if (aDisplayDefault) {
					wdw_imageEdition.resizeImageCard(null, aDisplayDefault);
				}
			}
		},

		addImageCardFromFile: function () {
			cardbookWindowUtils.callFilePicker("imageSelectionTitle", "OPEN", "IMAGES", "", "", wdw_imageEdition.addImageCard);
		},

		checkDragImageCard: function (aEvent) {
			aEvent.preventDefault();
		},

		dragImageCard: function (aEvent) {
			// windows drag image : image/jpeg
			aEvent.preventDefault();
			var myFile = aEvent.dataTransfer.mozGetDataAt("application/x-moz-file", 0);
			if (myFile instanceof Components.interfaces.nsIFile) {
				wdw_imageEdition.addImageCard(myFile);
			} else {
				var link = aEvent.dataTransfer.getData("URL");
				if (link) {
					wdw_imageEdition.addImageCard(link.replace(/^blob\:/, ""));
				} else {
					link = aEvent.dataTransfer.getData("text/plain");
					if (link.startsWith("https://") || link.startsWith("http://") || link.startsWith("file://")) {
						wdw_imageEdition.addImageCard(link);
					} else if (link.startsWith("blob:https://") || link.startsWith("blob:http://") || link.startsWith("blob:file://")) {
						wdw_imageEdition.addImageCard(link.replace(/^blob\:/, ""));
					}
				}
			}
		},

		pasteImageCard: function () {
			try {
				// windows copy link : text/unicode
				// windows copy image : image/jpeg
				let myType = "IMAGES";
				if (cardbookClipboard.clipboardCanPaste(myType)) {
					let data = cardbookClipboard.clipboardGetData(myType);
					if (data.flavor.startsWith("image/")) {
						let extension = data.flavor == "image/png" ? "png" : (data.flavor == "image/gif" ? "gif" : "jpg");
						let inputStream = data.data;
						if (AppConstants.platform == 'Linux') {
							// does not work on Windows
							let binaryImage = NetUtil.readInputStreamToString(inputStream, inputStream.available());
							let image = btoa(binaryImage);
							wdw_imageEdition.resizeImageCard({extension: extension, content: image}, true);
						} else {
							let myFile = Services.dirsvc.get("TmpD", Components.interfaces.nsIFile);
							myFile.append(cardbookRepository.cardbookUtils.getUUID() + "." + extension);
							let ostream = FileUtils.openSafeFileOutputStream(myFile)
							NetUtil.asyncCopy(inputStream, ostream, async function (status) {
								if (Components.isSuccessCode(status)) {
									await wdw_imageEdition.addImageCard(myFile);
									myFile.remove(true);
								}
							});
						}
					} else if (data.flavor == "application/x-moz-file") {
						let myFile = data.data.QueryInterface(Components.interfaces.nsIFile);
						wdw_imageEdition.addImageCard(myFile);
					} else if (data.flavor === "text/unicode" || data.flavor === "text/plain") {
						let myTextArray = data.data.QueryInterface(Components.interfaces.nsISupportsString).data.split("\n");
						for (let myText of myTextArray) {
							if (myText.startsWith("https://") || myText.startsWith("http://") || myText.startsWith("file://")) {
								wdw_imageEdition.addImageCard(myText);
								break;
							}
						}
					}
				}
			}
			catch (e) {
				cardbookRepository.cardbookLog.updateStatusProgressInformation("wdw_imageEdition.pasteImageCard error : " + e, "Error");
			}
		},

		addImageCard: async function (aFileOrURL) {
			if (aFileOrURL) {
				let URI;
				if (aFileOrURL instanceof Components.interfaces.nsIFile) {
					URI = "file://" + aFileOrURL.path;
				} else {
					URI = aFileOrURL;
				}
				var myExtension = cardbookRepository.cardbookUtils.getFileNameExtension(URI);
				if (!myExtension) {
					return;
				}
				let dirname = cardbookRepository.cardbookPreferences.getName(wdw_cardEdition.workingCard.dirPrefId);
				let base64 = await cardbookRepository.cardbookUtils.getImageFromURI(wdw_cardEdition.workingCard.fn, dirname, URI);
				wdw_imageEdition.resizeImageCard({extension: myExtension, content: base64}, true);
			}
		},

		saveImageCard: function () {
			let defaultName = document.getElementById('fnTextBox').value + "." + document.getElementById('photoExtensionTextBox').value.toLowerCase();
			cardbookWindowUtils.callFilePicker("imageSaveTitle", "SAVE", "IMAGES", defaultName, "", wdw_imageEdition.saveImageCardNext);
		},

		saveImageCardNext: function (aFile) {
			cardbookRepository.cardbookUtils.writeContentToFile(aFile.path, atob(document.getElementById('photoURITextBox').value), "NOUTF8");
			cardbookRepository.cardbookUtils.formatStringForOutput("imageSavedToFile", [aFile.path]);
		},

		copyImageCard: function () {
			try {
				cardbookClipboard.clipboardSetImage(document.getElementById('photoURITextBox').value);
			}
			catch (e) {
				cardbookRepository.cardbookLog.updateStatusProgressInformation("wdw_imageEdition.copyImageCard error : " + e, "Error");
			}
		},

		deleteImageCard: function () {
			wdw_imageEdition.resizeImageCard(null, true);
		},

		imageCardContextShowing: function () {
			if (document.getElementById('defaultCardImage').src == cardbookRepository.defaultCardImage) {
				document.getElementById('saveImageCard').disabled=true;
				document.getElementById('copyImageCard').disabled=true;
				document.getElementById('deleteImageCard').disabled=true;
			} else {
				document.getElementById('saveImageCard').disabled=false;
				document.getElementById('copyImageCard').disabled=false;
				document.getElementById('deleteImageCard').disabled=false;
			}
		}

	};
};
