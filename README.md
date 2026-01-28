## About

**[detrans.ai](https://detrans.ai)** is the collective consciousness of detransitioners. It's primarly a chatbot which uses RAG (retrieval augmented generation) techniques to integrate detransition experiences posted on the /r/detrans subreddit and on YouTube into chat responses. The services aims to help users understand how people adopt, inhabit, or move away from gender identities, and how those experiences shape one’s relationship with self, body and the world.

This project is built on top of many other open-source projects, such as Llamaindex, React, Next.js, Tailwind, Lucide, Qdrant, Postgres and the Vercel AI SDK. Many thanks to the contributors of these projects for providing a solid base to build on top of.
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
