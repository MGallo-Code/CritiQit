# gui/MainContent/ResultsPage.py
from PySide6.QtWidgets import (
    QWidget, QVBoxLayout, QLabel, QScrollArea, QPushButton
)
from PySide6.QtGui import QPixmap, QIcon
from PySide6.QtCore import QSize, QThread
import requests

from gui.MainContent.MovieDetailsPage import MovieDetailsPage
from gui.MainContent.ShowDetailsPage import ShowDetailsPage
from gui.utils.AsyncImageWorker import AsyncImageWorker

class ResultsPage(QWidget):
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

        # Keep references to buttons in a dict: { poster_path: btn }
        # so we can update icons asynchronously.
        self.poster_buttons = {}

        # Build the UI for each result
        for i, result in enumerate(self.results):
            poster_path = result.get('poster_path') # e.g. "/4edF..."
            btn = self.create_result_button(result, poster_path)
            self.results_layout.addWidget(btn)

            if poster_path:
                self.load_poster_async(poster_path)

        self.results_layout.addStretch()
        scroll_content.setLayout(self.results_layout)
        scroll_area.setWidget(scroll_content)
        layout.addWidget(scroll_area)

    def create_result_button(self, result, poster_path):
        """
        Create a QPushButton with left-aligned text for either movie or show.
        We'll set the icon later (sync or async).
        """
        if self.is_movie:
            title = result.get('title', 'Unknown Title')
            date = result.get('release_date', 'Unknown Date')
            text = f"{title} ({date})"
            clicked_fn = lambda _, r=result: self.show_movie_details(r)
        else:
            name = result.get('name', 'Unknown Name')
            date = result.get('first_air_date', 'Unknown Date')
            text = f"{name} ({date})"
            clicked_fn = lambda _, r=result: self.show_tv_details(r)

        btn = QPushButton(text)
        btn.clicked.connect(clicked_fn)
        # Left-align text
        btn.setStyleSheet("text-align: left;")
        # Store reference so we can set icon later
        if poster_path:
            self.poster_buttons[poster_path] = btn

        return btn

    def load_poster_async(self, poster_path):
        """
        Create a QThread + AsyncImageWorker to fetch a poster in the background.
        """
        base_url = "https://image.tmdb.org/t/p/w154"
        url = f"{base_url}{poster_path}"

        # Worker in new thread
        thread = QThread(self)
        worker = AsyncImageWorker(url, poster_path)
        worker.moveToThread(thread)

        worker.finished.connect(self.on_async_poster_finished)
        worker.error.connect(self.on_async_poster_error)
        thread.started.connect(worker.run)
        # When the worker finishes or errors, we quit and delete the thread
        worker.finished.connect(lambda *_: thread.quit())
        worker.finished.connect(lambda *_: worker.deleteLater())
        worker.error.connect(lambda *_: thread.quit())
        worker.error.connect(lambda *_: worker.deleteLater())

        thread.finished.connect(thread.deleteLater)

        thread.start()

    def on_async_poster_finished(self, pixmap, poster_path):
        """
        Called when the worker has successfully fetched an image. 
        Set it as an icon on the associated button.
        """
        btn = self.poster_buttons.get(poster_path)
        if btn:
            btn.setIcon(QIcon(pixmap))
            btn.setIconSize(QSize(60, 90))

    def on_async_poster_error(self, err_msg, poster_path):
        """
        Handle any error from the worker. Optionally show a placeholder or log it.
        """
        print(f"Async image error for {poster_path}: {err_msg}")

    def show_movie_details(self, movie):
        page = MovieDetailsPage(self.nav, self.api_manager, self.rating_manager, movie)
        self.nav.push(page)

    def show_tv_details(self, tv_show):
        show_id = "tv:" + str(tv_show.get('id'))
        detailed_show = self.api_manager.get_content_details(show_id)
        page = ShowDetailsPage(self.nav, self.api_manager, self.rating_manager, detailed_show)
        self.nav.push(page)