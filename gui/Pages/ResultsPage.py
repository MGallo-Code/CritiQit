# gui/MainContent/ResultsPage.py
from PySide6.QtWidgets import (
    QWidget, QVBoxLayout, QLabel, QScrollArea
)
from PySide6.QtCore import QSize

from gui.Pages.BasePage import BasePage
from gui.Pages.MovieDetailsPage import MovieDetailsPage
from gui.Pages.ShowDetailsPage import ShowDetailsPage
from gui.CustomWidgets.ImageWidgets import ImageButton

class ResultsPage(BasePage):
    def __init__(self, navigation_controller, api_manager, rating_manager, results, is_movie):
        super().__init__()
        self.nav = navigation_controller
        self.api_manager = api_manager
        self.rating_manager = rating_manager
        self.results = results
        self.is_movie = is_movie

        layout = QVBoxLayout(self)
        layout.addWidget(QLabel("<h2>Search Results:</h2>"))

        scroll_area = QScrollArea()
        scroll_area.setWidgetResizable(True)
        scroll_content = QWidget()
        self.results_layout = QVBoxLayout(scroll_content)
        # Tighten up vertical space
        self.results_layout.setSpacing(4)

        # Build the UI for each result
        for result in self.results:
            btn = self.create_result_button(result)
            self.results_layout.addWidget(btn)

        self.results_layout.addStretch()
        scroll_content.setLayout(self.results_layout)
        scroll_area.setWidget(scroll_content)
        layout.addWidget(scroll_area)

    def create_result_button(self, result):
        """
        Create an ImageButton for either movie or show result.
        """
        if self.is_movie:
            title = result.get('title', 'Unknown Title')
            date = result.get('release_date', 'Unknown Date')
            text = f"{title} ({date})"
            clicked_fn = lambda: self.show_movie_details(result)
        else:
            name = result.get('name', 'Unknown Name')
            date = result.get('first_air_date', 'Unknown Date')
            text = f"{name} ({date})"
            clicked_fn = lambda: self.show_tv_details(result)

        # Create button with image support
        btn = ImageButton(text)
        btn.clicked.connect(clicked_fn)
        btn.setStyleSheet("text-align: left;")
        
        # Set the poster image if available
        poster_path = result.get('poster_path')
        if poster_path:
            url = f"https://image.tmdb.org/t/p/w154{poster_path}"
            btn.set_image(url, size=(60, 90))

        return btn

    def show_movie_details(self, movie):
        page = MovieDetailsPage(self.nav, self.api_manager, self.rating_manager, movie)
        self.nav.push(page)

    def show_tv_details(self, tv_show):
        show_id = "tv:" + str(tv_show.get('id'))
        detailed_show = self.api_manager.get_content_details(show_id)
        page = ShowDetailsPage(self.nav, self.api_manager, self.rating_manager, detailed_show)
        self.nav.push(page)