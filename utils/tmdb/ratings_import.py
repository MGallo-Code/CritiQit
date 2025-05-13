# utils/tmdb/ratings_import.py

import logging
from utils.content_helpers import parse_content_id
from .helpers import clean_title, get_image_url

logger = logging.getLogger(__name__)

class TMDBRatingsImporter:
    """
    Handles importing user ratings from TMDB into the local database.
    """
    def __init__(self, tmdb_api_client, tv_api_client):
        if not tmdb_api_client:
            raise ValueError("A TMDB API client instance is required.")
            
        self.tmdb_client = tmdb_api_client
        self.tv_client = tv_api_client

        self.account_id = self.tmdb_client.account_id # Access account_id from the client
        if not self.account_id:
            logger.error("TMDB Account ID must be provided.")

    def _get_rated_movies(self, page=1):
        """
        GET /account/{account_id}/rated/movies?pages=...
        Returns JSON with rated movies (including user's rating).
        """
        endpoint = f"account/{self.account_id}/rated/movies"
        params = {"page": page}
        # Use the _request method of the passed tmdb_api_client
        return self.tmdb_client.get(endpoint, params=params) or {}

    def _get_rated_tv(self, page=1):
        """
        GET /account/{account_id}/rated/tv?page=...
        Returns rated TV shows as a whole (not individual episodes).
        """
        endpoint = f"account/{self.account_id}/rated/tv"
        params = {"page": page}
        return self.tmdb_client.get(endpoint, params=params) or {}
    
    def _get_rated_tv_episodes(self, page=1):
        """
        GET /account/{account_id}/rated/tv/episodes?pages=...
        Returns rated episodes (with show_id, season_number, episode_number).
        """
        endpoint = f"account/{self.account_id}/rated/tv/episodes"
        params = {"page": page}
        return self.tmdb_client.get(endpoint, params=params) or {}

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
        processed_seasons = set()
        added_count = 0
        
        try:
            all_ratings = rating_manager.get_all_ratings("tv")
            for rating in all_ratings:
                content_id = rating.get("content_id", "")
                if "-E" not in content_id:
                    continue
                    
                parsed = parse_content_id(content_id)
                if not parsed or not parsed.get("show_id") or not parsed.get("season_number"):
                    continue
                
                show_id = parsed["show_id"]
                season_num = parsed["season_number"]
                season_id = f"tv:{show_id}-S{season_num}"
                
                if season_id in processed_seasons:
                    continue
                processed_seasons.add(season_id)
                
                show_details = self.tv_client.get_tv_details(show_id)
                if not show_details:
                    continue
                
                season_details = self.tv_client.get_season_details(show_id, season_num)
                
                show_name = clean_title(show_details.get("name", "Unknown Show"))
                if season_details and season_details.get("name"):
                    season_name = clean_title(season_details.get("name"))
                    if season_name and not season_name.lower().startswith(f"season {season_num}".lower()):
                        title = f"{show_name}: {season_name}"
                    else:
                        title = f"{show_name}: Season {season_num}"
                else:
                    title = f"{show_name}: Season {season_num}"
                
                poster_url, backdrop_url = None, None
                if season_details and season_details.get("poster_path"):
                    poster_url = get_image_url(season_details.get("poster_path"))
                elif show_details and show_details.get("poster_path"):
                    poster_url = get_image_url(show_details.get("poster_path"))
                if show_details and show_details.get("backdrop_path"):
                    backdrop_url = get_image_url(show_details.get("backdrop_path"))
                
                rating_data = {
                    "content_id": season_id,
                    "preferred_strategy": "aggregate_rating",
                    "one_score": None, "category_aggregate": None, "aggregate_rating": None,
                    "categories": {}, "title": title,
                    "poster_url": poster_url, "backdrop_url": backdrop_url
                }
                rating_manager.save_rating_data(rating_data)
                added_count += 1
            return added_count
        except Exception as e:
            logger.error(f"Error generating season ratings: {e}")
            return 0
    
    def _import_rated_movies(self, rating_manager):
        added_records = 0
        page = 1
        while True:
            data = self._get_rated_movies(page=page)
            results = data.get("results", [])
            if not results: break
            total_pages = data.get("total_pages", 1)

            for item in results:
                movie_id = item["id"]
                user_rating = item["rating"]
                if user_rating > 0:
                    content_id = f"movie:{movie_id}"
                    title = clean_title(item.get("title", ""))
                    poster_url = get_image_url(item.get("poster_path")) if item.get("poster_path") else None
                    backdrop_url = get_image_url(item.get("backdrop_path")) if item.get("backdrop_path") else None
                    
                    rating_data = {
                        "content_id": content_id, "preferred_strategy": "one_score",
                        "one_score": float(user_rating), "category_aggregate": None,
                        "aggregate_rating": None, "categories": {}, "title": title,
                        "poster_url": poster_url, "backdrop_url": backdrop_url
                    }
                    rating_manager.save_rating_data(data_dict=rating_data)
                    added_records += 1
            if page >= total_pages: break
            page += 1
        return added_records
    
    def _import_rated_tv(self, rating_manager):
        added_records = 0
        page = 1
        while True:
            data = self._get_rated_tv(page=page)
            results = data.get("results", [])
            if not results: break
            total_pages = data.get("total_pages", 1)

            for item in results:
                show_id = item["id"]
                user_rating = item["rating"]
                if user_rating > 0:
                    content_id = f"tv:{show_id}"
                    title = clean_title(item.get("name", ""))
                    poster_url = get_image_url(item.get("poster_path")) if item.get("poster_path") else None
                    backdrop_url = get_image_url(item.get("backdrop_path")) if item.get("backdrop_path") else None
                    
                    rating_data = {
                        "content_id": content_id, "preferred_strategy": "one_score",
                        "one_score": float(user_rating), "category_aggregate": None,
                        "aggregate_rating": None, "categories": {}, "title": title,
                        "poster_url": poster_url, "backdrop_url": backdrop_url
                    }
                    rating_manager.save_rating_data(data_dict=rating_data)
                    added_records += 1
            if page >= total_pages: break
            page += 1
        return added_records

    def _import_rated_tv_episodes(self, rating_manager):
        added_records = 0
        page = 1
        while True:
            data = self._get_rated_tv_episodes(page=page)
            results = data.get("results", [])
            if not results: break
            total_pages = data.get("total_pages", 1)

            for item in results:
                show_id = item["show_id"]
                season_num = item["season_number"]
                episode_num = item["episode_number"]
                user_rating = item["rating"]
                if user_rating > 0:
                    content_id = f"tv:{show_id}-S{season_num}-E{episode_num}"
                    episode_title = clean_title(item.get("name", ""))
                    
                    show_name, poster_url, backdrop_url = "", None, None
                    try:
                        episode_details = self.tv_client.get_episode_details(show_id, season_num, episode_num)
                        if episode_details and episode_details.get("still_path"):
                            backdrop_url = get_image_url(episode_details.get("still_path"))
                        
                        show_details = self.tv_client.get_tv_details(show_id)
                        if show_details:
                            show_name = clean_title(show_details.get("name", ""))
                            if show_details.get("poster_path"):
                                poster_url = get_image_url(show_details.get("poster_path"))
                            if not backdrop_url and show_details.get("backdrop_path"):
                                backdrop_url = get_image_url(show_details.get("backdrop_path"))
                    except Exception as e:
                        logger.warning(f"Error fetching details for {content_id} during import: {e}")
                    
                    title = f"{show_name} S{season_num}E{episode_num}: {episode_title}" if show_name and episode_title else \
                            f"{show_name} S{season_num}E{episode_num}" if show_name else \
                            f"Episode S{season_num}E{episode_num}"
                    
                    rating_data = {
                        "content_id": content_id, "preferred_strategy": "one_score",
                        "one_score": float(user_rating), "category_aggregate": None,
                        "aggregate_rating": None, "categories": {}, "title": title,
                        "poster_url": poster_url, "backdrop_url": backdrop_url
                    }
                    rating_manager.save_rating_data(data_dict=rating_data)
                    added_records += 1
            if page >= total_pages: break
            page += 1
        return added_records 