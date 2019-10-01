/*
 ***** BEGIN LICENSE BLOCK *****
 * This file is part of ExQuilla by Mesquilla.
 *
 * Copyright 2016 R. Kent James
 *
 * All Rights Reserved
 *
 * ***** END LICENSE BLOCK *****
 */

// Implements conversions from DOM EWS XML documents to PropertyList.

var EXPORTED_SYMBOLS = ["EWStoPL"];

var Cu = Components.utils;
var { Utils } = ChromeUtils.import("resource://exquilla/ewsUtils.jsm");
Utils.importLocally(this);
ChromeUtils.defineModuleGetter(this, "PropertyList",
                               "resource://exquilla/PropertyList.jsm");

var EWStoPL = {};

// namespaces
const nsTypes = "http://schemas.microsoft.com/exchange/services/2006/types";
const nsMessages = "http://schemas.microsoft.com/exchange/services/2006/messages";
const nsEnvelope = "http://schemas.xmlsoap.org/soap/envelope/";

const NoIndex = -1; // uint32_t(-1)

// parse a DOM element into a JS variant that can be appended to a PL
function domToVariant(element)
{
  let pl;
  // If the element as attributes, we'll need an attributes PL
  if (element.hasAttributes()) {
    pl = new PropertyList();
    let attributesPL = new PropertyList();
    let attributes = element.attributes;
    for (let i = 0; i < attributes.length; i++) {
      let attribute = attributes.item(i);
      attributesPL.appendString(attribute.name, attribute.value);
    }
    pl.appendPropertyList("$attributes", attributesPL);
  }
  if (element.childElementCount) {
    if (!pl)
      pl = new PropertyList();
    for (let child of element.children) {
      pl.appendElement(child.localName, domToVariant(child));
    }
    return pl; // cannot have a value
  }
  if (pl) {  // that is, had an attribute
    pl.appendString("$value", element.textContent);
    return pl;
  }
  return element.textContent;
}

// escape XML
const XML_CHAR_MAP = {
  '<': '&lt;',
  '>': '&gt;',
  '&': '&amp;',
  '"': '&quot;',
  "'": '&apos;'
};

