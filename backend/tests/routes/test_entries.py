import pytest

pytestmark = pytest.mark.integration


def test_create_entry_requires_authentication(client, make_game):
    game = make_game()

    response = client.post("/api/entries", json={"game_id": game.id})

    assert response.status_code == 401


def test_create_entry_requires_game_id(logged_in_client):
    response = logged_in_client.post("/api/entries", json={})

    assert response.status_code == 400


def test_create_entry_rejects_unknown_game(logged_in_client):
    response = logged_in_client.post("/api/entries", json={"game_id": 999999})

    assert response.status_code == 404


def test_create_entry_rejects_invalid_status(logged_in_client, make_game):
    game = make_game()

    response = logged_in_client.post(
        "/api/entries", json={"game_id": game.id, "status": "not-a-status"}
    )

    assert response.status_code == 400


def test_create_entry_rejects_duplicate_game_for_same_user(logged_in_client, make_game):
    game = make_game()
    logged_in_client.post("/api/entries", json={"game_id": game.id})

    response = logged_in_client.post("/api/entries", json={"game_id": game.id})

    assert response.status_code == 409


def test_create_entry_rejects_out_of_range_rating(logged_in_client, make_game):
    game = make_game()

    response = logged_in_client.post("/api/entries", json={"game_id": game.id, "rating": 99})

    assert response.status_code == 400


def test_create_entry_rejects_invalid_date_format(logged_in_client, make_game):
    game = make_game()

    response = logged_in_client.post(
        "/api/entries", json={"game_id": game.id, "start_date": "not-a-date"}
    )

    assert response.status_code == 400


def test_create_entry_success(logged_in_client, make_game):
    game = make_game(title="Hades")

    response = logged_in_client.post("/api/entries", json={"game_id": game.id, "status": "backlog"})

    assert response.status_code == 201
    body = response.get_json()
    assert body["status"] == "backlog"
    assert body["game"]["title"] == "Hades"


def test_create_completed_entry_records_leaderboard_and_activity(
    logged_in_client, make_game, redis_container
):
    game = make_game()

    response = logged_in_client.post(
        "/api/entries", json={"game_id": game.id, "status": "completed"}
    )

    assert response.status_code == 201
    from app.services.activity import get_recent_activity
    from app.services.leaderboards import get_completions_leaderboard

    app = logged_in_client.application
    with app.app_context():
        leaderboard = get_completions_leaderboard()
        activity = get_recent_activity(logged_in_client.user.id)

    user_id = str(logged_in_client.user.id)
    assert (user_id, 1.0) in leaderboard
    assert any(event["action"] == "completed" for event in activity)


def test_list_entries_scoped_to_current_user(logged_in_client, make_user, make_game):
    game = make_game()
    logged_in_client.post("/api/entries", json={"game_id": game.id})

    other_client = logged_in_client.application.test_client()
    other_user = make_user()
    with other_client.session_transaction() as sess:
        sess["_user_id"] = str(other_user.id)

    response = other_client.get("/api/entries")

    assert response.get_json()["results"] == []


def test_get_entry_not_found_for_other_users_entry(logged_in_client, make_user, make_game):
    game = make_game()
    created = logged_in_client.post("/api/entries", json={"game_id": game.id}).get_json()

    other_client = logged_in_client.application.test_client()
    other_user = make_user()
    with other_client.session_transaction() as sess:
        sess["_user_id"] = str(other_user.id)

    response = other_client.get(f"/api/entries/{created['id']}")

    assert response.status_code == 404


def test_update_entry_toggles_completion_leaderboard(logged_in_client, make_game):
    game = make_game()
    created = logged_in_client.post(
        "/api/entries", json={"game_id": game.id, "status": "backlog"}
    ).get_json()

    response = logged_in_client.patch(f"/api/entries/{created['id']}", json={"status": "completed"})
    assert response.status_code == 200

    from app.services.leaderboards import get_completions_leaderboard

    app = logged_in_client.application
    with app.app_context():
        leaderboard = get_completions_leaderboard()
    assert (str(logged_in_client.user.id), 1.0) in leaderboard

    response = logged_in_client.patch(f"/api/entries/{created['id']}", json={"status": "dropped"})
    assert response.status_code == 200

    with app.app_context():
        leaderboard = get_completions_leaderboard()
    assert (str(logged_in_client.user.id), 1.0) not in leaderboard


def test_update_entry_rating_refreshes_avg_rating_leaderboard(logged_in_client, make_game):
    game = make_game()
    created = logged_in_client.post("/api/entries", json={"game_id": game.id}).get_json()

    response = logged_in_client.patch(f"/api/entries/{created['id']}", json={"rating": 8})
    assert response.status_code == 200

    from app.services.leaderboards import get_avg_rating_leaderboard

    app = logged_in_client.application
    with app.app_context():
        leaderboard = get_avg_rating_leaderboard()
    assert (str(logged_in_client.user.id), 8.0) in leaderboard


def test_update_entry_not_found(logged_in_client):
    response = logged_in_client.patch("/api/entries/999999", json={"status": "completed"})

    assert response.status_code == 404


def test_delete_entry_reverses_completion_side_effect(logged_in_client, make_game):
    game = make_game()
    created = logged_in_client.post(
        "/api/entries", json={"game_id": game.id, "status": "completed"}
    ).get_json()

    response = logged_in_client.delete(f"/api/entries/{created['id']}")
    assert response.status_code == 204

    from app.services.leaderboards import get_completions_leaderboard

    app = logged_in_client.application
    with app.app_context():
        leaderboard = get_completions_leaderboard()
    assert (str(logged_in_client.user.id), 1.0) not in leaderboard

    assert logged_in_client.get(f"/api/entries/{created['id']}").status_code == 404


def test_delete_entry_not_found(logged_in_client):
    response = logged_in_client.delete("/api/entries/999999")

    assert response.status_code == 404
