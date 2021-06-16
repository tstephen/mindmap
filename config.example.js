module.exports = {
  dev: {
    js: {
      minify: false
    },
    css: {
      cssnano: false
    },
  },
  stage: {
    js: {
      minify: false
    },
    css: {
      cssnano: true
    },
  },
  prod: {
    js: {
      minify: false
    },
    css: {
      cssnano: true
    },
    server: {
      host: 'example.com',
      usr: 'remoteuser',
      dir: '/var/www',
      privateKey: '/home/localuser/.ssh/id_rsa'
    }
  }
};
