from PySide6.QtWidgets import (
    QVBoxLayout, QLabel, QScrollArea, QWidget, QPushButton, 
    QHBoxLayout, QTableWidget, QTableWidgetItem, QHeaderView, QMessageBox
)
from PySide6.QtCore import Qt
from gui.Pages.BasePage import BasePage
from gui.CustomWidgets.RatingDialog import RatingDialog
from utils.APIManager import parse_content_id
import logging

class AllRatingsPage(BasePage):
    """
    Page to display all ratings of a specific type (movie or TV) in a table format.
    Allows viewing, editing and deleting individual ratings.
    """
    def __init__(self, navigation_controller, api_manager, rating_manager, content_type):
        """
        Initialize the AllRatingsPage.
        
        Args:
            navigation_controller: NavigationController for page navigation
            api_manager: APIManager for TMDB API interactions
            rating_manager: RatingManager for rating data storage/retrieval
            content_type: 'movie' or 'tv' to filter ratings
        """
        super().__init__()
        self.nav = navigation_controller
        self.api_manager = api_manager
        self.rating_manager = rating_manager
        self.content_type = content_type
        
        self.setup_ui()
        
    def setup_ui(self):
        """Set up the user interface with table of ratings"""
        main_layout = QVBoxLayout(self)
        main_layout.setContentsMargins(10, 10, 10, 10)
        
        # Header with back button
        header_layout = QHBoxLayout()
        
        back_button = QPushButton("← Back")
        back_button.clicked.connect(self.nav.pop)
        header_layout.addWidget(back_button)
        
        # Title
        type_name = "Movies" if self.content_type == "movie" else "TV Shows"
        title_label = QLabel(f"<h1>All Your {type_name} Ratings</h1>")
        header_layout.addWidget(title_label)
        
        header_layout.addStretch()
        main_layout.addLayout(header_layout)
        
        # Table for ratings
        self.ratings_table = QTableWidget()
        self.ratings_table.setColumnCount(4)
        self.ratings_table.setHorizontalHeaderLabels(["Title", "Rating", "Rating Type", "Actions"])
        self.ratings_table.horizontalHeader().setSectionResizeMode(0, QHeaderView.Stretch)
        self.ratings_table.horizontalHeader().setSectionResizeMode(1, QHeaderView.ResizeToContents)
        self.ratings_table.horizontalHeader().setSectionResizeMode(2, QHeaderView.ResizeToContents)
        self.ratings_table.horizontalHeader().setSectionResizeMode(3, QHeaderView.ResizeToContents)
        main_layout.addWidget(self.ratings_table)
        
    def refresh_page(self):
        """Load and display all ratings of the specified content type"""
        try:
            # Get ratings of the specified type
            ratings = self.rating_manager.get_all_ratings(self.content_type)
            
            # Sort by rating (highest first)
            ratings.sort(key=lambda x: x.get("effective_rating", 0) or 0, reverse=True)
            
            # Clear table
            self.ratings_table.setRowCount(0)
            
            # Populate table
            for row_idx, rating_data in enumerate(ratings):
                content_id = rating_data["content_id"]
                parsed = parse_content_id(content_id)
                
                # Get content details from API manager
                title = content_id  # Default if content details not available
                content_details = self.api_manager.get_content_details(content_id)
                
                if content_details:
                    if parsed["type"] == "movie":
                        title = content_details.get("title", content_id)
                    elif parsed["type"] == "tv":
                        if parsed["episode_number"] is not None:
                            # Episode
                            show_details = self.api_manager.get_tv_details(parsed["show_id"])
                            if show_details and content_details:
                                # Use the API manager's formatter for consistent titles
                                title = self.api_manager.format_episode_title(show_details, content_details)
                            else:
                                # Fallback if we couldn't get both details
                                season_num = parsed["season_number"]
                                episode_num = parsed["episode_number"]
                                title = f"Episode S{season_num}E{episode_num}"
                        elif parsed["season_number"] is not None:
                            # Season
                            show_details = self.api_manager.get_tv_details(parsed["show_id"])
                            if show_details and content_details:
                                # Use the API manager's formatter for consistent titles
                                title = self.api_manager.format_season_title(show_details, content_details)
                            else:
                                # Fallback if we couldn't get both details
                                season_num = parsed["season_number"]
                                title = f"Season {season_num}"
                        else:
                            # Show
                            title = content_details.get("name", content_id)
                
                self.ratings_table.insertRow(row_idx)
                
                # Rating value
                rating_value = rating_data["effective_rating"]
                rating_value_text = f"{rating_value:.1f}" if rating_value is not None else "Not rated"
                
                # Rating type
                rating_type = rating_data["preferred_strategy"] or "default"
                if rating_type == "one_score":
                    rating_type_text = "Single Score"
                elif rating_type == "category_aggregate":
                    rating_type_text = "Categories"
                elif rating_type == "aggregate_rating":
                    rating_type_text = "Aggregate"
                else:
                    rating_type_text = "Default"
                
                # Add data to cells
                self.ratings_table.setItem(row_idx, 0, QTableWidgetItem(title))
                self.ratings_table.setItem(row_idx, 1, QTableWidgetItem(rating_value_text))
                self.ratings_table.setItem(row_idx, 2, QTableWidgetItem(rating_type_text))
                
                # Actions cell
                actions_widget = QWidget()
                actions_layout = QHBoxLayout(actions_widget)
                actions_layout.setContentsMargins(2, 2, 2, 2)
                
                view_btn = QPushButton("View")
                view_btn.setProperty("content_id", content_id)
                view_btn.clicked.connect(self.view_content)
                
                edit_btn = QPushButton("Edit")
                edit_btn.setProperty("content_id", content_id)
                edit_btn.clicked.connect(self.edit_rating)
                
                delete_btn = QPushButton("Delete")
                delete_btn.setProperty("content_id", content_id)
                delete_btn.clicked.connect(self.delete_rating)
                
                actions_layout.addWidget(view_btn)
                actions_layout.addWidget(edit_btn)
                actions_layout.addWidget(delete_btn)
                
                self.ratings_table.setCellWidget(row_idx, 3, actions_widget)
        except Exception as e:
            logging.error(f"Error refreshing ratings table: {e}")
    
    def view_content(self):
        """Navigate to content details page"""
        try:
            content_id = self.sender().property("content_id")
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
                if parsed["episode_number"] is not None:
                    # Navigate to episode details
                    from gui.Pages.EpisodeDetailsPage import EpisodeDetailsPage
                    # We need both show details and episode details
                    show_details = self.api_manager.get_tv_details(parsed["show_id"])
                    if show_details:
                        # EpisodeDetailsPage only takes 5 parameters:
                        # (navigation_controller, api_manager, rating_manager, show, episode)
                        episode_page = EpisodeDetailsPage(
                            self.nav,
                            self.api_manager,
                            self.rating_manager,
                            show_details,
                            content_details  # This already has the episode details
                        )
                        self.nav.push(episode_page)
                elif parsed["season_number"] is not None:
                    # Navigate to season details
                    from gui.Pages.SeasonDetailsPage import SeasonDetailsPage
                    # We need show details as well as season details
                    show_details = self.api_manager.get_tv_details(parsed["show_id"])
                    if show_details:
                        # SeasonDetailsPage only takes 5 parameters:
                        # (navigation_controller, api_manager, rating_manager, show, season_details)
                        season_page = SeasonDetailsPage(
                            self.nav,
                            self.api_manager,
                            self.rating_manager,
                            show_details,
                            content_details  # This already has the season details
                        )
                        self.nav.push(season_page)
                else:
                    # Navigate to show details (content_details is already the show details)
                    from gui.Pages.ShowDetailsPage import ShowDetailsPage
                    show_page = ShowDetailsPage(
                        self.nav,
                        self.api_manager,
                        self.rating_manager,
                        content_details
                    )
                    self.nav.push(show_page)
        except Exception as e:
            logging.error(f"Error viewing content {content_id}: {e}")
    
    def edit_rating(self):
        """Open the rating dialog to edit a rating"""
        try:
            content_id = self.sender().property("content_id")
            
            dialog = RatingDialog(
                parent=self,
                rating_manager=self.rating_manager,
                content_id=content_id
            )
            
            if dialog.exec():
                self.refresh_page()
        except Exception as e:
            logging.error(f"Error editing rating for {content_id}: {e}")
    
    def delete_rating(self):
        """Delete a rating after confirmation"""
        try:
            content_id = self.sender().property("content_id")
            
            confirm = QMessageBox.question(
                self,
                "Confirm Deletion",
                "Are you sure you want to delete this rating?",
                QMessageBox.Yes | QMessageBox.No,
                QMessageBox.No
            )
            
            if confirm == QMessageBox.Yes:
                self.rating_manager.delete_rating_data(content_id)
                self.refresh_page()
        except Exception as e:
            logging.error(f"Error deleting rating for {content_id}: {e}") 