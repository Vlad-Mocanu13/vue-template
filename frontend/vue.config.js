const { defineConfig } = require('@vue/cli-service')
module.exports = defineConfig({
    publicPath: '/public',
    devServer: {
        disableHostCheck: true,
        https: true,
        proxy: {
          '^/api': {
            target: 'https://localhost:443/public',
            secure: false,
            changeOrigin: true,
          },
        },
      },
})
