import pytest

pytestmark = pytest.mark.integration


def test_follow_requires_authentication(client, make_user):
    target = make_user()

    response = client.post(f"/api/users/{target.username}/follow")

    assert response.status_code == 401


def test_follow_user_succeeds(logged_in_client, make_user):
    target = make_user()

    response = logged_in_client.post(f"/api/users/{target.username}/follow")

    assert response.status_code == 201
    body = response.get_json()
    assert body["is_following"] is True
    assert body["follower_count"] == 1


def test_follow_nonexistent_user_returns_404(logged_in_client):
    response = logged_in_client.post("/api/users/nobody/follow")

    assert response.status_code == 404


def test_follow_self_returns_400(logged_in_client):
    response = logged_in_client.post(f"/api/users/{logged_in_client.user.username}/follow")

    assert response.status_code == 400


def test_follow_same_user_twice_returns_409(logged_in_client, make_user):
    target = make_user()
    logged_in_client.post(f"/api/users/{target.username}/follow")

    response = logged_in_client.post(f"/api/users/{target.username}/follow")

    assert response.status_code == 409


def test_unfollow_removes_relationship(logged_in_client, make_user):
    target = make_user()
    logged_in_client.post(f"/api/users/{target.username}/follow")

    response = logged_in_client.delete(f"/api/users/{target.username}/follow")

    assert response.status_code == 200
    body = response.get_json()
    assert body["is_following"] is False
    assert body["follower_count"] == 0


def test_unfollow_when_not_following_returns_404(logged_in_client, make_user):
    target = make_user()

    response = logged_in_client.delete(f"/api/users/{target.username}/follow")

    assert response.status_code == 404


def test_followers_list_returns_expected_shape(logged_in_client, make_user):
    target = make_user()
    logged_in_client.post(f"/api/users/{target.username}/follow")

    response = logged_in_client.get(f"/api/users/{target.username}/followers")

    assert response.status_code == 200
    body = response.get_json()
    assert body["count"] == 1
    assert body["results"][0]["user"]["username"] == logged_in_client.user.username


def test_followers_list_is_following_reflects_viewers_own_follow_state(logged_in_client, make_user):
    target = make_user()
    third_party = make_user()
    logged_in_client.post(f"/api/users/{target.username}/follow")
    logged_in_client.post(f"/api/users/{third_party.username}/follow")
    third_party_client_follow = logged_in_client.application.test_client()
    with third_party_client_follow.session_transaction() as sess:
        sess["_user_id"] = str(third_party.id)
    third_party_client_follow.post(f"/api/users/{target.username}/follow")

    response = logged_in_client.get(f"/api/users/{target.username}/followers")

    assert response.status_code == 200
    results = {
        row["user"]["username"]: row["is_following"] for row in response.get_json()["results"]
    }
    assert results[logged_in_client.user.username] is False
    assert results[third_party.username] is True


def test_following_list_returns_expected_shape(logged_in_client, make_user):
    target = make_user()
    logged_in_client.post(f"/api/users/{target.username}/follow")

    response = logged_in_client.get(f"/api/users/{logged_in_client.user.username}/following")

    assert response.status_code == 200
    body = response.get_json()
    assert body["count"] == 1
    assert body["results"][0]["user"]["username"] == target.username


def test_followers_list_hidden_from_others_on_private_profile(client, make_user):
    owner = make_user(profile_visibility="private")

    response = client.get(f"/api/users/{owner.username}/followers")

    assert response.status_code == 403


def test_followers_list_visible_to_owner_on_private_profile(client, make_user):
    owner = make_user(profile_visibility="private")
    with client.session_transaction() as sess:
        sess["_user_id"] = str(owner.id)

    response = client.get(f"/api/users/{owner.username}/followers")

    assert response.status_code == 200


def test_can_follow_private_profile(logged_in_client, make_user):
    target = make_user(profile_visibility="private")

    response = logged_in_client.post(f"/api/users/{target.username}/follow")

    assert response.status_code == 201
