const Minio = require('minio');

const minioClient = new Minio.Client({
  endPoint: process.env.MINIO_ENDPOINT,
  port: parseInt(process.env.MINIO_PORT),
  useSSL: false,
  accessKey: process.env.MINIO_ACCESS_KEY,
  secretKey: process.env.MINIO_SECRET_KEY
});

const audioBucketName = process.env.MINIO_AUDIO_BUCKET_NAME || 'audio-files';
const imageBucketName = process.env.MINIO_IMAGE_BUCKET_NAME || 'image-files';

const initializeBuckets = async () => {
  try {
    for (const bucketName of [audioBucketName, imageBucketName]) {
      const bucketExists = await minioClient.bucketExists(bucketName);
      if (!bucketExists) {
        await minioClient.makeBucket(bucketName);
        console.log(`Bucket ${bucketName} created.`);
      } else {
        console.log(`Bucket ${bucketName} already exists.`);
      }
    }
  } catch (err) {
    console.error('Error setting up MinIO buckets:', err);
  }
};

const storeFile = async (bucketName, fileName, fileBuffer) => {
  await minioClient.putObject(bucketName, fileName, fileBuffer);
  return `/${bucketName}/${fileName}`;
};

const getFile = async (bucketName, fileName) => {
  return await minioClient.getObject(bucketName, fileName);
};

module.exports = {
  initializeBuckets,
  storeFile,
  getFile,
  audioBucketName,
  imageBucketName
};