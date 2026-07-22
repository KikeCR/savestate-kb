from sqlalchemy import func

from app.constants import (
    CATALOG_MIN_METACRITIC,
    CATALOG_MIN_RATINGS_COUNT,
    HOME_POPULAR_MIN_DISTINCT_USERS,
    HOME_POPULAR_RESULT_LIMIT,
)
from app.extensions import db
from app.models.game import Game
from app.models.user_game_entry import UserGameEntry

_QUALITY_FLOOR = (Game.metacritic >= CATALOG_MIN_METACRITIC) | (
    Game.rawg_ratings_count >= CATALOG_MIN_RATINGS_COUNT
)


def _distinct_users_with_entries():
    return db.session.query(func.count(func.distinct(UserGameEntry.user_id))).scalar() or 0


def get_community_popular_games(exclude_game_ids=None, limit=HOME_POPULAR_RESULT_LIMIT):
    """Games ranked by how many players have added them to their library
    (favorites count as a tiebreaker) — cross-user signal, distinct from any
    single player's taste. Returns Game rows, most-added first.
    """
    query = db.session.query(UserGameEntry.game_id).group_by(UserGameEntry.game_id)
    if exclude_game_ids:
        query = query.filter(UserGameEntry.game_id.notin_(exclude_game_ids))
    rows = (
        query.order_by(
            func.count(UserGameEntry.id).desc(),
            func.sum(UserGameEntry.favorite.cast(db.Integer)).desc(),
        )
        .limit(limit)
        .all()
    )

    ordered_ids = [row.game_id for row in rows]
    if not ordered_ids:
        return []
    games_by_id = {game.id: game for game in Game.query.filter(Game.id.in_(ordered_ids)).all()}
    return [games_by_id[game_id] for game_id in ordered_ids if game_id in games_by_id]


def get_critically_acclaimed_games(exclude_game_ids=None, limit=HOME_POPULAR_RESULT_LIMIT):
    """Top catalog games by Metacritic/RAWG rating volume — available even
    with zero platform users, since it only depends on the synced catalog.
    """
    query = Game.query.filter(_QUALITY_FLOOR)
    if exclude_game_ids:
        query = query.filter(Game.id.notin_(exclude_game_ids))
    return (
        query.order_by(Game.metacritic.desc().nullslast(), Game.rawg_ratings_count.desc())
        .limit(limit)
        .all()
    )


def get_popular_games(exclude_game_ids=None, limit=HOME_POPULAR_RESULT_LIMIT):
    """The homepage's blended popularity view: community picks (if there's
    enough cross-user signal to be meaningful) plus critically-acclaimed
    catalog picks, with no game repeated across the two lists.
    """
    exclude_game_ids = set(exclude_game_ids or ())
    community_available = _distinct_users_with_entries() >= HOME_POPULAR_MIN_DISTINCT_USERS

    community_games = (
        get_community_popular_games(exclude_game_ids, limit) if community_available else []
    )
    acclaimed_exclude = exclude_game_ids | {game.id for game in community_games}
    acclaimed_games = get_critically_acclaimed_games(acclaimed_exclude, limit)

    return {
        "community_available": community_available,
        "community": [game.to_dict() for game in community_games],
        "critics": [game.to_dict() for game in acclaimed_games],
    }
