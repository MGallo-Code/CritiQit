# utils/tmdb/tv_api.py

import logging
from urllib.parse import quote
from .helpers import clean_title

logger = logging.getLogger(__name__)

class TvAPI:
    """
    Handles TMDB API interactions specific to TV shows, seasons, and episodes.
    """
    def __init__(self, tmdb_api_client):
        if not tmdb_api_client:
            raise ValueError("A TMDB API client instance is required for TvAPI.")
        self.client = tmdb_api_client

    def get_search_tv_shows(self, query, page=1):
        """
        Search for TV shows on TMDB.
        """
        endpoint = "search/tv"
        params = {"query": quote(query), "include_adult": "false", "page": page}
        response = self.client.get(endpoint, params=params)
        return response.get('results', []) if response else []

    def get_tv_details(self, show_id):
        """Get details for a TV show"""
        endpoint = f"tv/{show_id}"
        return self.client.get(endpoint)
            
    def get_season_details(self, show_id, season_num):
        """Get details for a specific season of a TV show"""
        endpoint = f"tv/{show_id}/season/{season_num}"
        return self.client.get(endpoint)
            
    def get_episode_details(self, show_id, season_num, episode_num):
        """Get details for a specific episode of a TV show"""
        endpoint = f"tv/{show_id}/season/{season_num}/episode/{episode_num}"
        return self.client.get(endpoint)
            
    def format_episode_title(self, show_details, episode_details):
        """
        Format a consistent episode title from show and episode details.
        Relies on clean_title from content_helpers.
        """
        show_name = clean_title(show_details.get('name', 'Unknown Show'))
        episode_name = clean_title(episode_details.get('name', ''))
        season_num = episode_details.get('season_number', '?')
        episode_num = episode_details.get('episode_number', '?')
        
        if episode_name:
            return f"{show_name} S{season_num}E{episode_num}: {episode_name}"
        else:
            return f"{show_name} S{season_num}E{episode_num}"
    
    def format_season_title(self, show_details, season_details):
        """
        Format a consistent season title from show and season details.
        Relies on clean_title from content_helpers.
        """
        show_name = clean_title(show_details.get('name', 'Unknown Show'))
        season_num = season_details.get('season_number', '?')
        # Season details from TMDB often have a 'name' field like "Season X"
        # We want to use it if it's more descriptive than just the number.
        season_name_from_api = clean_title(season_details.get('name', ''))
        
        # If the API season name is descriptive and not just "Season X"
        if season_name_from_api and not season_name_from_api.lower().startswith(f"season {season_num}".lower()):
            return f"{show_name}: {season_name_from_api}" 
        else:
            # Default to "Show Name: Season X"
            return f"{show_name}: Season {season_num}" 