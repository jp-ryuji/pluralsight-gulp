var gulp = require('gulp');
var args = require('yargs').argv;
var print = require('gulp-print').default;
var del = require('del');
var browserSync = require('browser-sync');

var config = require('./gulp.config')();

var $ = require('gulp-load-plugins')({ lazy: true });
var port = process.env.PORT || config.defaultPort;

gulp.task('tasks', $.taskListing); // NOTE: `help` doesn't work, so use `tasks`
gulp.task('default', ['tasks']);

gulp.task('vet', function() {
  log('Analyzing source with JSHint and JSCS');

  return gulp
    .src(config.alljs)
    .pipe($.if(args.verbose, print())) // NOTE: print when --verbose is passed
    .pipe($.jscs())
    .pipe($.jshint())
    .pipe($.jshint.reporter('jshint-stylish', { verbose: true }))
    .pipe($.jshint.reporter('fail'));
});

gulp.task('styles', ['clean-styles'], function() {
  log('Compiling Less --> CSS');

  return gulp
    .src(config.less)
    .pipe($.plumber())
    .pipe($.less())
    // .on('error', errorLogger)
    .pipe($.autoprefixer({ browsers: ['last 2 versions', '> 5%'] }))
    .pipe(gulp.dest(config.temp));
});

gulp.task('fonts', ['clean-fonts'], function() {
  log('Copying fonts');

  return gulp.src(config.fonts)
    .pipe(gulp.dest(config.build + 'fonts'));
});

gulp.task('images', ['clean-images'], function() {
  log('Copying and compressing images');

  return gulp.src(config.images)
    .pipe($.imagemin({ optimizationLevel: 4 }))
    .pipe(gulp.dest(config.build + 'images'));
});

gulp.task('clean', function() {
  var delconfig = [].concat(config.build, config.temp);
  log('Cleaning: ' + $.util.colors.blue(delconfig));
  del(delconfig)
});

gulp.task('clean-fonts', function() {
  clean(config.build + 'fonts/**/*.*');
});

gulp.task('clean-images', function() {
  clean(config.build + 'images/**/*.*');
});

gulp.task('clean-styles', function() {
  clean(config.temp + '**/*.css');
});

gulp.task('clean-code', function() {
  var files = [].concat(
    config.temp + '**/*.js',
    config.build + '**/*.html',
    config.build + 'js/**/*.js',
  );
  clean(files);
});

gulp.task('less-watcher', function() {
  gulp.watch([config.less], ['styles']);
});

gulp.task('templatecache', ['clean-code'], function() {
  log('Creating AngularJS $templateCache');

  return gulp
    .src(config.htmltemplates)
    .pipe($.minifyHtml({ empty: true }))
    .pipe($.angularTemplatecache(
      config.templateCache.file,
      config.templateCache.options,
      ))
    .pipe(gulp.dest(config.temp));
});

gulp.task('wiredep', function() {
  log('Wire up the bower css js and our app js into the html');

  var options = config.getWiredepDefaultOptions();
  var wiredep = require('wiredep').stream;

  return gulp
    .src(config.index)
    .pipe(wiredep(options))
    .pipe($.inject(gulp.src(config.js)))
    .pipe(gulp.dest(config.client));
});

gulp.task('inject', ['wiredep', 'styles', 'templatecache'], function() {
  log('Wire up the app css into the html, and call wiredep');

  return gulp
    .src(config.index)
    .pipe($.inject(gulp.src(config.css)))
    .pipe(gulp.dest(config.client));
});

// NOTE: A script tag is inserted in build/index.html.
// NOTE: see: https://github.com/johnpapa/pluralsight-gulp/issues/34#issuecomment-248982588
gulp.task('optimize', ['inject', 'fonts', 'images'], function() {
  log('Optimizing the javascript, css, html');

  var templateCache = config.temp + config.templateCache.file;
  var cssFilter = $.filter('**/*.css', { restore: true });
  var jsFilter = $.filter('**/*.js', { restore: true });

  return gulp
    .src(config.index)
    .pipe($.plumber())
    .pipe($.inject(gulp.src(templateCache, { read: false }), {
      starttag: '<!-- inject:templates:js -->'
    }))
    .pipe($.useref({ searchPath: './' })) // NOTE: The js files are concatinated into the build folder. And those files are put into index.html. But this doesn't work for css. Is that a matter of adding tags in index.html under src dir?

    .pipe(cssFilter)
    .pipe($.csso())
    .pipe(cssFilter.restore)

    .pipe(jsFilter)
    .pipe($.uglify())
    .pipe(jsFilter.restore)

    // NOTE: Not sure if the following rev stuff in put in an appropriate place. Maybe it is because revisioned files are created in the build directory.
    // FIXME: But index.html is also revisioned. gulp serve-build works. But it looks wrong.
    .pipe($.rev()) // app.js -> app-<something>.js
    .pipe($.revReplace()) // FIXME: $.useref() might be neede before this.
    .pipe($.rev.manifest())

    .pipe(gulp.dest(config.build));

});

