const path = require('path');
const webpack = require('webpack');

module.exports = {
  mode: 'development',
  entry: './src/renderer.jsx',
  target: 'electron-renderer',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'renderer.js',
  },
  module: {
    rules: [
      {
        test: /\.(js|jsx)$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: [
              ['@babel/preset-env', {
                targets: {
                  node: 'current',
                  electron: '20'
                },
                include: [
                  '@babel/plugin-transform-optional-chaining',
                  '@babel/plugin-transform-nullish-coalescing-operator'
                ]
              }],
              '@babel/preset-react'
            ],
            plugins: [
              '@babel/plugin-transform-optional-chaining',
              '@babel/plugin-transform-nullish-coalescing-operator'
            ]
          },
        },
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader'],
      },
      {
        test: /\.(woff|woff2|eot|ttf|otf)$/,
        use: [
          {
            loader: 'file-loader',
            options: {
              name: '[name].[ext]',
              outputPath: 'fonts/'
            }
          }
        ]
      }
    ],
  },
  plugins: [
    ...(process.env.CONFIG_SIDEBAR_SECTIONS ? [
      new webpack.NormalModuleReplacementPlugin(
        /configurationSidebarSections\.json$/,
        path.resolve(__dirname, process.env.CONFIG_SIDEBAR_SECTIONS)
      )
    ] : []),
    ...(process.env.CONFIG_SIDEBAR_ABOUT ? [
      new webpack.NormalModuleReplacementPlugin(
        /configurationSidebarAbout\.json$/,
        path.resolve(__dirname, process.env.CONFIG_SIDEBAR_ABOUT)
      )
    ] : []),
    ...(process.env.CONFIG_SIDEBAR_COMMANDS ? [
      new webpack.NormalModuleReplacementPlugin(
        /configurationSidebarCommands\.json$/,
        path.resolve(__dirname, process.env.CONFIG_SIDEBAR_COMMANDS)
      )
    ] : [])
  ],
  resolve: {
    extensions: ['.js', '.jsx']
  },
  node: {
    __dirname: false,
    __filename: false
  }
}; 