import re
import logging

logger = logging.getLogger(__name__)

def clean_title(title):
    """
    Remove parenthesized numbers like (1), (2), etc. from TMDB titles.
    
    Args:
        title (str): The original title string from TMDB.
        
    Returns:
        str: Cleaned title string.
    """
    if not title:
        return ""
    
    # Remove (1), (2), etc. from the end of the title
    cleaned_title = re.sub(r'\s*\(\d+\)\s*$', '', title)
    
    # Trim any extra whitespace
    cleaned_title = cleaned_title.strip()
    
    return cleaned_title

def get_image_url(path, size="original"):
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
        
        TMDB_IMAGE_BASE_URL = "https://image.tmdb.org/t/p/"

        return f"{TMDB_IMAGE_BASE_URL}{size}{path}" 