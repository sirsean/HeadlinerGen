import Parser from 'rss-parser';
import { StableDiffusionLightningImageGenerator } from './ai/cloudflare.js';
import { writeFile } from 'fs/promises';
import { downloadAll, uploadAll, uploadCurrent, uploadImage, uploadMetadata, imgToThumbnail } from './data/r2.js';
import * as uuid from 'uuid';

async function summarize(text) {
  return fetch(`https://api.cloudflare.com/client/v4/accounts/${process.env.CLOUDFLARE_ACCOUNT_ID}/ai/run/@cf/meta/llama-3.2-3b-instruct`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.CLOUDFLARE_AUTH_TOKEN}`,
    },
    body: JSON.stringify({
      messages: [
        {
          role: 'system',
          content: 'You are the editor of a news desk, responsible for taking the stories of the day and summarizing them into a single written paragraph. You must decide which is the most important over-arching topic of the day, from the provided news snippets. Once you decide the single best topic, describe it visually. Return only this summary, and no prelude.',
        },
        {
          role: 'user',
          content: text,
        },
      ],
    }),
  })
    .then(r => r.json())
    .then(r => r.result.response);
}

async function fetchNews() {
  const parser = new Parser();
  const feed = await parser.parseURL('https://feeds.bbci.co.uk/news/world/rss.xml');
  return feed.items;
}

async function summarizeNews(items) {
  return summarize(
    items
      .map(({ title, content }) => {
        return `${title}: ${content}`;
      })
      .join(`\n`),
  );
}

async function main() {
  const all = await downloadAll();
  
  const id = uuid.v4();
  const summary = await fetchNews().then(summarizeNews);
  console.log(summary);
  const img = await new StableDiffusionLightningImageGenerator().generate(`Generate an illustration suitable to be placed in a news briefing, abstract, with no text: ${summary}`);
  //await writeFile('./tmp/generated_image.png', img);

  const metadata = {
    id,
    summary,
    at: new Date(),
  };
  
  await uploadImage(id, img);
  await imgToThumbnail(id);
  await uploadMetadata(id, metadata);

  all.metadata.push(metadata);
  await uploadAll(all);

  await uploadCurrent(metadata);

  console.log(metadata);
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });