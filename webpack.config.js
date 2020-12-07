const { resolve } = require('path')
const webpack = require('webpack')
const HtmlWebpackPlugin = require('html-webpack-plugin')
const history = require('connect-history-api-fallback')
const convert = require('koa-connect')
const internalIp = require('internal-ip')
const url = require('url')
const MiniCssExtractPlugin = require('mini-css-extract-plugin')
const UglifyJsPlugin = require('uglify-js-plugin')



// 使用  WEBPACK_DEV_SERVER 环境变量检测当前是否是在 webpack-server 启动的开发环境中
const dev = Boolean(process.env.WEBPACK_DEV_SERVER)
// console.log(process.env)
// console.log(process.env.npm_lifecycle_event)
const config = require('./config/' + (process.env.npm_lifecycle_event || 'default'))
const pkgInfo = require('./package.json')

module.exports = {
  /*
  webpack 执行模式
  development：开发环境，它会在配置文件中插入调试相关的选项，比如 moduleId 使用文件路径方便调试
  production：生产环境，webpack 会将代码做压缩等优化
  */
  mode: dev ? 'development' : 'production',
  /*
  配置 source map
  开发模式下使用 cheap-module-eval-source-map, 生成的 source map 能和源码每行对应，方便打断点调试
  生产模式下使用 hidden-source-map, 生成独立的 source map 文件，并且不在 js 文件中插入 source map 路径，用于在 error report 工具中查看 （比如 Sentry)
  */
  devtool: dev ? 'cheap-module-eval-source-map' : 'hidden-source-map',
  entry: {
    main: ['./src/index.js']
  },
  output: {
    /*
    代码中引用的文件（js、css、图片等）会根据配置合并为一个或多个包，我们称一个包为 chunk。
    每个 chunk 包含多个 modules。无论是否是 js，webpack 都将引入的文件视为一个 module。
    chunkFilename 用来配置这个 chunk 输出的文件名。

    [chunkhash]：这个 chunk 的 hash 值，文件发生变化时该值也会变。使用 [chunkhash] 作为文件名可以防止浏览器读取旧的缓存文件。

    还有一个占位符 [id]，编译时每个 chunk 会有一个id。
    我们在这里不使用它，因为这个 id 是个递增的数字，增加或减少一个chunk，都可能导致其他 chunk 的 id 发生改变，导致缓存失效。
    */
    chunkFilename: '[chunkhash].js',
    path: resolve(__dirname, 'dist'),
    filename: dev ? '[name].js' : '[chunkhash].js',
    publicPath: config.publicPath
  },
  optimization: {
    minimizer: [],
    /*
    上面提到 chunkFilename 指定了 chunk 打包输出的名字，那么文件名存在哪里了呢？
    它就存在引用它的文件中。这意味着一个 chunk 文件名发生改变，会导致引用这个 chunk 文件也发生改变。

    runtimeChunk 设置为 true, webpack 就会把 chunk 文件名全部存到一个单独的 chunk 中，
    这样更新一个文件只会影响到它所在的 chunk 和 runtimeChunk，避免了引用这个 chunk 的文件也发生改变。
    */
    runtimeChunk: true,

    splitChunks: {
      /* 固化 chunkId，保持缓存的能力 */
      namedChunks: true,
      /*
        使用文件路径的 hash 作为 moduleId。
        虽然我们使用 [chunkhash] 作为 chunk 的输出名，但仍然不够。
        因为 chunk 内部的每个 module 都有一个 id，webpack 默认使用递增的数字作为 moduleId。
        如果引入了一个新文件或删掉一个文件，可能会导致其他文件的 moduleId 也发生改变，
        那么受影响的 module 所在的 chunk 的 [chunkhash] 就会发生改变，导致缓存失效。
        因此使用文件路径的 hash 作为 moduleId 来避免这个问题。
      */
      moduleIds: 'hashed',
      runtimeChunk: {
        name: 'manifest'
      },
      /*
      默认 entry 的 chunk 不会被拆分
      因为我们使用了 html-webpack-plugin 来动态插入 <script> 标签，entry 被拆成多个 chunk 也能自动被插入到 html 中，
      所以我们可以配置成 all, 把 entry chunk 也拆分了
      */
      chunks: 'all',
      cacheGroups: {
        libs: {
          name: 'chunk-libs',
          test: /[\\/]node_modules[\\/]/,
          priority: 10,
          chunks: 'initial' // 只打包初始时依赖的第三方
        },
        elementUI: {
          name: 'chunk-elementUI', // 单独将 elementUI 拆包
          priority: 20, // 权重要大于 libs 和 app 不然会被打包进 libs 或者 app
          test: /[\\/]node_modules[\\/]element-ui[\\/]/
        },
        commons: {
          name: 'chunk-commons',
          test: resolve('src/components'), // 可自定义拓展你的规则
          minChunks: 2, // 最小共用次数
          priority: 5,
          reuseExistingChunk: true
        }
      }
    }
  },
  module: {
    rules: [
      {
        /*
        使用 babel 编译 ES6 / ES7 / ES8 为 ES5 代码
        使用正则表达式匹配后缀名为 .js 的文件
        */
        test: /\.js$/,
        exclude: /node_modules/,
        /*
        use 指定该文件的 loader, 值可以是字符串或者数组。
        这里先使用 eslint-loader 处理，返回的结果交给 babel-loader 处理。loader 的处理顺序是从最后一个到第一个。
        eslint-loader 用来检查代码，如果有错误，编译的时候会报错。
        babel-loader 用来编译 js 文件。
        */
        use: [
          {
            loader: 'babel-loader'
            /* 可以禁用.babelrc内的配置，以下面的配置为准 */
            // options: {
            //   babelrc: false,
            //   plugins: [
            //     'dynamic-import-node'
            //   ]
            // }
          },
          {
            loader: 'eslint-loader'
          }
        ]
      },
      {
        test: /\.css$/,
        /*
        先使用 css-loader 处理，返回的结果交给 style-loader 处理。
        css-loader 将 css 内容存为 js 字符串，并且会把 background, @font-face 等引用的图片，
        字体文件交给指定的 loader 打包，类似上面的 html-loader, 用什么 loader 同样在 loaders 对象中定义，等会下面就会看到。
        */
        use: ['style-loader', 'css-loader']
        // use: [MiniCssExtractPlugin.loader, 'css-loader']
      },
      {
        test: /\.less$/,
        use: ['style-loader', 'css-loader', 'less-loader']
      },
      {
        test: /\.scss$/,
        use: ['style-loader', 'css-loader', 'sass-loader']
      },
      {
        test: /\.html$/,
        use: [
          {
            loader: 'html-loader',
            options: {
              /*
              如果 html-loader 不指定 attrs 参数，默认值是 img:src, 意味着会默认打包 <img> 标签的图片。
              这里我们加上 <link> 标签的 href 属性，用来打包入口 index.html 引入的 favicon.png 文件。
              */
              attrs: ['img:src', 'link:href'],
              root: resolve(__dirname, 'src')
            }
          },
          {
            loader: 'html-withimg-loader'
          }
        ]
      },
      {
        /*
        匹配 favicon.jpg
        上面的 html-loader 会把入口 index.html 引用的 favicon.png 图标文件解析出来进行打包
        打包规则就按照这里指定的 loader 执行
        */
        test: /favicon\.jpg$/,
        use: [
          {
            loader: 'file-loader', // js import 图片时，也可使用file-loader
            options: {
              name: '[hash].[ext]'
            }
          }
        ]
      },
      {
        test: /\.(png|jpg|jpeg|gif|eot|ttf|woff|woff2|svg|svgz)(\?.+)?$/,
        exclude: /favicon\.jpg$/,
        /*
        使用 url-loader, 它接受一个 limit 参数，单位为字节(byte)

        当文件体积小于 limit 时，url-loader 把文件转为 Data URI 的格式内联到引用的地方
        当文件大于 limit 时，url-loader 会调用 file-loader, 把文件储存到输出目录，并把引用的文件路径改写成输出后的路径

        比如 views/foo/index.html 中
        <img src="smallpic.png">
        会被编译成
        <img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAA...">
        而
        <img src="largepic.png">
        会被编译成
        /f78661bef717cf2cc2c2e5158f196384
        */
        use: [
          {
            loader: 'url-loader',
            options: {
              limit: 10000,
              fallback: 'responsive-loader', // 当图片大小超过限制，用responsive-loader处理，不设置默认用file-loader处理
              outputPath: 'images',
              name: '[name][hash:8].[ext]'
            }
          }
        ]
      }
    ]
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: './src/index.html',
      filename: 'index.html',
      title: 'index',
      chunks: ['main'],
      hash: true,
      chunksSortMode: 'none'
    }),
    /* 代码中插入环境变量  需要注意 DefinePlugin 设置的值是一个表达式，
    DEBUG: 'true'是设置DEBUG为boolean类型的true
    number: '1 + 1'是设置number为2，因为是一个表达式，所以'1 + 1'会进行运算将得到的值赋值给健
    string: '"这是文案"',设置字符串的值需要多嵌套一层引号
    variables: 'textVar'代表的是将textVar变量的值设置给variables，而不是将textVar作为字符串赋值给variables
    */
    new webpack.DefinePlugin({
      DEBUG: dev,
      VERSION: JSON.stringify(pkgInfo.version),
      CONFIG: JSON.stringify(config.runtimeConfig),
      number: '1 + 1',
      text: '"这是文案"'
    }),
    new MiniCssExtractPlugin({ // 提取为外部css代码
      filename: '[name].css?v=[contenthash]'
    }),
    new UglifyJsPlugin(), // 压缩js
  ],
  resolve: {
    extensions: ['.js', '.vue', '.json', '.jsx', '.scss'],
    alias: {
      '@': resolve(__dirname, 'src')
    },
    modules: [
      resolve(__dirname, './src'), // 模块查找路径
      'node_modules'
    ]
  },
  resolveLoader: {
    modules: ['node_modules', resolve(__dirname, 'loader')] // 配置loader解析的文件夹
  },
  performance: {
    hints: dev ? false : 'warning'
  },
  externals: {
    jquery: '$' // webpack打包时，会忽略掉jquery
  },
  devServer: {
    port: config.server.port,
    historyApiFallback: true,
    contentBase: './',
    quiet: false, // 控制台中不输出打包的信息
    noInfo: false,
    hot: true,
    inline: true,
    lazy: false,
    progress: true, // 显示打包的进度
    watchOptions: {
      aggregateTimeout: 500 // 防止重复保存频繁重新编译，500毫秒内重复保存不打包
    },
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        pathRewrite: {
          '/api': ''
        }
      }
    }
  }
}

