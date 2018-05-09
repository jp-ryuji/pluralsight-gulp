module.exports = function() {
  var client = './src/client/';
  var clientApp = client + 'app/';

  var config = {
    temp: './.tmp/',

    // Files paths
    alljs: [
      './src/**/*.js',
      './*.js'
    ],
    client: client,
    index: client + 'index.html',
    js: [
      clientApp + '**/*.module.js', // The naming rule complies with Angular
      clientApp + '**/*.js',
      '!' + clientApp + '**/*.spec.js' // '!' is for excluding files
    ],

    less: client + 'styles/styles.less',

    // Bower and NPM locations
    bower: {
      json: require('./bower.json'),
      directory: './bower_components/',
      ignorePath: '../..'
    }
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
