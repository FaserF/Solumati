import pytest
from unittest.mock import patch, MagicMock
from app.services.password_validation import validate_password_complexity, check_pwned_password

# --- COMPLEXITY TESTS ---
def test_password_complexity_valid():
    # Valid: 12 chars, Upper, Lower, Digit, Special
    validate_password_complexity("StrongP@ssw0rd!")

def test_password_complexity_too_short():
    with pytest.raises(ValueError, match="at least 8 characters"):
        validate_password_complexity("Short1!")

def test_password_complexity_missing_upper():
    with pytest.raises(ValueError, match="uppercase"):
        validate_password_complexity("weakpassword1!")

def test_password_complexity_missing_lower():
    with pytest.raises(ValueError, match="lowercase"):
        validate_password_complexity("WEAKPASSWORD1!")

def test_password_complexity_missing_digit():
    with pytest.raises(ValueError, match="digit"):
        validate_password_complexity("NoDigitsHere!")

def test_password_complexity_missing_special():
    with pytest.raises(ValueError, match="special character"):
        validate_password_complexity("NoSpecialChar123")

# --- LEAK CHECK TESTS ---
@patch("app.services.password_validation.httpx.Client")
def test_pwned_check_clean(mock_client_cls):
    # Mock Response: No leak
    mock_response = MagicMock()
    mock_response.status_code = 200
    mock_response.text = "ABC12:1\nDEF34:5" # Suffixes that don't match

    # Setup Context Manager
    mock_client = mock_client_cls.return_value
    mock_client.__enter__.return_value.get.return_value = mock_response

    check_pwned_password("CleanPassword123!")

@patch("app.services.password_validation.httpx.Client")
def test_pwned_check_leaked(mock_client_cls):
    # Mock Leaked: "password" -> SHA1: 5BAA61E4C9B93F3F0682250B6CF8331B7EE68FD8
    # Prefix: 5BAA6
    # Suffix: 1E4C9B93F3F0682250B6CF8331B7EE68FD8

    mock_response = MagicMock()
    mock_response.status_code = 200
    # Simulate API returning the matching suffix
    mock_response.text = "1E4C9B93F3F0682250B6CF8331B7EE68FD8:99999\nOTHERHASH:1"

    mock_client = mock_client_cls.return_value
    mock_client.__enter__.return_value.get.return_value = mock_response

    with pytest.raises(ValueError, match="exposed in a data breach"):
        check_pwned_password("password") # Real password doesn't matter as we mock the hash logic essentially via API response simulation

@patch("app.services.password_validation.httpx.Client")
def test_pwned_check_api_fail_fails_open(mock_client_cls):
    # Ensure if API is down (503), we DO NOT raise exception (Fail Open)
    mock_response = MagicMock()
    mock_response.status_code = 503

    mock_client = mock_client_cls.return_value
    mock_client.__enter__.return_value.get.return_value = mock_response

    # Should NOT raise
    check_pwned_password("AnyPassword")
