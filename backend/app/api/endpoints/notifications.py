from typing import Any, Dict, List, Optional
from uuid import UUID

from app.core.auth import get_current_user
from app.core.config import settings
from app.db.supabase_client import get_supabase_client
from app.models.user import \
    AuthenticatedUser  # Assuming you have this for type hinting
from app.services.email_service import EmailService
from app.services.recap_service import RecapService, WeeklyRecapData
from fastapi import APIRouter, Depends, Header, HTTPException
from pydantic import BaseModel, EmailStr

router = APIRouter()

# Dependency to verify the cron secret key
async def verify_cron_secret(x_cron_secret: str = Header(None)):
    if not settings.supabase_cron_secret:
        print("CRON JOB ALERT: SUPABASE_CRON_SECRET is not set in the environment. Endpoint is unsecured.")
        # In a production scenario, you might want to raise HTTPException here if the key is not set.
        # For now, allowing it to proceed but logging a critical warning.
        # raise HTTPException(status_code=500, detail="Cron secret not configured on server.")
    elif x_cron_secret != settings.supabase_cron_secret:
        raise HTTPException(status_code=403, detail="Invalid or missing X-Cron-Secret header.")
    return True

class TestEmailResponse(BaseModel):
    message: str
    email_sent_to: str | None = None
    success: bool

