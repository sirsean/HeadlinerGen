//import fetch from 'node-fetch';

export class ImageGenerator {
  async generate(prompt) {
    return fetch(this.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.CLOUDFLARE_AUTH_TOKEN}`,
      },
      body: JSON.stringify(this.requestBody(prompt)),
    }).then(res => {
      console.log(`imgen status: ${res.status}: ${res.statusText}`);
      if (!res.ok) {
        throw new Error(res.statusText);
      }
      return res;
    }).then(res => res.body);
  }

  get url() {
      throw new Error('Not implemented: url');
  }

  requestBody(prompt) {
      throw new Error('Not implemented: requestBody');
  }
}

export class StableDiffusionBaseImageGenerator extends ImageGenerator {
  get url() {
      return `https://api.cloudflare.com/client/v4/accounts/${process.env.CLOUDFLARE_ACCOUNT_ID}/ai/run/@cf/stabilityai/stable-diffusion-xl-base-1.0`;
  }

  requestBody(prompt) {
      return {
          prompt,
      };
  }
}

export class StableDiffusionLightningImageGenerator extends ImageGenerator {
  get url() {
    return `https://api.cloudflare.com/client/v4/accounts/${process.env.CLOUDFLARE_ACCOUNT_ID}/ai/run/@cf/bytedance/stable-diffusion-xl-lightning`;
  }

  requestBody(prompt) {
    return {
      prompt,
    };
  }
}

export class BlurbGenerator {
  constructor(id) {
    this.id = id;
  }

  async generate() {
    return fetch(
      this.url,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.CLOUDFLARE_API_TOKEN}`,
        },
        body: JSON.stringify(this.requestBody()),
      },
    )
      .then((res) => {
        console.log(`textgen status: ${res.status}: ${res.statusText}`);
        if (!res.ok) {
          throw new Error(res.statusText);
        }
        return res;
      })
      .then((res) => res.json())
      .then((res) => {
        if (!res.success) {
          throw new Error(res.errors);
        }
        return res.result.response;
      });
  }

  get url() {
    return `https://api.cloudflare.com/client/v4/accounts/${process.env.CLOUDFLARE_ACCOUNT_ID}/ai/run/@cf/meta/llama-3-8b-instruct`;
  }

  requestBody() {
    return {
      messages: [
        {
          role: "system",
          content:
            "You are writing one-sentence blurbs that describe the biography of an individual eyeball. These eyeballs are mystical money from the future, from a universe infused with magic unicorns. Be imaginative and quirky. None of the eyeballs have names or numbers. Do not mention that you are a Large Language Machine. There is always a blurb. Please do not fail to generate one, and do not explain that you couldn't succeed.",
        },
        {
          role: "user",
          content: `Tell me about an eyeball. Its ID number is ${this.id}.`,
        },
      ],
    }
  }
}