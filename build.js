// Minifies the site's own CSS/JS from assets/{js,css}-src into assets/{js,css},
// which is what the HTML pages reference. Vendor libraries that already ship
// minified (jquery, bootstrap, popper, owl.carousel.min.*) are left untouched.
const fs = require("fs");
const path = require("path");
const esbuild = require("esbuild");
const CleanCSS = require("clean-css");

const JS_SRC_DIR = path.join(__dirname, "assets/js-src");
const JS_DIR = path.join(__dirname, "assets/js");
const CSS_SRC_DIR = path.join(__dirname, "assets/css-src");
const CSS_DIR = path.join(__dirname, "assets/css");

const JS_FILES = [
  "animation.js",
  "aos.js",
  "back-to-top-button.js",
  "carousel.js",
  "contact-form.js",
  "contact-validate.js",
  "counter.js",
  "currency-converter.js",
  "owl.carousel.js",
  "preloader.js",
  "sl-tours.js",
];

const CSS_FILES = [
  "aos.css",
  "magnific-popup.css",
  "responsive.css",
  "sl-tours.css",
  "style.css",
];

async function minifyJs() {
  for (const file of JS_FILES) {
    const src = fs.readFileSync(path.join(JS_SRC_DIR, file), "utf8");
    const before = Buffer.byteLength(src);
    const result = await esbuild.transform(src, {
      loader: "js",
      minify: true,
      target: "es2018",
    });
    fs.writeFileSync(path.join(JS_DIR, file), result.code);
    const after = Buffer.byteLength(result.code);
    console.log(`JS  ${file}: ${before} -> ${after} bytes`);
  }
}

function minifyCss() {
  const cleaner = new CleanCSS({ level: 2 });
  for (const file of CSS_FILES) {
    const src = fs.readFileSync(path.join(CSS_SRC_DIR, file), "utf8");
    const before = Buffer.byteLength(src);
    const output = cleaner.minify(src);
    if (output.errors.length) {
      console.error(`CSS ${file}: errors`, output.errors);
      continue;
    }
    fs.writeFileSync(path.join(CSS_DIR, file), output.styles);
    const after = Buffer.byteLength(output.styles);
    console.log(`CSS ${file}: ${before} -> ${after} bytes`);
  }
}

(async () => {
  await minifyJs();
  minifyCss();
  console.log("Build complete.");
})();
