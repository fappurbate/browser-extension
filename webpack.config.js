const path = require('path');
const VueLoaderPlugin = require('vue-loader/lib/plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');

module.exports = [
  {
    entry: './src/background/index.js',
    output: {
      path: path.join(__dirname, 'dist'),
      filename: 'background.js'
    },
    module: {
      rules: [
        {
          test: /\.js$/,
          exclude: /node_modules/,
          use: [
            {
              loader: 'babel-loader',
              options: {
                presets: [ '@babel/preset-env' ]
              }
            }
          ]
        }
      ]
    },
    plugins: [
      new CopyWebpackPlugin([
        { from: 'src/manifest.json', to: './' },
        { from: 'assets/', to: './assets/' }
      ])
    ]
  },
  {
    entry: [
      './src/content/translator/index.js',
      './src/content/translator/index.css'
    ],
    output: {
      path: path.join(__dirname, 'dist', 'content'),
      filename: 'translator.js'
    },
    module: {
      rules: [
        {
          test: /\.js$/,
          exclude: /node_modules/,
          use: [
            {
              loader: 'babel-loader',
              options: {
                presets: [ '@babel/preset-env' ]
              }
            }
          ]
        },
        {
          test: /\.css$/,
          exclude: /node_modules/,
          use: [
            {
              loader: 'file-loader',
              options: {
                name: 'translator.css'
              }
            },
            { loader: 'extract-loader' },
            { loader: 'css-loader' }
          ]
        }
      ]
    }
  },
  {
    entry: [
      './src/popup/index.js',
      './src/popup/index.html'
    ],
    output: {
      path: path.join(__dirname, 'dist'),
      filename: 'popup.js'
    },
    module: {
      rules: [
        {
          test: /\.js$/,
          exclude: /node_modules/,
          use: [
            {
              loader: 'babel-loader',
              options: {
                presets: [ '@babel/preset-env' ]
              }
            }
          ]
        },
        {
          test: /\.vue$/,
          exclude: /node_modules/,
          use: [ { loader: 'vue-loader' } ]
        },
        {
          test: /\.html$/,
          use: [
            {
              loader: 'file-loader',
              options: {
                name: 'popup.html'
              }
            },
            { loader: 'extract-loader' },
            { loader: 'html-loader' }
          ]
        },
        {
          test: /\.css$/,
          use: [
            { loader: 'vue-style-loader' },
            { loader: 'css-loader' }
          ]
        }
      ]
    },
    resolve: {
      alias: {
        vue: 'vue/dist/vue.js'
      }
    },
    plugins: [
      new VueLoaderPlugin()
    ]
  }
].map(conf => ({ ...conf, mode: 'development' }));
