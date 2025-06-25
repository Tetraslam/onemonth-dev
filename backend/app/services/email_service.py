import os

import resend
from app.core.config import settings

# Initialize Resend client
# It's better to fetch the API key directly when needed or ensure settings are loaded.
# resend.api_key = settings.resend_api_key 
# The above line might cause issues if settings.resend_api_key is None at import time.
# It's often safer to initialize the client or pass the key directly within the function call
# if the library supports it, or ensure the key is present before this module is imported.

# For Resend Python SDK, the API key is typically set globally once.
# Let's ensure it's set, and if not, raise an error or log a warning.
if settings.resend_api_key:
    resend.api_key = settings.resend_api_key
else:
    print("WARNING: RESEND_API_KEY is not set. Email functionality will be disabled.")
    # You might want to raise an ImproperlyConfigured exception here
    # or handle this case more gracefully depending on your application's needs.

class EmailService:
    @staticmethod
    async def send_email(to: str, subject: str, html_content: str) -> bool:
        if not resend.api_key:
            print(f"Email not sent to {to} (subject: {subject}) because RESEND_API_KEY is not configured.")
            return False

        try:
            params = {
                "from": settings.resend_from_email,
                "to": [to],  # Resend expects a list of recipients
                "subject": subject,
                "html": html_content,
            }
            email_response = resend.Emails.send(params)
            
            print(f"Email send attempt to {to}, response: {email_response}") # Log response for debugging

            # Check if the response indicates success (e.g., has an ID and no error)
            # The actual success check might depend on the structure of email_response
            # For resend-python, a successful response is a dictionary with an 'id'.
            # An error will raise an exception that should be caught by the except block.
            if email_response.get('id'):
                print(f"Email sent successfully to {to}. ID: {email_response.get('id')}")
                return True
            else: # Should ideally be caught by exception handling if resend library is well-behaved
                print(f"Failed to send email to {to}. Detailed Resend Response: {email_response}")
                return False

        except Exception as e:
            print(f"Error sending email to {to} (subject: {subject}):")
            print(f"  Exception Type: {type(e)}")
            print(f"  Exception Repr: {repr(e)}")
            print(f"  Exception Str: {str(e)}")
            
            # Attempt to get more details if it's a Resend-like error object
            if hasattr(e, 'message') and hasattr(e, 'type'): # Standard ResendError attributes
                print(f"  Resend Error Type: {getattr(e, 'type')}")
                print(f"  Resend Error Message: {getattr(e, 'message')}")
            
            # Check for attributes often found in HTTP error wrappers
            if hasattr(e, 'status_code'):
                print(f"  HTTP Status Code: {getattr(e, 'status_code')}")
            if hasattr(e, 'text'): # Some libraries store response body in .text
                print(f"  Response Text: {getattr(e, 'text')}")
            elif hasattr(e, 'response') and hasattr(e.response, 'text'): # requests-like structure
                print(f"  Response Text (from e.response.text): {e.response.text}")
            elif hasattr(e, 'args') and e.args:
                print(f"  Exception Args: {e.args}")
            
            import traceback
            print("  Traceback:")
            traceback.print_exc()
            return False

# Example usage (for testing purposes, normally called from an API endpoint):
# async def main():
#     if settings.resend_api_key: # Ensure key is there for test
#         success = await EmailService.send_email(
#             to="test_recipient@example.com", 
#             subject="Test Email from OneMonth.dev", 
#             html_content="<h1>Hello!</h1><p>This is a test email.</p>"
#         )
#         print(f"Test email send status: {success}")
#     else:
#         print("Skipping email test as RESEND_API_KEY is not set.")

# if __name__ == "__main__":
#     import asyncio
#     asyncio.run(main()) 