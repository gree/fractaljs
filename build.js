var fs = require('fs')
var rollup = require('rollup')
var babel = require('rollup-plugin-babel')

var plugins = [
  babel({}),
];

rollup.rollup({
  input: 'src/index.js',
  plugins: plugins,
}).then(function (bundle) {
  ['umd'].forEach(v => {
    var file = 'dist/fractal.js';
    console.log(file);
    bundle.write({
      format: v,
      file: file,
      name: "F",
      sourcemap: true,
    });
  });
}).catch(function(e) {
  console.log("Build error:", e);
});
