#!/bin/bash

# setup.sh
# On Mac/Linux, this script creates a new virtual environment, installs dependencies, and activates the virtual environment.

VENV_DIR=".venv"

# Function to delete any existing virtual environment
delete_venv() {
    if [ -d "$VENV_DIR" ]; then
        echo "Removing existing virtual environment..."
        rm -rf "$VENV_DIR"
    fi
}

# Function to create a new virtual environment
create_venv() {
    echo "Creating new virtual environment..."
    python3 -m venv $VENV_DIR
}

# Function to activate the virtual environment and install dependencies
install_dependencies() {
    echo "Activating virtual environment..."
    source $VENV_DIR/bin/activate

    echo "Upgrading pip..."
    pip install --upgrade pip

    echo "Installing dependencies..."
    pip install -r requirements.txt
}

# Main script
delete_venv
create_venv
install_dependencies

echo "Setup complete! You are now in your new virtual environment."