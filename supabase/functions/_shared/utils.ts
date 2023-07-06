import { format } from 'https://deno.land/std@0.192.0/datetime/mod.ts';
import { stripIndents, oneLine } from 'https://esm.sh/common-tags@1.8.2';
import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.5.0';

const IS_PROD = Deno.env.get('PROD') === 'true';
const PROD_DOMAIN = Deno.env.get('PROD_DOMAIN') ?? ''; // comma separated domains

/**
 * Promts and Instructions
 */
type PromptTypes = 'classification' | 'semantic_search' | 'podcast_info';

export const getPrompt = async (sbClient: SupabaseClient, promptType: PromptTypes) => {
  const { data, error } = await sbClient
    .from('prompts')
    .select()
    .eq('type', promptType)
    .order('id', { ascending: false });

  if (error || !data || !data.length) {
    throw new Error('Prompt not found');
  }

  return data[0].text as string;
};

export const queryPodcastInstructions = stripIndents`
  You are a search assistant for the Lex Fridman Podcast. Answer only using information from the chat.
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
  const domains = PROD_DOMAIN.split(',');
  const origin = req.headers.get('origin') || '????';
  if (!IS_PROD) {
    return true; // for local dev
  }
  if (domains.includes(origin)) {
    return true;
  }
  return false;
};

/**
 * Responses
 */

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
