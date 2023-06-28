import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { Configuration, OpenAIApi } from 'https://esm.sh/openai@3.3.0';
import { supabaseClient } from '../_shared/supabase-client.ts';
import { corsHeaders, classificationPrompt, response, userQuery, validOrigin } from '../_shared/utils.ts';

const OPENAI_KEY = Deno.env.get('OPENAI_KEY') ?? '';
const OPENAI_MODEL = 'text-curie-001';

const [, portNum] = (Deno.args[0] || '').split('='); // checks arg --port=5678
const port = portNum ? Number(portNum) : 8000;

serve(async (req) => {
  try {
    if (!validOrigin(req)) {
      return response({ message: 'Cannot process this request' }, 403);
    }

    // Handle CORS
    if (req.method === 'OPTIONS') {
      return new Response('ok', { headers: corsHeaders });
    }

    if (!OPENAI_KEY) {
      console.error('[ERROR] Missing OpenAI key');
      return response({ message: 'Cannot connect with the service' }, 500);
    }

    const configuration = new Configuration({ apiKey: OPENAI_KEY });
    const openai = new OpenAIApi(configuration);

    const query = await userQuery(req);
    if (!query) {
      return response({ message: 'Cannot process this request' }, 400);
    }

    const prompt = classificationPrompt(query);
    console.log('[Query] =>', query);

    // TODO: Implement moderation endpoint for OpenAI compliance
    const classificationResponse = await openai.createCompletion({
      model: OPENAI_MODEL,
      max_tokens: 50,
      temperature: 0,
      prompt,
    });

    const { choices: [{ text }] } = classificationResponse.data;
    const classification = (text ?? '').trim().toUpperCase();
    console.log('\n[Classification] =>', classification);

    // log results
    await supabaseClient.from('query_logs').insert({ classification, prompt: query });

    return response({ classification });
  } catch (error) {
    console.error(error);
    return response({ message: 'Something went wrong please try again later' }, 500);
  }
}, { port });
