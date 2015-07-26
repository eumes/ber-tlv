var del = require('del');
var gulp = require('gulp');
var mocha = require('gulp-mocha');
var tsproject = require('tsproject');

gulp.task('clean.test', function () {
  del.sync(['./test'], { force: true });
});

gulp.task('clean.dist', function () {
  del.sync(['./dist'], { force: true });
});


gulp.task('typescript.src', ['clean.dist'], function() {
  return tsproject.src('./tsconfig.json', { logLevel: 1 }).pipe(gulp.dest('./dist'));
});

gulp.task('build', ['typescript.src']);


gulp.task('typescript.test', ['clean.test'], function() {
  return tsproject.src('tsconfig.test.json', { logLevel: 1 }).pipe(gulp.dest('./test'));
});


gulp.task('mocha.test', ['typescript.test'], function() {
    return gulp.src('./test/**/*-test.js', { read: false })
        .pipe(mocha({ reporter: 'spec' }));
});

gulp.task('test', ['mocha.test']);


/*
gulp.task('typescript:lint', function(){
    return gulp.src([env.paths.source.main, env.paths.source.test])
        .pipe(tslint())
        .pipe(tslint.report('prose'));
});

gulp.task("typescript:documentation", function() {
    return gulp
        .src(env.paths.source.main)
        .pipe(typedoc({
            module: env.typescript.compiler.module,
            out: env.paths.release.documentation,
            name: "iso-7816",
            target: env.typescript.compiler.target,
            readme: "none",
            includeDeclarations: env.typescript.compiler.declarations
        }))
    ;
});
*/

//gulp.task('default', ['watch', 'build', 'test']);
