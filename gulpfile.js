/*
 *  MindMapper - web based mind mapping tool.
 *  Copyright (c) 2018-21 Tim Stephenson
 *
 *  This program is free software; you can redistribute it and/or modify
 *  it under the terms of the GNU General Public License as published by
 *  the Free Software Foundation; either version 2 of the License, or
 *  (at your option) any later version.
 *
 *  This program is distributed in the hope that it will be useful,
 *  but WITHOUT ANY WARRANTY; without even the implied warranty of
 *  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 *  GNU General Public License for more details.
 *
 *  You should have received a copy of the GNU General Public License along
 *  with this program; if not, write to the Free Software Foundation, Inc.,
 *  51 Franklin Street, Fifth Floor, Boston, MA 02110-1301 USA.
 */

var del         = require('del');
var log         = require('fancy-log');
var gulp        = require('gulp');
var babel       = require('gulp-babel');
var cleanCSS    = require('gulp-clean-css');
var jshint      = require('gulp-jshint');
var minimist    = require('minimist');
var concat      = require('gulp-concat');
var prefix      = require('gulp-autoprefixer');
var replace     = require('gulp-replace');
var rsync       = require('gulp-rsync');
var through2    = require('through2');
var workboxBuild = require('workbox-build');
var zip         = require('gulp-zip');

var vsn         = '0.2.0';
var buildDir    = 'dist';
var finalName   = 'mindmap-'+vsn+'.jar'

var argv = minimist(process.argv.slice(2));
var env = argv['env'] || 'dev';
log.warn('ENVIRONMENT SET TO: '+env);
var config = require('./config.js')[env];

gulp.task('clean', function(done) {
  return del([buildDir], done);
});

gulp.task('assets', function() {
  return gulp.src([ 'src/**/*.html', 'src/**/*.json', 'src/**/*.xslt' ])
      .pipe(gulp.dest(buildDir));
});

gulp.task('scripts', function() {
  return gulp.src([
    'src/js/**/*.js'
  ])
  .pipe(config.js.minify ? babel({ presets: [ ["minify", { "builtIns": false }] ] }) : through2.obj())
  .pipe(gulp.dest(buildDir+'/js'));
});

gulp.task('test', function() {
  return gulp.src([
    'src/js/**/*.js',
    '!src/js/vendor/**/*.js'
  ])
  .pipe(jshint())
  .pipe(jshint.reporter('default'))
  .pipe(jshint.reporter('fail'));
});

gulp.task('styles', function() {
  return gulp.src([
    'src/css/**/*.css'
  ])
  .pipe(config.css.minify ? cleanCSS() : through2.obj())
  .pipe(gulp.dest(buildDir+'/css'));
});

gulp.task('compile',
  gulp.series(/*'test',*/ 'scripts', 'styles')
);

gulp.task('gen-sw', function() {
  return workboxBuild.generateSW({
    globDirectory: buildDir,
    globPatterns: [
      '**\/*.{html,json,js,css}',
    ],
    swDest: buildDir+'/sw.js',
  });
});

gulp.task('package', () =>
  gulp.src([buildDir+'/*','!'+buildDir+'/*.zip'])
      .pipe(zip('archive.zip'))
      .pipe(gulp.dest(buildDir))
);

gulp.task('build',
  gulp.series('compile', 'assets', 'gen-sw')
);

gulp.task('install',
  gulp.series('compile', 'assets', 'gen-sw', 'package')
);

gulp.task('_deploy', function() {
  log.warn('Deploying to '+env);
  if (config.server != undefined) {
    return gulp.src([buildDir+'/**/*','!'+buildDir+'/archive.zip'])
    .pipe(rsync({
      root: buildDir+'/',
      hostname: config.server.host,
      destination: config.server.dir,
      archive: false,
      silent: false,
      compress: true
    }))
    .on('error', function(err) {
      console.log(err);
    });
  } else {
    log.error('No config.server specified for '+env);
  }
});

gulp.task('deploy',
  gulp.series('install', '_deploy')
);

