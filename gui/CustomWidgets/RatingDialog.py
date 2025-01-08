from PySide6.QtWidgets import (
    QDialog, QVBoxLayout, QLabel, QLineEdit, QPushButton, QFormLayout,
    QHBoxLayout, QComboBox, QFrame
)
from PySide6.QtCore import Qt
from ratings.Rating import PRESET_CATEGORIES, Rating

class RatingDialog(QDialog):
    def __init__(self, parent, rating_manager, content_id, content_type="movie"):
        super().__init__(parent)
        self.setWindowTitle(f"Rate {content_type.title()}")
        self.rating_manager = rating_manager
        self.content_id = content_id

        # Create a strategy, pass the pre-formatted content_id
        self.strategy = Rating(content_id)
        self.strategy.load_rating(rating_manager)

        main_layout = QVBoxLayout()

        # Single rating
        main_layout.addWidget(QLabel("<h3>Single Numeric Rating (Optional)</h3>", alignment=Qt.AlignLeft))
        self.one_score_edit = QLineEdit()
        if self.strategy.one_score is not None:
            self.one_score_edit.setText(str(self.strategy.one_score))
        self.one_score_edit.setPlaceholderText("Enter a single rating (like 8.5)")
        main_layout.addWidget(self.one_score_edit)

        # -------------- Category Section --------------
        category_section_label = QLabel("<h3>Category Ratings (Optional)</h3>")
        main_layout.addWidget(category_section_label)

        # Preset loader
        preset_layout = QHBoxLayout()
        self.preset_combo = QComboBox()
        self.preset_combo.addItems(["Select Preset..."] + list(PRESET_CATEGORIES.keys()))
        preset_layout.addWidget(self.preset_combo)

        load_preset_btn = QPushButton("Load Preset")
        load_preset_btn.clicked.connect(self.load_preset_categories)
        preset_layout.addWidget(load_preset_btn)

        add_cat_btn = QPushButton("Add Category")
        add_cat_btn.clicked.connect(self.add_category_row)
        preset_layout.addWidget(add_cat_btn)

        main_layout.addLayout(preset_layout)

        # Form layout for categories
        self.form_layout = QFormLayout()
        main_layout.addLayout(self.form_layout)

        # Build existing categories from the strategy (if any)
        self.category_rows = [] # store references to each row’s widgets
        for cat_key, (label, val, weight) in self.strategy.categories.items():
            self.add_category_row(label, val, weight)

        # Buttons
        save_button = QPushButton("Save")
        save_button.clicked.connect(self.on_save)
        main_layout.addWidget(save_button)

        cancel_button = QPushButton("Cancel")
        cancel_button.clicked.connect(self.reject)
        main_layout.addWidget(cancel_button)

        self.setLayout(main_layout)

    def add_category_row(self, label=None, val=None, weight=None):
        """
        Create a single row in self.form_layout to represent one category.
        """
        label = label or "New Category"
        val = val if (val is not None) else ""
        weight = weight if (weight is not None) else 1

        # Label field
        label_edit = QLineEdit(str(label))
        label_edit.setPlaceholderText("Category Label")

        # Value field
        val_edit = QLineEdit(str(val) if val != "" else "")
        val_edit.setPlaceholderText("Score (e.g. 8.5)")
        val_edit.setFixedWidth(80)

        # Weight field
        weight_edit = QLineEdit(str(weight))
        weight_edit.setPlaceholderText("Weight")
        weight_edit.setFixedWidth(50)

        # Remove button
        remove_btn = QPushButton("X")
        remove_btn.setFixedWidth(30)

        # A horizontal container for the fields
        row_widget = QFrame()
        row_layout = QHBoxLayout(row_widget)
        row_layout.setContentsMargins(0,0,0,0)
        row_layout.setSpacing(5)
        row_layout.addWidget(label_edit)
        row_layout.addWidget(val_edit)
        row_layout.addWidget(weight_edit)
        row_layout.addWidget(remove_btn)

        # Insert into form layout
        self.form_layout.addRow(row_widget)

        # Store references
        self.category_rows.append((row_widget, label_edit, val_edit, weight_edit, remove_btn))

        remove_btn.clicked.connect(lambda: self.remove_category_row(row_widget))

    def remove_category_row(self, row_widget):
        """
        Remove the row from self.form_layout and from self.category_rows.
        """
        row_index = None
        for i, (w, _, _, _, _) in enumerate(self.category_rows):
            if w == row_widget:
                row_index = i
                break

        if row_index is not None:
            # remove from self.category_rows
            self.category_rows.pop(row_index)

            # remove the row from the layout
            row_layout_index = self.form_layout.indexOf(row_widget)
            if row_layout_index != -1:
                self.form_layout.removeRow(row_layout_index)

    def load_preset_categories(self):
        """
        Load categories from a preset (selected in self.preset_combo).
        Clears existing category rows, then populates from the chosen preset.
        """
        preset_key = self.preset_combo.currentText()
        if preset_key not in PRESET_CATEGORIES:
            return

        # Clear existing category rows
        for (w, _, _, _, _) in self.category_rows:
            self.form_layout.removeWidget(w)
            w.deleteLater()
        self.category_rows.clear()

        # Load from preset
        for (cat_label, cat_val, cat_weight) in PRESET_CATEGORIES[preset_key]:
            self.add_category_row(cat_label, cat_val, cat_weight)

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

        # Build categories from UI
        new_categories = {}
        for (row_widget, label_edit, val_edit, weight_edit, remove_btn) in self.category_rows:
            cat_label = label_edit.text().strip()
            val_str = val_edit.text().strip()
            w_str = weight_edit.text().strip()
            try:
                cat_val = float(val_str) if val_str else None
            except ValueError:
                cat_val = None

            try:
                cat_weight = float(w_str) if w_str else 1
            except ValueError:
                cat_weight = 1

            # Format key for categories dict
            cat_key = cat_label.lower().replace(" ", "_")
            new_categories[cat_key] = [cat_label, cat_val, cat_weight]

        self.strategy.categories = new_categories

        self.strategy.save_rating(self.rating_manager)
        self.accept()