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
  }
};
