# gui/MainContent/SeasonDetailsPage.py

from PySide6.QtWidgets import (
    QWidget, QVBoxLayout, QLabel, QPushButton, QScrollArea, QSizePolicy, QFrame
)
from PySide6.QtCore import Qt
from gui.CustomWidgets.MediaHeaderWidget import MediaHeaderWidget
from gui.Pages.EpisodeDetailsPage import EpisodeDetailsPage
from gui.CustomWidgets.RatingWidget import RatingWidget

class SeasonDetailsPage(QWidget):
    def __init__(self, navigation_controller, api_manager, rating_manager, show, season_details):
        super().__init__()
        self.nav = navigation_controller
        self.api_manager = api_manager
        self.rating_manager = rating_manager
        self.show = show
        self.season_details = season_details

        # Get show details
        title = show.get('name', 'Unknown Name')
        backdrop = show.get('backdrop_path')
        poster = show.get('poster_path')
        air_date = season_details.get('air_date', 'Unknown Date')
        season_num = season_details.get('season_number', '?')
        overview = season_details.get('overview', 'No overview available.')
        episodes = season_details.get('episodes', [])

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
        header_label = QLabel(f"<h2>Season {season_num}</h2>")
        header_label.setAlignment(Qt.AlignCenter)
        content_layout.addWidget(header_label)

        # Add metadata beneath the header
        content_layout.addWidget(QLabel(f"First Air Date: {air_date}"))

        # Scrollable overview label for extra long descriptions
        overview_label = QLabel(overview)
        overview_label.setWordWrap(True)
        overview_label.setSizePolicy(QSizePolicy.Expanding, QSizePolicy.Preferred)
        content_layout.addWidget(overview_label)

        # Add the RatingWidget
        # Create a pre-formatted ID for the season, e.g. "tv:12345-S2"
        content_id = f"tv:{show.get('id')}-S{season_num}"
        season_rating_widget = RatingWidget(
            parent=self,
            rating_manager=self.rating_manager,
            content_id=content_id, # "tv:12345-S2"
            title_text="Rate this Season"
        )
        content_layout.addWidget(season_rating_widget)
        
        # Create scrollable area with buttons for each episode
        if episodes:
            # Episode header label
            content_layout.addWidget(QLabel("<h3>Episodes:</h3>"))

            # Create ScrollArea
            ep_scroll_area = QScrollArea()
            ep_scroll_area.setWidgetResizable(True)
            content_layout.addWidget(ep_scroll_area)

            # Create ScrollArea's content widget
            ep_scroll_content = QWidget()
            ep_scroll_area.setWidget(ep_scroll_content)

            # Create layout for content widget
            ep_layout = QVBoxLayout()
            ep_scroll_content.setLayout(ep_layout)

            # Add buttons for each season
            for ep in episodes:
                ep_num = ep.get('episode_number', '?')
                ep_name = ep.get('name', 'Unknown Episode')

                ep_button = QPushButton(f"Episode {ep_num}: {ep_name}")
                ep_button.setSizePolicy(QSizePolicy.Expanding, QSizePolicy.Preferred)
                ep_button.clicked.connect(self._create_view_episode_handler(ep))
                ep_layout.addWidget(ep_button)

    def _create_view_episode_handler(self, episode):
        return lambda: self.view_episode(episode)

    def view_episode(self, episode):
        page = EpisodeDetailsPage(
            self.nav,
            self.api_manager,
            self.rating_manager,
            self.show,
            episode
        )
        self.nav.push(page)