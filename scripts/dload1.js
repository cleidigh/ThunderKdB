const fs = require('fs-extra');
const download = require('download');

let aoIdentifier = 90003;
let file = `https://addons.thunderbird.net/api/v4/addons/addon/${aoIdentifier}`;

download(file, `.\\${aoIdentifier}-localfolders`).then(() => {
    console.log('done!');
});
 
/* 
download('http://unicorn.com/foo.jpg').then(data => {
    fs.writeFileSync('dist/foo.jpg', data);
});
 
download('unicorn.com/foo.jpg').pipe(fs.createWriteStream('dist/foo.jpg'));
 
Promise.all([
    'unicorn.com/foo.jpg',
    'cats.com/dancing.gif'
].map(x => download(x, 'dist'))).then(() => {
    console.log('files downloaded!');
});
 */

// With async/await:
async function example (f) {
  const obj = await fs.readJson(f, { throws: false })

  console.log(obj) // => null
}

example(`${aoIdentifier}-localfolders\\${aoIdentifier}`)