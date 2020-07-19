/* Copyright 2016-2020 Julien L. <julienl81@hotmail.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/*
 * Module dedicated to the EPUB format.
 */

// Copied from util.js
// TODO: find a better solution/place for this function
function toFilename(tag, extension) {
  // Note: nsIZipWriter does not seem to support special characters
  var filename = tag;
  // Make sure that the filename does not exceed 255 characters (max. filename length for ext3 and NTFS)
  filename = filename.substr(0, 255 - extension.length);
  // Add the extension
  filename = filename.concat(extension);
  // Make sure that slashes do not remain
  filename = filename.replace(/\//g, "-");
  return filename;
}

// Copied from util.js
// TODO: find a better solution/place for this function
function padInteger(integer, length) {
  var result = "" + integer;
  while (result.length < length) {
      result = "0" + result;
  }
  return result;
}

function EPUBItem(id, filename, title, mediaType, item) {
  this.id = function() {
    return id;
  };

  this.filename = function() {
    return filename;
  };

  this.title = function() {
    return title;
  };

  this.mediaType = function() {
    return mediaType;
  };

  this.item = function() {
    return item;
  };
}

EPUBItem.fromItem = function(item, index) {
  function idTagFromItem(item, index) {
    // EPUB item id is of type xsd:ID.
    // It can only contain letters, digits, underscores, hyphens and periods.
    // Source: http://www.datypic.com/sc/xsd/t-xsd_ID.html
    // Note the hyphen is at the end of the RE in order to take it as a litteral (and not a range)
    var result = item.reference().replace(/[^a-z0-9_.-]/gi, "");
    // We make the id unique with its index as a prefix
    result = padInteger(index, 4) + "_" + result;
    return result;
  }

  function idFromIdTag(idTag) {
    // In addition, an xsd:ID must start with a letter or an underscore.
    result = "_" + idTag;
    return result;
  }

  function filenameFromIdTag(idTag) {
    return toFilename(idTag, ".xhtml");
  }

  var idTag = idTagFromItem(item, index);
  var id = idFromIdTag(idTag);
  var filename = filenameFromIdTag(idTag);
  var title = item.title();
  var mediaType = "application/xhtml+xml"; // MIME media type allowed for HTML

  return new EPUBItem(id, filename, title, mediaType, item);
}

// Useful for debugging XML
function logNode(node, enable) {
  if (node.nodeName == "dz-like") {
    enable = true;
  }
  if (enable) {
    console.log("Start " + node.nodeType + " - " + node.nodeName + " - " + node.nodeValue);
    if (node.attributes) {
      for (var attribute of node.attributes) {
        console.log("Attribute " + attribute.name + " - " + attribute.value);
      }
    }
  }
  for (var childNode of node.childNodes) {
    logNode(childNode, enable);
  }
  if (enable) {
    console.log("End " + node.nodeType + " - " + node.nodeName + " - " + node.nodeValue);
  }
}

function EPUBItemGenerator(keepLinks) {

  const XHTML_NS = "http://www.w3.org/1999/xhtml";
  
  const VALID_HEADER_ELEMENTS = ["TITLE", "LINK", "META", "STYLE"];

  const NON_DESIRED_HEADER_ELEMENTS = ["BASE", "SCRIPT"];

  this.generateDOM = function(content, contentBaseURL, item, book) {
  
    function removeInvalidAttributes(element) {
      if (element.attributes) {
        // This is a live collection!
        var attributes = element.attributes;
        var index = 0;
        while (index < attributes.length) {
          var attribute = attributes.item(index);
          if (attribute.localName.match(/[^a-z0-9_.-]/gi)) {
            // XML attribute name is of type xsd:NCName.
            // It can only contain letters, digits, underscores, hyphens and periods.
            // Source: http://www.datypic.com/sc/xsd/t-xsd_NCName.html
            // Note the hyphen is at the end of the RE in order to take it as a litteral (and not a range)
            attributes.removeNamedItem(attribute.localName);
            // Do not increment the index since attributes is a live collection
          } else if ((element.tagName == "table" && attribute.localName == "height")
            || (element.tagName == "th" && attribute.localName == "width")
            || (element.tagName == "th" && attribute.localName == "height")
            || (element.tagName == "td" && attribute.localName == "width")
            || (element.tagName == "td" && attribute.localName == "height")) {
            // This is an attribute which is not allowed in XHTML
            attributes.removeNamedItem(attribute.localName);
            // Do not increment the index since attributes is a live collection
          } else {
            index++;
          }
        }
      }
      for (var child of element.children) {
        removeInvalidAttributes(child);
      }
    }

    function removeLinkElements(doc, element) {
      // This is a live collection!
      let children = element.children;
      let index = 0;
      while (index < children.length) {
        var childElement = children.item(index);
        if (childElement.localName == "a") {
          childElement.removeAttribute("href");
          index++;
        } else {
          removeLinkElements(doc, childElement);
          index++;
        }
      }
    }

    function removeFontElements(doc, element) {
      // This is a live collection!
      let children = element.children;
      let index = 0;
      while (index < children.length) {
        var childElement = children.item(index);
        if (childElement.localName == "font") {
          // Create a span element (replacing the font element)
          var spanElement = doc.createElementNS(XHTML_NS, "span");
          // Move every child to the new span element
          while (childElement.firstChild) {
            var grandChildNode = childElement.firstChild;
            spanElement.appendChild(grandChildNode);
          }
          // Replace the font element by the span element
          element.replaceChild(spanElement, childElement);

          removeFontElements(doc, spanElement);
        } else {
          removeFontElements(doc, childElement);
        }
        index++;
      }
    }

    function removeAbsoluteFontSizeStyle(element) {
      var style = element.style;
      // This is not a complete solution but fixes the issuer with:
      // http://visiting-cambodia.com/info/monnaie.html
      if (style && style.fontSize && style.fontSize.endsWith("pt")) {
        style.fontSize = null;
      }

      for (var child of element.children) {
        removeAbsoluteFontSizeStyle(child);
      }
    }

    function removeScriptElements(element) {
      // This is a live collection!
      let children = element.children;
      let index = 0;
      while (index < children.length) {
        var childElement = children.item(index);
        if (childElement.localName == "script") {
          element.removeChild(childElement);
        } else {
          removeScriptElements(childElement);
          index++;
        }
      }
    }

    function extractFileNameFromURL(url) {
      return url.split('/').pop();
    }
  
    function createLinkFromImage(doc, imgElement) {
      var aElement = doc.createElementNS(XHTML_NS, "a");
      aElement.setAttribute("href", imgElement.src);
      if (imgElement.title) {
        aElement.setAttribute("title", imgElement.title);
      }
      aElement.appendChild(doc.createTextNode(imgElement.alt || extractFileNameFromURL(imgElement.src)));
      return aElement;
    }
    
    function replaceImageByLink(doc, imgElement) {
      var parentElement = imgElement.parentElement;
      var aElement = createLinkFromImage(doc, imgElement);
      parentElement.replaceChild(aElement, imgElement);
      parentElement.insertBefore(doc.createTextNode("["), aElement);
      parentElement.insertBefore(doc.createTextNode("]"), aElement.nextSibling);
    }
    
    function replaceAllImagesByLinks(doc, node) {
      if (node.nodeType == 1) { // Element
        // The tag name has to be given in lower-case for compatibility
        // See: https://developer.mozilla.org/en-US/docs/Web/API/Element/getElementsByTagName#Syntax
        var imgElements = node.getElementsByTagName("img"); // HTMLCollection
        // HTMLCollection is live!
        // The image that will be removed from the DOM will be also be removed from the HTMLCollection
        while (imgElements.length > 0) {
          var imgElement = imgElements.item(0);
          replaceImageByLink(doc, imgElement);
        }
      }
    }
  
    // Convert the content into XHTML
    // Initialize a new XHTML document
    var doc = document.implementation.createDocument(XHTML_NS, "html", null);
    var headElement = doc.createElementNS(XHTML_NS, "head");
    doc.documentElement.appendChild(headElement);
    var bodyElement = doc.createElementNS(XHTML_NS, "body");
    doc.documentElement.appendChild(bodyElement);

    if (item) {
      // Add a header with the title
      var titleElement = doc.createElementNS(XHTML_NS, "h2");
      titleElement.appendChild(doc.createTextNode(item.title()));
      bodyElement.appendChild(titleElement);

      // Add a line with the author and the date
      var divElement = doc.createElementNS(XHTML_NS, "div");
      var authorElement = doc.createElementNS(XHTML_NS, "span");
      authorElement.appendChild(doc.createTextNode(item.creator()));
      divElement.appendChild(authorElement);
      divElement.appendChild(doc.createTextNode(" – "));
      var dateElement = doc.createElementNS(XHTML_NS, "span");
      // Format the date with default options of toLocaleString but without the seconds
      var dateString = item.date().toLocaleString(book.language(),
        {year: "numeric", month: "numeric", day: "numeric", hour: "numeric", minute: "numeric"});
      dateElement.appendChild(doc.createTextNode(dateString));
      divElement.appendChild(dateElement);
      bodyElement.appendChild(divElement);

      // Add an horizontal bar
      var hrElement = doc.createElementNS(XHTML_NS, "hr");
      bodyElement.appendChild(hrElement);
    }
    
    var bodyDivElement = doc.createElementNS(XHTML_NS, "div");
    bodyElement.appendChild(bodyDivElement);

    // Parse the HTML content using JQuery (it seems to handle badly-formatted HTML)
    var nodes = jQuery.parseHTML(content, document.implementation.createHTMLDocument()); // Array of Node (DOM)
    // Copy every found node in the new XHTML document
    for (var node of nodes) {
      if (VALID_HEADER_ELEMENTS.includes(node.nodeName)) {
        headElement.appendChild(node);
      } else if (NON_DESIRED_HEADER_ELEMENTS.includes(node.nodeName)) {
        // Discard
      } else if (node.nodeName == "IMG") {
        var linkElement = createLinkFromImage(doc, node);
        bodyDivElement.appendChild(doc.createTextNode("["));
        bodyDivElement.appendChild(linkElement);
        bodyDivElement.appendChild(doc.createTextNode("]"));
      } else {
        replaceAllImagesByLinks(doc, node);
        bodyDivElement.appendChild(node);
      }
    }

    if (contentBaseURL) {
      // Add an horizontal bar
      var hrElement = doc.createElementNS(XHTML_NS, "hr");
      bodyElement.appendChild(hrElement);

      // This is likely an RSS item
      // Add the link to the original post at the end of the item
      var footerDivElement = doc.createElementNS(XHTML_NS, "div");
      var aElement = doc.createElementNS(XHTML_NS, "a");
      aElement.setAttribute("href", contentBaseURL);
      aElement.appendChild(doc.createTextNode(contentBaseURL));
      footerDivElement.appendChild(aElement);
      bodyElement.appendChild(footerDivElement);
    }

    // TODO: replace images here (instead of duplicated code above)
    
    // TODO: replace videos and objects as well
    
    // Remove all script elements here (they can be nested in the middle of the document)
    removeScriptElements(doc);
    
    // TODO: remove link elements with type stylesheet 
    // (as long as remote elements are not downloaded and included in the EPUB)
    
    // TODO: replace relative URLs by absolute URLs in a and form elements
    // (as long as the referenced pages are not downloaded and included in the EPUB)
    
    // TODO: move style elements from body (or children) to head
    // should fix pb with: https://jakearchibald.com/2016/caching-best-practices/
    
    if (!keepLinks) {
      removeLinkElements(doc, doc);
    }

    // Font elements are not allowed in XHTML
    removeFontElements(doc, doc);

    // User should be free to Font sizes should not be specified
    removeAbsoluteFontSizeStyle(doc);

    //removeAttributes(doc);

    removeInvalidAttributes(doc);
    
    return doc;
  };

  this.generate = function(content, contentBaseURL, item, book, file) {
    var doc = this.generateDOM(content, contentBaseURL, item, book);
  
    // Save the XHTML document to a file
    var localFile = Components.classes["@mozilla.org/file/local;1"].createInstance(Components.interfaces.nsIFile);
    localFile.initWithPath(file.path);
    var fileOutputStream = Components.classes["@mozilla.org/network/file-output-stream;1"]
      .createInstance(Components.interfaces.nsIFileOutputStream);   
    fileOutputStream.init(localFile, PR_WRONLY | PR_CREATE_FILE | PR_TRUNCATE, 0664, 0);
    try {
      var domSerializer = new XMLSerializer();
      domSerializer.serializeToStream(doc, fileOutputStream, "" /* Use document's charset */);
    }
    finally {
      fileOutputStream.close();
    }
  };
  
  this.generateString = function(content) {
    var doc = this.generateDOM(content, null /* item */, null /* contentBaseURL */);
  
    var serializer = new XMLSerializer();
    // TODO: factorize the following line
    var result = "<?xml version=\"1.0\"?>" + serializer.serializeToString(doc);
    return result;
  };
  
}

function EPUBItemPromiseFactory() {
  var epubItemGenerator = new EPUBItemGenerator(true);

  this.create = function(item, index, book, baseDir) {
    var handler = function(itemContent) {
        var epubItem = EPUBItem.fromItem(item, index);
        var file = baseDir.clone();
        var filename = epubItem.filename();
        file.append(filename);
        epubItemGenerator.generate(itemContent.content(), itemContent.baseURL(), item, book, file);
        return epubItem;
    };

    var errorHandler = function(reason) {
      console.error("An error occurred while processing content with reference:",
        item.reference(), " - title:", item.title(), " - reason:", reason);
      throw reason;
    };

    var epubItemPromise = item.itemContentPromise().then(handler).catch(errorHandler);
    return epubItemPromise;
  };

}

function TitlePageGenerator() {

  const XHTML_NS = "http://www.w3.org/1999/xhtml";
  const SVG_NS = "http://www.w3.org/2000/svg";
  const DOC_TITLE = {
    "en": "%S - Title Page",
    "fr": "%S - Page de titre",
    "hu": "%S - Címlap"
  };

  this.generate = function(book, file) {
    // Initialize a new XHTML document
    var doc = document.implementation.createDocument(XHTML_NS, "html", null);
    var headElement = doc.createElementNS(XHTML_NS, "head");
    // title is a mandatory element
    var titleElement = doc.createElementNS(XHTML_NS, "title");
    var title = DOC_TITLE[languageFromLocale(book.language())];
    title = title.replace("%S", book.title());
    titleElement.appendChild(doc.createTextNode(title));
    headElement.appendChild(titleElement);
    doc.documentElement.appendChild(headElement);
    var bodyElement = doc.createElementNS(XHTML_NS, "body");
    var h1Element = doc.createElementNS(XHTML_NS, "h1");
    h1Element.setAttribute("style", "text-align: center; margin-top: 2em; margin-bottom: 2em;");
    h1Element.appendChild(doc.createTextNode(book.title()));
    bodyElement.appendChild(h1Element);
    // If there are more than three authors, we take only the first one and we add "et al." in italic
    // This rule seems to be very usual (at least in English and in French)
    var creators = book.mainCreators();
    const minOfCreators = 1;
    const maxOfCreators = 3;
    var creatorElement = doc.createElementNS(XHTML_NS, "p");
    creatorElement.setAttribute("style", "text-align: center; margin-top: 2em; margin-bottom: 2em;");
    function appendCreator(creator, withBR, inItalic) {
      if (withBR) {
        var brElement = doc.createElementNS(XHTML_NS, "br");
        creatorElement.appendChild(brElement);
      }
      var spanElement = doc.createElementNS(XHTML_NS, "span");
      if (inItalic) {
        spanElement.setAttribute("style", "font-style: italic;");
      }
      spanElement.appendChild(doc.createTextNode(creator));
      creatorElement.appendChild(spanElement);
    }
    creators.forEach(function(creator, index) {
      if (index < minOfCreators || creators.length <= maxOfCreators) {
        appendCreator(creator, (index > 0), false);
      }
    });
    if (creators.length > maxOfCreators) {
      appendCreator("et al.", true, true);
    }
    bodyElement.appendChild(creatorElement);
    doc.documentElement.appendChild(bodyElement);

    writeDOMDocumentToFile(doc, file);
  };

}

function MIMETypeDescriptorGenerator() {

  this.generateString = function() {
    return "application/epub+zip";
  };

  this.generate = function(file) {
    writeStringToFile(this.generateString(), file);
  };

}

function TOCDescriptorGenerator() {

  const NCX_NS = "http://www.daisy.org/z3986/2005/ncx/";

  this.generateDOM = function(book, epubItems) {
    var doc = document.implementation.createDocument("", "", null);
    var ncx = doc.createElementNS(NCX_NS, "ncx");
    ncx.setAttribute("version", "2005-1");

    var head = doc.createElementNS(NCX_NS, "head");

    var meta = doc.createElementNS(NCX_NS, "meta");
    meta.setAttribute("name", "dtb:uid");
    meta.setAttribute("content", book.uri());

    var meta1 = doc.createElementNS(NCX_NS, "meta");
    meta1.setAttribute("name", "dtb:depth");
    meta1.setAttribute("content", "1");

    var meta2 = doc.createElementNS(NCX_NS, "meta");
    meta2.setAttribute("name", "dtb:totalPageCount");
    meta2.setAttribute("content", "0");

    var meta3 = doc.createElementNS(NCX_NS, "meta");
    meta3.setAttribute("name", "dtb:maxPageNumber");
    meta3.setAttribute("content", "0");

    head.appendChild(meta);
    head.appendChild(meta1);
    head.appendChild(meta2);
    head.appendChild(meta3);

    var docTitle = doc.createElementNS(NCX_NS, "docTitle");
    var text = doc.createElementNS(NCX_NS, "text");
    text.appendChild(doc.createTextNode(book.title()));
    docTitle.appendChild(text);

    var navMap = doc.createElementNS(NCX_NS, "navMap");

    var index = 0;
    for (var epubItem of epubItems) {
      index++;

      var navPoint = doc.createElementNS(NCX_NS, "navPoint");
      navPoint.setAttribute("id", epubItem.id());
      navPoint.setAttribute("playOrder", String(index));

      var navLabel = doc.createElementNS(NCX_NS, "navLabel");
      var text1 = doc.createElementNS(NCX_NS, "text");
      var title = epubItem.title();
      text1.appendChild(doc.createTextNode(title));
      navLabel.appendChild(text1);

      var content = doc.createElementNS(NCX_NS, "content");
      // Percent-encode the path (it should be percent-decoded by the e-book reader)
      var filenameRef = encodeURIComponent(epubItem.filename());
      content.setAttribute("src", filenameRef);

      navPoint.appendChild(navLabel);
      navPoint.appendChild(content);

      navMap.appendChild(navPoint);
    }

    ncx.appendChild(head);
    ncx.appendChild(docTitle);
    ncx.appendChild(navMap);

    doc.appendChild(ncx);

    return doc;
  };
    
  this.generate = function(book, epubItems, file) {
    var doc = this.generateDOM(book, epubItems);
    
    writeDOMDocumentToFile(doc, file);
  };
    
  this.generateString = function(book, epubItems) {
    var doc = this.generateDOM(book, epubItems);
  
    var serializer = new XMLSerializer();
    // TODO: factorize the following line
    return "<?xml version=\"1.0\"?>" + serializer.serializeToString(doc);
  };

}

function ContentDescriptorGenerator() {

  const OPF_NS = "http://www.idpf.org/2007/opf";

  const DC_NS = "http://purl.org/dc/elements/1.1/";

  this.generateDOM = function(book, tocDescriptorPath, titlePagePath, epubItems) {
    var doc = document.implementation.createDocument("", "", null);
    var packageElement = doc.createElementNS(OPF_NS, "package");
    packageElement.setAttribute("version", "2.0");
    packageElement.setAttribute("unique-identifier", "BookId");
    var metadata = doc.createElementNS(OPF_NS, "metadata");

    var identifier = doc.createElementNS(DC_NS, "dc:identifier");
    identifier.setAttribute("id", "BookId");
    identifier.appendChild(doc.createTextNode(book.uri())); 
    metadata.appendChild(identifier);

    var title = doc.createElementNS(DC_NS, "dc:title");
    title.appendChild(doc.createTextNode(book.title()));
    metadata.appendChild(title);

    for (var creator of book.mainCreators()) {
      var creatorElement = doc.createElementNS(DC_NS, "dc:creator");
      creatorElement.appendChild(doc.createTextNode(creator));
      metadata.appendChild(creatorElement);
    }
    
    if (book.language()) {
      var language = doc.createElementNS(DC_NS, "dc:language");
      language.appendChild(doc.createTextNode(book.language()));
      metadata.appendChild(language);
    }
    
    // TODO: consider adding the property "rights"
    //var rights = doc.createElementNS(DC_NS,"dc:rights");
    //rights.appendChild(doc.createTextNode(rightsString)); 
    //metadata.appendChild(rights);

    var publisher = doc.createElementNS(DC_NS, "dc:publisher");
    publisher.appendChild(doc.createTextNode(book.publisher()));
    metadata.appendChild(publisher);

    // TODO: add following lines?
    // <dc:date opf:event="creation">2012-07-27</dc:date>
    // <dc:date opf:event="publication">2012-07-27</dc:date>
    // <dc:description>Quand il fait paraître "Zonzon Pépette, fille de Londres" en 1923, le belge André Baillon, entre deux tentatives de suicide, entre à l'hôpital psychiatrique de la Pitié-Salpêtrière, à Paris. Il a déjà plusieurs vies derrière lui, flambeur de casino, paysan en sabots, secrétaire de rédaction d'un journal médical.... Est-ce tout cela qui donne à la légèreté de Zonzon Pépette cet arrière-goût d'une danse sur un abîme ? Notre littérature populaire est un continent fait de ces vies qui se brûlent tout entières à l'écriture, mais ne viennent pas rejoindre les livres qu'on dit nobles. </dc:description>
    // <meta content="0.5.3" name="Sigil version" />
    // <meta name="cover" content="cover.png" />

    var manifest = doc.createElementNS(OPF_NS, "manifest");

    var spine = doc.createElementNS(OPF_NS, "spine");
    spine.setAttribute("toc", "ncx");

    // Add the TOC descriptor to the manifest
    var tocItem = doc.createElementNS(OPF_NS, "item");
    tocItem.setAttribute("id", "ncx"); // It should be unique
    tocItem.setAttribute("href", tocDescriptorPath);
    tocItem.setAttribute("media-type", "application/x-dtbncx+xml");
    manifest.appendChild(tocItem);

    // Add the title page to the manifest and to the spine
    if (titlePagePath) {
      var titlePageId = "title"; // It should be unique
    
      var titlePage = doc.createElementNS(OPF_NS, "item");
      titlePage.setAttribute("id", titlePageId);
      titlePage.setAttribute("href", titlePagePath);
      titlePage.setAttribute("media-type", "application/xhtml+xml"); // MIME media type allowed for HTML
      manifest.appendChild(titlePage);
    
      var titlePageItemRef = doc.createElementNS(OPF_NS, "itemref");
      titlePageItemRef.setAttribute("idref", titlePageId);
      spine.appendChild(titlePageItemRef);
    }

    // Add every web page to the manifest and to the spine
    for (var epubItem of epubItems) {
      var itemWebPage = doc.createElementNS(OPF_NS, "item");
      itemWebPage.setAttribute("id", epubItem.id());
      // Percent-encode the path (it should be percent-decoded by the e-book reader)
      var filenameRef = encodeURIComponent(epubItem.filename());
      itemWebPage.setAttribute("href", filenameRef);
      itemWebPage.setAttribute("media-type", epubItem.mediaType());
      manifest.appendChild(itemWebPage);

      var spineItemRef = doc.createElementNS(OPF_NS, "itemref");
      spineItemRef.setAttribute("idref", epubItem.id());
      spine.appendChild(spineItemRef);
    }

    packageElement.appendChild(metadata);
    packageElement.appendChild(manifest);
    packageElement.appendChild(spine);
    doc.appendChild(packageElement);

    return doc;
  };
  
  this.generate = function(book, tocDescriptorPath, titlePagePath, epubItems, file) {
    var doc = this.generateDOM(book, tocDescriptorPath, titlePagePath, epubItems);
    
    writeDOMDocumentToFile(doc, file);
  };
  
  this.generateString = function(book, tocDescriptorPath, titlePagePath, epubItems) {
    var doc = this.generateDOM(book, tocDescriptorPath, titlePagePath, epubItems);

    var serializer = new XMLSerializer();
    // TODO: factorize the following line
    return "<?xml version=\"1.0\"?>" + serializer.serializeToString(doc);
  };

}

function ContainerDescriptorGenerator() {

  const CONTAINER_NS = "urn:oasis:names:tc:opendocument:xmlns:container";

  this.generateDOM = function(contentDescriptorPath, file) {
    // Create DOM document
    var doc = document.implementation.createDocument(CONTAINER_NS, "container", null);
    var container = doc.documentElement;
    container.setAttribute("version", "1.0");
    var rootfiles = doc.createElementNS(CONTAINER_NS, "rootfiles");
    var rootfile = doc.createElementNS(CONTAINER_NS, "rootfile");
    rootfile.setAttribute("full-path", contentDescriptorPath);
    rootfile.setAttribute("media-type", "application/oebps-package+xml");
    rootfiles.appendChild(rootfile);
    container.appendChild(rootfiles);

    return doc;
  };
  
  this.generate = function(contentDescriptorPath, file) {
    var doc = this.generateDOM(contentDescriptorPath);

    writeDOMDocumentToFile(doc, file);
  };
  
  this.generateString = function(contentDescriptorPath) {
    var doc = this.generateDOM(contentDescriptorPath);
  
    var serializer = new XMLSerializer();
    // TODO: factorize the following line
    return "<?xml version=\"1.0\"?>" + serializer.serializeToString(doc);
  };
  
}

var epubGenerator = {

  epubItemPromiseFactory: new EPUBItemPromiseFactory(),

  titlePageGenerator: new TitlePageGenerator(),

  mimeTypeDescriptorGenerator: new MIMETypeDescriptorGenerator(),

  tocDescriptorGenerator: new TOCDescriptorGenerator(),

  contentDescriptorGenerator: new ContentDescriptorGenerator(),

  containerDescriptorGenerator: new ContainerDescriptorGenerator(),

  generate: function(book, file) {
  
    function continueGeneration(book, workingDir, oebpsDir, metainfDir, epubItems, file) {
      // Title page
      var titlePageFile = createLocalFile(oebpsDir, "title.xhtml");
      this.titlePageGenerator.generate(book, titlePageFile);

      // MIME type descriptor
      var mimeTypeDescriptorfile = createLocalFile(workingDir, "mimetype");
      this.mimeTypeDescriptorGenerator.generate(mimeTypeDescriptorfile);

      // TOC descriptor
      var tocDescriptorFile = createLocalFile(oebpsDir, "toc.ncx");
      this.tocDescriptorGenerator.generate(book, epubItems, tocDescriptorFile);

      // Content descriptor
      var contentDescriptorFile = createLocalFile(oebpsDir, "content.opf");
      this.contentDescriptorGenerator.generate(book, "toc.ncx", "title.xhtml", epubItems, contentDescriptorFile);

      // Container descriptor
      var containerDescriptorFile = createLocalFile(metainfDir, "container.xml");
      this.containerDescriptorGenerator.generate("OEBPS/content.opf", containerDescriptorFile);

      // Zip
      var zipBuilder = new ZipBuilder(workingDir, file);
      zipBuilder.addEntry("mimetype", false);
      zipBuilder.addAllEntries(["mimetype"], true);
      zipBuilder.complete();

      return file;
    }
  
    function allEPUBItemsPromise(book, baseDir) {
      var epubItemPromises = new Array();
      var index = 1;

      for (var item of book.items()) {
        var epubItemPromise = this.epubItemPromiseFactory.create(item, index, book, baseDir);
        epubItemPromises.push(epubItemPromise);
        index++;
      }

      return Promise.all(epubItemPromises);
    }

    var directoryService = Components.classes["@mozilla.org/file/directory_service;1"].getService(Components.interfaces.nsIProperties);

    // Create working directory
    var workingDir = directoryService.get("TmpD", Components.interfaces.nsIFile);
    workingDir.append("Thunderbook-" + book.uuid());
    workingDir.createUnique(Components.interfaces.nsIFile.DIRECTORY_TYPE, 0777);

    // Create OEBPS directory
    var oebpsDir = workingDir.clone();
    oebpsDir.append("OEBPS");
    oebpsDir.createUnique(Components.interfaces.nsIFile.DIRECTORY_TYPE, 0777);

    // Create META-INF directory
    var metainfDir = workingDir.clone();
    metainfDir.append("META-INF");
    metainfDir.create(Components.interfaces.nsIFile.DIRECTORY_TYPE, 0777);

    var currentGenerator = this;
    var epubItemsPromise = allEPUBItemsPromise.call(currentGenerator, book, oebpsDir);
    var promise = epubItemsPromise.then(function(epubItems) {
      return continueGeneration.call(currentGenerator, book, workingDir, oebpsDir, metainfDir, epubItems, file);
    });
    return promise;
  },
  
  generateAsync: function(book, keepLinks) {
    var epubItems = new Array();
    var index = 1;
    for (var item of book.items()) {
      var epubItem = EPUBItem.fromItem(item, index);
      epubItems.push(epubItem);
      index++;
    }

    // MIME type descriptor
    var mimeTypeDescriptor = this.mimeTypeDescriptorGenerator.generateString();

    // Container descriptor
    var containerDescriptor = this.containerDescriptorGenerator.generateString("OEBPS/content.opf");

    // Content descriptor
    var contentDescriptor = this.contentDescriptorGenerator.generateString(book, "toc.ncx", null /*"title.xhtml"*/, epubItems);

    // TOC descriptor
    var tocDescriptor = this.tocDescriptorGenerator.generateString(book, epubItems);

    // Zip
    var zip = new JSZip();
    zip.file("mimetype", mimeTypeDescriptor, {
      compression: "STORE" // No compression
    });
    zip.file("META-INF/container.xml", containerDescriptor);
    zip.file("OEBPS/content.opf", contentDescriptor);
    zip.file("OEBPS/toc.ncx", tocDescriptor);
    var epubItemGenerator = new EPUBItemGenerator(keepLinks);
    for (let epubItem of epubItems) {
      var xhtmlContentPromise =
        epubItem.item().itemContentPromise().then(function(content) {
          return epubItemGenerator.generateString(content);
        }).catch(function(jqXHR, textStatus, errorThrown) {
          console.warn("Error while getting content for item", epubItem.item().reference(),
            ", status:", textStatus, ", error:", errorThrown);
          return epubItemGenerator.generateString(jqXHR.responseText);
        });
      zip.file("OEBPS/" + epubItem.filename(), xhtmlContentPromise, {binary: false});
    }
    return zip.generateAsync({type:"blob", compression: "DEFLATE"})
  }

};
