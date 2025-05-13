from PySide6.QtWidgets import (
    QWidget, QLabel, QHBoxLayout, QVBoxLayout, 
    QPushButton, QScrollArea, QSizePolicy
)
from PySide6.QtCore import Qt, Signal
from PySide6.QtGui import QPixmap
import os
import logging
import requests
from io import BytesIO

class RatingItemWidget(QWidget):
    """
    Widget representing a single content item in the ratings carousel.
    Displays an image, title, and rating value.
    """
    clicked = Signal(str)  # Signal emitting content_id when clicked
    
    def __init__(self, content_id, title, rating, image_url=None, parent=None):
        """
        Initialize a rating item widget.
        
        Args:
            content_id: The unique identifier for the content
            title: The title to display
            rating: The numeric rating value
            image_url: URL to the image to display (optional)
            parent: Parent widget (optional)
        """
        super().__init__(parent)
        self.content_id = content_id
        self.setFixedWidth(180)
        # Don't set a fixed height - let content determine it
        
        # Make the widget clickable
        self.setCursor(Qt.PointingHandCursor)
        
        layout = QVBoxLayout(self)
        layout.setContentsMargins(5, 5, 5, 5)
        layout.setSpacing(2)
        
        # Image (poster)
        self.image_label = QLabel()
        self.image_label.setAlignment(Qt.AlignCenter)
        self.image_label.setFixedHeight(200)
        self.image_label.setSizePolicy(QSizePolicy.Expanding, QSizePolicy.Fixed)
        self.image_label.setStyleSheet("background-color: #222;")
        
        self._load_image(image_url)
        layout.addWidget(self.image_label)
        
        # Title with elided text if too long
        title_label = QLabel(title)
        title_label.setWordWrap(True)
        title_label.setAlignment(Qt.AlignCenter)
        title_label.setStyleSheet("font-weight: bold; color: black;")
        title_label.setFixedHeight(50)  # Set fixed height for title
        layout.addWidget(title_label)
        
        # Rating
        rating_str = f"{rating:.1f}" if rating is not None else "Not rated"
        rating_label = QLabel(f"Rating: {rating_str}")
        rating_label.setAlignment(Qt.AlignCenter)
        rating_label.setStyleSheet("color: black;")
        layout.addWidget(rating_label)
        
        # Background and border styling
        self.setStyleSheet("""
            RatingItemWidget {
                background-color: #f0f0f0;
                border-radius: 8px;
                border: 1px solid #ccc;
            }
        """)
    
    def _load_image(self, image_url):
        """
        Load an image from a URL into the image label.
        
        Args:
            image_url: URL to the image to load
        """
        if image_url:
            # If we have a URL, load it with requests
            try:
                response = requests.get(image_url)
                image_data = BytesIO(response.content)
                pixmap = QPixmap()
                pixmap.loadFromData(image_data.getvalue())
                
                self.image_label.setPixmap(pixmap.scaled(
                    170,  # Fixed width for image
                    200,  # Fixed height for image
                    Qt.KeepAspectRatio, 
                    Qt.SmoothTransformation
                ))
            except Exception as e:
                logging.error(f"Error loading image from URL {image_url}: {e}")
                self.image_label.setText("No Image")
        else:
            # No image available
            self.image_label.setText("No Image")
    
    def mousePressEvent(self, event):
        """Handle mouse press events to emit the clicked signal"""
        self.clicked.emit(self.content_id)
        super().mousePressEvent(event)


