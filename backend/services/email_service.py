import requests
from core.config import settings
import asyncio
import logging

def _send_otp_email_sync(to_email: str, otp: str):
    url = settings.GOOGLE_SCRIPT_URL
    if not url:
        logging.error("GOOGLE_SCRIPT_URL is not set. Cannot send email.")
        return False
        
    try:
        payload = {
            "to": to_email,
            "otp": otp
        }
        
        # Follow redirects is crucial for Google Scripts (they redirect from script.google.com to script.googleusercontent.com)
        response = requests.post(url, json=payload, allow_redirects=True)
        
        if response.status_code == 200:
            logging.info(f"Successfully sent OTP to {to_email} via Google Apps Script.")
            return True
        else:
            logging.error(f"Failed to send email. Google Script returned status {response.status_code}: {response.text}")
            return False
            
    except Exception as e:
        logging.error(f"Failed to send email to {to_email} via Google Apps Script: {e}")
        return False

async def send_otp_email(to_email: str, otp: str) -> bool:
    """Send OTP email asynchronously so it doesn't block the API"""
    return await asyncio.to_thread(_send_otp_email_sync, to_email, otp)
