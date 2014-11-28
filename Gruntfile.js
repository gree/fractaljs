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
          function removeLine(text, str) {
            var r = new RegExp("(^|\\n)[^\\n]+(" + str + ")[^\\n]*(\\n)", "g");
            while (true) {
              var tmp = text.replace(r, "$1");
              if (tmp === text) return text;
              text = tmp;
            }
          }
          src = removeLine(src, "console.time\\(");
          src = removeLine(src, "console.debug\\(");
          src = removeLine(src, "console.log\\(");
          src = removeLine(src, "//\\s*dev");
          var filename = (filepath.indexOf('__') >= 0) ? '' :
            ('// Source: ' + filepath + '\n');
          return filename + src;
        },
      },
      dist: {
        src: [
          'src/__head__.js',
          'src/interface.js',
          'src/utils.js',
          'src/require.js',
          'src/pubsub.js',
          'src/env.js',
          'src/component.js',
          'src/__foot__.js',
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