class RatingsCarousel(QWidget):
    """
    Horizontal carousel widget for displaying ratings.
    Includes left/right navigation buttons and a "View All" button.
    """
    item_clicked = Signal(str)  # Signal emitting content_id when an item is clicked
    view_all_clicked = Signal(str)  # Signal emitting 'movie' or 'tv' when View All is clicked
    
    def __init__(self, title, content_type, parent=None):
        """
        Initialize a ratings carousel widget.
        
        Args:
            title: The title to display above the carousel
            content_type: The type of content ('movie' or 'tv')
            parent: Parent widget (optional)
        """
        super().__init__(parent)
        self.content_type = content_type  # 'movie' or 'tv'
        
        main_layout = QVBoxLayout(self)
        main_layout.setContentsMargins(0, 0, 0, 0)
        
        # Header with title and "View All" button
        header_layout = QHBoxLayout()
        
        # Title (e.g., "Your Movie Ratings")
        header_label = QLabel(f"<h2>{title}</h2>")
        header_layout.addWidget(header_label)
        
        header_layout.addStretch()
        
        # "View All" button
        view_all_btn = QPushButton("View All")
        view_all_btn.clicked.connect(lambda: self.view_all_clicked.emit(self.content_type))
        header_layout.addWidget(view_all_btn)
        
        main_layout.addLayout(header_layout)
        
        # Scroll area for horizontal scrolling
        scroll_area = QScrollArea()
        scroll_area.setWidgetResizable(True)
        scroll_area.setHorizontalScrollBarPolicy(Qt.ScrollBarAlwaysOff)
        scroll_area.setVerticalScrollBarPolicy(Qt.ScrollBarAlwaysOff)
        # Increase the minimum height to fit all content including margins and spacing
        scroll_area.setMinimumHeight(350)
        scroll_area.setStyleSheet("QScrollArea { border: none; background-color: transparent; }")
        
        # Container widget for the scroll area
        self.scroll_content = QWidget()
        self.scroll_layout = QHBoxLayout(self.scroll_content)
        self.scroll_layout.setContentsMargins(5, 10, 5, 10)  # Add some padding
        self.scroll_layout.setSpacing(15)  # Slightly larger spacing between items
        
        scroll_area.setWidget(self.scroll_content)
        main_layout.addWidget(scroll_area)
        
        # Store reference to the scroll area for scrolling
        self.scroll_area = scroll_area
        
        # Arrow buttons for scrolling
        arrows_layout = QHBoxLayout()
        arrows_layout.addStretch()
        
        left_arrow = QPushButton("←")
        left_arrow.setFixedWidth(40)
        left_arrow.clicked.connect(self.scroll_left)
        
        right_arrow = QPushButton("→")
        right_arrow.setFixedWidth(40)
        right_arrow.clicked.connect(self.scroll_right)
        
        arrows_layout.addWidget(left_arrow)
        arrows_layout.addWidget(right_arrow)
        
        main_layout.addLayout(arrows_layout)
    
    def scroll_left(self):
        """Scroll the carousel to the left"""
        try:
            scroll_bar = self.scroll_area.horizontalScrollBar()
            scroll_bar.setValue(scroll_bar.value() - 200)
        except Exception as e:
            logging.error(f"Error scrolling left: {e}")
    
    def scroll_right(self):
        """Scroll the carousel to the right"""
        try:
            scroll_bar = self.scroll_area.horizontalScrollBar()
            scroll_bar.setValue(scroll_bar.value() + 200)
        except Exception as e:
            logging.error(f"Error scrolling right: {e}")
    
    def add_item(self, content_id, title, rating, image_url=None):
        """
        Add an item to the carousel
        
        Args:
            content_id: The unique identifier for the content
            title: The title to display
            rating: The numeric rating value
            image_url: URL to the image to display (optional)
        """
        try:
            item = RatingItemWidget(content_id, title, rating, image_url)
            item.clicked.connect(self.item_clicked.emit)
            self.scroll_layout.addWidget(item)
        except Exception as e:
            logging.error(f"Error adding item to carousel: {e}")
    
    def clear(self):
        """Clear all items in the carousel"""
        try:
            while self.scroll_layout.count():
                item = self.scroll_layout.takeAt(0)
                if item.widget():
                    item.widget().deleteLater()
        except Exception as e:
            logging.error(f"Error clearing carousel: {e}") 