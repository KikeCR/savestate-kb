from datetime import date

from app.extensions import db, redis_client
from app.models.user_game_entry import UserGameEntry

COMPLETIONS_KEY_PREFIX = "leaderboard:completions"
AVG_RATING_KEY = "leaderboard:avg_rating"


def _completions_key(year):
    return f"{COMPLETIONS_KEY_PREFIX}:{year}"


def record_completion(user_id, year):
    redis_client.zincrby(_completions_key(year), 1, str(user_id))


def remove_completion(user_id, year):
    key = _completions_key(year)
    new_score = redis_client.zincrby(key, -1, str(user_id))
    if new_score <= 0:
        redis_client.zrem(key, str(user_id))


def get_completions_leaderboard(year=None, limit=10):
    year = year or date.today().year
    return redis_client.zrevrange(_completions_key(year), 0, limit - 1, withscores=True)


def refresh_avg_rating(user_id):
    ratings = [
        r[0]
        for r in db.session.query(UserGameEntry.rating)
        .filter(UserGameEntry.user_id == user_id, UserGameEntry.rating.isnot(None))
        .all()
    ]
    if not ratings:
        redis_client.zrem(AVG_RATING_KEY, str(user_id))
        return
    redis_client.zadd(AVG_RATING_KEY, {str(user_id): sum(ratings) / len(ratings)})


def get_avg_rating_leaderboard(limit=10):
    return redis_client.zrevrange(AVG_RATING_KEY, 0, limit - 1, withscores=True)
