import smtplib
from email.message import EmailMessage
from core.config import settings
import asyncio
import logging

def _send_otp_email_sync(to_email: str, otp: str):
    try:
        msg = EmailMessage()
        msg['Subject'] = 'Your Chat App Verification Code'
        msg['From'] = f"Modern Chat App <{settings.SMTP_USERNAME}>"
        msg['To'] = to_email

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
        msg.set_content("Your OTP is: " + otp) # Plain text fallback
        msg.add_alternative(html_content, subtype='html')

        with smtplib.SMTP(settings.SMTP_SERVER, settings.SMTP_PORT) as server:
            server.starttls()
            server.login(settings.SMTP_USERNAME, settings.SMTP_PASSWORD)
            server.send_message(msg)
            
        logging.info(f"Successfully sent OTP to {to_email}")
        return True
    except Exception as e:
        logging.error(f"Failed to send email to {to_email}: {e}")
        return False

async def send_otp_email(to_email: str, otp: str) -> bool:
    """Send OTP email asynchronously so it doesn't block the API"""
    return await asyncio.to_thread(_send_otp_email_sync, to_email, otp)
