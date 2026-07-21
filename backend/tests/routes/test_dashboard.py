from datetime import datetime, timedelta, timezone

import pytest

pytestmark = pytest.mark.integration


def test_summary_requires_authentication(client):
    response = client.get("/api/dashboard/summary")

    assert response.status_code == 401


def test_summary_returns_zero_state_for_new_user(logged_in_client):
    response = logged_in_client.get("/api/dashboard/summary")

    assert response.status_code == 200
    body = response.get_json()
    assert body["status_counts"] == {
        "backlog": 0,
        "playing": 0,
        "completed": 0,
        "dropped": 0,
        "replaying": 0,
    }
    assert body["completed_this_year"] == 0
    assert body["total_hours_played"] == 0
    assert body["currently_playing"] == []


def test_summary_reflects_status_counts(logged_in_client, make_game, make_entry):
    user = logged_in_client.user
    make_entry(user, make_game(), status="backlog")
    make_entry(user, make_game(), status="playing")
    make_entry(user, make_game(), status="playing")
    make_entry(user, make_game(), status="completed")

    response = logged_in_client.get("/api/dashboard/summary")

    body = response.get_json()
    assert body["status_counts"]["backlog"] == 1
    assert body["status_counts"]["playing"] == 2
    assert body["status_counts"]["completed"] == 1


def test_summary_sums_hours_played(logged_in_client, make_game, make_entry):
    user = logged_in_client.user
    make_entry(user, make_game(), hours_played=10.5)
    make_entry(user, make_game(), hours_played=5.25)

    response = logged_in_client.get("/api/dashboard/summary")

    assert response.get_json()["total_hours_played"] == 15.75


def test_summary_completed_this_year_only_counts_current_year(
    logged_in_client, make_game, make_entry
):
    user = logged_in_client.user
    current_year = datetime.now(timezone.utc).year
    make_entry(user, make_game(), status="completed", year_played=current_year)
    make_entry(user, make_game(), status="completed", year_played=current_year - 5)

    response = logged_in_client.get("/api/dashboard/summary")

    assert response.get_json()["completed_this_year"] == 1


def test_summary_currently_playing_ordered_by_recency(logged_in_client, make_game, make_entry):
    user = logged_in_client.user
    older_game = make_game(title="Older")
    newer_game = make_game(title="Newer")
    now = datetime.now(timezone.utc)
    make_entry(user, older_game, status="playing", updated_at=now - timedelta(days=5))
    make_entry(user, newer_game, status="playing", updated_at=now)

    response = logged_in_client.get("/api/dashboard/summary")

    titles = [entry["game"]["title"] for entry in response.get_json()["currently_playing"]]
    assert titles == ["Newer", "Older"]


def test_summary_currently_playing_limited_to_five(logged_in_client, make_game, make_entry):
    user = logged_in_client.user
    for _ in range(6):
        make_entry(user, make_game(), status="playing")

    response = logged_in_client.get("/api/dashboard/summary")

    assert len(response.get_json()["currently_playing"]) == 5


def test_summary_only_includes_current_users_own_entries(
    logged_in_client, make_user, make_game, make_entry
):
    other_user = make_user()
    make_entry(other_user, make_game(), status="playing", hours_played=100)

    response = logged_in_client.get("/api/dashboard/summary")

    body = response.get_json()
    assert body["status_counts"]["playing"] == 0
    assert body["total_hours_played"] == 0
    assert body["currently_playing"] == []
