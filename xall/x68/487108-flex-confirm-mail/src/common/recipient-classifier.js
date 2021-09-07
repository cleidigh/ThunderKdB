/*
# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.
*/
'use strict';

export class RecipientClassifier {
  constructor({internalDomains, attentionDomains, blockedDomains } = {}) {
    this.$internalDomainsSet = new Set((internalDomains || []).map(domain => domain.toLowerCase().replace(/^@/, '')));
    this.$attentionDomainsSet = new Set((attentionDomains || []).map(domain => domain.toLowerCase().replace(/^@/, '')));
    this.$blockedDomainsSet = new Set((blockedDomains || []).map(domain => domain.toLowerCase().replace(/^@/, '')));

    this.classify = this.classify.bind(this);
  }

  classify(recipients) {
    const internals = [];
    const externals = [];
    const blocked   = [];

    for (const recipient of recipients) {
      const address = /<([^@]+@[^>]+)>\s*$/.test(recipient) ? RegExp.$1 : recipient;
      const domain = address.split('@')[1].toLowerCase();
      const classifiedRecipient = {
        recipient,
        address,
        domain,
        isAttentionDomain: this.$attentionDomainsSet.has(domain)
      };
      if (this.$blockedDomainsSet.has(domain))
        blocked.push(classifiedRecipient);
      else if (this.$internalDomainsSet.has(domain))
        internals.push(classifiedRecipient);
      else
        externals.push(classifiedRecipient);
    }

    return { internals, externals, blocked };
  }
}
