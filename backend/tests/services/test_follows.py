import pytest

from app.services import follows

pytestmark = pytest.mark.integration


def test_follow_user_creates_relationship(app, make_user):
    follower = make_user()
    followed = make_user()

    with app.app_context():
        follows.follow_user(follower.id, followed.id)

        assert follows.is_following(follower.id, followed.id) is True


def test_follow_user_rejects_self_follow(app, make_user):
    user = make_user()

    with app.app_context():
        with pytest.raises(ValueError):
            follows.follow_user(user.id, user.id)


def test_follow_user_rejects_duplicate_follow(app, make_user):
    follower = make_user()
    followed = make_user()

    with app.app_context():
        follows.follow_user(follower.id, followed.id)

        with pytest.raises(follows.AlreadyFollowingError):
            follows.follow_user(follower.id, followed.id)


def test_unfollow_user_removes_relationship(app, make_user):
    follower = make_user()
    followed = make_user()

    with app.app_context():
        follows.follow_user(follower.id, followed.id)

        result = follows.unfollow_user(follower.id, followed.id)

        assert result is True
        assert follows.is_following(follower.id, followed.id) is False


def test_unfollow_user_returns_false_when_not_following(app, make_user):
    follower = make_user()
    followed = make_user()

    with app.app_context():
        result = follows.unfollow_user(follower.id, followed.id)

        assert result is False


def test_get_followers_and_get_following(app, make_user):
    user_a = make_user()
    user_b = make_user()
    user_c = make_user()

    with app.app_context():
        follows.follow_user(user_a.id, user_b.id)
        follows.follow_user(user_c.id, user_b.id)

        followers = follows.get_followers(user_b.id)
        following = follows.get_following(user_a.id)

    follower_ids = {u.id for u in followers}
    following_ids = {u.id for u in following}
    assert follower_ids == {user_a.id, user_c.id}
    assert following_ids == {user_b.id}


def test_follower_and_following_counts(app, make_user):
    user_a = make_user()
    user_b = make_user()
    user_c = make_user()

    with app.app_context():
        follows.follow_user(user_a.id, user_b.id)
        follows.follow_user(user_c.id, user_b.id)

        assert follows.follower_count(user_b.id) == 2
        assert follows.following_count(user_a.id) == 1
        assert follows.follower_count(user_a.id) == 0


def test_get_following_ids(app, make_user):
    user_a = make_user()
    user_b = make_user()
    user_c = make_user()

    with app.app_context():
        follows.follow_user(user_a.id, user_b.id)
        follows.follow_user(user_a.id, user_c.id)

        assert set(follows.get_following_ids(user_a.id)) == {user_b.id, user_c.id}
