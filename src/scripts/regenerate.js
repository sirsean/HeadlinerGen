import { downloadMetadata, uploadImage, imgToThumbnail } from '../data/r2.js';
import { ImageCloudflareAI } from '../ai/cloudflare.js';
import { writeFile } from 'fs/promises';

async function main() {
  const id = process.env.ID;

  if (!id) {
    throw new Error('ID not provided');
  }

  const metadata = await downloadMetadata(id);

  const img = await new ImageCloudflareAI('bytedance/stable-diffusion-xl-lightning').generate(`Generate an illustration suitable to be placed in a news briefing, abstract, with no text or maps or charts; the image should be an artist's depiction of what the event looks like at the scene: ${metadata.prompt}`);

  console.log(metadata);

  //await writeFile(`tmp_image.png`, img);
  await uploadImage(id, img);
  await imgToThumbnail(id);
}

main()
  .then(() => process.exit(0))
  .catch(e => {
    console.error(e);
    process.exit(1);
  });