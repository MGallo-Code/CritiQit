# gui/MainContent/HomePage.py

from PySide6.QtWidgets import QVBoxLayout, QPushButton
from gui.Pages.BasePage import BasePage
from gui.Pages.ViewRatingsPage import ViewRatingsPage

class HomePage(BasePage):
    def __init__(self, navigation_controller, api_manager, rating_manager):
        super().__init__()
        self.nav = navigation_controller
        self.api_manager = api_manager
        self.rating_manager = rating_manager
        
        layout = QVBoxLayout()
        
        view_ratings_button = QPushButton("View Your Ratings")
        view_ratings_button.clicked.connect(self.navigate_to_ratings)

        layout.addWidget(view_ratings_button)
        self.setLayout(layout)
        
    def navigate_to_ratings(self):
        ratings_page = ViewRatingsPage(self.nav, self.api_manager, self.rating_manager)
        self.nav.push(ratings_page)