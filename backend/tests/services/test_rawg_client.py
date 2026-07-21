from datetime import date

from app.services.rawg_client import build_embedding_text, normalize_rawg_game


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
        "metacritic": 90,
        "rating": 4.4,
        "ratings_count": 6500,
        "tags": [{"name": "Difficult"}, {"name": "Atmospheric"}],
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


def test_normalize_maps_rating_metadata():
    normalized = normalize_rawg_game(_raw_game())

    assert normalized["metacritic"] == 90
    assert normalized["rawg_rating"] == 4.4
    assert normalized["rawg_ratings_count"] == 6500
    assert normalized["tags"] == ["Difficult", "Atmospheric"]


def test_normalize_handles_missing_rating_metadata():
    raw = _raw_game(metacritic=None, rating=None, ratings_count=None, tags=None)

    normalized = normalize_rawg_game(raw)

    assert normalized["metacritic"] is None
    assert normalized["rawg_rating"] is None
    assert normalized["rawg_ratings_count"] is None
    assert normalized["tags"] == []


def test_normalize_caps_tags_to_max_per_game():
    raw = _raw_game(tags=[{"name": f"Tag {i}"} for i in range(20)])

    normalized = normalize_rawg_game(raw)

    assert len(normalized["tags"]) == 8


def test_normalize_skips_tags_without_a_name():
    raw = _raw_game(tags=[{"name": "Difficult"}, {"id": 1}])

    normalized = normalize_rawg_game(raw)

    assert normalized["tags"] == ["Difficult"]


def test_build_embedding_text_includes_all_available_fields():
    normalized = normalize_rawg_game(_raw_game())

    text = build_embedding_text(normalized)

    assert "Hollow Knight" in text
    assert "Genres: Metroidvania, Platformer." in text
    assert "Tags: Difficult, Atmospheric." in text
    assert "Platforms: PC, Switch." in text
    assert "Metacritic: 90." in text


def test_build_embedding_text_omits_empty_fields():
    normalized = normalize_rawg_game(
        _raw_game(genres=None, tags=None, platforms=None, metacritic=None)
    )

    text = build_embedding_text(normalized)

    assert text == "Hollow Knight"
