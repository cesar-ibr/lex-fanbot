import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.5.0';
import { readCSVRows } from "https://deno.land/x/csv/mod.ts";

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_KEY = Deno.env.get('SUPABASE_KEY') ?? '';

const sbClient = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false }});

// File
const f = await Deno.open("../datasets/playlist_episodes.csv");
const episodes: Record<string, unknown>[] = [];

for await (const row of readCSVRows(f, { lineSeparator: '\r\n', columnSeparator: ',', quote: '"' })) {
  const [epNum, videoId, title] = row;
  console.log(`Ep#${epNum} - ${title}`);
  const [subTitle] = title.split('|');
  let guest = 'No Guest', topics = 'Unknown';
  if (subTitle.includes(':')) {
    const [g, t] = subTitle.split(':');
    guest = g.trim();
    topics = t.trim();
  }
  console.log('--- Guest:', guest);
  console.log('--- Topics:', topics);
  episodes.push({
    episode: `#${epNum}`,
    guest,
    link: `https://www.youtube.com/watch?v=${videoId}`,
    topics,
  });
}
console.log(`Total of ${episodes.length} episodes`);
f.close();
console.log('--- Saving...');
const { error, statusText } = await sbClient.from('episodes').insert(episodes);
console.log('Result:', statusText);

if (error) {
  console.error(error);
}