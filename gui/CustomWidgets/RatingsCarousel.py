from PySide6.QtWidgets import (
    QWidget, QLabel, QHBoxLayout, QVBoxLayout, 
    QPushButton, QScrollArea, QSizePolicy
)
from PySide6.QtCore import Qt, Signal
from PySide6.QtGui import QPixmap
import os

class RatingItemWidget(QWidget):
    clicked = Signal(str)  # Signal emitting content_id when clicked
    
    def __init__(self, content_id, title, rating, image_url=None, parent=None):
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
        
        if image_url:
            # If we have a URL, load it with requests
            try:
                import requests
                from io import BytesIO
                
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
                print(f"Error loading image from URL: {e}")
                self.image_label.setText("No Image")
        else:
            # No image available
            self.image_label.setText("No Image")
        
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
    
    def mousePressEvent(self, event):
        self.clicked.emit(self.content_id)
        super().mousePressEvent(event)


class RatingsCarousel(QWidget):
    item_clicked = Signal(str)  # Signal emitting content_id when an item is clicked
    view_all_clicked = Signal(str)  # Signal emitting 'movie' or 'tv' when View All is clicked
    
    def __init__(self, title, content_type, parent=None):
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
        scroll_bar = self.scroll_area.horizontalScrollBar()
        scroll_bar.setValue(scroll_bar.value() - 200)
    
    def scroll_right(self):
        """Scroll the carousel to the right"""
        scroll_bar = self.scroll_area.horizontalScrollBar()
        scroll_bar.setValue(scroll_bar.value() + 200)
    
    def add_item(self, content_id, title, rating, image_url=None):
        """Add an item to the carousel"""
        item = RatingItemWidget(content_id, title, rating, image_url)
        item.clicked.connect(self.item_clicked.emit)
        self.scroll_layout.addWidget(item)
    
    def clear(self):
        """Clear all items in the carousel"""
        while self.scroll_layout.count():
            item = self.scroll_layout.takeAt(0)
            if item.widget():
                item.widget().deleteLater() 