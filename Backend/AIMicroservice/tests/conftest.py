"""
Pytest configuration for AIMicroservice tests.
This file ensures that the project root is in the Python path
and stubs GCP credentials when they are absent (CI).
"""
import os
import sys
from pathlib import Path
from unittest.mock import MagicMock, patch

project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))


def _has_real_gcp_creds() -> bool:
    if os.getenv("GOOGLE_APPLICATION_CREDENTIALS"):
        return True
    try:
        import google.auth
        google.auth.default()
        return True
    except Exception:
        return False


if not _has_real_gcp_creds():
    _cred_mock = MagicMock()
    _cred_mock.token = "fake"
    _cred_mock.valid = True
    patch("google.auth.default", return_value=(_cred_mock, "ci-stub")).start()
