The documented API for accessing Exchange is Exchange Web Services (EWS). This was introduced in Exchange 2007. By default this uses HTTP authentication (either Basic or NTLM). Although forms authentication is supported by EWS, third-party OAuth providers generally only offer solutions for Outlook Web Access (OWA). As such, EWS is often unavailable from the Internet. However, many EWS concepts are relevant to OWA, particularly as the OWA backend itself uses EWS.

Before you can use any OWA API, it is first necessary to authenticate to OWA. Any attempt to POST to an OWA API without authentication will result in a 440 response. Any attempt to GET an OWA page without authentication will result in a redirection to the OWA JavaScript detection page. JavaScript on that page then redirects to the full OWA logon page. Successfully submitting the form on that page will results in a number of cookies being set on the client. These cookies represent the logon session.

Three OWA API endpoints have been identified so far.

- `POST /owa/sessiondata.ashx`

  OWA invokes this API once as part of startup. The API has no required parameters (although authentication cookies are of course required) and returns a JSON object which includes the following properties:

  - `owaUserConfig`
    This provides information about the mailbox, such as its quota, plus additionally it appears to be used by OWA to persist user options.
  - `findFolders`
    This appears to be the result of an EWS API to enumerate the user's folders. There may be a limit of 10,000 folders in this list. No other OWA API has yet been determined to discover folders. The data returned for each folder includes:
  - `FolderID`: The folder's EWS Id and ChangeKey
  - `ParentFolderID`: The folder's parent's EWS Id and ChangeKey
  - `FolderClass`: The class of the folder (mail/calendar/contacts etc.)
  - `DisplayName`: The folder's display name
  - `TotalCount`: The total number of items in the folder
  - `UnreadCount`: The number of unread items in the folder
  - `ChildFolderCount`: The number of child folders
  - `findMailFolderItem`
    This appears to be the result of an EWS API to retrieve the user's most recent Inbox messages. It is not yet known what the limitations of this list are. Note that there is a known OWA API to retrive items from arbitrary folders so it is not necessary to rely on this data.

- `GET /owa/service.svc/s/GetFileAttachment?id={id}&X-OWA-CANARY={cookie}`

  This API is used to fetch decoded attachments. The `id` can be any valid attachment EWS Id as returned by e.g. the `GetItem` API call. The `cookie` must be the value of the `X-OWA-CANARY` cookie previously set as part of authentication. Both the parameter and the cookies are required for successful authentication.

  OWA makes use of this API in at least two ways:
  - When downloading an attachment
  - When displaying inline images in draft messages

  Note that OWA uses a different mechanism for displaying inline images in normal message bodies that involves client-side script. The behaviour of this mechanism is not yet fully understood.

