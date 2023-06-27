from dotenv import load_dotenv
from supabase import create_client, Client
import openai
import csv
import os

load_dotenv('.env')  # read local .env file
print('OPENAI_API_KEY: ' + os.environ['OPENAI_API_KEY'])

url: str = os.environ.get("SUPABASE_URL")
key: str = os.environ.get("SUPABASE_KEY")
supabase: Client = create_client(url, key)
openai.api_key = os.environ['OPENAI_API_KEY']

# Call openai to get embedding
def get_embedding(text: str, model="text-embedding-ada-002"):
    return openai.Embedding.create(input=[text], model=model)["data"][0]["embedding"]

# loop over captions
with open('captions.csv') as captions_file:
    reader = csv.reader(captions_file, delimiter=',')
    i = 1
    for row in reader:
        ep, start, text = row
        print('*** Getting embedding for row:', i)
        embedding = get_embedding(text)
        print('Saving in Supabase...')
        data, count = supabase.table('captions').insert(
            {"episode": ep, "caption": text, "embedding": embedding, "seconds": start}).execute()
        i = i+1
