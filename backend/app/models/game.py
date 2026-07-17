from datetime import datetime, timezone

from sqlalchemy.dialects.postgresql import ARRAY

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

    def to_dict(self):
        return {
            "id": self.id,
            "rawg_id": self.rawg_id,
            "title": self.title,
            "cover_image_url": self.cover_image_url,
            "platforms": self.platforms or [],
            "genres": self.genres or [],
            "release_date": self.release_date.isoformat() if self.release_date else None,
        }
