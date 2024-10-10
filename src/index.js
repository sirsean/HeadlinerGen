import Parser from 'rss-parser';
import { TextCloudflareAI, ImageCloudflareAI } from './ai/cloudflare.js';
import { writeFile } from 'fs/promises';
import { downloadAll, uploadAll, uploadCurrent, uploadImage, uploadMetadata, imgToThumbnail } from './data/r2.js';
import * as uuid from 'uuid';

async function summarizeTopStory(text) {
  const ai = new TextCloudflareAI('meta/llama-3.2-3b-instruct');
  return ai.generate({
    system: ['You are the editor of a news desk, responsible for taking the stories of the day and summarizing them into a single written paragraph. You must decide which is the most important over-arching topic of the day, from the provided news snippets. Return only this summary, and no prelude.'],
    user: [text],
  });
}

async function createImagePrompt(summary) {
  const ai = new TextCloudflareAI('meta/llama-3.2-3b-instruct');
  return ai.generate({
    system: ['You are the leader of the art desk at a news magazine. You are given a news story, and you must create a compelling and iconic image representing the given story. Describe this story visually, from the perspective of an artist at the scene. Return only this image description, and no prelude.'],
    user: [summary],
  });
}

async function fetchNews() {
  const parser = new Parser();
  const feed = await parser.parseURL('https://feeds.bbci.co.uk/news/world/rss.xml');
  return feed.items;
}

async function summarizeNews(items) {
  return summarizeTopStory(
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
  const prompt = await createImagePrompt(summary);
  const img = await new ImageCloudflareAI('bytedance/stable-diffusion-xl-lightning')
    .generate(`Generate an illustration suitable to be placed in a news briefing, abstract, with no text or maps or charts; the image should be an artist's depiction of what the event looks like at the scene: ${prompt}`);
  
  const metadata = {
    id,
    summary,
    prompt,
    at: new Date(),
  };

  //await writeFile('./tmp_image.png', img);
  
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