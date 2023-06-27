import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.5.0';
import { readCSVRows } from "https://deno.land/x/csv/mod.ts";
import { Configuration, OpenAIApi } from 'https://esm.sh/openai@3.1.0';

const OPENAI_KEY = Deno.env.get('OPENAI_KEY') ?? '';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_KEY = Deno.env.get('SUPABASE_KEY') ?? '';

const sbClient = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false }});

const configuration = new Configuration({ apiKey: OPENAI_KEY });
const openAI = new OpenAIApi(configuration);

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// File
const f = await Deno.open("./captions.csv");
const captions: Record<string, unknown>[] = [];
console.log('Loading CSV in memory...');

for await (const row of readCSVRows(f, { lineSeparator: '\r\n', columnSeparator: ',', quote: '"' })) {
  const [videoId, seconds, caption] = row;
  captions.push({ videoId, seconds, caption });
  // console.log(Object.values(row).join(','));
}
f.close();

console.log(`==== Total of ${captions.length} rows`);

let i = 1;
for (const { videoId, caption, seconds } of captions) {
  console.log(`*** Row: ${i} Id:${videoId} --- ${(caption as string).slice(0, 20)}...`);
  console.log('Getting Embedding...');
  try {
    const embeddingResponse = await openAI.createEmbedding({
      model: 'text-embedding-ada-002',
      input: caption as string,
    });
    console.log('API Response:', embeddingResponse.statusText);
    const [{ embedding }] = embeddingResponse.data.data;
    console.log('Saving to DB...');
    const { statusText } = await sbClient.from('captions').insert({ video_id: videoId, caption, seconds: Number(seconds), embedding });
    console.log('DB Response:', statusText);

  } catch (error) {
    console.log('[ERROR]:', error);
    console.log('Retrying after 5 seconds...');
    await sleep(5000);
  } finally {
    i++;
  }
}

console.log(`=== Total of ${i} captions processed`);
