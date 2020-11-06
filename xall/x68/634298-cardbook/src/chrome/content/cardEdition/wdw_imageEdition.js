if ("undefined" == typeof(wdw_imageEdition)) {
	var { Services } = ChromeUtils.import("resource://gre/modules/Services.jsm");
	var { NetUtil } = ChromeUtils.import("resource://gre/modules/NetUtil.jsm");
	var { FileUtils } = ChromeUtils.import("resource://gre/modules/FileUtils.jsm");
	var { XPCOMUtils } = ChromeUtils.import("resource://gre/modules/XPCOMUtils.jsm");
	XPCOMUtils.defineLazyModuleGetter(this, "cardbookRepository", "chrome://cardbook/content/cardbookRepository.js", "cardbookRepository");
	
	var loader = Services.scriptloader;
	loader.loadSubScript("chrome://cardbook/content/cardbookWebDAV.js", this);
	
	var wdw_imageEdition = {
		
		windowId: 0,

		writeImageToFile: function (aFile, aDataValue, aExtension) {
			// remove an existing image (overwrite)
			if (aFile.exists()) {
				aFile.remove(true);
			}
			var ostream = FileUtils.openSafeFileOutputStream(aFile)
			NetUtil.asyncCopy(aDataValue, ostream, function (status) {
				if (Components.isSuccessCode(status)) {
					wdw_imageEdition.addImageCard(aFile, wdw_cardEdition.workingCard, aExtension);
				} else {
					cardbookRepository.cardbookLog.updateStatusProgressInformation("wdw_imageEdition.writeImageToFile error : filename : " + aFile.path, "Error");
				}
			});
		},

		getEditionPhotoTempFile: function (aExtension) {
			var myFile = cardbookRepository.cardbookUtils.getTempFile("cardbook");
			if (!myFile.exists() || !myFile.isDirectory()) {
				// read and write permissions to owner and group, read-only for others.
				myFile.create(Components.interfaces.nsIFile.DIRECTORY_TYPE, 0o774);
			}
			myFile.append(wdw_imageEdition.windowId);
			if (!myFile.exists() || !myFile.isDirectory()) {
				// read and write permissions to owner and group, read-only for others.
				myFile.create(Components.interfaces.nsIFile.DIRECTORY_TYPE, 0o774);
			}
			myFile.append(cardbookRepository.cardbookUtils.getUUID() + "." + aExtension);
			return myFile;
		},

		purgeEditionPhotoTempFile: function () {
			var myFile = cardbookRepository.cardbookUtils.getTempFile("cardbook");
			myFile.append(wdw_imageEdition.windowId);
			if (myFile.exists()) {
				myFile.remove(true);
			}
		},

		clearImageCard: function () {
			document.getElementById('defaultCardImage').src = "";
			document.getElementById('imageForSizing').src = "";
			document.getElementById('imageBox').setAttribute('hidden', 'true');
		},

		displayImageCard: function (aCard, aDisplayDefault) {
			if (aCard.photo.localURI) {
				wdw_imageEdition.resizeImageCard(aCard.photo.localURI, aDisplayDefault);
			} else {
				if (aDisplayDefault) {
					wdw_imageEdition.resizeImageCard(cardbookRepository.defaultCardImage, aDisplayDefault);
				} else {
					document.getElementById('imageBox').setAttribute('hidden', 'true');
				}
			}
		},

		resizeImageCard: function (aFileURI, aDisplayDefault) {
			var myImage = document.getElementById('defaultCardImage');
			var myDummyImage = document.getElementById('imageForSizing');
			
			myImage.src = "";
			myDummyImage.src = "";
			myDummyImage.src = aFileURI;
			myDummyImage.onload = function() {
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
				myImage.src = aFileURI;
				document.getElementById('imageBox').removeAttribute('hidden');
			}
			myDummyImage.onerror = function() {
				if (document.getElementById('photolocalURITextBox')) {
					document.getElementById('photolocalURITextBox').value = "";
				}
				if (document.getElementById('photoURITextBox')) {
					document.getElementById('photoURITextBox').value = "";
				}
				if (document.getElementById('photoExtensionTextBox')) {
					document.getElementById('photoExtensionTextBox').value = "";
				}
				if (aDisplayDefault) {
					wdw_imageEdition.resizeImageCard(cardbookRepository.defaultCardImage, aDisplayDefault);
				}
			}
		},

		addImageCardFromFile: function () {
			cardbookWindowUtils.callFilePicker("imageSelectionTitle", "OPEN", "IMAGES", "", "", wdw_imageEdition.addImageCardFromFileNext);
		},

		addImageCardFromFileNext: function (aFile) {
			var myExtension = cardbookRepository.cardbookUtils.getFileNameExtension(aFile.leafName);
			if (myExtension != "") {
				var myCard = wdw_cardEdition.workingCard;
				myExtension = cardbookRepository.cardbookUtils.formatExtension(myExtension, myCard.version);
				var targetFile = wdw_imageEdition.getEditionPhotoTempFile(myExtension);
				var myFileURISpec = "file:///" + targetFile.path;
				var myFileURI = Services.io.newURI(myFileURISpec, null, null);
				var myFile1 = myFileURI.QueryInterface(Components.interfaces.nsIFileURL).file;
				aFile.copyToFollowingLinks(myFile1.parent, myFile1.leafName);
				cardbookRepository.cardbookUtils.formatStringForOutput("imageSavedToFile", [myFile1.path]);
				wdw_imageEdition.addImageCard(myFile1, myCard, myExtension);
			}
		},

		addImageCardFromUrl: function (aUrl) {
			var myExtension = cardbookRepository.cardbookUtils.getFileExtension(aUrl);
			if (myExtension != "") {
				var myCard = wdw_cardEdition.workingCard;
				myExtension = cardbookRepository.cardbookUtils.formatExtension(myExtension, myCard.version);
				var targetFile = wdw_imageEdition.getEditionPhotoTempFile(myExtension);
				try {
					var listener_getimage = {
						onDAVQueryComplete: function(status, response, askCertificate, etag) {
							if (status > 199 && status < 400) {
								cardbookRepository.cardbookUtils.formatStringForOutput("urlDownloaded", [aUrl]);
								cardbookRepository.cardbookUtils.writeContentToFile(targetFile.path, response, "NOUTF8");
								wdw_imageEdition.addImageCard(targetFile, myCard, myExtension);
							} else {
								cardbookRepository.cardbookUtils.formatStringForOutput("imageErrorWithMessage", [status]);
							}
						}
					};
					var aDescription = cardbookRepository.cardbookUtils.getPrefNameFromPrefId(myCard.dirPrefId);
					var aImageConnection = {connPrefId: myCard.dirPrefId, connUrl: aUrl, connDescription: aDescription};
					var request = new cardbookWebDAV(aImageConnection, listener_getimage);
					cardbookRepository.cardbookUtils.formatStringForOutput("serverCardGettingImage", [aImageConnection.connDescription, myCard.fn]);
					request.getimage();
				}
				catch(e) {
					cardbookRepository.cardbookUtils.formatStringForOutput("imageErrorWithMessage", [e]);
				}
			}
		},

		checkDragImageCard: function (aEvent) {
			aEvent.preventDefault();
		},

		dragImageCard: function (aEvent) {
			aEvent.preventDefault();
			var myFile = aEvent.dataTransfer.mozGetDataAt("application/x-moz-file", 0);
			if (myFile instanceof Components.interfaces.nsIFile) {
				wdw_imageEdition.addImageCardFromFileNext(myFile);
			} else {
				var link = aEvent.dataTransfer.getData("URL");
				if (link) {
					wdw_imageEdition.addImageCardFromUrl(link);
				} else {
					link = aEvent.dataTransfer.getData("text/plain");
					if (link.startsWith("https://") || link.startsWith("http://") ) {
						wdw_imageEdition.addImageCardFromUrl(link);
					}
				}
			}
		},

		pasteImageCard: function () {
			try {
				var myType = "IMAGES";
                if (cardbookClipboard.clipboardCanPaste(myType)) {
                    var data = cardbookClipboard.clipboardGetData(myType);

                    if (data.flavor.startsWith("image/")) {
                        var myExtension = data.flavor == "image/png" ? "png" : (data.flavor == "image/gif" ? "gif" : "jpg");
                        var targetFile = wdw_imageEdition.getEditionPhotoTempFile(myExtension);
						wdw_imageEdition.writeImageToFile(targetFile, data.data, myExtension);
                    } else if (data.flavor == "application/x-moz-file") {
						var myFile = data.data.QueryInterface(Components.interfaces.nsIFile);
						wdw_imageEdition.addImageCardFromFileNext(myFile);
                    } else if (data.flavor === "text/unicode" || data.flavor === "text/plain") {
                        var myText = data.data.QueryInterface(Components.interfaces.nsISupportsString).data;
						if (myText.startsWith("https://") || myText.startsWith("http://")) {
							wdw_imageEdition.addImageCardFromUrl(myText);
						} else if (myText.startsWith("file:///")) {
							var myFileURISpec = myText;
							var myFileURI = Services.io.newURI(myFileURISpec, null, null);
							var myFile = myFileURI.QueryInterface(Components.interfaces.nsIFileURL).file;
							wdw_imageEdition.addImageCardFromFileNext(myFile);
						} else if (myText.startsWith("/")) {
							var myFileURISpec = "file://" + myText;
							var myFileURI = Services.io.newURI(myFileURISpec, null, null);
							var myFile = myFileURI.QueryInterface(Components.interfaces.nsIFileURL).file;
							wdw_imageEdition.addImageCardFromFileNext(myFile);
						}
                    }
                }
			}
			catch (e) {
				cardbookRepository.cardbookLog.updateStatusProgressInformation("wdw_imageEdition.pasteImageCard error : " + e, "Error");
			}
		},

		addImageCard: function (aFile, aCard, aExtension) {
			if (aFile) {
				if (aCard.version === "4.0") {
					aExtension = aExtension.toLowerCase();
				} else {
					aExtension = aExtension.toUpperCase();
				}
				document.getElementById('photoURITextBox').value = "";
				document.getElementById('photolocalURITextBox').value = "file:///" + aFile.path;
				document.getElementById('photoExtensionTextBox').value = aExtension;
				wdw_cardEdition.workingCard.photo.URI = "";
				wdw_cardEdition.workingCard.photo.localURI = "file:///" + aFile.path;
				wdw_cardEdition.workingCard.photo.extension = aExtension;
				wdw_imageEdition.displayImageCard(wdw_cardEdition.workingCard, true);
			}
		},

		saveImageCard: function () {
			var myFileURISpec = document.getElementById('photolocalURITextBox').value;
			var myFileURI = Services.io.newURI(myFileURISpec, null, null);
			var myFile = myFileURI.QueryInterface(Components.interfaces.nsIFileURL).file;
			cardbookWindowUtils.callFilePicker("imageSaveTitle", "SAVE", "IMAGES", myFile.leafName, "", wdw_imageEdition.saveImageCardNext);
		},

		saveImageCardNext: function (aFile) {
			var myFileURISpec = document.getElementById('photolocalURITextBox').value;
			var myFileURI = Services.io.newURI(myFileURISpec, null, null);
			var myFile1 = myFileURI.QueryInterface(Components.interfaces.nsIFileURL).file;
			myFile1.copyToFollowingLinks(aFile.parent,aFile.leafName);
			cardbookRepository.cardbookUtils.formatStringForOutput("imageSavedToFile", [aFile.path]);
		},

		copyImageCard: function () {
			try {
				cardbookClipboard.clipboardSetImage(document.getElementById('photolocalURITextBox').value);
			}
			catch (e) {
				cardbookRepository.cardbookLog.updateStatusProgressInformation("wdw_imageEdition.copyImageCard error : " + e, "Error");
			}
		},

		copyImageLocationCard: function () {
			try {
				var myFileURISpec = document.getElementById('photolocalURITextBox').value;
				var myExtension = cardbookRepository.cardbookUtils.getFileNameExtension(myFileURISpec);
				var myFileURI = Services.io.newURI(myFileURISpec, null, null);
				var myFile = myFileURI.QueryInterface(Components.interfaces.nsIFileURL).file;
				
				cardbookClipboard.clipboardSetText('text/unicode', myFile.path);
			}
			catch (e) {
				cardbookRepository.cardbookLog.updateStatusProgressInformation("wdw_imageEdition.copyImageLocationCard error : " + e, "Error");
			}
		},

		deleteImageCard: function () {
			var myCard = cardbookRepository.cardbookCards[document.getElementById('dirPrefIdTextBox').value+"::"+document.getElementById('uidTextBox').value];
			document.getElementById('defaultCardImage').src = cardbookRepository.defaultCardImage;
			document.getElementById('photolocalURITextBox').value = "";
			document.getElementById('photoURITextBox').value = "";
			wdw_cardEdition.workingCard.photo.URI = "";
			wdw_cardEdition.workingCard.photo.localURI = "";
			wdw_cardEdition.workingCard.photo.extension = "";
			wdw_imageEdition.displayImageCard(wdw_cardEdition.workingCard, true);
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
