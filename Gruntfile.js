module.exports = function (grunt) {

  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),

    connect: {
      server: {
        options: {
          port: 9000,
          keepalive: true,
        }
      }
    },

    concat: {
      options: {
        process: function(src, filepath) {
          return '// Source: ' + filepath + '\n' +
            src.replace(/(^|\n)[ \t]*(console.time|console.debug|console.log)\([^\n]+(\n)/g, '$1');
        },
      },
      dist: {
        src: [
          'src/interface.js',
          'src/utils.js',
          'src/require.js',
          'src/pubsub.js',
          'src/env.js',
          'src/component.js'
        ],
        dest: 'dist/fractal.js'
      },
      app: {
        src: [
          'src/app.js'
        ],
        dest: 'dist/fractal.app.js',
      },
    },

    uglify: {
      options: {
        sourceMap: function(name) { return name.replace(/.js/,".map");}
      },
      dist: {
        files: {
          'dist/fractal.min.js': 'dist/fractal.js'
        }
      }
    },

    watch: {
      js: {
        files: 'src/*.js',
        tasks: ['concat', 'uglify']
      }
    },
  });

  grunt.loadNpmTasks('grunt-contrib-connect');
  grunt.loadNpmTasks('grunt-contrib-concat');
  grunt.loadNpmTasks('grunt-contrib-uglify');
  grunt.loadNpmTasks('grunt-contrib-watch');
  grunt.registerTask('default', ['connect']);
};

