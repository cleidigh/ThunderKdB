/*
# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.
*/
'use strict';

export const TYPE_PLAINTEXT = 'plaintext';
export const TYPE_HTML      = 'html';

let mLogger = () => {};

function log(...args) {
  mLogger(...args);
}

export function setLogger(logger) {
  if (typeof logger == 'function')
    mLogger = logger;
}

export async function getSingleBodyAsPlaintext(messageId, { full, withoutQuotation }) {
  log('getSinglePlaintextBody for ', messageId);
  if (!full)
    full = await browser.messages.getFull(messageId);
  log(' full => ', full);
  const bodies        = collectPlaintextAndHTMLBodies(full, { withoutQuotation }).reverse();
  const lastPlaintext = bodies.find(body => body.type == TYPE_PLAINTEXT) || null;
  const lastHTML      = bodies.find(body => body.type == TYPE_HTML) || null;

  const HTMLBody      = lastHTML && lastHTML.plaintext;
  const plaintextBody = lastPlaintext && lastPlaintext.plaintext;
  const body          = (HTMLBody || plaintextBody || '').replace(/\r\n?/g, '\n').trim();
  log(' body: ', { body, HTMLBody, plaintextBody });
  return body;
}
// for backward compatibility
export async function getBody(messageId, { full, withoutQuotation } = {}) {
  return getSingleBodyAsPlaintext(messageId, { full, withoutQuotation });
}

export async function getAllBodies(messageId, { full, withoutQuotation } = {}) {
  log('getAllBodies for ', messageId);
  if (!full)
    full = await browser.messages.getFull(messageId);
  log(' full => ', full);
  return collectPlaintextAndHTMLBodies(full, { withoutQuotation });
}

function collectPlaintextAndHTMLBodies(part, { withoutQuotation } = {}) {
  log('_collectPlaintextAndHTMLBodies: ', { part });
  let bodies = [];
  for (const subPart of part.parts.slice(0).reverse()) {
    log(' subPart.contentType: ', subPart.contentType);
    switch (subPart.contentType.replace(/\s*;.*$/, '')) {
      case 'multipart/alternative':
      case 'multipart/mixed':
      case 'multipart/related':
        const result = collectPlaintextAndHTMLBodies(subPart, { withoutQuotation });
        bodies.unshift(...result);
        break;

      case 'text/plain':
        if (!subPart.name) {
          const body = subPart.body.replace(/\r\n|\r/g, '\n');
          const plaintext = withoutQuotation ?
            body.split('\n').reverse().join('\n').replace(/(\n|^)(?:>(?:.*)?\n)+\s*On.+, .+ wrote:\n/, '$1').split('\n').reverse().join('\n') :
            body;
          if (plaintext)
            bodies.unshift({ type: TYPE_PLAINTEXT, plaintext });
        }
        break;

      case 'text/html':
        if (!subPart.name) {
          const html = subPart.body.replace(/\r\n|\r/g, '\n');
          if (html) {
            const plaintext = html && htmlToPlaintext(html, { withoutQuotation }) || '';
            bodies.unshift({ type: TYPE_HTML, html, plaintext });
          }
        }
        break;

      default:
        break;
    }
  }
  log(' _collectPlaintextAndHTMLBodies result: ', { part, bodies });
  return bodies;
}

function htmlToPlaintext(source, { withoutQuotation } = {}) {
  const doc = (new DOMParser()).parseFromString(source, 'text/html');
  return nodeToText(doc.body || doc, { withoutQuotation });
}

function nodeToText(node, { withoutQuotation } = {}) {
  let prefix = '';
  let suffix = '';
  switch (node.nodeType) {
    case Node.ELEMENT_NODE:
      switch (node.localName.toLowerCase()) {
        case 'br':
          return '\n';

        case 'pre':
        case 'h0':
        case 'h1':
        case 'h2':
        case 'h3':
        case 'h4':
        case 'h5':
        case 'p':
        case 'div':
        case 'li':
          suffix = '\n';
          break;

        case 'blockquote':
          if (withoutQuotation)
            return '';
          prefix = '> ';
          break;
      }
    case Node.DOCUMENT_NODE: {
      let contents = Array.from(node.childNodes).reverse().map(node => {
        const text = nodeToText(node, { withoutQuotation });
        if (node.localName && node.localName.toLowerCase() == 'blockquote') // apply "withoutQuotation" only for the last uotation part
          withoutQuotation = false;
        return text;
      }).reverse().join('');
      if (prefix)
        contents = contents.replace(/^( )?/gm, `${prefix}$1`);
      return `${contents}${suffix}`;
    };

    case Node.TEXT_NODE:
      return node.parentNode.closest('pre') ? node.nodeValue : node.nodeValue.replace(/\s\s+/g, ' ').replace(/^\s+$/, '');

    default:
      return '';
  }
}
