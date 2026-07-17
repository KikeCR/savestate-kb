import json
from datetime import datetime, timezone

from app.extensions import redis_client

ACTIVITY_FEED_KEY = "activity:feed"
ACTIVITY_FEED_MAX_LENGTH = 100


def record_activity(user, game, action):
    event = {
        "user_id": user.id,
        "username": user.username,
        "game_id": game.id,
        "game_title": game.title,
        "game_cover_image_url": game.cover_image_url,
        "action": action,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    redis_client.lpush(ACTIVITY_FEED_KEY, json.dumps(event))
    redis_client.ltrim(ACTIVITY_FEED_KEY, 0, ACTIVITY_FEED_MAX_LENGTH - 1)


def get_recent_activity(limit=20):
    raw_events = redis_client.lrange(ACTIVITY_FEED_KEY, 0, limit - 1)
    return [json.loads(event) for event in raw_events]
