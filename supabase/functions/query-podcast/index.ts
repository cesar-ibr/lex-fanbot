import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { zipReadableStreams } from 'https://deno.land/std@0.192.0/streams/mod.ts';
import { ChatCompletionFunctions, ChatCompletionRequestMessage, Configuration, OpenAIApi } from 'https://esm.sh/openai@3.3.0';
import { corsHeaders, response, queryPodcastInstructions, fetchChatCompletion, streamHeaders, validOrigin } from '../_shared/utils.ts';
import { filterEpisodes, filterEpisodesFn, getEpisodeLinks } from './query-functions.ts';

const OPENAI_KEY = Deno.env.get('OPENAI_KEY') ?? '';
const CHAT_MODEL = 'gpt-3.5-turbo-0613';
const [, portNum] = (Deno.args[0] || '').split('=')
const port = portNum ? Number(portNum) : 8000;

serve(async (req) => {
  if (!validOrigin(req)) {
    return response({ message: 'Cannot process this request' }, 403);
  }

  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  /* Send Get to test DB query */
  // if (req.method === 'GET') {
  //   const data = await filterEpisodes();
  //   return response({ data });
  // }

  if (!OPENAI_KEY) {
    console.error('[ERROR] Missing API Key');
    return response({ message: 'Cannot connect with the service' }, 500);
  }

  const configuration = new Configuration({ apiKey: OPENAI_KEY });
  const openai = new OpenAIApi(configuration);


  const { query } = await req.json();
  const input = query.replace(/\n/g, ' ');
  console.log('[USER] =>', input);


  const chatMessages: ChatCompletionRequestMessage[] = [
    { role: 'system', content: queryPodcastInstructions }, // Instructions
    { role: 'user', content: input },
  ];

  const completionFns: ChatCompletionFunctions[] = [filterEpisodesFn];

  const getFunctionCall = await openai.createChatCompletion({
    model: CHAT_MODEL,
    max_tokens: 100,
    temperature: 0,
    messages: chatMessages,
    functions: completionFns,
  });

  console.log('[AGENT] => ', getFunctionCall.data.choices[0].message);
  const { message } = getFunctionCall.data.choices[0];
  const videoLinks: string[] = [];

  // Fetch episode data from DB
  if (message?.function_call) {
    try {
      const { name: fnName } = message.function_call;
      const params = JSON.parse(message.function_call.arguments ?? '{}');
      console.log('[FUNCTION PARAMS] =>', params);
      const data = await filterEpisodes(params);
      // get video links
      const links = getEpisodeLinks(data);
      videoLinks.push(...links);
      const fnResult = JSON.stringify(data, null, 0);
      // console.log('[FUNCTION RESPONSE] =>', fnResult);
      // Adding results into the conversation
      chatMessages.push({
        role: 'function',
        name: fnName,
        content: fnResult,
      })
    } catch (error) {
      console.error(error);
      return response({ message: 'Error when getting information' }, 500);
    }
  }

  console.log('["SYSTEM] => Sending final answer...');
  const chatCompletion = await fetchChatCompletion(OPENAI_KEY, {
    model: CHAT_MODEL,
    max_tokens: 300,
    temperature: 0,
    messages: chatMessages,
    functions: completionFns,
    stream: true,
  });

  if (!chatCompletion.body) {
    return response({ message: 'Error trying to get completion ' }, 500);
  }

  // Stream of episodes
  const episodesStream = new ReadableStream({
    start(controller) {
      const youtubeLinks = [...videoLinks];
      const chunk = `\nepisodes: ${JSON.stringify({ youtubeLinks })}\n`;
      controller.enqueue(chunk);
      controller.close();
    }
  }).pipeThrough(new TextEncoderStream());
  const mergedStreams = zipReadableStreams(chatCompletion.body, episodesStream);

  return new Response(mergedStreams, { headers: streamHeaders });
}, { port });
