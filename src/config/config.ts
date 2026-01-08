export default () => ({
  jwt: {
    secret: process.env.JWT_SECRET,
  },
  mail: {
    host: process.env.MAIL_HOST,
    port: process.env.MAIL_PORT,
    user: process.env.AUTH_USER,
    password: process.env.AUTH_PASSWORD,
  },
  cloudinary: {
    name: process.env.CLOUDINARY_CLOUD_NAME,
    key: process.env.CLOUDINARY_API_KEY,
    secret: process.env.CLOUDINARY_API_SECRET,
  },
  encryption: {
    key: process.env.ENCRYPTION_KEY,
  },
  aws: {
    region: process.env.AWS_REGION,
    s3Bucket: process.env.AWS_S3_BUCKET,
    s3AccessKey: process.env.AWS_ACCESS_KEY_ID,
    s3SecretKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});
