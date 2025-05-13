# utils/tmdb/image_api.py

import logging

logger = logging.getLogger(__name__)

TMDB_IMAGE_BASE_URL = "https://image.tmdb.org/t/p/"

class TMDBImageAPI:
    """
    Handles TMDB image URL construction.
    """
    def __init__(self):
        pass

    def get_image_url(self, path, size="original"):
        """
        Convert a poster_path or backdrop_path to a full URL.
        
        Args:
            path (str): The poster_path or backdrop_path from TMDB API (e.g., /xyz.jpg).
            size (str): The size of the image (e.g., "w185", "w500", "original").
                        Common sizes: "w92", "w154", "w185", "w342", "w500", "w780", "original".
        
        Returns:
            str or None: The full image URL, or None if path is not provided.
        """
        if not path:
            return None
            
        # Ensure path starts with a slash
        if not path.startswith('/'):
            path = '/' + path
            
        return f"{TMDB_IMAGE_BASE_URL}{size}{path}" 