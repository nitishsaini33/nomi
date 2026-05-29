import resend
from core.config import settings
import asyncio
import logging

# Initialize resend with the API key from config
resend.api_key = settings.RESEND_API_KEY

def _send_otp_email_sync(to_email: str, otp: str):
    if not resend.api_key:
        logging.error("RESEND_API_KEY is not set. Cannot send email.")
        return False
        
    try:
        html_content = f"""
        <html>
            <body style="font-family: Arial, sans-serif; background-color: #f4f4f4; padding: 20px;">
                <div style="max-width: 500px; margin: 0 auto; background-color: #ffffff; padding: 30px; border-radius: 8px; border: 4px solid #1a1a1a; box-shadow: 6px 6px 0px #1a1a1a;">
                    <h2 style="color: #1a1a1a; text-transform: uppercase; border-bottom: 2px solid #1a1a1a; padding-bottom: 10px;">Verify Your Email</h2>
                    <p style="font-size: 16px; color: #333;">Welcome to Modern Chat App! Use the 6-digit code below to complete your registration:</p>
                    <div style="background-color: #a3e635; padding: 15px; text-align: center; font-size: 28px; font-weight: 900; letter-spacing: 5px; color: #1a1a1a; border: 2px solid #1a1a1a; margin: 20px 0;">
                        {otp}
                    </div>
                    <p style="font-size: 14px; color: #666;">This code expires in 10 minutes. If you didn't request this, you can safely ignore this email.</p>
                </div>
            </body>
        </html>
        """
        
        # Resend requires a verified domain to send FROM. 
        # For testing, Resend allows sending from 'onboarding@resend.dev' to the registered email address.
        # Once you verify a domain (like yourdomain.com), change this to "Modern Chat App <noreply@yourdomain.com>".
        
        r = resend.Emails.send({
            "from": "Modern Chat App <onboarding@resend.dev>",
            "to": to_email,
            "subject": "Your Chat App Verification Code",
            "html": html_content
        })
        
        logging.info(f"Successfully sent OTP to {to_email} via Resend. Response: {r}")
        return True
    except Exception as e:
        logging.error(f"Failed to send email to {to_email} via Resend: {e}")
        return False

async def send_otp_email(to_email: str, otp: str) -> bool:
    """Send OTP email asynchronously so it doesn't block the API"""
    return await asyncio.to_thread(_send_otp_email_sync, to_email, otp)
