/*
 *  MindMapper - web based mind mapping tool.
 *  Copyright (C) 2018 Tim Stephenson
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
var gulp        = require('gulp');
var jshint      = require('gulp-jshint');
var uglify      = require('gulp-uglify');
var concat      = require('gulp-concat');
var less        = require('gulp-less');
var minifyCSS   = require('gulp-minify-css');
var prefix      = require('gulp-autoprefixer');
var replace     = require('gulp-replace');
var scp         = require('gulp-scp2');
var workboxBuild = require('workbox-build');
var zip         = require('gulp-zip');

gulp.task('clean', function(done) {
  return del(['dist'], done);
});

gulp.task('assets', function() {
  return gulp.src([ 'src/**/*.html', 'src/**/*.json', 'src/**/*.xslt' ])
      .pipe(gulp.dest('dist'));
});

gulp.task('scripts', function() {
  return gulp.src([
    'src/js/**/*.js'
  ])
  .pipe(uglify())
  .pipe(gulp.dest('dist/js'));
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
  .pipe(minifyCSS())
  .pipe(gulp.dest('dist/css'));
});

gulp.task('compile',
  gulp.series(/*'test',*/ 'scripts', 'styles')
);

gulp.task('gen-sw', function() {
  return workboxBuild.generateSW({
    globDirectory: 'dist',
    globPatterns: [
      '**\/*.{html,json,js,css}',
    ],
    swDest: 'dist/sw.js',
  });
});

gulp.task('package', () =>
  gulp.src(['dist/*','!dist/*.zip'])
      .pipe(zip('archive.zip'))
      .pipe(gulp.dest('dist'))
);

gulp.task('install',
  gulp.series('compile', 'assets', 'gen-sw', 'package')
);

