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