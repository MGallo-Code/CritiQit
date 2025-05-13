# utils/APIManager.py

from dotenv import load_dotenv
import os
import requests
from urllib.parse import quote
import re

# Load env variables from .env
load_dotenv()
bearer_token = os.getenv("BEARER_TOKEN")

def clean_title(title):
    """
    Remove parenthesized numbers like (1), (2), etc. from titles
    
    Args:
        title: The original title string
        
    Returns:
        Cleaned title string with parenthesized numbers removed
    """
    if not title:
        return title
    
    # Remove (1), (2), etc. from the end of the title
    cleaned_title = re.sub(r'\s*\(\d+\)\s*$', '', title)
    
    # Also check for mid-title parenthesized numbers
    cleaned_title = re.sub(r'\s*\(\d+\)\s*', ' ', cleaned_title)
    
    # Trim any extra whitespace
    cleaned_title = cleaned_title.strip()
    
    return cleaned_title

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
            "type": "tv",
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
            "type": "set",
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
        # Base URL for images would be something like "https://image.tmdb.org/t/p/"
        self.image_base_url = "https://image.tmdb.org/t/p/"
        self.account_id = self._get_account_id()
    
    def get_image_url(self, path, size="original"):
        """
        Convert a poster_path or backdrop_path to a full URL
        
        Args:
            path: The poster_path or backdrop_path from TMDB API
            size: The size of the image (e.g. "w185", "w500", "original")
                  Common sizes: "w92", "w154", "w185", "w342", "w500", "w780", "original"
        """
        if not path:
            return None
            
        # Ensure path starts with a slash
        if not path.startswith('/'):
            path = '/' + path
            
        return f"{self.image_base_url}{size}{path}"
    
    def get_search(self, query, query_type="movie", page=1):
        url = f"{self.base_url}search/{query_type}?query={quote(query)}&include_adult=false&language={self.language}&page={page}"
        return requests.get(url, headers=self.headers).json()['results']
    
    def get_content_details(self, content_id):
        """
        A universal method to fetch either a movie or tv/season/episode details
        by parsing the content_id string. Assumes being called from media search,
        where only possible content types are 'movie' or 'tv'.
        """
        parsed = parse_content_id(content_id)
        content_type = parsed["type"] # "movie" or "tv"
        show_id = parsed["show_id"]
        season_num = parsed["season_number"]
        episode_num = parsed["episode_number"]

        if content_type == "movie":
            return self.get_movie_details(show_id)
        else:
            # It's tv-based. Check if we have season or episode:
            if season_num is None:
                # Just the show details
                return self.get_tv_details(show_id)
            else:
                # We have at least season
                if episode_num is None:
                    # Season details
                    return self.get_season_details(show_id, season_num)
                else:
                    # Episode details
                    return self.get_episode_details(show_id, season_num, episode_num)
    
    def get_movie_details(self, movie_id):
        """Get details for a specific movie"""
        url = f"{self.base_url}movie/{movie_id}?language={self.language}"
        try:
            response = requests.get(url, headers=self.headers)
            response.raise_for_status()
            return response.json()
        except:
            return None
            
    def get_tv_details(self, show_id):
        """Get details for a TV show"""
        url = f"{self.base_url}tv/{show_id}?language={self.language}"
        try:
            response = requests.get(url, headers=self.headers)
            response.raise_for_status()
            return response.json()
        except:
            return None
            
    def get_season_details(self, show_id, season_num):
        """Get details for a specific season of a TV show"""
        url = f"{self.base_url}tv/{show_id}/season/{season_num}?language={self.language}"
        try:
            response = requests.get(url, headers=self.headers)
            response.raise_for_status()
            return response.json()
        except:
            return None
            
    def get_episode_details(self, show_id, season_num, episode_num):
        """Get details for a specific episode of a TV show"""
        url = f"{self.base_url}tv/{show_id}/season/{season_num}/episode/{episode_num}?language={self.language}"
        try:
            response = requests.get(url, headers=self.headers)
            response.raise_for_status()
            return response.json()
        except:
            return None
            
    def format_episode_title(self, show_details, episode_details):
        """
        Format a consistent episode title from show and episode details
        
        Args:
            show_details: Show details from the API
            episode_details: Episode details from the API
            
        Returns:
            Formatted title string
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
        Format a consistent season title from show and season details
        
        Args:
            show_details: Show details from the API
            season_details: Season details from the API
            
        Returns:
            Formatted title string
        """
        show_name = clean_title(show_details.get('name', 'Unknown Show'))
        season_num = season_details.get('season_number', '?')
        season_name = clean_title(season_details.get('name', ''))
        
        if season_name and season_name != f"Season {season_num}":
            return f"{show_name}: Season {season_num} - {season_name}"
        else:
            return f"{show_name}: Season {season_num}"

    #========= TMDB Account Information/Rating Retrieval ===========

    def _get_account_id(self):
        """
        If using v3 session-based endpoints, we must first get the user's account ID.
        """
        url = f"{self.base_url}account"
        r = requests.get(url, headers=self.headers)
        r.raise_for_status()
        return r.json()["id"]
    
    def _get_rated_movies(self, page=1):
        """
        GET /account/{account_id}/rated/movies?pages=...
        Returns JSON with rated movies (including user's rating).
        """
        url = f"{self.base_url}account/{self.account_id}/rated/movies"
        params = {"page": page}
        r = requests.get(url, headers=self.headers, params=params)
        r.raise_for_status()
        return r.json()  # returns "results" array, plus total_pages

    def _get_rated_tv(self, page=1):
        """
        GET /account/{account_id}/rated/tv?page=...
        Returns rated TV shows as a whole (not individual episodes).
        """
        url = f"{self.base_url}account/{self.account_id}/rated/tv"
        params = {"page": page}
        r = requests.get(url, headers=self.headers, params=params)
        r.raise_for_status()
        return r.json()
    
    def _get_rated_tv_episodes(self, page=1):
        """
        GET /account/{account_id}/rated/tv/episodes?pages=...
        Returns rated episodes (with show_id, season_number, episode_number).
        """
        url = f"{self.base_url}account/{self.account_id}/rated/tv/episodes"
        params = {"page": page}
        r = requests.get(url, headers=self.headers, params=params)
        r.raise_for_status()
        return r.json()

    def import_all_tmdb_ratings(self, rating_manager):
        """
        Main method: fetch your rated Movies, TV, and Episodes from TMDB
        and import them into your local RatingManager database.
        """
        
        added_movies = self._import_rated_movies(rating_manager)
        added_tv = self._import_rated_tv(rating_manager)
        added_episodes = self._import_rated_tv_episodes(rating_manager)
        
        # Also add seasons for shows where we have rated episodes
        added_seasons = self._generate_season_ratings(rating_manager)

        # Summary of added records
        return {
            "movies": added_movies,
            "tv_shows": added_tv,
            "tv_episodes": added_episodes,
            "tv_seasons": added_seasons
        }
        
    def _generate_season_ratings(self, rating_manager):
        """
        Generate ratings for seasons based on episode ratings.
        This ensures we have proper season entries with proper titles.
        """
        # Keep track of seasons we've processed
        processed_seasons = set()
        added_count = 0
        
        try:
            # Get all episode ratings
            all_ratings = rating_manager.get_all_ratings("tv")
            
            # Find all episodes
            for rating in all_ratings:
                content_id = rating.get("content_id", "")
                
                # Skip if not an episode
                if "-E" not in content_id:
                    continue
                    
                # Parse the content_id to get show_id and season_num
                parsed = parse_content_id(content_id)
                if not parsed or not parsed.get("show_id") or not parsed.get("season_number"):
                    continue
                
                # Construct season content_id
                show_id = parsed["show_id"]
                season_num = parsed["season_number"]
                season_id = f"tv:{show_id}-S{season_num}"
                
                # Skip if we've already processed this season
                if season_id in processed_seasons:
                    continue
                
                processed_seasons.add(season_id)
                
                # Get show details
                show_details = self.get_tv_details(show_id)
                if not show_details:
                    continue
                
                # Get season details
                season_details = self.get_season_details(show_id, season_num)
                
                # Format title
                show_name = clean_title(show_details.get("name", "Unknown Show"))
                
                # Create a descriptive title for the season
                if season_details and season_details.get("name"):
                    season_name = clean_title(season_details.get("name"))
                    # If season name is just "Season X", don't duplicate
                    if season_name and not season_name.lower().startswith(f"season {season_num}"):
                        title = f"{show_name}: {season_name}"
                    else:
                        title = f"{show_name}: Season {season_num}"
                else:
                    title = f"{show_name}: Season {season_num}"
                
                # Get poster and backdrop URLs
                poster_url = None
                backdrop_url = None
                
                # Try to get season-specific poster
                if season_details and season_details.get("poster_path"):
                    poster_url = self.get_image_url(season_details.get("poster_path"))
                # Fallback to show poster
                elif show_details and show_details.get("poster_path"):
                    poster_url = self.get_image_url(show_details.get("poster_path"))
                
                # Usually use show backdrop (seasons don't typically have their own)
                if show_details and show_details.get("backdrop_path"):
                    backdrop_url = self.get_image_url(show_details.get("backdrop_path"))
                
                # Create a new season rating entry
                rating_data = {
                    "content_id": season_id,
                    "preferred_strategy": "aggregate_rating",  # Use aggregate from episodes
                    "one_score": None,
                    "category_aggregate": None,
                    "aggregate_rating": None,  # This will be calculated by RatingManager
                    "categories": {},
                    "title": title,
                    "poster_url": poster_url,
                    "backdrop_url": backdrop_url
                }
                rating_manager.save_rating_data(rating_data)
                added_count += 1
                
            return added_count
        except Exception as e:
            print(f"Error generating season ratings: {e}")
            return 0
    
    def _import_rated_movies(self, rating_manager):
        added_records = 0
        page = 1
        while True:
            data = self._get_rated_movies(page=page)
            results = data.get("results", [])
            total_pages = data.get("total_pages", 1)

            for item in results:
                # item["id"] => TMDB movie ID
                # item["rating"] => user's rating (1..10 or 0 if not rated)
                movie_id = item["id"]
                user_rating = item["rating"]
                if user_rating > 0:
                    content_id = f"movie:{movie_id}"
                    
                    # Get and clean the title
                    title = clean_title(item.get("title", ""))
                    
                    # Get poster and backdrop URLs
                    poster_path = item.get("poster_path")
                    backdrop_path = item.get("backdrop_path")
                    poster_url = self.get_image_url(poster_path) if poster_path else None
                    backdrop_url = self.get_image_url(backdrop_path) if backdrop_path else None
                    
                    # Build a data_dict for rating_manager
                    rating_data = {
                        "content_id": content_id,
                        "preferred_strategy": "one_score",
                        "one_score": float(user_rating),
                        "category_aggregate": None,
                        "aggregate_rating": None,
                        "categories": {},
                        "title": title,
                        "poster_url": poster_url,
                        "backdrop_url": backdrop_url
                    }
                    rating_manager.save_rating_data(data_dict=rating_data)
                    added_records += 1

            if page >= total_pages:
                break
            page += 1
        return added_records
    
    def _import_rated_tv(self, rating_manager):
        added_records = 0
        page = 1
        while True:
            data = self._get_rated_tv(page=page)
            results = data.get("results", [])
            total_pages = data.get("total_pages", 1)

            for item in results:
                # item["id"] => TMDB show ID
                # item["rating"] => user's rating
                show_id = item["id"]
                user_rating = item["rating"]
                if user_rating > 0:
                    content_id = f"tv:{show_id}"
                    
                    # Get and clean the title
                    title = clean_title(item.get("name", ""))
                    
                    # Get poster and backdrop URLs
                    poster_path = item.get("poster_path")
                    backdrop_path = item.get("backdrop_path")
                    poster_url = self.get_image_url(poster_path) if poster_path else None
                    backdrop_url = self.get_image_url(backdrop_path) if backdrop_path else None
                    
                    rating_data = {
                        "content_id": content_id,
                        "preferred_strategy": "one_score",
                        "one_score": float(user_rating),
                        "category_aggregate": None,
                        "aggregate_rating": None,
                        "categories": {},
                        "title": title,
                        "poster_url": poster_url,
                        "backdrop_url": backdrop_url
                    }
                    rating_manager.save_rating_data(data_dict=rating_data)
                    added_records += 1

            if page >= total_pages:
                break
            page += 1
        return added_records

    def _import_rated_tv_episodes(self, rating_manager):
        added_records = 0
        page = 1
        while True:
            data = self._get_rated_tv_episodes(page=page)
            results = data.get("results", [])
            total_pages = data.get("total_pages", 1)

            for item in results:
                # item has "show_id", "season_number", "episode_number", "rating"
                show_id = item["show_id"]
                season_num = item["season_number"]
                episode_num = item["episode_number"]
                user_rating = item["rating"]
                if user_rating > 0:
                    content_id = f"tv:{show_id}-S{season_num}-E{episode_num}"
                    
                    # Get and clean the episode title
                    episode_title = clean_title(item.get("name", ""))
                    
                    # Try to get show name and image URLs
                    show_name = ""
                    poster_url = None
                    backdrop_url = None
                    
                    try:
                        # Get the episode details for better images
                        episode_details = self.get_episode_details(show_id, season_num, episode_num)
                        if episode_details:
                            # Episode-specific still image
                            still_path = episode_details.get("still_path")
                            if still_path:
                                backdrop_url = self.get_image_url(still_path)
                        
                        # Get show details for the poster and show name
                        show_details = self.get_tv_details(show_id)
                        if show_details:
                            show_name = clean_title(show_details.get("name", ""))
                            poster_path = show_details.get("poster_path")
                            if poster_path:
                                poster_url = self.get_image_url(poster_path)
                            # Use show backdrop as fallback if episode has no still
                            if not backdrop_url:
                                backdrop_path = show_details.get("backdrop_path")
                                if backdrop_path:
                                    backdrop_url = self.get_image_url(backdrop_path)
                    except:
                        pass
                    
                    # Format a nice title
                    if show_name and episode_title:
                        title = f"{show_name} S{season_num}E{episode_num}: {episode_title}"
                    elif show_name:
                        title = f"{show_name} S{season_num}E{episode_num}"
                    else:
                        title = f"Episode S{season_num}E{episode_num}"
                    
                    rating_data = {
                        "content_id": content_id,
                        "preferred_strategy": "one_score",
                        "one_score": float(user_rating),
                        "category_aggregate": None,
                        "aggregate_rating": None,
                        "categories": {},
                        "title": title,
                        "poster_url": poster_url,
                        "backdrop_url": backdrop_url
                    }
                    rating_manager.save_rating_data(data_dict=rating_data)
                    added_records += 1

            if page >= total_pages:
                break
            page += 1
        return added_records