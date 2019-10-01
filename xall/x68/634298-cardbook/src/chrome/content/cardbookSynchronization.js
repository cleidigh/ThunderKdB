if ("undefined" == typeof(cardbookSynchronization)) {
	var { Services } = ChromeUtils.import("resource://gre/modules/Services.jsm");
	var { FileUtils } = ChromeUtils.import("resource://gre/modules/FileUtils.jsm");
	var { AppConstants } = ChromeUtils.import("resource://gre/modules/AppConstants.jsm");
	var { XPCOMUtils } = ChromeUtils.import("resource://gre/modules/XPCOMUtils.jsm");
	var { OS } = ChromeUtils.import("resource://gre/modules/osfile.jsm");
	XPCOMUtils.defineLazyModuleGetter(this, "cardbookRepository", "chrome://cardbook/content/cardbookRepository.js", "cardbookRepository");
	XPCOMUtils.defineLazyModuleGetter(this, "cardbookSynchronizationGoogle", "chrome://cardbook/content/cardbookSynchronizationGoogle.js");
	XPCOMUtils.defineLazyModuleGetter(this, "cardbookSynchronizationYahoo", "chrome://cardbook/content/cardbookSynchronizationYahoo.js");

	if ("undefined" == typeof(cardbookPreferences)) {
		XPCOMUtils.defineLazyModuleGetter(this, "cardbookPreferences", "chrome://cardbook/content/preferences/cardbookPreferences.js");
	}
	if ("undefined" == typeof(cardbookLog)) {
		XPCOMUtils.defineLazyModuleGetter(this, "cardbookLog", "chrome://cardbook/content/cardbookLog.js");
	}
	if ("undefined" == typeof(cardbookComplexSearch)) {
		XPCOMUtils.defineLazyModuleGetter(this, "cardbookComplexSearch", "chrome://cardbook/content/complexSearch/cardbookComplexSearch.js");
	}
	if ("undefined" == typeof(cardbookUtils)) {
		XPCOMUtils.defineLazyModuleGetter(this, "cardbookUtils", "chrome://cardbook/content/cardbookUtils.js");
	}

	var loader = Services.scriptloader;
	loader.loadSubScript("chrome://cardbook/content/cardbookCardParser.js", this);
	loader.loadSubScript("chrome://cardbook/content/cardbookActions.js", this);
	loader.loadSubScript("chrome://cardbook/content/cardbookWebDAV.js");
	loader.loadSubScript("chrome://cardbook/content/cardbookPasswordManager.js");
	loader.loadSubScript("chrome://cardbook/content/cardbookDiscovery.js");
	
	var EXPORTED_SYMBOLS = ["cardbookSynchronization"];
	var cardbookSynchronization = {

		initDiscoveryOperations: function(aPrefId) {
			cardbookRepository.cardbookServerValidation[aPrefId] = {};
		},
		
		stopDiscoveryOperations: function(aPrefId) {
			delete cardbookRepository.cardbookServerValidation[aPrefId];
		},
		
		initMultipleOperations: function(aPrefId) {
			cardbookRepository.cardbookSyncMode[aPrefId] = 1;
			cardbookRepository.cardbookAccessTokenRequest[aPrefId] = 0;
			cardbookRepository.cardbookAccessTokenResponse[aPrefId] = 0;
			cardbookRepository.cardbookAccessTokenError[aPrefId] = 0;
			cardbookRepository.cardbookRefreshTokenRequest[aPrefId] = 0;
			cardbookRepository.cardbookRefreshTokenResponse[aPrefId] = 0;
			cardbookRepository.cardbookRefreshTokenError[aPrefId] = 0;
			cardbookRepository.cardbookDirRequest[aPrefId] = 0;
			cardbookRepository.cardbookDirResponse[aPrefId] = 0;
			cardbookRepository.cardbookFileRequest[aPrefId] = 0;
			cardbookRepository.cardbookFileResponse[aPrefId] = 0;
			cardbookRepository.cardbookDBRequest[aPrefId] = 0;
			cardbookRepository.cardbookDBResponse[aPrefId] = 0;
			cardbookRepository.cardbookComplexSearchRequest[aPrefId] = 0;
			cardbookRepository.cardbookComplexSearchResponse[aPrefId] = 0;
			cardbookRepository.cardbookComplexSearchReloadRequest[aPrefId] = 0;
			cardbookRepository.cardbookComplexSearchReloadResponse[aPrefId] = 0;
			cardbookRepository.filesFromCacheDB[aPrefId] = {};
			cardbookRepository.cardbookServerDiscoveryRequest[aPrefId] = 0;
			cardbookRepository.cardbookServerDiscoveryResponse[aPrefId] = 0;
			cardbookRepository.cardbookServerDiscoveryError[aPrefId] = 0;
			cardbookRepository.cardbookServerSyncRequest[aPrefId] = 0;
			cardbookRepository.cardbookServerSyncResponse[aPrefId] = 0;
			cardbookRepository.cardbookServerSyncDone[aPrefId] = 0;
			cardbookRepository.cardbookServerSyncTotal[aPrefId] = 0;
			cardbookRepository.cardbookServerSyncError[aPrefId] = 0;
			cardbookRepository.cardbookServerSyncNotUpdated[aPrefId] = 0;
			cardbookRepository.cardbookServerSyncNewOnServer[aPrefId] = 0;
			cardbookRepository.cardbookServerSyncNewOnDisk[aPrefId] = 0;
			cardbookRepository.cardbookServerSyncUpdatedOnServer[aPrefId] = 0;
			cardbookRepository.cardbookServerSyncUpdatedOnDisk[aPrefId] = 0;
			cardbookRepository.cardbookServerSyncUpdatedOnBoth[aPrefId] = 0;
			cardbookRepository.cardbookServerSyncUpdatedOnDiskDeletedOnServer[aPrefId] = 0;
			cardbookRepository.cardbookServerSyncDeletedOnDisk[aPrefId] = 0;
			cardbookRepository.cardbookServerSyncDeletedOnServer[aPrefId] = 0;
			cardbookRepository.cardbookServerSyncDeletedOnDiskUpdatedOnServer[aPrefId] = 0;
			cardbookRepository.cardbookServerSyncAgain[aPrefId] = false;
			cardbookRepository.cardbookServerSyncCompareWithCacheDone[aPrefId] = 0;
			cardbookRepository.cardbookServerSyncCompareWithCacheTotal[aPrefId] = 0;
			cardbookRepository.cardbookServerSyncHandleRemainingDone[aPrefId] = 0;
			cardbookRepository.cardbookServerSyncHandleRemainingTotal[aPrefId] = 0;
			cardbookRepository.cardbookServerGetRequest[aPrefId] = 0;
			cardbookRepository.cardbookServerGetResponse[aPrefId] = 0;
			cardbookRepository.cardbookServerGetError[aPrefId] = 0;
			cardbookRepository.cardbookServerGetForMergeRequest[aPrefId] = 0;
			cardbookRepository.cardbookServerGetForMergeResponse[aPrefId] = 0;
			cardbookRepository.cardbookServerGetForMergeError[aPrefId] = 0;
			cardbookRepository.cardbookServerMultiGetArray[aPrefId] = [];
			cardbookRepository.cardbookServerMultiGetParams[aPrefId] = [];
			cardbookRepository.cardbookServerMultiGetRequest[aPrefId] = 0;
			cardbookRepository.cardbookServerMultiGetResponse[aPrefId] = 0;
			cardbookRepository.cardbookServerMultiGetError[aPrefId] = 0;
			cardbookRepository.cardbookServerUpdatedRequest[aPrefId] = 0;
			cardbookRepository.cardbookServerUpdatedResponse[aPrefId] = 0;
			cardbookRepository.cardbookServerUpdatedError[aPrefId] = 0;
			cardbookRepository.cardbookServerCreatedRequest[aPrefId] = 0;
			cardbookRepository.cardbookServerCreatedResponse[aPrefId] = 0;
			cardbookRepository.cardbookServerCreatedError[aPrefId] = 0;
			cardbookRepository.cardbookServerDeletedRequest[aPrefId] = 0;
			cardbookRepository.cardbookServerDeletedResponse[aPrefId] = 0;
			cardbookRepository.cardbookServerDeletedError[aPrefId] = 0;
			cardbookRepository.cardbookImageGetRequest[aPrefId] = 0;
			cardbookRepository.cardbookImageGetResponse[aPrefId] = 0;
			cardbookRepository.cardbookImageGetError[aPrefId] = 0;
			cardbookRepository.cardbookServerNotPushed[aPrefId] = 0;
		},

		finishMultipleOperations: function(aPrefId) {
			cardbookSynchronization.initMultipleOperations(aPrefId);
			cardbookRepository.cardbookSyncMode[aPrefId] = 0;
		},

		getRequest: function(aPrefId, aPrefName) {
			if (aPrefId) {
				cardbookLog.updateStatusProgressInformationWithDebug1(aPrefName + " : debug mode : cardbookRepository.cardbookComplexSearchRequest : ", cardbookRepository.cardbookComplexSearchRequest[aPrefId]);
				cardbookLog.updateStatusProgressInformationWithDebug1(aPrefName + " : debug mode : cardbookRepository.cardbookComplexSearchReloadRequest : ", cardbookRepository.cardbookComplexSearchReloadRequest[aPrefId]);
				cardbookLog.updateStatusProgressInformationWithDebug1(aPrefName + " : debug mode : cardbookRepository.cardbookAccessTokenRequest : ", cardbookRepository.cardbookAccessTokenRequest[aPrefId]);
				cardbookLog.updateStatusProgressInformationWithDebug1(aPrefName + " : debug mode : cardbookRepository.cardbookRefreshTokenRequest : ", cardbookRepository.cardbookRefreshTokenRequest[aPrefId]);
				cardbookLog.updateStatusProgressInformationWithDebug1(aPrefName + " : debug mode : cardbookRepository.cardbookServerDiscoveryRequest : ", cardbookRepository.cardbookServerDiscoveryRequest[aPrefId]);
				cardbookLog.updateStatusProgressInformationWithDebug1(aPrefName + " : debug mode : cardbookRepository.cardbookServerGetRequest : ", cardbookRepository.cardbookServerGetRequest[aPrefId]);
				cardbookLog.updateStatusProgressInformationWithDebug1(aPrefName + " : debug mode : cardbookRepository.cardbookServerGetForMergeRequest : ", cardbookRepository.cardbookServerGetForMergeRequest[aPrefId]);
				cardbookLog.updateStatusProgressInformationWithDebug1(aPrefName + " : debug mode : cardbookRepository.cardbookServerMultiGetRequest : ", cardbookRepository.cardbookServerMultiGetRequest[aPrefId]);
				cardbookLog.updateStatusProgressInformationWithDebug1(aPrefName + " : debug mode : cardbookRepository.cardbookServerUpdatedRequest : ", cardbookRepository.cardbookServerUpdatedRequest[aPrefId]);
				cardbookLog.updateStatusProgressInformationWithDebug1(aPrefName + " : debug mode : cardbookRepository.cardbookServerCreatedRequest : ", cardbookRepository.cardbookServerCreatedRequest[aPrefId]);
				cardbookLog.updateStatusProgressInformationWithDebug1(aPrefName + " : debug mode : cardbookRepository.cardbookServerDeletedRequest : ", cardbookRepository.cardbookServerDeletedRequest[aPrefId]);
				cardbookLog.updateStatusProgressInformationWithDebug1(aPrefName + " : debug mode : cardbookRepository.cardbookDirRequest : ", cardbookRepository.cardbookDirRequest[aPrefId]);
				cardbookLog.updateStatusProgressInformationWithDebug1(aPrefName + " : debug mode : cardbookRepository.cardbookFileRequest : ", cardbookRepository.cardbookFileRequest[aPrefId]);
				cardbookLog.updateStatusProgressInformationWithDebug1(aPrefName + " : debug mode : cardbookRepository.cardbookDBRequest : ", cardbookRepository.cardbookDBRequest[aPrefId]);
				cardbookLog.updateStatusProgressInformationWithDebug1(aPrefName + " : debug mode : cardbookRepository.cardbookImageGetRequest : ", cardbookRepository.cardbookImageGetRequest[aPrefId]);
				cardbookLog.updateStatusProgressInformationWithDebug1(aPrefName + " : debug mode : cardbookRepository.cardbookServerSyncRequest : ", cardbookRepository.cardbookServerSyncRequest[aPrefId]);
				return cardbookRepository.cardbookComplexSearchRequest[aPrefId] +
						cardbookRepository.cardbookComplexSearchReloadRequest[aPrefId] +
						cardbookRepository.cardbookAccessTokenRequest[aPrefId] +
						cardbookRepository.cardbookRefreshTokenRequest[aPrefId] +
						cardbookRepository.cardbookServerDiscoveryRequest[aPrefId] +
						cardbookRepository.cardbookServerGetRequest[aPrefId] +
						cardbookRepository.cardbookServerGetForMergeRequest[aPrefId] +
						cardbookRepository.cardbookServerMultiGetRequest[aPrefId] +
						cardbookRepository.cardbookServerUpdatedRequest[aPrefId] +
						cardbookRepository.cardbookServerCreatedRequest[aPrefId] +
						cardbookRepository.cardbookServerDeletedRequest[aPrefId] +
						cardbookRepository.cardbookDirRequest[aPrefId] +
						cardbookRepository.cardbookFileRequest[aPrefId] +
						cardbookRepository.cardbookDBRequest[aPrefId] +
						cardbookRepository.cardbookImageGetRequest[aPrefId] +
						cardbookRepository.cardbookServerSyncRequest[aPrefId];
			} else {
				cardbookLog.updateStatusProgressInformationWithDebug1("Total : debug mode : cardbookRepository.cardbookComplexSearchRequest : ", cardbookUtils.sumElements(cardbookRepository.cardbookComplexSearchRequest));
				cardbookLog.updateStatusProgressInformationWithDebug1("Total : debug mode : cardbookRepository.cardbookComplexSearchReloadRequest : ", cardbookUtils.sumElements(cardbookRepository.cardbookComplexSearchReloadRequest));
				cardbookLog.updateStatusProgressInformationWithDebug1("Total : debug mode : cardbookRepository.cardbookAccessTokenRequest : ", cardbookUtils.sumElements(cardbookRepository.cardbookAccessTokenRequest));
				cardbookLog.updateStatusProgressInformationWithDebug1("Total : debug mode : cardbookRepository.cardbookRefreshTokenRequest : ", cardbookUtils.sumElements(cardbookRepository.cardbookRefreshTokenRequest));
				cardbookLog.updateStatusProgressInformationWithDebug1("Total : debug mode : cardbookRepository.cardbookServerDiscoveryRequest : ", cardbookUtils.sumElements(cardbookRepository.cardbookServerDiscoveryRequest));
				cardbookLog.updateStatusProgressInformationWithDebug1("Total : debug mode : cardbookRepository.cardbookServerGetRequest : ", cardbookUtils.sumElements(cardbookRepository.cardbookServerGetRequest));
				cardbookLog.updateStatusProgressInformationWithDebug1("Total : debug mode : cardbookRepository.cardbookServerGetForMergeRequest : ", cardbookUtils.sumElements(cardbookRepository.cardbookServerGetForMergeRequest));
				cardbookLog.updateStatusProgressInformationWithDebug1("Total : debug mode : cardbookRepository.cardbookServerMultiGetRequest : ", cardbookUtils.sumElements(cardbookRepository.cardbookServerMultiGetRequest));
				cardbookLog.updateStatusProgressInformationWithDebug1("Total : debug mode : cardbookRepository.cardbookServerUpdatedRequest : ", cardbookUtils.sumElements(cardbookRepository.cardbookServerUpdatedRequest));
				cardbookLog.updateStatusProgressInformationWithDebug1("Total : debug mode : cardbookRepository.cardbookServerCreatedRequest : ", cardbookUtils.sumElements(cardbookRepository.cardbookServerCreatedRequest));
				cardbookLog.updateStatusProgressInformationWithDebug1("Total : debug mode : cardbookRepository.cardbookServerDeletedRequest : ", cardbookUtils.sumElements(cardbookRepository.cardbookServerDeletedRequest));
				cardbookLog.updateStatusProgressInformationWithDebug1("Total : debug mode : cardbookRepository.cardbookDirRequest : ", cardbookUtils.sumElements(cardbookRepository.cardbookDirRequest));
				cardbookLog.updateStatusProgressInformationWithDebug1("Total : debug mode : cardbookRepository.cardbookFileRequest : ", cardbookUtils.sumElements(cardbookRepository.cardbookFileRequest));
				cardbookLog.updateStatusProgressInformationWithDebug1("Total : debug mode : cardbookRepository.cardbookDBRequest : ", cardbookUtils.sumElements(cardbookRepository.cardbookDBRequest));
				cardbookLog.updateStatusProgressInformationWithDebug1("Total : debug mode : cardbookRepository.cardbookImageGetRequest : ", cardbookUtils.sumElements(cardbookRepository.cardbookImageGetRequest));
				cardbookLog.updateStatusProgressInformationWithDebug1("Total : debug mode : cardbookRepository.cardbookServerSyncRequest : ", cardbookUtils.sumElements(cardbookRepository.cardbookServerSyncRequest));
				return cardbookUtils.sumElements(cardbookRepository.cardbookComplexSearchRequest) +
						cardbookUtils.sumElements(cardbookRepository.cardbookComplexSearchReloadRequest) +
						cardbookUtils.sumElements(cardbookRepository.cardbookAccessTokenRequest) +
						cardbookUtils.sumElements(cardbookRepository.cardbookRefreshTokenRequest) +
						cardbookUtils.sumElements(cardbookRepository.cardbookServerDiscoveryRequest) +
						cardbookUtils.sumElements(cardbookRepository.cardbookServerGetRequest) +
						cardbookUtils.sumElements(cardbookRepository.cardbookServerGetForMergeRequest) +
						cardbookUtils.sumElements(cardbookRepository.cardbookServerMultiGetRequest) +
						cardbookUtils.sumElements(cardbookRepository.cardbookServerUpdatedRequest) +
						cardbookUtils.sumElements(cardbookRepository.cardbookServerCreatedRequest) +
						cardbookUtils.sumElements(cardbookRepository.cardbookServerDeletedRequest) +
						cardbookUtils.sumElements(cardbookRepository.cardbookDirRequest) +
						cardbookUtils.sumElements(cardbookRepository.cardbookFileRequest) +
						cardbookUtils.sumElements(cardbookRepository.cardbookDBRequest) +
						cardbookUtils.sumElements(cardbookRepository.cardbookImageGetRequest) +
						cardbookUtils.sumElements(cardbookRepository.cardbookServerSyncRequest);
			}
		},
		
		getResponse: function(aPrefId, aPrefName) {
			if (aPrefId) {
				cardbookLog.updateStatusProgressInformationWithDebug1(aPrefName + " : debug mode : cardbookRepository.cardbookComplexSearchResponse : ", cardbookRepository.cardbookComplexSearchResponse[aPrefId]);
				cardbookLog.updateStatusProgressInformationWithDebug1(aPrefName + " : debug mode : cardbookRepository.cardbookComplexSearchReloadResponse : ", cardbookRepository.cardbookComplexSearchReloadResponse[aPrefId]);
				cardbookLog.updateStatusProgressInformationWithDebug1(aPrefName + " : debug mode : cardbookRepository.cardbookAccessTokenResponse : ", cardbookRepository.cardbookAccessTokenResponse[aPrefId]);
				cardbookLog.updateStatusProgressInformationWithDebug1(aPrefName + " : debug mode : cardbookRepository.cardbookRefreshTokenResponse : ", cardbookRepository.cardbookRefreshTokenResponse[aPrefId]);
				cardbookLog.updateStatusProgressInformationWithDebug1(aPrefName + " : debug mode : cardbookRepository.cardbookServerDiscoveryResponse : ", cardbookRepository.cardbookServerDiscoveryResponse[aPrefId]);
				cardbookLog.updateStatusProgressInformationWithDebug1(aPrefName + " : debug mode : cardbookRepository.cardbookServerGetResponse : ", cardbookRepository.cardbookServerGetResponse[aPrefId]);
				cardbookLog.updateStatusProgressInformationWithDebug1(aPrefName + " : debug mode : cardbookRepository.cardbookServerGetForMergeResponse : ", cardbookRepository.cardbookServerGetForMergeResponse[aPrefId]);
				cardbookLog.updateStatusProgressInformationWithDebug1(aPrefName + " : debug mode : cardbookRepository.cardbookServerMultiGetResponse : ", cardbookRepository.cardbookServerMultiGetResponse[aPrefId]);
				cardbookLog.updateStatusProgressInformationWithDebug1(aPrefName + " : debug mode : cardbookRepository.cardbookServerUpdatedResponse : ", cardbookRepository.cardbookServerUpdatedResponse[aPrefId]);
				cardbookLog.updateStatusProgressInformationWithDebug1(aPrefName + " : debug mode : cardbookRepository.cardbookServerCreatedResponse : ", cardbookRepository.cardbookServerCreatedResponse[aPrefId]);
				cardbookLog.updateStatusProgressInformationWithDebug1(aPrefName + " : debug mode : cardbookRepository.cardbookServerDeletedResponse : ", cardbookRepository.cardbookServerDeletedResponse[aPrefId]);
				cardbookLog.updateStatusProgressInformationWithDebug1(aPrefName + " : debug mode : cardbookRepository.cardbookDirResponse : ", cardbookRepository.cardbookDirResponse[aPrefId]);
				cardbookLog.updateStatusProgressInformationWithDebug1(aPrefName + " : debug mode : cardbookRepository.cardbookFileResponse : ", cardbookRepository.cardbookFileResponse[aPrefId]);
				cardbookLog.updateStatusProgressInformationWithDebug1(aPrefName + " : debug mode : cardbookRepository.cardbookDBResponse : ", cardbookRepository.cardbookDBResponse[aPrefId]);
				cardbookLog.updateStatusProgressInformationWithDebug1(aPrefName + " : debug mode : cardbookRepository.cardbookImageGetResponse : ", cardbookRepository.cardbookImageGetResponse[aPrefId]);
				cardbookLog.updateStatusProgressInformationWithDebug1(aPrefName + " : debug mode : cardbookRepository.cardbookServerSyncResponse : ", cardbookRepository.cardbookServerSyncResponse[aPrefId]);
				return cardbookRepository.cardbookComplexSearchResponse[aPrefId] +
						cardbookRepository.cardbookComplexSearchReloadResponse[aPrefId] +
						cardbookRepository.cardbookAccessTokenResponse[aPrefId] +
						cardbookRepository.cardbookRefreshTokenResponse[aPrefId] +
						cardbookRepository.cardbookServerDiscoveryResponse[aPrefId] +
						cardbookRepository.cardbookServerGetResponse[aPrefId] +
						cardbookRepository.cardbookServerGetForMergeResponse[aPrefId] +
						cardbookRepository.cardbookServerMultiGetResponse[aPrefId] +
						cardbookRepository.cardbookServerUpdatedResponse[aPrefId] +
						cardbookRepository.cardbookServerCreatedResponse[aPrefId] +
						cardbookRepository.cardbookServerDeletedResponse[aPrefId] +
						cardbookRepository.cardbookDirResponse[aPrefId] +
						cardbookRepository.cardbookFileResponse[aPrefId] +
						cardbookRepository.cardbookDBResponse[aPrefId] +
						cardbookRepository.cardbookImageGetResponse[aPrefId] +
						cardbookRepository.cardbookServerSyncResponse[aPrefId];
			} else {
				cardbookLog.updateStatusProgressInformationWithDebug1("Total : debug mode : cardbookRepository.cardbookComplexSearchResponse : ", cardbookUtils.sumElements(cardbookRepository.cardbookComplexSearchResponse));
				cardbookLog.updateStatusProgressInformationWithDebug1("Total : debug mode : cardbookRepository.cardbookComplexSearchReloadResponse : ", cardbookUtils.sumElements(cardbookRepository.cardbookComplexSearchReloadResponse));
				cardbookLog.updateStatusProgressInformationWithDebug1("Total : debug mode : cardbookRepository.cardbookAccessTokenResponse : ", cardbookUtils.sumElements(cardbookRepository.cardbookAccessTokenResponse));
				cardbookLog.updateStatusProgressInformationWithDebug1("Total : debug mode : cardbookRepository.cardbookRefreshTokenResponse : ", cardbookUtils.sumElements(cardbookRepository.cardbookRefreshTokenResponse));
				cardbookLog.updateStatusProgressInformationWithDebug1("Total : debug mode : cardbookRepository.cardbookServerDiscoveryResponse : ", cardbookUtils.sumElements(cardbookRepository.cardbookServerDiscoveryResponse));
				cardbookLog.updateStatusProgressInformationWithDebug1("Total : debug mode : cardbookRepository.cardbookServerGetResponse : ", cardbookUtils.sumElements(cardbookRepository.cardbookServerGetResponse));
				cardbookLog.updateStatusProgressInformationWithDebug1("Total : debug mode : cardbookRepository.cardbookServerGetForMergeResponse : ", cardbookUtils.sumElements(cardbookRepository.cardbookServerGetForMergeResponse));
				cardbookLog.updateStatusProgressInformationWithDebug1("Total : debug mode : cardbookRepository.cardbookServerMultiGetResponse : ", cardbookUtils.sumElements(cardbookRepository.cardbookServerMultiGetResponse));
				cardbookLog.updateStatusProgressInformationWithDebug1("Total : debug mode : cardbookRepository.cardbookServerUpdatedResponse : ", cardbookUtils.sumElements(cardbookRepository.cardbookServerUpdatedResponse));
				cardbookLog.updateStatusProgressInformationWithDebug1("Total : debug mode : cardbookRepository.cardbookServerCreatedResponse : ", cardbookUtils.sumElements(cardbookRepository.cardbookServerCreatedResponse));
				cardbookLog.updateStatusProgressInformationWithDebug1("Total : debug mode : cardbookRepository.cardbookServerDeletedResponse : ", cardbookUtils.sumElements(cardbookRepository.cardbookServerDeletedResponse));
				cardbookLog.updateStatusProgressInformationWithDebug1("Total : debug mode : cardbookRepository.cardbookDirResponse : ", cardbookUtils.sumElements(cardbookRepository.cardbookDirResponse));
				cardbookLog.updateStatusProgressInformationWithDebug1("Total : debug mode : cardbookRepository.cardbookFileResponse : ", cardbookUtils.sumElements(cardbookRepository.cardbookFileResponse));
				cardbookLog.updateStatusProgressInformationWithDebug1("Total : debug mode : cardbookRepository.cardbookDBResponse : ", cardbookUtils.sumElements(cardbookRepository.cardbookDBResponse));
				cardbookLog.updateStatusProgressInformationWithDebug1("Total : debug mode : cardbookRepository.cardbookImageGetResponse : ", cardbookUtils.sumElements(cardbookRepository.cardbookImageGetResponse));
				cardbookLog.updateStatusProgressInformationWithDebug1("Total : debug mode : cardbookRepository.cardbookServerSyncResponse : ", cardbookUtils.sumElements(cardbookRepository.cardbookServerSyncResponse));
				return cardbookUtils.sumElements(cardbookRepository.cardbookComplexSearchResponse) +
						cardbookUtils.sumElements(cardbookRepository.cardbookComplexSearchReloadResponse) +
						cardbookUtils.sumElements(cardbookRepository.cardbookAccessTokenResponse) +
						cardbookUtils.sumElements(cardbookRepository.cardbookRefreshTokenResponse) +
						cardbookUtils.sumElements(cardbookRepository.cardbookServerDiscoveryResponse) +
						cardbookUtils.sumElements(cardbookRepository.cardbookServerGetResponse) +
						cardbookUtils.sumElements(cardbookRepository.cardbookServerGetForMergeResponse) +
						cardbookUtils.sumElements(cardbookRepository.cardbookServerMultiGetResponse) +
						cardbookUtils.sumElements(cardbookRepository.cardbookServerUpdatedResponse) +
						cardbookUtils.sumElements(cardbookRepository.cardbookServerCreatedResponse) +
						cardbookUtils.sumElements(cardbookRepository.cardbookServerDeletedResponse) +
						cardbookUtils.sumElements(cardbookRepository.cardbookDirResponse) +
						cardbookUtils.sumElements(cardbookRepository.cardbookFileResponse) +
						cardbookUtils.sumElements(cardbookRepository.cardbookDBResponse) +
						cardbookUtils.sumElements(cardbookRepository.cardbookImageGetResponse) +
						cardbookUtils.sumElements(cardbookRepository.cardbookServerSyncResponse);
			}
		},
		
		getDone: function(aPrefId, aPrefName) {
			if (aPrefId) {
				cardbookLog.updateStatusProgressInformationWithDebug1(aPrefName + " : debug mode : cardbookRepository.cardbookServerSyncDone : ", cardbookRepository.cardbookServerSyncDone[aPrefId]);
				cardbookLog.updateStatusProgressInformationWithDebug1(aPrefName + " : debug mode : cardbookRepository.cardbookServerSyncCompareWithCacheDone : ", cardbookRepository.cardbookServerSyncCompareWithCacheDone[aPrefId]);
				cardbookLog.updateStatusProgressInformationWithDebug1(aPrefName + " : debug mode : cardbookRepository.cardbookServerSyncHandleRemainingDone : ", cardbookRepository.cardbookServerSyncHandleRemainingDone[aPrefId]);
				return cardbookRepository.cardbookServerSyncDone[aPrefId];
			} else {
				cardbookLog.updateStatusProgressInformationWithDebug1("Total : debug mode : cardbookRepository.cardbookServerSyncDone : ", cardbookUtils.sumElements(cardbookRepository.cardbookServerSyncDone));
				cardbookLog.updateStatusProgressInformationWithDebug1("Total : debug mode : cardbookRepository.cardbookServerSyncCompareWithCacheDone : ", cardbookUtils.sumElements(cardbookRepository.cardbookServerSyncCompareWithCacheDone));
				cardbookLog.updateStatusProgressInformationWithDebug1("Total : debug mode : cardbookRepository.cardbookServerSyncHandleRemainingDone : ", cardbookUtils.sumElements(cardbookRepository.cardbookServerSyncHandleRemainingDone));
				return cardbookUtils.sumElements(cardbookRepository.cardbookServerSyncDone);
			}
		},
		
		getTotal: function(aPrefId, aPrefName) {
			if (aPrefId) {
				cardbookLog.updateStatusProgressInformationWithDebug1(aPrefName + " : debug mode : cardbookRepository.cardbookServerSyncTotal : ", cardbookRepository.cardbookServerSyncTotal[aPrefId]);
				cardbookLog.updateStatusProgressInformationWithDebug1(aPrefName + " : debug mode : cardbookRepository.cardbookServerSyncCompareWithCacheTotal : ", cardbookRepository.cardbookServerSyncCompareWithCacheTotal[aPrefId]);
				cardbookLog.updateStatusProgressInformationWithDebug1(aPrefName + " : debug mode : cardbookRepository.cardbookServerSyncHandleRemainingTotal : ", cardbookRepository.cardbookServerSyncHandleRemainingTotal[aPrefId]);
				return cardbookRepository.cardbookServerSyncTotal[aPrefId];
			} else {
				cardbookLog.updateStatusProgressInformationWithDebug1("Total : debug mode : cardbookRepository.cardbookServerSyncTotal : ", cardbookUtils.sumElements(cardbookRepository.cardbookServerSyncTotal));
				cardbookLog.updateStatusProgressInformationWithDebug1("Total : debug mode : cardbookRepository.cardbookServerSyncCompareWithCacheTotal : ", cardbookUtils.sumElements(cardbookRepository.cardbookServerSyncCompareWithCacheTotal));
				cardbookLog.updateStatusProgressInformationWithDebug1("Total : debug mode : cardbookRepository.cardbookServerSyncHandleRemainingTotal : ", cardbookUtils.sumElements(cardbookRepository.cardbookServerSyncHandleRemainingTotal));
				return cardbookUtils.sumElements(cardbookRepository.cardbookServerSyncTotal);
			}
		},

		getModifsPushed: function(aPrefId) {
			return cardbookRepository.cardbookServerUpdatedRequest[aPrefId] +
					cardbookRepository.cardbookServerCreatedRequest[aPrefId] +
					cardbookRepository.cardbookServerDeletedRequest[aPrefId];
		},
		
		finishOpenFile: function(aPrefId, aPrefName) {
			var errorNum = cardbookRepository.cardbookServerUpdatedError[aPrefId] + cardbookRepository.cardbookServerCreatedError[aPrefId];
			if (errorNum === 0) {
				cardbookUtils.formatStringForOutput("allContactsLoadedFromFile", [aPrefName]);
			} else {
				cardbookUtils.formatStringForOutput("notAllContactsLoadedFromFile", [aPrefName, errorNum]);
			}
		},
		
		finishSync: function(aPrefId, aPrefName, aPrefType) {
			cardbookUtils.notifyObservers("syncFisnished", aPrefId);
			if (cardbookUtils.isMyAccountRemote(aPrefType)) {
				if (cardbookRepository.cardbookServerSyncRequest[aPrefId] == 0) {
					cardbookUtils.formatStringForOutput("synchroNotTried", [aPrefName]);
					cardbookActions.finishSyncActivity(aPrefId);
				} else {
					var errorNum = cardbookRepository.cardbookAccessTokenError[aPrefId] + cardbookRepository.cardbookRefreshTokenError[aPrefId] + cardbookRepository.cardbookServerDiscoveryError[aPrefId] + cardbookRepository.cardbookServerSyncError[aPrefId];
					if (errorNum === 0) {
						cardbookActions.finishSyncActivityOK(aPrefId, aPrefName);
						cardbookUtils.formatStringForOutput("synchroFinishedResult", [aPrefName]);
						cardbookUtils.formatStringForOutput("synchroCardsUpToDate", [aPrefName, cardbookRepository.cardbookServerSyncNotUpdated[aPrefId]]);
						cardbookUtils.formatStringForOutput("synchroCardsNewOnServer", [aPrefName, cardbookRepository.cardbookServerSyncNewOnServer[aPrefId]]);
						cardbookUtils.formatStringForOutput("synchroCardsUpdatedOnServer", [aPrefName, cardbookRepository.cardbookServerSyncUpdatedOnServer[aPrefId]]);
						cardbookUtils.formatStringForOutput("synchroCardsDeletedOnServer", [aPrefName, cardbookRepository.cardbookServerSyncDeletedOnServer[aPrefId]]);
						cardbookUtils.formatStringForOutput("synchroCardsDeletedOnDisk", [aPrefName, cardbookRepository.cardbookServerSyncDeletedOnDisk[aPrefId]]);
						cardbookUtils.formatStringForOutput("synchroCardsDeletedOnDiskUpdatedOnServer", [aPrefName, cardbookRepository.cardbookServerSyncDeletedOnDiskUpdatedOnServer[aPrefId]]);
						cardbookUtils.formatStringForOutput("synchroCardsNewOnDisk", [aPrefName, cardbookRepository.cardbookServerSyncNewOnDisk[aPrefId]]);
						cardbookUtils.formatStringForOutput("synchroCardsUpdatedOnDisk", [aPrefName, cardbookRepository.cardbookServerSyncUpdatedOnDisk[aPrefId]]);
						cardbookUtils.formatStringForOutput("synchroCardsUpdatedOnBoth", [aPrefName, cardbookRepository.cardbookServerSyncUpdatedOnBoth[aPrefId]]);
						cardbookUtils.formatStringForOutput("synchroCardsUpdatedOnDiskDeletedOnServer", [aPrefName, cardbookRepository.cardbookServerSyncUpdatedOnDiskDeletedOnServer[aPrefId]]);
						cardbookUtils.formatStringForOutput("synchroModifGetOKFromServer", [aPrefName, cardbookRepository.cardbookServerGetResponse[aPrefId]]);
						cardbookUtils.formatStringForOutput("synchroModifGetKOFromServer", [aPrefName, cardbookRepository.cardbookServerGetError[aPrefId]]);
						var error = cardbookRepository.cardbookServerCreatedError[aPrefId] + cardbookRepository.cardbookServerUpdatedError[aPrefId] + cardbookRepository.cardbookServerDeletedError[aPrefId];
						var success = cardbookRepository.cardbookServerCreatedResponse[aPrefId] + cardbookRepository.cardbookServerUpdatedResponse[aPrefId] + cardbookRepository.cardbookServerDeletedResponse[aPrefId] - error - cardbookRepository.cardbookServerNotPushed[aPrefId];
						cardbookUtils.formatStringForOutput("synchroModifPutOKToServer", [aPrefName, success]);
						cardbookUtils.formatStringForOutput("synchroModifPutKOToServer", [aPrefName, error]);
						cardbookUtils.formatStringForOutput("imageGetResponse", [aPrefName, cardbookRepository.cardbookImageGetResponse[aPrefId]]);
						cardbookUtils.formatStringForOutput("imageGetError", [aPrefName, cardbookRepository.cardbookImageGetError[aPrefId]]);
					} else {
						cardbookActions.finishSyncActivity(aPrefId);
						cardbookUtils.formatStringForOutput("synchroImpossible", [aPrefName]);
					}
				}
			} else if (aPrefType === "FILE") {
				cardbookUtils.formatStringForOutput("synchroFileFinishedResult", [aPrefName]);
				cardbookUtils.formatStringForOutput("synchroFileCardsOK", [aPrefName, cardbookRepository.cardbookServerSyncDone[aPrefId]]);
				cardbookUtils.formatStringForOutput("synchroFileCardsKO", [aPrefName, cardbookRepository.cardbookServerSyncError[aPrefId]]);
				cardbookUtils.formatStringForOutput("imageGetResponse", [aPrefName, cardbookRepository.cardbookImageGetResponse[aPrefId]]);
				cardbookUtils.formatStringForOutput("imageGetError", [aPrefName, cardbookRepository.cardbookImageGetError[aPrefId]]);
			} else if (aPrefType === "DIRECTORY") {
				cardbookUtils.formatStringForOutput("synchroDirFinishedResult", [aPrefName]);
				cardbookUtils.formatStringForOutput("synchroDirCardsOK", [aPrefName, cardbookRepository.cardbookServerSyncDone[aPrefId]]);
				cardbookUtils.formatStringForOutput("synchroDirCardsKO", [aPrefName, cardbookRepository.cardbookServerSyncError[aPrefId]]);
			} else if (aPrefType === "LOCALDB") {
				cardbookUtils.formatStringForOutput("synchroDBFinishedResult", [aPrefName]);
				cardbookUtils.formatStringForOutput("synchroDBCardsOK", [aPrefName, cardbookRepository.cardbookServerSyncDone[aPrefId]]);
				cardbookUtils.formatStringForOutput("synchroDBCardsKO", [aPrefName, cardbookRepository.cardbookServerSyncError[aPrefId]]);
			}
		},
		
		finishImport: function(aPrefId, aPrefName) {
			cardbookUtils.formatStringForOutput("importFinishedResult", [aPrefName]);
			cardbookUtils.formatStringForOutput("importCardsOK", [aPrefName, cardbookRepository.cardbookServerSyncDone[aPrefId] - cardbookRepository.cardbookServerSyncError[aPrefId]]);
			cardbookUtils.formatStringForOutput("importCardsKO", [aPrefName, cardbookRepository.cardbookServerSyncError[aPrefId]]);
		},
		
		handleWrondPassword: function(aConnection, aStatus, aResponse) {
			if (aStatus == 401) {
				if (!aResponse) {
					return false;
				// Owncloud bug ?
				} else if (aResponse && aResponse.error && aResponse.error[0] && aResponse.error[0].message && aResponse.error[0].message[0] == "No basic authentication headers were found") {
					return false;
				}
				cardbookUtils.formatStringForOutput("synchronizationUnauthorized", [aConnection.connDescription], "Warning");
				// first register the problem
				var myPwdGetId = aConnection.connUser + "::" + cardbookSynchronization.getRootUrl(aConnection.connUrl);
				if (!cardbookRepository.cardbookServerChangedPwd[myPwdGetId]) {
					cardbookRepository.cardbookServerChangedPwd[myPwdGetId] = {dirPrefIdList: [aConnection.connPrefId], openWindow: false, pwdChanged: false};
				} else {
					cardbookRepository.cardbookServerChangedPwd[myPwdGetId].dirPrefIdList.push(aConnection.connPrefId);
				}
				// then ask for a new password
				// if never asked, ask
				// else finish ok : the sync would be done again if the password is changed
				if (!cardbookRepository.cardbookServerChangedPwd[myPwdGetId].openWindow) {
					cardbookRepository.cardbookServerChangedPwd[myPwdGetId].openWindow = true;
					var newPwd = cardbookPasswordManager.getChangedPassword(aConnection.connUser, aConnection.connPrefId);
					if (newPwd != "") {
						cardbookRepository.cardbookServerChangedPwd[myPwdGetId].pwdChanged = true;
					}
				}
				return true;
			}
			return false;
		},

		askUser: function(aMessage, aButton1, aButton2, aButton3, aButton4, aConfirmMessage, aConfirmValue) {
			var myArgs = {message: aMessage, button1: aButton1, button2: aButton2, button3: aButton3, button4: aButton4,
							confirmMessage: aConfirmMessage, confirmValue: aConfirmValue,
							result: "cancel", resultConfirm: false};
			Services.wm.getMostRecentWindow("mail:3pane").openDialog("chrome://cardbook/content/wdw_cardbookAskUser.xul", "", cardbookRepository.modalWindowParams, myArgs);
			return {result: myArgs.result, resultConfirm: myArgs.resultConfirm};
		},
		
		getCardDAVUrl: function (aUrl, aUser) {
			aUrl = cardbookSynchronization.getSlashedUrl(aUrl);
			if (aUrl.search(/\/dav\//) != -1) {
				var relative = aUrl.match("(.*)/dav/(.*)");
				if (relative && relative[1]) {
					return relative[1] + "/dav/addressbooks/" + aUser;
				}
			} else if (aUrl.search(/\/carddav\//) != -1) {
				var relative = aUrl.match("(.*)/carddav/(.*)");
				if (relative && relative[1]) {
					return relative[1] + "/carddav/addressbooks/" + aUser;
				}
			}
			return "";
		},

		getSlashedUrl: function (aUrl) {
			aUrl = aUrl.trim();
			if (aUrl[aUrl.length - 1] != '/') {
				aUrl += '/';
			}
			return aUrl;
		},

		getWellKnownUrl: function (aUrl) {
			aUrl = cardbookSynchronization.getSlashedUrl(aUrl);
			aUrl += '.well-known/carddav';
			return aUrl;
		},
		
		getShortUrl: function (aUrl) {
			try {
				aUrl = cardbookSynchronization.getSlashedUrl(aUrl);
				var urlArray1 = aUrl.split("://");
				var urlArray2 = urlArray1[1].split("/");
				if (urlArray1[0] != "http" && urlArray1[0] != "https") {
					return "";
				}
				urlArray2.pop();
				urlArray2.pop();
				return urlArray1[0] + "://" + urlArray2.join("/");
			}
			catch (e) {
				return "";
			}
		},
		
		getRootUrl: function (aUrl) {
			try {
				aUrl = aUrl.trim();
				var urlArray1 = aUrl.split("://");
				var urlArray2 = urlArray1[1].split("/");
				if (urlArray1[0] != "http" && urlArray1[0] != "https") {
					return "";
				}
				return urlArray1[0] + "://" + urlArray2[0];
			}
			catch (e) {
				return "";
			}
		},
		
		getFileDataAsync: function (aFilePath, aCallback, aParams) {
			let decoder = new TextDecoder();
			let promise = OS.File.read(aFilePath);
			promise = promise.then(
				function onSuccess(array) {
					aCallback(decoder.decode(array), aParams);
				},
				function onError() {
					if (aParams.showError) {
						cardbookLog.updateStatusProgressInformation("cardbookSynchronization.getFileDataAsync error : filename : " + aFilePath, "Error");
					}
					aCallback("", aParams);
				}
			);
		},

		writeFileDataAsync: function (aFilePath, aData, aCallback, aParams) {
			let encoder = new TextEncoder();
			let array = encoder.encode(aData);
			let promise = OS.File.writeAtomic(aFilePath, array, {tmpPath: aFilePath + ".tmp"});
			promise = promise.then(
				function onSuccess() {
					aCallback(aParams);
				},
				function onError() {
					cardbookLog.updateStatusProgressInformation("cardbookSynchronization.writeFileDataAsync error : filename : " + aFilePath, "Error");
				}
			);
		},

		// from Sogo
		cleanedUpHref: function(origHref, origUrl) {
			// href might be something like: http://foo:80/bar while this.gURL might
			// be something like: http://foo/bar so we strip the port value if the URLs
			// don't match. eGroupWare sends back such data.
		
			let hrefArray = origHref.split("/");
			let noprefix = false;
			// 		dump("hrefArray: " + hrefArray + "\n");
		
			if (hrefArray[0].substr(0,5) == "https"
				&& hrefArray[2].indexOf(":443") > 0) {
				hrefArray[2] = hrefArray[2].substring(0, hrefArray[2].length-4);
			}
			else if (hrefArray[0].substr(0,4) == "http" && hrefArray[2].indexOf(":80") > 0) {
				hrefArray[2] = hrefArray[2].substring(0, hrefArray[2].length-3);
			} else {
				noprefix = true;
			}
			let href = hrefArray.join("/");
		
			// We also check if this.gURL begins with http{s}:// but NOT href. If
			// that's the case, with servers such as OpenGroupware.org (OGo), we
			// prepend the relevant part.
			//
			// For example, this.gURL could be:
			// http://foo.bar/zidestore/dav/fred/public/Contacts/
			// while href is:
			// /dav/fred/public/Contacts/
			//
			if (noprefix && origUrl.substr(0,4) == "http") {
				let gURLArray = origUrl.split("/");
				href = gURLArray[0] + "//" + gURLArray[2] + href;
			}
		
			// 		dump("Cleaned up href: " + href + "\n");
		
			return href;
		},
		
		// from Sogo
		URLsAreEqual: function(href1, href2) {
			if (href1 == href2) {
				return true;
			}
			
			let resPathComponents1 = href1.split("/");
			let resPathComponents2 = href2.split("/");
	
			return ((resPathComponents1[2] == resPathComponents2[2]) && (resPathComponents1[resPathComponents1.length-2] == resPathComponents2[resPathComponents2.length-2]));
		},

		// from Sogo
		isSupportedvCardType: function(aContentType, aFileName) {
			if (aContentType.indexOf("text/x-vcard") == 0 || aContentType.indexOf("text/vcard") == 0) {
				return true;
			} else {
				var myExtension = cardbookUtils.getFileNameExtension(aFileName);
				if (myExtension.toLowerCase() == "vcf") {
					return true;
				}
				return false;
			}
		},

		// from Sogo
		isSupportedvCardListType: function(aContentType, aFileName) {
			if (aContentType.indexOf("text/x-vlist") == 0) {
				return true;
			} else {
				var myExtension =  cardbookUtils.getFileNameExtension(aFileName);
				if (myExtension.toLowerCase() == "vcf") {
					return true;
				}
				return false;
			}
		},

		isSupportedContentType: function(aContentType, aFileName) {
			if (cardbookSynchronization.isSupportedvCardType(aContentType, aFileName) || cardbookSynchronization.isSupportedvCardListType(aContentType, aFileName) ) {
				return true;
			} else {
				return false;
			}
		},

		isStatusCorrect: function(aStatusText) {
			if (aStatusText.startsWith("HTTP/1.1 200") || aStatusText.startsWith("HTTP/1.0 200")) {
				return true;
			}
			return false;
		},

		serverDelete: function(aConnection, aMode, aCard, aPrefIdType) {
			var listener_delete = {
				onDAVQueryComplete: function(status, response, askCertificate) {
					if (status > 199 && status < 400) {
						cardbookUtils.formatStringForOutput("serverCardDeletedFromServer", [aConnection.connDescription, aCard.fn]);
						cardbookRepository.removeCardFromRepository(aCard, true);
					} else if (status == 404) {
						cardbookUtils.formatStringForOutput("serverCardNotExistServer", [aConnection.connDescription, aCard.fn]);
						cardbookRepository.removeCardFromRepository(aCard, true);
					} else {
						cardbookRepository.cardbookServerDeletedError[aConnection.connPrefId]++;
						cardbookUtils.formatStringForOutput("serverCardDeleteFailed", [aConnection.connDescription, aCard.fn, aConnection.connUrl, status], "Error");
						cardbookUtils.addTagDeleted(aCard);
						cardbookRepository.addCardToCache(aCard, aMode, cardbookUtils.getFileNameFromUrl(aConnection.connUrl));
						if (cardbookRepository.cardbookCards[aCard.dirPrefId+"::"+aCard.uid]) {
							cardbookRepository.removeCardFromRepository(aCard, false);
						}
					}
					cardbookRepository.cardbookServerSyncDone[aConnection.connPrefId]++;
					cardbookRepository.cardbookServerDeletedResponse[aConnection.connPrefId]++;
				}
			};
			if (cardbookSynchronization.getModifsPushed(aConnection.connPrefId) <= cardbookPreferences.getMaxModifsPushed()) {
				cardbookUtils.nullifyTagModification(aCard);
				var request = new cardbookWebDAV(aConnection, listener_delete);
				cardbookUtils.formatStringForOutput("serverCardSendingDeletion", [aConnection.connDescription, aCard.fn]);
				request.delete();
			} else {
				cardbookRepository.cardbookServerSyncDone[aConnection.connPrefId]++;
				cardbookRepository.cardbookServerDeletedResponse[aConnection.connPrefId]++;
				cardbookRepository.cardbookServerNotPushed[aConnection.connPrefId]++;
			}
		},

		serverUpdate: function(aConnection, aMode, aCard, aModifiedCard, aPrefIdType) {
			var listener_update = {
				onDAVQueryComplete: function(status, response, askCertificate, etag) {
					if (status > 199 && status < 400) {
						if (etag) {
							cardbookUtils.formatStringForOutput("serverCardUpdatedOnServerWithEtag", [aConnection.connDescription, aModifiedCard.fn, etag]);
							cardbookUtils.addEtag(aModifiedCard, etag);
						} else {
							cardbookRepository.cardbookServerSyncAgain[aConnection.connPrefId] = true;
							cardbookUtils.formatStringForOutput("serverCardUpdatedOnServerWithoutEtag", [aConnection.connDescription, aModifiedCard.fn]);
							cardbookUtils.addEtag(aModifiedCard, "0");
						}
						cardbookRepository.cardbookServerSyncDone[aConnection.connPrefId]++;
						// if aCard and aCard have the same cached medias
						cardbookUtils.changeMediaFromFileToContent(aModifiedCard);
						cardbookRepository.removeCardFromRepository(aCard, true);
						cardbookRepository.addCardToRepository(aModifiedCard, aMode, cardbookUtils.getFileNameFromUrl(aConnection.connUrl));
					} else {
						cardbookUtils.addTagUpdated(aModifiedCard);
						cardbookRepository.cardbookServerSyncDone[aConnection.connPrefId]++;
						cardbookRepository.cardbookServerUpdatedError[aConnection.connPrefId]++;
						cardbookUtils.formatStringForOutput("serverCardUpdateFailed", [aConnection.connDescription, aModifiedCard.fn, aConnection.connUrl, status], "Error");
					}
					cardbookRepository.cardbookServerUpdatedResponse[aConnection.connPrefId]++;
				}
			};
			if (cardbookSynchronization.getModifsPushed(aConnection.connPrefId) <= cardbookPreferences.getMaxModifsPushed()) {
				cardbookUtils.nullifyTagModification(aModifiedCard);
				var request = new cardbookWebDAV(aConnection, listener_update, aModifiedCard.etag);
				var cardContent = cardbookUtils.getvCardForServer(aModifiedCard, true);
				cardbookUtils.formatStringForOutput("serverCardSendingUpdate", [aConnection.connDescription, aModifiedCard.fn]);
				request.put(cardContent, "text/vcard; charset=utf-8");
			} else {
				cardbookRepository.cardbookServerSyncDone[aConnection.connPrefId]++;
				cardbookRepository.cardbookServerUpdatedResponse[aConnection.connPrefId]++;
				cardbookRepository.cardbookServerNotPushed[aConnection.connPrefId]++;
			}
		},

		serverCreate: function(aConnection, aMode, aCard, aPrefIdType) {
			var listener_create = {
				onDAVQueryComplete: function(status, response, askCertificate, etag) {
					if (status > 199 && status < 400) {
						if (cardbookRepository.cardbookCards[aCard.dirPrefId+"::"+aCard.uid]) {
							// if aCard and aCard have the same cached medias
							cardbookUtils.changeMediaFromFileToContent(aCard);
							var myOldCard = cardbookRepository.cardbookCards[aCard.dirPrefId+"::"+aCard.uid];
							cardbookRepository.removeCardFromRepository(myOldCard, true);
						}
						if (etag) {
							cardbookUtils.formatStringForOutput("serverCardCreatedOnServerWithEtag", [aConnection.connDescription, aCard.fn, etag]);
							cardbookUtils.addEtag(aCard, etag);
						} else {
							cardbookRepository.cardbookServerSyncAgain[aConnection.connPrefId] = true;
							cardbookUtils.formatStringForOutput("serverCardCreatedOnServerWithoutEtag", [aConnection.connDescription, aCard.fn]);
						}
						cardbookRepository.addCardToRepository(aCard, aMode, cardbookUtils.getFileNameFromUrl(aConnection.connUrl));
					} else {
						cardbookUtils.addTagCreated(aCard);
						cardbookRepository.cardbookServerCreatedError[aConnection.connPrefId]++;
						cardbookUtils.formatStringForOutput("serverCardCreateFailed", [aConnection.connDescription, aCard.fn, aConnection.connUrl, status], "Error");
					}
					cardbookRepository.cardbookServerCreatedResponse[aConnection.connPrefId]++;
					cardbookRepository.cardbookServerSyncDone[aConnection.connPrefId]++;
				}
			};
			if (cardbookSynchronization.getModifsPushed(aConnection.connPrefId) <= cardbookPreferences.getMaxModifsPushed()) {
				cardbookUtils.prepareCardForCreation(aCard, aPrefIdType, aConnection.connUrl);
				aConnection.connUrl = aCard.cardurl;
				cardbookUtils.nullifyTagModification(aCard);
				cardbookUtils.addEtag(aCard, "0");
				var request = new cardbookWebDAV(aConnection, listener_create, aCard.etag);
				var cardContent = cardbookUtils.getvCardForServer(aCard, true);
				cardbookUtils.formatStringForOutput("serverCardSendingCreate", [aConnection.connDescription, aCard.fn]);
				request.put(cardContent, "text/vcard; charset=utf-8");
			} else {
				cardbookRepository.cardbookServerSyncDone[aConnection.connPrefId]++;
				cardbookRepository.cardbookServerCreatedResponse[aConnection.connPrefId]++;
				cardbookRepository.cardbookServerNotPushed[aConnection.connPrefId]++;
			}
		},

		serverGetForMerge: function(aConnection, aMode, aEtag, aCacheCard, aPrefIdType) {
			var listener_get = {
				onDAVQueryComplete: function(status, response, askCertificate, etag) {
					if (status > 199 && status < 400) {
						try {
							var myCard = new cardbookCardParser(response, aConnection.connUrl, etag, aConnection.connPrefId);
							var photoTmpFile = cardbookUtils.getTempFile("CardBookPhotoTemp." + myCard.photo.extension);
							cardbookSynchronization.writeContentToFile(photoTmpFile.path, myCard.photo.value, "NOUTF8");
							myCard.photo.value = "";
							myCard.photo.URI = "";
							myCard.photo.localURI = "file:///" + photoTmpFile.path;
						}
						catch (e) {
							cardbookRepository.cardbookServerSyncDone[aConnection.connPrefId]++;
							cardbookRepository.cardbookServerGetForMergeResponse[aConnection.connPrefId]++;
							cardbookRepository.cardbookServerGetForMergeError[aConnection.connPrefId]++;
							if (e.message == "") {
								cardbookUtils.formatStringForOutput("parsingCardError", [aConnection.connDescription, cardbookRepository.strBundle.GetStringFromName(e.code), response], "Error");
							} else {
								cardbookUtils.formatStringForOutput("parsingCardError", [aConnection.connDescription, e.message, response], "Error");
							}
							return;
						}
						cardbookUtils.formatStringForOutput("serverCardGetOK", [aConnection.connDescription, myCard.fn]);
						var myArgs = {cardsIn: [myCard, aCacheCard], cardsOut: [], hideCreate: true, action: ""};
						var myWindow = window.openDialog("chrome://cardbook/content/mergeCards/wdw_mergeCards.xul", "", cardbookRepository.modalWindowParams, myArgs);
						if (myArgs.action == "CREATEANDREPLACE") {
							myArgs.cardsOut[0].uid = aCacheCard.uid;
							cardbookUtils.addEtag(myArgs.cardsOut[0], aEtag);
							cardbookUtils.setCalculatedFields(myArgs.cardsOut[0]);
							cardbookRepository.cardbookServerUpdatedRequest[aConnection.connPrefId]++;
							cardbookRepository.cardbookServerGetForMergeResponse[aConnection.connPrefId]++;
							cardbookSynchronization.serverUpdate(aConnection, aMode, aCacheCard, myArgs.cardsOut[0], aPrefIdType);
						} else {
							cardbookRepository.cardbookServerSyncDone[aConnection.connPrefId]++;
							cardbookRepository.cardbookServerGetForMergeResponse[aConnection.connPrefId]++;
						}
					} else {
						cardbookRepository.cardbookServerGetForMergeError[aConnection.connPrefId]++;
						cardbookRepository.cardbookServerGetForMergeResponse[aConnection.connPrefId]++;
						cardbookRepository.cardbookServerSyncDone[aConnection.connPrefId]++;
						cardbookUtils.formatStringForOutput("serverCardGetFailed", [aConnection.connDescription, aConnection.connUrl, status], "Error");
					}
				}
			};
			let request = new cardbookWebDAV(aConnection, listener_get);
			request.get("text/vcard");
		},

		serverGet: function(aConnection, aMode) {
			var listener_get = {
				onDAVQueryComplete: function(status, response, askCertificate, etag) {
					if (status > 199 && status < 400) {
						try {
							var myCard = new cardbookCardParser(response, aConnection.connUrl, etag, aConnection.connPrefId);
						}
						catch (e) {
							cardbookRepository.cardbookServerSyncDone[aConnection.connPrefId]++;
							cardbookRepository.cardbookServerGetResponse[aConnection.connPrefId]++;
							cardbookRepository.cardbookServerGetError[aConnection.connPrefId]++;
							if (e.message == "") {
								cardbookUtils.formatStringForOutput("parsingCardError", [aParams.aPrefIdName, cardbookRepository.strBundle.GetStringFromName(e.code), response], "Error");
							} else {
								cardbookUtils.formatStringForOutput("parsingCardError", [aParams.aPrefIdName, e.message, response], "Error");
							}
							return;
						}
						if (cardbookRepository.cardbookCards[myCard.dirPrefId+"::"+myCard.uid]) {
							var myOldCard = cardbookRepository.cardbookCards[myCard.dirPrefId+"::"+myCard.uid];
							cardbookRepository.removeCardFromRepository(myOldCard, true);
						}
						cardbookRepository.addCardToRepository(myCard, aMode, cardbookUtils.getFileNameFromUrl(aConnection.connUrl));
						cardbookUtils.formatStringForOutput("serverCardGetOK", [aConnection.connDescription, myCard.fn]);
					} else {
						cardbookRepository.cardbookServerGetError[aConnection.connPrefId]++;
						cardbookUtils.formatStringForOutput("serverCardGetFailed", [aConnection.connDescription, aConnection.connUrl, status], "Error");
					}
					cardbookRepository.cardbookServerSyncDone[aConnection.connPrefId]++;
					cardbookRepository.cardbookServerGetResponse[aConnection.connPrefId]++;
				}
			};
			let request = new cardbookWebDAV(aConnection, listener_get);
			request.get("text/vcard");
		},

		serverMultiGet: function(aConnection, aMode) {
			var listener_multiget = {
				onDAVQueryComplete: function(status, response, askCertificate, etagDummy, length) {
					if (response && response["parsererror"] && response["parsererror"][0]["sourcetext"] && response["parsererror"][0]["sourcetext"][0]) {
						cardbookUtils.formatStringForOutput("unableToParseResponse", [aConnection.connDescription, response["parsererror"][0]["sourcetext"][0]], "Error");
						cardbookRepository.cardbookServerSyncDone[aConnection.connPrefId] = cardbookRepository.cardbookServerSyncDone[aConnection.connPrefId] + length;
						cardbookRepository.cardbookServerMultiGetError[aConnection.connPrefId]++;
					} else if (response && response["multistatus"] && (status > 199 && status < 400)) {
						try {
							let jsonResponses = response["multistatus"][0]["response"];
							for (var prop in jsonResponses) {
								var jsonResponse = jsonResponses[prop];
								try {
									let href = decodeURIComponent(jsonResponse["href"][0]);
									let propstats = jsonResponse["propstat"];
									// 2015.04.27 14:03:55 : href : /remote.php/carddav/addressbooks/11111/contacts/
									// 2015.04.27 14:03:55 : propstats : [{prop:[{getcontenttype:[null], getetag:[null]}], status:["HTTP/1.1 404 Not Found"]}]
									// 2015.04.27 14:03:55 : href : /remote.php/carddav/addressbooks/11111/contacts/C68894CF-D340-0001-78C3-1E301B4011F5.vcf
									// 2015.04.27 14:03:55 : propstats : [{prop:[{getcontenttype:["text/x-vcard"], getetag:["\"6163e30117192647e1967de751fb5467\""]}], status:["HTTP/1.1 200 OK"]}]
									for (var prop1 in propstats) {
										var propstat = propstats[prop1];
										cardbookRepository.cardbookServerGetRequest[aConnection.connPrefId]++;
										if (cardbookSynchronization.isStatusCorrect(propstat["status"][0])) {
											if (propstat["prop"] != null && propstat["prop"] !== undefined && propstat["prop"] != "") {
												let prop2 = propstat["prop"][0];
												if (typeof(prop2["getetag"]) == "undefined") {
													var etag = "";
												} else {
													var etag = prop2["getetag"][0];
												}
												try {
													var myContent = decodeURIComponent(prop2["address-data"][0]);
												}
												catch (e) {
													var myContent = prop2["address-data"][0];
												}
												try {
													var aRootUrl = cardbookSynchronization.getRootUrl(aConnection.connUrl);
													var myCard = new cardbookCardParser(myContent, aRootUrl + href, etag, aConnection.connPrefId);
												}
												catch (e) {
													cardbookRepository.cardbookServerSyncDone[aConnection.connPrefId]++;
													cardbookRepository.cardbookServerGetResponse[aConnection.connPrefId]++;
													cardbookRepository.cardbookServerGetError[aConnection.connPrefId]++;
													if (e.message == "") {
														cardbookUtils.formatStringForOutput("parsingCardError", [aConnection.connDescription, cardbookRepository.strBundle.GetStringFromName(e.code), myContent], "Error");
													} else {
														cardbookUtils.formatStringForOutput("parsingCardError", [aConnection.connDescription, e.message, myContent], "Error");
													}
													continue;
												}
												if (cardbookRepository.cardbookCards[myCard.dirPrefId+"::"+myCard.uid]) {
													var myOldCard = cardbookRepository.cardbookCards[myCard.dirPrefId+"::"+myCard.uid];
													cardbookRepository.removeCardFromRepository(myOldCard, true);
												}
												cardbookRepository.addCardToRepository(myCard, aMode, cardbookUtils.getFileNameFromUrl(aConnection.connUrl + href));
												cardbookUtils.formatStringForOutput("serverCardGetOK", [aConnection.connDescription, myCard.fn]);
											} else {
												cardbookRepository.cardbookServerGetError[aConnection.connPrefId]++;
												cardbookUtils.formatStringForOutput("serverCardGetFailed", [aConnection.connDescription, aConnection.connUrl, status], "Error");
											}
										} else {
											cardbookRepository.cardbookServerGetError[aConnection.connPrefId]++;
											cardbookUtils.formatStringForOutput("serverCardGetFailed", [aConnection.connDescription, aConnection.connUrl, status], "Error");
										}
										cardbookRepository.cardbookServerSyncDone[aConnection.connPrefId]++;
										cardbookRepository.cardbookServerGetResponse[aConnection.connPrefId]++;
									}
								}
								catch(e) {
									cardbookRepository.cardbookServerGetResponse[aConnection.connPrefId]++;
									cardbookRepository.cardbookServerSyncDone[aConnection.connPrefId]++;
									cardbookRepository.cardbookServerMultiGetError[aConnection.connPrefId]++;
									cardbookLog.updateStatusProgressInformation(aConnection.connDescription + " : cardbookSynchronization.serverMultiGet error : " + e, "Error");
								}
							}
						}
						catch(e) {
							cardbookRepository.cardbookServerSyncDone[aConnection.connPrefId] = cardbookRepository.cardbookServerSyncDone[aConnection.connPrefId] + length;
							cardbookRepository.cardbookServerMultiGetError[aConnection.connPrefId]++;
							cardbookLog.updateStatusProgressInformation(aConnection.connDescription + " : cardbookSynchronization.serverMultiGet error : " + e, "Error");
						}
					} else {
						cardbookRepository.cardbookServerSyncDone[aConnection.connPrefId] = cardbookRepository.cardbookServerSyncDone[aConnection.connPrefId] + length;
						cardbookRepository.cardbookServerMultiGetError[aConnection.connPrefId]++;
					}
					cardbookRepository.cardbookServerMultiGetResponse[aConnection.connPrefId]++;
				}
			};
			var multiget = cardbookPreferences.getStringPref("extensions.cardbook.multiget");
			for (var i = 0; i < cardbookRepository.cardbookServerMultiGetArray[aConnection.connPrefId].length; i = i + +multiget) {
				var subArray = cardbookRepository.cardbookServerMultiGetArray[aConnection.connPrefId].slice(i, i + +multiget);
				let request = new cardbookWebDAV(aConnection, listener_multiget, "", true);
				cardbookRepository.cardbookServerMultiGetRequest[aConnection.connPrefId]++;
				request.reportMultiget(subArray);
			}
		},

		getCacheFiles: function (aPrefId) {
			cardbookRepository.filesFromCacheDB[aPrefId] = {};
			if (cardbookRepository.cardbookFileCacheCards[aPrefId]) {
				cardbookRepository.filesFromCacheDB[aPrefId] = JSON.parse(JSON.stringify(cardbookRepository.cardbookFileCacheCards[aPrefId]));
			}
			var length = 0;
			if (cardbookRepository.cardbookFileCacheCards[aPrefId]) {
				for (var i in cardbookRepository.cardbookFileCacheCards[aPrefId]) {
					length++;
				}
			}
			return length;
		},

		getFilesFromDir: function (aDirName) {
			var listOfFileName = [];
			try {
				var myDirectory = Components.classes["@mozilla.org/file/local;1"].createInstance(Components.interfaces.nsIFile);
				myDirectory.initWithPath(aDirName);
				var files = myDirectory.directoryEntries;
				while (files.hasMoreElements()) {
					var file = files.getNext().QueryInterface(Components.interfaces.nsIFile);
					if (file.isFile()) {
						listOfFileName.push(file.leafName);
					}
				}
			} catch(e) {}
			return listOfFileName;
		},

		loadDir: function (aDir, aDirPrefId, aTarget, aMode, aImportMode, aActionId) {
			var aListOfFileName = [];
			aListOfFileName = cardbookSynchronization.getFilesFromDir(aDir.path);
			cardbookRepository.cardbookServerSyncTotal[aDirPrefId] = aListOfFileName.length;
			// load dir in background
			Services.tm.currentThread.dispatch({ run: function() {
				for (var i = 0; i < aListOfFileName.length; i++) {
					var myFile = Components.classes["@mozilla.org/file/local;1"].createInstance(Components.interfaces.nsIFile);
					myFile.initWithPath(aDir.path);
					myFile.append(aListOfFileName[i]);
					if (myFile.exists() && myFile.isFile()) {
						cardbookRepository.cardbookFileRequest[aDirPrefId]++;
						// then load the files one by one to avoid freeze
						Services.tm.currentThread.dispatch({ run: function() {
							cardbookSynchronization.loadFile(myFile, aDirPrefId, aTarget, aMode, aImportMode, aActionId);
						}}, Components.interfaces.nsIEventTarget.DISPATCH_SYNC);
					} else {
						cardbookRepository.cardbookServerSyncDone[aDirPrefId]++;
					}
				}
			}}, Components.interfaces.nsIEventTarget.DISPATCH_NORMAL);
			cardbookRepository.cardbookDirResponse[aDirPrefId]++;
		},

		handleRemainingCache: function (aPrefIdType, aConnection, aMode) {
			if (cardbookRepository.filesFromCacheDB[aConnection.connPrefId]) {
				for (var i in cardbookRepository.filesFromCacheDB[aConnection.connPrefId]) {
					var params = {};
					params["showError"] = true;
					params["aConnection"] = aConnection;
					params["aMode"] = aMode;
					params["aPrefIdType"] = aPrefIdType;
					params["aDirPrefId"] = aConnection.connPrefId;
					cardbookSynchronization.handleRemainingCacheAsync(cardbookRepository.filesFromCacheDB[aConnection.connPrefId][i], params);
				}
			}
		},

		handleRemainingCacheAsync: function (aCard, aParams) {
			try {
				if (aCard.created) {
					// "NEWONDISK";
					cardbookUtils.formatStringForOutput("cardNewOnDisk", [aParams.aConnection.connDescription, aCard.fn]);
					cardbookRepository.cardbookServerCreatedRequest[aParams.aConnection.connPrefId]++;
					cardbookRepository.cardbookServerSyncTotal[aParams.aConnection.connPrefId]++;
					cardbookRepository.cardbookServerSyncNewOnDisk[aParams.aConnection.connPrefId]++;
					var aCreateConnection = JSON.parse(JSON.stringify(aParams.aConnection));
					cardbookSynchronization.serverCreate(aCreateConnection, aParams.aMode, aCard, aParams.aPrefIdType);
				} else if (aCard.updated) {
					// "UPDATEDONDISKDELETEDONSERVER";
					cardbookUtils.formatStringForOutput("cardUpdatedOnDiskDeletedOnServer", [aParams.aConnection.connDescription, aCard.fn]);
					cardbookRepository.cardbookServerSyncTotal[aParams.aConnection.connPrefId]++;
					cardbookRepository.cardbookServerSyncUpdatedOnDiskDeletedOnServer[aParams.aConnection.connPrefId]++;
					var solveConflicts = cardbookPreferences.getStringPref("extensions.cardbook.solveConflicts");
					if (solveConflicts === "Local") {
						var conflictResult = "keep";
					} else if (solveConflicts === "Remote") {
						var conflictResult = "delete";
					} else {
						var message = cardbookRepository.strBundle.formatStringFromName("cardUpdatedOnDiskDeletedOnServer", [aParams.aConnection.connDescription, aCard.fn], 2);
						var askUserResult = cardbookSynchronization.askUser(message, "keep", "delete");
						var conflictResult = askUserResult.result;
					}
					
					cardbookLog.updateStatusProgressInformationWithDebug1(aParams.aConnection.connDescription + " : debug mode : conflict resolution : ", conflictResult);
					switch (conflictResult) {
						case "keep":
							cardbookRepository.cardbookServerCreatedRequest[aParams.aConnection.connPrefId]++;
							var aCreateConnection = JSON.parse(JSON.stringify(aParams.aConnection));
							cardbookSynchronization.serverCreate(aCreateConnection, aParams.aMode, aCard, aParams.aPrefIdType);
							break;
						case "delete":
							cardbookRepository.removeCardFromRepository(aCard, true);
							cardbookRepository.cardbookServerGetRequest[aParams.aConnection.connPrefId]++;
							cardbookRepository.cardbookServerGetResponse[aParams.aConnection.connPrefId]++;
							cardbookRepository.cardbookServerSyncDone[aParams.aConnection.connPrefId]++;
							break;
						case "cancel":
							cardbookRepository.cardbookServerSyncDone[aParams.aConnection.connPrefId]++;
							break;
					}
				} else if (!aCard.deleted) {
					// "DELETEDONSERVER";
					cardbookRepository.cardbookServerSyncTotal[aParams.aConnection.connPrefId]++;
					cardbookUtils.formatStringForOutput("cardDeletedOnServer", [aParams.aConnection.connDescription, aCard.fn]);
					cardbookRepository.removeCardFromRepository(aCard, true);
					cardbookRepository.cardbookServerSyncDone[aParams.aConnection.connPrefId]++;
					cardbookRepository.cardbookServerSyncDeletedOnServer[aParams.aConnection.connPrefId]++;
				}
				cardbookRepository.cardbookServerSyncHandleRemainingDone[aParams.aConnection.connPrefId]++;
			}
			catch (e) {}
		},

		compareServerCardWithCache: function (aCardConnection, aConnection, aMode, aPrefIdType, aUrl, aEtag, aFileName) {
			if (cardbookRepository.cardbookFileCacheCards[aConnection.connPrefId] && cardbookRepository.cardbookFileCacheCards[aConnection.connPrefId][aFileName]) {
				var myCacheCard = cardbookRepository.cardbookFileCacheCards[aConnection.connPrefId][aFileName];
				var myServerCard = new cardbookCardParser();
				cardbookUtils.cloneCard(myCacheCard, myServerCard);
				cardbookUtils.addEtag(myServerCard, aEtag);
				if (myCacheCard.etag == aEtag) {
					if (myCacheCard.deleted) {
						// "DELETEDONDISK";
						cardbookRepository.cardbookServerDeletedRequest[aConnection.connPrefId]++;
						cardbookRepository.cardbookServerSyncDeletedOnDisk[aConnection.connPrefId]++;
						cardbookUtils.formatStringForOutput("cardDeletedOnDisk", [aConnection.connDescription, myCacheCard.fn]);
						cardbookSynchronization.serverDelete(aCardConnection, aMode, myCacheCard, aPrefIdType);
					} else if (myCacheCard.updated) {
						// "UPDATEDONDISK";
						cardbookRepository.cardbookServerUpdatedRequest[aConnection.connPrefId]++;
						cardbookRepository.cardbookServerSyncUpdatedOnDisk[aConnection.connPrefId]++;
						cardbookUtils.formatStringForOutput("cardUpdatedOnDisk", [aConnection.connDescription, myCacheCard.fn]);
						cardbookSynchronization.serverUpdate(aCardConnection, aMode, myCacheCard, myServerCard, aPrefIdType);
					} else {
						// "NOTUPDATED";
						if (cardbookRepository.cardbookCards[aConnection.connPrefId+"::"+myCacheCard.uid]) {
							cardbookRepository.cardbookCards[aConnection.connPrefId+"::"+myCacheCard.uid].cardurl = aUrl;
							cardbookUtils.formatStringForOutput("cardAlreadyGetFromCache", [aConnection.connDescription, myCacheCard.fn]);
						} else {
							cardbookRepository.addCardToRepository(myCacheCard, aMode);
							cardbookUtils.formatStringForOutput("cardGetFromCache", [aConnection.connDescription, myCacheCard.fn]);
						}
						cardbookRepository.cardbookServerSyncDone[aConnection.connPrefId]++;
						cardbookRepository.cardbookServerSyncNotUpdated[aConnection.connPrefId]++;
					}
				} else if (myCacheCard.deleted) {
					// "DELETEDONDISKUPDATEDONSERVER";
					cardbookRepository.cardbookServerSyncDeletedOnDiskUpdatedOnServer[aConnection.connPrefId]++;
					cardbookUtils.formatStringForOutput("cardDeletedOnDiskUpdatedOnServer", [aConnection.connDescription, myCacheCard.fn]);
					var solveConflicts = cardbookPreferences.getStringPref("extensions.cardbook.solveConflicts");
					if (solveConflicts === "Local") {
						var conflictResult = "delete";
					} else if (solveConflicts === "Remote") {
						var conflictResult = "keep";
					} else {
						var message = cardbookRepository.strBundle.formatStringFromName("cardDeletedOnDiskUpdatedOnServer", [aConnection.connDescription, myCacheCard.fn], 2);
						var askUserResult = cardbookSynchronization.askUser(message, "keep", "delete");
						var conflictResult = askUserResult.result;
					}
					
					cardbookLog.updateStatusProgressInformationWithDebug1(aConnection.connDescription + " : debug mode : conflict resolution : ", conflictResult);
					switch (conflictResult) {
						case "keep":
							cardbookRepository.removeCardFromRepository(myCacheCard, true);
							cardbookRepository.cardbookServerMultiGetArray[aCardConnection.connPrefId].push(aUrl);
							break;
						case "delete":
							cardbookRepository.cardbookServerDeletedRequest[aConnection.connPrefId]++;
							cardbookSynchronization.serverDelete(aCardConnection, aMode, myCacheCard, aPrefIdType);
							break;
						case "cancel":
							cardbookRepository.cardbookServerSyncDone[aConnection.connPrefId]++;
							break;
					}
				} else if (myCacheCard.updated) {
					// "UPDATEDONBOTH";
					cardbookRepository.cardbookServerSyncUpdatedOnBoth[aConnection.connPrefId]++;
					cardbookUtils.formatStringForOutput("cardUpdatedOnBoth", [aConnection.connDescription, myCacheCard.fn]);
					var solveConflicts = cardbookPreferences.getStringPref("extensions.cardbook.solveConflicts");
					if (solveConflicts === "Local") {
						var conflictResult = "local";
					} else if (solveConflicts === "Remote") {
						var conflictResult = "remote";
					} else {
						var message = cardbookRepository.strBundle.formatStringFromName("cardUpdatedOnBoth", [aConnection.connDescription, myCacheCard.fn], 2);
						var askUserResult = cardbookSynchronization.askUser(message, "local", "remote", "merge");
						var conflictResult = askUserResult.result;
					}
					
					cardbookLog.updateStatusProgressInformationWithDebug1(aConnection.connDescription + " : debug mode : conflict resolution : ", conflictResult);
					switch (conflictResult) {
						case "local":
							cardbookRepository.cardbookServerUpdatedRequest[aConnection.connPrefId]++;
							cardbookSynchronization.serverUpdate(aCardConnection, aMode, myCacheCard, myServerCard, aPrefIdType);
							break;
						case "remote":
							cardbookRepository.cardbookServerMultiGetArray[aCardConnection.connPrefId].push(aUrl);
							break;
						case "merge":
							cardbookRepository.cardbookServerGetForMergeRequest[aConnection.connPrefId]++;
							cardbookSynchronization.serverGetForMerge(aCardConnection, aMode, aEtag, myCacheCard, aPrefIdType);
							break;
						case "cancel":
							cardbookRepository.cardbookServerSyncDone[aConnection.connPrefId]++;
							break;
					}
				} else {
					// "UPDATEDONSERVER";
					cardbookRepository.cardbookServerMultiGetArray[aCardConnection.connPrefId].push(aUrl);
					cardbookRepository.cardbookServerSyncUpdatedOnServer[aConnection.connPrefId]++;
					cardbookUtils.formatStringForOutput("cardUpdatedOnServer", [aConnection.connDescription, myCacheCard.fn, aEtag, myCacheCard.etag]);
				}
			} else {
				// "NEWONSERVER";
				cardbookRepository.cardbookServerMultiGetArray[aCardConnection.connPrefId].push(aUrl);
				cardbookRepository.cardbookServerSyncNewOnServer[aConnection.connPrefId]++;
				cardbookUtils.formatStringForOutput("cardNewOnServer", [aConnection.connDescription]);
			}
			cardbookRepository.cardbookServerMultiGetParams[aCardConnection.connPrefId] = [ aConnection, aMode ];
			cardbookRepository.cardbookServerSyncCompareWithCacheDone[aConnection.connPrefId]++;
		},

		serverSearchRemote: function(aConnection, aMode, aValue, aPrefIdType) {
			var listener_reportQuery = {
				onDAVQueryComplete: function(status, response, askCertificate) {
					if (status == 0) {
						if (askCertificate) {
							var certificateExceptionAdded = false;
							var certificateExceptionAdded = cardbookSynchronization.addCertificateException(cardbookSynchronization.getRootUrl(aConnection.connUrl));
							if (certificateExceptionAdded) {
								cardbookSynchronization.serverSearchRemote(aConnection, aValue, aPrefIdType);
							} else {
								cardbookUtils.formatStringForOutput("synchronizationFailed", [aConnection.connDescription, "serverSearchRemote", aConnection.connUrl, status], "Error");
								cardbookRepository.cardbookServerSyncError[aConnection.connPrefId]++;
								cardbookRepository.cardbookServerSyncResponse[aConnection.connPrefId]++;
							}
						} else {
							cardbookUtils.formatStringForOutput("synchronizationFailed", [aConnection.connDescription, "serverSearchRemote", aConnection.connUrl, status], "Error");
							cardbookRepository.cardbookServerSyncError[aConnection.connPrefId]++;
							cardbookRepository.cardbookServerSyncResponse[aConnection.connPrefId]++;
						}
					} else if (response && response["parsererror"] && response["parsererror"][0]["sourcetext"] && response["parsererror"][0]["sourcetext"][0]) {
						cardbookUtils.formatStringForOutput("unableToParseResponse", [aConnection.connDescription, response["parsererror"][0]["sourcetext"][0]], "Error");
						cardbookRepository.cardbookServerSyncError[aConnection.connPrefId]++;
						cardbookRepository.cardbookServerSyncResponse[aConnection.connPrefId]++;
					} else if (response && response["multistatus"] && (status > 199 && status < 400)) {
						try {
							if (response["multistatus"][0] && response["multistatus"][0]["response"]) {
								let jsonResponses = response["multistatus"][0]["response"];
								for (var prop in jsonResponses) {
									var jsonResponse = jsonResponses[prop];
									try {
										let href = decodeURIComponent(jsonResponse["href"][0]);
										let propstats = jsonResponse["propstat"];
										for (var prop1 in propstats) {
											var propstat = propstats[prop1];
											cardbookRepository.cardbookServerGetRequest[aConnection.connPrefId]++;
											if (cardbookSynchronization.isStatusCorrect(propstat["status"][0])) {
												if (propstat["prop"] != null && propstat["prop"] !== undefined && propstat["prop"] != "") {
													let prop2 = propstat["prop"][0];
													if (typeof(prop2["getetag"]) == "undefined") {
														var etag = "";
													} else {
														var etag = prop2["getetag"][0];
													}
													try {
														var myContent = decodeURIComponent(prop2["address-data"][0]);
													}
													catch (e) {
														var myContent = prop2["address-data"][0];
													}
													try {
														var aRootUrl = cardbookSynchronization.getRootUrl(aConnection.connUrl);
														var myCard = new cardbookCardParser(myContent, aRootUrl + href, etag, aConnection.connPrefId);
													}
													catch (e) {
														cardbookRepository.cardbookServerGetResponse[aConnection.connPrefId]++;
														cardbookRepository.cardbookServerGetError[aConnection.connPrefId]++;
														if (e.message == "") {
															cardbookUtils.formatStringForOutput("parsingCardError", [aConnection.connDescription, cardbookRepository.strBundle.GetStringFromName(e.code), myContent], "Error");
														} else {
															cardbookUtils.formatStringForOutput("parsingCardError", [aConnection.connDescription, e.message, myContent], "Error");
														}
														continue;
													}
													cardbookRepository.addCardToRepository(myCard, aMode, cardbookUtils.getFileNameFromUrl(aConnection.connUrl + href));
													cardbookUtils.formatStringForOutput("serverCardGetOK", [aConnection.connDescription, myCard.fn]);
												} else {
													cardbookRepository.cardbookServerGetError[aConnection.connPrefId]++;
													cardbookUtils.formatStringForOutput("serverCardGetFailed", [aConnection.connDescription, aConnection.connUrl, status], "Error");
												}
											} else {
												cardbookRepository.cardbookServerGetError[aConnection.connPrefId]++;
												cardbookUtils.formatStringForOutput("serverCardGetFailed", [aConnection.connDescription, aConnection.connUrl, status], "Error");
											}
											cardbookRepository.cardbookServerGetResponse[aConnection.connPrefId]++;
										}
									}
									catch(e) {
										cardbookRepository.cardbookServerGetResponse[aConnection.connPrefId]++;
										cardbookRepository.cardbookServerSyncError[aConnection.connPrefId]++;
										cardbookLog.updateStatusProgressInformation(aConnection.connDescription + " : cardbookSynchronization.serverSearchRemote error : " + e, "Error");
									}
								}
							}
						}
						catch(e) {
							cardbookLog.updateStatusProgressInformation(aConnection.connDescription + " : cardbookSynchronization.serverSearchRemote error : " + e, "Error");
							cardbookRepository.cardbookServerSyncError[aConnection.connPrefId]++;
						}
						cardbookRepository.cardbookServerSyncResponse[aConnection.connPrefId]++;
					} else {
						if (!cardbookSynchronization.handleWrondPassword(aConnection, status, response)) {
							cardbookUtils.formatStringForOutput("synchronizationFailed", [aConnection.connDescription, "serverSearchRemote", aConnection.connUrl, status], "Error");
						}
						cardbookRepository.cardbookServerSyncError[aConnection.connPrefId]++;
						cardbookRepository.cardbookServerSyncResponse[aConnection.connPrefId]++;
					}
				}
			};
			var baseUrl = aConnection.connUrl;
			if (baseUrl.indexOf("/", baseUrl.length -1) === -1) {
				baseUrl = baseUrl + "/";
			}
			cardbookUtils.formatStringForOutput("synchronizationSearchingCards", [aConnection.connDescription]);
			let request = new cardbookWebDAV(aConnection, listener_reportQuery, "", true);
			request.reportQuery(["D:getetag", "C:address-data Content-Type='text/vcard'"], aValue);
		},
		
		googleSyncCards: function(aConnection, aMode, aPrefIdType, aValue) {
			var listener_propfind = {
				onDAVQueryComplete: function(status, response, askCertificate) {
					if (status == 0) {
						if (askCertificate) {
							var certificateExceptionAdded = false;
							var certificateExceptionAdded = cardbookSynchronization.addCertificateException(cardbookSynchronization.getRootUrl(aConnection.connUrl));
							if (certificateExceptionAdded) {
								cardbookSynchronization.googleSyncCards(aConnection, aMode, aPrefIdType);
							} else {
								cardbookUtils.formatStringForOutput("synchronizationFailed", [aConnection.connDescription, "googleSyncCards", aConnection.connUrl, status], "Error");
								cardbookRepository.cardbookServerSyncError[aConnection.connPrefId]++;
								cardbookRepository.cardbookServerSyncResponse[aConnection.connPrefId]++;
							}
						} else {
							cardbookUtils.formatStringForOutput("synchronizationFailed", [aConnection.connDescription, "googleSyncCards", aConnection.connUrl, status], "Error");
							cardbookRepository.cardbookServerSyncError[aConnection.connPrefId]++;
							cardbookRepository.cardbookServerSyncResponse[aConnection.connPrefId]++;
						}
					} else if (response && response["parsererror"] && response["parsererror"][0]["sourcetext"] && response["parsererror"][0]["sourcetext"][0]) {
						cardbookUtils.formatStringForOutput("unableToParseResponse", [aConnection.connDescription, response["parsererror"][0]["sourcetext"][0]], "Error");
						cardbookRepository.cardbookServerSyncError[aConnection.connPrefId]++;
						cardbookRepository.cardbookServerSyncResponse[aConnection.connPrefId]++;
					} else if (response && response["multistatus"] && (status > 199 && status < 400)) {
						try {
							var length = cardbookSynchronization.getCacheFiles(aConnection.connPrefId);
							cardbookRepository.cardbookServerSyncHandleRemainingTotal[aConnection.connPrefId] = length;
							if (response["multistatus"][0] && response["multistatus"][0]["response"]) {
								let jsonResponses = response["multistatus"][0]["response"];
								for (var prop in jsonResponses) {
									var jsonResponse = jsonResponses[prop];
									let href = decodeURIComponent(jsonResponse["href"][0]);
									let propstats = jsonResponse["propstat"];
									// 2015.04.27 13:53:48 : href : /carddav/v1/principals/foo.bar@gmail.com/lists/default/
									// 2015.04.27 13:53:48 : propstats : [{status:["HTTP/1.1 200 OK"]}, {status:["HTTP/1.1 404 Not Found"], prop:[{getetag:[null]}]}]
									// 2015.04.27 14:03:54 : href : /carddav/v1/principals/foo.bar@gmail.com/lists/default/69ada43d89c0d90b
									// 2015.04.27 14:03:54 : propstats : [{status:["HTTP/1.1 200 OK"], prop:[{getetag:["\"2014-07-15T13:43:23.997-07:00\""]}]}]
									for (var prop1 in propstats) {
										var propstat = propstats[prop1];
										if (cardbookSynchronization.isStatusCorrect(propstat["status"][0])) {
											if (propstat["prop"] != null && propstat["prop"] !== undefined && propstat["prop"] != "") {
												cardbookRepository.cardbookServerSyncTotal[aConnection.connPrefId]++;
												cardbookRepository.cardbookServerSyncCompareWithCacheTotal[aConnection.connPrefId]++;
												var prop = propstat["prop"][0];
												var etag = prop["getetag"][0];
												var keyArray = href.split("/");
												var key = decodeURIComponent(keyArray[keyArray.length - 1]);
												var myUrl = baseUrl + key;
												var myFileName = cardbookUtils.getFileNameFromUrl(myUrl);
												var aCardConnection = {accessToken: aConnection.accessToken, connPrefId: aConnection.connPrefId, connUrl: myUrl, connDescription: aConnection.connDescription};
												cardbookSynchronization.compareServerCardWithCache(aCardConnection, aConnection, aMode, aPrefIdType, myUrl, etag, myFileName);
												if (cardbookRepository.filesFromCacheDB[aConnection.connPrefId][myFileName]) {
													delete cardbookRepository.filesFromCacheDB[aConnection.connPrefId][myFileName];
													cardbookRepository.cardbookServerSyncHandleRemainingTotal[aConnection.connPrefId]--;
												}
											}
										}
									}
								}
							}
							cardbookSynchronization.handleRemainingCache(aPrefIdType, aConnection, aMode);
						}
						catch(e) {
							cardbookLog.updateStatusProgressInformation(aConnection.connDescription + " : cardbookSynchronization.googleSyncCards error : " + e, "Error");
							cardbookRepository.cardbookServerSyncError[aConnection.connPrefId]++;
							cardbookRepository.cardbookServerSyncHandleRemainingTotal[aConnection.connPrefId] = cardbookRepository.cardbookServerSyncHandleRemainingDone[aConnection.connPrefId];
						}
						cardbookRepository.cardbookServerSyncResponse[aConnection.connPrefId]++;
					} else {
						cardbookUtils.formatStringForOutput("synchronizationFailed", [aConnection.connDescription, "googleSyncCards", aConnection.connUrl, status], "Error");
						cardbookRepository.cardbookServerSyncError[aConnection.connPrefId]++;
						cardbookRepository.cardbookServerSyncResponse[aConnection.connPrefId]++;
					}
				}
			};
			var baseUrl = aConnection.connUrl;
			if (baseUrl.indexOf("/", baseUrl.length -1) === -1) {
				baseUrl = baseUrl + "/";
			}
			cardbookUtils.formatStringForOutput("synchronizationSearchingCards", [aConnection.connDescription]);
			let request = new cardbookWebDAV(aConnection, listener_propfind, "", true);
			if (aValue) {
				request.reportQuery(["D:getetag"], aValue);
			} else {
				request.propfind(["D:getetag"]);
			}
		},

		serverSyncCards: function(aConnection, aMode, aPrefIdType, aValue) {
			var listener_propfind = {
				onDAVQueryComplete: function(status, response, askCertificate) {
					if (status == 0) {
						if (askCertificate) {
							var certificateExceptionAdded = false;
							var certificateExceptionAdded = cardbookSynchronization.addCertificateException(cardbookSynchronization.getRootUrl(aConnection.connUrl));
							if (certificateExceptionAdded) {
								cardbookSynchronization.serverSyncCards(aConnection, aMode, aPrefIdType);
							} else {
								cardbookUtils.formatStringForOutput("synchronizationFailed", [aConnection.connDescription, "serverSyncCards", aConnection.connUrl, status], "Error");
								cardbookRepository.cardbookServerSyncError[aConnection.connPrefId]++;
								cardbookRepository.cardbookServerSyncResponse[aConnection.connPrefId]++;
							}
						} else {
							cardbookUtils.formatStringForOutput("synchronizationFailed", [aConnection.connDescription, "serverSyncCards", aConnection.connUrl, status], "Error");
							cardbookRepository.cardbookServerSyncError[aConnection.connPrefId]++;
							cardbookRepository.cardbookServerSyncResponse[aConnection.connPrefId]++;
						}
					} else if (response && response["parsererror"] && response["parsererror"][0]["sourcetext"] && response["parsererror"][0]["sourcetext"][0]) {
						cardbookUtils.formatStringForOutput("unableToParseResponse", [aConnection.connDescription, response["parsererror"][0]["sourcetext"][0]], "Error");
						cardbookRepository.cardbookServerSyncError[aConnection.connPrefId]++;
						cardbookRepository.cardbookServerSyncResponse[aConnection.connPrefId]++;
					} else if (response && response["multistatus"] && (status > 199 && status < 400)) {
						try {
							var length = cardbookSynchronization.getCacheFiles(aConnection.connPrefId);
							cardbookRepository.cardbookServerSyncHandleRemainingTotal[aConnection.connPrefId] = length;
							if (response["multistatus"][0] && response["multistatus"][0]["response"]) {
								let jsonResponses = response["multistatus"][0]["response"];
								for (var prop in jsonResponses) {
									var jsonResponse = jsonResponses[prop];
									let href = decodeURIComponent(jsonResponse["href"][0]);
									let propstats = jsonResponse["propstat"];
									// 2015.04.27 14:03:55 : href : /remote.php/carddav/addressbooks/11111/contacts/
									// 2015.04.27 14:03:55 : propstats : [{prop:[{getcontenttype:[null], getetag:[null]}], status:["HTTP/1.1 404 Not Found"]}]
									// 2015.04.27 14:03:55 : href : /remote.php/carddav/addressbooks/11111/contacts/C68894CF-D340-0001-78C3-1E301B4011F5.vcf
									// 2015.04.27 14:03:55 : propstats : [{prop:[{getcontenttype:["text/x-vcard"], getetag:["\"6163e30117192647e1967de751fb5467\""]}], status:["HTTP/1.1 200 OK"]}]
									for (var prop1 in propstats) {
										var propstat = propstats[prop1];
										if (cardbookSynchronization.isStatusCorrect(propstat["status"][0])) {
											if (propstat["prop"] != null && propstat["prop"] !== undefined && propstat["prop"] != "") {
												let prop2 = propstat["prop"][0];
												if (href != aConnection.connUrl) {
													var contType = "";
													if (prop2["getcontenttype"]) {
														contType = prop2["getcontenttype"][0];
													}
													if (typeof(prop2["getetag"]) == "undefined") {
														continue;
													}
													if (href.indexOf("/", href.length -1) !== -1) {
														continue;
													}
													var etag = prop2["getetag"][0];
													var keyArray = href.split("/");
													var key = decodeURIComponent(keyArray[keyArray.length - 1]);
													var myUrl = baseUrl + key;
													var myFileName = cardbookUtils.getFileNameFromUrl(myUrl);
													if (cardbookSynchronization.isSupportedContentType(contType, myFileName)) {
														cardbookRepository.cardbookServerSyncTotal[aConnection.connPrefId]++;
														cardbookRepository.cardbookServerSyncCompareWithCacheTotal[aConnection.connPrefId]++;
														var aCardConnection = {connPrefId: aConnection.connPrefId, connUrl: myUrl, connDescription: aConnection.connDescription};
														if (aPrefIdType == "YAHOO") {
															aCardConnection.accessToken = aConnection.accessToken;
														}
														cardbookSynchronization.compareServerCardWithCache(aCardConnection, aConnection, aMode, aPrefIdType, myUrl, etag, myFileName);
														if (cardbookRepository.filesFromCacheDB[aConnection.connPrefId][myFileName]) {
															delete cardbookRepository.filesFromCacheDB[aConnection.connPrefId][myFileName];
															cardbookRepository.cardbookServerSyncHandleRemainingTotal[aConnection.connPrefId]--;
														}
													}
												}
											}
										}
									}
								}
							}
							cardbookSynchronization.handleRemainingCache(aPrefIdType, aConnection, aMode);
						}
						catch(e) {
							cardbookLog.updateStatusProgressInformation(aConnection.connDescription + " : cardbookSynchronization.serverSyncCards error : " + e, "Error");
							cardbookRepository.cardbookServerSyncError[aConnection.connPrefId]++;
							cardbookRepository.cardbookServerSyncHandleRemainingTotal[aConnection.connPrefId] = cardbookRepository.cardbookServerSyncHandleRemainingDone[aConnection.connPrefId];
						}
						cardbookRepository.cardbookServerSyncResponse[aConnection.connPrefId]++;
					} else {
						if (!cardbookSynchronization.handleWrondPassword(aConnection, status, response)) {
							cardbookUtils.formatStringForOutput("synchronizationFailed", [aConnection.connDescription, "serverSyncCards", aConnection.connUrl, status], "Error");
						}
						cardbookRepository.cardbookServerSyncError[aConnection.connPrefId]++;
						cardbookRepository.cardbookServerSyncResponse[aConnection.connPrefId]++;
					}
				}
			};
			var baseUrl = aConnection.connUrl;
			if (baseUrl.indexOf("/", baseUrl.length -1) === -1) {
				baseUrl = baseUrl + "/";
			}

			cardbookUtils.formatStringForOutput("synchronizationSearchingCards", [aConnection.connDescription]);
			let request = new cardbookWebDAV(aConnection, listener_propfind, "", true);
			if (aValue) {
				request.reportQuery(["D:getcontenttype", "D:getetag"], aValue);
			} else {
				request.propfind(["D:getcontenttype", "D:getetag"]);
			}
		},
		
		// only called at setup
		validateWithoutDiscovery: function(aConnection, aOperationType, aParams) {
			var listener_checkpropfind4 = {
				onDAVQueryComplete: function(status, response, askCertificate) {
					if (status == 0) {
						if (askCertificate) {
							var certificateExceptionAdded = false;
							var certificateExceptionAdded = cardbookSynchronization.addCertificateException(aRootUrl);
							if (certificateExceptionAdded) {
								cardbookSynchronization.validateWithoutDiscovery(aConnection, aOperationType, aParams);
							} else {
								cardbookUtils.formatStringForOutput("synchronizationFailed", [aConnection.connDescription, "validateWithoutDiscovery", aConnection.connUrl, status], "Error");
								cardbookRepository.cardbookServerDiscoveryError[aConnection.connPrefId]++;
								cardbookRepository.cardbookServerSyncResponse[aConnection.connPrefId]++;
							}
						} else {
							cardbookUtils.formatStringForOutput("synchronizationFailed", [aConnection.connDescription, "validateWithoutDiscovery", aConnection.connUrl, status], "Error");
							cardbookRepository.cardbookServerDiscoveryError[aConnection.connPrefId]++;
							cardbookRepository.cardbookServerSyncResponse[aConnection.connPrefId]++;
						}
						cardbookRepository.cardbookServerDiscoveryResponse[aConnection.connPrefId]++;
					} else if (response && response["parsererror"] && response["parsererror"][0]["sourcetext"] && response["parsererror"][0]["sourcetext"][0]) {
						cardbookUtils.formatStringForOutput("unableToParseResponse", [aConnection.connDescription, response["parsererror"][0]["sourcetext"][0]], "Error");
						cardbookRepository.cardbookServerDiscoveryError[aConnection.connPrefId]++;
						cardbookRepository.cardbookServerDiscoveryResponse[aConnection.connPrefId]++;
						cardbookRepository.cardbookServerSyncResponse[aConnection.connPrefId]++;
					} else if (response && response["multistatus"] && (status > 199 && status < 400)) {
						try {
							let jsonResponses = response["multistatus"][0]["response"];
							for (var prop in jsonResponses) {
								var jsonResponse = jsonResponses[prop];
								let href = decodeURIComponent(jsonResponse["href"][0]);
								if (href[href.length - 1] != '/') {
									href += '/';
								}
								let propstats = jsonResponse["propstat"];
								for (var prop1 in propstats) {
									var propstat = propstats[prop1];
									if (cardbookSynchronization.isStatusCorrect(propstat["status"][0])) {
										if (propstat["prop"] != null && propstat["prop"] !== undefined && propstat["prop"] != "") {
											let prop2 = propstat["prop"][0];
											if (prop2["resourcetype"] != null && prop2["resourcetype"] !== undefined && prop2["resourcetype"] != "") {
												let rsrcType = prop2["resourcetype"][0];
												cardbookLog.updateStatusProgressInformationWithDebug2(aConnection.connDescription + " : rsrcType found : " + rsrcType.toSource());
												if (rsrcType["vcard-collection"] || rsrcType["addressbook"]) {
													var displayName = "";
													if (prop2["displayname"] != null && prop2["displayname"] !== undefined && prop2["displayname"] != "") {
														displayName = prop2["displayname"][0];
													}
													cardbookLog.updateStatusProgressInformationWithDebug2(aConnection.connDescription + " : href found : " + href);
													cardbookLog.updateStatusProgressInformationWithDebug2(aConnection.connDescription + " : displayName found : " + displayName);
													if (href.indexOf(aRootUrl) >= 0 ) {
														aConnection.connUrl = href;
													} else {
														aConnection.connUrl = aRootUrl + href;
													}
													cardbookRepository.cardbookServerValidation[aConnection.connPrefId]['length']++;
													cardbookRepository.cardbookServerValidation[aConnection.connPrefId][aConnection.connUrl] = {}
													cardbookRepository.cardbookServerValidation[aConnection.connPrefId][aConnection.connUrl].displayName = displayName;
													cardbookRepository.cardbookServerValidation[aConnection.connPrefId][aConnection.connUrl].forget = false;
													var aABConnection = {connPrefId: aConnection.connPrefId, connUser: aConnection.connUser, connUrl: aConnection.connUrl, connDescription: aConnection.connDescription};
													cardbookSynchronization.discoverPhase4(aABConnection, aRootUrl, aOperationType, aParams);
												}
											}
										}
									}
								}
							}
						}
						catch(e) {
							cardbookLog.updateStatusProgressInformation(aConnection.connDescription + " : cardbookSynchronization.validateWithoutDiscovery error : " + e + " : " + response.toSource(), "Error");
							cardbookRepository.cardbookServerDiscoveryError[aConnection.connPrefId]++;
						}
						cardbookRepository.cardbookServerDiscoveryResponse[aConnection.connPrefId]++;
						cardbookRepository.cardbookServerSyncResponse[aConnection.connPrefId]++;
					} else {
						cardbookUtils.formatStringForOutput("synchronizationFailed", [aConnection.connDescription, "validateWithoutDiscovery", aConnection.connUrl, status], "Error");
						cardbookRepository.cardbookServerDiscoveryError[aConnection.connPrefId]++;
						cardbookRepository.cardbookServerDiscoveryResponse[aConnection.connPrefId]++;
						cardbookRepository.cardbookServerSyncResponse[aConnection.connPrefId]++;
					}
				}
			};
			var aRootUrl = cardbookSynchronization.getRootUrl(aConnection.connUrl);
			cardbookRepository.cardbookServerDiscoveryRequest[aConnection.connPrefId]++;
			cardbookUtils.formatStringForOutput("synchronizationRequestDiscovery", [aConnection.connDescription, aConnection.connUrl]);
			var request = new cardbookWebDAV(aConnection, listener_checkpropfind4, "", true);
			request.propfind(["D:resourcetype", "D:displayname"], true);
		},

		// no errors to report in this function
		discoverPhase4: function(aConnection, aRootUrl, aOperationType, aParams) {
			var listener_checkpropfind4 = {
				onDAVQueryComplete: function(status, responseXML, askCertificate) {
					if (status == 0) {
						if (askCertificate) {
							var certificateExceptionAdded = false;
							var certificateExceptionAdded = cardbookSynchronization.addCertificateException(aRootUrl);
							if (certificateExceptionAdded) {
								cardbookSynchronization.discoverPhase4(aConnection, aRootUrl, aOperationType, aParams);
							} else {
								cardbookUtils.formatStringForOutput("synchronizationFailed", [aConnection.connDescription, "discoverPhase4", aConnection.connUrl, status], "Error");
								// cardbookRepository.cardbookServerDiscoveryError[aConnection.connPrefId]++;
								cardbookRepository.cardbookServerDiscoveryResponse[aConnection.connPrefId]++;
								cardbookRepository.cardbookServerSyncResponse[aConnection.connPrefId]++;
							}
						} else {
							cardbookUtils.formatStringForOutput("synchronizationFailed", [aConnection.connDescription, "discoverPhase4", aConnection.connUrl, status], "Error");
							// cardbookRepository.cardbookServerDiscoveryError[aConnection.connPrefId]++;
							cardbookRepository.cardbookServerDiscoveryResponse[aConnection.connPrefId]++;
							cardbookRepository.cardbookServerSyncResponse[aConnection.connPrefId]++;
						}
						cardbookRepository.cardbookServerDiscoveryResponse[aConnection.connPrefId]++;
					} else if (responseXML && (status > 199 && status < 400)) {
						var ns = "urn:ietf:params:xml:ns:carddav";
						if (responseXML.getElementsByTagNameNS(ns, "address-data-type")) {
							var versions = responseXML.getElementsByTagNameNS(ns, "address-data-type");
						}
						for (let j = 0; j < versions.length; j++) {
							if (versions[j].getAttribute("Content-Type") == "text/vcard") {
								if (versions[j].getAttribute("version")) {
									var myVersion = versions[j].getAttribute("version");
									cardbookLog.updateStatusProgressInformationWithDebug2(aConnection.connDescription + " : version found : " + myVersion + " (" + aConnection.connUrl + ")");
									cardbookRepository.cardbookServerValidation[aConnection.connPrefId][aConnection.connUrl].version.push(myVersion);
								}
							}
						}
						cardbookRepository.cardbookServerValidation[aConnection.connPrefId][aConnection.connUrl].version = cardbookRepository.arrayUnique(cardbookRepository.cardbookServerValidation[aConnection.connPrefId][aConnection.connUrl].version);
						cardbookRepository.cardbookServerSyncResponse[aConnection.connPrefId]++;
						cardbookRepository.cardbookServerDiscoveryResponse[aConnection.connPrefId]++;
					} else {
						// only if it is not an initial setup
						if (aOperationType == "GETDISPLAYNAME" || !cardbookSynchronization.handleWrondPassword(aConnection, status, response)) {
							cardbookUtils.formatStringForOutput("synchronizationFailed", [aConnection.connDescription, "discoverPhase4", aConnection.connUrl, status], "Error");
						}
						// cardbookRepository.cardbookServerDiscoveryError[aConnection.connPrefId]++;
						cardbookRepository.cardbookServerDiscoveryResponse[aConnection.connPrefId]++;
						cardbookRepository.cardbookServerSyncResponse[aConnection.connPrefId]++;
					}
				}
			};
			aConnection.connUrl = cardbookSynchronization.getSlashedUrl(aConnection.connUrl);
			cardbookRepository.cardbookServerValidation[aConnection.connPrefId][aConnection.connUrl].version = [];
			if (aParams.aPrefIdType == "APPLE" || aParams.aPrefIdType == "YAHOO") {
				return;
			}
			cardbookRepository.cardbookServerDiscoveryRequest[aConnection.connPrefId]++;
			cardbookUtils.formatStringForOutput("synchronizationRequestDiscovery4", [aConnection.connDescription, aConnection.connUrl]);
			var request = new cardbookWebDAV(aConnection, listener_checkpropfind4, "", false);
			request.propfind(["C:supported-address-data"], true);
		},

		discoverPhase3: function(aConnection, aRootUrl, aOperationType, aParams) {
			var listener_checkpropfind3 = {
				onDAVQueryComplete: function(status, response, askCertificate) {
					if (status == 0) {
						if (askCertificate) {
							var certificateExceptionAdded = false;
							var certificateExceptionAdded = cardbookSynchronization.addCertificateException(aRootUrl);
							if (certificateExceptionAdded) {
								cardbookSynchronization.discoverPhase3(aConnection, aRootUrl, aOperationType, aParams);
							} else {
								cardbookUtils.formatStringForOutput("synchronizationFailed", [aConnection.connDescription, "validateWithoutDiscovery", aConnection.connUrl, status], "Error");
								cardbookRepository.cardbookServerDiscoveryError[aConnection.connPrefId]++;
								cardbookRepository.cardbookServerSyncResponse[aConnection.connPrefId]++;
							}
						} else {
							cardbookUtils.formatStringForOutput("synchronizationFailed", [aConnection.connDescription, "validateWithoutDiscovery", aConnection.connUrl, status], "Error");
							cardbookRepository.cardbookServerDiscoveryError[aConnection.connPrefId]++;
							cardbookRepository.cardbookServerSyncResponse[aConnection.connPrefId]++;
						}
						cardbookRepository.cardbookServerDiscoveryResponse[aConnection.connPrefId]++;
					} else if (response && response["parsererror"] && response["parsererror"][0]["sourcetext"] && response["parsererror"][0]["sourcetext"][0]) {
						cardbookUtils.formatStringForOutput("unableToParseResponse", [aConnection.connDescription, response["parsererror"][0]["sourcetext"][0]], "Error");
						cardbookRepository.cardbookServerDiscoveryError[aConnection.connPrefId]++;
						cardbookRepository.cardbookServerDiscoveryResponse[aConnection.connPrefId]++;
						cardbookRepository.cardbookServerSyncResponse[aConnection.connPrefId]++;
					} else if (response && response["multistatus"] && (status > 199 && status < 400)) {
						try {
							let jsonResponses = response["multistatus"][0]["response"];
							for (var prop in jsonResponses) {
								var jsonResponse = jsonResponses[prop];
								let href = decodeURIComponent(jsonResponse["href"][0]);
								if (href[href.length - 1] != '/') {
									href += '/';
								}
								let propstats = jsonResponse["propstat"];
								for (var prop1 in propstats) {
									var propstat = propstats[prop1];
									if (cardbookSynchronization.isStatusCorrect(propstat["status"][0])) {
										if (propstat["prop"] != null && propstat["prop"] !== undefined && propstat["prop"] != "") {
											let prop2 = propstat["prop"][0];
											if (prop2["resourcetype"] != null && prop2["resourcetype"] !== undefined && prop2["resourcetype"] != "") {
												let rsrcType = prop2["resourcetype"][0];
												cardbookLog.updateStatusProgressInformationWithDebug2(aConnection.connDescription + " : rsrcType found : " + rsrcType.toSource());
												if (rsrcType["vcard-collection"] || rsrcType["addressbook"]) {
													var displayName = "";
													if (prop2["displayname"] != null && prop2["displayname"] !== undefined && prop2["displayname"] != "") {
														displayName = prop2["displayname"][0];
													}
													cardbookLog.updateStatusProgressInformationWithDebug2(aConnection.connDescription + " : href found : " + href);
													cardbookLog.updateStatusProgressInformationWithDebug2(aConnection.connDescription + " : displayName found : " + displayName);
													if (href.startsWith("http")) {
														aConnection.connUrl = href;
													} else {
														aConnection.connUrl = aRootUrl + href;
													}
													if (aOperationType == "GETDISPLAYNAME") {
														cardbookRepository.cardbookServerValidation[aConnection.connPrefId]['length']++;
														cardbookRepository.cardbookServerValidation[aConnection.connPrefId][aConnection.connUrl] = {}
														cardbookRepository.cardbookServerValidation[aConnection.connPrefId][aConnection.connUrl].displayName = displayName;
														cardbookRepository.cardbookServerValidation[aConnection.connPrefId][aConnection.connUrl].forget = false;
														var aABConnection = {connPrefId: aConnection.connPrefId, connUser: aConnection.connUser, connUrl: aConnection.connUrl, connDescription: aConnection.connDescription};
														cardbookSynchronization.discoverPhase4(aABConnection, aRootUrl, aOperationType, aParams);
													} else if (aOperationType == "GOOGLE") {
														cardbookSynchronization.googleSyncCards(aConnection, aParams.aMode, aParams.aPrefIdType, aParams.aValue);
													} else if (aOperationType == "YAHOO") {
														cardbookSynchronization.serverSyncCards(aConnection, aParams.aMode, aParams.aPrefIdType, aParams.aValue);
													} else if (aOperationType == "SYNCSERVER") {
														cardbookSynchronization.serverSyncCards(aConnection, aParams.aMode, aParams.aPrefIdType, aParams.aValue);
													}
												}
											}
										}
									}
								}
							}
						}
						catch(e) {
							cardbookLog.updateStatusProgressInformation(aConnection.connDescription + " : cardbookSynchronization.discoverPhase3 error : " + e + " : " + response.toSource(), "Error");
							cardbookRepository.cardbookServerDiscoveryError[aConnection.connPrefId]++;
							cardbookRepository.cardbookServerSyncResponse[aConnection.connPrefId]++;
						}
						cardbookRepository.cardbookServerDiscoveryResponse[aConnection.connPrefId]++;
					} else {
						// only if it is not an initial setup
						if (aOperationType == "GETDISPLAYNAME" || !cardbookSynchronization.handleWrondPassword(aConnection, status, response)) {
							cardbookUtils.formatStringForOutput("synchronizationFailed", [aConnection.connDescription, "discoverPhase3", aConnection.connUrl, status], "Error");
						}
						cardbookRepository.cardbookServerDiscoveryError[aConnection.connPrefId]++;
						cardbookRepository.cardbookServerDiscoveryResponse[aConnection.connPrefId]++;
						cardbookRepository.cardbookServerSyncResponse[aConnection.connPrefId]++;
					}
				}
			};
			aConnection.connUrl = cardbookSynchronization.getSlashedUrl(aConnection.connUrl);
			cardbookRepository.cardbookServerDiscoveryRequest[aConnection.connPrefId]++;
			cardbookUtils.formatStringForOutput("synchronizationRequestDiscovery3", [aConnection.connDescription, aConnection.connUrl]);
			var request = new cardbookWebDAV(aConnection, listener_checkpropfind3, "", true);
			request.propfind(["D:resourcetype", "D:displayname"], true);
		},

		discoverPhase2: function(aConnection, aRootUrl, aOperationType, aParams) {
			var listener_checkpropfind2 = {
				onDAVQueryComplete: function(status, response, askCertificate) {
					if (status == 0) {
						if (askCertificate) {
							var certificateExceptionAdded = false;
							var certificateExceptionAdded = cardbookSynchronization.addCertificateException(aRootUrl);
							if (certificateExceptionAdded) {
								cardbookSynchronization.discoverPhase2(aConnection, aRootUrl, aOperationType, aParams);
							} else {
								cardbookUtils.formatStringForOutput("synchronizationFailed", [aConnection.connDescription, "validateWithoutDiscovery", aConnection.connUrl, status], "Error");
								cardbookRepository.cardbookServerDiscoveryError[aConnection.connPrefId]++;
								cardbookRepository.cardbookServerSyncResponse[aConnection.connPrefId]++;
							}
						} else {
							cardbookUtils.formatStringForOutput("synchronizationFailed", [aConnection.connDescription, "validateWithoutDiscovery", aConnection.connUrl, status], "Error");
							cardbookRepository.cardbookServerDiscoveryError[aConnection.connPrefId]++;
							cardbookRepository.cardbookServerSyncResponse[aConnection.connPrefId]++;
						}
						cardbookRepository.cardbookServerDiscoveryResponse[aConnection.connPrefId]++;
					} else if (response && response["parsererror"] && response["parsererror"][0]["sourcetext"] && response["parsererror"][0]["sourcetext"][0]) {
						cardbookUtils.formatStringForOutput("unableToParseResponse", [aConnection.connDescription, response["parsererror"][0]["sourcetext"][0]], "Error");
						cardbookRepository.cardbookServerDiscoveryError[aConnection.connPrefId]++;
						cardbookRepository.cardbookServerDiscoveryResponse[aConnection.connPrefId]++;
						cardbookRepository.cardbookServerSyncResponse[aConnection.connPrefId]++;
					} else if (response && response["multistatus"] && (status > 199 && status < 400)) {
						try {
							let jsonResponses = response["multistatus"][0]["response"];
							for (var prop in jsonResponses) {
								var jsonResponse = jsonResponses[prop];
								let propstats = jsonResponse["propstat"];
								for (var prop1 in propstats) {
									var propstat = propstats[prop1];
									if (cardbookSynchronization.isStatusCorrect(propstat["status"][0])) {
										if (propstat["prop"] != null && propstat["prop"] !== undefined && propstat["prop"] != "") {
											let prop2 = propstat["prop"][0];
											let rsrcType = prop2["addressbook-home-set"][0];
											let href = decodeURIComponent(rsrcType["href"][0]);
											if (href[href.length - 1] != '/') {
												href += '/';
											}
											cardbookLog.updateStatusProgressInformationWithDebug2(aConnection.connDescription + " : addressbook-home-set found : " + href);
											if (href.startsWith("http")) {
												aConnection.connUrl = href;
											} else {
												aConnection.connUrl = aRootUrl + href;
											}
											cardbookSynchronization.discoverPhase3(aConnection, aRootUrl, aOperationType, aParams);
										}
									}
								}
							}
						}
						catch(e) {
							cardbookLog.updateStatusProgressInformation(aConnection.connDescription + " : cardbookSynchronization.discoverPhase2 error : " + e + " : " + response.toSource(), "Error");
							cardbookRepository.cardbookServerDiscoveryError[aConnection.connPrefId]++;
							cardbookRepository.cardbookServerSyncResponse[aConnection.connPrefId]++;
						}
						cardbookRepository.cardbookServerDiscoveryResponse[aConnection.connPrefId]++;
					} else {
						// only if it is not an initial setup
						if (aOperationType == "GETDISPLAYNAME" || !cardbookSynchronization.handleWrondPassword(aConnection, status, response)) {
							cardbookUtils.formatStringForOutput("synchronizationFailed", [aConnection.connDescription, "discoverPhase2", aConnection.connUrl, status], "Error");
						}
						cardbookRepository.cardbookServerDiscoveryError[aConnection.connPrefId]++;
						cardbookRepository.cardbookServerDiscoveryResponse[aConnection.connPrefId]++;
						cardbookRepository.cardbookServerSyncResponse[aConnection.connPrefId]++;
					}
				}
			};
			aConnection.connUrl = cardbookSynchronization.getSlashedUrl(aConnection.connUrl);
			cardbookRepository.cardbookServerDiscoveryRequest[aConnection.connPrefId]++;
			cardbookUtils.formatStringForOutput("synchronizationRequestDiscovery2", [aConnection.connDescription, aConnection.connUrl]);
			var request = new cardbookWebDAV(aConnection, listener_checkpropfind2, "", true);
			request.propfind(["C:addressbook-home-set"], false);
		},

		discoverPhase1: function(aConnection, aOperationType, aParams) {
			var listener_checkpropfind1 = {
				onDAVQueryComplete: function(status, response, askCertificate) {
					if (status == 0) {
						if (askCertificate) {
							var certificateExceptionAdded = false;
							var certificateExceptionAdded = cardbookSynchronization.addCertificateException(cardbookSynchronization.getRootUrl(aConnection.connUrl));
							if (certificateExceptionAdded) {
								cardbookSynchronization.discoverPhase1(aConnection, aOperationType, aParams);
							} else {
								cardbookUtils.formatStringForOutput("synchronizationFailed", [aConnection.connDescription, "validateWithoutDiscovery", aConnection.connUrl, status], "Error");
								cardbookRepository.cardbookServerDiscoveryError[aConnection.connPrefId]++;
								cardbookRepository.cardbookServerSyncResponse[aConnection.connPrefId]++;
							}
						} else {
							cardbookUtils.formatStringForOutput("synchronizationFailed", [aConnection.connDescription, "validateWithoutDiscovery", aConnection.connUrl, status], "Error");
							cardbookRepository.cardbookServerDiscoveryError[aConnection.connPrefId]++;
							cardbookRepository.cardbookServerSyncResponse[aConnection.connPrefId]++;
						}
						cardbookRepository.cardbookServerDiscoveryResponse[aConnection.connPrefId]++;
					} else if (response && response["parsererror"] && response["parsererror"][0]["sourcetext"] && response["parsererror"][0]["sourcetext"][0]) {
						cardbookUtils.formatStringForOutput("unableToParseResponse", [aConnection.connDescription, response["parsererror"][0]["sourcetext"][0]], "Error");
						cardbookRepository.cardbookServerDiscoveryError[aConnection.connPrefId]++;
						cardbookRepository.cardbookServerDiscoveryResponse[aConnection.connPrefId]++;
						cardbookRepository.cardbookServerSyncResponse[aConnection.connPrefId]++;
					} else if (response && response["multistatus"] && (status > 199 && status < 400)) {
						try {
							let jsonResponses = response["multistatus"][0]["response"];
							for (var prop in jsonResponses) {
								var jsonResponse = jsonResponses[prop];
								let propstats = jsonResponse["propstat"];
								for (var prop1 in propstats) {
									var propstat = propstats[prop1];
									if (cardbookSynchronization.isStatusCorrect(propstat["status"][0])) {
										if (propstat["prop"] != null && propstat["prop"] !== undefined && propstat["prop"] != "") {
											let prop2 = propstat["prop"][0];
											let rsrcType = prop2["current-user-principal"][0];
											let href = decodeURIComponent(rsrcType["href"][0]);
											if (href[href.length - 1] != '/') {
												href += '/';
											}
											cardbookLog.updateStatusProgressInformationWithDebug2(aConnection.connDescription + " : current-user-principal found : " + href);
											aConnection.connUrl = aRootUrl + href;
											cardbookSynchronization.discoverPhase2(aConnection, aRootUrl, aOperationType, aParams);
										}
									}
								}
							}
						}
						catch(e) {
							cardbookLog.updateStatusProgressInformation(aConnection.connDescription + " : cardbookSynchronization.discoverPhase1 error : " + e + " : " + response.toSource(), "Error");
							cardbookRepository.cardbookServerDiscoveryError[aConnection.connPrefId]++;
							cardbookRepository.cardbookServerSyncResponse[aConnection.connPrefId]++;
						}
						cardbookRepository.cardbookServerDiscoveryResponse[aConnection.connPrefId]++;
					} else {
						// only if it is not an initial setup
						if (aOperationType == "GETDISPLAYNAME" || !cardbookSynchronization.handleWrondPassword(aConnection, status, response)) {
							cardbookUtils.formatStringForOutput("synchronizationFailed", [aConnection.connDescription, "discoverPhase1", aConnection.connUrl, status], "Error");
						}
						cardbookRepository.cardbookServerDiscoveryError[aConnection.connPrefId]++;
						cardbookRepository.cardbookServerDiscoveryResponse[aConnection.connPrefId]++;
						cardbookRepository.cardbookServerSyncResponse[aConnection.connPrefId]++;
					}
				}
			};
			var aRootUrl = cardbookSynchronization.getRootUrl(aConnection.connUrl);
			cardbookRepository.cardbookServerDiscoveryRequest[aConnection.connPrefId]++;
			cardbookUtils.formatStringForOutput("synchronizationRequestDiscovery1", [aConnection.connDescription, aConnection.connUrl]);
			var request = new cardbookWebDAV(aConnection, listener_checkpropfind1, "", true);
			request.propfind(["D:current-user-principal"], false);
		},

		addCertificateException: function (aUrl) {
			var params = {
			  exceptionAdded: false,
			  sslStatus : 0,
			  prefetchCert: true,
			  location: aUrl
			};
			window.openDialog("chrome://pippki/content/exceptionDialog.xul", "", "chrome,centerscreen,modal", params);
			return params.exceptionAdded;
		},

		setPeriodicSyncs: function () {
			for (let account of cardbookRepository.cardbookAccounts) {
				if (account[5] && cardbookUtils.isMyAccountRemote(account[6])
					&& cardbookPreferences.getDBCached(account[4])) {
					var dirPrefId = account[4];
					var dirPrefName = account[0];
					var autoSync = cardbookPreferences.getAutoSyncEnabled(dirPrefId);
					var autoSyncInterval = cardbookPreferences.getAutoSyncInterval(dirPrefId);
					if ((!cardbookRepository.autoSync[dirPrefId]) ||
						(autoSync && cardbookRepository.autoSyncInterval[dirPrefId] != autoSyncInterval)) {
						cardbookSynchronization.removePeriodicSync(dirPrefId, dirPrefName);
						if (autoSync) {
							cardbookSynchronization.addPeriodicSync(dirPrefId, dirPrefName, autoSyncInterval);
						}
					}
				}
			}
		},

		removePeriodicSync: function(aDirPrefId, aDirPrefName) {
			if (cardbookRepository.autoSyncId[aDirPrefId]) {
				if (!aDirPrefName) {
					aDirPrefName = cardbookPreferences.getName(aDirPrefId);
				}
				cardbookUtils.formatStringForOutput("periodicSyncDeleting", [aDirPrefName, aDirPrefId]);
				cardbookRepository.autoSyncId[aDirPrefId].cancel();
				delete cardbookRepository.autoSyncId[aDirPrefId];
				delete cardbookRepository.autoSync[aDirPrefId];
				delete cardbookRepository.autoSyncInterval[aDirPrefId];
			}
		},
		
		addPeriodicSync: function(aDirPrefId, aDirPrefName, aAutoSyncInterval) {
			if (!cardbookRepository.autoSyncId[aDirPrefId]) {
				var autoSyncIntervalMs = aAutoSyncInterval * 60 * 1000;
				cardbookRepository.autoSyncId[aDirPrefId] = Components.classes["@mozilla.org/timer;1"].createInstance(Components.interfaces.nsITimer);
				var lTimerPeriodicSync = cardbookRepository.autoSyncId[aDirPrefId];
				lTimerPeriodicSync.initWithCallback({ notify: function(lTimerPeriodicSync) {
						cardbookSynchronization.runPeriodicSync(aDirPrefId, aDirPrefName);
					}
					}, autoSyncIntervalMs, Components.interfaces.nsITimer.TYPE_REPEATING_SLACK);
				cardbookRepository.autoSync[aDirPrefId] = true;
				cardbookRepository.autoSyncInterval[aDirPrefId] = aAutoSyncInterval;
				cardbookUtils.formatStringForOutput("periodicSyncSetting", [aDirPrefName, autoSyncIntervalMs, aDirPrefId]);
			}
		},
		
		runPeriodicSync: function (aDirPrefId, aDirPrefName) {
			cardbookUtils.formatStringForOutput("periodicSyncSyncing", [aDirPrefName]);
			cardbookSynchronization.syncAccount(aDirPrefId);
		},

		syncAccounts: function (aAccountList) {
			if (aAccountList) {
				var result = aAccountList;
			} else {
				var result = [];
				result = cardbookPreferences.getAllPrefIds();
			}
			for (let i = 0; i < result.length; i++) {
				cardbookSynchronization.syncAccount(result[i]);
			}
		},

		syncAccount: function (aPrefId, aMode) {
			try {
				if (cardbookUtils.isMyAccountSyncing(aPrefId)) {
					return;
				}
				
				var myPrefIdType = cardbookPreferences.getType(aPrefId);
				var myPrefIdUrl = cardbookPreferences.getUrl(aPrefId);
				var myPrefIdName = cardbookPreferences.getName(aPrefId);
				var myPrefIdUser = cardbookPreferences.getUser(aPrefId);
				var myPrefEnabled = cardbookPreferences.getEnabled(aPrefId);
				var myPrefDBCached = cardbookPreferences.getDBCached(aPrefId);
				if (aMode) {
					var myMode = aMode;
				} else {
					var myMode = "WINDOW";
				}
				if (myPrefEnabled) {
					if (cardbookUtils.isMyAccountRemote(myPrefIdType)) {
						var params = {aMode: myMode, aPrefIdType: myPrefIdType};
						if (!myPrefDBCached) {
							params.aValue = cardbookPreferences.getLastSearch(aPrefId);
						}
						if (myPrefIdType == "GOOGLE") {
							cardbookActions.initSyncActivity(aPrefId, myPrefIdName);
							cardbookSynchronization.initMultipleOperations(aPrefId);
							cardbookRepository.cardbookServerSyncRequest[aPrefId]++;
							var connection = {connUser: myPrefIdUser, connPrefId: aPrefId, connUrl: cardbookRepository.cardbookOAuthData.GOOGLE.REFRESH_REQUEST_URL, connDescription: myPrefIdName};
							var myCode = cardbookPasswordManager.getPassword(myPrefIdUser, myPrefIdUrl);
							cardbookSynchronizationGoogle.getNewAccessTokenForGoogle(connection, myCode, "GOOGLE", params);
						} else if (myPrefIdType == "YAHOO") {
							cardbookActions.initSyncActivity(aPrefId, myPrefIdName);
							cardbookSynchronization.initMultipleOperations(aPrefId);
							cardbookRepository.cardbookServerSyncRequest[aPrefId]++;
							var connection = {connUser: myPrefIdUser, connPrefId: aPrefId, connUrl: cardbookRepository.cardbookOAuthData.YAHOO.REFRESH_REQUEST_URL, connDescription: myPrefIdName};
							var myCode = cardbookPasswordManager.getPassword(myPrefIdUser, myPrefIdUrl);
							cardbookSynchronizationYahoo.getNewAccessTokenForYahoo(connection, myCode, "YAHOO", params);
						} else if (myPrefIdType == "APPLE") {
							cardbookActions.initSyncActivity(aPrefId, myPrefIdName);
							cardbookSynchronization.initMultipleOperations(aPrefId);
							cardbookRepository.cardbookServerSyncRequest[aPrefId]++;
							var connection = {connUser: myPrefIdUser, connPrefId: aPrefId, connUrl: myPrefIdUrl, connDescription: myPrefIdName};
							connection.connUrl = cardbookSynchronization.getSlashedUrl(connection.connUrl);
							cardbookSynchronization.discoverPhase1(connection, "SYNCSERVER", params);
						} else if (myPrefIdType == "CARDDAV" && !myPrefDBCached) {
							if (params.aValue) {
								cardbookActions.initSyncActivity(aPrefId, myPrefIdName);
								cardbookSynchronization.initMultipleOperations(aPrefId);
								cardbookRepository.cardbookServerSyncRequest[aPrefId]++;
								var connection = {connUser: myPrefIdUser, connPrefId: aPrefId, connUrl: myPrefIdUrl, connDescription: myPrefIdName};
								cardbookSynchronization.serverSyncCards(connection, myMode, myPrefIdType, params.aValue);
							}
						} else {
							cardbookActions.initSyncActivity(aPrefId, myPrefIdName);
							cardbookSynchronization.initMultipleOperations(aPrefId);
							cardbookRepository.cardbookServerSyncRequest[aPrefId]++;
							var connection = {connUser: myPrefIdUser, connPrefId: aPrefId, connUrl: myPrefIdUrl, connDescription: myPrefIdName};
							// bug for supporting old format URL that might be short (for example carddav.gmx)
							if (cardbookSynchronization.getSlashedUrl(connection.connUrl) == cardbookSynchronization.getSlashedUrl(cardbookSynchronization.getRootUrl(connection.connUrl))) {
								connection.connUrl = cardbookSynchronization.getWellKnownUrl(connection.connUrl);
								cardbookSynchronization.discoverPhase1(connection, "SYNCSERVER", params);
							} else {
								cardbookSynchronization.serverSyncCards(connection, myMode, myPrefIdType);
							}
						}
						cardbookSynchronization.waitForSyncFinished(aPrefId, myPrefIdName, myMode);
					}
				}
			}
			catch (e) {
				cardbookLog.updateStatusProgressInformation("cardbookSynchronization.syncAccount error : " + e, "Error");
			}
		},

		searchRemote: function (aPrefId, aValue) {
			try {
				cardbookRepository.removeAccountFromComplexSearch(aPrefId);
				cardbookRepository.emptyAccountFromRepository(aPrefId);
				var myPrefIdType = cardbookPreferences.getType(aPrefId);
				var myPrefIdUrl = cardbookPreferences.getUrl(aPrefId);
				var myPrefIdName = cardbookPreferences.getName(aPrefId);
				var myPrefIdUser = cardbookPreferences.getUser(aPrefId);
				var myPrefEnabled = cardbookPreferences.getEnabled(aPrefId);
				var myPrefDBCached = cardbookPreferences.getDBCached(aPrefId);
				if (myPrefEnabled && !myPrefDBCached && cardbookUtils.isMyAccountRemote(myPrefIdType)) {
					cardbookActions.initSyncActivity(aPrefId, myPrefIdName);
					cardbookSynchronization.initMultipleOperations(aPrefId);
					cardbookRepository.cardbookServerSyncRequest[aPrefId]++;
					var connection = {connUser: myPrefIdUser, connPrefId: aPrefId, connUrl: myPrefIdUrl, connDescription: myPrefIdName};
					cardbookSynchronization.serverSearchRemote(connection, "WINDOW", aValue, myPrefIdType);
					cardbookSynchronization.waitForSyncFinished(aPrefId, myPrefIdName);
				}
			}
			catch (e) {
				cardbookLog.updateStatusProgressInformation("cardbookSynchronization.searchRemote error : " + e, "Error");
			}
		},

		waitForSyncFinished: function (aPrefId, aPrefName, aMode) {
			cardbookRepository.lTimerSyncAll[aPrefId] = Components.classes["@mozilla.org/timer;1"].createInstance(Components.interfaces.nsITimer);
			var lTimerSync = cardbookRepository.lTimerSyncAll[aPrefId];
			lTimerSync.initWithCallback({ notify: function(lTimerSync) {
						cardbookUtils.notifyObservers("syncRunning", aPrefId);
						if (cardbookRepository.cardbookServerSyncCompareWithCacheDone[aPrefId] != 0) {
							if (cardbookRepository.cardbookServerSyncCompareWithCacheDone[aPrefId] == cardbookRepository.cardbookServerSyncCompareWithCacheTotal[aPrefId]) {
								cardbookRepository.cardbookServerSyncCompareWithCacheDone[aPrefId] = 0;
								cardbookRepository.cardbookServerSyncCompareWithCacheTotal[aPrefId] = 0;
								if (cardbookRepository.cardbookServerMultiGetArray[aPrefId].length != 0) {
									cardbookSynchronization.serverMultiGet(cardbookRepository.cardbookServerMultiGetParams[aPrefId][0], cardbookRepository.cardbookServerMultiGetParams[aPrefId][1]);
								}
							}
						}
						if (cardbookRepository.cardbookServerSyncHandleRemainingDone[aPrefId] == cardbookRepository.cardbookServerSyncHandleRemainingTotal[aPrefId]) {
							var request = cardbookSynchronization.getRequest(aPrefId, aPrefName) + cardbookSynchronization.getTotal(aPrefId, aPrefName);
							var response = cardbookSynchronization.getResponse(aPrefId, aPrefName) + cardbookSynchronization.getDone(aPrefId, aPrefName);
							var myPrefIdType = cardbookPreferences.getType(aPrefId);
							if (cardbookUtils.isMyAccountRemote(myPrefIdType)) {
								cardbookActions.fetchSyncActivity(aPrefId, cardbookRepository.cardbookServerSyncDone[aPrefId], cardbookRepository.cardbookServerSyncTotal[aPrefId]);
							}
							if (request == response) {
								cardbookSynchronization.finishSync(aPrefId, aPrefName, myPrefIdType);
								if (cardbookRepository.cardbookServerSyncAgain[aPrefId]) {
									cardbookSynchronization.finishMultipleOperations(aPrefId);
									cardbookUtils.formatStringForOutput("synchroForcedToResync", [aPrefName]);
									cardbookSynchronization.syncAccount(aPrefId, aMode);
								} else {
									cardbookSynchronization.finishMultipleOperations(aPrefId);
									var total = cardbookSynchronization.getRequest() + cardbookSynchronization.getTotal() + cardbookSynchronization.getResponse() + cardbookSynchronization.getDone();
									// all sync are finished
									if (total === 0) {
										// should check if some should be restarted because of a changed password
										var syncAgain = [];
										var syncFailed = [];
										for (let i in cardbookRepository.cardbookServerChangedPwd) {
											if (cardbookRepository.cardbookServerChangedPwd[i].pwdChanged) {
												syncAgain = syncAgain.concat(cardbookRepository.cardbookServerChangedPwd[i].dirPrefIdList);
											} else {
												syncFailed = syncFailed.concat(cardbookRepository.cardbookServerChangedPwd[i].dirPrefIdList);
											}
										}
										cardbookRepository.cardbookServerChangedPwd = {};
										for (var j = 0; j < syncAgain.length; j++) {
											var myPrefId = syncAgain[j];
											var myPrefName = cardbookUtils.getPrefNameFromPrefId(myPrefId);
											cardbookUtils.formatStringForOutput("synchroForcedToResync", [myPrefName]);
											cardbookSynchronization.syncAccount(myPrefId, aMode);
										}
										for (var j = 0; j < syncFailed.length; j++) {
											var myPrefId = syncFailed[j];
											cardbookUtils.formatStringForOutput("synchronizationFailed", [cardbookPreferences.getName(myPrefId), "passwordNotChanged", cardbookPreferences.getUrl(myPrefId), 401], "Error");
										}
										if (syncAgain.length == 0) {
											cardbookUtils.formatStringForOutput("synchroAllFinished");
											if (aMode == "INITIAL") {
												ovl_birthdays.onLoad();
											}
											// final step for synchronizations
											cardbookSynchronization.startDiscovery();
										}
									}
								}
								lTimerSync.cancel();
							}
						}
					}
					}, 1000, Components.interfaces.nsITimer.TYPE_REPEATING_SLACK);
		},

		waitForLoadFinished: function (aPrefId, aPrefName, aMode, aSync = null) {
			cardbookRepository.lTimerDirAll[aPrefId] = Components.classes["@mozilla.org/timer;1"].createInstance(Components.interfaces.nsITimer);
			var lTimerDir = cardbookRepository.lTimerDirAll[aPrefId];
			lTimerDir.initWithCallback({ notify: function(lTimerDir) {
						cardbookUtils.notifyObservers("syncRunning", aPrefId);
						var request = cardbookSynchronization.getRequest(aPrefId, aPrefName) + cardbookSynchronization.getTotal(aPrefId, aPrefName);
						var response = cardbookSynchronization.getResponse(aPrefId, aPrefName) + cardbookSynchronization.getDone(aPrefId, aPrefName);
						if (request == response) {
							var myPrefIdType = cardbookPreferences.getType(aPrefId);
							cardbookSynchronization.finishSync(aPrefId, aPrefName, myPrefIdType);
							cardbookSynchronization.finishMultipleOperations(aPrefId);
							if (aSync && aSync === true) {
								if (aMode == "INITIAL") {
									// Web requests are delayed for a preference value
									var initialSyncDelay = cardbookPreferences.getStringPref("extensions.cardbook.initialSyncDelay");
									try {
										var initialSyncDelayMs = initialSyncDelay * 1000;
									} catch(e) {
										var initialSyncDelayMs = 0;
									}
									if (initialSyncDelayMs == 0) {
										cardbookSynchronization.syncAccount(aPrefId, aMode);
									} else {
										setTimeout(function() {
												cardbookSynchronization.syncAccount(aPrefId, aMode);
										}, initialSyncDelayMs);
									}
								} else {
									cardbookSynchronization.syncAccount(aPrefId, aMode);
								}
							}
							var total = cardbookSynchronization.getRequest() + cardbookSynchronization.getTotal() + cardbookSynchronization.getResponse() + cardbookSynchronization.getDone();
							if (total === 0) {
								if (aMode == "INITIAL") {
									ovl_birthdays.onLoad();
								}
							}
							lTimerDir.cancel();
						}
					}
					}, 1000, Components.interfaces.nsITimer.TYPE_REPEATING_SLACK);
		},

		waitForImportFinished: function (aPrefId, aPrefName) {
			cardbookRepository.lTimerImportAll[aPrefId] = Components.classes["@mozilla.org/timer;1"].createInstance(Components.interfaces.nsITimer);
			var lTimerImport = cardbookRepository.lTimerImportAll[aPrefId];
			lTimerImport.initWithCallback({ notify: function(lTimerImport) {
						cardbookUtils.notifyObservers("syncRunning", aPrefId);
						var request = cardbookSynchronization.getRequest(aPrefId, aPrefName) + cardbookSynchronization.getTotal(aPrefId, aPrefName);
						var response = cardbookSynchronization.getResponse(aPrefId, aPrefName) + cardbookSynchronization.getDone(aPrefId, aPrefName);
						if (request == response) {
							cardbookSynchronization.finishImport(aPrefId, aPrefName);
							cardbookSynchronization.finishMultipleOperations(aPrefId);
							var total = cardbookSynchronization.getRequest() + cardbookSynchronization.getTotal() + cardbookSynchronization.getResponse() + cardbookSynchronization.getDone();
							if (total === 0) {
								cardbookUtils.formatStringForOutput("importAllFinished");
							}
							lTimerImport.cancel();
						}
					}
					}, 1000, Components.interfaces.nsITimer.TYPE_REPEATING_SLACK);
		},

		waitForComplexSearchFinished: function (aPrefId, aPrefName, aMode) {
			cardbookRepository.lComplexSearchAll[aPrefId] = Components.classes["@mozilla.org/timer;1"].createInstance(Components.interfaces.nsITimer);
			var lComplexSearch = cardbookRepository.lComplexSearchAll[aPrefId];
			lComplexSearch.initWithCallback({ notify: function(lComplexSearch) {
						cardbookUtils.notifyObservers("syncRunning", aPrefId);
						var request = cardbookSynchronization.getRequest(aPrefId, aPrefName);
						var response = cardbookSynchronization.getResponse(aPrefId, aPrefName);
						if (request == response) {
							cardbookSynchronization.finishMultipleOperations(aPrefId);
							var total = cardbookSynchronization.getRequest() + cardbookSynchronization.getResponse();
							if (total === 0) {
								if (aMode == "INITIAL") {
									cardbookUtils.notifyObservers("complexSearchInitLoaded");
								} else {
									cardbookUtils.notifyObservers("complexSearchLoaded", aPrefId);
								}
							}
							lComplexSearch.cancel();
						}
					}
					}, 1000, Components.interfaces.nsITimer.TYPE_REPEATING_SLACK);
		},


		loadComplexSearchAccounts: function () {
			cardbookRepository.cardbookAccounts = [];
			cardbookRepository.cardbookAccountsCategories = {};
			cardbookRepository.cardbookAccountsNodes = {};
			cardbookRepository.cardbookDisplayCards = {};
			cardbookRepository.cardbookFileCacheCards = {};
			cardbookRepository.cardbookCards = {};
			cardbookRepository.cardbookCardLongSearch = {};
			cardbookRepository.cardbookComplexSearch = {};
			
			var myMode = "INITIAL";
			var result = [];
			result = cardbookPreferences.getAllComplexSearchIds();
			for (let i = 0; i < result.length; i++) {
				cardbookComplexSearch.loadComplexSearchAccount(result[i], false, myMode);
			}
			if (result.length == 0) {
				cardbookUtils.notifyObservers("complexSearchInitLoaded");
			}
		},

		loadAccounts: function () {
			var initialSync = cardbookPreferences.getBoolPref("extensions.cardbook.initialSync");
			var myMode = "INITIAL";
			var result = [];
			result = cardbookPreferences.getAllPrefIds();
			for (let i = 0; i < result.length; i++) {
				cardbookSynchronization.loadAccount(result[i], initialSync, true, myMode);
			}
			cardbookSynchronization.setPeriodicSyncs();
			cardbookUtils.notifyObservers("accountsLoaded");
		},

		loadAccount: function (aDirPrefId, aSync, aAddAccount, aMode) {
			var myPrefName = cardbookPreferences.getName(aDirPrefId);
			if (myPrefName == "") {
				return;
			} else {
				var myPrefType = cardbookPreferences.getType(aDirPrefId);
				var myPrefUrl = cardbookPreferences.getUrl(aDirPrefId);
				var myPrefUser = cardbookPreferences.getUser(aDirPrefId);
				var myPrefColor = cardbookPreferences.getColor(aDirPrefId);
				var myPrefEnabled = cardbookPreferences.getEnabled(aDirPrefId);
				var myPrefExpanded = cardbookPreferences.getExpanded(aDirPrefId);
				var myPrefVCard = cardbookPreferences.getVCardVersion(aDirPrefId);
				var myPrefReadOnly = cardbookPreferences.getReadOnly(aDirPrefId);
				var myPrefUrnuuid = cardbookPreferences.getUrnuuid(aDirPrefId);
				var myPrefDBCached = cardbookPreferences.getDBCached(aDirPrefId);
				var myPrefAutoSyncEnabled = cardbookPreferences.getAutoSyncEnabled(aDirPrefId);
				var myPrefAutoSyncInterval = cardbookPreferences.getAutoSyncInterval(aDirPrefId);
				if (aAddAccount) {
					cardbookRepository.addAccountToRepository(aDirPrefId, myPrefName, myPrefType, myPrefUrl, myPrefUser, myPrefColor, myPrefEnabled, myPrefExpanded,
																myPrefVCard, myPrefReadOnly, myPrefUrnuuid, myPrefDBCached, myPrefAutoSyncEnabled, myPrefAutoSyncInterval, false);
					cardbookUtils.formatStringForOutput("addressbookOpened", [myPrefName]);
				}
			}

			if (myPrefEnabled) {
				if (cardbookUtils.isMyAccountRemote(myPrefType) && myPrefDBCached) {
					cardbookSynchronization.initMultipleOperations(aDirPrefId);
					cardbookRepository.cardbookDBRequest[aDirPrefId]++;
					cardbookIndexedDB.loadDB(aDirPrefId, myPrefName, aMode);
					cardbookSynchronization.waitForLoadFinished(aDirPrefId, myPrefName, aMode, aSync);
				} else if (myPrefType === "LOCALDB") {
					cardbookSynchronization.initMultipleOperations(aDirPrefId);
					cardbookRepository.cardbookDBRequest[aDirPrefId]++;
					cardbookIndexedDB.loadDB(aDirPrefId, myPrefName, aMode);
					cardbookSynchronization.waitForLoadFinished(aDirPrefId, myPrefName, aMode);
				} else if (myPrefType === "FILE") {
					cardbookSynchronization.initMultipleOperations(aDirPrefId);
					cardbookRepository.cardbookFileRequest[aDirPrefId]++;
					var myFile = Components.classes["@mozilla.org/file/local;1"].createInstance(Components.interfaces.nsIFile);
					myFile.initWithPath(myPrefUrl);
					cardbookSynchronization.loadFile(myFile, aDirPrefId, aDirPrefId, aMode, "NOIMPORTFILE", "");
					cardbookSynchronization.waitForLoadFinished(aDirPrefId, myPrefName, aMode);
				} else if (myPrefType === "DIRECTORY") {
					cardbookSynchronization.initMultipleOperations(aDirPrefId);
					cardbookRepository.cardbookDirRequest[aDirPrefId]++;
					var myDir = Components.classes["@mozilla.org/file/local;1"].createInstance(Components.interfaces.nsIFile);
					myDir.initWithPath(myPrefUrl);
					cardbookSynchronization.loadDir(myDir, aDirPrefId, aDirPrefId, aMode, "NOIMPORTDIR", "");
					cardbookSynchronization.waitForLoadFinished(aDirPrefId, myPrefName, aMode);
				}
			}
		},

		getAllURLsToDiscover: function (aDirPrefIdToExclude) {
			var sortedDiscoveryAccounts = [];
			for (let account of cardbookRepository.cardbookAccounts) {
				if (aDirPrefIdToExclude != null && aDirPrefIdToExclude !== undefined && aDirPrefIdToExclude != "") {
					if (account[4] == aDirPrefIdToExclude) {
						continue;
					}
				}
				if (account[1] && account[5] && account[6] == "CARDDAV") {
					var myUrl = cardbookPreferences.getUrl(account[4]);
					var myShortUrl = cardbookSynchronization.getShortUrl(myUrl);
					var myUser = cardbookPreferences.getUser(account[4]);
					var found = false;
					for (var j = 0; j < sortedDiscoveryAccounts.length; j++) {
						if (sortedDiscoveryAccounts[j][1] == myUser + "::" + myShortUrl) {
							found = true;
							break;
						}
					}
					if (!found) {
						sortedDiscoveryAccounts.push([myUser + " - " + myShortUrl, myUser + "::" + myShortUrl]);
					}
				}
			}
			return sortedDiscoveryAccounts;
		},

		startDiscovery: function () {
			var allPrefsURLs = [];
			allPrefsURLs = cardbookPreferences.getDiscoveryAccounts();

			for (var i = 0; i < allPrefsURLs.length; i++) {
				var dirPrefId = cardbookUtils.getUUID();
				if (i == 0) {
					cardbookUtils.formatStringForOutput("discoveryRunning", [cardbookRepository.gDiscoveryDescription]);
				}
				cardbookSynchronization.initDiscoveryOperations(dirPrefId);
				cardbookSynchronization.initMultipleOperations(dirPrefId);
				cardbookRepository.cardbookServerValidation[dirPrefId] = {length: 0, user: allPrefsURLs[i][1]};
				cardbookRepository.cardbookServerSyncRequest[dirPrefId]++;
				var connection = {connUser: allPrefsURLs[i][1], connPrefId: dirPrefId, connUrl: allPrefsURLs[i][0], connDescription: cardbookRepository.gDiscoveryDescription};
				var params = {aDirPrefIdType: "CARDDAV"};
				cardbookSynchronization.discoverPhase1(connection, "GETDISPLAYNAME", params);
				cardbookSynchronization.waitForDiscoveryFinished(dirPrefId);
			}
		},

		stopDiscovery: function (aDirPrefId, aState) {
			cardbookSynchronization.finishMultipleOperations(aDirPrefId);
			if (aState) {
				var total = cardbookSynchronization.getRequest() + cardbookSynchronization.getTotal() + cardbookSynchronization.getResponse() + cardbookSynchronization.getDone();
				if (total === 0) {
					cardbookLog.updateStatusProgressInformationWithDebug1(cardbookRepository.gDiscoveryDescription + " : debug mode : cardbookRepository.cardbookServerValidation : ", cardbookRepository.cardbookServerValidation);
					var myAccountsToAdd = [];
					var myAccountsToRemove = [];
					// find all current CARDDAV accounts
					var myCurrentAccounts = [];
					myCurrentAccounts = JSON.parse(JSON.stringify(cardbookRepository.cardbookAccounts));
					function onlyCardDAV(element) {
						return (element[6] == "CARDDAV");
					}
					myCurrentAccounts = myCurrentAccounts.filter(onlyCardDAV);
					cardbookLog.updateStatusProgressInformationWithDebug1(cardbookRepository.gDiscoveryDescription + " : debug mode : myCurrentAccounts : ", myCurrentAccounts);
					
					// find all accounts that should be added and removed
					for (var dirPrefId in cardbookRepository.cardbookServerValidation) {
						if (cardbookRepository.cardbookServerValidation[dirPrefId].length != 0) {
							for (var url in cardbookRepository.cardbookServerValidation[dirPrefId]) {
								if (url == "length" || url == "user") {
									continue;
								}
								for (var i = 0; i < myCurrentAccounts.length; i++) {
									var myCurrentUrl = cardbookPreferences.getUrl(myCurrentAccounts[i][4]);
									var myCurrentUser = cardbookPreferences.getUser(myCurrentAccounts[i][4]);
									if ((myCurrentUser == cardbookRepository.cardbookServerValidation[dirPrefId].user) && (myCurrentUrl == cardbookUtils.decodeURL(url))) {
										cardbookRepository.cardbookServerValidation[dirPrefId][url].forget = true;
										myCurrentAccounts[i][6] = "CARDDAVFOUND";
									}
								}
							}
							// add accounts
							myAccountsToAdd.push(cardbookUtils.fromValidationToArray(dirPrefId, "CARDDAV"));
						}
					}
					// remove accounts
					var myCurrentAccountsNotFound = [];
					myCurrentAccountsNotFound = myCurrentAccounts.filter(onlyCardDAV);
					for (var i = 0; i < myCurrentAccountsNotFound.length; i++) {
						var myCurrentUrl = cardbookPreferences.getUrl(myCurrentAccountsNotFound[i][4]);
						var myCurrentUser = cardbookPreferences.getUser(myCurrentAccountsNotFound[i][4]);
						var myCurrentShortUrl = cardbookSynchronization.getShortUrl(myCurrentUrl);
						for (var dirPrefId in cardbookRepository.cardbookServerValidation) {
							for (var url in cardbookRepository.cardbookServerValidation[dirPrefId]) {
								if (url == "length" || url == "user") {
									continue;
								}
								if ((myCurrentUser == cardbookRepository.cardbookServerValidation[dirPrefId].user) && (myCurrentShortUrl == cardbookSynchronization.getShortUrl(cardbookUtils.decodeURL(url)))) {
									myAccountsToRemove.push(myCurrentAccountsNotFound[i][4]);
									break;
								}
							}
						}
					}

					for (var i = 0; i < myAccountsToAdd.length; i++) {
						cardbookDiscovery.addAddressbook(myAccountsToAdd[i]);
					}
					for (var i = 0; i < myAccountsToRemove.length; i++) {
						cardbookDiscovery.removeAddressbook(myAccountsToRemove[i]);
					}
					for (var dirPrefId in cardbookRepository.cardbookServerValidation) {
						cardbookSynchronization.stopDiscoveryOperations(dirPrefId);
					}
				}
			} else {
				cardbookSynchronization.stopDiscoveryOperations(aDirPrefId);
			}
		},

		waitForDiscoveryFinished: function (aDirPrefId) {
			cardbookRepository.lTimerSyncAll[aDirPrefId] = Components.classes["@mozilla.org/timer;1"].createInstance(Components.interfaces.nsITimer);
			var lTimerSync = cardbookRepository.lTimerSyncAll[aDirPrefId];
			lTimerSync.initWithCallback({ notify: function(lTimerSync) {
						cardbookLog.updateStatusProgressInformationWithDebug1(cardbookRepository.gDiscoveryDescription + " : debug mode : cardbookRepository.cardbookServerDiscoveryRequest : ", cardbookRepository.cardbookServerDiscoveryRequest[aDirPrefId]);
						cardbookLog.updateStatusProgressInformationWithDebug1(cardbookRepository.gDiscoveryDescription + " : debug mode : cardbookRepository.cardbookServerDiscoveryResponse : ", cardbookRepository.cardbookServerDiscoveryResponse[aDirPrefId]);
						cardbookLog.updateStatusProgressInformationWithDebug1(cardbookRepository.gDiscoveryDescription + " : debug mode : cardbookRepository.cardbookServerDiscoveryError : ", cardbookRepository.cardbookServerDiscoveryError[aDirPrefId]);
						cardbookLog.updateStatusProgressInformationWithDebug1(cardbookRepository.gDiscoveryDescription + " : debug mode : cardbookRepository.cardbookServerValidation : ", cardbookRepository.cardbookServerValidation[aDirPrefId]);
						if (cardbookRepository.cardbookServerDiscoveryError[aDirPrefId] >= 1) {
							cardbookSynchronization.stopDiscovery(aDirPrefId, false);
							lTimerSync.cancel();
						} else if (cardbookRepository.cardbookServerDiscoveryRequest[aDirPrefId] == cardbookRepository.cardbookServerDiscoveryResponse[aDirPrefId] && cardbookRepository.cardbookServerDiscoveryResponse[aDirPrefId] != 0) {
							cardbookSynchronization.stopDiscovery(aDirPrefId, true);
							lTimerSync.cancel();
						}
					}
					}, 1000, Components.interfaces.nsITimer.TYPE_REPEATING_SLACK);
		},

		loadFile: function (aFile, aDirPrefId, aTarget, aMode, aImportMode, aActionId) {
			var params = {};
			params["showError"] = true;
			params["aFile"] = aFile;
			params["aTarget"] = aTarget;
			params["aImportMode"] = aImportMode;
			params["aMode"] = aMode;
			params["aPrefId"] = aDirPrefId;
			params["aPrefIdType"] = cardbookPreferences.getType(aDirPrefId);
			params["aPrefIdName"] = cardbookPreferences.getName(aDirPrefId);
			params["aPrefIdUrl"] = cardbookPreferences.getUrl(aDirPrefId);
			params["aPrefIdVersion"] = cardbookPreferences.getVCardVersion(aDirPrefId);
			params["aPrefIdDateFormat"] = cardbookRepository.getDateFormat(aDirPrefId, cardbookPreferences.getVCardVersion(aDirPrefId));
			if (aActionId) {
				params["aActionId"] = aActionId;
				cardbookRepository.currentAction[aActionId].total++;
			}
			cardbookSynchronization.getFileDataAsync(aFile.path, cardbookSynchronization.loadFileAsync, params);
		},
				
		loadFileAsync: function (aContent, aParams) {
			try {
				if (aContent) {
					var re = /[\n\u0085\u2028\u2029]|\r\n?/;
					var fileContentArray = cardbookUtils.cleanArrayWithoutTrim(aContent.split(re));

					var fileContentArrayLength = fileContentArray.length
					if (aParams.aImportMode.endsWith("FILE")) {
						for (let i = 0; i < fileContentArrayLength; i++) {
							if (fileContentArray[i].toUpperCase() == "BEGIN:VCARD") {
								cardbookRepository.cardbookServerSyncTotal[aParams.aPrefId]++;
							}
						}
					}
					cardbookRepository.importConflictChoicePersist = false;
					cardbookRepository.importConflictChoice = "write";
					var cardContent = "";
					for (let i = 0; i < fileContentArrayLength; i++) {
						if (fileContentArray[i].toUpperCase().startsWith("BEGIN:VCARD")) {
							cardContent = fileContentArray[i];
						} else if (fileContentArray[i].toUpperCase().startsWith("END:VCARD")) {
							cardContent = cardContent + "\r\n" + fileContentArray[i];
							try {
								var myCard = new cardbookCardParser(cardContent, "", "", aParams.aPrefId);
								Services.tm.currentThread.dispatch({ run: function() {
									if (myCard.version == "") {
										if (aParams.aImportMode.startsWith("NOIMPORT")) {
											cardbookRepository.cardbookServerSyncError[aParams.aPrefId]++;
											cardbookRepository.cardbookServerSyncDone[aParams.aPrefId]++;
										}
									} else {
										if (aParams.aImportMode.startsWith("NOIMPORT")) {
											if (cardbookRepository.cardbookCards[myCard.dirPrefId+"::"+myCard.uid]) {
												var myOldCard = cardbookRepository.cardbookCards[myCard.dirPrefId+"::"+myCard.uid];
												// if aCard and aModifiedCard have the same cached medias
												cardbookUtils.changeMediaFromFileToContent(myCard);
												cardbookRepository.removeCardFromRepository(myOldCard, true);
											}
											if (aParams.aPrefIdType === "DIRECTORY") {
												cardbookRepository.addCardToRepository(myCard, aParams.aMode, aParams.aFile.leafName);
											} else if (aParams.aPrefIdType === "FILE") {
												myCard.cardurl = "";
												cardbookRepository.addCardToRepository(myCard, aParams.aMode);
											}
										} else {
											cardbookSynchronization.importCard(myCard, aParams.aTarget, true, aParams.aPrefIdVersion, myCard.version, aParams.aPrefIdDateFormat,
																					aParams.aActionId);
										}
										cardbookRepository.cardbookServerSyncDone[aParams.aPrefId]++;
									}
								}}, Components.interfaces.nsIEventTarget.DISPATCH_SYNC);
							}
							catch (e) {
								if (e.message == "") {
									cardbookUtils.formatStringForOutput("parsingCardError", [aParams.aPrefIdName, cardbookRepository.strBundle.GetStringFromName(e.code), cardContent], "Error");
								} else {
									cardbookUtils.formatStringForOutput("parsingCardError", [aParams.aPrefIdName, e.message, cardContent], "Error");
								}
								cardbookRepository.cardbookServerSyncError[aParams.aPrefId]++;
								cardbookRepository.cardbookServerSyncDone[aParams.aPrefId]++;
							}
							cardContent = "";
						} else if (fileContentArray[i] == "") {
							continue;
						} else {
							cardContent = cardContent + "\r\n" + fileContentArray[i];
						}
					}
					if (aParams.aImportMode.startsWith("IMPORT")) {
						if (aParams.aPrefIdType === "FILE") {
							cardbookRepository.reWriteFiles([aParams.aPrefId]);
						}
					}
				} else {
					if (aParams.aImportMode.endsWith("DIR")) {
						cardbookRepository.cardbookServerSyncDone[aParams.aPrefId]++;
					}
					cardbookUtils.formatStringForOutput("fileEmpty", [aParams.aFile.path]);
				}
				cardbookRepository.cardbookFileResponse[aParams.aPrefId]++;
				if (aParams.aActionId) {
					cardbookRepository.currentAction[aParams.aActionId].done++;
				}
			}
			catch (e) {
				cardbookLog.updateStatusProgressInformation("cardbookSynchronization.loadFileAsync error : " + e, "Error");
				cardbookRepository.cardbookFileResponse[aParams.aPrefId]++;
			}
		},

		loadCSVFile: function (aFile, aDirPrefId, aTarget, aMode, aImportMode, aActionId) {
			var params = {};
			params["showError"] = true;
			params["aFile"] = aFile;
			params["aTarget"] = aTarget;
			params["aImportMode"] = aImportMode;
			params["aMode"] = aMode;
			params["aPrefId"] = aDirPrefId;
			params["aPrefIdType"] = cardbookPreferences.getType(aDirPrefId);
			params["aPrefIdName"] = cardbookPreferences.getName(aDirPrefId);
			params["aPrefIdUrl"] = cardbookPreferences.getUrl(aDirPrefId);
			params["aPrefIdVersion"] = cardbookPreferences.getVCardVersion(aDirPrefId);
			params["aPrefIdDateFormat"] = cardbookRepository.getDateFormat(aDirPrefId, cardbookPreferences.getVCardVersion(aDirPrefId));
			if (aActionId) {
				params["aActionId"] = aActionId;
				cardbookRepository.currentAction[aActionId].total++;
			}
			cardbookSynchronization.getFileDataAsync(aFile.path, cardbookSynchronization.loadCSVFileAsync, params);
		},

		loadCSVFileAsync: function (aContent, aParams) {
			try {
				if (aContent) {
					var result = cardbookUtils.CSVToArray(aContent);
					var fileContentArray = result.result;
					var myDelimiter = result.delimiter;
					if (myDelimiter) {
						var myHeader = fileContentArray[0].join(myDelimiter);
					} else {
						var myHeader = fileContentArray[0];
					}
					
					var myArgs = {template: [], headers: myHeader, includePref: false, lineHeader: true, columnSeparator: myDelimiter, mode: "import",
									filename: aParams.aFile.leafName, action: ""};
					var myWindow = window.openDialog("chrome://cardbook/content/csvTranslator/wdw_csvTranslator.xul", "", cardbookRepository.modalWindowParams, myArgs);
					if (myArgs.action == "SAVE") {
						var result = cardbookUtils.CSVToArray(aContent, myArgs.columnSeparator);
						var fileContentArray = result.result;
						if (myArgs.lineHeader) {
							var start = 1;
						} else {
							var start = 0;
						}
						cardbookRepository.importConflictChoicePersist = false;
						cardbookRepository.importConflictChoice = "write";
						var fileContentArrayLength = fileContentArray.length
						cardbookRepository.cardbookServerSyncTotal[aParams.aPrefId] = fileContentArrayLength - start;
						for (var i = start; i < fileContentArrayLength; i++) {
							try {
								var myCard = new cardbookCardParser();
								myCard.dirPrefId = aParams.aPrefId;
								for (var j = 0; j < fileContentArray[i].length; j++) {
									if (myArgs.template[j]) {
										cardbookUtils.setCardValueByField(myCard, myArgs.template[j][0], fileContentArray[i][j]);
									}
								}
								myCard.version = cardbookPreferences.getVCardVersion(aParams.aPrefId);
								cardbookUtils.setCalculatedFields(myCard);
								if (myCard.fn == "") {
									cardbookUtils.getDisplayedName(myCard, myCard.dirPrefId,
																		[myCard.prefixname, myCard.firstname, myCard.othername, myCard.lastname, myCard.suffixname, myCard.nickname],
																		[myCard.org, myCard.title, myCard.role]);
								}
							}
							catch (e) {
								cardbookRepository.cardbookServerSyncError[aParams.aPrefId]++;
								cardbookRepository.cardbookServerSyncDone[aParams.aPrefId]++;
								if (e.message == "") {
									cardbookUtils.formatStringForOutput("parsingCardError", [aParams.aPrefIdName, cardbookRepository.strBundle.GetStringFromName(e.code), fileContentArray[i]], "Error");
								} else {
									cardbookUtils.formatStringForOutput("parsingCardError", [aParams.aPrefIdName, e.message, fileContentArray[i]], "Error");
								}
								continue;
							}
							cardbookSynchronization.importCard(myCard, aParams.aTarget, true, aParams.aPrefIdVersion, myCard.version, aParams.aPrefIdDateFormat,
																	aParams.aActionId);
							myCard = null;
							cardbookRepository.cardbookServerSyncDone[aParams.aPrefId]++;
						}
						if (aParams.aPrefIdType === "FILE") {
							cardbookRepository.reWriteFiles([aParams.aPrefId]);
						}
					}
				} else {
					cardbookUtils.formatStringForOutput("fileEmpty", [aParams.aFile.path]);
				}
				cardbookRepository.cardbookFileResponse[aParams.aPrefId]++;
				if (aParams.aActionId) {
					cardbookRepository.currentAction[aParams.aActionId].done++;
				}
			}
			catch (e) {
				cardbookLog.updateStatusProgressInformation("cardbookSynchronization.loadCSVFileAsync error : " + e, "Error");
				cardbookRepository.cardbookFileResponse[aParams.aPrefId]++;
			}
		},

		importCard: function (aCard, aTarget, aAskUser, aTargetVersion, aDateFormatSource, aDateFormatTarget, aActionId) {
			try {
				var myTargetPrefId = cardbookUtils.getAccountId(aTarget);
				var myTargetPrefIdName = cardbookPreferences.getName(myTargetPrefId);

				var aNewCard = new cardbookCardParser();
				cardbookUtils.cloneCard(aCard, aNewCard);
				aNewCard.dirPrefId = myTargetPrefId;

				// conversion ?
				if (cardbookUtils.convertVCard(aNewCard, myTargetPrefIdName, aTargetVersion, aDateFormatSource, aDateFormatTarget)) {
					cardbookRepository.writePossibleCustomFields();
				}

				var myNodeType = "";
				var myNodeName = "";
				var mySepPosition = aTarget.indexOf("::",0);
				if (mySepPosition != -1) {
					var nodeArray = cardbookUtils.escapeStringSemiColon(aTarget).split("::");
					myNodeType = nodeArray[1];
					myNodeName = nodeArray[nodeArray.length-1];
					if (myNodeType == "categories") {
						if (myNodeName != cardbookRepository.cardbookUncategorizedCards) {
							cardbookRepository.addCategoryToCard(aNewCard, myNodeName);
						} else {
							aNewCard.categories = [];
						}
					} else if (myNodeType == "org") {
						if (myNodeName != cardbookRepository.cardbookUncategorizedCards) {
							nodeArray.shift();
							nodeArray.shift();
							aNewCard.org = cardbookUtils.unescapeStringSemiColon(nodeArray.join(";"));
						} else {
							aNewCard.org = "";
						}
					}
				}

				if (aAskUser && !cardbookRepository.importConflictChoicePersist && cardbookRepository.cardbookCards[myTargetPrefId+"::"+aNewCard.uid]) {
					var message = cardbookRepository.strBundle.formatStringFromName("cardAlreadyExists", [myTargetPrefIdName, aNewCard.fn], 2);
					var confirmMessage = cardbookRepository.strBundle.GetStringFromName("askUserPersistMessage");
					var askUserResult = cardbookSynchronization.askUser(message, "keep", "overwrite", "duplicate", "merge", confirmMessage, false);
					cardbookRepository.importConflictChoice = askUserResult.result;
					cardbookRepository.importConflictChoicePersist = askUserResult.resultConfirm;
					if (cardbookRepository.importConflictChoicePersist) {
						cardbookUtils.notifyObservers("importConflictChoicePersist");
					}
				}
				switch (cardbookRepository.importConflictChoice) {
					case "cancel":
					case "keep":
						break;
					case "duplicate":
						aNewCard.cardurl = "";
						aNewCard.fn = aNewCard.fn + " " + cardbookRepository.strBundle.GetStringFromName("fnDuplicatedMessage");
						cardbookUtils.setCardUUID(aNewCard);
						cardbookRepository.saveCard({}, aNewCard, aActionId, true);
						break;
					case "write":
						cardbookRepository.saveCard({}, aNewCard, aActionId, true);
						break;
					case "overwrite":
						if (cardbookRepository.cardbookCards[myTargetPrefId+"::"+aNewCard.uid]) {
							var myTargetCard = cardbookRepository.cardbookCards[myTargetPrefId+"::"+aNewCard.uid];
							cardbookRepository.currentAction[aActionId].total++;
							cardbookRepository.deleteCards([myTargetCard], aActionId);
						}
						cardbookRepository.saveCard({}, aNewCard, aActionId, true);
						break;
					case "update":
						if (cardbookRepository.cardbookCards[myTargetPrefId+"::"+aNewCard.uid]) {
							var myTargetCard = cardbookRepository.cardbookCards[myTargetPrefId+"::"+aNewCard.uid];
							cardbookRepository.saveCard(myTargetCard, aNewCard, aActionId, true);
						}
						break;
					case "merge":
						var myTargetCard = cardbookRepository.cardbookCards[myTargetPrefId+"::"+aNewCard.uid];
						var myArgs = {cardsIn: [myTargetCard, aNewCard], cardsOut: [], hideCreate: false, action: ""};
						var myWindow = window.openDialog("chrome://cardbook/content/mergeCards/wdw_mergeCards.xul", "", cardbookRepository.modalWindowParams, myArgs);
						if (myArgs.action == "CREATE") {
							cardbookRepository.saveCard({}, myArgs.cardsOut[0], aActionId, true);
						} else if (myArgs.action == "CREATEANDREPLACE") {
							cardbookRepository.currentAction[aActionId].total = cardbookRepository.currentAction[aActionId].total + myArgs.cardsIn.length;
							cardbookRepository.deleteCards(myArgs.cardsIn, aActionId);
							cardbookRepository.saveCard({}, myArgs.cardsOut[0], aActionId, true);
						}
						break;
				}

				// inside same account to a category
				if (aTarget != aCard.dirPrefId && myNodeType == "categories") {
					if (myNodeName && myNodeName != cardbookRepository.cardbookUncategorizedCards) {
						cardbookUtils.formatStringForOutput("cardAddedToCategory", [myTargetPrefIdName, aNewCard.fn, myNodeName]);
					} else if (myNodeName && myNodeName == cardbookRepository.cardbookUncategorizedCards) {
						cardbookUtils.formatStringForOutput("cardDeletedFromAllCategory", [myTargetPrefIdName, aNewCard.fn]);
					}
				}
			}
			catch (e) {
				cardbookLog.updateStatusProgressInformation("wdw_cardbook.importCard error : " + e, "Error");
			}
		},

		writeCardsToCSVFile: function (aFileName, aFileLeafName, aListofCard) {
			try {
				var output = "";
				var myArgs = {template: [], mode: "export", includePref: false, lineHeader: true, columnSeparator: ";",
								filename: aFileLeafName, action: ""};
				var myWindow = window.openDialog("chrome://cardbook/content/csvTranslator/wdw_csvTranslator.xul", "", cardbookRepository.modalWindowParams, myArgs);
				if (myArgs.action == "SAVE") {
					var k = 0;
					for (var i = 0; i < myArgs.template.length; i++) {
						if (k === 0) {
							output = "\"" + myArgs.template[i][1] + "\"";
							k++;
						} else {
							output = output + myArgs.columnSeparator + "\"" + myArgs.template[i][1] + "\"";
						}
					}
					k = 0;
					for (var i = 0; i < aListofCard.length; i++) {
						for (var j = 0; j < myArgs.template.length; j++) {
							if (myArgs.template[j][0] == "categories.0.array") {
								var tmpValue = cardbookUtils.getCardValueByField(aListofCard[i], myArgs.template[j][0], false);
								tmpValue = cardbookUtils.unescapeArrayComma(cardbookUtils.escapeArrayComma(tmpValue)).join(",");
							} else {
								var tmpValue = cardbookUtils.getCardValueByField(aListofCard[i], myArgs.template[j][0], myArgs.includePref).join("\r\n");
							}
							var tmpResult = "\"" + tmpValue + "\"";
							if (k === 0) {
								output = output + "\r\n" + tmpResult;
								k++;
							} else {
								output = output + myArgs.columnSeparator + tmpResult;
							}
						}
						k = 0;
					}

					// a final blank line
					output = output + "\r\n";
					cardbookSynchronization.writeContentToFile(aFileName, output, "UTF8");

					if (aListofCard.length > 1) {
						cardbookUtils.formatStringForOutput("exportsOKIntoFile", [aFileLeafName]);
					} else {
						cardbookUtils.formatStringForOutput("exportOKIntoFile", [aFileLeafName]);
					}
				}
			}
			catch (e) {
				cardbookLog.updateStatusProgressInformation("cardbookSynchronization.writeCardsToCSVFile error : " + e, "Error");
			}
		},

		writeCardsToFile: function (aFileName, aListofCard, aMediaConversion) {
			try {
				var output = cardbookUtils.getDataForUpdatingFile(aListofCard, aMediaConversion);

				cardbookSynchronization.writeContentToFile(aFileName, output, "UTF8");
			}
			catch (e) {
				cardbookLog.updateStatusProgressInformation("cardbookSynchronization.writeCardsToFile error : " + e, "Error");
			}
		},

		writeCardsToDir: function (aDirName, aListofCard, aMediaConversion) {
			try {
				var myDirectory = Components.classes["@mozilla.org/file/local;1"].createInstance(Components.interfaces.nsIFile);
				// write dir in background
				Services.tm.currentThread.dispatch({ run: function() {
					for (var i = 0; i < aListofCard.length; i++) {
						var myCard = aListofCard[i];
						myDirectory.initWithPath(aDirName);
						var myFile = myDirectory;
						myFile.append(cardbookUtils.getFileNameForCard(aDirName, myCard.fn, myCard.uid));
						if (myFile.exists() == false){
							myFile.create(Components.interfaces.nsIFile.NORMAL_FILE_TYPE, 420);
						}
						// then write the files one by one to avoid freeze
						Services.tm.currentThread.dispatch({ run: function() {
								cardbookSynchronization.writeContentToFile(myFile.path, cardbookUtils.cardToVcardData(myCard, aMediaConversion), "UTF8");
						}}, Components.interfaces.nsIEventTarget.DISPATCH_SYNC);
					}
				}}, Components.interfaces.nsIEventTarget.DISPATCH_NORMAL);
			}
			catch (e) {
				cardbookLog.updateStatusProgressInformation("cardbookSynchronization.writeCardsToDir error : " + e, "Error");
			}
		},

		writeContentToFile: function (aFileName, aContent, aConvertion) {
			try {
				var myFile = Components.classes["@mozilla.org/file/local;1"].createInstance(Components.interfaces.nsIFile);
				myFile.initWithPath(aFileName);

				if (myFile.exists() == false){
					myFile.create(Components.interfaces.nsIFile.NORMAL_FILE_TYPE, 420);
				}
				
				var outputStream = Components.classes["@mozilla.org/network/file-output-stream;1"].createInstance(Components.interfaces.nsIFileOutputStream);
				outputStream.init(myFile, 0x2A, parseInt("0600", 8), 0);

				if (aConvertion === "UTF8") {
					var converter = Components.classes["@mozilla.org/intl/converter-output-stream;1"].createInstance(Components.interfaces.nsIConverterOutputStream);
					converter.init(outputStream, "UTF-8", aContent.length, Components.interfaces.nsIConverterInputStream.DEFAULT_REPLACEMENT_CHARACTER);
					converter.writeString(aContent);
					converter.close();
				} else {
					var result = outputStream.write(aContent, aContent.length);
				}
				
				outputStream.close();
				cardbookLog.updateStatusProgressInformationWithDebug2("debug mode : file rewritten : " + aFileName);
			}
			catch (e) {
				cardbookLog.updateStatusProgressInformation("cardbookSynchronization.writeContentToFile error : filename : " + aFileName + ", error : " + e, "Error");
			}
		}
	};
};