# Updated HTML email formatting function
def _format_weekly_recap_email_html(data: WeeklyRecapData) -> str:
    # Neobrutalist colors
    bg_color = "#f5f2ef"  # hsl(30, 40%, 96%)
    text_color = "#262626" # hsl(0, 0%, 15%)
    accent_color = "#ffbf00" # hsl(45, 100%, 50%)
    border_color = "#262626"
    card_bg_color = "#ffffff" # White cards for contrast

    mood_emoji_map = {
        "excited": "🤩",
        "confident": "😎",
        "neutral": "😐",
        "frustrated": "😤",
        "stuck": "😫",
        None: "🤔" # Fallback emoji
    }
    dominant_mood_capitalized = data.dominant_mood_this_week.capitalize() if data.dominant_mood_this_week else "Not Logged"
    mood_emoji = mood_emoji_map.get(data.dominant_mood_this_week, mood_emoji_map[None])
    mood_display = f"{mood_emoji} <strong>{dominant_mood_capitalized}</strong>"

    # Simple progress bar using text characters
    progress_bar_width = 20 # characters
    filled_chars = int((data.total_days_completed / data.total_days_in_curriculum if data.total_days_in_curriculum > 0 else 0) * progress_bar_width)
    empty_chars = progress_bar_width - filled_chars
    progress_bar_text = f"[{'█' * filled_chars}{'░' * empty_chars}]"

    html = f"""
    <!DOCTYPE html>
    <html lang=\"en\">
    <head>
        <meta charset=\"UTF-8\">
        <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">
        <title>Your OneMonth.dev Weekly Recap</title>
        <style>
            body {{ margin: 0; padding: 0; background-color: {bg_color}; font-family: 'Arial', 'Helvetica Neue', 'Helvetica', sans-serif; color: {text_color}; line-height: 1.6; }}
            .email-container {{ max-width: 600px; margin: 20px auto; background-color: {card_bg_color}; border: 3px solid {border_color}; padding: 20px; box-shadow: 6px 6px 0px {border_color}; }}
            .header {{ text-align: center; border-bottom: 3px solid {border_color}; padding-bottom: 15px; margin-bottom: 20px; }}
            .header h1 {{ font-size: 28px; color: {text_color}; margin: 0; font-weight: 900; }}
            .greeting {{ font-size: 18px; font-weight: bold; margin-bottom: 20px; text-align: center; }}
            .card {{ border: 3px solid {border_color}; margin-bottom: 20px; padding: 15px; background-color: {bg_color}; box-shadow: 4px 4px 0px {border_color}; }}
            .card h2 {{ font-size: 18px; margin-top: 0; margin-bottom: 10px; font-weight: 800; border-bottom: 2px solid {border_color}; padding-bottom: 5px; }}
            .card p {{ margin: 5px 0; font-size: 16px; }}
            .card strong {{ font-weight: 800; color: {accent_color}; }}
            .card .stat-value {{ font-size: 20px; font-weight: 900; }}
            .progress-text {{ font-family: 'Courier New', Courier, monospace; font-size: 16px; font-weight: bold; }}
            .cta-button-container {{ text-align: center; margin-top: 25px; }}
            .cta-button {{
                display: inline-block;
                background-color: {accent_color};
                color: {text_color} !important; /* Important for email client compatibility */
                padding: 12px 30px;
                text-decoration: none;
                font-weight: 900;
                font-size: 18px;
                border: 3px solid {border_color};
                box-shadow: 4px 4px 0px {border_color};
                transition: all 0.1s ease-in-out; /* Basic hover effect, might not work everywhere */
            }}
            .cta-button:hover {{ /* Basic hover effect, might not work everywhere */
                transform: translate(2px, 2px);
                box-shadow: 2px 2px 0px {border_color};
            }}
            .footer {{ margin-top: 30px; text-align: center; font-size: 14px; color: {text_color}; border-top: 3px solid {border_color}; padding-top: 15px; }}
        </style>
    </head>
    <body>
        <div class=\"email-container\">
            <div class=\"header\">
                <h1>🚀 Your Mission Report</h1>
            </div>
            <p class=\"greeting\">Hey {data.user_name}, you absolute legend! 🏆</p>

            <div class=\"card\">
                <h2>Mission: {data.curriculum_title}</h2>
                <p>Days Conquered This Week: <span class=\"stat-value\">{data.days_completed_this_week}</span></p>
                <p>Total Mission Progress: <span class=\"stat-value\">{data.total_days_completed} / {data.total_days_in_curriculum}</span></p>
                <p class=\"progress-text\">{progress_bar_text}</p>
            </div>

            <div class=\"card\">
                <h2>Fuel Burned</h2>
                <p>This Week's Grind: <span class=\"stat-value\">{data.hours_logged_this_week:.1f} hours</span></p>
            </div>

            <div class=\"card\">
                <h2>Streak Power-Up!</h2>
                <p>Current Streak: 🔥 <span class=\"stat-value\">{data.current_streak} days!</span> Keep it blazing!</p>
                <p>Longest Streak: ⭐ <span class=\"stat-value\">{data.longest_streak} days!</span> Record Smasher!</p>
            </div>

            <div class=\"card\">
                <h2>Vibe Check</h2>
                <p>Dominant Mood This Week: {mood_display}</p>
            </div>

            <div class=\"card\">
                <h2>Next Target Acquired</h2>
                <p>Objective: Day {data.next_day_number if data.next_day_number else '--'}: {data.next_day_title}</p>
            </div>

            <div class=\"cta-button-container\">
                <a href=\"{data.curriculum_url}\" class=\"cta-button\">JUMP BACK IN!</a>
            </div>
            
            <div class=\"footer\">
                <p>Stay focused, stay awesome.<br/>The OneMonth.dev Crew</p>
            </div>
        </div>
    </body>
    </html>
    """
    return html

class RecapEmailResponse(BaseModel):
    message: str
    email_sent_to: EmailStr
    recap_data_summary: Dict[str, Any]

class TriggerRecapsResponse(BaseModel):
    message: str
    users_processed: int
    curricula_processed: int
    emails_attempted: int
    emails_sent_successfully: int

