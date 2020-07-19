/*
 *
 *   Settings
 *
 */

let displaySettings = function (pgpMaster, pgpStorage) {
  // if not a compose Window, hide Encrypt / Decrypt options
  pgpMaster.getTextCompose().catch(() => {
    $('#decrypt_full_description').setAttribute('style', 'display:none');
    $('#encryption_block').setAttribute('style', 'display:none');
    $('#decrypt').setAttribute('style', 'display:none');
  })

  pgpStorage.getKeys().then(keyM => {
    // public keys
    let keys_tab = $('#keys_tab');
    let public_keys_select = $('#encrypt_select_public_key');
    let private_keys_select = $('#decrypt_select_private_key');
    keys_tab.textContent = '';
    private_keys_select.textContent = '';
    public_keys_select.textContent = '';
    $('#new_key_name').value = '';
    $('#new_key').value = '';
    for (var i in keyM.keys) {
      // settings
      let row = document.createElement('div');
      let row_name = document.createElement('span');
      let row_key = document.createElement('span');
      let row_delete = document.createElement('span');
      let row_generate_public_key = document.createElement('span');

      row_name.textContent = keyM.keys[i].name;
      row_key.textContent = keyM.keys[i].key.replace(/(\n|\t|\r)/g, '').substr(0, 100) + '...';
      row_delete.textContent = 'delete';
      row_generate_public_key.textContent = 'Generate Public Key';
      row.appendChild(row_name);
      row.appendChild(document.createElement('br'));
      row.appendChild(row_key);
      row.appendChild(document.createElement('br'));
      row.appendChild(row_delete);
      row.setAttribute('class', 'key_row ' + (keyM.keys[i].type == 'public' ? 'key_row_public' : ''));
      row_name.setAttribute('class', 'key_row_name');
      row_key.setAttribute('class', 'key_row_key');
      row_delete.setAttribute('class', 'key_row_delete');
      row_generate_public_key.setAttribute('class', 'row_generate_public_key');
      row_delete.addEventListener('click', ((idx) => {
        pgpStorage.delKey(idx);
        setTimeout(() => displaySettings(pgpMaster, pgpStorage), 200);
      }).bind(null, i));
      keys_tab.appendChild(row);

      // actions
      let option = document.createElement('option');
      option.value = keyM.keys[i].key;
      if (keyM.keys[i].type == 'public') {
        option.textContent = 'Public Key #' + i + ' ' + keyM.keys[i].name;
        public_keys_select.appendChild(option);
      } else {
        option.textContent = 'Private Key #' + i + ' ' + keyM.keys[i].name;
        private_keys_select.appendChild(option);
      }
    }
  });
};