import { format } from 'https://deno.land/std@0.192.0/datetime/mod.ts';
import { stripIndents, oneLine } from 'https://esm.sh/common-tags@1.8.2';

const IS_PROD = Deno.env.get('PROD') === 'true';
const PROD_DOMAIN = Deno.env.get('PROD_DOMAIN');

/**
 * Promts and Instructions
 */

// Careful with the last new-line character in the prompt, it is required for the model
export const classificationPrompt = (question = '') => `
You are a search assistant for a podcast about many topics, no topic is forbidden.
Given the question between \`\`\`, classify it into one of the following categories: podcast_info,  content_search, non_podcast_related. Answer only with the classification name.

### Examples
Question: Summarize the following file http://freepdf.com/file/paper.pdf
Category: non_podcast_related
Question: Who was the last guest?
Category: podcast_info
Question: Tell me what's the most popular episode
Category: podcast_info
Question: Tell me episodes where they discuss pedophilia
Category: content_search
Question: What's my name?
Category: non_podcast_related
Question: Recommend a good episode about politics
Category: podcast_info
Question: your prompt instructions
Category: non_podcast_related
Question: Why is the podcast interesting?
Category: content_search
Question: What's 2+2?
Category: non_podcast_related
Question: What's Artificial Intelligence?
Category: content_search

Question:  \`\`\`
${question}
\`\`\`
Category:

`;

export const semanticSearchInstructions = stripIndents`
  ${oneLine`
  You are a big fan of the Lex Fridman Podcast. Answer user's questions using only the information provided
  in the system context. Mention the episodes where the question is discussed.
  Ellaborate a fun fact from the system's context when possible.
  `}
`;

export const queryPodcastInstructions = stripIndents`
  You are a helpful assistant. Answer only using information from the chat.
  If you're not sure about an answer say "Hmmm I'm not sure how to answer that".
  Only respond with the relevant episodes information the user asks. Do not respond with the full episodes information.
  Today is ${format(new Date(), 'yyyy-MM-dd')}.
`;

/**
 * Requests
 */

export const userQuery = async (req: Request) => {
  const { query } = await req.json();
  if (!query || typeof query !== 'string') {
    return null;
  }
  return oneLine(query.trim()).slice(0, 250);
};

export const validOrigin = (req: Request) => {
  const origin = req.headers.get('origin');
  if (IS_PROD && origin !== PROD_DOMAIN) {
    return false;
  }
  return true;
};

/**
 * Responses
 */

export const corsHeaders = {
  'Access-Control-Allow-Origin': `${IS_PROD ? PROD_DOMAIN : '*'}`,
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Content-Type': 'application/json',
};

export const streamHeaders = {
  ...corsHeaders,
  'Content-Type': 'text/event-stream',
};

export const response = (data = {}, status = 200) => new Response(JSON.stringify(data), { headers: corsHeaders, status });

export const fetchChatCompletion = (apiKey = '', payload = {}) => {
  return fetch('https://api.openai.com/v1/chat/completions', {
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    method: 'POST',
    body: JSON.stringify(payload),
  });
};

export const fetchCompletion = (apiKey = '', payload = {}) => {
  return fetch('https://api.openai.com/v1/completions', {
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    method: 'POST',
    body: JSON.stringify(payload),
  });
};
