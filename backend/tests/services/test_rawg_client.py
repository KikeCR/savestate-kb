from datetime import date

from app.services.rawg_client import normalize_rawg_game


def _raw_game(**overrides):
    defaults = {
        "id": 42,
        "name": "Hollow Knight",
        "background_image": "https://example.com/cover.jpg",
        "platforms": [
            {"platform": {"name": "PC"}},
            {"platform": {"name": "Switch"}},
        ],
        "genres": [{"name": "Metroidvania"}, {"name": "Platformer"}],
        "released": "2017-02-24",
    }
    defaults.update(overrides)
    return defaults


def test_normalize_maps_basic_fields():
    normalized = normalize_rawg_game(_raw_game())

    assert normalized["rawg_id"] == 42
    assert normalized["title"] == "Hollow Knight"
    assert normalized["cover_image_url"] == "https://example.com/cover.jpg"
    assert normalized["release_date"] == date(2017, 2, 24)


def test_normalize_dedupes_and_sorts_platforms_and_genres():
    raw = _raw_game(
        platforms=[
            {"platform": {"name": "PC"}},
            {"platform": {"name": "PC"}},
            {"platform": {"name": "Switch"}},
        ],
        genres=[{"name": "Platformer"}, {"name": "Metroidvania"}, {"name": "Platformer"}],
    )

    normalized = normalize_rawg_game(raw)

    assert normalized["platforms"] == ["PC", "Switch"]
    assert normalized["genres"] == ["Metroidvania", "Platformer"]


def test_normalize_handles_missing_platforms_and_genres():
    raw = _raw_game(platforms=None, genres=None)

    normalized = normalize_rawg_game(raw)

    assert normalized["platforms"] == []
    assert normalized["genres"] == []


def test_normalize_handles_platform_entry_without_platform_key():
    raw = _raw_game(platforms=[{"platform": {"name": "PC"}}, {"platform": None}])

    normalized = normalize_rawg_game(raw)

    assert normalized["platforms"] == ["PC"]


def test_normalize_handles_missing_released_date():
    raw = _raw_game(released=None)

    normalized = normalize_rawg_game(raw)

    assert normalized["release_date"] is None


def test_normalize_handles_invalid_released_date():
    raw = _raw_game(released="not-a-date")

    normalized = normalize_rawg_game(raw)

    assert normalized["release_date"] is None
