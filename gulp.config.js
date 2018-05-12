module.exports = function() {
  var client = './src/client/';
  var clientApp = client + 'app/';
  var root = './';
  var server = './src/server/';
  var temp = './.tmp/';

  var config = {
    // Files paths
    alljs: [
      './src/**/*.js',
      './*.js'
    ],
    build: './build/',
    client: client,
    css: temp + 'styles.css',
    fonts: './bower_components/font-awesome/fonts/**/*.*',
    html: '**/*.html',
    htmltemplates: clientApp + '**/*.html',
    images: client + 'images/**/*.*',
    index: client + 'index.html',
    js: [
      clientApp + '**/*.module.js', // The naming rule complies with Angular
      clientApp + '**/*.js',
      '!' + clientApp + '**/*.spec.js' // '!' is for excluding files
    ],
    less: client + 'styles/styles.less',
    root: root,
    server: server,
    temp: temp,

    // template cache
    templateCache: {
      file: 'templates.js',
      options: {
        module: 'app.core',
        standAlone: false,
        root: 'app/'
      }
    },

    // browser sync
    browserReloadDelay: 1000,

    // Bower and NPM locations
    bower: {
      json: require('./bower.json'),
      directory: './bower_components/',
      ignorePath: '../..'
    },
    packages: [
      './package.json',
      './bower.json'
    ],

    // Node settings
    defaultPort: 7203,
    nodeServer: './src/server/app.js'
  };

  config.getWiredepDefaultOptions = function() {
    var options = {
      bowerJson: config.bower.json,
      directory: config.bower.directory,
      ignorePath: config.bower.ignorePath
    };

    return options;
  };

  return config;
};
