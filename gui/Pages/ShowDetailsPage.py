# gui/MainContent/ShowDetailsPage.py

from PySide6.QtWidgets import (
    QWidget, QVBoxLayout, QLabel, QPushButton, QScrollArea, QSizePolicy
)
from PySide6.QtCore import Qt
from gui.CustomWidgets.MediaHeaderWidget import MediaHeaderWidget
from gui.Pages.SeasonDetailsPage import SeasonDetailsPage
from gui.CustomWidgets.RatingWidget import RatingWidget

class ShowDetailsPage(QWidget):
    def __init__(self, navigation_controller, api_manager, rating_manager, show):
        super().__init__()
        self.nav = navigation_controller
        self.api_manager = api_manager
        self.rating_manager = rating_manager
        self.show = show

        # Get show details
        title = show.get('name', 'Unknown Name')
        first_air_date = show.get('first_air_date', 'Unknown Date')
        num_seasons = show.get('number_of_seasons', 0)
        overview = show.get('overview', 'No overview available.')
        global_rating = show.get('vote_average', 'No rating available.')
        backdrop = show.get('backdrop_path')
        poster = show.get('poster_path')

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

        # Add metadata beneath the header
        content_layout.addWidget(QLabel(f"First Air Date: {first_air_date}"))
        content_layout.addWidget(QLabel(f"TMDB Global Rating: {global_rating}"))

        # Scrollable overview label for extra long descriptions
        overview_label = QLabel(overview)
        overview_label.setWordWrap(True)
        overview_label.setSizePolicy(QSizePolicy.Expanding, QSizePolicy.Preferred)
        content_layout.addWidget(overview_label)

        # Insert a RatingWidget for the entire show
        # Create a pre-formatted TV show ID like "tv:12345"
        tv_id_str = f"tv:{self.show.get('id')}"
        rating_widget = RatingWidget(
            parent=self,
            rating_manager=self.rating_manager,
            content_id=tv_id_str,
            title_text="Rate this Show"
        )
        content_layout.addWidget(rating_widget)

        # Create scrollable area with buttons for each season
        if num_seasons > 0:
            # Season header label
            content_layout.addWidget(QLabel("<b>Seasons:</b>"))

            # Create ScrollArea
            ssn_scroll_area = QScrollArea()
            ssn_scroll_area.setWidgetResizable(True)

            content_layout.addWidget(ssn_scroll_area)

            # Create ScrollArea's content widget
            ssn_scroll_content = QWidget()
            ssn_scroll_area.setWidget(ssn_scroll_content)

            # Create layout for content widget
            ssn_layout = QVBoxLayout()
            ssn_scroll_content.setLayout(ssn_layout)

            # Add buttons for each season
            for season_number in range(1, num_seasons + 1):
                season_btn = QPushButton(f"Season {season_number}")
                season_btn.setSizePolicy(QSizePolicy.Expanding, QSizePolicy.Preferred)
                season_btn.clicked.connect(lambda _, sn=season_number: self.view_season(sn))
                ssn_layout.addWidget(season_btn)

    def view_season(self, season_number):
        content_id = f"tv:{self.show['id']}-S{season_number}"
        season_details = self.api_manager.get_content_details(content_id)
        page = SeasonDetailsPage(self.nav, self.api_manager, self.rating_manager, self.show, season_details)
        self.nav.push(page)