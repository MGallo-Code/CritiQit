# gui/BasePage.py
from PySide6.QtWidgets import QWidget

class BasePage(QWidget):
    """
    Base class for all sub-window pages.
    Contains refresh_page() method to be called when the page is shown
    by navigation controller.
    """
    def __init__(self, parent=None):
        super().__init__(parent)

    def refresh_page(self):
        """
        Refresh or re-fetch data as needed.
        Default is to do nothing, override in subclass.
        """
        pass