@router.post("/trigger-all-weekly-recaps", response_model=TriggerRecapsResponse)
async def trigger_all_weekly_recaps(
    cron_verified: bool = Depends(verify_cron_secret),
    supabase_client = Depends(get_supabase_client)
):
    """Triggers weekly recap emails for all relevant users and their curricula."""
    if not cron_verified:
        # This case should ideally not be hit if verify_cron_secret raises HTTPException
        # but as a fallback:
        raise HTTPException(status_code=403, detail="Forbidden. Invalid cron secret.")

    users_processed = 0
    curricula_processed = 0
    emails_attempted = 0
    emails_sent_successfully = 0

    try:
        # 1. Fetch all users using the admin interface (requires service_role key)
        # This accesses auth.users correctly.
        list_users_response = supabase_client.auth.admin.list_users()
        # The response object itself might be the list, or it might be nested, e.g., response.users
        # Based on supabase-py common patterns, list_users_response itself is often the list of User objects.
        # If it's a more complex response object, this might need adjustment, e.g. list_users_response.get('users')
        # For now, assuming list_users_response is directly iterable as list of users.
        
        all_auth_users = list_users_response.users if hasattr(list_users_response, 'users') and isinstance(list_users_response.users, list) else list_users_response

        # Ensure all_auth_users is a list before iterating
        if not isinstance(all_auth_users, list):
            print(f"Unexpected response type from list_users: {type(all_auth_users)}. Expected a list.")
            all_auth_users = [] # Default to empty list to prevent iteration error

        print(f"[CRON DEBUG] Fetched {len(all_auth_users)} users from auth.admin.list_users().")

        for auth_user_obj in all_auth_users:
            users_processed += 1
            
            # Extract necessary fields directly from the auth_user_obj
            # The attributes on auth_user_obj might vary slightly based on gotrue library version
            # Common attributes are: id, email, user_metadata
            user_id = getattr(auth_user_obj, 'id', None)
            user_email = getattr(auth_user_obj, 'email', None)
            # user_metadata from gotrue User is often equivalent to raw_user_meta_data
            user_metadata = getattr(auth_user_obj, 'user_metadata', {})

            if not user_id or not user_email:
                print(f"Skipping user with missing ID or email. User object: {auth_user_obj}")
                continue

            try:
                current_user_for_recap = AuthenticatedUser(
                    id=UUID(str(user_id)), 
                    email=user_email,
                    metadata=user_metadata or {}
                )
            except Exception as e_auth_user:
                print(f"Could not create AuthenticatedUser for {user_id}: {e_auth_user}")
                continue

            # 2. Fetch all curricula for this user
            curricula_response = supabase_client.table("curricula").select("id, title").eq("user_id", str(user_id)).execute()
            
            if curricula_response.data:
                for curriculum_row in curricula_response.data:
                    curricula_processed += 1
                    curriculum_id = curriculum_row.get("id")
                    
                    if not curriculum_id:
                        print(f"Skipping curriculum with missing ID for user {user_id}")
                        continue
                    
                    print(f"Processing recap for user {user_id}, curriculum {curriculum_id}")
                    emails_attempted += 1
                    
                    recap_data = await RecapService.generate_weekly_recap_data(
                        current_user_obj=current_user_for_recap,
                        curriculum_id=UUID(curriculum_id),
                        frontend_url=settings.frontend_url
                    )

                    if recap_data:
                        html_content = _format_weekly_recap_email_html(recap_data)
                        subject = f"🚀 Your OneMonth.dev Mission Report: {recap_data.curriculum_title} This Week!"
                        
                        email_was_sent = await EmailService.send_email(
                            to=recap_data.user_email,
                            subject=subject,
                            html_content=html_content
                        )
                        if email_was_sent:
                            emails_sent_successfully += 1
                    else:
                        print(f"No recap data generated for user {user_id}, curriculum {curriculum_id}. Skipping email.")
            else:
                print(f"No curricula found for user {user_id}")
        
        return TriggerRecapsResponse(
            message="Weekly recap email processing complete.",
            users_processed=users_processed,
            curricula_processed=curricula_processed,
            emails_attempted=emails_attempted,
            emails_sent_successfully=emails_sent_successfully
        )

    except Exception as e:
        print(f"Error during trigger_all_weekly_recaps: {e}")
        import traceback
        traceback.print_exc()
        # Don't re-raise generic error to cron, let it finish and report what it could do.
        # The cron job itself will see a 500 if this endpoint fails badly before returning.
        return TriggerRecapsResponse(
            message=f"Error during processing: {str(e)}",
            users_processed=users_processed,
            curricula_processed=curricula_processed,
            emails_attempted=emails_attempted,
            emails_sent_successfully=emails_sent_successfully
        )