- POST /owa/service.svc

  All the remaining known OWA APIs are invoked through this endpoint. This endpoint requires three parameters: the action, some JSON data, and the `X-OWA-CANARY`, as well as the authentication cookies. The action and `X-OWA-CANARY` are sent as HTTP headers in the request. The data can be sent either as the POST body or URL encoded as an HTTP header `X-OWA-UrlPostData` in the request; either appears to be accepted by the OWA endpoint, and as such the front end is inconsistent as to which form it uses, although it usually prefers the URL encoded HTTP header. The front end also sends a number of other parameters however they all appear to be optional.

  The data is not an optional parameter. As such, for API calls that take no data, such as the password expiry API, the client simply sends an empty JSON object `{}`. However for API calls that take data each JavaScript object must be annotated with its class. This appears to be an artefact of the way the JSON must be converted into SOAP for the underlying EWS request.

  The top-level JavaScript object corresponds to the action being invoked, so for instance the `__type` of a "FindItem" action is "FindItemJsonRequest:#Exchange" while the `__type` of a "GetItem" action is "GetItemJsonRequest:#Exchange". Within that top-level object there are always two objects:
  - a `Header` object whose `__type` is always "JsonRequestHeaders:#Exchange"; this has a required `RequestServerVersion` property whose value is usually "Exchange2013", and an optional `TimeZoneContext` object of `__type` "TimeZoneContext:#Exchange" which has a required property `TimeZoneDefinition` object of `__type` "TimeZoneDefinition" which has a required property `Id` which is the name of a time zone, e.g. "GMT Standard Time". According to the EWS API a `TimeZoneDefinition` can have additional propertes but the OWA client has not been seen to use them.
  - a `Body` object whose type and properties corresponds to the action being invoked; "FindItemRequest:#Exchange" for a "FindItem" action and "GetItemRequest:#Exchange" for a "GetItem" action.

  Two of the APIs available through this endpoint are as follows:

  - "FindItem"

    An action of "FindItem" can be used to search for messages. At the basic level, it can be used simply to enumerate messages in a folder. The `Body` of a "FindItem" action includes the following properties:
    - `ItemShape`: This is an object of `__type` "FindItemRequest:#Exchange". It has a required property `BaseShape` that identifies the message attributes that are to be included in the result. EWS values for `BaseShape` are "IdOnly", "Default" and "AllProperties", although the OWA client only appears to use "IdOnly"; see the "ShapeName" property below.
    - `ParentFolderIds`: This is an array of objects of `__type`"FolderId:#Exchange" which have a required property `Id` which is the EWS Id of the folder. The OWA client has only been seen to pass a single folder at a time.
    - `Traversal`: This appears to be a required EWS property with the values "Shallow" (search given folders), "SoftDeleted" (search items deleted from Deleted Items) or "Associated". The OWA client has only been seen using "Shallow".
    - `Paging`: This is an object of `__type` IndexedPageView:#Exchange". It contains three properties, `BasePoint`, `Offset` and `MaxEntriesReturned`. This appears to correspond to the EWS property `IndexedPageItemView` which is an object with the same properties.
    - `ViewFilter`: The meaning of this property is as yet unknown. The OWA client has been seen to pass the value "All" for this property.
    - `IsWarmUpSearch`: The meaning of this property is as yet unknown. The OWA client has been seen to pass the value `false` for this property.
    - `FocusedViewFilter`: The meaning of this property is as yet unknown. The OWA client has been seen to pass the value `-1` for this property.
    - `Grouping`: The meaning of this property is as yet unknown. The OWA client has been seen to pass the value `null` for this property.
    - `ShapeName`: This appears to ba an OWA-specific property that requests a certain set of message properties in the response, in a similar way to the `BaseShape` property, but with an unknown mapping. The OWA client has been seen to pass the value "MailListItem" for this property. If this property is not passed, then the `BaseShape` property determins the returned message properties.
    - `SortOrder`: This is an optional array of objects of `__type` "SortResults:#Exchange". Each of these objects appears to resemble a `FieldOrder` EWS obejct. They have a required property `Order` which has only been seen to be "Descending" although the EWS API would support "Ascending", and a required property `FieldURI`. This property is slightly different to the EWS API property, as the OWA client uses the value "DateTimeCreated", although the EWS API accepts an object with a property `FieldURI` having the value "item:DateTimeCreated".

  - "GetItem"

    An action of "GetItem" can be used to retrieve properties for items found by "FindItem" that were not retrieved at the time, either because they were not requested, or they are properties not supported by "FindItem"; in particular although "FindItem" will return the `HasAttachments` property it will not return the list of attachments, nor will it return the message body. The body of a "GetItem" action includes the following properties:
    - `ItemShape`: See above. EWS supports the `IncludeMimeContent` property of the `ItemShape` object, although the OWA client has not been observed to use this; instead, it has been seen to use the following properties:
      - `FilterHtmlContent`: `true` This property is documented in the EWS API.
      - `BlockExternalImagesIfSenderUntrusted`: `true` The meaning of this property is as yet unknown.
      - `BlockContentFromUnknownSenders`: `false` The meaning of this property is as yet unknown.
      - `AddBlankTargetToLinks`: `true` This property is documented in the EWS API, but it is not explicitly linked from the `ItemShape` property.
      - `ClientSupportsIrm`: `true` The meaning of this property is as yet unknown.
      - `InlineImageUrlTemplate`: One of two image templates depending on whether a draft is being edited (in which case it is a `GetFileAttachment` URL, see above) or a message is being viewed (in which case it is a 1x1 pixel). This property is documented in the EWS API, but it is not explicitly linked from the `ItemShape` property.
      - `FilterInlineSafetyTips`: `true` The meaning of this property is as yet unknown.
      - `MaximumBodySize`: `2097152` This property is documented in the EWS API, but it is not explicitly linked from the `ItemShape` property.
      - `MaximumRecipientsToReturn`: `20` The meaning of this property is as yet unknown.
      - `CssScopeClassName`: The returned HTML is wrapped in a `<div>` element with this class name.
      - `InlineImageUrlOnLoadTemplate`: `InlineImageLoader.GetLoader().Load(this)` The purpose of this value is unclear; it appears to be a snippet of JavaScript that is used by the OWA client to trigger the loading of inline images. (The OWA JavaScript that this invokes has been minified.)
      - `InlineImageCustomDataTemplate`: `{id}` The purpose of this value appears to be to add a custom attribute to inline images so that the OWA client can load the inline images.
    - `ItemIds`: This is an array of objects of `__type`"ItemId:#Exchange" which have a required property `Id` which is the EWS Id of the item. The OWA client has only been seen to request a single item at a time.
    - `ShapeName`: See above. The OWA client has been seen using the values "MessageDetails" and "ItemNormalizedBody" for this property. "MessageDetails" returns the MIME headers (not for drafts or sent items) while "ItemNormalizedBody" returns the HTML body.
    - `InternetMessageId`: The OWA client has only been seen to pass `null` for this optional property. The meaning of this property is as yet unknown. Although the EWS API has such a property, it is not documented as being applicable to the "GetItem" action.

