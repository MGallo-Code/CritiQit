# gui/MainWindow.py
from PySide6.QtWidgets import (
    QMainWindow, QComboBox, QLineEdit, QHBoxLayout,
      QVBoxLayout, QWidget, QPushButton, QSizePolicy, 
      QMenuBar, QMessageBox
)
from PySide6.QtGui import QAction
from gui.CustomWidgets.NavigationController import NavigationController
from gui.Pages.ViewRatingsPage import ViewRatingsPage
from gui.Pages.ResultsPage import ResultsPage
from ratings.RatingManager import RatingManager
from utils.APIManager import APIManager
from utils.content_helpers import parse_content_id
from gui.utils.load_stylesheet import load_stylesheet
from PySide6.QtWidgets import QApplication

class MainWindow(QMainWindow):
    def __init__(self):
        super().__init__()
        self.setWindowTitle("CritiQit")
        self.setMinimumSize(800, 600)
        self.resize(800, 600)

        # Initialize Rating API Manager and Navigation Controller
        self.api_manager = APIManager()
        self.rating_manager = RatingManager()
        self.nav_controller = NavigationController()

        # Set up main layout
        main_layout = QVBoxLayout()
        main_layout.setContentsMargins(0, 0, 0, 0)
        main_layout.setSpacing(0)

        # Add a menu bar
        self.menu_bar = self.create_menu_bar()
        self.setMenuBar(self.menu_bar)

        # Create the navigation bar
        nav_widget = self.create_navigation_bar()
        nav_widget.setObjectName("NavBar")
        nav_widget.setSizePolicy(QSizePolicy.Expanding, QSizePolicy.Fixed)
        load_stylesheet(nav_widget, 'gui/static/styles_nav.qss')
        main_layout.addWidget(nav_widget)

        # Create the content area
        self.content_area = QWidget()
        self.content_layout = QVBoxLayout()
        self.content_layout.setContentsMargins(0, 0, 0, 0)
        self.content_area.setLayout(self.content_layout)
        load_stylesheet(self.content_area, 'gui/static/styles_content_area.qss')


        # Add the content area to the main layout
        main_layout.addWidget(self.content_area)
        main_layout.setStretch(1, 1)

        # Set the central widget
        central_widget = QWidget()
        central_widget.setLayout(main_layout)
        self.setCentralWidget(central_widget)

        # Connect navigation signals
        self.nav_controller.current_widget_changed.connect(self.set_current_widget)

        # Initially show home page
        self.base_page = ViewRatingsPage(self.nav_controller, self.api_manager, self.rating_manager)
        self.nav_controller.reset(self.base_page)

    def create_menu_bar(self):
        menu_bar = QMenuBar()

        # File Menu
        file_menu = menu_bar.addMenu("File")

        # Button to Sync TMDB ratings
        # Sync TMDB Ratings
        sync_action = QAction("Sync TMDB Ratings", self)
        sync_action.triggered.connect(self.sync_tmdb_ratings)
        file_menu.addAction(sync_action)

        # Exit Action
        exit_action = QAction("Exit", self)
        exit_action.triggered.connect(self.close)
        file_menu.addAction(exit_action)

        return menu_bar

    def sync_tmdb_ratings(self):
        """
        Trigger the TMDB ratings sync process.
        """
        try:
            # Call your sync method from APIManager
            results = self.api_manager.import_all_tmdb_ratings(self.rating_manager)

            # Build a summary message
            summary = (
                f"Movies Imported: {results['movies']}\n"
                f"TV Shows Imported: {results['tv_shows']}\n"
                f"TV Episodes Imported: {results['tv_episodes']}\n"
                f"TV Seasons Added/Updated: {results.get('tv_seasons', 0)}"
            )
            QMessageBox.information(
                self, "Sync Complete", f"Successfully imported ratings:\n\n{summary}"
            )
            self.current_widget.refresh_page()
        except Exception as e:
            QMessageBox.critical(
                self, "Sync Failed", f"An error occurred during sync:\n{str(e)}"
            )

    def create_navigation_bar(self):
        nav_bar = QHBoxLayout()

        # Back Button
        self.back_button = QPushButton("<- Back")
        self.back_button.clicked.connect(self.go_back)
        nav_bar.addWidget(self.back_button)

        # Forward Button
        self.forward_button = QPushButton("Forward ->")
        self.forward_button.clicked.connect(self.go_forward)
        nav_bar.addWidget(self.forward_button)

        # Content Type Selector
        self.type_selector = QComboBox()
        self.type_selector.addItems(["TV Show", "Movie"])
        nav_bar.addWidget(self.type_selector)

        # Search Field
        self.search_field = QLineEdit()
        self.search_field.setPlaceholderText("Search...")
        self.search_field.returnPressed.connect(self.perform_search)
        nav_bar.addWidget(self.search_field)

        # Search Button
        search_button = QPushButton("Search")
        search_button.clicked.connect(self.perform_search)
        nav_bar.addWidget(search_button)

        # Ratings Button
        ratings_button = QPushButton("View Ratings")
        ratings_button.clicked.connect(self.view_ratings)
        nav_bar.addWidget(ratings_button)

        # Wrap QHBoxLayout in a QWidget
        nav_widget = QWidget()
        nav_widget.setLayout(nav_bar)
        return nav_widget

    def go_back(self):
        if self.nav_controller.can_go_back():
            self.nav_controller.pop()
            self.update_navigation_buttons()

    def go_forward(self):
        if self.nav_controller.can_go_forward():
            self.nav_controller.forward()
            self.update_navigation_buttons()

    def perform_search(self):
        query = self.search_field.text().strip()
        if not query:
            return
        is_movie = (self.type_selector.currentText().lower() == "movie")
        content_type = 'movie' if is_movie else 'tv'
        results = self.api_manager.get_search(query, content_type)
        results_page = ResultsPage(self.nav_controller, self.api_manager, self.rating_manager, results, is_movie)
        self.nav_controller.push(results_page)
        self.update_navigation_buttons()

    def set_current_widget(self, widget):
        # Clear the content layout and add the current widget
        for i in reversed(range(self.content_layout.count())):
            item = self.content_layout.takeAt(i)
            w = item.widget()
            if w:
                w.setParent(None)
        widget.setStyleSheet("border: 0px;")
        self.content_layout.addWidget(widget)
        widget.refresh_page()
        self.current_widget = widget

        # Update navigation buttons
        self.update_navigation_buttons()

    def update_navigation_buttons(self):
        """Enable or disable Back/Forward buttons based on navigation state."""
        self.back_button.setEnabled(self.nav_controller.can_go_back())
        self.forward_button.setEnabled(self.nav_controller.can_go_forward())

    def view_ratings(self):
        """
        Create and navigate to the ViewRatingsPage.
        """
        from gui.Pages.ViewRatingsPage import ViewRatingsPage
        ratings_page = ViewRatingsPage(self.nav_controller, self.api_manager, self.rating_manager)
        self.nav_controller.push(ratings_page)