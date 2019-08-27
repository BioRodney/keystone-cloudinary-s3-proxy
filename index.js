const cloudinary = require('cloudinary');
const aws = require('aws-sdk');

let s3;

/**
 * Connect to s3, this requires the environment variables AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, S3_REGION to be set
 */
function ensureS3() {
    if (!s3) {
        const REQUIRED_ENVIRONMENT = ['AWS_ACCESS_KEY_ID', 'AWS_SECRET_ACCESS_KEY', 'S3_REGION'];

        const unMatched = REQUIRED_ENVIRONMENT.filter((environment) => !process.env[environment]);
        if (unMatched.length) {
            throw Error(`The following required environment values where not set: ${unMatched.join(', ')}`);
        }

        s3 = new aws.S3({
            key: process.env.AWS_ACCESS_KEY_ID,
            secret: process.env.AWS_SECRET_ACCESS_KEY,
            region: process.env.S3_REGION,
        });
    }
}

module.exports = {
    url(public_id, options) {
        return cloudinary.url(public_id, options);
    },
    image(source, options) {
        return cloudinary.image(source, options);
    },
    config(new_config, new_value) {
        return cloudinary.config(new_config, new_value);
    },
    api: {
        resource(public_id, callback, options) {
            return cloudinary.api.resource(public_id, callback, options);
        },
        resources(callback, options) {
            return cloudinary.api.resources(callback, options);
        },
    },
    cloudinary_js_config() {
        const cloudinaryScript = cloudinary.cloudinary_js_config();

        return (
            `${cloudinaryScript}\n<script type="module">\n` +
            'const mutationObserver = new MutationObserver((mutations) => {\n' +
            '   Array.from(document.querySelectorAll("img")).forEach((image) => {\n' +
            '       const parts = image.src.split("#");\n' +
            '       if (parts.length > 1) {\n' +
            '           image.onerror = (event) => {\n' +
            '               event.target.src = `${parts[0]}?${Date.now()}`;\n' +
            '               image.classList.remove("s3");\n' +
            '               image.onerror = undefined;\n' +
            '           };\n' +
            '           image.classList.add("s3");\n' +
            '           image.src = parts[1];\n' +
            '       }\n' +
            '    });\n' +
            '});\n' +
            'mutationObserver.observe(document.body, {childList: true, subtree: true, attributes: true });\n' +
            '</script>\n'
        );
    },
    uploader: {
        destroy(public_id, callback, options) {
            return cloudinary.uploader.destroy(public_id, callback, options);
        },
        upload(file, callback, options) {
            console.log(file);
            return cloudinary.uploader.upload(
                file,
                (result) => {
                    callback(Object.assign({}, result, { public_id: `${result.public_id}#${file}` }));
                },
                options,
            );
        },
        direct_upload(callback_url, options) {
            return cloudinary.uploader.direct_upload(callback_url, options);
        },
    },
    /**
     * Read the specified file from the specified bucket
     * @param bucketName Name of the bucket
     * @param fileName Name of the file
     * @returns {Promise<void>} The content of the file as a Buffer
     */
    async getFileFromBucket(bucketName, fileName) {
        ensureS3();
        const { Body } = await s3.getObject({ Bucket: bucketName, Key: fileName }).promise();
        return Body;
    },
};
