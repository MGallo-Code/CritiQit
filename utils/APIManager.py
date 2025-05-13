# utils/APIManager.py

from .content_helpers import parse_content_id
# TMDBApi is no longer a parent, but TMDB specific classes are instantiated
from utils.tmdb import TMDBApi, MovieAPI, TvAPI, TMDBRatingsImporter, get_image_url
import logging

logger = logging.getLogger(__name__)

class APIManager:
    """
    Acts as a facade to various underlying API clients (e.g., TMDB).
    In the future, it could manage clients for other services (Goodreads, etc.).
    It also serves as the primary TMDB API client instance for its helpers.
    """
    def __init__(self, language="en-US"):
        # Instantiate helper/utility classes, passing the TMDBApi client to them
        self.tmdb_api_client = TMDBApi(language=language)
        self.tmdb_movie_api = MovieAPI(self.tmdb_api_client)
        self.tmdb_tv_api = TvAPI(self.tmdb_api_client)
        self.tmdb_ratings_import_api = TMDBRatingsImporter(
            tmdb_api_client=self.tmdb_api_client, 
            tv_api_client=self.tmdb_tv_api,
        )

    # Convenience method for TMDB image URLs
    def get_tmdb_image_url(self, path, size="original"):
        return get_image_url(path, size)

    def get_search(self, query, query_type="movie", page=1):
        """
        Perform a search using a specified content type.
        """
        if query_type == "movie":
            return self.tmdb_movie_api.get_search_movies(query, page=page)
        elif query_type == "tv":
            return self.tmdb_tv_api.get_search_tv_shows(query, page=page)
        else:
            # Fallback or error for unknown type
            logger.warning(f"Unsupported search type: {query_type}")
            return []
    
    def get_content_details(self, content_id):
        """
        A universal method to fetch either a movie or tv/season/episode details
        by parsing the content_id string. Assumes being called from media search,
        where only possible content types are 'movie' or 'tv'.
        """
        parsed = parse_content_id(content_id)
        content_type = parsed["type"] # "movie" or "tv"
        tmdb_id = parsed["show_id"] # TMDB ID
        season_num = parsed["season_number"]
        episode_num = parsed["episode_number"]

        if content_type == "movie":
            return self.tmdb_movie_api.get_movie_details(tmdb_id)
        elif content_type == "tv":
            if season_num is None:
                return self.tmdb_tv_api.get_tv_details(tmdb_id)
            else:
                if episode_num is None:
                    return self.tmdb_tv_api.get_season_details(tmdb_id, season_num)
                else:
                    return self.tmdb_tv_api.get_episode_details(tmdb_id, season_num, episode_num)
        else:
            logger.warning(f"Unsupported content type for get_content_details: {content_type}")
            return None

    def import_all_tmdb_ratings(self, rating_manager):
        """
        Main method: fetch your rated Movies, TV, and Episodes from TMDB
        and import them into your local RatingManager database.
        """
        return self.tmdb_ratings_import_api.import_all_tmdb_ratings(rating_manager)