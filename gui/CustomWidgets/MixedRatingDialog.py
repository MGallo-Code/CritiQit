# gui/RatingWidgets/MixedRatingDialog.py

from PySide6.QtWidgets import QDialog, QVBoxLayout, QLabel, QLineEdit, QPushButton, QFormLayout
from PySide6.QtCore import Qt
from ratings.MixedRatingStrategy import MixedRatingStrategy

class MixedRatingDialog(QDialog):
    def __init__(self, parent, rating_manager, content_id, content_type="movie"):
        super().__init__(parent)
        self.setWindowTitle(f"Rate {content_type.title()}")
        self.rating_manager = rating_manager
        self.content_id = content_id

        # Create a strategy, pass the pre-formatted content_id
        self.strategy = MixedRatingStrategy(content_id)
        self.strategy.load_rating(rating_manager)

        main_layout = QVBoxLayout()

        # Single rating
        main_layout.addWidget(QLabel("<h3>Single Numeric Rating (Optional)</h3>", alignment=Qt.AlignLeft))
        self.one_score_edit = QLineEdit()
        if self.strategy.one_score is not None:
            self.one_score_edit.setText(str(self.strategy.one_score))
        self.one_score_edit.setPlaceholderText("Enter a single rating (like 8.5)")
        main_layout.addWidget(self.one_score_edit)

        # Category fields
        main_layout.addWidget(QLabel("<h3>Category Ratings (Optional)</h3>"))
        self.category_edits = {}
        self.form_layout = QFormLayout()
        for cat_key, info in self.strategy.categories.items():
            label = info[0]
            edit = QLineEdit()
            if info[1] is not None:
                edit.setText(str(info[1]))
            edit.setPlaceholderText("Leave blank to skip")
            self.category_edits[cat_key] = edit
            self.form_layout.addRow(QLabel(label), edit)
        main_layout.addLayout(self.form_layout)

        # Buttons
        save_button = QPushButton("Save")
        save_button.clicked.connect(self.on_save)
        main_layout.addWidget(save_button)

        cancel_button = QPushButton("Cancel")
        cancel_button.clicked.connect(self.reject)
        main_layout.addWidget(cancel_button)

        self.setLayout(main_layout)

    def on_save(self):
        # Single rating
        text = self.one_score_edit.text().strip()
        if text:
            try:
                self.strategy.one_score = float(text)
            except ValueError:
                print("Invalid single rating input.")
        else:
            self.strategy.one_score = None

        # Categories
        for cat_key, edit in self.category_edits.items():
            val = edit.text().strip()
            if val:
                try:
                    self.strategy.categories[cat_key][1] = float(val)
                except ValueError:
                    pass
            else:
                self.strategy.categories[cat_key][1] = None

        self.strategy.save_rating(self.rating_manager)
        self.accept()