# gui/MainContent/MovieDetailsPage.py

from PySide6.QtWidgets import QWidget, QVBoxLayout, QLabel, QScrollArea
from PySide6.QtCore import Qt
from gui.CustomWidgets.RatingWidget import RatingWidget
from gui.CustomWidgets.MediaHeaderWidget import MediaHeaderWidget

class MovieDetailsPage(QWidget):
    def __init__(self, navigation_controller, api_manager, rating_manager, movie):
        super().__init__()
        self.nav = navigation_controller
        self.api_manager = api_manager
        self.rating_manager = rating_manager
        self.movie = movie

        # Insert the custom media header up top
        title = movie.get('title', 'Unknown Title')
        backdrop = movie.get('backdrop_path')
        poster = movie.get('poster_path')

        main_layout = QVBoxLayout(self)
        main_layout.setContentsMargins(0,0,0,0)

        # Make main area scrollable to avoid resizing issues
        scroll_area = QScrollArea(self)
        scroll_area.setWidgetResizable(True)
        main_layout.addWidget(scroll_area)

        # Scrollable content widget
        content_widget = QWidget()
        scroll_area.setWidget(content_widget)
        content_layout = QVBoxLayout(content_widget)
        content_layout.setContentsMargins(0, 0, 0, 0)
        content_layout.setSpacing(10)

        # Create and add header widget with poster, backdrop, and title
        header_widget = MediaHeaderWidget(
            parent=self,
            title=title,
            backdrop_path=backdrop,
            poster_path=poster,
        )
        content_layout.addWidget(header_widget)

        # Add metadata beneath the header
        rating_label = QLabel(f"TMDB Rating: {movie.get('vote_average', 'N/A')}")
        content_layout.addWidget(rating_label)

        # Add movie overview
        overview = movie.get('overview', 'No overview provided.')
        overview_label = QLabel(overview)
        overview_label.setWordWrap(True)
        content_layout.addWidget(overview_label)

        # Add rating widget
        content_id = f"movie:{movie.get('id')}"
        rating_widget = RatingWidget(
            parent=self,
            rating_manager=rating_manager,
            content_id=content_id,
            title_text="Rate this Movie"
        )
        content_layout.addWidget(rating_widget)