function escapeXml(s) {
  return String(s).replace(/[<>&"']/g, ch => XML_CHAR_MAP[ch]);
}
const _ = escapeXml;

// parse a property list into xml text that can be inserted into a larger xml document
// Note: we are unconcerned here about proper SOAP order or namespace, let the soap request
// worry about ordering issues. This is used for persisting a property list, not
// for communication Exchange.
//
// @param elementName: the text name to give to the element, like "Message"
// #param serverVersion: a string representing the server version for this representation,
//                       such as "2007sp1".
// @param pl: the property list itself
//
function plToXML(elementName, serverVersion, pl)
{
  // handle attributes
  let attributes = serverVersion ?
                     ` ewstype="${serverVersion}"` : "";
  let attributesPL = pl.getPropertyList("$attributes");
  if (attributesPL) {
    // instead of xml elements, we return a list of attributes
    for (let i = 0; i < attributesPL.length; i++) {
      // We don't want to let a second ewstype leak into the attributes, also
      // we need no namespace.
      let name = attributesPL.getNameAt(i);
      if (name != "ewstype" && name != "xmlns" && name != "t:xmlns")
        attributes += ` ${name}="${_(attributesPL.getValueAt(i))}"`;
    }
  }

  let content = "";
  for (let i = 0; i < pl.length; i++) {
    let name = pl.getNameAt(i);
    if (name == "$attributes")
      continue; // handled above.
    let value = pl.getValueAt(i);
    if (value && value.PropertyList) {
      content += plToXML(name, null, value);
    }
    else {
      value = String(value);
      if (name == "$value")
        content += _(value);
      else
        content += `<${name}>${_(value)}</${name}>`;
    }
  }

  if (content.length)
    return `<${elementName + attributes}>${content}</${elementName}>`;
  return `<${elementName + attributes}/>`;
}

// parse a t:Folder element as a property list
function folderToPL(folderElement) {
  let folderPL = new PropertyList();
  let folderIds = folderElement.getElementsByTagNameNS(nsTypes, "FolderId");
  let folderId = folderIds ? folderIds[0] : null;
  let id = folderId ? folderId.getAttribute("Id") : "";
  if (id) {
    folderPL.setAttribute("Id", id);
  }
  let changeKey = folderId ? folderId.getAttribute("ChangeKey") : "";
  if (changeKey) {
    folderPL.setAttribute("ChangeKey", changeKey);
  }
  return folderPL;
}

// Given an id-type property list, generate XML attributes
function plToIdAttributes(pl)
{
  let result = `Id="${pl.getAString("$attributes/Id")}"`;
  let changeKey = pl.getAString("$attributes/ChangeKey");
  if (changeKey)
    result += ` ChangeKey="${changeKey}"`;
  return result;
}

// if a property list has an element, add that to an XML string (as .value
// of oString) , using variant conversion to manage the type conversion.
function plValueIfXML(pl, name)
{
  if (!pl)
    return "";
  // 0 might be a legitimate value, so be careful.
  let index = pl.indexOf(name);
  return (index >= 0 && index != NoIndex) ?
    `<${name}>${_(pl.getValueAt(index))}</${name}>` : "";
}

// return the XML to set a Boolean value read from a property list
function plBooleanXML(pl, name)
{
  if (!pl)
    return "";
  return `<${name}>${pl.getBoolean(name) ? "true": "false"}</${name}>`;
}

/*
Sender: oPL(
{
  Mailbox: oPL(
  { Name: "Kent James",
    EmailAddress: "kenttest@caspia.com",
    RoutingType: "SMTP"
  })
})
*/

// generate Mailbox XML element given the Mailbox pl
function plMailboxIfXML(MailboxPL)
{
  let xml = "";
  if (MailboxPL) {
    xml += `<Mailbox>`;
    xml += plValueIfXML(MailboxPL, "Name");
    xml += plValueIfXML(MailboxPL, "EmailAddress");
    xml += plValueIfXML(MailboxPL, "RoutingType");
    // Note we do not support MailboxType and ItemId here
    xml += `</Mailbox>`;
  }
  return xml;
}

function plRecipientIfXML(pl, name)
{
  if (!pl)
    return "";
  let MailboxPL = pl.getPropertyList(`${name}/Mailbox`);
  let xml = "";
  if (MailboxPL && MailboxPL.length) {
    xml += `<${name}>${plMailboxIfXML(MailboxPL)}</${name}>`;
  }
  return xml;
}

// output mailboxes to XML using a particular parent name
function plRecipientsIfXML(pl, name)
{
  if (!pl)
    return "";
  let xml = "";
  let toRecipients = pl.getPropertyLists(`${name}/Mailbox`);
  if (toRecipients && toRecipients.length) {
    xml += `<${name}>`;
    for (let i = 0; i < toRecipients.length; i++) {
      xml += plMailboxIfXML(toRecipients[i]);
    }
    xml += `</${name}>`;
  }
  return xml;
}

// generate entries (as XML strings) for ItemType from a PL. itemId and
// itemClass are handled separately as they are direct nativeItem properties.
//
// @param isCreate  boolean, true if this is a create (and therefore we should
//                  (not set properties that cannot be set on create)
function itemToItemXML(item, isCreate) {
  let xml = "";
  // pl can be null with mimeContent set
  let pl = item.properties || new PropertyList();
  let itemId = item.itemId;
  let changeKey = item.changeKey;
  let itemClass = item.itemClass;

  // If the item has non-empty MimeContent, we will use that in place of
  // the body.
  let hasMimeContent = !!(item.mimeContent);
  if (hasMimeContent) {
    let mimeContent64 = "";
    try {
      mimeContent64 = btoaUTF(item.mimeContent);
    } catch (e) { log.warn("We do not support Unicode mime content yet");}
    //let charSet = this.mimeCharacterSet ? ` CharacterSet="${this.mimeCharacterSet}"` : "";
    let charSet = "";
    xml += `<MimeContent${charSet}>${mimeContent64}</MimeContent>`;
  }

  // we exclude Attachments, ParentFolderId, DateTimeReceived, Size,
  // DisplayCC, DisplayTo, HasAttachments, InternetMessageId which EWS
  // does not let us set.

  let index;
  if (itemId && !isCreate)
    xml += `<ItemId Id="${itemId}"` +
           (changeKey ? ` ChangeKey="${changeKey}"/>` : "/>");

  if (itemClass)
    xml += `<ItemClass>${_(itemClass)}</ItemClass>`;

  xml += plValueIfXML(pl, "Subject", xml);

  // The body might be included in the pl, or directly on the item. Prefer
  // the pl if the property exists.
  if (!hasMimeContent) {
    let body;
    let bodyIsHTML;
    let bodyPL = pl.getPropertyList("Body");
    if (bodyPL && bodyPL.length) {
      bodyIsHTML = (bodyPL.getPropertyList("$attributes")
                          .getAString("BodyType")) == "HTML";
      body = bodyPL.getAString("$value");
    }
    else if (!item.isBodyEmpty) {
      body = item.body;
      bodyIsHTML = item.flags & item.BodyIsHtml;
    }
    if (body)
      xml += `<Body BodyType="${bodyIsHTML ? "HTML" : "Text"}">${_(body)}</Body>`;
  }

  let categories = pl.getPropertyList("Categories");
  if (categories && categories.length) {
    let strings = categories.getValues("String");
    if (strings && strings.length) {
      xml += `<Categories>`;
      for (let i = 0; i < strings.length; i++) {
        xml += `<String>${_(strings.queryElementAt(i, Ci.nsIVariant))}</String>`;
      }
      xml += `</Categories>`;
    }
  }

  xml += plValueIfXML(pl, "Importance");
  xml += plValueIfXML(pl, "InReplyTo");

  let extendedProperties = pl.getPropertyLists("ExtendedProperty");
  if (extendedProperties) {
    for (let plExtendedProperty of extendedProperties) {
      let propertyTag =
        plExtendedProperty.getAString("ExtendedFieldURI/$attributes/PropertyTag");
      let propertyType =
        plExtendedProperty.getAString("ExtendedFieldURI/$attributes/PropertyType");
      let propertyValue = plExtendedProperty.getAString("Value");
      xml += `<ExtendedProperty><ExtendedFieldURI` +
             ` PropertyTag="${propertyTag}" PropertyType="${propertyType}"/>` +
             `<Value>${propertyValue}</Value></ExtendedProperty>`;
    }
  }

  xml += plValueIfXML(pl, "Culture");
  return xml;
}

// create the XML for a Post item
function itemToPostXML(item, isCreate)
{
  let xml = itemToItemXML(item, isCreate);
  let pl = item.properties;

  // message:From
  xml += plRecipientIfXML(pl, "From");

  // message:InternetMessageId
  if (!isCreate) {
    // This seems to be created by the server
    xml += plValueIfXML(pl, "InternetMessageId");
  }

  // message:IsRead
  xml += plBooleanXML(pl, "IsRead");

  // message:References
  xml += plValueIfXML(pl, "References");

  // message::Sender
  xml += plRecipientIfXML(pl, "Sender");

  return xml;
}

// create XML for a message item
function itemToMessageXML(item, isCreate)
{
  let pl = item.properties;

  let xml = itemToItemXML(item, isCreate);

  xml += plRecipientIfXML(pl, "Sender");
  xml += plRecipientsIfXML(pl, "ToRecipients");
  xml += plRecipientsIfXML(pl, "CcRecipients");
  xml += plRecipientsIfXML(pl, "BccRecipients");
  xml += plBooleanXML(pl, "IsReadReceiptRequested");
  xml += plBooleanXML(pl, "IsDeliveryReceiptRequested");

  // ConversationIndex and ConversationTopic are not supported

  xml += plRecipientIfXML(pl, "From");

  // message:InternetMessageId
  if (!isCreate) {
    // This seems to be created by the server
    xml += plValueIfXML(pl, "InternetMessageId");
  }

  xml += plBooleanXML(pl, "IsRead");
  xml += plBooleanXML(pl, "IsResponseRequested");
  xml += plValueIfXML(pl, "References");
  xml += plRecipientsIfXML(pl, "ReplyTo");
  // EWS claims these are invalid to set
  if (!isCreate) {
    xml += plRecipientIfXML(pl, "ReceivedBy");
    xml += plRecipientIfXML(pl, "ReceivedRepresenting");
  }

  return xml;
}

/* Sample contact create XML


<?xml version="1.0"?>
<env:Envelope xmlns:env="http://schemas.xmlsoap.org/soap/envelope/" xmlns:enc="http://schemas.xmlsoap.org/soap/encoding/" xmlns:xs="http://www.w3.org/2001/XMLSchema" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
<env:Header>
    <RequestServerVersion xmlns="http://schemas.microsoft.com/exchange/services/2006/types" Version="Exchange2007_SP1"/>
</env:Header>
<env:Body>
    <CreateItem xmlns="http://schemas.microsoft.com/exchange/services/2006/messages">
    <SavedItemFolderId>
        <FolderId xmlns="http://schemas.microsoft.com/exchange/services/2006/types" Id="AAMkAGFkYTY1YjZkLTIyZjctNDcyNy1hMmU4LTU1ZDA5ZmJiZjYzMQAuAAAAAAChmrQMyFlTQqhQxGONw0aJAQDnL5cEvLu1Ro/1QGwGrPfJAACY+lzgAAA="/>
    </SavedItemFolderId>
    <Items>
        <Contact xmlns="http://schemas.microsoft.com/exchange/services/2006/types">
        <ItemClass>IPM.Contact</ItemClass>
        <Subject>a test item</Subject>
        <Body BodyType="Text">the body</Body>
        <Categories>
            <String>cat1</String>
            <String>cat2</String>
        </Categories>
        <Importance>Low</Importance>
        <InReplyTo>repliedMessageId</InReplyTo>
        <Culture>en-US</Culture>
        <FileAs>file as</FileAs>
        <DisplayName>display name</DisplayName>
        <GivenName>given name</GivenName>
        <Initials>initials</Initials>
        <MiddleName>middle name</MiddleName>
        <CompanyName>company name</CompanyName>
        <EmailAddresses>
            <Entry Key="EmailAddress1">somebody@example.org</Entry>
            <Entry Key="EmailAddress2">second@example.com</Entry>
        </EmailAddresses>
        <PhysicalAddresses>
            <Entry Key="Home">
                <Street>One Microsoft Way</Street>
                <City>Redmond</City>
                <State>WA</State>
            </Entry>
            <Entry Key="Business">
                <Street>10110 177th Ave NE</Street>
                <City>Redmond</City>
                <State>WA</State>
            </Entry>
        </PhysicalAddresses>
        <AssistantName>assistant name</AssistantName>
        <BusinessHomePage>http://example.com</BusinessHomePage>
        <Department>department</Department>
        <Generation>generation</Generation>
        <JobTitle>job title</JobTitle>
        <Manager>manager</Manager>
        <Mileage>mileage</Mileage>
        <OfficeLocation>office location</OfficeLocation>
        <Profession>profession</Profession>
        <SpouseName>spouse name</SpouseName>
        <Surname>surname</Surname>
    </Contact>
</Items>
</CreateItem>
</env:Body>
</env:Envelope>
*/

// create XML for a contact item
function itemToContactXML(item, isCreate)
{
  let pl = item.properties;

  let xml = itemToItemXML(item, isCreate);

  xml += plValueIfXML(pl, "FileAs");
  xml += plValueIfXML(pl, "DisplayName");
  xml += plValueIfXML(pl, "GivenName");
  xml += plValueIfXML(pl, "Initials");
  xml += plValueIfXML(pl, "MiddleName");
  xml += plValueIfXML(pl, "Nickname");
  xml += plValueIfXML(pl, "CompanyName");

  // dictionary type EmailAddresses
  let EmailAddressesEntries = pl.getPropertyLists("EmailAddresses/Entry");
  if (EmailAddressesEntries && EmailAddressesEntries.length) {
    xml += `<EmailAddresses>`;
    for (let entry of EmailAddressEntries) {
      let emailAddress = entry.getAString("$value");
      let key = entry.getAString("$attributes/Key");
      xml += `<Entry Key="${key}">${_(emailAddress)}</Entry>`;
    }
    xml += `</EmailAddresses>`;
  }

  // dictionary type PhysicalAddresses
  let PhysicalAddressesEntries = pl.getPropertyLists("PhysicalAddresses/Entry");
  if (PhysicalAddressesEntries && PhysicalAddressesEntries.length) {
    xml += `<PhysicalAddresses>`;
    for (let entry of PhysicalAddressesEntries) {
      let key = entry.getAString("$attributes/Key");
      xml += `<Entry Key="${key}">`;
      xml += plValueIfXML(entry, "Street");
      xml += plValueIfXML(entry, "City");
      xml += plValueIfXML(entry, "State");
      xml += plValueIfXML(entry, "CountryOrRegion");
      xml += plValueIfXML(entry, "PostalCode");
      xml += `</Entry>`;
    }
    xml += `</PhysicalAddresses>`;
  }

  // dictionary type PhoneNumbers
  let PhoneNumbersEntries = pl.getPropertyLists("PhoneNumbers/Entry");
  if (PhoneNumbersEntries && PhoneNumbersEntries.length) {
    xml += `<PhoneNumbers>`;
    for (let entry of PhoneNumbersEntries) {
      let phoneNumber = entry.getAString("$value");
      let key = entry.getAString("$attributes/Key");
      xml += `<Entry Key="${key}">${_(phoneNumber)}</Entry>`;
    }
    xml += `</PhoneNumbers>`;
  }

  xml += plValueIfXML(pl, "AssistantName");
  xml += plValueIfXML(pl, "BusinessHomePage");
  xml += plValueIfXML(pl, "Department");
  xml += plValueIfXML(pl, "Generation");

  // dictionary type ImAddresses
  let ImAddressesEntries = pl.getPropertyLists("ImAddresses/Entry");
  if (ImAddressesEntries && ImAddressesEntries.length) {
    xml += `<ImAddresses>`;
    for (let entry of ImAddressesEntries) {
      let imAddress = entry.getAString("$value");
      let key = entry.getAString("$attributes/Key");
      xml += `<Entry Key="${key}">${_(imAddress)}</Entry>`;
    }
    xml += `</ImAddresses>`;
  }

  xml += plValueIfXML(pl, "JobTitle");
  xml += plValueIfXML(pl, "Manager");
  xml += plValueIfXML(pl, "Mileage");
  xml += plValueIfXML(pl, "OfficeLocation");
  xml += plValueIfXML(pl, "Profession");
  xml += plValueIfXML(pl, "SpouseName");
  xml += plValueIfXML(pl, "Surname");

  return xml;
}

// create XML for a Distribution List item
function itemToDistListXML(item, isCreate)
{
  let xml = itemToItemXML(item, isCreate);
  let pl = item.properties;

  // contacts:DisplayName,
  xml += plValueIfXML(pl, "DisplayName");
  return xml;
}

// exports
EWStoPL.plToIdAttributes = plToIdAttributes;
EWStoPL.folderToPL = folderToPL;
EWStoPL.itemToItemXML = itemToItemXML;
EWStoPL.itemToPostXML = itemToPostXML;
EWStoPL.itemToMessageXML = itemToMessageXML;
EWStoPL.itemToContactXML = itemToContactXML;
EWStoPL.itemToDistListXML = itemToDistListXML;
EWStoPL.domToVariant = domToVariant;
EWStoPL.plToXML = plToXML;

/* Note item


<?xml version="1.0"?>
<s:Envelope xmlns:s="http://schemas.xmlsoap.org/soap/envelope/">
<s:Header>
    <h:ServerVersionInfo xmlns:h="http://schemas.microsoft.com/exchange/services/2006/types" xmlns="http://schemas.microsoft.com/exchange/services/2006/types" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" MajorVersion="14" MinorVersion="3" MajorBuildNumber="279" MinorBuildNumber="2" Version="Exchange2010_SP2"/>
</s:Header>
<s:Body xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema">
<m:GetItemResponse xmlns:m="http://schemas.microsoft.com/exchange/services/2006/messages" xmlns:t="http://schemas.microsoft.com/exchange/services/2006/types">
<m:ResponseMessages>
    <m:GetItemResponseMessage ResponseClass="Success">
        <m:ResponseCode>NoError</m:ResponseCode>
        <m:Items>
            <t:Message>
                <t:ItemId Id="AAMkAGFkYTY1YjZkLTIyZjctNDcyNy1hMmU4LTU1ZDA5ZmJiZjYzMQBGAAAAAAChmrQMyFlTQqhQxGONw0aJBwDnL5cEvLu1Ro/1QGwGrPfJAACY2ychAADnL5cEvLu1Ro/1QGwGrPfJAACY77xCAAA=" ChangeKey="CQAAABYAAADnL5cEvLu1Ro/1QGwGrPfJAACY775t"/>
                <t:ParentFolderId Id="AAMkAGFkYTY1YjZkLTIyZjctNDcyNy1hMmU4LTU1ZDA5ZmJiZjYzMQAuAAAAAAChmrQMyFlTQqhQxGONw0aJAQDnL5cEvLu1Ro/1QGwGrPfJAACY2ychAAA=" ChangeKey="AQAAAA=="/>
                <t:ItemClass>IPM.Note</t:ItemClass>
                <t:Subject>...hidden...</t:Subject>
                <t:Body BodyType="Text">...hidden...</t:Body>
                <t:DateTimeReceived>2014-02-28T20:06:18Z</t:DateTimeReceived>
                <t:Size>699</t:Size>
                <t:Categories>
                    <t:String>Yellow Category</t:String>
                    <t:String>Green Category</t:String>
                    <t:String>Blue Category</t:String>
                </t:Categories>
                <t:Importance>Normal</t:Importance>
                <t:InternetMessageHeaders>
                    <t:InternetMessageHeader HeaderName="Received">from mx04-1.sherweb2010.com (10.30.12.141) by S04-HUB004.s04.local (10.30.12.50) with Microsoft SMTP Server id 14.3.174.1; Fri, 28 Feb 2014 15:06:18 -0500</t:InternetMessageHeader>
                    <t:InternetMessageHeader HeaderName="Received">from mxout-07.mxes.net (mxout-07.mxes.net [216.86.168.182])	(using TLSv1 with cipher DHE-RSA-AES256-SHA)	by 74.115.207.212:25 (trex/4.3.101);	Fri, 28 Feb 2014 20:06:19 GMT</t:InternetMessageHeader>
                    <t:InternetMessageHeader HeaderName="Received">from [192.168.0.40] (unknown [76.22.116.39])	(using TLSv1 with cipher DHE-RSA-AES128-SHA (128/128 bits))	(No client certificate requested)	by smtp.mxes.net (Postfix) with ESMTPSA id 41AF722E255	for &lt;test@exquilla.com&gt;; Fri, 28 Feb 2014 15:06:10 -0500 (EST)</t:InternetMessageHeader>
                    <t:InternetMessageHeader HeaderName="X-MC-REJECTLIMIT">100</t:InternetMessageHeader>
                    <t:InternetMessageHeader HeaderName="X-MC-JUNKLIMIT">99</t:InternetMessageHeader>
                    <t:InternetMessageHeader HeaderName="X-MC-DATA">Organization Settings: Spam filtering disabled</t:InternetMessageHeader>
                    <t:InternetMessageHeader HeaderName="X-MC-RESULT">WHITELIST</t:InternetMessageHeader>
                    <t:InternetMessageHeader HeaderName="X-MC-CM-SCORE">0</t:InternetMessageHeader>
                    <t:InternetMessageHeader HeaderName="X-MC-DELIVER">INBOX</t:InternetMessageHeader>
                    <t:InternetMessageHeader HeaderName="Message-ID">&lt;5310EC2E.5070802@caspia.com&gt;</t:InternetMessageHeader>
                    <t:InternetMessageHeader HeaderName="Date">Fri, 28 Feb 2014 12:06:06 -0800</t:InternetMessageHeader>
                    <t:InternetMessageHeader HeaderName="User-Agent">Mozilla/5.0 (Windows NT 6.1; WOW64; rv:24.0) Gecko/20100101 Thunderbird/24.3.0</t:InternetMessageHeader>
                    <t:InternetMessageHeader HeaderName="MIME-Version">1.0</t:InternetMessageHeader>
                    <t:InternetMessageHeader HeaderName="Subject">url 4</t:InternetMessageHeader>
                    <t:InternetMessageHeader HeaderName="Content-Type">text/plain</t:InternetMessageHeader>
                    <t:InternetMessageHeader HeaderName="Content-Transfer-Encoding">7bit</t:InternetMessageHeader>
                    <t:InternetMessageHeader HeaderName="Return-Path">kent@caspia.com</t:InternetMessageHeader>
                    <t:InternetMessageHeader HeaderName="X-MS-Exchange-Organization-AuthSource">S04-HUB004.s04.local</t:InternetMessageHeader>
                    <t:InternetMessageHeader HeaderName="X-MS-Exchange-Organization-AuthAs">Anonymous</t:InternetMessageHeader>
                </t:InternetMessageHeaders>
                <t:DateTimeCreated>2014-02-28T20:06:18Z</t:DateTimeCreated>
                <t:DisplayCc/>
                <t:DisplayTo>Test User</t:DisplayTo>
                <t:HasAttachments>false</t:HasAttachments>
                <t:Culture>en-US</t:Culture>
                <t:Sender>
                    <t:Mailbox>
                        <t:Name>Kent James</t:Name>
                        <t:EmailAddress>kent@caspia.com</t:EmailAddress>
                        <t:RoutingType>SMTP</t:RoutingType>
                        <t:MailboxType>OneOff</t:MailboxType>
                    </t:Mailbox>
                </t:Sender>
                <t:ToRecipients>
                    <t:Mailbox>
                        <t:Name>Test User</t:Name>
                        <t:EmailAddress>test@exquilla.com</t:EmailAddress>
                        <t:RoutingType>SMTP</t:RoutingType>
                        <t:MailboxType>Mailbox</t:MailboxType>
                    </t:Mailbox>
                </t:ToRecipients>
                <t:From>
                    <t:Mailbox>
                        <t:Name>Kent James</t:Name>
                        <t:EmailAddress>kent@caspia.com</t:EmailAddress>
                        <t:RoutingType>SMTP</t:RoutingType>
                        <t:MailboxType>OneOff</t:MailboxType>
                    </t:Mailbox>
                </t:From>
                <t:InternetMessageId>&lt;5310EC2E.5070802@caspia.com&gt;</t:InternetMessageId>
                <t:IsRead>true</t:IsRead>
            </t:Message>
        </m:Items>
    </m:GetItemResponseMessage>
</m:ResponseMessages>
</m:GetItemResponse>
</s:Body>
</s:Envelope>
*/
