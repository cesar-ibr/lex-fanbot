import os
import csv
import openai
from dotenv import load_dotenv
from youtube_transcript_api import YouTubeTranscriptApi
from supabase import create_client, Client

load_dotenv('.env')  # read local .env file
print('OPENAI_API_KEY: ' + os.environ['OPENAI_API_KEY'])

episodes_dataset = '../datasets/playlist_episodes.csv'
url: str = os.environ.get("SUPABASE_URL")
key: str = os.environ.get("SUPABASE_KEY")
supabase: Client = create_client(url, key)
openai.api_key = os.environ['OPENAI_API_KEY']

# Get Embedding from OpenAI
def get_embedding(text: str, model="text-embedding-ada-002"):
    return openai.Embedding.create(input=[text], model=model)["data"][0]["embedding"]

def save_caption(chunk: dict):
    return supabase.table('captions').insert(chunk).execute()


# Store Episodes in memory
episodes = []
with open(episodes_dataset) as file:
    csv_reader = csv.reader(file, delimiter=',')
    # headers: episode, video_id, title
    for episode_num, video_id, *rest in csv_reader:
        print('*** \tEp #' + episode_num + ' --- video=' + video_id + '\t***')
        episodes.append({ 'num': episode_num, 'video_id': video_id })

# Get captions of each episode
captions_file = open('captions.csv', 'a')
captions_writter = csv.writer(captions_file)
no_transcripts: list[dict] = []
for ep in episodes:
    try:
        print('*** \t Getting captions of Ep #' + ep['num'] + '\t ***')
        transcripts = YouTubeTranscriptApi.get_transcript(ep['video_id'])
        transcripts = transcripts[ : -4]
        print('Total captions:', len(transcripts))
        print('Saving chunks in file...')
        i = 1
        chunk = {}
        for caption in transcripts:
            caption_txt = caption['text'].replace('\n', ' ')
            if (i == 1):
                chunk = {
                    'video_id': ep['video_id'],
                    'seconds': int(float(caption['start'])), # convert form str to int
                    'caption': caption_txt
                }
                i = i + 1
                continue
            # concat every 15 captions to make chunks more meaningful
            if (i == 15):
                chunk['caption'] = chunk['caption'] + ' ' + caption_txt
                captions_writter.writerow(chunk.values())
                i = 1
            else:
                chunk['caption'] = chunk['caption'] + ' ' + caption_txt
                i = i + 1
        if i > 1:
            captions_writter.writerow(chunk.values())
    except:
        print('!!! Problem with Ep. #' + ep['num'] + ' !!! ')
        no_transcripts.append({ 'num': ep['num'], 'link': 'https://www.youtube.com/watch?v=' + ep['video_id'] })

# Dump missing transcritps
missings_file = open('missings.csv', 'w')
missings_writer = csv.writer(missings_file)
for episode in no_transcripts:
    print('#' + episode['num'] + ' --- ' + episode['link'])
    missings_writer.writerow(episode.values())
