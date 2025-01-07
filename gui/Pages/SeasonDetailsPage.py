# gui/MainContent/SeasonDetailsPage.py

from PySide6.QtWidgets import (
    QWidget, QVBoxLayout, QLabel, QPushButton, QScrollArea, QSizePolicy, QFrame
)
from PySide6.QtCore import Qt
from gui.CustomWidgets.MediaHeaderWidget import MediaHeaderWidget
from gui.Pages.BasePage import BasePage
from gui.Pages.EpisodeDetailsPage import EpisodeDetailsPage
from gui.CustomWidgets.RatingWidget import RatingWidget

class SeasonDetailsPage(BasePage):
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
        # Referenced when updating episode buttons
        self.season_num = season_details.get('season_number', '?')
        overview = season_details.get('overview', 'No overview available.')
        self.episodes = season_details.get('episodes', [])

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
        header_label = QLabel(f"<h2>Season {self.season_num}</h2>")
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
        content_id = f"tv:{show.get('id')}-S{self.season_num}"
        self.rating_widget = RatingWidget(
            parent=self,
            rating_manager=self.rating_manager,
            content_id=content_id, # "tv:12345-S2"
            title_text="Rate this Season"
        )
        content_layout.addWidget(self.rating_widget)
    
        # Create scrollable area with buttons for each episode
        if self.episodes:
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

            # Keep track of episode buttons
            self.episode_buttons = {}

            # Add buttons for each season
            for i, ep_data in enumerate(self.episodes):
                ep_button = QPushButton()
                ep_button.setSizePolicy(QSizePolicy.Expanding, QSizePolicy.Preferred)
                ep_button.clicked.connect(lambda _, e=ep_data: self.view_episode(e))

                self.episode_buttons[i] = ep_button
                ep_layout.addWidget(ep_button)
            
            # Set buttons' initial text
            self._update_episode_buttons()
    
    def _update_episode_buttons(self):
        # Retrieve all episode ratings from ratings_manager for this season
        season_id = f"tv:{self.show.get('id')}-S{self.season_num}"
        # Get all ratings from episodes within this season
        like_pattern = f"{season_id}-E%"
        ep_ratings = self.rating_manager.get_all_ratings_for_pattern(like_pattern)
        # Update buttons to match
        for idx, ep_data in enumerate(self.episodes):
            # Retrieve episode info
            ep_num = ep_data.get('episode_number', '?')
            ep_name = ep_data.get('name', 'Unknown Episode')
            ep_id = f"{season_id}-E{ep_num}"

            # Retrieve rating
            rating_val = ep_ratings.get(ep_id, None)
            rating_str = f"      |      Rated: {rating_val}" if rating_val is not None else "      |      No Rating"

            # Set new button text
            button_text = f"Episode {ep_num}: {ep_name}{rating_str}"
            self.episode_buttons[idx].setText(button_text)
        
    def view_episode(self, episode):
        # Function to view episode
        page = EpisodeDetailsPage(
            self.nav,
            self.api_manager,
            self.rating_manager,
            self.show,
            episode
        )
        self.nav.push(page)
    
    def refresh_page(self):
        self.rating_widget.refresh_content()
        self._update_episode_buttons()