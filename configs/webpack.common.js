'use strict';
const path = require('path');
const TerserPlugin = require('terser-webpack-plugin');

const scriptFileName = 'dx.filemanager.nodejs.filesystem.provider';
const libDir = path.resolve(__dirname, '..', 'lib');
const distDir = path.resolve(__dirname, '..', 'dist');
const sources = [
    path.resolve(libDir, 'index.js'),
];

module.exports = {
    scriptFileName,
    sources,
    config: {
        entry: {
            [scriptFileName]: sources
        },
        output: {
            library: ['DevExpress', 'FileManager', 'FileProvider'],
            filename: '[name].js',
            path: distDir,
        },
        resolve: {
            extensions: ['.js']
        },
        optimization: {
            minimize: true,
            minimizer: [
                new TerserPlugin({ test: /\.min\.js$/ }),
            ]
        },
    }
};
