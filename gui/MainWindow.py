from PyQt6.QtWidgets import QMainWindow, QStackedWidget, QHBoxLayout, QVBoxLayout, QWidget, QPushButton
from PyQt6.QtCore import Qt
from gui.HomePage import HomePage
from gui.SearchPage import SearchPage
from gui.MoviePage import MoviePage
from gui.TVShowPage import TVShowPage

class MainWindow(QMainWindow):
    def __init__(self):
        super().__init__()
        self.setWindowTitle("Movie and TV Rating App")
        self.resize(800, 600)

        # Stacked widget to switch between pages
        self.stacked_widget = QStackedWidget()
        
        # Initialize pages
        self.home_page = HomePage(self)
        self.search_page = SearchPage(self)
        self.movie_page = MoviePage(self)
        self.tv_show_page = TVShowPage(self)

        # Add pages to stacked widget
        self.stacked_widget.addWidget(self.home_page)
        self.stacked_widget.addWidget(self.search_page)
        self.stacked_widget.addWidget(self.movie_page)
        self.stacked_widget.addWidget(self.tv_show_page)

        # Set up main layout
        main_layout = QVBoxLayout()
        main_layout.addWidget(self.create_navigation_bar())
        main_layout.addWidget(self.stacked_widget)

        # Set the central widget
        central_widget = QWidget()
        central_widget.setLayout(main_layout)
        self.setCentralWidget(central_widget)

        # Show home page initially
        self.stacked_widget.setCurrentWidget(self.home_page)

    def create_navigation_bar(self):
        # Navigation buttons
        nav_bar = QHBoxLayout()
        home_button = QPushButton("Home")
        home_button.clicked.connect(lambda: self.stacked_widget.setCurrentWidget(self.home_page))

        search_button = QPushButton("Rate New Content")
        search_button.clicked.connect(lambda: self.stacked_widget.setCurrentWidget(self.search_page))

        ratings_button = QPushButton("View Ratings")
        ratings_button.clicked.connect(lambda: self.stacked_widget.setCurrentWidget(ViewRatingsPage(self)))

        # Add buttons to navigation bar
        nav_bar.addWidget(home_button)
        nav_bar.addWidget(search_button)
        nav_bar.addWidget(ratings_button)
        return nav_bar