from typing import Any, Dict
from uuid import UUID

from app.core.auth import get_current_user
from app.core.config import settings
from app.models.user import \
    AuthenticatedUser  # Assuming you have this for type hinting
from app.services.email_service import EmailService
from app.services.recap_service import RecapService, WeeklyRecapData
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, EmailStr

router = APIRouter()

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

@router.post("/weekly-recap/{curriculum_id}", response_model=RecapEmailResponse)
async def send_weekly_recap_email(
    curriculum_id: UUID,
    current_user: AuthenticatedUser = Depends(get_current_user)
):
    """Generates and sends a weekly recap email for the given curriculum to the authenticated user."""
    
    recap_data = await RecapService.generate_weekly_recap_data(
        user_id=current_user.id, 
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
            recap_data_summary=recap_data.model_dump(exclude_none=True) # Pydantic v2
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
    
    # Defensive access assuming current_user might be a dict
    user_email_for_greeting = current_user.get("email") if isinstance(current_user, dict) else current_user.email
    user_id_for_greeting = current_user.get("id") if isinstance(current_user, dict) else current_user.id
    user_metadata_dict = current_user.get("metadata", {}) if isinstance(current_user, dict) else current_user.metadata

    if not user_email_for_greeting:
        raise HTTPException(
            status_code=400,
            detail="Current user does not have an email address configured."
        )

    user_name = user_metadata_dict.get('full_name', user_email_for_greeting)

    html_content = f"""
    <h1>Hello {user_name}!</h1>
    <p>This is a test email from the OneMonth.dev API using Resend.</p>
    <p>If you received this, your email setup is working correctly!</p>
    <p>Your User ID: {user_id_for_greeting}</p>
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
        # The EmailService.send_email logs errors, so we just inform the client here
        raise HTTPException(
            status_code=500,
            detail="Failed to send test email. Check server logs for details."
        ) 