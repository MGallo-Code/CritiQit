# Add logging configuration at the beginning
import logging
import sys
import os

# Create logs directory if it doesn't exist
if not os.path.exists("logs"):
    os.makedirs("logs")

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    handlers=[
        logging.FileHandler("logs/critiqit.log"),
        logging.StreamHandler(sys.stdout)
    ]
)

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