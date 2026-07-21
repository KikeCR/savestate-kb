from datetime import datetime, timezone

from pgvector.sqlalchemy import Vector
from sqlalchemy.dialects.postgresql import ARRAY

from app.constants import EMBEDDING_DIMENSIONS
from app.extensions import db


class Game(db.Model):
    __tablename__ = "games"

    id = db.Column(db.Integer, primary_key=True)
    rawg_id = db.Column(db.Integer, unique=True, nullable=False, index=True)
    title = db.Column(db.String(255), nullable=False, index=True)
    cover_image_url = db.Column(db.String(500))
    platforms = db.Column(ARRAY(db.String), nullable=False, default=list)
    genres = db.Column(ARRAY(db.String), nullable=False, default=list)
    release_date = db.Column(db.Date)
    created_at = db.Column(
        db.DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc)
    )

    # RAWG rating/metadata — used to identify "highly rated" games for the
    # recommendation candidate pool. metacritic is nullable since not every
    # RAWG game has one; rawg_ratings_count backs the recommendation catalog's
    # fallback popularity floor for games Metacritic never scored.
    metacritic = db.Column(db.Integer)
    rawg_rating = db.Column(db.Float)
    rawg_ratings_count = db.Column(db.Integer)
    tags = db.Column(ARRAY(db.String), nullable=False, default=list)

    # RAG retrieval fields. embedding_text is stored alongside the vector so
    # embeddings can be reproduced/debugged without recomputing the source
    # text from scratch. synced_at marks the last catalog_sync pass that
    # touched this row (distinct from created_at, which is set once).
    embedding_text = db.Column(db.Text)
    embedding = db.Column(Vector(EMBEDDING_DIMENSIONS))
    synced_at = db.Column(db.DateTime(timezone=True))

    def to_dict(self):
        return {
            "id": self.id,
            "rawg_id": self.rawg_id,
            "title": self.title,
            "cover_image_url": self.cover_image_url,
            "platforms": self.platforms or [],
            "genres": self.genres or [],
            "release_date": self.release_date.isoformat() if self.release_date else None,
            "metacritic": self.metacritic,
            "rawg_rating": self.rawg_rating,
            "tags": self.tags or [],
        }
