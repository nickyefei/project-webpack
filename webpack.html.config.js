const HtmlWebpackPlugin = require('html-webpack-plugin')
module.exports = {
  entry: {
    app: './src/index.js'
  },
  output: {
    path: '/dist',
    filename: '[name].js'
  },
  devServer: {
    hot: true,
    inline: true
  },
  resolve: {
    extensions: ['js', 'css', 'jsx']
  },
  plugins: [
    new HtmlWebpackPlugin({
      title: '自动建立页面1',
      filename: 'test1.html',
      chunks: ['test1']
    }),
    new HtmlWebpackPlugin({
      title: '自动建立页面2',
      filename: 'test2.html',
      chunks: ['test2']
    })
  ]
}