var gulp = require('gulp'),
    ts = require('gulp-typescript'),
    browserSync = require('browser-sync');

gulp.task('serve',[], function() {
    browserSync.init({
        //指定服务器启动根目录
        server: "./"
    });
    //监听任何文件变化，实时刷新页面
    gulp.watch(["./src/**/*.*","./test/**/*.*"]).on('change', browserSync.reload);
});

gulp.task('watch',['scripts'],function(){
  gulp.watch('src/**/*.ts',['scripts'])
})
