// They're not plugins.
var gulp = require('gulp');
var args = require('yargs').argv;
var print = require('gulp-print').default;
var del = require('del');

var config = require('./gulp.config')();

var $ = require('gulp-load-plugins')({ lazy: true });
// They're plugins.
// var jshint = require('gulp-jshint');
// var jscs = require('gulp-jscs');
// var util = require('gulp-util');
// var gulpif = require('gulp-if');

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
    .pipe($.less())
    .pipe($.autoprefixer({ browsers: ['last 2 versions', '> 5%'] }))
    .pipe(gulp.dest(config.temp));
});

gulp.task('clean-styles', function() {
  var files = config.temp + '**/*.css';
  clean(files);
});

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
