var del = require('del');
var gulp = require('gulp');
var mocha = require('gulp-mocha');
var ts = require('gulp-typescript');
var merge = require('merge2');

gulp.task('typescript.clean', function () {
  del.sync(['./release'], { force: true });
});

gulp.task('typescript.build', ['typescript.clean'], function() {
  var tsProject = ts.createProject('tsconfig.json', { rootDir: './src' });
  var tsResult = tsProject.src()
      .pipe(ts(tsProject));


  return merge([
      tsResult.dts.pipe(gulp.dest('release/definitions')),
      tsResult.js.pipe(gulp.dest('release/js'))
  ]);
  return tsResult.js.pipe(gulp.dest('release'));
});

gulp.task('build', ['typescript.build']);

gulp.task('mocha.test', ['typescript.build'], function() {
    return gulp.src('./release/**/*-Specs.js', { read: false })
        .pipe(mocha({ reporter: 'spec' }));
});

gulp.task('test', ['mocha.test']);


gulp.task('test-standalone', function() {
    return gulp.src('./release/**/*-Specs.js', { read: false })
        .pipe(mocha({ reporter: 'spec' }));
});

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
