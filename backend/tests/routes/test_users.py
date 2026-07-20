import pytest

pytestmark = pytest.mark.integration


def test_profile_not_found(client):
    response = client.get("/api/users/nobody")

    assert response.status_code == 404


def test_public_profile_visible_to_anonymous(client, make_user):
    make_user(username="publicuser", profile_visibility="public")

    response = client.get("/api/users/publicuser")

    assert response.status_code == 200
    body = response.get_json()
    assert body["user"]["username"] == "publicuser"
    assert body["is_owner"] is False
    assert body["is_following"] is False
    assert body["follower_count"] == 0
    assert body["following_count"] == 0
    assert body["user"]["avatar_url"] is None


def test_profile_includes_avatar_url(client, make_user):
    make_user(username="avataruser", avatar_url="https://example.com/avatar.png")

    response = client.get("/api/users/avataruser")

    assert response.status_code == 200
    assert response.get_json()["user"]["avatar_url"] == "https://example.com/avatar.png"


def test_profile_reflects_follow_state_and_counts(logged_in_client, make_user):
    target = make_user()
    logged_in_client.post(f"/api/users/{target.username}/follow")

    response = logged_in_client.get(f"/api/users/{target.username}")

    assert response.status_code == 200
    body = response.get_json()
    assert body["is_following"] is True
    assert body["follower_count"] == 1
    assert body["following_count"] == 0


def test_private_profile_hidden_from_others(client, make_user):
    make_user(username="privateuser", profile_visibility="private")

    response = client.get("/api/users/privateuser")

    assert response.status_code == 403


def test_private_profile_visible_to_owner(client, make_user):
    owner = make_user(username="privateowner", profile_visibility="private")
    with client.session_transaction() as sess:
        sess["_user_id"] = str(owner.id)

    response = client.get("/api/users/privateowner")

    assert response.status_code == 200
    assert response.get_json()["is_owner"] is True


def test_profile_stats_reflect_entries(logged_in_client, make_game):
    game = make_game(genres=["Roguelike"])
    logged_in_client.post(
        "/api/entries",
        json={"game_id": game.id, "status": "completed", "rating": 9, "year_played": 2024},
    )

    response = logged_in_client.get(f"/api/users/{logged_in_client.user.username}")

    assert response.status_code == 200
    stats = response.get_json()["stats"]
    assert {"year": 2024, "count": 1} in stats["completions_per_year"]
    assert {"year": 2024, "count": 1} in stats["games_per_year"]
    assert {"genre": "Roguelike", "count": 1} in stats["genre_breakdown"]
    assert {"rating": 9, "count": 1} in stats["rating_distribution"]
