# Add logging configuration at the beginning
import logging
import sys
import os
from logging.handlers import RotatingFileHandler

# Create logs directory if it doesn't exist
if not os.path.exists("logs"):
    os.makedirs("logs")

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    handlers=[
        # Use RotatingFileHandler instead of FileHandler
        # This will create a new log file when the current one reaches 1MB
        # and keep a maximum of 3 backup files
        RotatingFileHandler(
            "logs/critiqit.log", 
            maxBytes=1024*1024,  # 1MB
            backupCount=3,
            encoding='utf-8'
        ),
        logging.StreamHandler(sys.stdout)
    ]
)

# Log application startup
logging.info("CritiQit starting")

# Clear image cache on startup
from utils.clear_image_cache import clear_cache
success, message = clear_cache()
logging.info(f"Image cache status: {message}")

# Import application modules
from PySide6.QtWidgets import QApplication
from gui.MainWindow import MainWindow
from PySide6.QtCore import Qt

if __name__ == "__main__":
    # Create the application
    app = QApplication(sys.argv)
    
    # Create and show the main window
    window = MainWindow()
    window.show()
    
    # Start the event loop
    sys.exit(app.exec())