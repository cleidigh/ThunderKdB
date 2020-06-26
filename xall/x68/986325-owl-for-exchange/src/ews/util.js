class EWSError extends ParameterError {
  constructor(aXHR, aRequest) {
    // Delete any outgoing email data in the request.
    if (aRequest.m$CreateItem) {
      delete aRequest.m$CreateItem.m$Items;
    }
    if (aRequest.m$CreateAttachment) {
      delete aRequest.m$CreateAttachment.m$Attachments;
    }
    let parameters = { request: aRequest, status: aXHR.status, statusText: aXHR.statusText };
    let message = aXHR.statusText;
    let type = 'HTTP ' + aXHR.status;
    if (aXHR.status >= 400 && aXHR.status < 500) {
      message = gStringBundle.get("error.server-refused");
    }
    if (aXHR.status >= 500 && aXHR.status < 600) {
      message = gStringBundle.get("error.server-fail");
    }
    if (aXHR.status == 0) {
      message = gStringBundle.get("error.network-fail");
    }
    try {
      let responseXML = aXHR.responseXML;
      let messageNode = responseXML.querySelector("Message");
      if (messageNode) {
        message = messageNode.textContent;
      }
      let responseCode = responseXML.querySelector("ResponseCode");
      if (responseCode) {
        type = responseCode.textContent;
      }
      let errorNode = responseXML.querySelector("[ResponseClass=\"Error\"]");
      if (errorNode) {
        let errorResponse = XML2JSON(errorNode);
        message = errorResponse.MessageText;
        type = errorResponse.ResponseCode;
      }
      let xmlNode = responseXML.querySelector("MessageXml");
      if (xmlNode) {
        // This identifies the XML element causing the error.
        parameters.XML = XML2JSON(xmlNode);
      }
      if (messageNode || responseCode || errorNode || xmlNode) {
        parameters.error = XML2JSON(responseXML.documentElement);
      }
    } catch (ex) {
      // The response wasn't XML, so we can't extract an error message.
      parameters.responseText = aXHR.responseText;
    }
    super(type, message, parameters);
  }
}

class EWSItemError extends ParameterError {
  constructor(errorResponseJSON, aRequest) {
    let parameters = { request: aRequest, error: errorResponseJSON };
    let message = errorResponseJSON.MessageText;
    let type = errorResponseJSON.ResponseCode;
    parameters.XML = errorResponseJSON.MessageXml;
    super(type, message, parameters);
  }
  serialise() {
    return {
      message: this.message,
      type: this.type,
      stack: this.stack,
      parameters: this.parameters,
    };
  }
}

/**
 * Translates a JSON object into an XML subtree.
 *
 * @param aJSON   {Object}  The JSON to translate
 * @param aParent {Element} The element to append to
 * @param aNS     {String}  The XML tag namespace
 * @param aTag    {String}  The XML tag name
 *
 * If aJSON is null, then does nothing.
 * If aJSON is an array, then recursively processes each element.
 * If aJSON is a primitive type, then appends an element with only text content.
 * If aJSON is an object, then appends an element, and processes:
 *   properties whose names don't include a "$" are assumed to be attributes;
 *   properties whose name includes a "$" are assumed to be child elements.
 *     The $ delimits the namespace prefix from the local name.
 *     Their values are recursively translated.
 *   We have to do this because FieldURI could be a local name or an attribute.
 *   As a special case, the property "_TextContent_" becomes the content,
 *   if you need to be able to combine content with attributes.
 */
function JSON2XML(aJSON, aParent, aNS, aTag) {
  if (aJSON == null) {
    return;
  }
  if (Array.isArray(aJSON)) {
    for (let value of aJSON) {
      JSON2XML(value, aParent, aNS, aTag);
    }
    return;
  }
  let element = aParent.ownerDocument.createElementNS(aNS, aTag);
  aParent.appendChild(element);
  if (typeof aJSON != "object") {
    element.textContent = aJSON;
    return;
  }
  const w3cNS = "http://www.w3.org/2000/xmlns/";
  for (let key in aJSON) {
    if (key == "_TextContent_") {
      element.textContent = aJSON[key];
    } else if (key.includes("$")) {
      let ns = aParent.ownerDocument.documentElement.getAttributeNS(w3cNS, key.slice(0, key.indexOf("$")));
      let tagName = key.replace("$", ":");
      JSON2XML(aJSON[key], element, ns, tagName);
    } else {
      element.setAttribute(key, aJSON[key]);
    }
  }
}

/**
 * Translates an XML element to a JSON object.
 *
 * @params aNpde {Element} The XML element
 * @returns      {Object}  The JSON translation
 *
 * If the node has no attributes or child elements,
 * then this simply returns its text content as a string.
 * Otherwise, an obejct is returned.
 * Element attributes are mapped to string properties.
 * Text content is mapped to the Value property.
 * Child elements are mapped using their local name only.
 * Their values are then processed recursively.
 * Arrays are only created when multiple identical local names are found.
 * Use the ensureArray() function to ensure you get an array when you expect one.
 */
function XML2JSON(aNode) {
  if (!aNode.children.length && !aNode.attributes.length) {
    return aNode.textContent;
  }
  let result = {};
  for (let {name, value} of aNode.attributes) {
    result[name] = value;
  }
  if (aNode.childNodes.length && !aNode.children.length) {
    result.Value = aNode.textContent;
  }
  for (let child of aNode.children) {
    if (result[child.localName]) {
      if (!Array.isArray(result[child.localName])) {
        result[child.localName] = [result[child.localName]];
      }
      result[child.localName].push(XML2JSON(child));
    } else {
      result[child.localName] = XML2JSON(child);
    }
  }
  return result;
}

/**
 * Helper function for possibly multivalued properties.
 *
 * @param aValue {Any}   The multivalued property
 * @returns      {Array} An appropriate array
 *
 * The XML to JSON decoder doesn't know which tags can appear multiple times.
 * Since we don't use a schema, we just heuristically only use an array when
 * we actually see multiple tags in the same repsonse.
 * For the convenince of calling code which expects an array,
 * this function will convert a non-array value into a suitable array.
 * An empty value simply becomes an empty array.
 * A simple value becomes an array containing that value.
 */
function ensureArray(aValue) {
  if (!aValue) {
    return [];
  }
  if (Array.isArray(aValue)) {
    return aValue;
  }
  return [aValue];
}

class EnumValue {
  constructor(name, value) {
    this.name = name;
    this.value = value;
  }
  toString() {
    return this.name;
  }
  valueOf() { // This allows for relational operators < <= => >
    return this.value;
  }
}
var kExchangeUnknown = new EnumValue("", 0);
var kExchange2010_SP1 = new EnumValue("Exchange2010_SP1", 1);
var kExchange2013 = new EnumValue("Exchange2013", 2);
