# gui/MainContent/EpisodeDetailsPage.py

from PySide6.QtWidgets import QWidget, QVBoxLayout, QLabel, QScrollArea, QSizePolicy, QPushButton
from PySide6.QtCore import Qt
from gui.CustomWidgets.MediaHeaderWidget import MediaHeaderWidget
from gui.CustomWidgets.RatingWidget import RatingWidget

class EpisodeDetailsPage(QWidget):
    def __init__(self, navigation_controller, api_manager, rating_manager, show, episode):
        super().__init__()
        self.nav = navigation_controller
        self.api_manager = api_manager
        self.rating_manager = rating_manager
        self.show = show
        self.episode = episode

        # Get show details
        title = show.get('name', 'Unknown Name')
        poster = show.get('poster_path')
        backdrop = episode.get('still_path')
        season_num = episode.get('season_number', '?')
        ep_num = episode.get('episode_number', '?')
        name = episode.get('name', 'Unknown Episode')
        air_date = episode.get('air_date', 'Unknown Date')
        overview = episode.get('overview', 'No overview available.')
        global_rating = episode.get('vote_average', 'No rating available.')

        # Create the main layout
        main_layout = QVBoxLayout(self)
        main_layout.setContentsMargins(0,0,0,0)

        # Make main content area scrollable to avoid resizing issues
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

        # Season number label
        episode_label = QLabel(f"<h2>Season {season_num}, Episode {ep_num}: {name}</h2>")
        episode_label.setAlignment(Qt.AlignCenter)
        episode_label.setWordWrap(True)
        content_layout.addWidget(episode_label)

        # Add metadata beneath the header
        content_layout.addWidget(QLabel(f"First Air Date: {air_date}"))

        # Scrollable overview label for extra long descriptions
        overview_label = QLabel(overview)
        overview_label.setWordWrap(True)
        overview_label.setSizePolicy(QSizePolicy.Expanding, QSizePolicy.Preferred)
        content_layout.addWidget(overview_label)

        # Global Rating
        content_layout.addWidget(QLabel(f"Global Rating: {global_rating}"))

        # Add the RatingWidget
        # Create a pre-formatted ID for the season, e.g. "tv:12345-S2"
        content_id = f"tv:{show.get('id')}-S{season_num}"
        season_rating_widget = RatingWidget(
            parent=self,
            rating_manager=self.rating_manager,
            content_id=content_id, # "tv:12345-S2"
            title_text="Rate this Episode"
        )
        content_layout.addWidget(season_rating_widget)