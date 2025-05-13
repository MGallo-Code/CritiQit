# utils/tmdb/tmdb_api.py

import os
from dotenv import load_dotenv
from utils.api import BaseAPI
import logging

logger = logging.getLogger(__name__)

# Load env variables from .env
load_dotenv()
TMDB_BEARER_TOKEN = os.getenv("TMDB_BEARER_TOKEN")
TMDB_BASE_URL = "https://api.themoviedb.org/3/"

class TMDBApi(BaseAPI):
    """
    Base class for TMDB API interactions.
    Handles TMDB-specific authentication and common request patterns.
    """
    def __init__(self, language="en-US"):
        super().__init__(TMDB_BASE_URL)
        self.language = language
        self.default_headers = {
            "accept": "application/json",
            "Authorization": "Bearer " + TMDB_BEARER_TOKEN
        }
        # Cache account ID
        self._account_id = None  

    def _request(self, method, endpoint, params=None, data=None, headers=None):
        """
        Override _request to inject default TMDB headers and language param.
        """
        # Combine default headers with any provided headers
        final_headers = self.default_headers.copy()
        if headers:
            final_headers.update(headers)
        
        # Add language parameter if not already present in params
        final_params = params.copy() if params else {}
        if 'language' not in final_params:
            final_params['language'] = self.language
            
        return super()._request(method, endpoint, params=final_params, data=data, headers=final_headers)

    @property
    def account_id(self):
        """
        Get the user's TMDB account ID. Caches the result.
        """
        if self._account_id is None:
            response = self.get("account")
            if response and "id" in response:
                self._account_id = response["id"]
            else:
                logger.error("Failed to retrieve TMDB account ID.")
        return self._account_id 