// Bump the version
// * --type=pre will bump the prerelease version *.*.*-x
// * --type=patch or no flag will bump the patch verison *.*.x
// * --type=minor will bump the minor version *.x.*
// * --type=major will bump the major version x.*.*
// * --version=1.2.3 will bump to a specific version and ignore other flags
gulp.task('bump', function() {
  var msg = 'Bumping versions';
  var type = args.type;
  var version = args.version;
  var options = {};

  if (version) {
    options.version = version;
    msg += ' to ' + version;
  } else {
    options.type = type;
    msg += ' for a ' + type;
  }

  log(msg);

  return gulp
    .src(config.packages)
    .pipe(print())
    .pipe($.bump(options))
    .pipe(gulp.dest(config.root));
});

// FIXME: The files are concatinated and minified correctly, but separated files seem to be sent to the browser.
gulp.task('serve-build', ['optimize'], function() {
  serve(false);
});

gulp.task('serve-dev', ['inject'], function() {
  serve(true);
});

//////////////

function serve(isDev) {
  var isDev = true;

  var nodeOptions = {
    script: config.nodeServer,
    delayTime: 1,
    env: {
      'PORT': port,
      'NODE_ENV': isDev ? 'dev' : 'build'
    },
    watch: [config.server]
  };

  return $.nodemon(nodeOptions)
    .on('restart', ['vet'], function(ev) {
      log('*** nodemon restarted');
      log('files changed on restart:\n' + ev);
      setTimeout(function() {
        browserSync.notify('reloading now...');
        browserSync.reload({ stream: false });
      }, config.browserReloadDelay);
    })
    .on('start', function() {
      log('*** nodemon started');
      startBrowserSync(isDev);
    })
    .on('crash', function() {
      log('*** nodemon crashed: script crashed for some reason');
    })
    .on('exit', function() {
      log('*** nodemon exited cleanly');
    });
}

function changeEvent(event) {
  var srcPattern = new RegExp('/.*(?=/' + config.source + ')/');
  log('File ' + event.path.replace(srcPattern, '') + ' ' + event.type);
}

function startBrowserSync(isDev) {
  if (args.nosync || browserSync.active) {
    return;
  }

  log('Starting browser-sync on port' + port);

  // FIXME: The changes are detected, but the browser is not reloaded (CSS is fetched).
  //   `Injecting CSS From Less`
  if (isDev) {
    gulp.watch([config.less], ['styles'])
        .on('change', function(event) { changeEvent(event); });
  } else {
    gulp.watch([config.less, config.js, config.html], ['optimize', browserSync.reload])
        .on('change', function(event) { changeEvent(event); });
  }

  var options = {
    proxy: 'localhost:' + port,
    port: 3000,
    files: isDev ? [
      config.client + '**/*.*',
      '!' + config.less,
      config.temp + '**/*.css'
    ] : [],
    ghostMode: {
      clicks: true,
      location: false,
      forms: true,
      scroll: true
    },
    injectChanges: true, // In case of false, always reload.
    logFileChanges: true,
    logLevel: 'debug',
    logPrefix: 'gulp-patterns',
    notify: true,
    reloadDelay: 1000 // ms
  };

  browserSync(options);
}

function errorLogger(error) {
  log('*** Start of Error ***');
  log(error);
  log('*** End of Error ***');
  this.emit('end');
}

function clean(path) {
  log('Cleaning' + $.util.colors.blue(path));
  del(path);
}

function log(msg) {
  if (typeof(msg) === 'object') {
    for (var item in msg) {
      if (msg.hasOwnProperty(item)) {
        $.util.log($.util.colors.blue(msg[item]));
      } else {
        $.util.log($.util.colors.blue(msg));
      }
    }
  } else {
    $.util.log($.util.colors.blue(msg));
  }
}
