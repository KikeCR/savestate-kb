from app.extensions import db
from app.models.activity import Activity
from app.services.follows import get_following_ids


def record_activity(user, game, action, **details):
    activity = Activity(
        user_id=user.id,
        game_id=game.id,
        action=action,
        rating=details.get("rating"),
        year_played=details.get("year_played"),
    )
    db.session.add(activity)
    db.session.commit()
    return activity


def get_recent_activity(user_id, limit=20):
    scope_ids = get_following_ids(user_id) + [user_id]
    events = (
        Activity.query.filter(Activity.user_id.in_(scope_ids))
        .order_by(Activity.created_at.desc())
        .limit(limit)
        .all()
    )
    return [event.to_dict() for event in events]
