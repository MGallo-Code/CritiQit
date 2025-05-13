#!/usr/bin/env python3
"""
Utility script to clear the image cache used by CritiQit
"""

import os
import shutil
import argparse
import sys
from pathlib import Path

def get_cache_dir():
    """Return the path to the image cache directory"""
    return os.path.join(os.path.expanduser("~"), ".critiqit", "image_cache")

def clear_cache(verbose=True):
    """
    Clear the image cache directory.
    Returns tuple of (success, message)
    """
    cache_dir = get_cache_dir()
    
    if not os.path.exists(cache_dir):
        return True, f"Cache directory not found at {cache_dir}"
    
    try:
        # Count files before deletion
        file_count = sum(1 for _ in Path(cache_dir).glob('*'))
        
        # Remove directory and recreate it
        shutil.rmtree(cache_dir)
        os.makedirs(cache_dir, exist_ok=True)
        
        return True, f"Successfully cleared {file_count} cached images from {cache_dir}"
    except Exception as e:
        return False, f"Error clearing cache: {str(e)}"

def main():
    parser = argparse.ArgumentParser(description="Clear CritiQit image cache")
    parser.add_argument("-q", "--quiet", action="store_true", 
                       help="Don't print anything to the console")
    args = parser.parse_args()
    
    success, msg = clear_cache(verbose=not args.quiet)
    
    if not args.quiet:
        print(msg)
    
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main()) 