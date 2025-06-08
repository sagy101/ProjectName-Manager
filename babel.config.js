module.exports = {
  presets: [
    ['@babel/preset-env', { targets: { node: 'current', electron: '20' } }],
    '@babel/preset-react'
  ],
  plugins: [
    '@babel/plugin-transform-optional-chaining',
    '@babel/plugin-transform-nullish-coalescing-operator'
  ]
};
