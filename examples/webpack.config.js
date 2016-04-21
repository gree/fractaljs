var path = require('path')
var webpack = require('webpack')

module.exports = {
  entry: ['./index.js'],
  output: {
    filename: 'bundle.js',
    publicPath: '/examples/',
    libraryTarget: 'umd'
  },
  module: {
    loaders: [
      {
        test: /\.js$/,
        loader: 'babel',
        query: {compact: false},
        exclude: /node_modules/,
      },
      { test: /\.html$/, loader: 'html' },
      { test: /\.css$/, loader: "style!css" },
    ]
  },
  babel: {},
  resolve: {
    root: [ path.join(__dirname, "bower_components") ],
  },
  plugins: [
    new webpack.ResolverPlugin(
      new webpack.ResolverPlugin.DirectoryDescriptionFilePlugin(".bower.json", ["main"])
    ),
    //   new webpack.ProvidePlugin({
    //     F: __dirname + "/../dist/fractal.js",
    //   })
  ],
  devtool: 'source-map'
}

