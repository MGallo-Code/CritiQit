from PySide6.QtCore import Qt
from PySide6.QtGui import QPixmap, QIcon
import logging

from gui.CustomWidgets.AsyncImageLoader import AsyncImageLoader

logger = logging.getLogger(__name__)

class ImageDisplayMixin:
    """
    A mixin that provides image loading and display functionality to any widget.
    Can be used with both async and sync loading.
    """
    def __init__(self, async_loading=True):
        """
        Initialize the mixin.
        
        Args:
            async_loading (bool): Whether to use async loading by default
        """
        self.async_loading = async_loading
        self._setup_image_display()
    
    def _setup_image_display(self):
        """Common setup for image display. Override in subclasses if needed."""
        pass
    
    def set_image(self, url, size=None):
        """
        Set an image on the widget.
        
        Args:
            url (str): URL of the image to load
            size (tuple): Optional (width, height) tuple for scaling
        """
        if not url:
            self._on_image_error(url, "No URL provided")
            return
            
        if self.async_loading:
            self._load_image_async(url, size)
        else:
            self._load_image_sync(url, size)
    
    def _load_image_async(self, url, size=None):
        """
        Load an image asynchronously using AsyncImageLoader.
        
        Args:
            url (str): URL of the image to load
            size (tuple): Optional (width, height) tuple for scaling
        """
        loader = AsyncImageLoader.get_instance()
        loader.load_image(
            url=url,
            size=size,
            on_finished=self._on_image_loaded,
            on_error=self._on_image_error,
            on_cache_hit=self._on_image_loaded
        )
    
    def _load_image_sync(self, url, size=None):
        """
        Load an image synchronously. Override in subclasses if needed.
        
        Args:
            url (str): URL of the image to load
            size (tuple): Optional (width, height) tuple for scaling
        """
        # This is a placeholder - implement sync loading if needed
        logger.warning("Sync loading not implemented")
        self._on_image_error(url, "Sync loading not implemented")
    
    def _on_image_loaded(self, url, pixmap, load_time):
        """
        Callback when image is loaded. Must be implemented by the widget using this mixin.
        
        Args:
            url (str): URL of the loaded image
            pixmap (QPixmap): The loaded image
            load_time (float): Time taken to load the image
        """
        raise NotImplementedError("Widget must implement _on_image_loaded")
    
    def _on_image_error(self, url, error_message):
        """
        Callback when image loading fails. Must be implemented by the widget using this mixin.
        
        Args:
            url (str): URL of the failed image
            error_message (str): Error message
        """
        raise NotImplementedError("Widget must implement _on_image_error") 