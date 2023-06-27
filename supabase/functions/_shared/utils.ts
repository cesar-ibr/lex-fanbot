import { format } from 'https://deno.land/std@0.192.0/datetime/mod.ts';
import { stripIndents, oneLine } from 'https://esm.sh/common-tags@1.8.2';

/**
 * Promts and Instructions
 */

export const classificationPrompt = (question = '') => stripIndents`
  ${oneLine`
    You are a search assistant for a popular podcast. Given a question about the podcast between \`\`\`,
    classify the question into one of the following categories:
    podcast info, episode statistics, guest info, opinion, non-podcast related.
  `}
  Question: \`\`\`
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
 * Responses
 */

export enum classificationTypes {
  PODCAST_INFO = 'PODCAST_INFO',
  EPISODE_STATISTICS = 'EPISODE_STATISTICS',
  GUEST_INFO = 'GUEST_INFO',
  OPINION = 'OPINION',
  NON_PODCAST_RELATED = 'NON-PODCAST_RELATED',
}

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
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
