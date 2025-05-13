from PySide6.QtCore import QObject, Signal, QThreadPool, QRunnable, QByteArray, Slot, Qt
from PySide6.QtGui import QPixmap
import requests
import logging
import time
import os
import hashlib
from io import BytesIO

# Set up module-level logger
logger = logging.getLogger(__name__)

# Shared thread pool for image loading
_thread_pool = QThreadPool()
_thread_pool.setMaxThreadCount(8)  # Allow up to 8 concurrent downloads

# Path for disk cache
_CACHE_DIR = os.path.join(os.path.expanduser("~"), ".critiqit", "image_cache")

# Ensure cache directory exists
os.makedirs(_CACHE_DIR, exist_ok=True)

def _get_cache_path(url):
    """Generate a filesystem-safe path for caching a URL"""
    # Create a hash of the URL to use as filename
    url_hash = hashlib.md5(url.encode()).hexdigest()
    return os.path.join(_CACHE_DIR, f"{url_hash}.jpg")

class ImageLoaderSignals(QObject):
    """
    Signals for the ImageLoader
    """
    finished = Signal(str, QPixmap, float)  # url, pixmap, load_time
    error = Signal(str, str)  # url, error_message
    cache_hit = Signal(str, QPixmap, str, float)  # url, pixmap, cache_type, load_time

class ImageLoaderTask(QRunnable):
    """
    Thread task for loading an image asynchronously
    """
    def __init__(self, url, size=None):
        super().__init__()
        self.url = url
        self.size = size  # (width, height) tuple or None
        self.signals = ImageLoaderSignals()
    
    @Slot()
    def run(self):
        """
        Main task: Load image, either from cache or network
        """
        start_time = time.time()
        
        try:
            # 1. Check disk cache
            cache_path = _get_cache_path(self.url)
            if os.path.exists(cache_path):
                pixmap = QPixmap(cache_path)
                if not pixmap.isNull():
                    # Scale if needed
                    if self.size:
                        pixmap = pixmap.scaled(
                            self.size[0], self.size[1],
                            Qt.KeepAspectRatio,
                            Qt.SmoothTransformation
                        )
                    
                    load_time = time.time() - start_time
                    self.signals.cache_hit.emit(self.url, pixmap, "disk", load_time)
                    logger.debug(f"Image loaded from disk cache: {self.url} in {load_time:.3f}s")
                    return
            
            # 2. Download from network
            response = requests.get(self.url)
            if response.status_code != 200:
                err_msg = f"HTTP error: {response.status_code}"
                self.signals.error.emit(self.url, err_msg)
                logger.error(f"Image download error: {self.url} - {err_msg}")
                return
                
            # Process image
            image_data = BytesIO(response.content)
            pixmap = QPixmap()
            if not pixmap.loadFromData(image_data.getvalue()):
                err_msg = "Failed to decode image data"
                self.signals.error.emit(self.url, err_msg)
                logger.error(f"Image decode error: {self.url} - {err_msg}")
                return
                
            # Scale if needed
            if self.size:
                pixmap = pixmap.scaled(
                    self.size[0], self.size[1],
                    Qt.KeepAspectRatio, 
                    Qt.SmoothTransformation
                )
                
            # Save to disk cache
            try:
                original_pixmap = QPixmap()
                original_pixmap.loadFromData(image_data.getvalue())
                original_pixmap.save(cache_path, "JPEG", 90)
            except Exception as e:
                logger.warning(f"Failed to save to disk cache: {self.url} - {e}")
                
            # Return the pixmap
            load_time = time.time() - start_time
            self.signals.finished.emit(self.url, pixmap, load_time)
            logger.debug(f"Image downloaded: {self.url} in {load_time:.3f}s")
            
        except Exception as e:
            logger.error(f"Image loading error for {self.url}: {str(e)}")
            self.signals.error.emit(self.url, str(e))

class AsyncImageLoader:
    """
    Manages asynchronous image loading
    """
    # Keep instance alive while app is running
    _instance = None
    
    @classmethod
    def get_instance(cls):
        if cls._instance is None:
            cls._instance = AsyncImageLoader()
        return cls._instance
        
    def __init__(self):
        self.active_tasks = {}
    
    def load_image(self, url, size=None, on_finished=None, on_error=None, on_cache_hit=None):
        """
        Load an image asynchronously
        
        Args:
            url: Image URL to load
            size: Optional (width, height) tuple for scaling
            on_finished: Callback when image is loaded from network
            on_error: Callback when image loading fails
            on_cache_hit: Callback when image is loaded from cache
        """
        if not url:
            if on_error:
                on_error(url, "No URL provided")
            return
            
        # Create the task
        task = ImageLoaderTask(url, size)
        
        # Connect signals
        if on_finished:
            task.signals.finished.connect(on_finished)
        if on_error:
            task.signals.error.connect(on_error)
        if on_cache_hit:
            task.signals.cache_hit.connect(on_cache_hit)
            
        # Store and start the task
        self.active_tasks[url] = task
        _thread_pool.start(task)
        
    def cancel_all(self):
        """
        Cancel all pending image loading tasks
        """
        self.active_tasks.clear()
        # Note: QThreadPool doesn't support direct cancellation,
        # but future callbacks won't be processed once we clear references 