window.onload = function () {
  const pgpMaster = new PgpMaster;
  const pgpStorage = new PgpStorage;

  // Generate the Public Key from Private Key
  const generateAndAddPublicKey = async () => {
    const privateKey = $('#decrypt_select_private_key').value,
      passPhrase = $('#decrypt_passphrase').value;
    pgpMaster.generatePublicKey(privateKey, passPhrase).then(pubKey => {
      copyClipboard(pubKey);
      alert('Your public key is copied in your clipboard');
    });
  }

  //Generate the Private Key
  const generateNewPrivateKey = function () {
    const name = $('#new_private_key_block_generate_name').value,
      email = $('#new_private_key_block_generate_email').value,
      passPhrase = $('#new_private_key_block_generate_passphrase').value;
    if (name < 5 || email < 5 || passPhrase < 5) return -1;
    pgpMaster.generatePrivateKey(name, email, passPhrase).then(privKey => {
      $('#new_key').value = privKey;
    });
  };

  // Encrypt Text
  const encryptFunction = async () => {
    const publicKey = $('#encrypt_select_public_key').value;
    pgpMaster.getTextCompose(true).then(text => {
      pgpMaster.encrypt(text, publicKey).then((msg) => pgpMaster.sendMessage(msg));
    });
  };

  // Decrypt Text
  const decryptFunction = async () => {
    const privateKey = $('#decrypt_select_private_key').value,
      passPhrase = $('#decrypt_passphrase').value;
    pgpMaster.getTextCompose().then(text => {
      console.log(text);
      pgpMaster.decrypt(text, privateKey, passPhrase).then((msg) => pgpMaster.sendMessage(msg))
    });
  };

  // Add a new Private / Public Key
  const addNewKey = function () {
    const keyName = $('#new_key_name').value,
      keyValue = $('#new_key').value,
      keyType = $('#new_type_key').value;
    pgpStorage.addKey(keyName, keyValue, keyType);
    if (keyName < 3 || keyValue < 50 || keyType < 3) return -1;
    setTimeout(() => displaySettings(pgpMaster, pgpStorage), 200);
  };

  // Private Key Display some options 
  const displayNewPrivateKeyOption = function (evt) {
    $('#new_private_key_block').setAttribute('style', evt.target.value === 'private' ? 'display:block' : '')
  };

  // Private Key Display full options
  const displayNewPrivateKeyOptionGenerate = function (evt) {
    $('#new_private_key_block_enable').setAttribute('style', evt.target.checked ? 'display:block' : '')
  };


  $('#add_new_key_button').addEventListener('click', addNewKey);
  $('#crypt').addEventListener('click', encryptFunction);
  $('#decrypt').addEventListener('click', decryptFunction);
  $('#new_private_key_block_generate_checkbox').addEventListener('click', displayNewPrivateKeyOptionGenerate);
  $('#new_type_key').addEventListener('click', displayNewPrivateKeyOption);
  $('#generate_public_key_to_mail').addEventListener('click', generateAndAddPublicKey);
  $('#new_private_key_block_generate_button').addEventListener('click', generateNewPrivateKey);
  displaySettings(pgpMaster, pgpStorage);
};