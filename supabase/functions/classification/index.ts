import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { Configuration, OpenAIApi } from 'https://esm.sh/openai@3.3.0';
import { corsHeaders, classificationPrompt, response } from '../_shared/utils.ts';

const OPENAI_KEY = Deno.env.get('OPENAI_KEY') ?? '';

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (!OPENAI_KEY) {
    console.error('[ERROR] Missing OpenAI key');
    return response({ message: 'Cannot connect with the service'}, 502);
  }
  const configuration = new Configuration({ apiKey: OPENAI_KEY });
  const openai = new OpenAIApi(configuration);

  const { query } = await req.json();
  const input = query.replace(/\n/g, ' ');
  const prompt = classificationPrompt(input);
  console.log('[Query] =>', input);
  console.log('[Prompt] =>', prompt);


  // TODO: Implement moderation endpoint for OpenAI compliance
  const classificationResponse = await openai.createCompletion({
    model: 'text-curie-001',
    max_tokens: 10,
    temperature: 0,
    prompt,
  });

  const { choices: [{ text }]} = classificationResponse.data;
  const classification = (text ?? '').trim().toUpperCase().replace(' ', '_');
  console.log('[Classification] =>', classification);

  return response({ classification });
});
