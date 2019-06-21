'use strict';
var del = require('del');
var { task, series, src, dest, watch } = require('gulp');
var minify = require('gulp-minify');
// Import `src` and `dest` from gulp for use in the task.
// Import Gulp plugins.
const babel = require('gulp-babel');
const webpack = require('gulp-webpack');
const plumber = require('gulp-plumber');

task('js', function () {
  return src('./live.js')
    .pipe(plumber())
  // Transpile the JS code using Babel's preset-env.
    .pipe(webpack(
      {
        options: {
          presets: ['@babel/env', {
            modules: false,
            targets: {
              browsers: ['> 2%', 'not ie < 11', 'safari > 9', 'not dead']
            }
          }]
        },
        output: {
          filename: 'live.js',
        },
      }
    ))
  // Save each component as a separate file in dist.
  //   .pipe(minify(
  //     { ext: {
  //       min: '.js'
  //     },
  //     noSource: true }
  //   ))
    .pipe(dest('./dist/'));
});
task('jsmin', function () {
  return src('./live.js')
    .pipe(plumber())
  // Transpile the JS code using Babel's preset-env.
    .pipe(webpack(
      {
        options: {
          presets: ['@babel/env', {
            modules: false,
            targets: {
              browsers: ['> 2%', 'not ie < 11', 'safari > 9', 'not dead']
            }
          }]
        },
        output: {
          filename: 'live.min.js',
        },
      }
    ))
  // Save each component as a separate file in dist.
  //   .pipe(minify(
  //     { ext: {
  //       min: '.js'
  //     },
  //     noSource: true }
  //   ))
    .pipe(minify(
      { ext: {
        min: '.js'
      },
      noSource: true }
    ))
    .pipe(dest('./dist/'));
});

task('clean', function () { return del(['dist']); });

task('default', series('clean', 'js', 'jsmin'));

task('watch', function () {
  watch('./live.js', series(['clean', 'js', 'jsmin']));
});
