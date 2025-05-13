# utils/APIManager.py

from .content_helpers import parse_content_id
# TMDBApi is no longer a parent, but TMDB specific classes are instantiated
from utils.tmdb import MovieAPI, TvAPI, RatingsImportAPI, TMDBImageAPI
import logging

logger = logging.getLogger(__name__)

class APIManager:
    """
    Acts as a facade to various underlying API clients (e.g., TMDB).
    In the future, it could manage clients for other services (Goodreads, etc.).
    """
    def __init__(self, language="en-US"):
        # For now, it primarily manages TMDB APIs.
        # These could be initialized more dynamically if/when other APIs are added.
        self.movie_api = MovieAPI(language=language)
        self.tv_api = TvAPI(language=language)
        self.tmdb_import_api = RatingsImportAPI(language=language)
        self.tmdb_image_api = TMDBImageAPI()

    # Convenience method for TMDB image URLs
    def get_tmdb_image_url(self, path, size="original"):
        return self.tmdb_image_api.get_image_url(path, size)

    def get_search(self, query, query_type="movie", page=1):
        """
        Perform a search using a specified content type.
        """
        if query_type == "movie":
            return self.movie_api.get_search_movies(query, page=page)
        elif query_type == "tv":
            return self.tv_api.get_search_tv_shows(query, page=page)
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
            return self.movie_api.get_movie_details(tmdb_id)
        elif content_type == "tv":
            if season_num is None:
                return self.tv_api.get_tv_details(tmdb_id)
            else:
                if episode_num is None:
                    return self.tv_api.get_season_details(tmdb_id, season_num)
                else:
                    return self.tv_api.get_episode_details(tmdb_id, season_num, episode_num)
        else:
            logger.warning(f"Unsupported content type for get_content_details: {content_type}")
            return None

    def import_all_tmdb_ratings(self, rating_manager):
        """
        Main method: fetch your rated Movies, TV, and Episodes from TMDB
        and import them into your local RatingManager database.
        """
        return self.tmdb_import_api.import_all_tmdb_ratings(rating_manager)