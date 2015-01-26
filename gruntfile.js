'use strict';

module.exports = function(grunt) {

    grunt.initConfig({
        jshint: {
            options: JSON.parse(require('fs').readFileSync('.jshintrc')),
            all: ['**/*.js', '!node_modules/**/*']
        }
    });

    grunt.loadNpmTasks('grunt-contrib-jshint');
    grunt.loadNpmTasks('grunt-nsp-package');
    grunt.registerTask('hint', ['jshint']);
    grunt.registerTask('audit', ['validate-package']);
    grunt.registerTask('default', ['hint', 'audit']);
};
