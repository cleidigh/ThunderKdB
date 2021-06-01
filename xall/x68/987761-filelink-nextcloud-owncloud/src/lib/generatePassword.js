/**
* Generates a password
*
* On Nextcloud, most strict password policy require:
* - Enforce upper and lower case characters
* - Enforce numeric characters
* - Enforce special characters
* @param {param} int length Length of password to generate
*/
function generatePassword(length) {
    const lower = "abcdefghijklmnopqrstuvwxyz";
    const upper = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    const numeric = "0123456789";
    // Excludes characters that fail to output if continuous: <>
    // Excludes characters that are hard to distinguish and easily overlooked: ,'`
    const special = '!"#$%&()*+-./:;=?@[\\]^_{|}~';
    const seed = lower + upper + numeric + special;

    const lowerRegex = new RegExp("[" + lower + "]");
    const upperRegex = new RegExp("[" + upper + "]");
    const numericRegex = new RegExp("[" + numeric + "]");
    const specialRegex = new RegExp("[" + special + "]");

    let limit = 100000;
    let i = 0;
    let password = "";
    while (i < limit) {
        i++;
        password = Array.from(Array(length)).map(() => seed[Math.floor(Math.random() * seed.length)]).join("");

        if (!lowerRegex.test(password)) { continue; }
        if (!upperRegex.test(password)) { continue; }
        if (!numericRegex.test(password)) { continue; }
        if (!specialRegex.test(password)) { continue; }

        break;
    }
    return password;
}

/* exported generatePassword */