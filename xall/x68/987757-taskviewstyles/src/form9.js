const form9 = window.document.getElementById('form9');
form9.addEventListener('click', notifyBackgroundPage9);

function handleResponse9(message) {console.log(`Message from background9: ${message.response9}`)};

function notifyBackgroundPage9(e) {var sending9 = browser.runtime.sendMessage({execute9: "Executing from form9"});
                                                 sending9.then(handleResponse9);}