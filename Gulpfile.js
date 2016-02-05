var gulp = require('gulp');
var sass = require('gulp-sass');
var sassdoc = require('sassdoc');
var converter = require('sass-convert');
var autoprefixer = require('gulp-autoprefixer');
var sourcemaps = require('gulp-sourcemaps');
var concat = require('gulp-concat');

// Compile sass files in the blink_sass/cgc/ folder
gulp.task('sass-cgc', function(){
    gulp.src('blink_sass/cgc/style.sass')
        .pipe(sass().on('error', sass.logError))
        .pipe(sourcemaps.init())
        .pipe(autoprefixer())
        .pipe(sourcemaps.write())
        .pipe(concat('style-cgc.css'))
        .pipe(gulp.dest('static/css/'));
})

// Compile bootstrap scss
gulp.task('bootstrap-sass-cgc', function(){
    // Convert variables.sass to variables.scss to be used in bootstrap scss
    // Create custom bootstrap styles
    gulp.src('blink_sass/cgc/variables.sass')
        .pipe(converter({
            from: 'sass',
            to: 'scss',
            rename: true
        }))
        .pipe(gulp.dest('blink_sass/vendor/'));
    // Compile bootstrap scss to css
    gulp.src('blink_sass/vendor/vendor.scss')
        .pipe(sass().on('error', sass.logError))
        .pipe(concat('bootstrap-cgc.css'))
        .pipe(gulp.dest('static/css/'));
})


// Compile sass files in the blink_sass/lsdf/ folder
gulp.task('sass-lsdf', function(){
    gulp.src('blink_sass/lsdf/style.sass')
        .pipe(sass().on('error', sass.logError))
        .pipe(sourcemaps.init())
        .pipe(autoprefixer())
        .pipe(sourcemaps.write())
        .pipe(concat('style-lsdf.css'))
        .pipe(gulp.dest('static/css/'));
})

// Compile bootstrap scss
gulp.task('bootstrap-sass-lsdf', function(){
    // Convert variables.sass to variables.scss to be used in bootstrap scss
    // Create custom bootstrap styles
    gulp.src('blink_sass/lsdf/variables.sass')
        .pipe(converter({
            from: 'sass',
            to: 'scss',
            rename: true
        }))
        .pipe(gulp.dest('blink_sass/vendor/'));
    // Compile bootstrap scss to css
    gulp.src('blink_sass/vendor/vendor.scss')
        .pipe(sass().on('error', sass.logError))
        .pipe(concat('bootstrap-lsdf.css'))
        .pipe(gulp.dest('static/css/'));
})

gulp.task('cgc-style', function(){
    gulp.watch('blink_sass/cgc/**/*.sass', ['sass-cgc']);
    gulp.watch(['blink_sass/cgc/variables.sass', 'blink_sass/**/*.scss'], ['bootstrap-sass-cgc']);
})

gulp.task('lsdf-style', function(){
    gulp.watch('blink_sass/lsdf/**/*.sass', ['sass-lsdf']);
    gulp.watch(['blink_sass/lsdf/variables.sass', 'blink_sass/**/*.scss'], ['bootstrap-sass-lsdf']);
})