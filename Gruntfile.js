module.exports = function (grunt) {
  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),

    connect: {
      server: {
        options: {
          port: 9010,
          keepalive: true,
        }
      }
    },

    concat: {
      options: {
        process: function(src, filepath) {
          //src = src.replace(new RegExp("\\n+"), "\n");
          var lines = src.split("\n");
          var cnt = 0;
          while (true) {
            var l = lines.shift();
            if (l === "// -- BEGIN --" || ++cnt > 100) {
              break;
            }
          }
          var resultLines = [];
          lines.forEach(function(v){
            if (v.match(/^\s*\/\//)) return;
            if (v.match(/console\./)) return;
            resultLines.push(v);
          });
          return resultLines.join("\n");
        },
      },
      dist: {
        src: [
          'src/fractal.js',
        ],
        dest: 'dist/fractal.js'
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

