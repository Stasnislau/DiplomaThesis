"""
Pytest configuration for BridgeMicroservice tests.
This file ensures that the project root is in the Python path.
"""
import sys
from pathlib import Path

# Add the BridgeMicroservice root to Python path
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))
