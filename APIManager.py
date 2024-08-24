from dotenv import load_dotenv
import os
import requests

# Load env variables from .env
load_dotenv()
bearer_token = os.getenv("BEARER_TOKEN")

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
        url = f"{self.base_url}search/{query_type}?query={requests.utils.quote(query)}&include_adult=true&language={self.language}&page={page}"
        return requests.get(url, headers=self.headers)
    
    def get_details(self, id, content_type="multi"):
        url = f"{self.base_url}{content_type}/{id}?language={self.language}"
        return requests.get(url, headers=self.headers)

    def get_season_details(self, series_id, season_number):
        url = f"{self.base_url}tv/{series_id}/season/{season_number}?language={self.language}"
        return requests.get(url, headers=self.headers)

    def get_episode_details(self, series_id, season_number, episode_number):
        url = f"{self.base_url}tv/{series_id}/season/{season_number}/episode/{episode_number}?language={self.language}"
        return requests.get(url, headers=self.headers)
