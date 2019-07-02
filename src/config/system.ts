import {resolve, normalize, join } from 'path';

function dir(path: string){
    return resolve(normalize(join(__dirname, path)));
}

/**
 * basic system configuration
 */
module.exports.system = {

    /**
     * Top level working directory
     */
    appDir: __dirname,

    /**
     * where to look at for different app modules
     */
    dirs: {
        controllers: [dir("/../controllers")],
        channels: [dir("/../channels")],
        schemas: [dir("/../schemas")],
        responses: [dir("/../responses")],
        models: [dir("/../models")],
        migrations: [dir("/../migrations")],
        policies: [dir("/../policies")],
        repositories: [dir("/../repositories")],
        middlewares: [dir("./../middlewares")],
        cli: [dir("./../cli")],
        schedules: [dir("./../schedules")],
        triggers: [dir("./../triggers")],
        jobs: [dir("./../jobs")],
        events: [dir("./../events")],
        apps: [dir("./../apps")],
        views: [dir("./../views")],
        locales: [dir("./../locales")]
    },

    /** 
     * json body parser configuration
     */
    bodyParser: {
        url: {
            extended: true
        },
        json: {
            limit: '10mb'
        }
    },

    // days to cleanup old entries
    cleanup: {
        jobs: {
            days: 7
        },
        logs: {
            days: 7
        },
        schedules: {
            days: 7
        },
        triggers: {
            days: 7
        }
    },

    /**
     * framework version info
     */
    version: {
        major: 1,
        minor: 2,
    }
}
