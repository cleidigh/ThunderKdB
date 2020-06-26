/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

var EXPORTED_SYMBOLS = ["AutocryptWelcomeMessage"];

const AutocryptLog = ChromeUtils.import("chrome://autocrypt/content/modules/log.jsm").AutocryptLog;
const AutocryptFiles = ChromeUtils.import("chrome://autocrypt/content/modules/files.jsm").AutocryptFiles;
const AutocryptRNG = ChromeUtils.import("chrome://autocrypt/content/modules/rng.jsm").AutocryptRNG;

const nsMsgFolderFlags_Inbox = 0x00001000;

var AutocryptWelcomeMessage = {
  findInboxForAccount: function(account) {
    const rootFolder = account.incomingServer.rootFolder;
    if (!rootFolder.hasSubFolders) {
      return null;
    }

    let subFolders = rootFolder.subFolders;
    while (subFolders.hasMoreElements()) {
      const subFolder = subFolders.getNext().QueryInterface(Ci.nsIMsgFolder);
      if (subFolder.flags & nsMsgFolderFlags_Inbox) {
        return subFolder;
      }
    }
    return null;
  },

  sendWelcomeMessage: function(msgWindow) {
    AutocryptLog.DEBUG(`welcomeMessage.jsm: sendWelcomeMessage()\n`);
    if (!msgWindow) {
      msgWindow = null;
    }

    const accounts = Cc["@mozilla.org/messenger/account-manager;1"]
      .getService(Ci.nsIMsgAccountManager)
      .accounts;
    for (let i = 0; i < accounts.length; i++) {
      let account = accounts.queryElementAt(i, Ci.nsIMsgAccount);
      if (!account) {
        AutocryptLog.DEBUG(`welcomeMessage.jsm: sendWelcomeMessage(): no usable account, skipping\n`);
        continue;
      }
      this.sendWelcomeMessageToAccount(msgWindow, account);
    }
  },

  sendWelcomeMessageToAccount: function(msgWindow, account) {
    const inboxFolder = this.findInboxForAccount(account);
    if (!inboxFolder) {
      AutocryptLog.DEBUG(`welcomeMessage.jsm: sendWelcomeMessage(): no inbox, aborting\n`);
      return;
    }

    const recipient = account.defaultIdentity.fullAddress;
    if (!recipient) {
      AutocryptLog.DEBUG(`welcomeMessage.jsm: sendWelcomeMessage(): no identity, aborting\n`);
      return;
    }

    this.sendWelcomeMessageToFolder(msgWindow, inboxFolder, recipient);
  },

  sendWelcomeMessageToFolder: function(msgWindow, folder, recipient) {
    const msg_id = AutocryptRNG.generateRandomString(27) + "-autocrypt";

    const tmpFile = AutocryptFiles.getTempDirObj();
    tmpFile.append(`${msg_id}.eml`);

    let date_str = new Date().toUTCString();
    let msgStr = `To: ${recipient}
From: Autocrypt Extension <hello@autocrypt.dev>
Subject: Autocrypt was successfully installed!
Date: ${date_str}
Message-Id: ${msg_id}
Content-Type: text/html; charset="utf8"
Content-Transfer-Encoding: quoted-printable
Autocrypt: addr=hello@autocrypt.dev; keydata=
  mDMEXXFYSBYJKwYBBAHaRw8BAQdAb0VPGzUipeUdJ1FCaj188ndUc3DZeJbN4shedjZamW60E2hlbG
  xvQGF1dG9jcnlwdC5kZXaIkAQTFggAOBYhBHGA9sN/umOZvkpZTMQ27l6cf/ZJBQJdcjhgAhsDBQsJ
  CAcCBhUKCQgLAgQWAgMBAh4BAheAAAoJEMQ27l6cf/ZJcDYA/RYbUIL7jrSHNguQnz1FuHI62oZ7MN
  V8SaxA6pOmPNDNAQC7gwXI7vgNzqzKscwyBBDfZYApOZrIN9MOhD5rvWq4C7g4BF1xWEgSCisGAQQB
  l1UBBQEBB0BktjRtoaZaTAj63Jf6Es1KsPcDIhT2tIXT4SOm3mRpAQMBCAeIeAQYFggAIBYhBHGA9s
  N/umOZvkpZTMQ27l6cf/ZJBQJdcVhIAhsMAAoJEMQ27l6cf/ZJXSwA/3o3o/RqHTz20zQwmcMVGpp9
  Gkk4Ze43DZyDbAHWBgs+AQC+Z06hrB1W0aHjReuXm5k9Z06IsDQofYkKJrK2Hfd/Bw==

<p>Autocrypt for Thunderbird was successfully configured! Encryption is now<br />
available for contacts who have Autocrypt-compatible apps =F0=9F=9A=80 </p>

<p>
You can try sending an encrypted message to this bot. It will answer right away!<br />
Press <img style=3D"vertical-align: middle;" src=3D"data:image/gif;base64,R0lGODlhSAAYAPcAAC40Ni81NzA2ODE3OTI3OTI4OjM5OzQ6PDc8Pjc9Pzo/QTtAQjtBQzxCRD5DRT9ERkBFR0BGSEFHSENISkRKTEVLTEdMTkhNT0lOUE1SU01SVFBVV1JXV1VaWlZbXVdcXVdcXlhdXl1iY19kZWBlZmFmZmFmZ2JmaGNnaWVpa2ZqbGxwcWxwcm1xc25ydHF1dnF1d3N3d3R4eHh8fHh8fXl8fnl9fnp+fnp+f3+Dg4GFhoKGhoKGh4SIiYaJioeKi4eLjIqNjouOj42QkY6Rko+Sk5CUlZGUlZWYmJWYmZibm5mbnJmbnZqdnZqdnpyfn52fn52foJ6goJ6goaOmpaOmpqSnpqSnp6SnqKyvrq6wsa+ysrGztLK0tLO1tbS2t7e5uLi6u7m7u7y8u7m7vLu9vby8vL2+vr2/v8C/v72/wMDCwcPDw8TFxcbIyMnKysrLy8vNzM7Pz87Qz8/R0NLT09TV1tbX19fY2NfY2djZ2dna2dna2trb29vc29zd3d7f3t/g3+Dg4OHi4eLj4uXm5ebm5ejn5+jo6Ojp6Orr6uzs7O3t7O7u7e7u7u/v7+/w7+/v8PDw8PLz8vT08/X19ff39vf39/f49/j49/f4+Pr6+fr6+vv7+vv7+/z8+/z8/AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACH5BAAAAAAALAAAAABIABgAAAj+AA+xGUOwoMGDCBMqXMiwIUE2AiWBmkixosWLGDNq3MhxoiQ2ZjqKHEmypJmQJVOqVHnyk8uXMGPKnEmzps2bMFvelNTCBs6fQIN+0mlzhwYaQpPGLDElKFGaTDR8MAS0BQAABzZkUcrUqRlPYMOKDaOhLAgbPLDwEcvWUwsXfexECeCmrV2xJKbctXtyryeyZQOXtRHpbgscYTMc8aSpyAQEI+yA9UAkhQMMZcDm9XQlQ9hKC9S0PdmptOnTnZZoALFnTpslJzS0QG26xY1OmNYUQNKpSAg4gJBEgNTJQ4I3ncQYINSJhJROiwrQKQ0GAibapGmj1iHb9CMPGh7+abcq4GoDQZMO5DHd4UvxGaZRGGn+vNOLHqVX/NCeXbt3FiycBp54tLXQAh5viLBFJ3Zc5SAATRT3hGlAwEBfaWg4YIkiBNTBnxn+hdiJFhoEON5tnRTCwB9xALAIbR4oYRoPFjpXWiYSnFEFB/71J+Jpe4CgwRz+2WZaDjIwMgAXMK5gmgfz2ViaEDGEAEWPIP542iNCDhGikaXdEYAfPjzgRSByBKFHcQpYEQgSBAxyYWl5ECBAIVhyoueefPbJCQsl+slnT3yaUMMlSVhAAAU0IMKJB0mscMAFYehJQhR8eqCCoHqetMmnoIYq6iYrrODIqKimKqoHVKj6aSZBFXShqqeu1mprray6mogTD1Ayqxm3BissqLmqisADZLhK67DMNsvsss5GKy2qZqTRyLTYYtsIRAM55O234HoLUUAAOw=3D=3D" />, then enable encryption with <img style=3D"vertical-align: middle;" src=3D"data:image/gif;base64,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3D" />.
</p>

<p style=3D"font-size: x-small;">This message was generated locally by the Autocrypt extension.</p>
`.replace(/\n/gm, '\r\n');

    AutocryptFiles.writeFileContents(tmpFile, msgStr);

    // nsIMsgCopyServiceListener
    var deleteTmpFileOnFinishListener = {
      OnStartCopy : function() {},
      OnStopCopy : function() {
        tmpFile.remove(false);
      }
    };

    var cs = Components.classes["@mozilla.org/messenger/messagecopyservice;1"]
      .getService(Components.interfaces.nsIMsgCopyService);
    cs.CopyFileMessage(tmpFile, folder, null, false, 0, "", deleteTmpFileOnFinishListener, msgWindow);
  }
};
