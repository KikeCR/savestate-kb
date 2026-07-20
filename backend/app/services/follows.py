from app.extensions import db
from app.models.follow import Follow
from app.models.user import User


class AlreadyFollowingError(Exception):
    """Raised when follow_user is called for a pair that's already following."""


def is_following(follower_id, followed_id):
    return (
        Follow.query.filter_by(follower_id=follower_id, followed_id=followed_id).first()
        is not None
    )


def follow_user(follower_id, followed_id):
    if follower_id == followed_id:
        raise ValueError("cannot follow yourself")
    if is_following(follower_id, followed_id):
        raise AlreadyFollowingError("already following this user")

    follow = Follow(follower_id=follower_id, followed_id=followed_id)
    db.session.add(follow)
    db.session.commit()
    return follow


def unfollow_user(follower_id, followed_id):
    follow = Follow.query.filter_by(follower_id=follower_id, followed_id=followed_id).first()
    if not follow:
        return False
    db.session.delete(follow)
    db.session.commit()
    return True


def get_followers(user_id, limit=50, offset=0):
    return (
        User.query.join(Follow, Follow.follower_id == User.id)
        .filter(Follow.followed_id == user_id)
        .order_by(Follow.created_at.desc())
        .offset(offset)
        .limit(limit)
        .all()
    )


def get_following(user_id, limit=50, offset=0):
    return (
        User.query.join(Follow, Follow.followed_id == User.id)
        .filter(Follow.follower_id == user_id)
        .order_by(Follow.created_at.desc())
        .offset(offset)
        .limit(limit)
        .all()
    )


def follower_count(user_id):
    return Follow.query.filter_by(followed_id=user_id).count()


def following_count(user_id):
    return Follow.query.filter_by(follower_id=user_id).count()


def get_following_ids(user_id):
    rows = db.session.query(Follow.followed_id).filter(Follow.follower_id == user_id).all()
    return [row[0] for row in rows]
