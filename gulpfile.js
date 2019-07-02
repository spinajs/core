var gulp = require('gulp');

gulp.task('copy-pug', function () {
    gulp.src('./src/views/**/*.pug')
        .pipe(gulp.dest('./lib/views'));
});

gulp.task('copy-locales', function () {
    gulp.src('./src/locales/**/*.json')
        .pipe(gulp.dest('./lib/locales '));
});