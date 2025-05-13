# utils/api/base_api.py

import requests
import logging

logger = logging.getLogger(__name__)

class BaseAPI:
    """
    Base class for API client implementations.
    Provides common request handling and error logging.
    """
    def __init__(self, base_url):
        self.base_url = base_url
        # Use a session for connection pooling
        self.session = requests.Session()

    def _request(self, method, endpoint, params=None, data=None, headers=None):
        """
        Internal method to make an HTTP request.
        
        Args:
            method (str): HTTP method (GET, POST, etc.)
            endpoint (str): API endpoint path (e.g., '/search/movie')
            params (dict, optional): URL parameters.
            data (dict, optional): Request body data.
            headers (dict, optional): Additional request headers.
            
        Returns:
            dict or None: JSON response as a dictionary, or None on error.
        """
        url = f"{self.base_url.rstrip('/')}/{endpoint.lstrip('/')}"
        
        try:
            response = self.session.request(method, url, params=params, json=data, headers=headers)
            # Raise HTTPError for bad responses (4xx or 5xx)
            response.raise_for_status()
            return response.json()
        except requests.exceptions.HTTPError as http_err:
            logger.error(f"HTTP error occurred: {http_err} - URL: {url} - Response: {response.text}")
        except requests.exceptions.ConnectionError as conn_err:
            logger.error(f"Connection error occurred: {conn_err} - URL: {url}")
        except requests.exceptions.Timeout as timeout_err:
            logger.error(f"Timeout error occurred: {timeout_err} - URL: {url}")
        except requests.exceptions.RequestException as req_err:
            logger.error(f"An unexpected error occurred: {req_err} - URL: {url}")
        except ValueError: # Includes JSONDecodeError
            logger.error(f"Failed to decode JSON response from {url}")
            
        return None

    def get(self, endpoint, params=None, headers=None):
        return self._request("GET", endpoint, params=params, headers=headers)

    def post(self, endpoint, data=None, params=None, headers=None):
        return self._request("POST", endpoint, params=params, data=data, headers=headers)