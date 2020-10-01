const fs = require("fs");
const path = require("path");
const merge = require('webpack-merge');
const webpack = require('webpack');
const common = require('./webpack.common.js');
const eula = "https://www.devexpress.com/Support/EULAs";

module.exports = merge(common.config, {
  entry: {
    [common.scriptFileName + '.min']: common.sources
  },
  mode: 'production',
  plugins: [
    new webpack.BannerPlugin({
      banner: fs.readFileSync(path.resolve(__dirname, '.license-header'), 'utf8')
        .replace("[version]", require(path.resolve(__dirname, '..', 'package.json')).version)
        .replace("[year]", new Date().getFullYear())
        .replace("[eula]", eula)
        .replace("[date]", new Date().toDateString()),
      test: /\.(js)$/
    })
  ],
});