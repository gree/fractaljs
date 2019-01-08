const path = require('path');
const webpack = require('webpack');
const CleanWebpackPlugin = require('clean-webpack-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');

const distDir = 'www';

module.exports = {
  entry: [
    './src/index.js'
  ],
  plugins: [
    new CleanWebpackPlugin([distDir]),
    new HtmlWebpackPlugin({
      title: 'FractalJS Example',
      template: 'index.html',
    }),
  ],
  optimization: {
    runtimeChunk: "single",
    splitChunks: {
      cacheGroups: {
        vendor: {
          name: "common",
          chunks: "all"
        }
      }
    }
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /(node_modules|bower_components)/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['env']
          }
        }
      },
      { test: /\.html$/, use: 'handlebars-loader' },
      {
        test: /\.css$/,
        use: [ 'style-loader', 'css-loader' ]
      },
    ]
  },
  output: {
    filename: '[name].bundle.js',
    path: path.resolve(__dirname, distDir),
  },
}
