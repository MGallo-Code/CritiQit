# gui/RatingWidgets/RatingWidget.py
from PySide6.QtWidgets import (
    QWidget, QVBoxLayout, QLabel, QPushButton, QMessageBox
)

from gui.CustomWidgets.RatingDialog import RatingDialog
from ratings.Rating import Rating
from utils.APIManager import parse_content_id

class RatingWidget(QWidget):
    """
    A reusable widget that displays + manages a MixedRatingStrategy rating 
    for a pre-formatted content_id (e.g. "tv:12345-S2").
    """

    def __init__(
        self,
        parent,
        rating_manager,
        content_id,
        title_text="Rate this Content"
    ):
        super().__init__(parent)
        self.rating_manager = rating_manager
        self.content_id = content_id
        self.title_text = title_text

        layout = QVBoxLayout(self)

        # Display user rating or "not rated"
        self.user_rating_label = QLabel()
        self.user_rating_label.setWordWrap(True)
        layout.addWidget(self.user_rating_label)

        # "Rate" Button -> opens MixedRatingDialog
        self.rate_button = QPushButton(self.title_text)
        self.rate_button.clicked.connect(self.open_rating_dialog)
        layout.addWidget(self.rate_button)

        # Remove Rating Button
        self.remove_rating_button = QPushButton("Remove Rating")
        self.remove_rating_button.clicked.connect(self.remove_rating)
        layout.addWidget(self.remove_rating_button)

        self.refresh_content()

    def refresh_content(self):
        """
        Load the MixedRatingStrategy from rating_manager, then update the label.
        """
        rating = Rating(self.content_id)
        rating.load_rating(self.rating_manager)

        overall = rating.get_overall_rating()
        # Check if no  rating
        if overall is None:
            self.user_rating_label.setText("You haven't rated this content yet.")
            self.remove_rating_button.setVisible(False)
        else:
            lines = []
            parsed = parse_content_id(self.content_id)
            # Only show aggregated rating if it's a TV Show or TV season
            if parsed.get("type") == "tv" and parsed.get("episode_number") is None:
                lines.append(f"Aggregated Rating: {rating.aggregate_rating} (Calculated from seasons/episodes)")
            if rating.one_score:
                lines.append(f"Solo Rating: {rating.one_score} (Single Score)")
            # Category breakdown
            if rating.categories:
                if rating.category_aggregate:
                    lines.append(f"Overall Rating: {rating.category_aggregate} (Calculated from categories)")
                any_category = False
                for cat_key, info in rating.categories.items():
                    name, value, weight = info
                    if value is not None:
                        any_category = True
                        lines.append(f"{name}: {value} (Weight {weight}x)")
                if not any_category:
                    lines.append("No category scores have been entered yet.")

            self.user_rating_label.setText("\n".join(lines))
            self.remove_rating_button.setVisible(True)

    def open_rating_dialog(self):
        dialog = RatingDialog(
            parent=self,
            rating_manager=self.rating_manager,
            content_id=self.content_id,
        )
        if dialog.exec():
            self.refresh_content()

    def remove_rating(self):
        confirm = QMessageBox.question(
            self,
            "Confirm Removal",
            "Are you sure you want to remove this rating?",
            QMessageBox.Yes | QMessageBox.No
        )
        if confirm == QMessageBox.Yes:
            rating = Rating(self.content_id)
            rating.remove_rating(self.rating_manager)
            self.refresh_content()