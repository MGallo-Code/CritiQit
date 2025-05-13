# gui/Widgets/ImageWidget.py

import requests
from PySide6.QtWidgets import QWidget, QLabel, QVBoxLayout
from PySide6.QtGui import QPixmap
from PySide6.QtCore import Qt

from gui.CustomWidgets.AsyncImageLoader import AsyncImageLoader

class ImageWidget(QWidget):
    """
    A custom widget that downloads and displays an image from TMDB or any URL.
    Optionally limit the displayed size (width/height) while preserving aspect ratio.
    """

    BASE_IMAGE_URL = "https://image.tmdb.org/t/p/"

    def __init__(
        self,
        parent=None,
        img_path=None,
        size_key="original",
        max_width=None,
        max_height=None,
        full_url=None
    ):
        """
        :param parent: parent widget
        :param img_path: e.g. "/4edFyasCrkH4MKs6H4mHqlrxA6b.jpg"
        :param size_key: e.g. "original", "w500", "w300", etc.
        :param max_width: optional max width in pixels
        :param max_height: optional max height in pixels
        :param full_url: complete image URL (overrides img_path and size_key)
        """
        super().__init__(parent)
        self.img_path = img_path
        self.size_key = size_key
        self.max_width = max_width
        self.max_height = max_height
        self.full_url = full_url

        # Main layout
        self.layout = QVBoxLayout(self)
        self.layout.setContentsMargins(0, 0, 0, 0)

        # Create a label to show the image or messages
        self.image_label = QLabel("Loading...", self)
        self.image_label.setAlignment(Qt.AlignCenter)
        self.layout.addWidget(self.image_label)

        # Determine target size
        self.target_size = None
        if self.max_width and self.max_height:
            self.target_size = (self.max_width, self.max_height)

        # Start loading the image asynchronously
        if self.full_url:
            self._load_image_async(self.full_url)
        elif self.img_path:
            url = self.build_tmdb_image_url(self.img_path)
            self._load_image_async(url)

    def build_tmdb_image_url(self, img_path):
        """
        Construct the TMDB image URL from the poster path and the size key.
        e.g.: "https://image.tmdb.org/t/p/w500/img_path"
        """
        return f"{self.BASE_IMAGE_URL}{self.size_key}{img_path}"

    def _load_image_async(self, url):
        """
        Use AsyncImageLoader to load the image asynchronously
        """
        loader = AsyncImageLoader.get_instance()
        loader.load_image(
            url=url,
            size=self.target_size,
            on_finished=self._on_image_loaded,
            on_error=self._on_image_error,
            on_cache_hit=self._on_cache_hit
        )

    def _on_image_loaded(self, url, pixmap, load_time):
        """Callback when image is loaded from network"""
        self.image_label.setPixmap(pixmap)
        self.image_label.adjustSize()

    def _on_image_error(self, url, error_message):
        """Callback when image loading fails"""
        self.image_label.setText(f"Error loading image")
    
    def _on_cache_hit(self, url, pixmap, cache_type, load_time):
        """Callback when image is loaded from cache"""
        self.image_label.setPixmap(pixmap)
        self.image_label.adjustSize()