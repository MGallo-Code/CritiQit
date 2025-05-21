from PySide6.QtWidgets import QLabel, QPushButton
from PySide6.QtGui import QIcon
from PySide6.QtCore import Qt

from gui.CustomWidgets.ImageDisplayMixin import ImageDisplayMixin

class ImageLabel(QLabel, ImageDisplayMixin):
    """
    A QLabel that can display images asynchronously.
    """
    def __init__(self, parent=None, async_loading=True):
        QLabel.__init__(self, parent)
        ImageDisplayMixin.__init__(self, async_loading)
        self.setAlignment(Qt.AlignCenter)
        self.setText("Loading...")
    
    def _on_image_loaded(self, url, pixmap, load_time):
        """Set the loaded image as the label's pixmap"""
        self.setPixmap(pixmap)
        self.adjustSize()
    
    def _on_image_error(self, url, error_message):
        """Display error message when image loading fails"""
        self.setText("Error loading image")

class ImageButton(QPushButton, ImageDisplayMixin):
    """
    A QPushButton that can display an image as its icon asynchronously.
    """
    def __init__(self, text="", parent=None, async_loading=True):
        QPushButton.__init__(self, text, parent)
        ImageDisplayMixin.__init__(self, async_loading)
        self.setCursor(Qt.PointingHandCursor)
    
    def _on_image_loaded(self, url, pixmap, load_time):
        """Set the loaded image as the button's icon"""
        self.setIcon(QIcon(pixmap))
        self.setIconSize(pixmap.size())
    
    def _on_image_error(self, url, error_message):
        """Handle image loading error"""
        self.setIcon(QIcon())  # Clear the icon 