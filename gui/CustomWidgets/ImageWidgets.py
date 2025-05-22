from PySide6.QtWidgets import QLabel, QPushButton, QSizePolicy
from PySide6.QtGui import QIcon, QPixmap, QPainter, QColor, QPen
from PySide6.QtCore import Qt

from gui.CustomWidgets.ImageDisplayMixin import ImageDisplayMixin

def create_placeholder_pixmap(width, height, text=None, icon_char=None):
    """Helper to create a placeholder pixmap with optional text or icon character."""
    pixmap = QPixmap(width, height)
    pixmap.fill(QColor(230, 230, 230))  # Light gray background

    painter = QPainter(pixmap)
    try:
        if text:
            painter.setPen(QColor(100, 100, 100)) # Dark gray text
            font = painter.font()
            font.setPointSize(max(8, min(width, height) // 6)) # Adjust font size
            painter.setFont(font)
            painter.drawText(pixmap.rect(), Qt.AlignCenter, text)
        elif icon_char:
            painter.setPen(QColor(150, 150, 150)) # Medium gray icon
            font = painter.font()
            font.setPointSize(min(width, height) * 0.6) # Large icon character
            painter.setFont(font)
            painter.drawText(pixmap.rect(), Qt.AlignCenter, icon_char)
        else: # Draw a border if no text or icon
            painter.setPen(QPen(QColor(180, 180, 180), 2)) # Border
            painter.drawRect(pixmap.rect().adjusted(0,0,-1,-1))
    finally:
        painter.end()
    return pixmap

class ImageLabel(QLabel, ImageDisplayMixin):
    """
    A QLabel that can display images asynchronously.
    It can reserve space using default_width and default_height.
    """
    def __init__(self, parent=None, async_loading=True, default_width=None, default_height=None):
        QLabel.__init__(self, parent)
        ImageDisplayMixin.__init__(self, async_loading)
        self.setAlignment(Qt.AlignCenter)
        self.default_width = default_width
        self.default_height = default_height

        if self.default_width is not None and self.default_height is not None:
            self.setFixedSize(self.default_width, self.default_height)
            # Use helper for placeholder
            self.setPixmap(create_placeholder_pixmap(self.default_width, self.default_height, text="Loading..."))
        else:
            self.setText("Loading...") 
            self.setSizePolicy(QSizePolicy.Preferred, QSizePolicy.Preferred)


    def _on_image_loaded(self, url, pixmap, load_time):
        """Set the loaded image as the label's pixmap"""
        if self.default_width is None or self.default_height is None:
             # If no default size was given, adjust to the loaded image size
            self.setFixedSize(pixmap.width(), pixmap.height())

        self.setPixmap(pixmap)

    def _on_image_error(self, url, error_message):
        """Display error message or placeholder when image loading fails"""
        width = self.default_width if self.default_width is not None else self.width() if self.width() > 20 else 100
        height = self.default_height if self.default_height is not None else self.height() if self.height() > 20 else 100
        
        if not self.default_width or not self.default_height:
            self.setFixedSize(width, height)

        if error_message == "No URL provided":
            self.setPixmap(create_placeholder_pixmap(width, height, icon_char="🖼️")) # Unicode picture frame
        else:
            self.setPixmap(create_placeholder_pixmap(width, height, text="Error"))

class ImageButton(QPushButton, ImageDisplayMixin):
    """
    A QPushButton that can display an image as its icon asynchronously.
    It can reserve space using default_width and default_height.
    """
    def __init__(self, text="", parent=None, async_loading=True, default_width=None, default_height=None):
        QPushButton.__init__(self, text, parent)
        ImageDisplayMixin.__init__(self, async_loading)
        self.setCursor(Qt.PointingHandCursor)
        self.default_width = default_width
        self.default_height = default_height

        if self.default_width is not None and self.default_height is not None:
            self.setFixedSize(self.default_width, self.default_height)
            # Set a placeholder icon using the helper. Icon QPixmap needs to be square for best results.
            icon_size = min(self.default_width, self.default_height) - 6 # Small padding
            self.setIcon(QIcon(create_placeholder_pixmap(icon_size, icon_size, text="...")))
            self.setIconSize(Qt.QSize(icon_size, icon_size))
            if not text:
                 self.setText("") # Clear placeholder text if fixed size
        else:
            self.setSizePolicy(QSizePolicy.Preferred, QSizePolicy.Preferred)


    def _on_image_loaded(self, url, pixmap, load_time):
        """Set the loaded image as the button's icon"""
        self.setIcon(QIcon(pixmap))
        if self.default_width is not None and self.default_height is not None:
             self.setIconSize(Qt.QSize(self.default_width - 6, self.default_height - 6)) # Allow some padding
        else:
             self.setIconSize(pixmap.size())
             self.adjustSize() 

        if self.text() == "...": 
            self.setText("")

    def _on_image_error(self, url, error_message):
        """Handle image loading error"""
        width = self.default_width if self.default_width is not None else self.width() if self.width() > 20 else 50
        height = self.default_height if self.default_height is not None else self.height() if self.height() > 20 else 50

        icon_size = min(width, height) - 6
        if icon_size <=0 : icon_size = min(width,height)

        if not self.default_width or not self.default_height:
            self.setFixedSize(width, height)

        if error_message == "No URL provided":
            self.setIcon(QIcon(create_placeholder_pixmap(icon_size, icon_size, icon_char="🖼️")))
        else:
            self.setIcon(QIcon(create_placeholder_pixmap(icon_size, icon_size, icon_char="!")))
        self.setIconSize(Qt.QSize(icon_size, icon_size)) 