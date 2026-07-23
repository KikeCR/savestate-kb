import pytest

from app.models.activity import Activity

pytestmark = pytest.mark.integration


def test_get_review_requires_authentication(client, make_game):
    game = make_game()

    response = client.get(f"/api/reviews/{game.id}")

    assert response.status_code == 401


def test_get_review_returns_404_when_none_exists(logged_in_client, make_game):
    game = make_game()

    response = logged_in_client.get(f"/api/reviews/{game.id}")

    assert response.status_code == 404


def test_get_review_returns_the_callers_own_review(logged_in_client, make_game):
    game = make_game()
    logged_in_client.post(
        "/api/entries", json={"game_id": game.id, "status": "completed", "rating": 7}
    )
    logged_in_client.put(f"/api/reviews/{game.id}", json={"body": "Solid."})

    response = logged_in_client.get(f"/api/reviews/{game.id}")

    assert response.status_code == 200
    assert response.get_json()["body"] == "Solid."


def test_put_review_requires_authentication(client, make_game):
    game = make_game()

    response = client.put(f"/api/reviews/{game.id}", json={"body": "Great game."})

    assert response.status_code == 401


def test_put_review_returns_404_for_unknown_game(logged_in_client):
    response = logged_in_client.put("/api/reviews/999999", json={"body": "Great game."})

    assert response.status_code == 404


def test_put_review_rejects_empty_body(logged_in_client, make_game):
    game = make_game()

    response = logged_in_client.put(f"/api/reviews/{game.id}", json={"body": "   "})

    assert response.status_code == 400


def test_put_review_rejects_body_over_max_length(logged_in_client, make_game):
    game = make_game()

    response = logged_in_client.put(f"/api/reviews/{game.id}", json={"body": "x" * 5001})

    assert response.status_code == 400


def test_put_review_returns_409_when_no_entry_exists(logged_in_client, make_game):
    game = make_game()

    response = logged_in_client.put(f"/api/reviews/{game.id}", json={"body": "Great game."})

    assert response.status_code == 409


def test_put_review_returns_409_when_entry_not_completed(logged_in_client, make_game):
    game = make_game()
    logged_in_client.post(
        "/api/entries", json={"game_id": game.id, "status": "playing", "rating": 8}
    )

    response = logged_in_client.put(f"/api/reviews/{game.id}", json={"body": "Great game."})

    assert response.status_code == 409


def test_put_review_returns_409_when_entry_completed_but_unrated(logged_in_client, make_game):
    game = make_game()
    logged_in_client.post("/api/entries", json={"game_id": game.id, "status": "completed"})

    response = logged_in_client.put(f"/api/reviews/{game.id}", json={"body": "Great game."})

    assert response.status_code == 409


def test_put_review_creates_review_when_entry_completed_and_rated(logged_in_client, make_game):
    game = make_game()
    logged_in_client.post(
        "/api/entries", json={"game_id": game.id, "status": "completed", "rating": 9}
    )

    response = logged_in_client.put(f"/api/reviews/{game.id}", json={"body": "Loved it."})

    assert response.status_code == 200
    body = response.get_json()
    assert body["body"] == "Loved it."
    assert body["rating"] == 9
    assert body["author"]["username"] == logged_in_client.user.username


def test_put_review_upserts_existing_review_body(logged_in_client, make_game):
    game = make_game()
    logged_in_client.post(
        "/api/entries", json={"game_id": game.id, "status": "completed", "rating": 9}
    )
    logged_in_client.put(f"/api/reviews/{game.id}", json={"body": "First draft."})

    response = logged_in_client.put(f"/api/reviews/{game.id}", json={"body": "Final version."})

    assert response.status_code == 200
    assert response.get_json()["body"] == "Final version."


def test_put_review_creation_records_activity_but_edit_does_not(logged_in_client, make_game, app):
    game = make_game()
    logged_in_client.post(
        "/api/entries", json={"game_id": game.id, "status": "completed", "rating": 9}
    )

    logged_in_client.put(f"/api/reviews/{game.id}", json={"body": "First draft."})
    logged_in_client.put(f"/api/reviews/{game.id}", json={"body": "Final version."})

    with app.app_context():
        reviewed_activities = Activity.query.filter_by(
            user_id=logged_in_client.user.id, game_id=game.id, action="reviewed"
        ).all()
    assert len(reviewed_activities) == 1


def test_review_persists_after_entry_rating_cleared(logged_in_client, make_game):
    game = make_game()
    created = logged_in_client.post(
        "/api/entries", json={"game_id": game.id, "status": "completed", "rating": 9}
    ).get_json()
    logged_in_client.put(f"/api/reviews/{game.id}", json={"body": "Loved it."})

    logged_in_client.patch(f"/api/entries/{created['id']}", json={"rating": None})

    response = logged_in_client.get(f"/api/games/{game.id}/reviews")
    results = response.get_json()["results"]
    assert len(results) == 1
    assert results[0]["body"] == "Loved it."
    assert results[0]["rating"] is None


def test_delete_review_requires_authentication(client, make_game):
    game = make_game()

    response = client.delete(f"/api/reviews/{game.id}")

    assert response.status_code == 401


def test_delete_review_is_a_no_op_when_no_row_exists(logged_in_client, make_game):
    game = make_game()

    response = logged_in_client.delete(f"/api/reviews/{game.id}")

    assert response.status_code == 204


def test_delete_review_removes_row(logged_in_client, make_game):
    game = make_game()
    logged_in_client.post(
        "/api/entries", json={"game_id": game.id, "status": "completed", "rating": 9}
    )
    logged_in_client.put(f"/api/reviews/{game.id}", json={"body": "Loved it."})

    response = logged_in_client.delete(f"/api/reviews/{game.id}")

    assert response.status_code == 204
    remaining = logged_in_client.get(f"/api/games/{game.id}/reviews").get_json()["results"]
    assert remaining == []
