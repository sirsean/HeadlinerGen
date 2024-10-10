export class CloudflareAI {
  constructor(model) {
    this.model = model;
  }

  async generate(prompt) {
    return fetch(`https://api.cloudflare.com/client/v4/accounts/${process.env.CLOUDFLARE_ACCOUNT_ID}/ai/run/@cf/${this.model}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.CLOUDFLARE_AUTH_TOKEN}`,
      },
      body: JSON.stringify(prompt),
    }).then(res => {
      console.log(`AI status (${this.model}): ${res.status}: ${res.statusText}`);
      if (!res.ok) {
        throw new Error(res.statusText);
      }
      return res;
    })
  }
}

export class TextCloudflareAI extends CloudflareAI {
  async generate({ system, user }) {
    const prompt = { messages: [] };
    if (system) {
      system.forEach(message => prompt.messages.push({ role: 'system', content: message }));
    }
    if (user) {
      user.forEach(message => prompt.messages.push({ role: 'user', content: message }));
    }
    return super.generate(prompt)
      .then(res => res.json())
      .then(res => res.result.response);
  }
}

export class ImageCloudflareAI extends CloudflareAI {
  async generate(prompt) {
    return super.generate({ prompt })
      .then(res => res.body);
  }
}