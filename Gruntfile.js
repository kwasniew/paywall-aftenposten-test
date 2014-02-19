module.exports = function(grunt)
{
    grunt.initConfig(
    {
        pkg: grunt.file.readJSON('package.json'),

        watch: {
            css: {
                files: ['sass/**/*.scss'],
                tasks: ['sass', 'autoprefixer', 'cmq', 'imagemin', 'imageEmbed']
            }
        },

        sass: {
            dist: {
                files: {
                    'www/css/paywall.css': 'sass/paywall.scss'
                }
            }
        },

        autoprefixer: {
            dist: {
                files: {
                    'www/css/paywall.css': 'www/css/paywall.css'
                }
            }
        },

        cmq: {
            dist: {
                files: {
                    'www/css': ['www/css/paywall.css']
                }
            }
        },

        imagemin: {
            png: {
                options: {
                    optimizationLevel: 7
                },
                files: [
                {
                    expand: true,
                    src: 'www/gfx/**/*.png'
                }]
            },
            jpg: {
                options: {
                    progressive: true
                },
                files: [
                {
                    expand: true,
                    src: 'www/gfx/**/*.{jpg,jpeg}'
                }]
            },
            gif: {
                options: {
                    interlaced: false
                },
                files: [
                {
                    expand: true,
                    src: 'www/gfx/**/*.gif'
                }]
            }
        },

        imageEmbed: {
            dist: {
                src: ['www/css/paywall.css'],
                dest: 'www/css/paywall.css',
                options: {
                    baseDir: 'www',
                    deleteAfterEncoding: false
                }
            }
        }
    });

    grunt.loadNpmTasks('grunt-contrib-watch');
    grunt.loadNpmTasks('grunt-sass');
    grunt.loadNpmTasks('grunt-autoprefixer');
    grunt.loadNpmTasks('grunt-combine-media-queries');
    grunt.loadNpmTasks('grunt-contrib-imagemin');
    grunt.loadNpmTasks('grunt-image-embed');

    grunt.registerTask('default', ['watch']);
};
