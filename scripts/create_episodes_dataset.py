import os
from dotenv import load_dotenv
from pyyoutube import Api
import csv
import re

load_dotenv(".env")  # read local .env file
YT_API_TOKEN = os.environ.get("YT_API_KEY")
PLAYLIST_ID = os.environ.get("PLAYLIST_ID")  # playlist Id

api = Api(api_key=YT_API_TOKEN)


def parse_format(yt_format=""):
    return yt_format.replace("PT", "").replace("H", "hr ").replace("M", "min ").replace("S", "s")


def match(title="", regex=""):
    matched = re.findall(regex, title)
    return matched[0] if len(matched) > 0 else ""


# Get Video items
playlist_item_by_playlist = api.get_playlist_items(
    playlist_id=PLAYLIST_ID, count=None)
list_count = len(playlist_item_by_playlist.items)
print("--- Total videos:", list_count)

video_ids = list(map(lambda item: item.snippet.resourceId.videoId,
                 playlist_item_by_playlist.items))
param_parts = ["id", "snippet", "contentDetails", "statistics"]
video_list = []
# Splitting all Ids into 30-length lists to comply with YT API
video_ids_chunks = [video_ids[i:i + 30] for i in range(0, len(video_ids), 30)]
for chunk in video_ids_chunks:
    print("--- Getting video list data...")
    response = api.get_video_by_id(video_id=chunk, parts=param_parts)
    video_list = video_list + response.items

print('--- Videos Count:', len(video_list))

print("Mapping...")
video_dataset = []
for video in video_list:
    data = {
        "id": video.id,
        "title": video.snippet.title,
        "publishedAt": video.snippet.publishedAt,
        "guest": match(video.snippet.title, "^.*\:").replace(":", "").strip(),
        "episode": match(video.snippet.title, "\#\d+").replace("#", "").strip(),
        "topics": match(video.snippet.title, "\:.*\|").replace(":", "").replace("|", "").strip(),
        "tags": ",".join(video.snippet.tags or []),
        "duration": parse_format(video.contentDetails.duration), # check result
        "viewCount": video.statistics.viewCount,
        "likeCount": video.statistics.likeCount,
        "commentCount": video.statistics.commentCount
    }
    print("----------")
    print(data["title"])
    video_dataset.append(data)

# Save file
file = open('episodes-dataset.csv', 'a')
file_writer = csv.writer(file)
file_writer.writerow(video_dataset[0].keys())

for video in video_dataset:
    file_writer.writerow(video.values())
