## About

This repository powers two companion projects:

- **[detrans.ai](https://detrans.ai)** – a research and self-guided therapy tool that generates meta-questions and answers them by surfacing real-world experiences and perspectives on gender from the /r/detrans subreddit.  
- **[genderaffirming.ai](https://genderaffirming.ai)** – a digital companion that offers a safe space to affirm your gender identity. It draws on insights from /r/mtf and /r/ftm and can be used as a personal, gender-affirming AI therapist or simply to explore concepts from a trans perspective. Content is limited to gender-affirming viewpoints shared by MTF and FTM users, but explicit external links to https://detrans.ai encourage users to explore detrans perspectives on the topic they are viewing.

Both services aim to help users understand how people adopt, inhabit, or move away from gender identities, and how those experiences shape one’s relationship with self, body and the world.

Built with [LlamaIndex](https://www.llamaindex.ai), [Next.js](https://nextjs.org), and many other open-source npm packages.
## License

MIT License  
Copyright (c) 2025 PETER JAMES STEVEN

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.


## Quick Start

As this is a Next.js project, you can use the following commands to start the development server:

```bash
docker compose -f docker-compose.dev.yml up 
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Useful Commands

- Generate Datasource (in case you're having a `./data` folder): `npm run generate`
- Typecheck: `npm run typecheck`
- Lint: `npm run lint`
- Format: `npm run format`
- Build & Start: `npm run build && npm run start`

## Deployment

The project can be deployed to any platform that supports Next.js like Vercel.

## Configuration

Your original [`llamaindex-server`](https://github.com/run-llama/create-llama/tree/main/packages/server#configuration-options) configurations have been migrated to a [`.env`](.env) file.

Changing the `.env` file will change the behavior of the application, e.g. for changing the initial questions to display in the chat, you can do:

```
NEXT_PUBLIC_STARTER_QUESTIONS=['What is the capital of France?']
```

Alternatively, you can also change the file referencing `process.env.NEXT_PUBLIC_STARTER_QUESTIONS` directly in the source code.

## Learn More

To learn more about LlamaIndex, take a look at the following resources:

- [LlamaIndex Documentation](https://docs.llamaindex.ai) - learn about LlamaIndex (Python features).
- [LlamaIndexTS Documentation](https://ts.llamaindex.ai) - learn about LlamaIndex (Typescript features).

You can check out [the LlamaIndexTS GitHub repository](https://github.com/run-llama/LlamaIndexTS) - your feedback and contributions are welcome!