@router.post("/weekly-recap/{curriculum_id}", response_model=RecapEmailResponse)
async def send_weekly_recap_email(
    curriculum_id: UUID,
    current_user: AuthenticatedUser = Depends(get_current_user)
):
    """Generates and sends a weekly recap email for the given curriculum to the authenticated user."""
    
    recap_data = await RecapService.generate_weekly_recap_data(
        current_user_obj=current_user,
        curriculum_id=curriculum_id,
        frontend_url=settings.frontend_url
    )

    if not recap_data:
        raise HTTPException(
            status_code=404, 
            detail=f"Could not generate recap data for user {current_user.id} and curriculum {curriculum_id}. User or curriculum may not exist, or an error occurred."
        )

    html_content = _format_weekly_recap_email_html(recap_data)
    subject = f"🚀 Your OneMonth.dev Mission Report: {recap_data.curriculum_title} This Week!"

    email_sent_successfully = await EmailService.send_email(
        to=recap_data.user_email,
        subject=subject,
        html_content=html_content
    )

    if email_sent_successfully:
        return RecapEmailResponse(
            message="Weekly recap email sent successfully.",
            email_sent_to=recap_data.user_email,
            recap_data_summary=recap_data.model_dump(exclude_none=True)
        )
    else:
        raise HTTPException(
            status_code=500,
            detail="Failed to send weekly recap email. Check server logs."
        )

@router.post("/test-email", response_model=TestEmailResponse)
async def send_test_email(
    current_user: AuthenticatedUser = Depends(get_current_user)
):
    """Sends a test email to the authenticated user."""
    subject = "Test Email from OneMonth.dev"
    
    user_email_for_greeting: Optional[str] = None
    user_id_for_greeting: Optional[UUID] = None # Assuming ID is UUID
    user_name_for_greeting: Optional[str] = None

    if isinstance(current_user, AuthenticatedUser):
        user_email_for_greeting = current_user.email
        user_id_for_greeting = current_user.id
        user_name_for_greeting = current_user.metadata.get('full_name', user_email_for_greeting)
    elif isinstance(current_user, dict):
        user_email_for_greeting = current_user.get("email")
        user_id_raw = current_user.get("id")
        try:
            user_id_for_greeting = UUID(user_id_raw) if user_id_raw else None
        except ValueError:
            print(f"[AUTH DEBUG] Could not parse user_id '{user_id_raw}' as UUID in test_email.")
            user_id_for_greeting = None # Or handle error appropriately
        
        user_metadata_dict = current_user.get("metadata", {})
        user_name_for_greeting = user_metadata_dict.get('full_name', user_email_for_greeting)
    else:
        # Should not happen if get_current_user behaves, but as a fallback:
        raise HTTPException(
            status_code=500,
            detail="Internal server error: User data is in an unexpected format."
        )

    if not user_email_for_greeting:
        raise HTTPException(
            status_code=400,
            detail="Current user does not have an email address configured or it could not be determined."
        )
    
    html_content = f"""
    <h1>Hello {user_name_for_greeting}!</h1>
    <p>This is a test email from the OneMonth.dev API using Resend.</p>
    <p>If you received this, your email setup is working correctly!</p>
    <p>Your User ID: {user_id_for_greeting if user_id_for_greeting else 'N/A'}</p>
    """

    success = await EmailService.send_email(
        to=user_email_for_greeting,
        subject=subject,
        html_content=html_content
    )

    if success:
        return TestEmailResponse(
            message="Test email sent successfully.",
            email_sent_to=user_email_for_greeting,
            success=True
        )
    else:
        raise HTTPException(
            status_code=500,
            detail="Failed to send test email. Check server logs for details."
        ) 