var { Services } = ChromeUtils.import("resource://gre/modules/Services.jsm");
var { FileUtils } = ChromeUtils.import("resource://gre/modules/FileUtils.jsm");
var { AppConstants } = ChromeUtils.import("resource://gre/modules/AppConstants.jsm");
var { OS } = ChromeUtils.import("resource://gre/modules/osfile.jsm");

var loader = Services.scriptloader;
loader.loadSubScript("chrome://cardbook/content/cardbookIndexedDB.js", this);
loader.loadSubScript("chrome://cardbook/content/birthdays/cardbookBirthdaysUtils.js", this);
loader.loadSubScript("chrome://cardbook/content/birthdays/ovl_birthdays.js", this);
loader.loadSubScript("chrome://cardbook/content/cardbookWebDAV.js", this);
loader.loadSubScript("chrome://cardbook/content/cardbookActions.js", this);
loader.loadSubScript("chrome://cardbook/content/cardbookCardParser.js", this);

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
		cardbookRepository.cardbookDBCardRequest[aPrefId] = 0;
		cardbookRepository.cardbookDBCardResponse[aPrefId] = 0;
		cardbookRepository.cardbookDBCatRequest[aPrefId] = 0;
		cardbookRepository.cardbookDBCatResponse[aPrefId] = 0;
		cardbookRepository.cardbookComplexSearchRequest[aPrefId] = 0;
		cardbookRepository.cardbookComplexSearchResponse[aPrefId] = 0;
		cardbookRepository.cardbookComplexSearchReloadRequest[aPrefId] = 0;
		cardbookRepository.cardbookComplexSearchReloadResponse[aPrefId] = 0;
		cardbookRepository.cardbookCardsFromCache[aPrefId] = {};
		cardbookRepository.cardbookServerDiscoveryRequest[aPrefId] = 0;
		cardbookRepository.cardbookServerDiscoveryResponse[aPrefId] = 0;
		cardbookRepository.cardbookServerDiscoveryError[aPrefId] = 0;
		cardbookRepository.cardbookServerSyncRequest[aPrefId] = 0;
		cardbookRepository.cardbookServerSyncResponse[aPrefId] = 0;
		cardbookRepository.cardbookServerCardSyncDone[aPrefId] = 0;
		cardbookRepository.cardbookServerCardSyncTotal[aPrefId] = 0;
		cardbookRepository.cardbookServerCardSyncError[aPrefId] = 0;
		cardbookRepository.cardbookServerCatSyncDone[aPrefId] = 0;
		cardbookRepository.cardbookServerCatSyncTotal[aPrefId] = 0;
		cardbookRepository.cardbookServerCatSyncError[aPrefId] = 0;
		cardbookRepository.cardbookServerSyncNotUpdatedCard[aPrefId] = 0;
		cardbookRepository.cardbookServerSyncNotUpdatedCat[aPrefId] = 0;
		cardbookRepository.cardbookServerSyncNewCardOnServer[aPrefId] = 0;
		cardbookRepository.cardbookServerSyncNewCatOnServer[aPrefId] = 0;
		cardbookRepository.cardbookServerSyncNewCardOnDisk[aPrefId] = 0;
		cardbookRepository.cardbookServerSyncNewCatOnDisk[aPrefId] = 0;
		cardbookRepository.cardbookServerSyncUpdatedCardOnServer[aPrefId] = 0;
		cardbookRepository.cardbookServerSyncUpdatedCatOnServer[aPrefId] = 0;
		cardbookRepository.cardbookServerSyncUpdatedCardOnDisk[aPrefId] = 0;
		cardbookRepository.cardbookServerSyncUpdatedCatOnDisk[aPrefId] = 0;
		cardbookRepository.cardbookServerSyncUpdatedCardOnBoth[aPrefId] = 0;
		cardbookRepository.cardbookServerSyncUpdatedCatOnBoth[aPrefId] = 0;
		cardbookRepository.cardbookServerSyncUpdatedCardOnDiskDeletedCardOnServer[aPrefId] = 0;
		cardbookRepository.cardbookServerSyncUpdatedCatOnDiskDeletedCatOnServer[aPrefId] = 0;
		cardbookRepository.cardbookServerSyncDeletedCardOnDisk[aPrefId] = 0;
		cardbookRepository.cardbookServerSyncDeletedCatOnDisk[aPrefId] = 0;
		cardbookRepository.cardbookServerSyncDeletedCardOnServer[aPrefId] = 0;
		cardbookRepository.cardbookServerSyncDeletedCatOnServer[aPrefId] = 0;
		cardbookRepository.cardbookServerSyncDeletedCardOnDiskUpdatedCardOnServer[aPrefId] = 0;
		cardbookRepository.cardbookServerSyncDeletedCatOnDiskUpdatedCatOnServer[aPrefId] = 0;
		cardbookRepository.cardbookServerSyncAgain[aPrefId] = false;
		cardbookRepository.cardbookServerSyncCompareCardWithCacheDone[aPrefId] = 0;
		cardbookRepository.cardbookServerSyncCompareCardWithCacheTotal[aPrefId] = 0;
		cardbookRepository.cardbookServerSyncCompareCatWithCacheDone[aPrefId] = 0;
		cardbookRepository.cardbookServerSyncCompareCatWithCacheTotal[aPrefId] = 0;
		cardbookRepository.cardbookServerSyncHandleRemainingCardDone[aPrefId] = 0;
		cardbookRepository.cardbookServerSyncHandleRemainingCardTotal[aPrefId] = 0;
		cardbookRepository.cardbookServerSyncHandleRemainingCatDone[aPrefId] = 0;
		cardbookRepository.cardbookServerSyncHandleRemainingCatTotal[aPrefId] = 0;
		cardbookRepository.cardbookServerGetCardRequest[aPrefId] = 0;
		cardbookRepository.cardbookServerGetCardResponse[aPrefId] = 0;
		cardbookRepository.cardbookServerGetCardError[aPrefId] = 0;
		cardbookRepository.cardbookServerGetCardForMergeRequest[aPrefId] = 0;
		cardbookRepository.cardbookServerGetCardForMergeResponse[aPrefId] = 0;
		cardbookRepository.cardbookServerGetCardForMergeError[aPrefId] = 0;
		cardbookRepository.cardbookServerMultiGetArray[aPrefId] = [];
		cardbookRepository.cardbookServerSyncParams[aPrefId] = [];
		cardbookRepository.cardbookServerMultiGetRequest[aPrefId] = 0;
		cardbookRepository.cardbookServerMultiGetResponse[aPrefId] = 0;
		cardbookRepository.cardbookServerMultiGetError[aPrefId] = 0;
		cardbookRepository.cardbookServerUpdatedCardRequest[aPrefId] = 0;
		cardbookRepository.cardbookServerUpdatedCardResponse[aPrefId] = 0;
		cardbookRepository.cardbookServerUpdatedCardError[aPrefId] = 0;
		cardbookRepository.cardbookServerUpdatedCatRequest[aPrefId] = 0;
		cardbookRepository.cardbookServerUpdatedCatResponse[aPrefId] = 0;
		cardbookRepository.cardbookServerUpdatedCatError[aPrefId] = 0;
		cardbookRepository.cardbookServerCreatedCardRequest[aPrefId] = 0;
		cardbookRepository.cardbookServerCreatedCardResponse[aPrefId] = 0;
		cardbookRepository.cardbookServerCreatedCardError[aPrefId] = 0;
		cardbookRepository.cardbookServerCreatedCatRequest[aPrefId] = 0;
		cardbookRepository.cardbookServerCreatedCatResponse[aPrefId] = 0;
		cardbookRepository.cardbookServerCreatedCatError[aPrefId] = 0;
		cardbookRepository.cardbookServerDeletedCardRequest[aPrefId] = 0;
		cardbookRepository.cardbookServerDeletedCardResponse[aPrefId] = 0;
		cardbookRepository.cardbookServerDeletedCardError[aPrefId] = 0;
		cardbookRepository.cardbookServerDeletedCatRequest[aPrefId] = 0;
		cardbookRepository.cardbookServerDeletedCatResponse[aPrefId] = 0;
		cardbookRepository.cardbookServerDeletedCatError[aPrefId] = 0;
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
			cardbookRepository.cardbookLog.updateStatusProgressInformationWithDebug1(aPrefName + " : debug mode : cardbookRepository.cardbookComplexSearchRequest : ", cardbookRepository.cardbookComplexSearchRequest[aPrefId]);
			cardbookRepository.cardbookLog.updateStatusProgressInformationWithDebug1(aPrefName + " : debug mode : cardbookRepository.cardbookComplexSearchReloadRequest : ", cardbookRepository.cardbookComplexSearchReloadRequest[aPrefId]);
			cardbookRepository.cardbookLog.updateStatusProgressInformationWithDebug1(aPrefName + " : debug mode : cardbookRepository.cardbookAccessTokenRequest : ", cardbookRepository.cardbookAccessTokenRequest[aPrefId]);
			cardbookRepository.cardbookLog.updateStatusProgressInformationWithDebug1(aPrefName + " : debug mode : cardbookRepository.cardbookRefreshTokenRequest : ", cardbookRepository.cardbookRefreshTokenRequest[aPrefId]);
			cardbookRepository.cardbookLog.updateStatusProgressInformationWithDebug1(aPrefName + " : debug mode : cardbookRepository.cardbookServerDiscoveryRequest : ", cardbookRepository.cardbookServerDiscoveryRequest[aPrefId]);
			cardbookRepository.cardbookLog.updateStatusProgressInformationWithDebug1(aPrefName + " : debug mode : cardbookRepository.cardbookServerGetCardRequest : ", cardbookRepository.cardbookServerGetCardRequest[aPrefId]);
			cardbookRepository.cardbookLog.updateStatusProgressInformationWithDebug1(aPrefName + " : debug mode : cardbookRepository.cardbookServerGetCardForMergeRequest : ", cardbookRepository.cardbookServerGetCardForMergeRequest[aPrefId]);
			cardbookRepository.cardbookLog.updateStatusProgressInformationWithDebug1(aPrefName + " : debug mode : cardbookRepository.cardbookServerMultiGetRequest : ", cardbookRepository.cardbookServerMultiGetRequest[aPrefId]);
			cardbookRepository.cardbookLog.updateStatusProgressInformationWithDebug1(aPrefName + " : debug mode : cardbookRepository.cardbookServerUpdatedCatRequest : ", cardbookRepository.cardbookServerUpdatedCatRequest[aPrefId]);
			cardbookRepository.cardbookLog.updateStatusProgressInformationWithDebug1(aPrefName + " : debug mode : cardbookRepository.cardbookServerUpdatedCardRequest : ", cardbookRepository.cardbookServerUpdatedCardRequest[aPrefId]);
			cardbookRepository.cardbookLog.updateStatusProgressInformationWithDebug1(aPrefName + " : debug mode : cardbookRepository.cardbookServerCreatedCatRequest : ", cardbookRepository.cardbookServerCreatedCatRequest[aPrefId]);
			cardbookRepository.cardbookLog.updateStatusProgressInformationWithDebug1(aPrefName + " : debug mode : cardbookRepository.cardbookServerCreatedCardRequest : ", cardbookRepository.cardbookServerCreatedCardRequest[aPrefId]);
			cardbookRepository.cardbookLog.updateStatusProgressInformationWithDebug1(aPrefName + " : debug mode : cardbookRepository.cardbookServerDeletedCatRequest : ", cardbookRepository.cardbookServerDeletedCatRequest[aPrefId]);
			cardbookRepository.cardbookLog.updateStatusProgressInformationWithDebug1(aPrefName + " : debug mode : cardbookRepository.cardbookServerDeletedCardRequest : ", cardbookRepository.cardbookServerDeletedCardRequest[aPrefId]);
			cardbookRepository.cardbookLog.updateStatusProgressInformationWithDebug1(aPrefName + " : debug mode : cardbookRepository.cardbookDirRequest : ", cardbookRepository.cardbookDirRequest[aPrefId]);
			cardbookRepository.cardbookLog.updateStatusProgressInformationWithDebug1(aPrefName + " : debug mode : cardbookRepository.cardbookFileRequest : ", cardbookRepository.cardbookFileRequest[aPrefId]);
			cardbookRepository.cardbookLog.updateStatusProgressInformationWithDebug1(aPrefName + " : debug mode : cardbookRepository.cardbookDBCardRequest : ", cardbookRepository.cardbookDBCardRequest[aPrefId]);
			cardbookRepository.cardbookLog.updateStatusProgressInformationWithDebug1(aPrefName + " : debug mode : cardbookRepository.cardbookDBCatRequest : ", cardbookRepository.cardbookDBCatRequest[aPrefId]);
			cardbookRepository.cardbookLog.updateStatusProgressInformationWithDebug1(aPrefName + " : debug mode : cardbookRepository.cardbookImageGetRequest : ", cardbookRepository.cardbookImageGetRequest[aPrefId]);
			cardbookRepository.cardbookLog.updateStatusProgressInformationWithDebug1(aPrefName + " : debug mode : cardbookRepository.cardbookServerSyncRequest : ", cardbookRepository.cardbookServerSyncRequest[aPrefId]);
			return cardbookRepository.cardbookComplexSearchRequest[aPrefId] +
					cardbookRepository.cardbookComplexSearchReloadRequest[aPrefId] +
					cardbookRepository.cardbookAccessTokenRequest[aPrefId] +
					cardbookRepository.cardbookRefreshTokenRequest[aPrefId] +
					cardbookRepository.cardbookServerDiscoveryRequest[aPrefId] +
					cardbookRepository.cardbookServerGetCardRequest[aPrefId] +
					cardbookRepository.cardbookServerGetCardForMergeRequest[aPrefId] +
					cardbookRepository.cardbookServerMultiGetRequest[aPrefId] +
					cardbookRepository.cardbookServerUpdatedCatRequest[aPrefId] +
					cardbookRepository.cardbookServerUpdatedCardRequest[aPrefId] +
					cardbookRepository.cardbookServerCreatedCatRequest[aPrefId] +
					cardbookRepository.cardbookServerCreatedCardRequest[aPrefId] +
					cardbookRepository.cardbookServerDeletedCardRequest[aPrefId] +
					cardbookRepository.cardbookServerDeletedCatRequest[aPrefId] +
					cardbookRepository.cardbookDirRequest[aPrefId] +
					cardbookRepository.cardbookFileRequest[aPrefId] +
					cardbookRepository.cardbookDBCardRequest[aPrefId] +
					cardbookRepository.cardbookDBCatRequest[aPrefId] +
					cardbookRepository.cardbookImageGetRequest[aPrefId] +
					cardbookRepository.cardbookServerSyncRequest[aPrefId];
		} else {
			cardbookRepository.cardbookLog.updateStatusProgressInformationWithDebug1("Total : debug mode : cardbookRepository.cardbookComplexSearchRequest : ", cardbookRepository.cardbookUtils.sumElements(cardbookRepository.cardbookComplexSearchRequest));
			cardbookRepository.cardbookLog.updateStatusProgressInformationWithDebug1("Total : debug mode : cardbookRepository.cardbookComplexSearchReloadRequest : ", cardbookRepository.cardbookUtils.sumElements(cardbookRepository.cardbookComplexSearchReloadRequest));
			cardbookRepository.cardbookLog.updateStatusProgressInformationWithDebug1("Total : debug mode : cardbookRepository.cardbookAccessTokenRequest : ", cardbookRepository.cardbookUtils.sumElements(cardbookRepository.cardbookAccessTokenRequest));
			cardbookRepository.cardbookLog.updateStatusProgressInformationWithDebug1("Total : debug mode : cardbookRepository.cardbookRefreshTokenRequest : ", cardbookRepository.cardbookUtils.sumElements(cardbookRepository.cardbookRefreshTokenRequest));
			cardbookRepository.cardbookLog.updateStatusProgressInformationWithDebug1("Total : debug mode : cardbookRepository.cardbookServerDiscoveryRequest : ", cardbookRepository.cardbookUtils.sumElements(cardbookRepository.cardbookServerDiscoveryRequest));
			cardbookRepository.cardbookLog.updateStatusProgressInformationWithDebug1("Total : debug mode : cardbookRepository.cardbookServerGetCardRequest : ", cardbookRepository.cardbookUtils.sumElements(cardbookRepository.cardbookServerGetCardRequest));
			cardbookRepository.cardbookLog.updateStatusProgressInformationWithDebug1("Total : debug mode : cardbookRepository.cardbookServerGetCardForMergeRequest : ", cardbookRepository.cardbookUtils.sumElements(cardbookRepository.cardbookServerGetCardForMergeRequest));
			cardbookRepository.cardbookLog.updateStatusProgressInformationWithDebug1("Total : debug mode : cardbookRepository.cardbookServerMultiGetRequest : ", cardbookRepository.cardbookUtils.sumElements(cardbookRepository.cardbookServerMultiGetRequest));
			cardbookRepository.cardbookLog.updateStatusProgressInformationWithDebug1("Total : debug mode : cardbookRepository.cardbookServerUpdatedCatRequest : ", cardbookRepository.cardbookUtils.sumElements(cardbookRepository.cardbookServerUpdatedCatRequest));
			cardbookRepository.cardbookLog.updateStatusProgressInformationWithDebug1("Total : debug mode : cardbookRepository.cardbookServerUpdatedCardRequest : ", cardbookRepository.cardbookUtils.sumElements(cardbookRepository.cardbookServerUpdatedCardRequest));
			cardbookRepository.cardbookLog.updateStatusProgressInformationWithDebug1("Total : debug mode : cardbookRepository.cardbookServerCreatedCatRequest : ", cardbookRepository.cardbookUtils.sumElements(cardbookRepository.cardbookServerCreatedCatRequest));
			cardbookRepository.cardbookLog.updateStatusProgressInformationWithDebug1("Total : debug mode : cardbookRepository.cardbookServerCreatedCardRequest : ", cardbookRepository.cardbookUtils.sumElements(cardbookRepository.cardbookServerCreatedCardRequest));
			cardbookRepository.cardbookLog.updateStatusProgressInformationWithDebug1("Total : debug mode : cardbookRepository.cardbookServerDeletedCatRequest : ", cardbookRepository.cardbookUtils.sumElements(cardbookRepository.cardbookServerDeletedCatRequest));
			cardbookRepository.cardbookLog.updateStatusProgressInformationWithDebug1("Total : debug mode : cardbookRepository.cardbookServerDeletedCardRequest : ", cardbookRepository.cardbookUtils.sumElements(cardbookRepository.cardbookServerDeletedCardRequest));
			cardbookRepository.cardbookLog.updateStatusProgressInformationWithDebug1("Total : debug mode : cardbookRepository.cardbookDirRequest : ", cardbookRepository.cardbookUtils.sumElements(cardbookRepository.cardbookDirRequest));
			cardbookRepository.cardbookLog.updateStatusProgressInformationWithDebug1("Total : debug mode : cardbookRepository.cardbookFileRequest : ", cardbookRepository.cardbookUtils.sumElements(cardbookRepository.cardbookFileRequest));
			cardbookRepository.cardbookLog.updateStatusProgressInformationWithDebug1("Total : debug mode : cardbookRepository.cardbookDBCardRequest : ", cardbookRepository.cardbookUtils.sumElements(cardbookRepository.cardbookDBCardRequest));
			cardbookRepository.cardbookLog.updateStatusProgressInformationWithDebug1("Total : debug mode : cardbookRepository.cardbookDBCatRequest : ", cardbookRepository.cardbookUtils.sumElements(cardbookRepository.cardbookDBCatRequest));
			cardbookRepository.cardbookLog.updateStatusProgressInformationWithDebug1("Total : debug mode : cardbookRepository.cardbookImageGetRequest : ", cardbookRepository.cardbookUtils.sumElements(cardbookRepository.cardbookImageGetRequest));
			cardbookRepository.cardbookLog.updateStatusProgressInformationWithDebug1("Total : debug mode : cardbookRepository.cardbookServerSyncRequest : ", cardbookRepository.cardbookUtils.sumElements(cardbookRepository.cardbookServerSyncRequest));
			return cardbookRepository.cardbookUtils.sumElements(cardbookRepository.cardbookComplexSearchRequest) +
					cardbookRepository.cardbookUtils.sumElements(cardbookRepository.cardbookComplexSearchReloadRequest) +
					cardbookRepository.cardbookUtils.sumElements(cardbookRepository.cardbookAccessTokenRequest) +
					cardbookRepository.cardbookUtils.sumElements(cardbookRepository.cardbookRefreshTokenRequest) +
					cardbookRepository.cardbookUtils.sumElements(cardbookRepository.cardbookServerDiscoveryRequest) +
					cardbookRepository.cardbookUtils.sumElements(cardbookRepository.cardbookServerGetCardRequest) +
					cardbookRepository.cardbookUtils.sumElements(cardbookRepository.cardbookServerGetCardForMergeRequest) +
					cardbookRepository.cardbookUtils.sumElements(cardbookRepository.cardbookServerMultiGetRequest) +
					cardbookRepository.cardbookUtils.sumElements(cardbookRepository.cardbookServerUpdatedCatRequest) +
					cardbookRepository.cardbookUtils.sumElements(cardbookRepository.cardbookServerUpdatedCardRequest) +
					cardbookRepository.cardbookUtils.sumElements(cardbookRepository.cardbookServerCreatedCatRequest) +
					cardbookRepository.cardbookUtils.sumElements(cardbookRepository.cardbookServerCreatedCardRequest) +
					cardbookRepository.cardbookUtils.sumElements(cardbookRepository.cardbookServerDeletedCatRequest) +
					cardbookRepository.cardbookUtils.sumElements(cardbookRepository.cardbookServerDeletedCardRequest) +
					cardbookRepository.cardbookUtils.sumElements(cardbookRepository.cardbookDirRequest) +
					cardbookRepository.cardbookUtils.sumElements(cardbookRepository.cardbookFileRequest) +
					cardbookRepository.cardbookUtils.sumElements(cardbookRepository.cardbookDBCardRequest) +
					cardbookRepository.cardbookUtils.sumElements(cardbookRepository.cardbookDBCatRequest) +
					cardbookRepository.cardbookUtils.sumElements(cardbookRepository.cardbookImageGetRequest) +
					cardbookRepository.cardbookUtils.sumElements(cardbookRepository.cardbookServerSyncRequest);
		}
	},
	
	getResponse: function(aPrefId, aPrefName) {
		if (aPrefId) {
			cardbookRepository.cardbookLog.updateStatusProgressInformationWithDebug1(aPrefName + " : debug mode : cardbookRepository.cardbookComplexSearchResponse : ", cardbookRepository.cardbookComplexSearchResponse[aPrefId]);
			cardbookRepository.cardbookLog.updateStatusProgressInformationWithDebug1(aPrefName + " : debug mode : cardbookRepository.cardbookComplexSearchReloadResponse : ", cardbookRepository.cardbookComplexSearchReloadResponse[aPrefId]);
			cardbookRepository.cardbookLog.updateStatusProgressInformationWithDebug1(aPrefName + " : debug mode : cardbookRepository.cardbookAccessTokenResponse : ", cardbookRepository.cardbookAccessTokenResponse[aPrefId]);
			cardbookRepository.cardbookLog.updateStatusProgressInformationWithDebug1(aPrefName + " : debug mode : cardbookRepository.cardbookRefreshTokenResponse : ", cardbookRepository.cardbookRefreshTokenResponse[aPrefId]);
			cardbookRepository.cardbookLog.updateStatusProgressInformationWithDebug1(aPrefName + " : debug mode : cardbookRepository.cardbookServerDiscoveryResponse : ", cardbookRepository.cardbookServerDiscoveryResponse[aPrefId]);
			cardbookRepository.cardbookLog.updateStatusProgressInformationWithDebug1(aPrefName + " : debug mode : cardbookRepository.cardbookServerGetCardResponse : ", cardbookRepository.cardbookServerGetCardResponse[aPrefId]);
			cardbookRepository.cardbookLog.updateStatusProgressInformationWithDebug1(aPrefName + " : debug mode : cardbookRepository.cardbookServerGetCardForMergeResponse : ", cardbookRepository.cardbookServerGetCardForMergeResponse[aPrefId]);
			cardbookRepository.cardbookLog.updateStatusProgressInformationWithDebug1(aPrefName + " : debug mode : cardbookRepository.cardbookServerMultiGetResponse : ", cardbookRepository.cardbookServerMultiGetResponse[aPrefId]);
			cardbookRepository.cardbookLog.updateStatusProgressInformationWithDebug1(aPrefName + " : debug mode : cardbookRepository.cardbookServerUpdatedCatResponse : ", cardbookRepository.cardbookServerUpdatedCatResponse[aPrefId]);
			cardbookRepository.cardbookLog.updateStatusProgressInformationWithDebug1(aPrefName + " : debug mode : cardbookRepository.cardbookServerUpdatedCardResponse : ", cardbookRepository.cardbookServerUpdatedCardResponse[aPrefId]);
			cardbookRepository.cardbookLog.updateStatusProgressInformationWithDebug1(aPrefName + " : debug mode : cardbookRepository.cardbookServerCreatedCatResponse : ", cardbookRepository.cardbookServerCreatedCatResponse[aPrefId]);
			cardbookRepository.cardbookLog.updateStatusProgressInformationWithDebug1(aPrefName + " : debug mode : cardbookRepository.cardbookServerCreatedCardResponse : ", cardbookRepository.cardbookServerCreatedCardResponse[aPrefId]);
			cardbookRepository.cardbookLog.updateStatusProgressInformationWithDebug1(aPrefName + " : debug mode : cardbookRepository.cardbookServerDeletedCatResponse : ", cardbookRepository.cardbookServerDeletedCatResponse[aPrefId]);
			cardbookRepository.cardbookLog.updateStatusProgressInformationWithDebug1(aPrefName + " : debug mode : cardbookRepository.cardbookServerDeletedCardResponse : ", cardbookRepository.cardbookServerDeletedCardResponse[aPrefId]);
			cardbookRepository.cardbookLog.updateStatusProgressInformationWithDebug1(aPrefName + " : debug mode : cardbookRepository.cardbookDirResponse : ", cardbookRepository.cardbookDirResponse[aPrefId]);
			cardbookRepository.cardbookLog.updateStatusProgressInformationWithDebug1(aPrefName + " : debug mode : cardbookRepository.cardbookFileResponse : ", cardbookRepository.cardbookFileResponse[aPrefId]);
			cardbookRepository.cardbookLog.updateStatusProgressInformationWithDebug1(aPrefName + " : debug mode : cardbookRepository.cardbookDBCardResponse : ", cardbookRepository.cardbookDBCardResponse[aPrefId]);
			cardbookRepository.cardbookLog.updateStatusProgressInformationWithDebug1(aPrefName + " : debug mode : cardbookRepository.cardbookDBCatResponse : ", cardbookRepository.cardbookDBCatResponse[aPrefId]);
			cardbookRepository.cardbookLog.updateStatusProgressInformationWithDebug1(aPrefName + " : debug mode : cardbookRepository.cardbookImageGetResponse : ", cardbookRepository.cardbookImageGetResponse[aPrefId]);
			cardbookRepository.cardbookLog.updateStatusProgressInformationWithDebug1(aPrefName + " : debug mode : cardbookRepository.cardbookServerSyncResponse : ", cardbookRepository.cardbookServerSyncResponse[aPrefId]);
			return cardbookRepository.cardbookComplexSearchResponse[aPrefId] +
					cardbookRepository.cardbookComplexSearchReloadResponse[aPrefId] +
					cardbookRepository.cardbookAccessTokenResponse[aPrefId] +
					cardbookRepository.cardbookRefreshTokenResponse[aPrefId] +
					cardbookRepository.cardbookServerDiscoveryResponse[aPrefId] +
					cardbookRepository.cardbookServerGetCardResponse[aPrefId] +
					cardbookRepository.cardbookServerGetCardForMergeResponse[aPrefId] +
					cardbookRepository.cardbookServerMultiGetResponse[aPrefId] +
					cardbookRepository.cardbookServerUpdatedCatResponse[aPrefId] +
					cardbookRepository.cardbookServerUpdatedCardResponse[aPrefId] +
					cardbookRepository.cardbookServerCreatedCatResponse[aPrefId] +
					cardbookRepository.cardbookServerCreatedCardResponse[aPrefId] +
					cardbookRepository.cardbookServerDeletedCatResponse[aPrefId] +
					cardbookRepository.cardbookServerDeletedCardResponse[aPrefId] +
					cardbookRepository.cardbookDirResponse[aPrefId] +
					cardbookRepository.cardbookFileResponse[aPrefId] +
					cardbookRepository.cardbookDBCardResponse[aPrefId] +
					cardbookRepository.cardbookDBCatResponse[aPrefId] +
					cardbookRepository.cardbookImageGetResponse[aPrefId] +
					cardbookRepository.cardbookServerSyncResponse[aPrefId];
		} else {
			cardbookRepository.cardbookLog.updateStatusProgressInformationWithDebug1("Total : debug mode : cardbookRepository.cardbookComplexSearchResponse : ", cardbookRepository.cardbookUtils.sumElements(cardbookRepository.cardbookComplexSearchResponse));
			cardbookRepository.cardbookLog.updateStatusProgressInformationWithDebug1("Total : debug mode : cardbookRepository.cardbookComplexSearchReloadResponse : ", cardbookRepository.cardbookUtils.sumElements(cardbookRepository.cardbookComplexSearchReloadResponse));
			cardbookRepository.cardbookLog.updateStatusProgressInformationWithDebug1("Total : debug mode : cardbookRepository.cardbookAccessTokenResponse : ", cardbookRepository.cardbookUtils.sumElements(cardbookRepository.cardbookAccessTokenResponse));
			cardbookRepository.cardbookLog.updateStatusProgressInformationWithDebug1("Total : debug mode : cardbookRepository.cardbookRefreshTokenResponse : ", cardbookRepository.cardbookUtils.sumElements(cardbookRepository.cardbookRefreshTokenResponse));
			cardbookRepository.cardbookLog.updateStatusProgressInformationWithDebug1("Total : debug mode : cardbookRepository.cardbookServerDiscoveryResponse : ", cardbookRepository.cardbookUtils.sumElements(cardbookRepository.cardbookServerDiscoveryResponse));
			cardbookRepository.cardbookLog.updateStatusProgressInformationWithDebug1("Total : debug mode : cardbookRepository.cardbookServerGetCardResponse : ", cardbookRepository.cardbookUtils.sumElements(cardbookRepository.cardbookServerGetCardResponse));
			cardbookRepository.cardbookLog.updateStatusProgressInformationWithDebug1("Total : debug mode : cardbookRepository.cardbookServerGetCardForMergeResponse : ", cardbookRepository.cardbookUtils.sumElements(cardbookRepository.cardbookServerGetCardForMergeResponse));
			cardbookRepository.cardbookLog.updateStatusProgressInformationWithDebug1("Total : debug mode : cardbookRepository.cardbookServerMultiGetResponse : ", cardbookRepository.cardbookUtils.sumElements(cardbookRepository.cardbookServerMultiGetResponse));
			cardbookRepository.cardbookLog.updateStatusProgressInformationWithDebug1("Total : debug mode : cardbookRepository.cardbookServerUpdatedCatResponse : ", cardbookRepository.cardbookUtils.sumElements(cardbookRepository.cardbookServerUpdatedCatResponse));
			cardbookRepository.cardbookLog.updateStatusProgressInformationWithDebug1("Total : debug mode : cardbookRepository.cardbookServerUpdatedCardResponse : ", cardbookRepository.cardbookUtils.sumElements(cardbookRepository.cardbookServerUpdatedCardResponse));
			cardbookRepository.cardbookLog.updateStatusProgressInformationWithDebug1("Total : debug mode : cardbookRepository.cardbookServerCreatedCatResponse : ", cardbookRepository.cardbookUtils.sumElements(cardbookRepository.cardbookServerCreatedCatResponse));
			cardbookRepository.cardbookLog.updateStatusProgressInformationWithDebug1("Total : debug mode : cardbookRepository.cardbookServerCreatedCardResponse : ", cardbookRepository.cardbookUtils.sumElements(cardbookRepository.cardbookServerCreatedCardResponse));
			cardbookRepository.cardbookLog.updateStatusProgressInformationWithDebug1("Total : debug mode : cardbookRepository.cardbookServerDeletedCatResponse : ", cardbookRepository.cardbookUtils.sumElements(cardbookRepository.cardbookServerDeletedCatResponse));
			cardbookRepository.cardbookLog.updateStatusProgressInformationWithDebug1("Total : debug mode : cardbookRepository.cardbookServerDeletedCardResponse : ", cardbookRepository.cardbookUtils.sumElements(cardbookRepository.cardbookServerDeletedCardResponse));
			cardbookRepository.cardbookLog.updateStatusProgressInformationWithDebug1("Total : debug mode : cardbookRepository.cardbookDirResponse : ", cardbookRepository.cardbookUtils.sumElements(cardbookRepository.cardbookDirResponse));
			cardbookRepository.cardbookLog.updateStatusProgressInformationWithDebug1("Total : debug mode : cardbookRepository.cardbookFileResponse : ", cardbookRepository.cardbookUtils.sumElements(cardbookRepository.cardbookFileResponse));
			cardbookRepository.cardbookLog.updateStatusProgressInformationWithDebug1("Total : debug mode : cardbookRepository.cardbookDBCardResponse : ", cardbookRepository.cardbookUtils.sumElements(cardbookRepository.cardbookDBCardResponse));
			cardbookRepository.cardbookLog.updateStatusProgressInformationWithDebug1("Total : debug mode : cardbookRepository.cardbookDBCatResponse : ", cardbookRepository.cardbookUtils.sumElements(cardbookRepository.cardbookDBCatResponse));
			cardbookRepository.cardbookLog.updateStatusProgressInformationWithDebug1("Total : debug mode : cardbookRepository.cardbookImageGetResponse : ", cardbookRepository.cardbookUtils.sumElements(cardbookRepository.cardbookImageGetResponse));
			cardbookRepository.cardbookLog.updateStatusProgressInformationWithDebug1("Total : debug mode : cardbookRepository.cardbookServerSyncResponse : ", cardbookRepository.cardbookUtils.sumElements(cardbookRepository.cardbookServerSyncResponse));
			return cardbookRepository.cardbookUtils.sumElements(cardbookRepository.cardbookComplexSearchResponse) +
					cardbookRepository.cardbookUtils.sumElements(cardbookRepository.cardbookComplexSearchReloadResponse) +
					cardbookRepository.cardbookUtils.sumElements(cardbookRepository.cardbookAccessTokenResponse) +
					cardbookRepository.cardbookUtils.sumElements(cardbookRepository.cardbookRefreshTokenResponse) +
					cardbookRepository.cardbookUtils.sumElements(cardbookRepository.cardbookServerDiscoveryResponse) +
					cardbookRepository.cardbookUtils.sumElements(cardbookRepository.cardbookServerGetCardResponse) +
					cardbookRepository.cardbookUtils.sumElements(cardbookRepository.cardbookServerGetCardForMergeResponse) +
					cardbookRepository.cardbookUtils.sumElements(cardbookRepository.cardbookServerMultiGetResponse) +
					cardbookRepository.cardbookUtils.sumElements(cardbookRepository.cardbookServerUpdatedCatResponse) +
					cardbookRepository.cardbookUtils.sumElements(cardbookRepository.cardbookServerUpdatedCardResponse) +
					cardbookRepository.cardbookUtils.sumElements(cardbookRepository.cardbookServerCreatedCatResponse) +
					cardbookRepository.cardbookUtils.sumElements(cardbookRepository.cardbookServerCreatedCardResponse) +
					cardbookRepository.cardbookUtils.sumElements(cardbookRepository.cardbookServerDeletedCatResponse) +
					cardbookRepository.cardbookUtils.sumElements(cardbookRepository.cardbookServerDeletedCardResponse) +
					cardbookRepository.cardbookUtils.sumElements(cardbookRepository.cardbookDirResponse) +
					cardbookRepository.cardbookUtils.sumElements(cardbookRepository.cardbookFileResponse) +
					cardbookRepository.cardbookUtils.sumElements(cardbookRepository.cardbookDBCardResponse) +
					cardbookRepository.cardbookUtils.sumElements(cardbookRepository.cardbookDBCatResponse) +
					cardbookRepository.cardbookUtils.sumElements(cardbookRepository.cardbookImageGetResponse) +
					cardbookRepository.cardbookUtils.sumElements(cardbookRepository.cardbookServerSyncResponse);
		}
	},
	
	getDone: function(aPrefId, aPrefName) {
		if (aPrefId) {
			cardbookRepository.cardbookLog.updateStatusProgressInformationWithDebug1(aPrefName + " : debug mode : cardbookRepository.cardbookServerCatSyncDone : ", cardbookRepository.cardbookServerCatSyncDone[aPrefId]);
			cardbookRepository.cardbookLog.updateStatusProgressInformationWithDebug1(aPrefName + " : debug mode : cardbookRepository.cardbookServerSyncCompareCatWithCacheDone : ", cardbookRepository.cardbookServerSyncCompareCatWithCacheDone[aPrefId]);
			cardbookRepository.cardbookLog.updateStatusProgressInformationWithDebug1(aPrefName + " : debug mode : cardbookRepository.cardbookServerSyncHandleRemainingCatDone : ", cardbookRepository.cardbookServerSyncHandleRemainingCatDone[aPrefId]);
			cardbookRepository.cardbookLog.updateStatusProgressInformationWithDebug1(aPrefName + " : debug mode : cardbookRepository.cardbookServerCardSyncDone : ", cardbookRepository.cardbookServerCardSyncDone[aPrefId]);
			cardbookRepository.cardbookLog.updateStatusProgressInformationWithDebug1(aPrefName + " : debug mode : cardbookRepository.cardbookServerSyncCompareCardWithCacheDone : ", cardbookRepository.cardbookServerSyncCompareCardWithCacheDone[aPrefId]);
			cardbookRepository.cardbookLog.updateStatusProgressInformationWithDebug1(aPrefName + " : debug mode : cardbookRepository.cardbookServerSyncHandleRemainingCardDone : ", cardbookRepository.cardbookServerSyncHandleRemainingCardDone[aPrefId]);
			return cardbookRepository.cardbookServerCatSyncDone[aPrefId] + cardbookRepository.cardbookServerCardSyncDone[aPrefId];
		} else {
			cardbookRepository.cardbookLog.updateStatusProgressInformationWithDebug1("Total : debug mode : cardbookRepository.cardbookServerCatSyncDone : ", cardbookRepository.cardbookUtils.sumElements(cardbookRepository.cardbookServerCatSyncDone));
			cardbookRepository.cardbookLog.updateStatusProgressInformationWithDebug1("Total : debug mode : cardbookRepository.cardbookServerSyncCompareCatWithCacheDone : ", cardbookRepository.cardbookUtils.sumElements(cardbookRepository.cardbookServerSyncCompareCatWithCacheDone));
			cardbookRepository.cardbookLog.updateStatusProgressInformationWithDebug1("Total : debug mode : cardbookRepository.cardbookServerSyncHandleRemainingCatDone : ", cardbookRepository.cardbookUtils.sumElements(cardbookRepository.cardbookServerSyncHandleRemainingCatDone));
			cardbookRepository.cardbookLog.updateStatusProgressInformationWithDebug1("Total : debug mode : cardbookRepository.cardbookServerCardSyncDone : ", cardbookRepository.cardbookUtils.sumElements(cardbookRepository.cardbookServerCardSyncDone));
			cardbookRepository.cardbookLog.updateStatusProgressInformationWithDebug1("Total : debug mode : cardbookRepository.cardbookServerSyncCompareCardWithCacheDone : ", cardbookRepository.cardbookUtils.sumElements(cardbookRepository.cardbookServerSyncCompareCardWithCacheDone));
			cardbookRepository.cardbookLog.updateStatusProgressInformationWithDebug1("Total : debug mode : cardbookRepository.cardbookServerSyncHandleRemainingCardDone : ", cardbookRepository.cardbookUtils.sumElements(cardbookRepository.cardbookServerSyncHandleRemainingCardDone));
			return cardbookRepository.cardbookUtils.sumElements(cardbookRepository.cardbookServerCatSyncDone) + cardbookRepository.cardbookUtils.sumElements(cardbookRepository.cardbookServerCardSyncDone);
		}
	},
	
	getTotal: function(aPrefId, aPrefName) {
		if (aPrefId) {
			cardbookRepository.cardbookLog.updateStatusProgressInformationWithDebug1(aPrefName + " : debug mode : cardbookRepository.cardbookServerCatSyncTotal : ", cardbookRepository.cardbookServerCatSyncTotal[aPrefId]);
			cardbookRepository.cardbookLog.updateStatusProgressInformationWithDebug1(aPrefName + " : debug mode : cardbookRepository.cardbookServerSyncCompareCatWithCacheTotal : ", cardbookRepository.cardbookServerSyncCompareCatWithCacheTotal[aPrefId]);
			cardbookRepository.cardbookLog.updateStatusProgressInformationWithDebug1(aPrefName + " : debug mode : cardbookRepository.cardbookServerSyncHandleRemainingCatTotal : ", cardbookRepository.cardbookServerSyncHandleRemainingCatTotal[aPrefId]);
			cardbookRepository.cardbookLog.updateStatusProgressInformationWithDebug1(aPrefName + " : debug mode : cardbookRepository.cardbookServerCardSyncTotal : ", cardbookRepository.cardbookServerCardSyncTotal[aPrefId]);
			cardbookRepository.cardbookLog.updateStatusProgressInformationWithDebug1(aPrefName + " : debug mode : cardbookRepository.cardbookServerSyncCompareCardWithCacheTotal : ", cardbookRepository.cardbookServerSyncCompareCardWithCacheTotal[aPrefId]);
			cardbookRepository.cardbookLog.updateStatusProgressInformationWithDebug1(aPrefName + " : debug mode : cardbookRepository.cardbookServerSyncHandleRemainingCardTotal : ", cardbookRepository.cardbookServerSyncHandleRemainingCardTotal[aPrefId]);
			return cardbookRepository.cardbookServerCatSyncTotal[aPrefId] + cardbookRepository.cardbookServerCardSyncTotal[aPrefId];
		} else {
			cardbookRepository.cardbookLog.updateStatusProgressInformationWithDebug1("Total : debug mode : cardbookRepository.cardbookServerCatSyncTotal : ", cardbookRepository.cardbookUtils.sumElements(cardbookRepository.cardbookServerCatSyncTotal));
			cardbookRepository.cardbookLog.updateStatusProgressInformationWithDebug1("Total : debug mode : cardbookRepository.cardbookServerSyncCompareCatWithCacheTotal : ", cardbookRepository.cardbookUtils.sumElements(cardbookRepository.cardbookServerSyncCompareCatWithCacheTotal));
			cardbookRepository.cardbookLog.updateStatusProgressInformationWithDebug1("Total : debug mode : cardbookRepository.cardbookServerSyncHandleRemainingCatTotal : ", cardbookRepository.cardbookUtils.sumElements(cardbookRepository.cardbookServerSyncHandleRemainingCatTotal));
			cardbookRepository.cardbookLog.updateStatusProgressInformationWithDebug1("Total : debug mode : cardbookRepository.cardbookServerCardSyncTotal : ", cardbookRepository.cardbookUtils.sumElements(cardbookRepository.cardbookServerCardSyncTotal));
			cardbookRepository.cardbookLog.updateStatusProgressInformationWithDebug1("Total : debug mode : cardbookRepository.cardbookServerSyncCompareCardWithCacheTotal : ", cardbookRepository.cardbookUtils.sumElements(cardbookRepository.cardbookServerSyncCompareCardWithCacheTotal));
			cardbookRepository.cardbookLog.updateStatusProgressInformationWithDebug1("Total : debug mode : cardbookRepository.cardbookServerSyncHandleRemainingCardTotal : ", cardbookRepository.cardbookUtils.sumElements(cardbookRepository.cardbookServerSyncHandleRemainingCardTotal));
			return cardbookRepository.cardbookUtils.sumElements(cardbookRepository.cardbookServerCatSyncTotal) + cardbookRepository.cardbookUtils.sumElements(cardbookRepository.cardbookServerCardSyncTotal);
		}
	},

	getModifsPushed: function(aPrefId) {
		return cardbookRepository.cardbookServerUpdatedCardRequest[aPrefId] +
				cardbookRepository.cardbookServerCreatedCardRequest[aPrefId] +
				cardbookRepository.cardbookServerDeletedCardRequest[aPrefId];
	},
	
	finishOpenFile: function(aPrefId, aPrefName) {
		var errorNum = cardbookRepository.cardbookServerUpdatedCardError[aPrefId] + cardbookRepository.cardbookServerCreatedCardError[aPrefId];
		if (errorNum === 0) {
			cardbookRepository.cardbookUtils.formatStringForOutput("allContactsLoadedFromFile", [aPrefName]);
		} else {
			cardbookRepository.cardbookUtils.formatStringForOutput("notAllContactsLoadedFromFile", [aPrefName, errorNum]);
		}
	},
	
	finishSync: function(aPrefId, aPrefName, aPrefType) {
		cardbookRepository.cardbookUtils.notifyObservers("syncFisnished", aPrefId);
		if (cardbookRepository.cardbookUtils.isMyAccountRemote(aPrefType)) {
			if (cardbookRepository.cardbookServerSyncRequest[aPrefId] == 0) {
				cardbookRepository.cardbookUtils.formatStringForOutput("synchroNotTried", [aPrefName]);
				cardbookActions.finishSyncActivity(aPrefId);
			} else {
				var errorNum = cardbookRepository.cardbookAccessTokenError[aPrefId] + cardbookRepository.cardbookRefreshTokenError[aPrefId] + cardbookRepository.cardbookServerDiscoveryError[aPrefId] + cardbookRepository.cardbookServerCardSyncError[aPrefId];
				if (errorNum === 0) {
					cardbookActions.finishSyncActivityOK(aPrefId, aPrefName);
					cardbookRepository.cardbookUtils.formatStringForOutput("synchroFinishedResult", [aPrefName]);
					if (aPrefType == "GOOGLE") {
						cardbookRepository.cardbookUtils.formatStringForOutput("synchroCategoriesUpToDate", [aPrefName, cardbookRepository.cardbookServerSyncNotUpdatedCat[aPrefId]]);
						cardbookRepository.cardbookUtils.formatStringForOutput("synchroCategoriesNewOnServer", [aPrefName, cardbookRepository.cardbookServerSyncNewCatOnServer[aPrefId]]);
						cardbookRepository.cardbookUtils.formatStringForOutput("synchroCategoriesUpdatedOnServer", [aPrefName, cardbookRepository.cardbookServerSyncUpdatedCatOnServer[aPrefId]]);
						cardbookRepository.cardbookUtils.formatStringForOutput("synchroCategoriesDeletedOnServer", [aPrefName, cardbookRepository.cardbookServerSyncDeletedCatOnServer[aPrefId]]);
						cardbookRepository.cardbookUtils.formatStringForOutput("synchroCategoriesDeletedOnDisk", [aPrefName, cardbookRepository.cardbookServerSyncDeletedCatOnDisk[aPrefId]]);
						cardbookRepository.cardbookUtils.formatStringForOutput("synchroCategoriesDeletedOnDiskUpdatedOnServer", [aPrefName, cardbookRepository.cardbookServerSyncDeletedCatOnDiskUpdatedCatOnServer[aPrefId]]);
						cardbookRepository.cardbookUtils.formatStringForOutput("synchroCategoriesNewOnDisk", [aPrefName, cardbookRepository.cardbookServerSyncNewCatOnDisk[aPrefId]]);
						cardbookRepository.cardbookUtils.formatStringForOutput("synchroCategoriesUpdatedOnDisk", [aPrefName, cardbookRepository.cardbookServerSyncUpdatedCatOnDisk[aPrefId]]);
						cardbookRepository.cardbookUtils.formatStringForOutput("synchroCategoriesUpdatedOnBoth", [aPrefName, cardbookRepository.cardbookServerSyncUpdatedCatOnBoth[aPrefId]]);
						cardbookRepository.cardbookUtils.formatStringForOutput("synchroCategoriesUpdatedOnDiskDeletedOnServer", [aPrefName, cardbookRepository.cardbookServerSyncUpdatedCatOnDiskDeletedCatOnServer[aPrefId]]);
					}
					cardbookRepository.cardbookUtils.formatStringForOutput("synchroCardsUpToDate", [aPrefName, cardbookRepository.cardbookServerSyncNotUpdatedCard[aPrefId]]);
					cardbookRepository.cardbookUtils.formatStringForOutput("synchroCardsNewOnServer", [aPrefName, cardbookRepository.cardbookServerSyncNewCardOnServer[aPrefId]]);
					cardbookRepository.cardbookUtils.formatStringForOutput("synchroCardsUpdatedOnServer", [aPrefName, cardbookRepository.cardbookServerSyncUpdatedCardOnServer[aPrefId]]);
					cardbookRepository.cardbookUtils.formatStringForOutput("synchroCardsDeletedOnServer", [aPrefName, cardbookRepository.cardbookServerSyncDeletedCardOnServer[aPrefId]]);
					cardbookRepository.cardbookUtils.formatStringForOutput("synchroCardsDeletedOnDisk", [aPrefName, cardbookRepository.cardbookServerSyncDeletedCardOnDisk[aPrefId]]);
					cardbookRepository.cardbookUtils.formatStringForOutput("synchroCardsDeletedOnDiskUpdatedOnServer", [aPrefName, cardbookRepository.cardbookServerSyncDeletedCardOnDiskUpdatedCardOnServer[aPrefId]]);
					cardbookRepository.cardbookUtils.formatStringForOutput("synchroCardsNewOnDisk", [aPrefName, cardbookRepository.cardbookServerSyncNewCardOnDisk[aPrefId]]);
					cardbookRepository.cardbookUtils.formatStringForOutput("synchroCardsUpdatedOnDisk", [aPrefName, cardbookRepository.cardbookServerSyncUpdatedCardOnDisk[aPrefId]]);
					cardbookRepository.cardbookUtils.formatStringForOutput("synchroCardsUpdatedOnBoth", [aPrefName, cardbookRepository.cardbookServerSyncUpdatedCardOnBoth[aPrefId]]);
					cardbookRepository.cardbookUtils.formatStringForOutput("synchroCardsUpdatedOnDiskDeletedOnServer", [aPrefName, cardbookRepository.cardbookServerSyncUpdatedCardOnDiskDeletedCardOnServer[aPrefId]]);
					cardbookRepository.cardbookUtils.formatStringForOutput("synchroModifGetOKFromServer", [aPrefName, cardbookRepository.cardbookServerGetCardResponse[aPrefId] - cardbookRepository.cardbookServerGetCardError[aPrefId]]);
					cardbookRepository.cardbookUtils.formatStringForOutput("synchroModifGetKOFromServer", [aPrefName, cardbookRepository.cardbookServerGetCardError[aPrefId]]);
					var error = cardbookRepository.cardbookServerCreatedCatError[aPrefId] + cardbookRepository.cardbookServerUpdatedCatError[aPrefId] + cardbookRepository.cardbookServerDeletedCatError[aPrefId] +
								cardbookRepository.cardbookServerCreatedCardError[aPrefId] + cardbookRepository.cardbookServerUpdatedCardError[aPrefId] + cardbookRepository.cardbookServerDeletedCardError[aPrefId];
					var success = cardbookRepository.cardbookServerCreatedCatResponse[aPrefId] + cardbookRepository.cardbookServerUpdatedCatResponse[aPrefId] + cardbookRepository.cardbookServerDeletedCatResponse[aPrefId] +
								cardbookRepository.cardbookServerCreatedCardResponse[aPrefId] + cardbookRepository.cardbookServerUpdatedCardResponse[aPrefId] + cardbookRepository.cardbookServerDeletedCardResponse[aPrefId] - error - cardbookRepository.cardbookServerNotPushed[aPrefId];
					cardbookRepository.cardbookUtils.formatStringForOutput("synchroModifPutOKToServer", [aPrefName, success]);
					cardbookRepository.cardbookUtils.formatStringForOutput("synchroModifPutKOToServer", [aPrefName, error]);
					cardbookRepository.cardbookUtils.formatStringForOutput("imageGetResponse", [aPrefName, cardbookRepository.cardbookImageGetResponse[aPrefId]]);
					cardbookRepository.cardbookUtils.formatStringForOutput("imageGetError", [aPrefName, cardbookRepository.cardbookImageGetError[aPrefId]]);
				} else {
					cardbookActions.finishSyncActivity(aPrefId);
					cardbookRepository.cardbookUtils.formatStringForOutput("synchroImpossible", [aPrefName]);
				}
			}
		} else if (aPrefType === "FILE") {
			cardbookRepository.cardbookUtils.formatStringForOutput("synchroFileFinishedResult", [aPrefName]);
			cardbookRepository.cardbookUtils.formatStringForOutput("synchroFileCardsOK", [aPrefName, cardbookRepository.cardbookServerCardSyncDone[aPrefId]]);
			cardbookRepository.cardbookUtils.formatStringForOutput("synchroFileCardsKO", [aPrefName, cardbookRepository.cardbookServerCardSyncError[aPrefId]]);
			cardbookRepository.cardbookUtils.formatStringForOutput("imageGetResponse", [aPrefName, cardbookRepository.cardbookImageGetResponse[aPrefId]]);
			cardbookRepository.cardbookUtils.formatStringForOutput("imageGetError", [aPrefName, cardbookRepository.cardbookImageGetError[aPrefId]]);
		} else if (aPrefType === "DIRECTORY") {
			cardbookRepository.cardbookUtils.formatStringForOutput("synchroDirFinishedResult", [aPrefName]);
			cardbookRepository.cardbookUtils.formatStringForOutput("synchroDirCardsOK", [aPrefName, cardbookRepository.cardbookServerCardSyncDone[aPrefId]]);
			cardbookRepository.cardbookUtils.formatStringForOutput("synchroDirCardsKO", [aPrefName, cardbookRepository.cardbookServerCardSyncError[aPrefId]]);
		} else if (aPrefType === "LOCALDB") {
			cardbookRepository.cardbookUtils.formatStringForOutput("synchroDBFinishedResult", [aPrefName]);
			cardbookRepository.cardbookUtils.formatStringForOutput("synchroDBCardsOK", [aPrefName, cardbookRepository.cardbookServerCardSyncDone[aPrefId]]);
			cardbookRepository.cardbookUtils.formatStringForOutput("synchroDBCardsKO", [aPrefName, cardbookRepository.cardbookServerCardSyncError[aPrefId]]);
		}
	},
	
	finishImport: function(aPrefId, aPrefName) {
		cardbookRepository.cardbookUtils.formatStringForOutput("importFinishedResult", [aPrefName]);
		cardbookRepository.cardbookUtils.formatStringForOutput("importCardsOK", [aPrefName, cardbookRepository.cardbookServerCardSyncDone[aPrefId] - cardbookRepository.cardbookServerCardSyncError[aPrefId]]);
		cardbookRepository.cardbookUtils.formatStringForOutput("importCardsKO", [aPrefName, cardbookRepository.cardbookServerCardSyncError[aPrefId]]);
	},
	
	handleWrongPassword: function(aConnection, aStatus, aResponse) {
		if (aStatus == 401) {
			let type = cardbookRepository.cardbookPreferences.getType(aConnection.connPrefId);
			if (type == "GOOGLE" || type == "YAHOO") {
				return false;
			}
			cardbookRepository.cardbookUtils.formatStringForOutput("synchronizationUnauthorized", [aConnection.connDescription], "Warning");
			// first register the problem
			let myPwdGetId = aConnection.connUser + "::" + cardbookSynchronization.getRootUrl(aConnection.connUrl);
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
				let newPwd = cardbookRepository.cardbookPasswordManager.getChangedPassword(aConnection.connUser, aConnection.connPrefId);
				if (newPwd != "") {
					cardbookRepository.cardbookServerChangedPwd[myPwdGetId].pwdChanged = true;
				}
			}
			return true;
		}
		return false;
	},

	askUser: function(aType, aMessage, aButton1, aButton2, aButton3, aButton4, aConfirmMessage, aConfirmValue) {
		var myArgs = {type: aType, message: aMessage, button1: aButton1, button2: aButton2, button3: aButton3, button4: aButton4,
						confirmMessage: aConfirmMessage, confirmValue: aConfirmValue,
						result: "cancel", resultConfirm: false};
		Services.wm.getMostRecentWindow("mail:3pane").openDialog("chrome://cardbook/content/wdw_cardbookAskUser.xhtml", "", cardbookRepository.modalWindowParams, myArgs);
		return {result: myArgs.result, resultConfirm: myArgs.resultConfirm};
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
					cardbookRepository.cardbookLog.updateStatusProgressInformation("cardbookSynchronization.getFileDataAsync error : filename : " + aFilePath, "Error");
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
				cardbookRepository.cardbookLog.updateStatusProgressInformation("cardbookSynchronization.writeFileDataAsync error : filename : " + aFilePath, "Error");
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
			var myExtension = cardbookRepository.cardbookUtils.getFileNameExtension(aFileName);
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
			var myExtension =  cardbookRepository.cardbookUtils.getFileNameExtension(aFileName);
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

	serverDeleteCard: function(aConnection, aCard, aPrefIdType) {
		var listener_delete = {
			onDAVQueryComplete: function(status, response, askCertificate) {
				if (status > 199 && status < 400) {
					cardbookRepository.cardbookUtils.formatStringForOutput("serverCardDeletedFromServer", [aConnection.connDescription, aCard.fn]);
					cardbookRepository.removeCardFromRepository(aCard, true);
				} else if (status == 404) {
					cardbookRepository.cardbookUtils.formatStringForOutput("serverCardNotExistServer", [aConnection.connDescription, aCard.fn]);
					cardbookRepository.removeCardFromRepository(aCard, true);
				} else {
					cardbookRepository.cardbookServerDeletedCardError[aConnection.connPrefId]++;
					cardbookRepository.cardbookUtils.formatStringForOutput("serverCardDeleteFailed", [aConnection.connDescription, aCard.fn, aConnection.connUrl, status], "Error");
				}
				cardbookRepository.cardbookServerCardSyncDone[aConnection.connPrefId]++;
				cardbookRepository.cardbookServerDeletedCardResponse[aConnection.connPrefId]++;
			}
		};
		if (cardbookSynchronization.getModifsPushed(aConnection.connPrefId) <= cardbookRepository.cardbookPreferences.getMaxModifsPushed()) {
			var request = new cardbookWebDAV(aConnection, listener_delete, aCard.etag);
			cardbookRepository.cardbookUtils.formatStringForOutput("serverCardSendingDeletion", [aConnection.connDescription, aCard.fn]);
			request.delete(null, "text/vcard; charset=utf-8");
		} else {
			cardbookRepository.cardbookServerCardSyncDone[aConnection.connPrefId]++;
			cardbookRepository.cardbookServerDeletedCardResponse[aConnection.connPrefId]++;
			cardbookRepository.cardbookServerNotPushed[aConnection.connPrefId]++;
		}
	},

	serverUpdateCard: function(aConnection, aCard, aModifiedCard, aPrefIdType) {
		var listener_update = {
			onDAVQueryComplete: function(status, response, askCertificate, etag) {
				if (status > 199 && status < 400) {
					if (etag) {
						cardbookRepository.cardbookUtils.formatStringForOutput("serverCardUpdatedOnServerWithEtag", [aConnection.connDescription, aModifiedCard.fn, etag]);
						cardbookRepository.cardbookUtils.addEtag(aModifiedCard, etag);
					} else {
						cardbookRepository.cardbookServerSyncAgain[aConnection.connPrefId] = true;
						cardbookRepository.cardbookUtils.formatStringForOutput("serverCardUpdatedOnServerWithoutEtag", [aConnection.connDescription, aModifiedCard.fn]);
					}
					if (aPrefIdType == "GOOGLE") {
						let connection = {connUser: aConnection.connUser, connPrefId: aConnection.connPrefId, connUrl: cardbookRepository.cardbookOAuthData.GOOGLE.REFRESH_REQUEST_URL, connDescription: aConnection.connDescription};
						let params = {aNewCard: aModifiedCard, aActionType: "PUT"};
						cardbookRepository.cardbookServerSyncRequest[aConnection.connPrefId]++;
						// let some time for processing the update before requerying
						if ("undefined" == typeof(setTimeout)) {
							var { setTimeout } = ChromeUtils.import("resource://gre/modules/Timer.jsm");
						}
						setTimeout(function() {
								cardbookSynchronizationGoogle.getNewAccessTokenForGoogleClassic(connection, params, cardbookRepository.cardbookSynchronizationGoogle.serverGetCardLabels);
						}, 2000);
					} else {
						cardbookRepository.cardbookServerCardSyncDone[aConnection.connPrefId]++;
						// if aCard and aCard have the same cached medias
						cardbookRepository.cardbookUtils.changeMediaFromFileToContent(aModifiedCard);
						cardbookRepository.removeCardFromRepository(aCard, true);
						cardbookRepository.cardbookUtils.setCacheURIFromValue(aModifiedCard, cardbookRepository.cardbookUtils.getFileNameFromUrl(aConnection.connUrl))
						cardbookRepository.addCardToRepository(aModifiedCard, true);
					}
				} else {
					cardbookRepository.cardbookUtils.addTagUpdated(aModifiedCard);
					cardbookRepository.cardbookServerCardSyncDone[aConnection.connPrefId]++;
					cardbookRepository.cardbookServerUpdatedCardError[aConnection.connPrefId]++;
					cardbookRepository.cardbookUtils.formatStringForOutput("serverCardUpdateFailed", [aConnection.connDescription, aModifiedCard.fn, aConnection.connUrl, status], "Error");
				}
				cardbookRepository.cardbookServerUpdatedCardResponse[aConnection.connPrefId]++;
			}
		};
		if (cardbookSynchronization.getModifsPushed(aConnection.connPrefId) <= cardbookRepository.cardbookPreferences.getMaxModifsPushed()) {
			cardbookRepository.cardbookUtils.nullifyTagModification(aModifiedCard);
			var request = new cardbookWebDAV(aConnection, listener_update, aModifiedCard.etag);
			var cardContent = cardbookRepository.cardbookUtils.getvCardForServer(aModifiedCard, true);
			cardbookRepository.cardbookUtils.formatStringForOutput("serverCardSendingUpdate", [aConnection.connDescription, aModifiedCard.fn]);
			request.put(cardContent, "text/vcard; charset=utf-8");
		} else {
			cardbookRepository.cardbookServerCardSyncDone[aConnection.connPrefId]++;
			cardbookRepository.cardbookServerUpdatedCardResponse[aConnection.connPrefId]++;
			cardbookRepository.cardbookServerNotPushed[aConnection.connPrefId]++;
		}
	},

	serverCreateCard: function(aConnection, aCard, aPrefIdType) {
		var listener_create = {
			onDAVQueryComplete: function(status, response, askCertificate, etag) {
				if (status > 199 && status < 400) {
					if (cardbookRepository.cardbookCards[aCard.dirPrefId+"::"+aCard.uid]) {
						// if aCard and aCard have the same cached medias
						cardbookRepository.cardbookUtils.changeMediaFromFileToContent(aCard);
						var myOldCard = cardbookRepository.cardbookCards[aCard.dirPrefId+"::"+aCard.uid];
						cardbookRepository.removeCardFromRepository(myOldCard, true);
					}
					if (etag) {
						cardbookRepository.cardbookUtils.formatStringForOutput("serverCardCreatedOnServerWithEtag", [aConnection.connDescription, aCard.fn, etag]);
						cardbookRepository.cardbookUtils.addEtag(aCard, etag);
					} else {
						cardbookRepository.cardbookServerSyncAgain[aConnection.connPrefId] = true;
						cardbookRepository.cardbookUtils.formatStringForOutput("serverCardCreatedOnServerWithoutEtag", [aConnection.connDescription, aCard.fn]);
					}
					if (aPrefIdType == "GOOGLE") {
						cardbookRepository.cardbookServerSyncAgain[aConnection.connPrefId] = true;
					}
					cardbookRepository.cardbookUtils.nullifyTagModification(aCard);
					cardbookRepository.cardbookUtils.setCacheURIFromValue(aCard, cardbookRepository.cardbookUtils.getFileNameFromUrl(aConnection.connUrl))
					cardbookRepository.addCardToRepository(aCard, true);
				} else {
					cardbookRepository.cardbookServerCreatedCardError[aConnection.connPrefId]++;
					cardbookRepository.cardbookUtils.formatStringForOutput("serverCardCreateFailed", [aConnection.connDescription, aCard.fn, aConnection.connUrl, status], "Error");
				}
				cardbookRepository.cardbookServerCreatedCardResponse[aConnection.connPrefId]++;
				cardbookRepository.cardbookServerCardSyncDone[aConnection.connPrefId]++;
			}
		};
		if (cardbookSynchronization.getModifsPushed(aConnection.connPrefId) <= cardbookRepository.cardbookPreferences.getMaxModifsPushed()) {
			cardbookRepository.cardbookUtils.prepareCardForCreation(aCard, aPrefIdType, aConnection.connUrl);
			aConnection.connUrl = aCard.cardurl;
			var request = new cardbookWebDAV(aConnection, listener_create, aCard.etag);
			var cardContent = cardbookRepository.cardbookUtils.getvCardForServer(aCard, true);
			cardbookRepository.cardbookUtils.formatStringForOutput("serverCardSendingCreate", [aConnection.connDescription, aCard.fn]);
			request.put(cardContent, "text/vcard; charset=utf-8");
		} else {
			cardbookRepository.cardbookServerCardSyncDone[aConnection.connPrefId]++;
			cardbookRepository.cardbookServerCreatedCardResponse[aConnection.connPrefId]++;
			cardbookRepository.cardbookServerNotPushed[aConnection.connPrefId]++;
		}
	},

	serverGetForMerge: function(aConnection, aEtag, aCacheCard, aPrefIdType) {
		var listener_get = {
			onDAVQueryComplete: function(status, response, askCertificate, etag) {
				if (status > 199 && status < 400) {
					try {
						var myCard = new cardbookCardParser(response, aConnection.connUrl, etag, aConnection.connPrefId);
						var photoTmpFile = cardbookRepository.cardbookUtils.getTempFile("CardBookPhotoTemp." + myCard.photo.extension);
						cardbookRepository.cardbookUtils.writeContentToFile(photoTmpFile.path, myCard.photo.value, "NOUTF8");
						myCard.photo.value = "";
						myCard.photo.URI = "";
						myCard.photo.localURI = "file:///" + photoTmpFile.path;
					}
					catch (e) {
						cardbookRepository.cardbookServerCardSyncDone[aConnection.connPrefId]++;
						cardbookRepository.cardbookServerGetCardForMergeResponse[aConnection.connPrefId]++;
						cardbookRepository.cardbookServerGetCardForMergeError[aConnection.connPrefId]++;
						if (e.message == "") {
							cardbookRepository.cardbookUtils.formatStringForOutput("parsingCardError", [aConnection.connDescription, cardbookRepository.extension.localeData.localizeMessage(e.code), response], "Error");
						} else {
							cardbookRepository.cardbookUtils.formatStringForOutput("parsingCardError", [aConnection.connDescription, e.message, response], "Error");
						}
						return;
					}
					cardbookRepository.cardbookUtils.formatStringForOutput("serverCardGetOK", [aConnection.connDescription, myCard.fn]);
					var myArgs = {cardsIn: [myCard, aCacheCard], cardsOut: [], hideCreate: true, action: ""};
					var myWindow = Services.wm.getMostRecentWindow("mail:3pane").openDialog("chrome://cardbook/content/mergeCards/wdw_mergeCards.xhtml", "", cardbookRepository.modalWindowParams, myArgs);
					if (myArgs.action == "CREATEANDREPLACE") {
						myArgs.cardsOut[0].uid = aCacheCard.uid;
						cardbookRepository.cardbookUtils.addEtag(myArgs.cardsOut[0], aEtag);
						cardbookRepository.cardbookUtils.setCalculatedFields(myArgs.cardsOut[0]);
						cardbookRepository.cardbookServerUpdatedCardRequest[aConnection.connPrefId]++;
						cardbookRepository.cardbookServerGetCardForMergeResponse[aConnection.connPrefId]++;
						cardbookSynchronization.serverUpdateCard(aConnection, aCacheCard, myArgs.cardsOut[0], aPrefIdType);
					} else {
						cardbookRepository.cardbookServerCardSyncDone[aConnection.connPrefId]++;
						cardbookRepository.cardbookServerGetCardForMergeResponse[aConnection.connPrefId]++;
					}
				} else {
					cardbookRepository.cardbookServerGetCardForMergeError[aConnection.connPrefId]++;
					cardbookRepository.cardbookServerGetCardForMergeResponse[aConnection.connPrefId]++;
					cardbookRepository.cardbookServerCardSyncDone[aConnection.connPrefId]++;
					cardbookRepository.cardbookUtils.formatStringForOutput("serverCardGetFailed", [aConnection.connDescription, aConnection.connUrl, status], "Error");
				}
			}
		};
		let request = new cardbookWebDAV(aConnection, listener_get);
		request.get("text/vcard");
	},

	serverMultiGet: function(aConnection, aPrefIdType) {
		var listener_multiget = {
			onDAVQueryComplete: function(status, responseJSON, askCertificate, etagDummy, length) {
				if (responseJSON && responseJSON["parsererror"] && responseJSON["parsererror"][0]["sourcetext"] && responseJSON["parsererror"][0]["sourcetext"][0]) {
					cardbookRepository.cardbookUtils.formatStringForOutput("unableToParseResponse", [aConnection.connDescription, responseJSON["parsererror"][0]["sourcetext"][0]], "Error");
					cardbookRepository.cardbookServerCardSyncDone[aConnection.connPrefId] = cardbookRepository.cardbookServerCardSyncDone[aConnection.connPrefId] + length;
					cardbookRepository.cardbookServerMultiGetError[aConnection.connPrefId]++;
				} else if (responseJSON && responseJSON["multistatus"] && (status > 199 && status < 400)) {
					try {
						let jsonResponses = responseJSON["multistatus"][0]["response"];
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
									cardbookRepository.cardbookServerGetCardRequest[aConnection.connPrefId]++;
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
												cardbookRepository.cardbookServerCardSyncDone[aConnection.connPrefId]++;
												cardbookRepository.cardbookServerGetCardResponse[aConnection.connPrefId]++;
												cardbookRepository.cardbookServerGetCardError[aConnection.connPrefId]++;
												if (e.message == "") {
													cardbookRepository.cardbookUtils.formatStringForOutput("parsingCardError", [aConnection.connDescription, cardbookRepository.extension.localeData.localizeMessage(e.code), myContent], "Error");
												} else {
													cardbookRepository.cardbookUtils.formatStringForOutput("parsingCardError", [aConnection.connDescription, e.message, myContent], "Error");
												}
												continue;
											}
											if (aPrefIdType == "GOOGLE") {
												let whyGet = "NEWONSERVER";
												if (cardbookRepository.cardbookCards[myCard.dirPrefId+"::"+myCard.uid]) {
													whyGet = "UPDATEDONSERVER";
												}
												let connection = {connUser: aConnection.connUser, connPrefId: aConnection.connPrefId, connUrl: cardbookRepository.cardbookOAuthData.GOOGLE.REFRESH_REQUEST_URL, connDescription: aConnection.connDescription};
												let params = {aNewCard: myCard, aActionType: "GET", aWhyGet: whyGet};
												cardbookRepository.cardbookServerSyncRequest[aConnection.connPrefId]++;
												cardbookSynchronizationGoogle.getNewAccessTokenForGoogleClassic(connection, params, cardbookRepository.cardbookSynchronizationGoogle.serverGetCardLabels);
											} else {
												if (cardbookRepository.cardbookCards[myCard.dirPrefId+"::"+myCard.uid]) {
													let myOldCard = cardbookRepository.cardbookCards[myCard.dirPrefId+"::"+myCard.uid];
													cardbookRepository.removeCardFromRepository(myOldCard, true);
												}
												cardbookRepository.cardbookUtils.setCacheURIFromValue(myCard, cardbookRepository.cardbookUtils.getFileNameFromUrl(aConnection.connUrl + href))
												cardbookRepository.addCardToRepository(myCard, true);
												cardbookRepository.cardbookUtils.formatStringForOutput("serverCardGetOK", [aConnection.connDescription, myCard.fn]);
												cardbookRepository.cardbookServerCardSyncDone[aConnection.connPrefId]++;
												cardbookRepository.cardbookServerGetCardResponse[aConnection.connPrefId]++;
											}
										} else {
											cardbookRepository.cardbookServerCardSyncDone[aConnection.connPrefId]++;
											cardbookRepository.cardbookServerGetCardResponse[aConnection.connPrefId]++;
											cardbookRepository.cardbookServerGetCardError[aConnection.connPrefId]++;
											cardbookRepository.cardbookUtils.formatStringForOutput("serverCardGetFailed", [aConnection.connDescription, aConnection.connUrl, status], "Error");
										}
									} else {
										cardbookRepository.cardbookServerCardSyncDone[aConnection.connPrefId]++;
										cardbookRepository.cardbookServerGetCardResponse[aConnection.connPrefId]++;
										cardbookRepository.cardbookServerGetCardError[aConnection.connPrefId]++;
										cardbookRepository.cardbookUtils.formatStringForOutput("serverCardGetFailed", [aConnection.connDescription, aConnection.connUrl, status], "Error");
									}
								}
							}
							catch(e) {
								cardbookRepository.cardbookServerGetCardResponse[aConnection.connPrefId]++;
								cardbookRepository.cardbookServerCardSyncDone[aConnection.connPrefId]++;
								cardbookRepository.cardbookServerMultiGetError[aConnection.connPrefId]++;
								cardbookRepository.cardbookLog.updateStatusProgressInformation(aConnection.connDescription + " : cardbookSynchronization.serverMultiGet error : " + e, "Error");
							}
						}
					}
					catch(e) {
						cardbookRepository.cardbookServerCardSyncDone[aConnection.connPrefId] = cardbookRepository.cardbookServerCardSyncDone[aConnection.connPrefId] + length;
						cardbookRepository.cardbookServerMultiGetError[aConnection.connPrefId]++;
						cardbookRepository.cardbookLog.updateStatusProgressInformation(aConnection.connDescription + " : cardbookSynchronization.serverMultiGet error : " + e, "Error");
					}
				} else {
					cardbookRepository.cardbookServerCardSyncDone[aConnection.connPrefId] = cardbookRepository.cardbookServerCardSyncDone[aConnection.connPrefId] + length;
					cardbookRepository.cardbookServerMultiGetError[aConnection.connPrefId]++;
				}
				cardbookRepository.cardbookServerMultiGetResponse[aConnection.connPrefId]++;
			}
		};
		var multiget = cardbookRepository.cardbookPreferences.getStringPref("extensions.cardbook.multiget");
		for (var i = 0; i < cardbookRepository.cardbookServerMultiGetArray[aConnection.connPrefId].length; i = i + +multiget) {
			var subArray = cardbookRepository.cardbookServerMultiGetArray[aConnection.connPrefId].slice(i, i + +multiget);
			let request = new cardbookWebDAV(aConnection, listener_multiget, "", true);
			cardbookRepository.cardbookServerMultiGetRequest[aConnection.connPrefId]++;
			request.reportMultiget(subArray);
		}
	},

	getCardsNumber: function (aPrefId) {
		cardbookRepository.cardbookCardsFromCache[aPrefId] = {};
		if (!cardbookRepository.cardbookFileCacheCards[aPrefId]) {
			cardbookRepository.cardbookFileCacheCards[aPrefId] = {}
		}
		if (cardbookRepository.cardbookFileCacheCards[aPrefId]) {
			cardbookRepository.cardbookCardsFromCache[aPrefId] = JSON.parse(JSON.stringify(cardbookRepository.cardbookFileCacheCards[aPrefId]));
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
					if (cardbookRepository.cardbookUtils.getFileNameExtension(file.leafName) == "vcf") {
						listOfFileName.push(file.leafName);
					}
				}
			}
		} catch(e) {}
		return listOfFileName;
	},

	loadDir: function (aDir, aDirPrefId, aTarget, aImportMode, aActionId) {
		var aListOfFileName = [];
		aListOfFileName = cardbookSynchronization.getFilesFromDir(aDir.path);
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
						cardbookSynchronization.loadFile(myFile, aDirPrefId, aTarget, aImportMode, aActionId);
					}}, Components.interfaces.nsIEventTarget.DISPATCH_SYNC);
				} else {
					cardbookRepository.cardbookFileResponse[aDirPrefId]++;
				}
			}
			cardbookRepository.cardbookDirResponse[aDirPrefId]++;
		}}, Components.interfaces.nsIEventTarget.DISPATCH_NORMAL);
	},

	handleRemainingCardCache: function (aPrefIdType, aConnection) {
		if (cardbookRepository.cardbookCardsFromCache[aConnection.connPrefId]) {
			for (var i in cardbookRepository.cardbookCardsFromCache[aConnection.connPrefId]) {
				var aCard = cardbookRepository.cardbookCardsFromCache[aConnection.connPrefId][i];
				if (aCard.created) {
					// "NEWONDISK";
					cardbookRepository.cardbookUtils.formatStringForOutput("cardNewOnDisk", [aConnection.connDescription, aCard.fn]);
					cardbookRepository.cardbookServerCreatedCardRequest[aConnection.connPrefId]++;
					cardbookRepository.cardbookServerCardSyncTotal[aConnection.connPrefId]++;
					cardbookRepository.cardbookServerSyncNewCardOnDisk[aConnection.connPrefId]++;
					var aCreateConnection = JSON.parse(JSON.stringify(aConnection));
					cardbookSynchronization.serverCreateCard(aCreateConnection, aCard, aPrefIdType);
				} else if (aCard.updated) {
					// "UPDATEDONDISKDELETEDONSERVER";
					cardbookRepository.cardbookUtils.formatStringForOutput("cardUpdatedOnDiskDeletedOnServer", [aConnection.connDescription, aCard.fn]);
					cardbookRepository.cardbookServerCardSyncTotal[aConnection.connPrefId]++;
					cardbookRepository.cardbookServerSyncUpdatedCardOnDiskDeletedCardOnServer[aConnection.connPrefId]++;
					var solveConflicts = cardbookRepository.cardbookPreferences.getStringPref("extensions.cardbook.solveConflicts");
					if (solveConflicts === "Local") {
						var conflictResult = "keep";
					} else if (solveConflicts === "Remote") {
						var conflictResult = "delete";
					} else {
						var message = cardbookRepository.extension.localeData.localizeMessage("cardUpdatedOnDiskDeletedOnServer", [aConnection.connDescription, aCard.fn]);
						var askUserResult = cardbookSynchronization.askUser("card", message, "keep", "delete");
						var conflictResult = askUserResult.result;
					}
					
					cardbookRepository.cardbookLog.updateStatusProgressInformationWithDebug1(aConnection.connDescription + " : debug mode : conflict resolution : ", conflictResult);
					switch (conflictResult) {
						case "keep":
							cardbookRepository.cardbookServerCreatedCardRequest[aConnection.connPrefId]++;
							var aCreateConnection = JSON.parse(JSON.stringify(aConnection));
							cardbookRepository.cardbookUtils.nullifyEtag(aCard);
							// Google requires a fresh uid
							if (aPrefIdType == "GOOGLE") {
								let myNewCard = new cardbookCardParser();
								cardbookRepository.cardbookUtils.cloneCard(aCard, myNewCard);
								cardbookRepository.cardbookUtils.setCardUUID(myNewCard);
								cardbookRepository.removeCardFromRepository(aCard, true);
								cardbookRepository.addCardToRepository(myNewCard, true);
								cardbookSynchronization.serverCreateCard(aCreateConnection, myNewCard, aPrefIdType);
							} else {
								cardbookSynchronization.serverCreateCard(aCreateConnection, aCard, aPrefIdType);
							}
							break;
						case "delete":
							cardbookRepository.removeCardFromRepository(aCard, true);
							cardbookRepository.cardbookServerGetCardRequest[aConnection.connPrefId]++;
							cardbookRepository.cardbookServerGetCardResponse[aConnection.connPrefId]++;
							cardbookRepository.cardbookServerCardSyncDone[aConnection.connPrefId]++;
							break;
						case "cancel":
							cardbookRepository.cardbookServerCardSyncDone[aConnection.connPrefId]++;
							break;
					}
				} else if (!aCard.deleted) {
					// "DELETEDONSERVER";
					cardbookRepository.cardbookServerCardSyncTotal[aConnection.connPrefId]++;
					cardbookRepository.cardbookUtils.formatStringForOutput("cardDeletedOnServer", [aConnection.connDescription, aCard.fn]);
					cardbookRepository.removeCardFromRepository(aCard, true);
					cardbookRepository.cardbookServerCardSyncDone[aConnection.connPrefId]++;
					cardbookRepository.cardbookServerSyncDeletedCardOnServer[aConnection.connPrefId]++;
				}
				cardbookRepository.cardbookServerSyncHandleRemainingCardDone[aConnection.connPrefId]++;
			}
		}
	},

	compareServerCardWithCache: function (aCardConnection, aConnection, aPrefIdType, aUrl, aEtag, aFileName) {
		if (cardbookRepository.cardbookFileCacheCards[aCardConnection.connPrefId] && cardbookRepository.cardbookFileCacheCards[aCardConnection.connPrefId][aFileName]) {
			var myCacheCard = cardbookRepository.cardbookFileCacheCards[aCardConnection.connPrefId][aFileName];
			var myServerCard = new cardbookCardParser();
			cardbookRepository.cardbookUtils.cloneCard(myCacheCard, myServerCard);
			cardbookRepository.cardbookUtils.addEtag(myServerCard, aEtag);
			if (myCacheCard.etag == aEtag) {
				if (myCacheCard.deleted) {
					// "DELETEDONDISK";
					cardbookRepository.cardbookServerDeletedCardRequest[aCardConnection.connPrefId]++;
					cardbookRepository.cardbookServerSyncDeletedCardOnDisk[aCardConnection.connPrefId]++;
					cardbookRepository.cardbookUtils.formatStringForOutput("cardDeletedOnDisk", [aCardConnection.connDescription, myCacheCard.fn]);
					cardbookSynchronization.serverDeleteCard(aCardConnection, myCacheCard, aPrefIdType);
				} else if (myCacheCard.updated) {
					// "UPDATEDONDISK";
					cardbookRepository.cardbookServerUpdatedCardRequest[aCardConnection.connPrefId]++;
					cardbookRepository.cardbookServerSyncUpdatedCardOnDisk[aCardConnection.connPrefId]++;
					cardbookRepository.cardbookUtils.formatStringForOutput("cardUpdatedOnDisk", [aCardConnection.connDescription, myCacheCard.fn]);
					cardbookSynchronization.serverUpdateCard(aCardConnection, myCacheCard, myServerCard, aPrefIdType);
				} else {
					// "NOTUPDATED";
					cardbookRepository.cardbookUtils.formatStringForOutput("cardAlreadyGetFromCache", [aCardConnection.connDescription, myCacheCard.fn]);
					cardbookRepository.cardbookServerCardSyncDone[aCardConnection.connPrefId]++;
					cardbookRepository.cardbookServerSyncNotUpdatedCard[aCardConnection.connPrefId]++;
				}
			} else if (myCacheCard.deleted) {
				// "DELETEDONDISKUPDATEDONSERVER";
				cardbookRepository.cardbookServerSyncDeletedCardOnDiskUpdatedCardOnServer[aCardConnection.connPrefId]++;
				cardbookRepository.cardbookUtils.formatStringForOutput("cardDeletedOnDiskUpdatedOnServer", [aCardConnection.connDescription, myCacheCard.fn]);
				var solveConflicts = cardbookRepository.cardbookPreferences.getStringPref("extensions.cardbook.solveConflicts");
				if (solveConflicts === "Local") {
					var conflictResult = "delete";
				} else if (solveConflicts === "Remote") {
					var conflictResult = "keep";
				} else {
					var message = cardbookRepository.extension.localeData.localizeMessage("cardDeletedOnDiskUpdatedOnServer", [aCardConnection.connDescription, myCacheCard.fn]);
					var askUserResult = cardbookSynchronization.askUser("card", message, "keep", "delete");
					var conflictResult = askUserResult.result;
				}
				
				cardbookRepository.cardbookLog.updateStatusProgressInformationWithDebug1(aCardConnection.connDescription + " : debug mode : conflict resolution : ", conflictResult);
				switch (conflictResult) {
					case "keep":
						cardbookRepository.removeCardFromRepository(myCacheCard, true);
						cardbookRepository.cardbookServerMultiGetArray[aCardConnection.connPrefId].push(aUrl);
						break;
					case "delete":
						cardbookRepository.cardbookServerDeletedCardRequest[aCardConnection.connPrefId]++;
						cardbookSynchronization.serverDeleteCard(aCardConnection, myCacheCard, aPrefIdType);
						break;
					case "cancel":
						cardbookRepository.cardbookServerCardSyncDone[aCardConnection.connPrefId]++;
						break;
				}
			} else if (myCacheCard.updated) {
				// "UPDATEDONBOTH";
				cardbookRepository.cardbookServerSyncUpdatedCardOnBoth[aCardConnection.connPrefId]++;
				cardbookRepository.cardbookUtils.formatStringForOutput("cardUpdatedOnBoth", [aCardConnection.connDescription, myCacheCard.fn]);
				var solveConflicts = cardbookRepository.cardbookPreferences.getStringPref("extensions.cardbook.solveConflicts");
				if (solveConflicts === "Local") {
					var conflictResult = "local";
				} else if (solveConflicts === "Remote") {
					var conflictResult = "remote";
				} else {
					var message = cardbookRepository.extension.localeData.localizeMessage("cardUpdatedOnBoth", [aCardConnection.connDescription, myCacheCard.fn]);
					var askUserResult = cardbookSynchronization.askUser("card", message, "local", "remote", "merge");
					var conflictResult = askUserResult.result;
				}
				
				cardbookRepository.cardbookLog.updateStatusProgressInformationWithDebug1(aCardConnection.connDescription + " : debug mode : conflict resolution : ", conflictResult);
				switch (conflictResult) {
					case "local":
						cardbookRepository.cardbookServerUpdatedCardRequest[aCardConnection.connPrefId]++;
						cardbookSynchronization.serverUpdateCard(aCardConnection, myCacheCard, myServerCard, aPrefIdType);
						break;
					case "remote":
						cardbookRepository.cardbookServerMultiGetArray[aCardConnection.connPrefId].push(aUrl);
						break;
					case "merge":
						cardbookRepository.cardbookServerGetCardForMergeRequest[aCardConnection.connPrefId]++;
						cardbookSynchronization.serverGetForMerge(aCardConnection, aEtag, myCacheCard, aPrefIdType);
						break;
					case "cancel":
						cardbookRepository.cardbookServerCardSyncDone[aCardConnection.connPrefId]++;
						break;
				}
			} else {
				// "UPDATEDONSERVER";
				cardbookRepository.cardbookServerMultiGetArray[aCardConnection.connPrefId].push(aUrl);
				cardbookRepository.cardbookServerSyncUpdatedCardOnServer[aCardConnection.connPrefId]++;
				cardbookRepository.cardbookUtils.formatStringForOutput("cardUpdatedOnServer", [aCardConnection.connDescription, myCacheCard.fn, aEtag, myCacheCard.etag]);
			}
		} else {
			// "NEWONSERVER";
			cardbookRepository.cardbookServerMultiGetArray[aCardConnection.connPrefId].push(aUrl);
			cardbookRepository.cardbookServerSyncNewCardOnServer[aCardConnection.connPrefId]++;
			cardbookRepository.cardbookUtils.formatStringForOutput("cardNewOnServer", [aCardConnection.connDescription]);
		}
		cardbookRepository.cardbookServerSyncCompareCardWithCacheDone[aCardConnection.connPrefId]++;
	},

	serverSearchRemote: function(aConnection, aValue, aPrefIdType) {
		var listener_reportQuery = {
			onDAVQueryComplete: function(status, responseJSON, askCertificate) {
				if (status == 0) {
					if (askCertificate) {
						var certificateExceptionAdded = false;
						var certificateExceptionAdded = cardbookSynchronization.addCertificateException(cardbookSynchronization.getRootUrl(aConnection.connUrl));
						if (certificateExceptionAdded) {
							cardbookSynchronization.serverSearchRemote(aConnection, aValue, aPrefIdType);
						} else {
							cardbookRepository.cardbookUtils.formatStringForOutput("synchronizationFailed", [aConnection.connDescription, "serverSearchRemote", aConnection.connUrl, status], "Error");
							cardbookRepository.cardbookServerCardSyncError[aConnection.connPrefId]++;
							cardbookRepository.cardbookServerSyncResponse[aConnection.connPrefId]++;
						}
					} else {
						cardbookRepository.cardbookUtils.formatStringForOutput("synchronizationFailed", [aConnection.connDescription, "serverSearchRemote", aConnection.connUrl, status], "Error");
						cardbookRepository.cardbookServerCardSyncError[aConnection.connPrefId]++;
						cardbookRepository.cardbookServerSyncResponse[aConnection.connPrefId]++;
					}
				} else if (status == 401) {
					if (!cardbookSynchronization.handleWrongPassword(aConnection, status, responseJSON)) {
						cardbookRepository.cardbookUtils.formatStringForOutput("synchronizationFailed", [aConnection.connDescription, "serverSearchRemote", aConnection.connUrl, status], "Error");
					}
					cardbookRepository.cardbookServerCardSyncError[aConnection.connPrefId]++;
					cardbookRepository.cardbookServerSyncResponse[aConnection.connPrefId]++;
				} else if (responseJSON && responseJSON["parsererror"] && responseJSON["parsererror"][0]["sourcetext"] && responseJSON["parsererror"][0]["sourcetext"][0]) {
					cardbookRepository.cardbookUtils.formatStringForOutput("unableToParseResponse", [aConnection.connDescription, responseJSON["parsererror"][0]["sourcetext"][0]], "Error");
					cardbookRepository.cardbookServerCardSyncError[aConnection.connPrefId]++;
					cardbookRepository.cardbookServerSyncResponse[aConnection.connPrefId]++;
				} else if (responseJSON && responseJSON["multistatus"] && (status > 199 && status < 400)) {
					try {
						if (responseJSON["multistatus"][0] && responseJSON["multistatus"][0]["response"]) {
							let jsonResponses = responseJSON["multistatus"][0]["response"];
							for (var prop in jsonResponses) {
								var jsonResponse = jsonResponses[prop];
								try {
									let href = decodeURIComponent(jsonResponse["href"][0]);
									let propstats = jsonResponse["propstat"];
									for (var prop1 in propstats) {
										var propstat = propstats[prop1];
										cardbookRepository.cardbookServerGetCardRequest[aConnection.connPrefId]++;
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
													cardbookRepository.cardbookServerGetCardResponse[aConnection.connPrefId]++;
													cardbookRepository.cardbookServerGetCardError[aConnection.connPrefId]++;
													if (e.message == "") {
														cardbookRepository.cardbookUtils.formatStringForOutput("parsingCardError", [aConnection.connDescription, cardbookRepository.extension.localeData.localizeMessage(e.code), myContent], "Error");
													} else {
														cardbookRepository.cardbookUtils.formatStringForOutput("parsingCardError", [aConnection.connDescription, e.message, myContent], "Error");
													}
													continue;
												}
												cardbookRepository.cardbookUtils.setCacheURIFromValue(myCard, cardbookRepository.cardbookUtils.getFileNameFromUrl(aConnection.connUrl + href))
												cardbookRepository.addCardToRepository(myCard, false);
												cardbookRepository.cardbookUtils.formatStringForOutput("serverCardGetOK", [aConnection.connDescription, myCard.fn]);
											} else {
												cardbookRepository.cardbookServerGetCardError[aConnection.connPrefId]++;
												cardbookRepository.cardbookUtils.formatStringForOutput("serverCardGetFailed", [aConnection.connDescription, aConnection.connUrl, status], "Error");
											}
										} else {
											cardbookRepository.cardbookServerGetCardError[aConnection.connPrefId]++;
											cardbookRepository.cardbookUtils.formatStringForOutput("serverCardGetFailed", [aConnection.connDescription, aConnection.connUrl, status], "Error");
										}
										cardbookRepository.cardbookServerGetCardResponse[aConnection.connPrefId]++;
									}
								}
								catch(e) {
									cardbookRepository.cardbookServerGetCardResponse[aConnection.connPrefId]++;
									cardbookRepository.cardbookServerCardSyncError[aConnection.connPrefId]++;
									cardbookRepository.cardbookLog.updateStatusProgressInformation(aConnection.connDescription + " : cardbookSynchronization.serverSearchRemote error : " + e, "Error");
								}
							}
						}
					}
					catch(e) {
						cardbookRepository.cardbookLog.updateStatusProgressInformation(aConnection.connDescription + " : cardbookSynchronization.serverSearchRemote error : " + e, "Error");
						cardbookRepository.cardbookServerCardSyncError[aConnection.connPrefId]++;
					}
					cardbookRepository.cardbookServerSyncResponse[aConnection.connPrefId]++;
				} else {
					cardbookRepository.cardbookUtils.formatStringForOutput("synchronizationFailed", [aConnection.connDescription, "serverSearchRemote", aConnection.connUrl, status], "Error");
					cardbookRepository.cardbookServerCardSyncError[aConnection.connPrefId]++;
					cardbookRepository.cardbookServerSyncResponse[aConnection.connPrefId]++;
				}
			}
		};
		var baseUrl = cardbookSynchronization.getSlashedUrl(aConnection.connUrl);
		cardbookRepository.cardbookUtils.formatStringForOutput("synchronizationSearchingCards", [aConnection.connDescription]);
		let request = new cardbookWebDAV(aConnection, listener_reportQuery, "", true);
		request.reportQuery(["D:getetag", "C:address-data Content-Type='text/vcard'"], aValue);
	},
	
	serverSyncCards: function(aConnection, aPrefIdType, aValue) {
		var listener_propfind = {
			onDAVQueryComplete: function(status, responseJSON, askCertificate) {
				if (status == 0) {
					if (askCertificate) {
						var certificateExceptionAdded = false;
						var certificateExceptionAdded = cardbookSynchronization.addCertificateException(cardbookSynchronization.getRootUrl(aConnection.connUrl));
						if (certificateExceptionAdded) {
							cardbookSynchronization.serverSyncCards(aConnection, aPrefIdType);
						} else {
							cardbookRepository.cardbookUtils.formatStringForOutput("synchronizationFailed", [aConnection.connDescription, "serverSyncCards", aConnection.connUrl, status], "Error");
							cardbookRepository.cardbookServerCardSyncError[aConnection.connPrefId]++;
							cardbookRepository.cardbookServerSyncResponse[aConnection.connPrefId]++;
						}
					} else {
						cardbookRepository.cardbookUtils.formatStringForOutput("synchronizationFailed", [aConnection.connDescription, "serverSyncCards", aConnection.connUrl, status], "Error");
						cardbookRepository.cardbookServerCardSyncError[aConnection.connPrefId]++;
						cardbookRepository.cardbookServerSyncResponse[aConnection.connPrefId]++;
					}
				} else if (status == 401) {
					if (!cardbookSynchronization.handleWrongPassword(aConnection, status, responseJSON)) {
						cardbookRepository.cardbookUtils.formatStringForOutput("synchronizationFailed", [aConnection.connDescription, "serverSyncCards", aConnection.connUrl, status], "Error");
					}
					cardbookRepository.cardbookServerCardSyncError[aConnection.connPrefId]++;
					cardbookRepository.cardbookServerSyncResponse[aConnection.connPrefId]++;
				} else if (responseJSON && responseJSON["parsererror"] && responseJSON["parsererror"][0]["sourcetext"] && responseJSON["parsererror"][0]["sourcetext"][0]) {
					cardbookRepository.cardbookUtils.formatStringForOutput("unableToParseResponse", [aConnection.connDescription, responseJSON["parsererror"][0]["sourcetext"][0]], "Error");
					cardbookRepository.cardbookServerCardSyncError[aConnection.connPrefId]++;
					cardbookRepository.cardbookServerSyncResponse[aConnection.connPrefId]++;
				} else if (responseJSON && responseJSON["multistatus"] && (status > 199 && status < 400)) {
					try {
						var length = cardbookSynchronization.getCardsNumber(aConnection.connPrefId);
						cardbookRepository.cardbookServerSyncHandleRemainingCardTotal[aConnection.connPrefId] = length;
						if (responseJSON["multistatus"][0] && responseJSON["multistatus"][0]["response"]) {
							let jsonResponses = responseJSON["multistatus"][0]["response"];
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
												var myFileName = cardbookRepository.cardbookUtils.getFileNameFromUrl(myUrl);
												if (cardbookSynchronization.isSupportedContentType(contType, myFileName)) {
													cardbookRepository.cardbookServerCardSyncTotal[aConnection.connPrefId]++;
													cardbookRepository.cardbookServerSyncCompareCardWithCacheTotal[aConnection.connPrefId]++;
													var aCardConnection = {connPrefId: aConnection.connPrefId, connUrl: myUrl, connDescription: aConnection.connDescription, connUser: aConnection.connUser};
													if (aPrefIdType == "YAHOO") {
														aCardConnection.accessToken = aConnection.accessToken;
													}
													cardbookSynchronization.compareServerCardWithCache(aCardConnection, aConnection, aPrefIdType, myUrl, etag, myFileName);
													if (cardbookRepository.cardbookCardsFromCache[aConnection.connPrefId][myFileName]) {
														delete cardbookRepository.cardbookCardsFromCache[aConnection.connPrefId][myFileName];
														cardbookRepository.cardbookServerSyncHandleRemainingCardTotal[aConnection.connPrefId]--;
													}
												}
											}
										}
									}
								}
							}
						}
						cardbookSynchronization.handleRemainingCardCache(aPrefIdType, aConnection);
					}
					catch(e) {
						cardbookRepository.cardbookLog.updateStatusProgressInformation(aConnection.connDescription + " : cardbookSynchronization.serverSyncCards error : " + e, "Error");
						cardbookRepository.cardbookServerCardSyncError[aConnection.connPrefId]++;
						cardbookRepository.cardbookServerSyncHandleRemainingCardTotal[aConnection.connPrefId] = cardbookRepository.cardbookServerSyncHandleRemainingCardDone[aConnection.connPrefId];
					}
					cardbookRepository.cardbookServerSyncResponse[aConnection.connPrefId]++;
				} else {
					cardbookRepository.cardbookUtils.formatStringForOutput("synchronizationFailed", [aConnection.connDescription, "serverSyncCards", aConnection.connUrl, status], "Error");
					cardbookRepository.cardbookServerCardSyncError[aConnection.connPrefId]++;
					cardbookRepository.cardbookServerSyncResponse[aConnection.connPrefId]++;
				}
			}
		};
		var baseUrl = cardbookSynchronization.getSlashedUrl(aConnection.connUrl);
		cardbookRepository.cardbookUtils.formatStringForOutput("synchronizationSearchingCards", [aConnection.connDescription]);
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
			onDAVQueryComplete: function(status, responseJSON, askCertificate) {
				if (status == 0) {
					if (askCertificate) {
						var certificateExceptionAdded = false;
						var certificateExceptionAdded = cardbookSynchronization.addCertificateException(aRootUrl);
						if (certificateExceptionAdded) {
							cardbookSynchronization.validateWithoutDiscovery(aConnection, aOperationType, aParams);
						} else {
							cardbookRepository.cardbookUtils.formatStringForOutput("synchronizationFailed", [aConnection.connDescription, "validateWithoutDiscovery", aConnection.connUrl, status], "Error");
							cardbookRepository.cardbookServerDiscoveryError[aConnection.connPrefId]++;
							cardbookRepository.cardbookServerSyncResponse[aConnection.connPrefId]++;
						}
					} else {
						cardbookRepository.cardbookUtils.formatStringForOutput("synchronizationFailed", [aConnection.connDescription, "validateWithoutDiscovery", aConnection.connUrl, status], "Error");
						cardbookRepository.cardbookServerDiscoveryError[aConnection.connPrefId]++;
						cardbookRepository.cardbookServerSyncResponse[aConnection.connPrefId]++;
					}
					cardbookRepository.cardbookServerDiscoveryResponse[aConnection.connPrefId]++;
				} else if (responseJSON && responseJSON["parsererror"] && responseJSON["parsererror"][0]["sourcetext"] && responseJSON["parsererror"][0]["sourcetext"][0]) {
					cardbookRepository.cardbookUtils.formatStringForOutput("unableToParseResponse", [aConnection.connDescription, responseJSON["parsererror"][0]["sourcetext"][0]], "Error");
					cardbookRepository.cardbookServerDiscoveryError[aConnection.connPrefId]++;
					cardbookRepository.cardbookServerDiscoveryResponse[aConnection.connPrefId]++;
					cardbookRepository.cardbookServerSyncResponse[aConnection.connPrefId]++;
				} else if (responseJSON && responseJSON["multistatus"] && (status > 199 && status < 400)) {
					try {
						let jsonResponses = responseJSON["multistatus"][0]["response"];
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
											cardbookRepository.cardbookLog.updateStatusProgressInformationWithDebug2(aConnection.connDescription + " : rsrcType found : " + rsrcType.toSource());
											if (rsrcType["vcard-collection"] || rsrcType["addressbook"]) {
												var displayName = "";
												if (prop2["displayname"] != null && prop2["displayname"] !== undefined && prop2["displayname"] != "") {
													displayName = prop2["displayname"][0];
												}
												cardbookRepository.cardbookLog.updateStatusProgressInformationWithDebug2(aConnection.connDescription + " : href found : " + href);
												cardbookRepository.cardbookLog.updateStatusProgressInformationWithDebug2(aConnection.connDescription + " : displayName found : " + displayName);
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
						cardbookRepository.cardbookLog.updateStatusProgressInformation(aConnection.connDescription + " : cardbookSynchronization.validateWithoutDiscovery error : " + e + " : " + responseJSON.toSource(), "Error");
						cardbookRepository.cardbookServerDiscoveryError[aConnection.connPrefId]++;
					}
					cardbookRepository.cardbookServerDiscoveryResponse[aConnection.connPrefId]++;
					cardbookRepository.cardbookServerSyncResponse[aConnection.connPrefId]++;
				} else {
					cardbookRepository.cardbookUtils.formatStringForOutput("synchronizationFailed", [aConnection.connDescription, "validateWithoutDiscovery", aConnection.connUrl, status], "Error");
					cardbookRepository.cardbookServerDiscoveryError[aConnection.connPrefId]++;
					cardbookRepository.cardbookServerDiscoveryResponse[aConnection.connPrefId]++;
					cardbookRepository.cardbookServerSyncResponse[aConnection.connPrefId]++;
				}
			}
		};
		var aRootUrl = cardbookSynchronization.getRootUrl(aConnection.connUrl);
		cardbookRepository.cardbookServerDiscoveryRequest[aConnection.connPrefId]++;
		cardbookRepository.cardbookUtils.formatStringForOutput("synchronizationRequestDiscovery", [aConnection.connDescription, aConnection.connUrl]);
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
							cardbookRepository.cardbookUtils.formatStringForOutput("synchronizationFailed", [aConnection.connDescription, "discoverPhase4", aConnection.connUrl, status], "Error");
							// cardbookRepository.cardbookServerDiscoveryError[aConnection.connPrefId]++;
							cardbookRepository.cardbookServerDiscoveryResponse[aConnection.connPrefId]++;
							cardbookRepository.cardbookServerSyncResponse[aConnection.connPrefId]++;
						}
					} else {
						cardbookRepository.cardbookUtils.formatStringForOutput("synchronizationFailed", [aConnection.connDescription, "discoverPhase4", aConnection.connUrl, status], "Error");
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
								cardbookRepository.cardbookLog.updateStatusProgressInformationWithDebug2(aConnection.connDescription + " : version found : " + myVersion + " (" + aConnection.connUrl + ")");
								cardbookRepository.cardbookServerValidation[aConnection.connPrefId][aConnection.connUrl].version.push(myVersion);
							}
						}
					}
					cardbookRepository.cardbookServerValidation[aConnection.connPrefId][aConnection.connUrl].version = cardbookRepository.arrayUnique(cardbookRepository.cardbookServerValidation[aConnection.connPrefId][aConnection.connUrl].version);
					cardbookRepository.cardbookServerSyncResponse[aConnection.connPrefId]++;
					cardbookRepository.cardbookServerDiscoveryResponse[aConnection.connPrefId]++;
				} else {
					// only if it is not an initial setup
					if (aOperationType == "GETDISPLAYNAME" || !cardbookSynchronization.handleWrongPassword(aConnection, status, response)) {
						cardbookRepository.cardbookUtils.formatStringForOutput("synchronizationFailed", [aConnection.connDescription, "discoverPhase4", aConnection.connUrl, status], "Error");
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
		cardbookRepository.cardbookUtils.formatStringForOutput("synchronizationRequestDiscovery4", [aConnection.connDescription, aConnection.connUrl]);
		var request = new cardbookWebDAV(aConnection, listener_checkpropfind4, "", false);
		request.propfind(["C:supported-address-data"], true);
	},

	discoverPhase3: function(aConnection, aRootUrl, aOperationType, aParams) {
		var listener_checkpropfind3 = {
			onDAVQueryComplete: function(status, responseJSON, askCertificate) {
				if (status == 0) {
					if (askCertificate) {
						var certificateExceptionAdded = false;
						var certificateExceptionAdded = cardbookSynchronization.addCertificateException(aRootUrl);
						if (certificateExceptionAdded) {
							cardbookSynchronization.discoverPhase3(aConnection, aRootUrl, aOperationType, aParams);
						} else {
							cardbookRepository.cardbookUtils.formatStringForOutput("synchronizationFailed", [aConnection.connDescription, "discoverPhase3", aConnection.connUrl, status], "Error");
							cardbookRepository.cardbookServerDiscoveryError[aConnection.connPrefId]++;
							cardbookRepository.cardbookServerSyncResponse[aConnection.connPrefId]++;
						}
					} else {
						cardbookRepository.cardbookUtils.formatStringForOutput("synchronizationFailed", [aConnection.connDescription, "discoverPhase3", aConnection.connUrl, status], "Error");
						cardbookRepository.cardbookServerDiscoveryError[aConnection.connPrefId]++;
						cardbookRepository.cardbookServerSyncResponse[aConnection.connPrefId]++;
					}
					cardbookRepository.cardbookServerDiscoveryResponse[aConnection.connPrefId]++;
				} else if (responseJSON && responseJSON["parsererror"] && responseJSON["parsererror"][0]["sourcetext"] && responseJSON["parsererror"][0]["sourcetext"][0]) {
					cardbookRepository.cardbookUtils.formatStringForOutput("unableToParseResponse", [aConnection.connDescription, responseJSON["parsererror"][0]["sourcetext"][0]], "Error");
					cardbookRepository.cardbookServerDiscoveryError[aConnection.connPrefId]++;
					cardbookRepository.cardbookServerDiscoveryResponse[aConnection.connPrefId]++;
					cardbookRepository.cardbookServerSyncResponse[aConnection.connPrefId]++;
				} else if (responseJSON && responseJSON["multistatus"] && (status > 199 && status < 400)) {
					try {
						let jsonResponses = responseJSON["multistatus"][0]["response"];
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
											cardbookRepository.cardbookLog.updateStatusProgressInformationWithDebug2(aConnection.connDescription + " : rsrcType found : " + rsrcType.toSource());
											if (rsrcType["vcard-collection"] || rsrcType["addressbook"]) {
												var displayName = "";
												if (prop2["displayname"] != null && prop2["displayname"] !== undefined && prop2["displayname"] != "") {
													displayName = prop2["displayname"][0];
												}
												cardbookRepository.cardbookLog.updateStatusProgressInformationWithDebug2(aConnection.connDescription + " : href found : " + href);
												cardbookRepository.cardbookLog.updateStatusProgressInformationWithDebug2(aConnection.connDescription + " : displayName found : " + displayName);
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
													cardbookRepository.cardbookSynchronizationGoogle.googleSyncCards(aConnection, aParams.aPrefIdType, aParams.aValue);
												} else if (aOperationType == "YAHOO") {
													cardbookSynchronization.serverSyncCards(aConnection, aParams.aPrefIdType, aParams.aValue);
												} else if (aOperationType == "SYNCSERVER") {
													cardbookSynchronization.serverSyncCards(aConnection, aParams.aPrefIdType, aParams.aValue);
												}
											}
										}
									}
								}
							}
						}
					}
					catch(e) {
						cardbookRepository.cardbookLog.updateStatusProgressInformation(aConnection.connDescription + " : cardbookSynchronization.discoverPhase3 error : " + e + " : " + responseJSON.toSource(), "Error");
						cardbookRepository.cardbookServerDiscoveryError[aConnection.connPrefId]++;
						cardbookRepository.cardbookServerSyncResponse[aConnection.connPrefId]++;
					}
					cardbookRepository.cardbookServerDiscoveryResponse[aConnection.connPrefId]++;
				} else {
					// only if it is not an initial setup
					if (aOperationType == "GETDISPLAYNAME" || !cardbookSynchronization.handleWrongPassword(aConnection, status, responseJSON)) {
						cardbookRepository.cardbookUtils.formatStringForOutput("synchronizationFailed", [aConnection.connDescription, "discoverPhase3", aConnection.connUrl, status], "Error");
					}
					cardbookRepository.cardbookServerDiscoveryError[aConnection.connPrefId]++;
					cardbookRepository.cardbookServerDiscoveryResponse[aConnection.connPrefId]++;
					cardbookRepository.cardbookServerSyncResponse[aConnection.connPrefId]++;
				}
			}
		};
		aConnection.connUrl = cardbookSynchronization.getSlashedUrl(aConnection.connUrl);
		cardbookRepository.cardbookServerDiscoveryRequest[aConnection.connPrefId]++;
		cardbookRepository.cardbookUtils.formatStringForOutput("synchronizationRequestDiscovery3", [aConnection.connDescription, aConnection.connUrl]);
		var request = new cardbookWebDAV(aConnection, listener_checkpropfind3, "", true);
		request.propfind(["D:resourcetype", "D:displayname"], true);
	},

	discoverPhase2: function(aConnection, aRootUrl, aOperationType, aParams) {
		var listener_checkpropfind2 = {
			onDAVQueryComplete: function(status, responseJSON, askCertificate) {
				if (status == 0) {
					if (askCertificate) {
						var certificateExceptionAdded = false;
						var certificateExceptionAdded = cardbookSynchronization.addCertificateException(aRootUrl);
						if (certificateExceptionAdded) {
							cardbookSynchronization.discoverPhase2(aConnection, aRootUrl, aOperationType, aParams);
						} else {
							cardbookRepository.cardbookUtils.formatStringForOutput("synchronizationFailed", [aConnection.connDescription, "discoverPhase2", aConnection.connUrl, status], "Error");
							cardbookRepository.cardbookServerDiscoveryError[aConnection.connPrefId]++;
							cardbookRepository.cardbookServerSyncResponse[aConnection.connPrefId]++;
						}
					} else {
						cardbookRepository.cardbookUtils.formatStringForOutput("synchronizationFailed", [aConnection.connDescription, "discoverPhase2", aConnection.connUrl, status], "Error");
						cardbookRepository.cardbookServerDiscoveryError[aConnection.connPrefId]++;
						cardbookRepository.cardbookServerSyncResponse[aConnection.connPrefId]++;
					}
					cardbookRepository.cardbookServerDiscoveryResponse[aConnection.connPrefId]++;
				} else if (responseJSON && responseJSON["parsererror"] && responseJSON["parsererror"][0]["sourcetext"] && responseJSON["parsererror"][0]["sourcetext"][0]) {
					cardbookRepository.cardbookUtils.formatStringForOutput("unableToParseResponse", [aConnection.connDescription, responseJSON["parsererror"][0]["sourcetext"][0]], "Error");
					cardbookRepository.cardbookServerDiscoveryError[aConnection.connPrefId]++;
					cardbookRepository.cardbookServerDiscoveryResponse[aConnection.connPrefId]++;
					cardbookRepository.cardbookServerSyncResponse[aConnection.connPrefId]++;
				} else if (responseJSON && responseJSON["multistatus"] && (status > 199 && status < 400)) {
					try {
						let jsonResponses = responseJSON["multistatus"][0]["response"];
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
										cardbookRepository.cardbookLog.updateStatusProgressInformationWithDebug2(aConnection.connDescription + " : addressbook-home-set found : " + href);
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
						cardbookRepository.cardbookLog.updateStatusProgressInformation(aConnection.connDescription + " : cardbookSynchronization.discoverPhase2 error : " + e + " : " + responseJSON.toSource(), "Error");
						cardbookRepository.cardbookServerDiscoveryError[aConnection.connPrefId]++;
						cardbookRepository.cardbookServerSyncResponse[aConnection.connPrefId]++;
					}
					cardbookRepository.cardbookServerDiscoveryResponse[aConnection.connPrefId]++;
				} else {
					// only if it is not an initial setup
					if (aOperationType == "GETDISPLAYNAME" || !cardbookSynchronization.handleWrongPassword(aConnection, status, responseJSON)) {
						cardbookRepository.cardbookUtils.formatStringForOutput("synchronizationFailed", [aConnection.connDescription, "discoverPhase2", aConnection.connUrl, status], "Error");
					}
					cardbookRepository.cardbookServerDiscoveryError[aConnection.connPrefId]++;
					cardbookRepository.cardbookServerDiscoveryResponse[aConnection.connPrefId]++;
					cardbookRepository.cardbookServerSyncResponse[aConnection.connPrefId]++;
				}
			}
		};
		aConnection.connUrl = cardbookSynchronization.getSlashedUrl(aConnection.connUrl);
		cardbookRepository.cardbookServerDiscoveryRequest[aConnection.connPrefId]++;
		cardbookRepository.cardbookUtils.formatStringForOutput("synchronizationRequestDiscovery2", [aConnection.connDescription, aConnection.connUrl]);
		var request = new cardbookWebDAV(aConnection, listener_checkpropfind2, "", true);
		request.propfind(["C:addressbook-home-set"], false);
	},

	discoverPhase1: function(aConnection, aOperationType, aParams) {
		var listener_checkpropfind1 = {
			onDAVQueryComplete: function(status, responseJSON, askCertificate) {
				if (status == 0) {
					if (askCertificate) {
						var certificateExceptionAdded = false;
						var certificateExceptionAdded = cardbookSynchronization.addCertificateException(cardbookSynchronization.getRootUrl(aConnection.connUrl));
						if (certificateExceptionAdded) {
							cardbookSynchronization.discoverPhase1(aConnection, aOperationType, aParams);
						} else {
							cardbookRepository.cardbookUtils.formatStringForOutput("synchronizationFailed", [aConnection.connDescription, "discoverPhase1", aConnection.connUrl, status], "Error");
							cardbookRepository.cardbookServerDiscoveryError[aConnection.connPrefId]++;
							cardbookRepository.cardbookServerSyncResponse[aConnection.connPrefId]++;
						}
					} else {
						cardbookRepository.cardbookUtils.formatStringForOutput("synchronizationFailed", [aConnection.connDescription, "discoverPhase1", aConnection.connUrl, status], "Error");
						cardbookRepository.cardbookServerDiscoveryError[aConnection.connPrefId]++;
						cardbookRepository.cardbookServerSyncResponse[aConnection.connPrefId]++;
					}
					cardbookRepository.cardbookServerDiscoveryResponse[aConnection.connPrefId]++;
				} else if (responseJSON && responseJSON["parsererror"] && responseJSON["parsererror"][0]["sourcetext"] && responseJSON["parsererror"][0]["sourcetext"][0]) {
					cardbookRepository.cardbookUtils.formatStringForOutput("unableToParseResponse", [aConnection.connDescription, responseJSON["parsererror"][0]["sourcetext"][0]], "Error");
					cardbookRepository.cardbookServerDiscoveryError[aConnection.connPrefId]++;
					cardbookRepository.cardbookServerDiscoveryResponse[aConnection.connPrefId]++;
					cardbookRepository.cardbookServerSyncResponse[aConnection.connPrefId]++;
				} else if (responseJSON && responseJSON["multistatus"] && (status > 199 && status < 400)) {
					try {
						let jsonResponses = responseJSON["multistatus"][0]["response"];
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
										cardbookRepository.cardbookLog.updateStatusProgressInformationWithDebug2(aConnection.connDescription + " : current-user-principal found : " + href);
										aConnection.connUrl = aRootUrl + href;
										cardbookSynchronization.discoverPhase2(aConnection, aRootUrl, aOperationType, aParams);
									}
								}
							}
						}
					}
					catch(e) {
						cardbookRepository.cardbookLog.updateStatusProgressInformation(aConnection.connDescription + " : cardbookSynchronization.discoverPhase1 error : " + e + " : " + responseJSON.toSource(), "Error");
						cardbookRepository.cardbookServerDiscoveryError[aConnection.connPrefId]++;
						cardbookRepository.cardbookServerSyncResponse[aConnection.connPrefId]++;
					}
					cardbookRepository.cardbookServerDiscoveryResponse[aConnection.connPrefId]++;
				} else {
					// only if it is not an initial setup
					if (aOperationType == "GETDISPLAYNAME" || !cardbookSynchronization.handleWrongPassword(aConnection, status, responseJSON)) {
						cardbookRepository.cardbookUtils.formatStringForOutput("synchronizationFailed", [aConnection.connDescription, "discoverPhase1", aConnection.connUrl, status], "Error");
					}
					cardbookRepository.cardbookServerDiscoveryError[aConnection.connPrefId]++;
					cardbookRepository.cardbookServerDiscoveryResponse[aConnection.connPrefId]++;
					cardbookRepository.cardbookServerSyncResponse[aConnection.connPrefId]++;
				}
			}
		};
		var aRootUrl = cardbookSynchronization.getRootUrl(aConnection.connUrl);
		cardbookRepository.cardbookServerDiscoveryRequest[aConnection.connPrefId]++;
		cardbookRepository.cardbookUtils.formatStringForOutput("synchronizationRequestDiscovery1", [aConnection.connDescription, aConnection.connUrl]);
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
		Services.wm.getMostRecentWindow("mail:3pane").openDialog("chrome://pippki/content/exceptionDialog.xhtml", "", "chrome,centerscreen,modal", params);
		return params.exceptionAdded;
	},

	setPeriodicSyncs: function (aDirPrefId) {
		for (let account of cardbookRepository.cardbookAccounts.filter(child => aDirPrefId == child[4] || true)) {
			let dirPrefName = account[0];
			let dirPrefId = account[4];
			let enabled = account[5];
			let dirPrefType = account[6];
			if (enabled && cardbookRepository.cardbookUtils.isMyAccountRemote(dirPrefType)
				&& cardbookRepository.cardbookPreferences.getDBCached(dirPrefId)) {
				var autoSync = cardbookRepository.cardbookPreferences.getAutoSyncEnabled(dirPrefId);
				var autoSyncInterval = cardbookRepository.cardbookPreferences.getAutoSyncInterval(dirPrefId);
				if ((!cardbookRepository.autoSync[dirPrefId]) ||
					(autoSync && cardbookRepository.autoSyncInterval[dirPrefId] != autoSyncInterval)) {
					cardbookSynchronization.removePeriodicSync(dirPrefId, dirPrefName);
					if (autoSync) {
						cardbookSynchronization.addPeriodicSync(dirPrefId, dirPrefName, autoSyncInterval);
					}
				}
			} else {
				cardbookSynchronization.removePeriodicSync(dirPrefId, dirPrefName);
			}
		}
	},

	removePeriodicSync: function(aDirPrefId, aDirPrefName) {
		if (cardbookRepository.autoSyncId[aDirPrefId]) {
			cardbookRepository.cardbookUtils.formatStringForOutput("periodicSyncDeleting", [aDirPrefName, aDirPrefId]);
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
			cardbookRepository.cardbookUtils.formatStringForOutput("periodicSyncSetting", [aDirPrefName, autoSyncIntervalMs, aDirPrefId]);
		}
	},
	
	runPeriodicSync: function (aDirPrefId, aDirPrefName) {
		cardbookRepository.cardbookUtils.formatStringForOutput("periodicSyncSyncing", [aDirPrefName]);
		cardbookSynchronization.syncAccount(aDirPrefId);
	},

	syncAccounts: function (aAccountList) {
		if (aAccountList) {
			var result = aAccountList;
		} else {
			var result = [];
			result = cardbookRepository.cardbookPreferences.getAllPrefIds();
		}
		for (let i = 0; i < result.length; i++) {
			cardbookSynchronization.syncAccount(result[i]);
		}
	},

	syncAccount: function (aPrefId, aForceSync = false) {
		try {
			if (cardbookRepository.cardbookUtils.isMyAccountSyncing(aPrefId) && !aForceSync) {
				return;
			}
			
			var myPrefIdType = cardbookRepository.cardbookPreferences.getType(aPrefId);
			var myPrefIdUrl = cardbookRepository.cardbookPreferences.getUrl(aPrefId);
			var myPrefIdName = cardbookRepository.cardbookPreferences.getName(aPrefId);
			var myPrefIdUser = cardbookRepository.cardbookPreferences.getUser(aPrefId);
			var myPrefEnabled = cardbookRepository.cardbookPreferences.getEnabled(aPrefId);
			var myPrefDBCached = cardbookRepository.cardbookPreferences.getDBCached(aPrefId);
			if (myPrefEnabled) {
				if (cardbookRepository.cardbookUtils.isMyAccountRemote(myPrefIdType)) {
					var params = {aPrefIdType: myPrefIdType};
					if (!myPrefDBCached) {
						params.aValue = cardbookRepository.cardbookPreferences.getLastSearch(aPrefId);
					}
					if (myPrefIdType == "GOOGLE") {
						cardbookActions.initSyncActivity(aPrefId, myPrefIdName);
						cardbookSynchronization.initMultipleOperations(aPrefId);
						cardbookRepository.cardbookServerSyncRequest[aPrefId]++;
						var connection = {connUser: myPrefIdUser, connPrefId: aPrefId, connUrl: cardbookRepository.cardbookOAuthData.GOOGLE.REFRESH_REQUEST_URL, connDescription: myPrefIdName};
						cardbookRepository.cardbookServerSyncParams[aPrefId] = [ connection, myPrefIdType ];
						cardbookRepository.cardbookSynchronizationGoogle.getNewAccessTokenForGoogleClassic(connection, params, cardbookSynchronizationGoogle.googleSyncLabels);
					} else if (myPrefIdType == "YAHOO") {
						cardbookActions.initSyncActivity(aPrefId, myPrefIdName);
						cardbookSynchronization.initMultipleOperations(aPrefId);
						cardbookRepository.cardbookServerSyncRequest[aPrefId]++;
						var connection = {connUser: myPrefIdUser, connPrefId: aPrefId, connUrl: cardbookRepository.cardbookOAuthData.YAHOO.REFRESH_REQUEST_URL, connDescription: myPrefIdName};
						cardbookRepository.cardbookServerSyncParams[aPrefId] = [ connection, myPrefIdType ];
						cardbookRepository.cardbookSynchronizationYahoo.getNewAccessTokenForYahoo(connection, "YAHOO", params);
					} else if (myPrefIdType == "APPLE") {
						cardbookActions.initSyncActivity(aPrefId, myPrefIdName);
						cardbookSynchronization.initMultipleOperations(aPrefId);
						cardbookRepository.cardbookServerSyncRequest[aPrefId]++;
						var connection = {connUser: myPrefIdUser, connPrefId: aPrefId, connUrl: myPrefIdUrl, connDescription: myPrefIdName};
						connection.connUrl = cardbookSynchronization.getSlashedUrl(connection.connUrl);
						cardbookRepository.cardbookServerSyncParams[aPrefId] = [ connection, myPrefIdType ];
						cardbookSynchronization.discoverPhase1(connection, "SYNCSERVER", params);
					} else if (myPrefIdType == "CARDDAV" && !myPrefDBCached) {
						if (params.aValue) {
							cardbookActions.initSyncActivity(aPrefId, myPrefIdName);
							cardbookSynchronization.initMultipleOperations(aPrefId);
							cardbookRepository.cardbookServerSyncRequest[aPrefId]++;
							var connection = {connUser: myPrefIdUser, connPrefId: aPrefId, connUrl: myPrefIdUrl, connDescription: myPrefIdName};
							cardbookRepository.cardbookServerSyncParams[aPrefId] = [ connection, myPrefIdType ];
							cardbookSynchronization.serverSyncCards(connection, myPrefIdType, params.aValue);
						}
					} else {
						cardbookActions.initSyncActivity(aPrefId, myPrefIdName);
						cardbookSynchronization.initMultipleOperations(aPrefId);
						cardbookRepository.cardbookServerSyncRequest[aPrefId]++;
						var connection = {connUser: myPrefIdUser, connPrefId: aPrefId, connUrl: myPrefIdUrl, connDescription: myPrefIdName};
						cardbookRepository.cardbookServerSyncParams[aPrefId] = [ connection, myPrefIdType ];
						// bug for supporting old format URL that might be short (for example carddav.gmx)
						if (cardbookSynchronization.getSlashedUrl(connection.connUrl) == cardbookSynchronization.getSlashedUrl(cardbookSynchronization.getRootUrl(connection.connUrl))) {
							connection.connUrl = cardbookSynchronization.getWellKnownUrl(connection.connUrl);
							cardbookSynchronization.discoverPhase1(connection, "SYNCSERVER", params);
						} else {
							cardbookSynchronization.serverSyncCards(connection, myPrefIdType);
						}
					}
					if (myPrefIdType == "GOOGLE") {
						cardbookSynchronizationGoogle.waitForGoogleSyncFinished(aPrefId, myPrefIdName);
					} else {
						cardbookSynchronization.waitForSyncFinished(aPrefId, myPrefIdName);
					}
				}
			}
		}
		catch (e) {
			cardbookRepository.cardbookLog.updateStatusProgressInformation("cardbookSynchronization.syncAccount error : " + e, "Error");
		}
	},

	searchRemote: function (aPrefId, aValue) {
		try {
			cardbookRepository.removeAccountFromComplexSearch(aPrefId);
			cardbookRepository.emptyAccountFromRepository(aPrefId);
			var myPrefIdType = cardbookRepository.cardbookPreferences.getType(aPrefId);
			var myPrefIdUrl = cardbookRepository.cardbookPreferences.getUrl(aPrefId);
			var myPrefIdName = cardbookRepository.cardbookPreferences.getName(aPrefId);
			var myPrefIdUser = cardbookRepository.cardbookPreferences.getUser(aPrefId);
			var myPrefEnabled = cardbookRepository.cardbookPreferences.getEnabled(aPrefId);
			var myPrefDBCached = cardbookRepository.cardbookPreferences.getDBCached(aPrefId);
			if (myPrefEnabled && !myPrefDBCached && cardbookRepository.cardbookUtils.isMyAccountRemote(myPrefIdType)) {
				cardbookActions.initSyncActivity(aPrefId, myPrefIdName);
				cardbookSynchronization.initMultipleOperations(aPrefId);
				cardbookRepository.cardbookServerSyncRequest[aPrefId]++;
				var connection = {connUser: myPrefIdUser, connPrefId: aPrefId, connUrl: myPrefIdUrl, connDescription: myPrefIdName};
				cardbookSynchronization.serverSearchRemote(connection, aValue, myPrefIdType);
				cardbookSynchronization.waitForSyncFinished(aPrefId, myPrefIdName);
			}
		}
		catch (e) {
			cardbookRepository.cardbookLog.updateStatusProgressInformation("cardbookSynchronization.searchRemote error : " + e, "Error");
		}
	},

	waitForSyncFinished: function (aPrefId, aPrefName) {
		cardbookRepository.lTimerSyncAll[aPrefId] = Components.classes["@mozilla.org/timer;1"].createInstance(Components.interfaces.nsITimer);
		var lTimerSync = cardbookRepository.lTimerSyncAll[aPrefId];
		lTimerSync.initWithCallback({ notify: function(lTimerSync) {
					cardbookRepository.cardbookUtils.notifyObservers("syncRunning", aPrefId);
					var myPrefIdType = cardbookRepository.cardbookPreferences.getType(aPrefId);
					if (cardbookRepository.cardbookServerSyncCompareCardWithCacheDone[aPrefId] != 0) {
						if (cardbookRepository.cardbookServerSyncCompareCardWithCacheDone[aPrefId] == cardbookRepository.cardbookServerSyncCompareCardWithCacheTotal[aPrefId]) {
							cardbookRepository.cardbookServerSyncCompareCardWithCacheDone[aPrefId] = 0;
							cardbookRepository.cardbookServerSyncCompareCardWithCacheTotal[aPrefId] = 0;
							if (cardbookRepository.cardbookServerMultiGetArray[aPrefId].length != 0) {
								cardbookSynchronization.serverMultiGet(cardbookRepository.cardbookServerSyncParams[aPrefId][0], myPrefIdType);
							}
						}
					}
					if (cardbookRepository.cardbookServerSyncHandleRemainingCardDone[aPrefId] == cardbookRepository.cardbookServerSyncHandleRemainingCardTotal[aPrefId]) {
						var request = cardbookSynchronization.getRequest(aPrefId, aPrefName) + cardbookSynchronization.getTotal(aPrefId, aPrefName);
						var response = cardbookSynchronization.getResponse(aPrefId, aPrefName) + cardbookSynchronization.getDone(aPrefId, aPrefName);
						if (cardbookRepository.cardbookUtils.isMyAccountRemote(myPrefIdType)) {
							cardbookActions.fetchSyncActivity(aPrefId, cardbookRepository.cardbookServerCardSyncDone[aPrefId], cardbookRepository.cardbookServerCardSyncTotal[aPrefId]);
						}
						if (request == response) {
							cardbookSynchronization.finishSync(aPrefId, aPrefName, myPrefIdType);
							if (cardbookRepository.cardbookServerSyncAgain[aPrefId]) {
								cardbookSynchronization.finishMultipleOperations(aPrefId);
								cardbookRepository.cardbookUtils.formatStringForOutput("synchroForcedToResync", [aPrefName]);
								cardbookSynchronization.syncAccount(aPrefId, true);
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
										var myPrefName = cardbookRepository.cardbookUtils.getPrefNameFromPrefId(myPrefId);
										cardbookRepository.cardbookUtils.formatStringForOutput("synchroForcedToResync", [myPrefName]);
										cardbookSynchronization.syncAccount(myPrefId, true);
									}
									for (var j = 0; j < syncFailed.length; j++) {
										var myPrefId = syncFailed[j];
										cardbookRepository.cardbookUtils.formatStringForOutput("synchronizationFailed", [cardbookRepository.cardbookPreferences.getName(myPrefId), "passwordNotChanged", cardbookRepository.cardbookPreferences.getUrl(myPrefId), 401], "Error");
									}
									if (syncAgain.length == 0) {
										cardbookRepository.cardbookUtils.formatStringForOutput("synchroAllFinished");
										if (cardbookRepository.initialSync) {
											ovl_birthdays.onLoad();
											cardbookRepository.initialSync = false;
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

	waitForLoadFinished: function (aPrefId, aPrefName, aSync = null, aRunBirthdaysAfterLoad = true) {
		cardbookRepository.lTimerDirAll[aPrefId] = Components.classes["@mozilla.org/timer;1"].createInstance(Components.interfaces.nsITimer);
		var lTimerDir = cardbookRepository.lTimerDirAll[aPrefId];
		lTimerDir.initWithCallback({ notify: function(lTimerDir) {
					cardbookRepository.cardbookUtils.notifyObservers("syncRunning", aPrefId);
					var request = cardbookSynchronization.getRequest(aPrefId, aPrefName) + cardbookSynchronization.getTotal(aPrefId, aPrefName);
					var response = cardbookSynchronization.getResponse(aPrefId, aPrefName) + cardbookSynchronization.getDone(aPrefId, aPrefName);
					if (request == response) {
						var myPrefIdType = cardbookRepository.cardbookPreferences.getType(aPrefId);
						if (cardbookRepository.cardbookDBCardRequest[aPrefId] == 0 && cardbookRepository.cardbookUtils.isMyAccountRemote(myPrefIdType)) {
							cardbookRepository.cardbookDBCardRequest[aPrefId]++;
							cardbookIndexedDB.loadCards(aPrefId, aPrefName, cardbookIndexedDB.cardsComplete);
						} else if (cardbookRepository.cardbookDBCardRequest[aPrefId] == 0 && myPrefIdType === "LOCALDB") {
							cardbookRepository.cardbookDBCardRequest[aPrefId]++;
							cardbookIndexedDB.loadCards(aPrefId, aPrefName, cardbookIndexedDB.cardsComplete);
						} else if (cardbookRepository.cardbookFileRequest[aPrefId] == 0 && myPrefIdType == "FILE") {
							cardbookRepository.cardbookFileRequest[aPrefId]++;
							var myPrefUrl = cardbookRepository.cardbookPreferences.getUrl(aPrefId);
							var myFile = Components.classes["@mozilla.org/file/local;1"].createInstance(Components.interfaces.nsIFile);
							myFile.initWithPath(myPrefUrl);
							cardbookSynchronization.loadFile(myFile, aPrefId, aPrefId, "NOIMPORTFILE", "");
						} else if (cardbookRepository.cardbookDirRequest[aPrefId] == 0 && myPrefIdType == "DIRECTORY") {
							cardbookRepository.cardbookDirRequest[aPrefId]++;
							var myPrefUrl = cardbookRepository.cardbookPreferences.getUrl(aPrefId);
							var myDir = Components.classes["@mozilla.org/file/local;1"].createInstance(Components.interfaces.nsIFile);
							myDir.initWithPath(myPrefUrl);
							cardbookSynchronization.loadDir(myDir, aPrefId, aPrefId, "NOIMPORTDIR", "");
						} else if (aSync && aSync === true && cardbookRepository.cardbookUtils.isMyAccountRemote(myPrefIdType)) {
							// would be nice to delay only the initial request
							// Web requests are delayed for a preference value
							var initialSyncDelay = cardbookRepository.cardbookPreferences.getStringPref("extensions.cardbook.initialSyncDelay");
							try {
								var initialSyncDelayMs = initialSyncDelay * 1000;
							} catch(e) {
								var initialSyncDelayMs = 0;
							}
							if (initialSyncDelayMs == 0) {
								cardbookSynchronization.syncAccount(aPrefId, true);
							} else {
								if ("undefined" == typeof(setTimeout)) {
									var { setTimeout } = ChromeUtils.import("resource://gre/modules/Timer.jsm");
								}
								setTimeout(function() {
									cardbookSynchronization.syncAccount(aPrefId, true);
								}, initialSyncDelayMs);
							}
							lTimerDir.cancel();
						} else {
							cardbookRepository.initialSync = false;
							cardbookSynchronization.finishSync(aPrefId, aPrefName, myPrefIdType);
							cardbookSynchronization.finishMultipleOperations(aPrefId);
							if (aRunBirthdaysAfterLoad) {
								var total = cardbookSynchronization.getRequest() + cardbookSynchronization.getTotal() + cardbookSynchronization.getResponse() + cardbookSynchronization.getDone();
								// all load are finished
								if (total === 0) {
									ovl_birthdays.onLoad();
								}
							}
							lTimerDir.cancel();
						}
					}
				}
				}, 1000, Components.interfaces.nsITimer.TYPE_REPEATING_SLACK);
	},

	waitForImportFinished: function (aPrefId, aPrefName) {
		cardbookRepository.lTimerImportAll[aPrefId] = Components.classes["@mozilla.org/timer;1"].createInstance(Components.interfaces.nsITimer);
		var lTimerImport = cardbookRepository.lTimerImportAll[aPrefId];
		lTimerImport.initWithCallback({ notify: function(lTimerImport) {
					cardbookRepository.cardbookUtils.notifyObservers("syncRunning", aPrefId);
					var request = cardbookSynchronization.getRequest(aPrefId, aPrefName) + cardbookSynchronization.getTotal(aPrefId, aPrefName);
					var response = cardbookSynchronization.getResponse(aPrefId, aPrefName) + cardbookSynchronization.getDone(aPrefId, aPrefName);
					if (request == response) {
						cardbookSynchronization.finishImport(aPrefId, aPrefName);
						cardbookSynchronization.finishMultipleOperations(aPrefId);
						var total = cardbookSynchronization.getRequest() + cardbookSynchronization.getTotal() + cardbookSynchronization.getResponse() + cardbookSynchronization.getDone();
						if (total === 0) {
							cardbookRepository.cardbookUtils.formatStringForOutput("importAllFinished");
						}
						lTimerImport.cancel();
					}
				}
				}, 1000, Components.interfaces.nsITimer.TYPE_REPEATING_SLACK);
	},

	waitForComplexSearchFinished: function (aPrefId, aPrefName) {
		cardbookRepository.lComplexSearchAll[aPrefId] = Components.classes["@mozilla.org/timer;1"].createInstance(Components.interfaces.nsITimer);
		var lComplexSearch = cardbookRepository.lComplexSearchAll[aPrefId];
		lComplexSearch.initWithCallback({ notify: function(lComplexSearch) {
					cardbookRepository.cardbookUtils.notifyObservers("syncRunning", aPrefId);
					var request = cardbookSynchronization.getRequest(aPrefId, aPrefName);
					var response = cardbookSynchronization.getResponse(aPrefId, aPrefName);
					if (request == response) {
						cardbookSynchronization.finishMultipleOperations(aPrefId);
						var total = cardbookSynchronization.getRequest() + cardbookSynchronization.getResponse();
						if (total === 0) {
							if (cardbookRepository.initialSync) {
								cardbookRepository.cardbookUtils.notifyObservers("complexSearchInitLoaded");
							} else {
								cardbookRepository.cardbookUtils.notifyObservers("complexSearchLoaded", aPrefId);
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
		cardbookRepository.cardbookFileCacheCategories = {};
		cardbookRepository.cardbookCards = {};
		cardbookRepository.cardbookCategories = {};
		cardbookRepository.cardbookCardLongSearch = {};
		cardbookRepository.cardbookComplexSearch = {};
		
		var result = [];
		result = cardbookRepository.cardbookPreferences.getAllComplexSearchIds();
		for (let i = 0; i < result.length; i++) {
			cardbookSynchronization.loadComplexSearchAccount(result[i]);
		}
		if (result.length == 0) {
			cardbookRepository.cardbookUtils.notifyObservers("complexSearchInitLoaded");
		}
	},

	loadComplexSearchAccount: function (aDirPrefId) {
		cardbookSynchronization.initMultipleOperations(aDirPrefId);
		let myFile = cardbookRepository.getRuleFile(aDirPrefId);
		let myPrefName = cardbookRepository.cardbookPreferences.getName(aDirPrefId);
		cardbookRepository.cardbookComplexSearchRequest[aDirPrefId]++;
		if (myFile.exists() && myFile.isFile()) {
			if (!cardbookRepository.initialSync) {
				cardbookRepository.cardbookComplexSearchReloadRequest[aDirPrefId]++;
			}
			var params = {};
			params["showError"] = true;
			params["aDirPrefId"] = aDirPrefId;
			params["aDirPrefName"] = myPrefName;
			cardbookSynchronization.getFileDataAsync(myFile.path, cardbookSynchronization.loadComplexSearchAccountFinished, params);
		} else {
			cardbookRepository.cardbookComplexSearchResponse[aDirPrefId]++;
		}
		cardbookSynchronization.waitForComplexSearchFinished(aDirPrefId, myPrefName);
	},
	
	loadComplexSearchAccountFinished: function (aData, aParams) {
		cardbookSynchronization.parseRule(aData, aParams.aDirPrefId);
		cardbookRepository.cardbookComplexSearchResponse[aParams.aDirPrefId]++;
		if (!cardbookRepository.initialSync) {
			cardbookSynchronization.loadComplexSearchCards(aParams.aDirPrefId);
		}
	},
	
	loadComplexSearchCards: function (aComplexSearchDirPrefId) {
		if (cardbookRepository.cardbookComplexSearch[aComplexSearchDirPrefId]) {
			for (let j in cardbookRepository.cardbookCards) {
				let myCard = cardbookRepository.cardbookCards[j];
				if (cardbookRepository.isMyCardFound(myCard, aComplexSearchDirPrefId)) {
					cardbookRepository.addCardToDisplayAndCat(myCard, aComplexSearchDirPrefId, false);
				}
			}
		}
		cardbookRepository.cardbookComplexSearchReloadResponse[aComplexSearchDirPrefId]++;
	},

	parseRule: function (aData, aDirPrefId) {
		if (aData) {
			cardbookRepository.cardbookComplexSearch[aDirPrefId] = {}
			var relative = aData.match("^searchAB:([^:]*):searchAll:([^:]*)(.*)");
			if (!relative) {
				return;
			}
			cardbookRepository.cardbookComplexSearch[aDirPrefId].searchAB = relative[1];
			if (relative[2] == "true") {
				cardbookRepository.cardbookComplexSearch[aDirPrefId].matchAll = true;
			} else {
				cardbookRepository.cardbookComplexSearch[aDirPrefId].matchAll = false;
			}
			var tmpRuleArray = relative[3].split(/:case:/);
			cardbookRepository.cardbookComplexSearch[aDirPrefId].rules = [];
			for (var i = 1; i < tmpRuleArray.length; i++) {
				var relative = tmpRuleArray[i].match("([^:]*):field:([^:]*):term:([^:]*):value:([^:]*)");
				cardbookRepository.cardbookComplexSearch[aDirPrefId].rules.push([relative[1], relative[2], relative[3], relative[4]]);
			}
		}
	},

	loadAccounts: function () {
		var initialSync = cardbookRepository.cardbookPreferences.getBoolPref("extensions.cardbook.initialSync");
		var result = [];
		result = cardbookRepository.cardbookPreferences.getAllPrefIds();
		var runBirthdaysAfterLoad = true;
		for (let dirPrefId of result) {
			if (cardbookRepository.cardbookUtils.isMyAccountRemote(cardbookRepository.cardbookPreferences.getType(dirPrefId)) && cardbookRepository.cardbookPreferences.getEnabled(dirPrefId) && initialSync) {
				runBirthdaysAfterLoad = false;
				break;
			}
		}
		for (let dirPrefId of result) {
			cardbookSynchronization.loadAccount(dirPrefId, initialSync, true, runBirthdaysAfterLoad);
		}
		cardbookSynchronization.setPeriodicSyncs();
		cardbookRepository.cardbookUtils.notifyObservers("accountsLoaded");
	},

	loadAccount: function (aDirPrefId, aSync, aAddAccount, aRunBirthdaysAfterLoad = true) {
		var myPrefName = cardbookRepository.cardbookPreferences.getName(aDirPrefId);
		if (myPrefName == "") {
			return;
		} else {
			var myPrefType = cardbookRepository.cardbookPreferences.getType(aDirPrefId);
			var myPrefUrl = cardbookRepository.cardbookPreferences.getUrl(aDirPrefId);
			var myPrefUser = cardbookRepository.cardbookPreferences.getUser(aDirPrefId);
			var myPrefColor = cardbookRepository.cardbookPreferences.getColor(aDirPrefId);
			var myPrefEnabled = cardbookRepository.cardbookPreferences.getEnabled(aDirPrefId);
			var myPrefExpanded = cardbookRepository.cardbookPreferences.getExpanded(aDirPrefId);
			var myPrefVCard = cardbookRepository.cardbookPreferences.getVCardVersion(aDirPrefId);
			var myPrefReadOnly = cardbookRepository.cardbookPreferences.getReadOnly(aDirPrefId);
			var myPrefUrnuuid = cardbookRepository.cardbookPreferences.getUrnuuid(aDirPrefId);
			var myPrefDBCached = cardbookRepository.cardbookPreferences.getDBCached(aDirPrefId);
			var myPrefAutoSyncEnabled = cardbookRepository.cardbookPreferences.getAutoSyncEnabled(aDirPrefId);
			var myPrefAutoSyncInterval = cardbookRepository.cardbookPreferences.getAutoSyncInterval(aDirPrefId);
			if (aAddAccount) {
				cardbookRepository.addAccountToRepository(aDirPrefId, myPrefName, myPrefType, myPrefUrl, myPrefUser, myPrefColor, myPrefEnabled, myPrefExpanded,
															myPrefVCard, myPrefReadOnly, myPrefUrnuuid, myPrefDBCached, myPrefAutoSyncEnabled, myPrefAutoSyncInterval, false);
				cardbookRepository.cardbookUtils.formatStringForOutput("addressbookOpened", [myPrefName]);
			}
		}

		if (myPrefEnabled) {
			if ((cardbookRepository.cardbookUtils.isMyAccountRemote(myPrefType) && myPrefDBCached)
				|| (myPrefType == "LOCALDB")
				|| (myPrefType == "FILE")
				|| (myPrefType == "DIRECTORY")) {
				cardbookSynchronization.initMultipleOperations(aDirPrefId);
				cardbookRepository.cardbookDBCatRequest[aDirPrefId]++;
				cardbookIndexedDB.loadCategories(aDirPrefId, myPrefName, cardbookIndexedDB.catsComplete);
				cardbookSynchronization.waitForLoadFinished(aDirPrefId, myPrefName, aSync, aRunBirthdaysAfterLoad);
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
				var myUrl = cardbookRepository.cardbookPreferences.getUrl(account[4]);
				var myShortUrl = cardbookSynchronization.getShortUrl(myUrl);
				var myUser = cardbookRepository.cardbookPreferences.getUser(account[4]);
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
		allPrefsURLs = cardbookRepository.cardbookPreferences.getDiscoveryAccounts();

		for (var i = 0; i < allPrefsURLs.length; i++) {
			var dirPrefId = cardbookRepository.cardbookUtils.getUUID();
			if (i == 0) {
				cardbookRepository.cardbookUtils.formatStringForOutput("discoveryRunning", [cardbookRepository.gDiscoveryDescription]);
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
				cardbookRepository.cardbookLog.updateStatusProgressInformationWithDebug1(cardbookRepository.gDiscoveryDescription + " : debug mode : cardbookRepository.cardbookServerValidation : ", cardbookRepository.cardbookServerValidation);
				var myAccountsToAdd = [];
				var myAccountsToRemove = [];
				// find all current CARDDAV accounts
				var myCurrentAccounts = [];
				myCurrentAccounts = JSON.parse(JSON.stringify(cardbookRepository.cardbookAccounts));
				function onlyCardDAV(element) {
					return (element[6] == "CARDDAV");
				}
				myCurrentAccounts = myCurrentAccounts.filter(onlyCardDAV);
				cardbookRepository.cardbookLog.updateStatusProgressInformationWithDebug1(cardbookRepository.gDiscoveryDescription + " : debug mode : myCurrentAccounts : ", myCurrentAccounts);
				
				// find all accounts that should be added and removed
				for (var dirPrefId in cardbookRepository.cardbookServerValidation) {
					if (cardbookRepository.cardbookServerValidation[dirPrefId].length != 0) {
						for (var url in cardbookRepository.cardbookServerValidation[dirPrefId]) {
							if (url == "length" || url == "user") {
								continue;
							}
							for (var i = 0; i < myCurrentAccounts.length; i++) {
								var myCurrentUrl = cardbookRepository.cardbookPreferences.getUrl(myCurrentAccounts[i][4]);
								var myCurrentUser = cardbookRepository.cardbookPreferences.getUser(myCurrentAccounts[i][4]);
								if ((myCurrentUser == cardbookRepository.cardbookServerValidation[dirPrefId].user) && (myCurrentUrl == cardbookRepository.cardbookUtils.decodeURL(url))) {
									cardbookRepository.cardbookServerValidation[dirPrefId][url].forget = true;
									myCurrentAccounts[i][6] = "CARDDAVFOUND";
								}
							}
						}
						// add accounts
						myAccountsToAdd.push(cardbookRepository.cardbookUtils.fromValidationToArray(dirPrefId, "CARDDAV"));
					}
				}
				// remove accounts
				var myCurrentAccountsNotFound = [];
				myCurrentAccountsNotFound = myCurrentAccounts.filter(onlyCardDAV);
				for (var i = 0; i < myCurrentAccountsNotFound.length; i++) {
					var myCurrentUrl = cardbookRepository.cardbookPreferences.getUrl(myCurrentAccountsNotFound[i][4]);
					var myCurrentUser = cardbookRepository.cardbookPreferences.getUser(myCurrentAccountsNotFound[i][4]);
					var myCurrentShortUrl = cardbookSynchronization.getShortUrl(myCurrentUrl);
					for (var dirPrefId in cardbookRepository.cardbookServerValidation) {
						for (var url in cardbookRepository.cardbookServerValidation[dirPrefId]) {
							if (url == "length" || url == "user") {
								continue;
							}
							if ((myCurrentUser == cardbookRepository.cardbookServerValidation[dirPrefId].user) && (myCurrentShortUrl == cardbookSynchronization.getShortUrl(cardbookRepository.cardbookUtils.decodeURL(url)))) {
								myAccountsToRemove.push(myCurrentAccountsNotFound[i][4]);
								break;
							}
						}
					}
				}

				for (var i = 0; i < myAccountsToAdd.length; i++) {
					cardbookRepository.cardbookDiscovery.addAddressbook(myAccountsToAdd[i]);
				}
				for (var i = 0; i < myAccountsToRemove.length; i++) {
					cardbookRepository.cardbookDiscovery.removeAddressbook(myAccountsToRemove[i]);
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
					cardbookRepository.cardbookLog.updateStatusProgressInformationWithDebug1(cardbookRepository.gDiscoveryDescription + " : debug mode : cardbookRepository.cardbookServerDiscoveryRequest : ", cardbookRepository.cardbookServerDiscoveryRequest[aDirPrefId]);
					cardbookRepository.cardbookLog.updateStatusProgressInformationWithDebug1(cardbookRepository.gDiscoveryDescription + " : debug mode : cardbookRepository.cardbookServerDiscoveryResponse : ", cardbookRepository.cardbookServerDiscoveryResponse[aDirPrefId]);
					cardbookRepository.cardbookLog.updateStatusProgressInformationWithDebug1(cardbookRepository.gDiscoveryDescription + " : debug mode : cardbookRepository.cardbookServerDiscoveryError : ", cardbookRepository.cardbookServerDiscoveryError[aDirPrefId]);
					cardbookRepository.cardbookLog.updateStatusProgressInformationWithDebug1(cardbookRepository.gDiscoveryDescription + " : debug mode : cardbookRepository.cardbookServerValidation : ", cardbookRepository.cardbookServerValidation[aDirPrefId]);
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

	loadFile: function (aFile, aDirPrefId, aTarget, aImportMode, aActionId) {
		var params = {};
		params["showError"] = true;
		params["aFile"] = aFile;
		params["aTarget"] = aTarget;
		params["aImportMode"] = aImportMode;
		params["aPrefId"] = aDirPrefId;
		params["aPrefIdType"] = cardbookRepository.cardbookPreferences.getType(aDirPrefId);
		params["aPrefIdName"] = cardbookRepository.cardbookPreferences.getName(aDirPrefId);
		params["aPrefIdUrl"] = cardbookRepository.cardbookPreferences.getUrl(aDirPrefId);
		params["aPrefIdVersion"] = cardbookRepository.cardbookPreferences.getVCardVersion(aDirPrefId);
		params["aPrefIdDateFormat"] = cardbookRepository.getDateFormat(aDirPrefId, cardbookRepository.cardbookPreferences.getVCardVersion(aDirPrefId));
		if (aActionId) {
			params["aActionId"] = aActionId;
			cardbookRepository.currentAction[aActionId].totalCards++;
		}
		cardbookSynchronization.getFileDataAsync(aFile.path, cardbookSynchronization.loadFileAsync, params);
	},
			
	loadFileAsync: function (aContent, aParams) {
		try {
			if (aContent) {
				var re = /[\n\u0085\u2028\u2029]|\r\n?/;
				var fileContentArray = cardbookRepository.cardbookUtils.cleanArrayWithoutTrim(aContent.split(re));

				var fileContentArrayLength = fileContentArray.length
				for (let i = 0; i < fileContentArrayLength; i++) {
					if (fileContentArray[i].toUpperCase() == "BEGIN:VCARD") {
						cardbookRepository.cardbookServerCardSyncTotal[aParams.aPrefId]++;
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
										cardbookRepository.cardbookServerCardSyncError[aParams.aPrefId]++;
										cardbookRepository.cardbookServerCardSyncDone[aParams.aPrefId]++;
									}
								} else {
									if (aParams.aImportMode.startsWith("NOIMPORT")) {
										if (aParams.aPrefIdType === "DIRECTORY") {
											cardbookRepository.cardbookUtils.setCacheURIFromValue(myCard, aParams.aFile.leafName)
											cardbookRepository.addCardToRepository(myCard, false);
										} else if (aParams.aPrefIdType === "FILE") {
											myCard.cardurl = "";
											cardbookRepository.addCardToRepository(myCard, false);
										}
									} else {
										cardbookSynchronization.importCard(myCard, aParams.aTarget, true, aParams.aPrefIdVersion, myCard.version, aParams.aPrefIdDateFormat,
																				aParams.aActionId);
									}
									cardbookRepository.cardbookServerCardSyncDone[aParams.aPrefId]++;
								}
							}}, Components.interfaces.nsIEventTarget.DISPATCH_SYNC);
						}
						catch (e) {
							if (e.message == "") {
								cardbookRepository.cardbookUtils.formatStringForOutput("parsingCardError", [aParams.aPrefIdName, cardbookRepository.extension.localeData.localizeMessage(e.code), cardContent], "Error");
							} else {
								cardbookRepository.cardbookUtils.formatStringForOutput("parsingCardError", [aParams.aPrefIdName, e.message, cardContent], "Error");
							}
							cardbookRepository.cardbookServerCardSyncError[aParams.aPrefId]++;
							cardbookRepository.cardbookServerCardSyncDone[aParams.aPrefId]++;
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
					cardbookRepository.cardbookServerCardSyncDone[aParams.aPrefId]++;
				}
				cardbookRepository.cardbookUtils.formatStringForOutput("fileEmpty", [aParams.aFile.path]);
			}
			cardbookRepository.cardbookFileResponse[aParams.aPrefId]++;
			if (aParams.aActionId) {
				cardbookRepository.currentAction[aParams.aActionId].doneCards++;
			}
		}
		catch (e) {
			cardbookRepository.cardbookLog.updateStatusProgressInformation("cardbookSynchronization.loadFileAsync error : " + e, "Error");
			cardbookRepository.cardbookFileResponse[aParams.aPrefId]++;
		}
	},

	loadCSVFile: function (aFile, aDirPrefId, aTarget, aImportMode, aActionId) {
		var params = {};
		params["showError"] = true;
		params["aFile"] = aFile;
		params["aTarget"] = aTarget;
		params["aImportMode"] = aImportMode;
		params["aPrefId"] = aDirPrefId;
		params["aPrefIdType"] = cardbookRepository.cardbookPreferences.getType(aDirPrefId);
		params["aPrefIdName"] = cardbookRepository.cardbookPreferences.getName(aDirPrefId);
		params["aPrefIdUrl"] = cardbookRepository.cardbookPreferences.getUrl(aDirPrefId);
		params["aPrefIdVersion"] = cardbookRepository.cardbookPreferences.getVCardVersion(aDirPrefId);
		params["aPrefIdDateFormat"] = cardbookRepository.getDateFormat(aDirPrefId, cardbookRepository.cardbookPreferences.getVCardVersion(aDirPrefId));
		if (aActionId) {
			params["aActionId"] = aActionId;
			cardbookRepository.currentAction[aActionId].totalCards++;
		}
		cardbookSynchronization.getFileDataAsync(aFile.path, cardbookSynchronization.loadCSVFileAsync, params);
	},

	loadCSVFileAsync: function (aContent, aParams) {
		try {
			if (aContent) {
				var result = cardbookRepository.cardbookUtils.CSVToArray(aContent);
				var fileContentArray = result.result;
				var myDelimiter = result.delimiter;
				if (myDelimiter) {
					var myHeader = fileContentArray[0].join(myDelimiter);
				} else {
					var myHeader = fileContentArray[0];
				}
				
				var myArgs = {template: [], headers: myHeader, includePref: false, lineHeader: true, columnSeparator: myDelimiter, mode: "import",
								filename: aParams.aFile.leafName, action: ""};
				var myWindow = Services.wm.getMostRecentWindow("mail:3pane").openDialog("chrome://cardbook/content/csvTranslator/wdw_csvTranslator.xhtml", "", cardbookRepository.modalWindowParams, myArgs);
				if (myArgs.action == "SAVE") {
					var result = cardbookRepository.cardbookUtils.CSVToArray(aContent, myArgs.columnSeparator);
					var fileContentArray = result.result;
					if (myArgs.lineHeader) {
						var start = 1;
					} else {
						var start = 0;
					}
					cardbookRepository.importConflictChoicePersist = false;
					cardbookRepository.importConflictChoice = "write";
					var fileContentArrayLength = fileContentArray.length
					cardbookRepository.cardbookServerCardSyncTotal[aParams.aPrefId] = fileContentArrayLength - start;
					for (var i = start; i < fileContentArrayLength; i++) {
						try {
							var myCard = new cardbookCardParser();
							myCard.dirPrefId = aParams.aPrefId;
							for (var j = 0; j < fileContentArray[i].length; j++) {
								if (myArgs.template[j]) {
									cardbookRepository.cardbookUtils.setCardValueByField(myCard, myArgs.template[j][0], fileContentArray[i][j]);
								}
							}
							myCard.version = cardbookRepository.cardbookPreferences.getVCardVersion(aParams.aPrefId);
							cardbookRepository.cardbookUtils.setCalculatedFields(myCard);
							if (myCard.fn == "") {
								cardbookRepository.cardbookUtils.getDisplayedName(myCard, myCard.dirPrefId,
																	[myCard.prefixname, myCard.firstname, myCard.othername, myCard.lastname, myCard.suffixname, myCard.nickname],
																	[myCard.org, myCard.title, myCard.role]);
							}
						}
						catch (e) {
							cardbookRepository.cardbookServerCardSyncError[aParams.aPrefId]++;
							cardbookRepository.cardbookServerCardSyncDone[aParams.aPrefId]++;
							if (e.message == "") {
								cardbookRepository.cardbookUtils.formatStringForOutput("parsingCardError", [aParams.aPrefIdName, cardbookRepository.extension.localeData.localizeMessage(e.code), fileContentArray[i]], "Error");
							} else {
								cardbookRepository.cardbookUtils.formatStringForOutput("parsingCardError", [aParams.aPrefIdName, e.message, fileContentArray[i]], "Error");
							}
							continue;
						}
						cardbookSynchronization.importCard(myCard, aParams.aTarget, true, aParams.aPrefIdVersion, myCard.version, aParams.aPrefIdDateFormat,
																aParams.aActionId);
						myCard = null;
						cardbookRepository.cardbookServerCardSyncDone[aParams.aPrefId]++;
					}
					if (aParams.aPrefIdType === "FILE") {
						cardbookRepository.reWriteFiles([aParams.aPrefId]);
					}
				}
			} else {
				cardbookRepository.cardbookUtils.formatStringForOutput("fileEmpty", [aParams.aFile.path]);
			}
			cardbookRepository.cardbookFileResponse[aParams.aPrefId]++;
			if (aParams.aActionId) {
				cardbookRepository.currentAction[aParams.aActionId].doneCards++;
			}
		}
		catch (e) {
			cardbookRepository.cardbookLog.updateStatusProgressInformation("cardbookSynchronization.loadCSVFileAsync error : " + e, "Error");
			cardbookRepository.cardbookFileResponse[aParams.aPrefId]++;
		}
	},

	importCard: function (aCard, aTarget, aAskUser, aTargetVersion, aDateFormatSource, aDateFormatTarget, aActionId) {
		try {
			var myTargetPrefId = cardbookRepository.cardbookUtils.getAccountId(aTarget);
			var myTargetPrefIdName = cardbookRepository.cardbookPreferences.getName(myTargetPrefId);

			var aNewCard = new cardbookCardParser();
			cardbookRepository.cardbookUtils.cloneCard(aCard, aNewCard);
			aNewCard.dirPrefId = myTargetPrefId;

			// conversion ?
			if (cardbookRepository.cardbookUtils.convertVCard(aNewCard, myTargetPrefIdName, aTargetVersion, aDateFormatSource, aDateFormatTarget)) {
				cardbookRepository.writePossibleCustomFields();
			}

			var myNodeType = "";
			var myNodeName = "";
			var mySepPosition = aTarget.indexOf("::",0);
			if (mySepPosition != -1) {
				var nodeArray = cardbookRepository.cardbookUtils.escapeStringSemiColon(aTarget).split("::");
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
						aNewCard.org = cardbookRepository.cardbookUtils.unescapeStringSemiColon(nodeArray.join(";"));
					} else {
						aNewCard.org = "";
					}
				}
			}

			if (aAskUser && !cardbookRepository.importConflictChoicePersist && cardbookRepository.cardbookCards[myTargetPrefId+"::"+aNewCard.uid]) {
				var message = cardbookRepository.extension.localeData.localizeMessage("cardAlreadyExists", [myTargetPrefIdName, aNewCard.fn]);
				var confirmMessage = cardbookRepository.extension.localeData.localizeMessage("askUserPersistMessage");
				var askUserResult = cardbookSynchronization.askUser("card", message, "keep", "update", "duplicate", "merge", confirmMessage, false);
				cardbookRepository.importConflictChoice = askUserResult.result;
				cardbookRepository.importConflictChoicePersist = askUserResult.resultConfirm;
				if (cardbookRepository.importConflictChoicePersist) {
					cardbookRepository.cardbookUtils.notifyObservers("importConflictChoicePersist");
				}
			}
			switch (cardbookRepository.importConflictChoice) {
				case "cancel":
				case "keep":
					break;
				case "duplicate":
					aNewCard.cardurl = "";
					aNewCard.fn = aNewCard.fn + " " + cardbookRepository.extension.localeData.localizeMessage("fnDuplicatedMessage");
					cardbookRepository.cardbookUtils.setCardUUID(aNewCard);
					cardbookRepository.saveCard({}, aNewCard, aActionId, true);
					break;
				case "write":
					cardbookRepository.saveCard({}, aNewCard, aActionId, true);
					break;
				case "update":
					if (cardbookRepository.cardbookCards[myTargetPrefId+"::"+aNewCard.uid]) {
						var myTargetCard = cardbookRepository.cardbookCards[myTargetPrefId+"::"+aNewCard.uid];
						cardbookRepository.saveCard(myTargetCard, aNewCard, aActionId, true);
					} else {
						cardbookRepository.saveCard({}, aNewCard, aActionId, true);
					}
					break;
				case "merge":
					var myTargetCard = cardbookRepository.cardbookCards[myTargetPrefId+"::"+aNewCard.uid];
					var myArgs = {cardsIn: [myTargetCard, aNewCard], cardsOut: [], hideCreate: false, action: ""};
					var myWindow = Services.wm.getMostRecentWindow("mail:3pane").openDialog("chrome://cardbook/content/mergeCards/wdw_mergeCards.xhtml", "", cardbookRepository.modalWindowParams, myArgs);
					if (myArgs.action == "CREATE") {
						cardbookRepository.saveCard({}, myArgs.cardsOut[0], aActionId, true);
					} else if (myArgs.action == "CREATEANDREPLACE") {
						cardbookRepository.currentAction[aActionId].totalCards = cardbookRepository.currentAction[aActionId].totalCards + myArgs.cardsIn.length;
						cardbookRepository.deleteCards(myArgs.cardsIn, aActionId);
						cardbookRepository.saveCard({}, myArgs.cardsOut[0], aActionId, true);
					}
					break;
			}

			// inside same account to a category
			if (aTarget != aCard.dirPrefId && myNodeType == "categories") {
				if (myNodeName && myNodeName != cardbookRepository.cardbookUncategorizedCards) {
					cardbookRepository.cardbookUtils.formatStringForOutput("cardAddedToCategory", [myTargetPrefIdName, aNewCard.fn, myNodeName]);
				} else if (myNodeName && myNodeName == cardbookRepository.cardbookUncategorizedCards) {
					cardbookRepository.cardbookUtils.formatStringForOutput("cardDeletedFromAllCategory", [myTargetPrefIdName, aNewCard.fn]);
				}
			}
		}
		catch (e) {
			cardbookRepository.cardbookLog.updateStatusProgressInformation("wdw_cardbook.importCard error : " + e, "Error");
		}
	},

	writeCardsToFile: function (aFileName, aListofCard, aMediaConversion) {
		try {
			var output = cardbookRepository.cardbookUtils.getDataForUpdatingFile(aListofCard, aMediaConversion);

			cardbookRepository.cardbookUtils.writeContentToFile(aFileName, output, "UTF8");
		}
		catch (e) {
			cardbookRepository.cardbookLog.updateStatusProgressInformation("cardbookSynchronization.writeCardsToFile error : " + e, "Error");
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
					myFile.append(cardbookRepository.cardbookUtils.getFileNameForCard(aDirName, myCard.fn, myCard.uid));
					if (myFile.exists() == false){
						myFile.create(Components.interfaces.nsIFile.NORMAL_FILE_TYPE, 420);
					}
					// then write the files one by one to avoid freeze
					Services.tm.currentThread.dispatch({ run: function() {
							cardbookRepository.cardbookUtils.writeContentToFile(myFile.path, cardbookRepository.cardbookUtils.cardToVcardData(myCard, aMediaConversion), "UTF8");
					}}, Components.interfaces.nsIEventTarget.DISPATCH_SYNC);
				}
			}}, Components.interfaces.nsIEventTarget.DISPATCH_NORMAL);
		}
		catch (e) {
			cardbookRepository.cardbookLog.updateStatusProgressInformation("cardbookSynchronization.writeCardsToDir error : " + e, "Error");
		}
	}
};
