# gui/MainContent/HomePage.py

from PySide6.QtWidgets import QVBoxLayout, QPushButton
from gui.Pages.BasePage import BasePage

class HomePage(BasePage):
    def __init__(self):
        super().__init__()
        layout = QVBoxLayout()
        
        view_ratings_button = QPushButton("View Your Ratings")
        view_ratings_button.clicked.connect(lambda: self.main_window.stacked_widget.setCurrentWidget(ViewRatingsPage(self.main_window)))

        layout.addWidget(view_ratings_button)
        self.setLayout(layout)