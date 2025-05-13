# gui/Pages/ViewRatingsPage.py

from PySide6.QtWidgets import (
    QVBoxLayout, QLabel, QScrollArea, QWidget, QPushButton, 
    QHBoxLayout, QSpacerItem, QSizePolicy
)
from PySide6.QtCore import Qt
from gui.Pages.BasePage import BasePage
from gui.CustomWidgets.RatingDialog import RatingDialog
from gui.CustomWidgets.RatingsCarousel import RatingsCarousel
from gui.Pages.AllRatingsPage import AllRatingsPage
from utils.APIManager import parse_content_id
import logging

class ViewRatingsPage(BasePage):
    """
    Main page displaying carousels of user ratings for movies and TV shows.
    Shows top-rated items with images and provides navigation to detailed views.
    """
    def __init__(self, navigation_controller, api_manager, rating_manager):
        super().__init__()
        self.nav = navigation_controller
        self.api_manager = api_manager
        self.rating_manager = rating_manager
        
        self.setup_ui()
        
    def setup_ui(self):
        """Set up the user interface with scrollable content area and carousels"""
        # Main layout with scrollable area
        main_layout = QVBoxLayout(self)
        main_layout.setContentsMargins(0, 0, 0, 0)
        main_layout.setSpacing(0)
        
        # Create a scroll area for the content
        scroll_area = QScrollArea()
        scroll_area.setWidgetResizable(True)
        scroll_area.setHorizontalScrollBarPolicy(Qt.ScrollBarAlwaysOff)
        scroll_area.setVerticalScrollBarPolicy(Qt.ScrollBarAsNeeded)
        main_layout.addWidget(scroll_area)
        
        # Container widget for the scroll area
        content_widget = QWidget()
        self.content_layout = QVBoxLayout(content_widget)
        self.content_layout.setContentsMargins(20, 20, 20, 20)
        self.content_layout.setSpacing(30)
        scroll_area.setWidget(content_widget)
        
        # Header
        header_label = QLabel("<h1>Your Ratings</h1>")
        self.content_layout.addWidget(header_label)
        
        # Movies carousel
        self.movies_carousel = RatingsCarousel("Your Movie Ratings", "movie")
        self.movies_carousel.item_clicked.connect(self.navigate_to_content)
        self.movies_carousel.view_all_clicked.connect(self.view_all_ratings)
        self.content_layout.addWidget(self.movies_carousel)
        
        # TV Shows carousel
        self.tv_carousel = RatingsCarousel("Your TV Show Ratings", "tv")
        self.tv_carousel.item_clicked.connect(self.navigate_to_content)
        self.tv_carousel.view_all_clicked.connect(self.view_all_ratings)
        self.content_layout.addWidget(self.tv_carousel)
        
        # Add a refresh button at the bottom
        refresh_btn = QPushButton("Refresh Ratings")
        refresh_btn.clicked.connect(self.refresh_page)
        self.content_layout.addWidget(refresh_btn, alignment=Qt.AlignCenter)
        
        # Add spacer at the bottom
        self.content_layout.addSpacerItem(QSpacerItem(20, 40, QSizePolicy.Minimum, QSizePolicy.Expanding))
    
    def refresh_page(self):
        """Load and display ratings in the carousels"""
        try:
            # Clear carousels
            self.movies_carousel.clear()
            self.tv_carousel.clear()
            
            # Load movie ratings
            movie_ratings = self.rating_manager.get_all_ratings("movie")
            
            # Sort by rating (highest first)
            movie_ratings.sort(key=lambda x: x.get("effective_rating", 0) or 0, reverse=True)
            
            # Add top 8 movie ratings to carousel
            for idx, rating_data in enumerate(movie_ratings[:8]):
                content_id = rating_data["content_id"]
                parsed = parse_content_id(content_id)
                rating_value = rating_data["effective_rating"]
                
                # Get movie details from API
                movie_details = self.api_manager.get_content_details(content_id)
                if movie_details:
                    # Format the title properly
                    title = movie_details.get("title", "Unknown")
                    
                    # Get poster path for image
                    poster_path = movie_details.get("poster_path")
                    image_url = None
                    if poster_path:
                        image_url = self.api_manager.get_image_url(poster_path, size="w185")
                    
                    # Use stored title if available
                    display_title = rating_data.get("title") or title
                    
                    self.movies_carousel.add_item(content_id, display_title, rating_value, image_url)
            
            # Load TV ratings
            tv_ratings = self.rating_manager.get_all_ratings("tv")
            
            # Filter out seasons and episodes, only include shows for the carousel
            tv_show_ratings = []
            for rating in tv_ratings:
                content_id = rating["content_id"]
                parsed = parse_content_id(content_id)
                if parsed["season_number"] is None and parsed["episode_number"] is None:
                    tv_show_ratings.append(rating)
            
            # Sort by rating (highest first)
            tv_show_ratings.sort(key=lambda x: x.get("effective_rating", 0) or 0, reverse=True)
            
            # Add top 8 TV show ratings to carousel
            for idx, rating_data in enumerate(tv_show_ratings[:8]):
                content_id = rating_data["content_id"]
                parsed = parse_content_id(content_id)
                rating_value = rating_data["effective_rating"]
                
                # Get show details from API
                show_details = self.api_manager.get_content_details(content_id)
                if show_details:
                    # Format the title properly
                    show_name = show_details.get("name", "Unknown")
                    
                    # For top-level TV shows, we can add the year if available
                    if "first_air_date" in show_details and show_details["first_air_date"]:
                        try:
                            year = show_details["first_air_date"][:4]
                            title = f"{show_name} ({year})"
                        except:
                            title = show_name
                    else:
                        title = show_name
                    
                    # Get poster path for image
                    poster_path = show_details.get("poster_path")
                    image_url = None
                    if poster_path:
                        image_url = self.api_manager.get_image_url(poster_path, size="w185")
                    
                    # Use stored title if available
                    display_title = rating_data.get("title") or title
                    
                    self.tv_carousel.add_item(content_id, display_title, rating_value, image_url)
        except Exception as e:
            logging.error(f"Error refreshing ratings: {e}")
    
    def navigate_to_content(self, content_id):
        """Navigate to the appropriate content details page"""
        try:
            parsed = parse_content_id(content_id)
            
            # Get content details using the universal method
            content_details = self.api_manager.get_content_details(content_id)
            if not content_details:
                logging.warning(f"Could not fetch content details for {content_id}")
                return  # If we can't get details, don't navigate
            
            if parsed["type"] == "movie":
                from gui.Pages.MovieDetailsPage import MovieDetailsPage
                movie_page = MovieDetailsPage(self.nav, self.api_manager, self.rating_manager, content_details)
                self.nav.push(movie_page)
            elif parsed["type"] == "tv":
                # Navigate to show details page
                from gui.Pages.ShowDetailsPage import ShowDetailsPage
                show_page = ShowDetailsPage(self.nav, self.api_manager, self.rating_manager, content_details)
                self.nav.push(show_page)
        except Exception as e:
            logging.error(f"Error navigating to content {content_id}: {e}")
    
    def view_all_ratings(self, content_type):
        """Navigate to the all ratings page for the specified content type"""
        try:
            all_ratings_page = AllRatingsPage(self.nav, self.api_manager, self.rating_manager, content_type)
            self.nav.push(all_ratings_page)
        except Exception as e:
            logging.error(f"Error viewing all ratings for {content_type}: {e}") 