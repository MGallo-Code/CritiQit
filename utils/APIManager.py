# utils/APIManager.py

from dotenv import load_dotenv
import os
import requests
from urllib.parse import quote

# Load env variables from .env
load_dotenv()
bearer_token = os.getenv("BEARER_TOKEN")

def parse_content_id(content_id):
    """
    Parse a content_id string like:
      - "movie:12345"
      - "tv:12345"
      - "tv:12345-S2"
      - "tv:12345-S2-E5"

    Return a dictionary:
      {
        "type": "movie" or "tv",
        "show_id": "12345" (string),
        "season_number": 2 or None,
        "episode_number": 5 or None
      }
    Raise ValueError if it's malformed.
    """
    if content_id.startswith("movie:"):
        # e.g. "movie:12345"
        raw_id = content_id[len("movie:"):]
        if not raw_id:
            raise ValueError(f"Malformed movie content_id: {content_id}")
        return {
            "type": "movie",
            "show_id": raw_id, # for movies, "show_id" is basically the numeric ID
            "season_number": None,
            "episode_number": None
        }

    elif content_id.startswith("tv:"):
        # e.g. "tv:12345-S2-E5"
        remainder = content_id[len("tv:"):]  # remove "tv:" prefix
        if not remainder:
            raise ValueError(f"No ID found after 'tv:' prefix in {content_id}")

        # Check if there's a '-S'
        parts = remainder.split("-S", maxsplit=1)
        show_id_str = parts[0]   # e.g. "12345"
        season_number_str = None
        episode_number_str = None

        if len(parts) == 2:
            # we have "2" or "2-E5"
            season_part = parts[1]
            # Possibly has '-E'
            ep_parts = season_part.split("-E", maxsplit=1)
            season_number_str = ep_parts[0]  # e.g. "2"
            if len(ep_parts) == 2:
                # user had "2-E5"
                episode_number_str = ep_parts[1]

        return {
            "content_type": "tv",
            "show_id": show_id_str,
            "season_number": int(season_number_str) if season_number_str else None,
            "episode_number": int(episode_number_str) if episode_number_str else None
        }

    elif content_id.startswith("set:"):
        # e.g. "set:12345"
        raw_id = content_id[len("set:"):]
        if not raw_id:
            raise ValueError(f"Malformed set content_id: {content_id}")
        return {
            "content_type": "set",
            "set_id": raw_id
        }

    else:
        raise ValueError(f"Unknown content prefix in content_id: {content_id}")
    
class APIManager:
    def __init__(self, language="en-US"):
        # Set our language
        self.language = language
        # Define basic url + headers
        self.base_url = "https://api.themoviedb.org/3/"
        self.headers = {
            "accept": "application/json",
            "Authorization": "Bearer " + bearer_token
        }
    
    def get_search(self, query, query_type="movie", page=1):
        url = f"{self.base_url}search/{query_type}?query={quote(query)}&include_adult=false&language={self.language}&page={page}"
        return requests.get(url, headers=self.headers).json()['results']
    
    def get_content_details(self, content_id):
        """
        A universal method to fetch either a movie or tv/season/episode details
        by parsing the content_id string.
        """
        parsed = parse_content_id(content_id)
        content_type = parsed["content_type"]  # "movie" or "tv"
        show_id = parsed["show_id"]
        season_num = parsed["season_number"]
        episode_num = parsed["episode_number"]

        if content_type == "movie":
            # /movie/{show_id}
            url = f"{self.base_url}movie/{show_id}?language={self.language}"
            response = requests.get(url, headers=self.headers)
            response.raise_for_status()
            return response.json()

        else:
            # It's tv-based. Check if we have season or episode:
            if season_num is None:
                # Just the show details => /tv/{show_id}
                url = f"{self.base_url}tv/{show_id}?language={self.language}"
                response = requests.get(url, headers=self.headers)
                response.raise_for_status()
                return response.json()
            else:
                # We have at least season
                if episode_num is None:
                    # /tv/{show_id}/season/{season_num}
                    url = f"{self.base_url}tv/{show_id}/season/{season_num}?language={self.language}"
                    response = requests.get(url, headers=self.headers)
                    response.raise_for_status()
                    return response.json()
                else:
                    # We have both season + episode => /tv/{show_id}/season/{season_num}/episode/{episode_num}
                    url = f"{self.base_url}tv/{show_id}/season/{season_num}/episode/{episode_num}?language={self.language}"
                    response = requests.get(url, headers=self.headers)
                    response.raise_for_status()
                    return response.json()