# gui/utils/load_stylesheet.py

def load_stylesheet(app, file_path):
    with open(file_path, 'r') as f:
        app.setStyleSheet(f.read())