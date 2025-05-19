# gui/utils/AsyncImageWorker.py

import requests
from PySide6.QtCore import QObject, Signal, Slot
from PySide6.QtGui import QPixmap


class AsyncImageWorker(QObject):
    """
    Downloads an image in a separate thread. Once done, emits finished(pixmap).
    """
    finished = Signal(QPixmap, str)   # (pixmap, poster_path) on success
    error = Signal(str, str)         # (error_msg, poster_path) on error

    def __init__(self, poster_url, poster_path):
        super().__init__()
        self.poster_url = poster_url
        self.poster_path = poster_path

    @Slot()
    def run(self):
        """
        Do the download. Then emit finished(...) or error(...).
        """
        try:
            response = requests.get(self.poster_url)
            response.raise_for_status()
            pixmap = QPixmap()
            if not pixmap.loadFromData(response.content):
                self.error.emit("Failed to load image data.", self.poster_path)
                return
            self.finished.emit(pixmap, self.poster_path)
        except Exception as e:
            self.error.emit(str(e), self.poster_path)