Here is an example of an API request to retrive the MIME headers of a message and its response. Note that this is a capture of an OWA client action, and therefore includes optional data which does not appear to affect the operation of the request.

    POST /owa/service.svc?action=GetItem&EP=1&ID=-30&AC=1 HTTP/1.1
    Host: mex09.emailsrvr.com
    User-Agent: Mozilla/5.0 (Windows NT 10.0; WOW64; rv:62.0) Gecko/20100101 Firefox/62.0
    Accept: */*
    Accept-Language: en-GB,en;q=0.5
    Accept-Encoding: gzip, deflate, br
    X-Requested-With: XMLHttpRequest
    X-OWA-UrlPostData: %7B%22__type%22%3A%22GetItemJsonRequest%3A%23Exchange%22%2C%22Header%22%3A%7B%22__type%22%3A%22JsonRequestHeaders%3A%23Exchange%22%2C%22RequestServerVersion%22%3A%22Exchange2013%22%2C%22TimeZoneContext%22%3A%7B%22__type%22%3A%22TimeZoneContext%3A%23Exchange%22%2C%22TimeZoneDefinition%22%3A%7B%22__type%22%3A%22TimeZoneDefinitionType%3A%23Exchange%22%2C%22Id%22%3A%22GMT%20Standard%20Time%22%7D%7D%7D%2C%22Body%22%3A%7B%22__type%22%3A%22GetItemRequest%3A%23Exchange%22%2C%22ItemShape%22%3A%7B%22__type%22%3A%22ItemResponseShape%3A%23Exchange%22%2C%22BaseShape%22%3A%22IdOnly%22%7D%2C%22ItemIds%22%3A%5B%7B%22__type%22%3A%22ItemId%3A%23Exchange%22%2C%22Id%22%3A%22AAMkADNkN2MyZjZiLTk2MDMtNDQyZS04YmMxLTFiYzVkYjZmMGRkOABGAAAAAABD0FdhLPs3Tppmai3Nxoo4BwBnrIoZYeIiRoLiR1ztLw82AAAAAAEMAABnrIoZYeIiRoLiR1ztLw82AAAAABzaAAA%3D%22%7D%5D%2C%22ShapeName%22%3A%22MessageDetails%22%7D%7D
    Action: GetItem
    Content-Type: application/json; charset=utf-8
    X-OWA-CANARY: fWMP7TiZPkOqY9qLTdmDBnAe5Utu8dUIxpj1as6RiqtcOsHmNA5E02xEznAqBU31oHK-G3cXk0E.
    X-OWA-ClientBuildVersion: 15.1.1466.3
    X-OWA-ActionName: GetItemAction
    X-OWA-Attempt: 1
    X-OWA-ActionId: -30
    X-OWA-CorrelationId: A77A2AD862AF4D45ACEE96C17BB4B67E_153244107064853
    client-request-id: A77A2AD862AF4D45ACEE96C17BB4B67E_153244107064853
    X-OWA-ClientBegin: 2018-07-24T14:04:30.648
    Content-Length: 0
    Cookie: X-BackEndCookie=S-1-5-21-3556931835-2135714726-3216061193-959268=u56Lnp2ejJqBmcyZysqezs7SzM6Zz9LLzsea0p3Pm5nSnMbIzJ3Lx8bGzMrOgYHNz87H0s/H0s3Mq87Lxc/Lxc/H; ClientId=A77A2AD862AF4D45ACEE96C17BB4B67E; X-OWA-JS-PSD=1; PrivateComputer=true; cadata=xxacQrC4MNsjSP/Z1aHJYpfKGecIldTXSrnpC+vMW/z7FRtQ7tZakIa6bCSe3kvIyqM8fGbvpG3wyFUvWuhwvNei//DLC1xA8fjTohr9jBQyz7xjMFN3mwyKKZ2mvQdEx22rTfKEBVCYes+6eM0z3A==; cadataTTL=bOR/TlEm8JqqWviKZUkKog==; cadataKey=A2Wsh6+gFiZoTwUFdOTfEYJoXa22cGeYiRwpo4zzxzW7h4sZGOib6NnIiLKsqyWH5yG9ug/mi6Uah75zrPL8IAOYD1eq5OZWbYNpdpOwCI/IOFTDF7hzB2iaPDlsRvePtMF8bF+uplE7qSNs9hkwO6eZjNWYm5u9ZOKZo5wy1QbLLFGNStHF/y33iWa5+mQCOcFPgWsElGPGx+PnJ4Ylkc4Wvr+omjqLaSjigDdCWGyRoCxgKac2VGtyj8WnVQ30WJh/dMCknFRdsnGvH2xXXdo//oUpHxdGCGsvZ+uQF6oukAAIE4XWj5KM1gKHCYjvD836EEcbxphe8HKTie9pjA==; cadataIV=Hultt/Fq43iDdfN8M/APXzsEnhL0Y/6UELaGsmrFcuoAA6zrldRspi1KHGGXzfpAtMZWNUCTysOIWrXwtjwwgx6wEl8ZxiXiqkvcG1YZOY9UAYkE/ge/TML7bs20XY7Cj4aSq3nLsk6mqh5IcbmO8W8kyNU/8xJmtEObTRqum7fgOuMsJy0RD2nuqMl37ULR8D5v6xCwc1jjqUTu4/hZyM7TMfHqjToh0TBnDrasHhZ74Qowm6r57OvfJ53xhHIFTc0+EIsNrJVQXVlYysccCTnezVCEqGK6nb1ysfThN9Gpm0SC7tTM5wygxs0jHX9GXA4Ck8n4lp79XAXIXMIm6g==; cadataSig=YENLgzs0pfCsWtTqlnzGmsQDRVBxoKU+CX/8JwIuPxP/kW7Bngwu+WrH7O2Y2KPf3JAwqpLuWx2O/LKU7VxGmE7DEIIox/BQ03WHiYqRvcL1Z+6S6pLChw6MA3D+g9FPYJ6JL+1uYPJCBsCMT9nfJ+UN3/1qE2FRVtGnbd89/s6nB9WG9514HkHJ4hIP97peVI70XfHqU3Oa+9bsHzi3PwM7wzmtipWZqjZcAhPIqKPzyMuFjQVJkHPz7yuosyg/hCJovvrTJgQhSGKqIEvQobrE7BspIkuA1aqi8sfMofY6rg8ldSNfk/AW207vqMDEFASSRIhfoCjWn0WpADYi9g==; UC=c07e25d73b774a408f707c3cc4f2e0db; X-OWA-CANARY=fWMP7TiZPkOqY9qLTdmDBnAe5Utu8dUIxpj1as6RiqtcOsHmNA5E02xEznAqBU31oHK-G3cXk0E.; AppcacheVer=15.1.1466.3:en-gbbase
    Connection: keep-alive

    HTTP/1.1 200 OK
    Cache-Control: no-cache, no-store
    Pragma: no-cache
    Transfer-Encoding: chunked
    Content-Type: application/json; charset=utf-8
    Expires: -1
    Server: Microsoft-IIS/8.5
    request-id: f2849314-044d-4be8-ad57-780fde9e4014
    X-CalculatedBETarget: mbx09c-ord1.mex09.mlsrvr.com
    X-Content-Type-Options: nosniff
    X-OWA-Version: 15.1.1466.3
    X-OWA-OWSVersion: V2017_07_16
    X-OWA-MinimumSupportedOWSVersion: V2_6
    X-OWA-HttpHandler: true
    X-OWA-DiagnosticsInfo: 7;0;4
    X-OWA-CorrelationId: A77A2AD862AF4D45ACEE96C17BB4B67E_153244107064853
    X-OWA-ClientBegin: 2018-07-24T14:04:30.648
    X-FrontEnd-Begin: 2018-07-24T09:04:30.771
    X-BackEnd-Begin: 2018-07-24T09:04:30.854
    X-FrontEnd-Handler-Begin: 2018-07-24T09:04:30.771
    X-BackEnd-End: 2018-07-24T09:04:30.870
    X-DiagInfo: MBX09C-ORD1
    X-BEServer: MBX09C-ORD1
    X-UA-Compatible: IE=EmulateIE7
    X-AspNet-Version: 4.0.30319
    Set-Cookie: X-OWA-CANARY=H66-MWcnrECVUVpZg2MBIkBMYmBu8dUI7AiHZlBVN-CFOo8hlINtIEnoNe40L1R_n0VULuuBWpY.; path=/; secure
    X-BackEndCookie=S-1-5-21-3556931835-2135714726-3216061193-959268=u56Lnp2ejJqBmcyZysqezs7SzM6Zz9LLzsea0p3Pm5nSnMbIzJ3Lx8bGzMrOgYHNz87H0s/H0s3Mq87Lxc/LxczP; expires=Thu, 23-Aug-2018 14:04:30 GMT; path=/owa; secure; HttpOnly
    X-FrontEnd-End: 2018-07-24T09:04:30.787
    X-Powered-By: ASP.NET
    X-FEServer: MBX01D-ORD1
    Date: Tue, 24 Jul 2018 14:04:30 GMT
    
    {"Header":{"ServerVersionInfo":{"MajorVersion":15,"MinorVersion":1,"MajorBuildNumber":1466,"MinorBuildNumber":3,"Version":"V2017_07_11"}},"Body":{"ResponseMessages":{"Items":[{"__type":"ItemInfoResponseMessage:#Exchange","ResponseCode":"NoError","ResponseClass":"Success","Items":[{"__type":"Message:#Exchange","ItemId":{"ChangeKey":"CQAAABYAAABnrIoZYeIiRoLiR1ztLw82AAAAACEn","Id":"AAMkADNkN2MyZjZiLTk2MDMtNDQyZS04YmMxLTFiYzVkYjZmMGRkOABGAAAAAABD0FdhLPs3Tppmai3Nxoo4BwBnrIoZYeIiRoLiR1ztLw82AAAAAAEMAABnrIoZYeIiRoLiR1ztLw82AAAAABzaAAA="},"ExtendedProperty":[{"ExtendedFieldURI":{"PropertyTag":"0x7d","PropertyType":"String"},"Value":"Received: ...\u000d\u000a"}]}]}]}}}

The X-OWA-UrlPostData request header corresponds to the following JavaScript object:

    {
        __type: "GetItemJsonRequest:#Exchange",
        Header: {
            __type: "JsonRequestHeaders:#Exchange",
            RequestServerVersion: "Exchange2013",
            TimeZoneContext: {
                __type: "TimeZoneContext:#Exchange",
                TimeZoneDefinition: {
                    __type: "TimeZoneDefinitionType:#Exchange",
                    Id: "GMT Standard Time",
                },
            },
        },
        Body: {
            __type: "GetItemRequest:#Exchange",
            ItemShape: {
                __type: "ItemResponseShape:#Exchange",
                BaseShape: "IdOnly",
            },
            ItemIds: [{
                __type: "ItemId:#Exchange",
                Id: "AAMkADNkN2MyZjZiLTk2MDMtNDQyZS04YmMxLTFiYzVkYjZmMGRkOABGAAAAAABD0FdhLPs3Tppmai3Nxoo4BwBnrIoZYeIiRoLiR1ztLw82AAAAAAEMAABnrIoZYeIiRoLiR1ztLw82AAAAABzaAAA=",
            }],
            ShapeName: "MessageDetails",
        },
    }

The response corresponds to the following JavaScript object:

    {
        Header: {
            ServerVersionInfo: {
                MajorVersion: 15,
                MinorVersion: 1,
                MajorBuildNumber: 1466,
                MinorBuildNumber: 3,
                Version: "V2017_07_11",
            },
        },
        Body: {
            ResponseMessages: {
                Items: [{
                    __type: "ItemInfoResponseMessage:#Exchange",
                    ResponseCode: "NoError",
                    ResponseClass: "Success",
                    Items: [{
                        __type: "Message:#Exchange",
                        ItemId: {
                            ChangeKey: "CQAAABYAAABnrIoZYeIiRoLiR1ztLw82AAAAACEn",
                            Id: "AAMkADNkN2MyZjZiLTk2MDMtNDQyZS04YmMxLTFiYzVkYjZmMGRkOABGAAAAAABD0FdhLPs3Tppmai3Nxoo4BwBnrIoZYeIiRoLiR1ztLw82AAAAAAEMAABnrIoZYeIiRoLiR1ztLw82AAAAABzaAAA=",
                        },
                        ExtendedProperty: [{
                            ExtendedFieldURI: {
                                PropertyTag: "0x7d",
                                PropertyType: "String",
                            },
                            Value: "Received: ...\r\n",
                        }],
                    }],
                }],
            },
        },
    }
