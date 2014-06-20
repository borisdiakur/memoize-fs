'use strict';

module.exports = function(grunt) {

    grunt.initConfig({
        jshint: {
            options: JSON.parse(require('fs').readFileSync('.jshintrc')),
            all: ['**/*.js', '!node_modules/**/*']
        }
    });

    grunt.loadNpmTasks('grunt-contrib-jshint');
    grunt.registerTask('default', 'jshint');
};
