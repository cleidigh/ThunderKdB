class PgpMaster {
    constructor() {
      this.openpgp = window.openpgp;
    }
  
    async getTabId() {
      let tabs = await browser.tabs.query({
        active: true,
        currentWindow: true
      });
      return tabs[0].id;
    }
  
    getTextCompose(encrypt) {
      return new Promise((res, err) => {
        this.getTabId().then(tabId => {
          browser.compose.getComposeDetails(tabId).then(async (details) => {
            if (encrypt)
                return res(details.isPlainText ? details.plainTextBody : details.body);
            return res((new DOMParser().parseFromString(details.body, 'text/html')).body.textContent);
          }).catch(err);
        });
      });
    }
  
    sendMessage(message) {
      this.getTabId().then(tabId => {
        browser.runtime.sendMessage({
          tabId,
          message
        });
      });
    }
  
    encrypt(text, publicKey) {
      return (new Promise(async (res) => {
        const public_key = (await this.openpgp.key.readArmored(publicKey)).keys;
        const options = {
          message: this.openpgp.message.fromText(text),
          publicKeys: public_key
        };
        this.openpgp.encrypt(options).then(encrypted => {
          return res(encrypted.data);
        });
      }));
    }
  
    decrypt(message, privateKey, passPhrase) {
      return (new Promise(async (res) => {
        const private_key = (await this.openpgp.key.readArmored(privateKey)).keys[0]
        if (!private_key.isDecrypted())
          await private_key.decrypt(passPhrase);
        const options = {
          message: await this.openpgp.message.readArmored(message),
          privateKeys: [private_key]
        };
        this.openpgp.decrypt(options).then(plaintext => {
          res(plaintext.data)
        });
      }));
    }
  
    generatePublicKey(privateKey, passPhrase) {
      return (new Promise(async (res) => {
        const private_key = (await this.openpgp.key.readArmored(privateKey)).keys[0]
        await private_key.decrypt(passPhrase);
        const public_key = private_key.toPublic().armor();
        res(public_key);
      }));
    }
  
    generatePrivateKey(name, email, passPhrase) {
      return (new Promise(res => {
        const options = {
          userIds: [{
            name: name,
            email: email
          }],
          numBits: 4096,
          passphrase: passPhrase
        };
        openpgp.generateKey(options).then(function (key) {
          res(key.privateKeyArmored);
        });
      }));
    }
  }