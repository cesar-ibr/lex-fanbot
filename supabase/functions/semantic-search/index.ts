import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { ChatCompletionRequestMessage, Configuration, OpenAIApi } from 'https://esm.sh/openai@3.3.0';
import GPT3Tokenizer from 'https://esm.sh/gpt3-tokenizer@1.1.5';
import { corsHeaders, semanticSearchInstructions, response, streamHeaders, fetchChatCompletion } from '../_shared/utils.ts';
import { zipReadableStreams } from 'https://deno.land/std@0.192.0/streams/mod.ts';
import { supabaseClient } from '../_shared/supabase-client.ts';

const OPENAI_KEY = Deno.env.get('OPENAI_KEY') ?? '';
const EMBEDDING_MODEL = 'text-embedding-ada-002';
const CHAT_MODEL = 'gpt-3.5-turbo';

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (!OPENAI_KEY) {
    console.error('[ERROR] Missing API Key');
    return response({ message: 'Cannot connect with the service' }, 502);
  }

  const configuration = new Configuration({ apiKey: OPENAI_KEY });
  const openai = new OpenAIApi(configuration);

  const { query } = await req.json();
  const input = query.replace(/\n/g, ' ');
  console.log('[USER] =>', input);

  // Generate a one-time embedding for the query itself
  const embeddingResponse = await openai.createEmbedding({
    model: EMBEDDING_MODEL,
    input,
  });

  const [{ embedding }] = embeddingResponse.data.data;

  // Retrieve Context
  // In production we should handle possible errors
  const { error: fnError, data: matchedResults } = await supabaseClient.rpc('get_similarity', {
    query_embedding: embedding,
    match_threshold: 0.78, // TODO: Test with other tresholds
    match_count: 4, // Number of matches
  });

  if (fnError) {
    console.error(fnError);
    return response({ message: 'Similarity search failed' }, 500);
  }

  if (!matchedResults.length) {
    const choices = [{ delta: { content: `Sorry but I couldn't find anything related to what you asked` } }];
    return response({ choices });
  }
  const links = matchedResults.map(({ link, seconds }) => `${link}&t=${seconds}s`);
  // console.log('[Episodes] =>', links);

  // Prepare Prompt
  const chatMessages: ChatCompletionRequestMessage[] = [
    { role: 'system', content: semanticSearchInstructions },
    { role: 'user', content: input },
  ];
  const tokenizer = new GPT3Tokenizer({ type: 'gpt3' });
  let tokenCount = 0, podcastCtx = '';

  // Concat matched captions
  for (const { captions = '', guest = '', episode = '', similarity } of matchedResults) {
    const encoded = tokenizer.encode(captions);
    tokenCount += encoded.text.length;
    console.log(`Ep ${episode} - Similarity: ${similarity} - Tokens: ${encoded.text.length}`);

    // Limit context to max 1500 tokens
    if (tokenCount > 1500) {
      break;
    }
    podcastCtx += `Ep ${episode} with ${guest}: ${captions}\n-----\n`;
  }

  chatMessages.push({
    role: 'system',
    content: `Podcast Context: \`\`\`\n${podcastCtx}\n\`\`\``
  });

  console.log('[SYSTEM] => Generating chat completion...');

  const chatCompletion = await fetchChatCompletion(OPENAI_KEY, {
    model: CHAT_MODEL,
    max_tokens: 1000,
    temperature: 0.5, // Set to 0 for deterministic results
    stream: true,
    messages: chatMessages,
  });

  if (!chatCompletion.body) {
    return response({ message: 'Error trying to get completion ' }, 500);
  }

  // Stream of episodes
  const episodesStream = new ReadableStream({
    start(controller) {
      const chunk = `\nepisodes: ${JSON.stringify({ youtubeLinks: links })}\n`;
      controller.enqueue(chunk);
      controller.close();
    }
  }).pipeThrough(new TextEncoderStream());

  const mergedStreams = zipReadableStreams(chatCompletion.body, episodesStream);
  return new Response(mergedStreams, { headers: streamHeaders });
});
