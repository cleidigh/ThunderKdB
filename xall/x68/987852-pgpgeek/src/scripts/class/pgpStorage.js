class PgpStorage {
    getKeys() {
        return new Promise((res) => {
            browser.storage.local.get("keys", function (keys) {
                if (!keys.keys) keys = {keys:[]}
                console.log(keys);
                res(keys);
            });
        });
    }
    addKey(name, key, keyType) {
        this.getKeys().then(keyM => {
            const newKey = {
                name: name,
                key: key,
                type: keyType,
            };
            keyM.keys.push(newKey);
            browser.storage.local.set(keyM);
        });
    }
    delKey(idx) {
        this.getKeys().then(keyM => {
            delete keyM.keys[idx];
            // re-index
            keyM.keys = keyM.keys.map( el => el);
            browser.storage.local.set(keyM);
        });
    }
}
