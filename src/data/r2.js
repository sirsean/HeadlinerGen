import { S3Client, GetObjectCommand, ListObjectsV2Command } from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";
import sharp from 'sharp';

const BUCKET = "headliner";

// R2 client
export const r2 = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});

async function streamToBuffer(stream) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    stream.on('data', (chunk) => chunks.push(chunk));
    stream.on('end', () => resolve(Buffer.concat(chunks)));
    stream.on('error', reject);
  });
}

export async function getObject(key) {
  return r2.send(new GetObjectCommand({
    Bucket: BUCKET,
    Key: key,
  }));
}

export async function downloadAll() {
  try {
    const obj = await getObject("all.json")
    let data = "";
    for await (const chunk of obj.Body) {
      data += chunk;
    }
    return JSON.parse(data);
  } catch (e) {
    return {
      metadata: [],
    };
  }
}

export async function uploadAll(all) {
  const metadataUpload = new Upload({
    client: r2,
    params: {
      Bucket: BUCKET,
      Key: `all.json`,
      Body: JSON.stringify(all),
    },
  });
  return metadataUpload.done();
}

export async function downloadCurrent() {
  try {
    const obj = await getObject("current.json");
    let data = "";
    for await (const chunk of obj.Body) {
      data += chunk;
    }
    return JSON.parse(data);
  } catch (e) {
    return null;
  }
}

export async function uploadCurrent(metadata) {
  const metadataUpload = new Upload({
    client: r2,
    params: {
      Bucket: BUCKET,
      Key: `current.json`,
      Body: JSON.stringify(metadata),
    },
  });
  return metadataUpload.done();
}

export async function downloadMetadata(id) {
  const obj = await getObject(`headlines/${id}/metadata.json`);
  let data = "";
  for await (const chunk of obj.Body) {
    data += chunk;
  }
  return JSON.parse(data);
}

export async function uploadImage(id, image) {
  const imageUpload = new Upload({
    client: r2,
    params: {
      Bucket: BUCKET,
      Key: `headlines/${id}/image.png`,
      Body: image,
    },
  });
  return imageUpload.done();
}

export async function uploadThumbnail(id, image) {
  const imageUpload = new Upload({
    client: r2,
    params: {
      Bucket: BUCKET,
      Key: `headlines/${id}/thumbnail.png`,
      Body: image,
    },
  });
  return imageUpload.done();
}

export async function uploadMetadata(id, metadata) {
  const metadataUpload = new Upload({
    client: r2,
    params: {
      Bucket: BUCKET,
      Key: `headlines/${id}/metadata.json`,
      Body: JSON.stringify(metadata),
    },
  });
  return metadataUpload.done();
}

export async function listKeysByPrefix(prefix) {
  const keys = [];
  let isTruncated = true;
  let continuationToken = undefined;

  while (isTruncated) {
    try {
      const params = {
        Bucket: BUCKET,
        Prefix: prefix,
        ContinuationToken: continuationToken
      };
      const command = new ListObjectsV2Command(params);
      const response = await r2.send(command);

      // Log the keys of the objects found
      response.Contents.forEach((item) => {
        //console.log(item.Key);
        keys.push(item.Key);
      });

      // Check if there are more results
      isTruncated = response.IsTruncated;
      continuationToken = response.NextContinuationToken;
    } catch (error) {
      console.error('Error listing items in S3 bucket:', error);
      break;
    }
  }

  return keys;
}

export async function imgToThumbnail(id) {
  const obj = await r2.send(new GetObjectCommand({
    Bucket: BUCKET,
    Key: `headlines/${id}/image.png`
  }));
  const thumbnail = await streamToBuffer(obj.Body)
    .then(buffer => sharp(buffer))
    .then(img => img.resize(128, 128).toBuffer());
  return uploadThumbnail(id, thumbnail);
}