/*
配置开发时用的服务器，让你可以用 http://127.0.0.1:8080/ 这样的 url 打开页面来调试
并且带有热更新的功能，打代码时保存一下文件，浏览器会自动刷新。

因为 webpack-cli 无法正确识别 serve 选项，使用 webpack-cli 执行打包时会报错。
因此我们在这里判断一下，仅当使用 webpack-serve 时插入 serve 选项。
issue：https://github.com/webpack-contrib/webpack-serve/issues/19
*/
if (dev) {
  module.exports.serve = {
    host: '0.0.0.0',
    hot: {
      host: {
        client: internalIp.v4.sync(),
        server: '0.0.0.0'
      }
    },
    port: config.server.port,
    // add: 用来给服务器的 koa 实例注入 middleware 增加功能
    add: app => {
      /*
      配置 SPA 入口

      SPA 的入口是一个统一的 html 文件，比如
      http://localhost:8080/foo
      我们要返回给它
      http://localhost:8080/index.html
      这个文件
      */
      app.use(convert(history({
        index: url.parse(config.publicPath).pathnam,
        disableDotRule: true,
        htmlAcceptHeaders: ['text/html', 'application/xhtml+xml']
      })))
    },
    dev: {
      /*
      指定 webpack-dev-middleware 的 publicpath
      一般情况下与 output.publicPath 保持一致（除非 output.publicPath 使用的是相对路径）
      https://github.com/webpack/webpack-dev-middleware#publicpath
      */
      publicPath: config.publicPath
    }
  }
}


function entires() {
  const files = glob.sync(entry_path + '/*/*.js')
  const map = {}
  files.forEach(filepath => {
    const filename = filepath.replace(/.*\/(\w+)\/\w+(\.html|\.js)$/, (res, $1) => $1)
    map[filename] = filepath
  });
}

function htmlplugin() {
  let htmls = glob.sync(entry_path + '/*/*.html')
  htmls.forEach(htmlpath => {
    const filename = htmlpath.replace(/.*\/(\w+)\/\w+(\.html|\.js)$/, (res, $1) => $1)
    let conf = {
      template: filepath,
      filename: filename + 'html',
      chunks: [filename],
      inject: true
    }
  })
}

