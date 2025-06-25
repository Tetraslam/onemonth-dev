from datetime import date, datetime, timedelta
from typing import Any, Dict, List, Optional
from uuid import UUID

from app.db.supabase_client import get_supabase_client
from app.models.user import AuthenticatedUser
from pydantic import BaseModel, EmailStr


# Pydantic model for the data we need for the recap email
class WeeklyRecapData(BaseModel):
    user_name: Optional[str] = "Learner"
    user_email: EmailStr
    curriculum_title: str
    days_completed_this_week: int
    total_days_completed: int
    total_days_in_curriculum: int
    hours_logged_this_week: float
    current_streak: int
    longest_streak: int
    dominant_mood_this_week: Optional[str] = None
    next_day_number: Optional[int] = None
    next_day_title: Optional[str] = "Keep Exploring!"
    curriculum_url: str # To generate the "Jump Back In" link

class RecapService:
    @staticmethod
    async def generate_weekly_recap_data(
        current_user_obj: AuthenticatedUser,
        curriculum_id: UUID,
        frontend_url: str # Pass this from settings
    ) -> Optional[WeeklyRecapData]:
        supabase = get_supabase_client()
        today = date.today()
        one_week_ago = today - timedelta(days=7)

        try:
            # Debug: Print date range
            print(f"[RECAP DEBUG] Today: {today.isoformat()}, One week ago: {one_week_ago.isoformat()}")

            # 1. User Details are now passed in via current_user_obj
            user_name = current_user_obj.metadata.get("full_name") or current_user_obj.email
            user_email_str = current_user_obj.email
            user_id_str = str(current_user_obj.id)

            # 2. Fetch Curriculum Details
            curriculum_response = supabase.table("curricula").select("id, title").eq("id", str(curriculum_id)).single().execute()
            if not curriculum_response.data:
                print(f"Recap Service: Curriculum not found for ID {curriculum_id}")
                return None
            curriculum_data = curriculum_response.data

            # 3. Fetch all curriculum days for this curriculum
            days_response = supabase.table("curriculum_days").select("id, day_number, title").eq("curriculum_id", str(curriculum_id)).order("day_number", desc=False).execute()
            all_curriculum_days = days_response.data or []
            total_days_in_curriculum = len(all_curriculum_days)

            # 4. Fetch all progress entries for this user & curriculum
            progress_response = supabase.table("progress").select("day_id, completed_at").eq("user_id", user_id_str).eq("curriculum_id", str(curriculum_id)).execute()
            all_progress_entries = progress_response.data or []
            total_days_completed = len(all_progress_entries)
            completed_day_ids_set = {entry['day_id'] for entry in all_progress_entries}
            
            # 5. Calculate Days Completed This Week
            days_completed_this_week = 0
            # Debug: Print progress entries being checked for weekly completion
            print(f"[RECAP DEBUG] All progress entries ({len(all_progress_entries)} total) for curriculum {curriculum_id}:")
            for prog_entry in all_progress_entries:
                print(f"[RECAP DEBUG]   - Progress Entry: day_id={prog_entry.get('day_id')}, completed_at={prog_entry.get('completed_at')}")
                completed_at_str = prog_entry.get("completed_at")
                if completed_at_str:
                    try:
                        completed_date = datetime.fromisoformat(completed_at_str.replace("Z", "+00:00")).date()
                        if one_week_ago <= completed_date <= today:
                            days_completed_this_week += 1
                            print(f"[RECAP DEBUG]     INCREMENTED days_completed_this_week for entry completed on {completed_date.isoformat()}")
                    except ValueError:
                        print(f"Recap Service: Could not parse date {completed_at_str} for progress entry.")
            print(f"[RECAP DEBUG] Calculated days_completed_this_week: {days_completed_this_week}")

            # 6. Fetch Logbook Entries This Week for hours and mood
            # Using a consistent end-of-day for lte
            end_of_today_for_query = (today + timedelta(days=1)).isoformat()
            print(f"[RECAP DEBUG] Fetching logbook entries >= {one_week_ago.isoformat()} and < {end_of_today_for_query}")
            logbook_response = supabase.table("logbook_entries").select("hours_spent, mood, created_at") \
                .eq("user_id", user_id_str) \
                .eq("curriculum_id", str(curriculum_id)) \
                .gte("created_at", one_week_ago.isoformat()) \
                .lt("created_at", end_of_today_for_query) \
                .execute()
            logbook_entries_this_week = logbook_response.data or []
            # Debug: Print fetched logbook entries for the week
            print(f"[RECAP DEBUG] Fetched {len(logbook_entries_this_week)} logbook entries for this week:")
            for lb_entry in logbook_entries_this_week:
                print(f"[RECAP DEBUG]   - Logbook Entry: created_at={lb_entry.get('created_at')}, hours={lb_entry.get('hours_spent')}, mood={lb_entry.get('mood')}")
            
            hours_logged_this_week = sum(entry.get("hours_spent", 0) or 0 for entry in logbook_entries_this_week)
            print(f"[RECAP DEBUG] Calculated hours_logged_this_week: {hours_logged_this_week}")

            # 7. Calculate Dominant Mood This Week (from logbook_entries_this_week)
            mood_counts: Dict[str, int] = {}
            for entry in logbook_entries_this_week:
                mood = entry.get("mood")
                if mood:
                    mood_counts[mood] = mood_counts.get(mood, 0) + 1
            dominant_mood_this_week = max(mood_counts, key=mood_counts.get) if mood_counts else None
            print(f"[RECAP DEBUG] Calculated dominant_mood_this_week: {dominant_mood_this_week}")

            # 8. Streaks
            # For streaks, we need ALL logbook dates for the user/curriculum to correctly calculate longest_streak
            # and the tail end for current_streak.
            all_logbook_dates_response = supabase.table("logbook_entries").select("created_at") \
                .eq("user_id", user_id_str) \
                .eq("curriculum_id", str(curriculum_id)) \
                .order("created_at", desc=False) \
                .execute()
            
            log_dates = sorted(list(set(
                datetime.fromisoformat(entry["created_at"].replace("Z", "+00:00")).date()
                for entry in (all_logbook_dates_response.data or [])
            )))
            print(f"[RECAP DEBUG] All log dates for streak calculation ({len(log_dates)} total): {log_dates}")
            current_streak = 0
            longest_streak = 0
            if log_dates:
                if len(log_dates) == 1:
                    longest_streak = 1
                else:
                    current_sequence = 1
                    for i in range(1, len(log_dates)):
                        if (log_dates[i] - log_dates[i-1]).days == 1:
                            current_sequence += 1
                        else:
                            longest_streak = max(longest_streak, current_sequence)
                            current_sequence = 1
                    longest_streak = max(longest_streak, current_sequence)
                # Check if the MOST RECENT log_date is today or yesterday for current_streak
                if log_dates[-1] == today or log_dates[-1] == (today - timedelta(days=1)):
                    current_streak = 1 # Start with 1 for the last day if it qualifies
                    # Iterate backwards from the second to last date in log_dates
                    for i in range(len(log_dates) - 2, -1, -1):
                        if (log_dates[i+1] - log_dates[i]).days == 1:
                            current_streak += 1
                        else:
                            break # Sequence broken
                else:
                    current_streak = 0 # Last entry not recent enough
            print(f"[RECAP DEBUG] Calculated current_streak: {current_streak}, longest_streak: {longest_streak}")

            # 9. Determine Next Uncompleted Day
            next_day_number: Optional[int] = None
            next_day_title: Optional[str] = "All caught up or keep exploring!"
            if total_days_completed < total_days_in_curriculum:
                for day_in_curriculum in all_curriculum_days:
                    if day_in_curriculum['id'] not in completed_day_ids_set:
                        next_day_number = day_in_curriculum.get('day_number')
                        next_day_title = day_in_curriculum.get('title', "Next Module")
                        break
            
            curriculum_url = f"{frontend_url}/curriculum/{curriculum_id}"

            return WeeklyRecapData(
                user_name=user_name,
                user_email=user_email_str,
                curriculum_title=curriculum_data["title"],
                days_completed_this_week=days_completed_this_week,
                total_days_completed=total_days_completed,
                total_days_in_curriculum=total_days_in_curriculum,
                hours_logged_this_week=hours_logged_this_week,
                current_streak=current_streak,
                longest_streak=longest_streak,
                dominant_mood_this_week=dominant_mood_this_week,
                next_day_number=next_day_number,
                next_day_title=next_day_title,
                curriculum_url=curriculum_url
            )

        except Exception as e:
            print(f"Recap Service: Error generating recap data for user {user_id_str}, curriculum {curriculum_id}: {e}")
            import traceback
            traceback.print_exc()
            return None 