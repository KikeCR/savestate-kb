from datetime import date, datetime, timezone

from sqlalchemy.dialects.postgresql import ARRAY

from app.extensions import db

STATUS_VALUES = ["backlog", "playing", "completed", "dropped", "replaying"]


class UserGameEntry(db.Model):
    __tablename__ = "user_game_entries"
    __table_args__ = (
        db.UniqueConstraint("user_id", "game_id", name="uq_user_game_entries_user_game"),
        db.CheckConstraint(
            "status IN ('backlog', 'playing', 'completed', 'dropped', 'replaying')",
            name="ck_user_game_entries_status",
        ),
        db.CheckConstraint(
            "rating IS NULL OR (rating >= 1 AND rating <= 10)",
            name="ck_user_game_entries_rating",
        ),
        db.CheckConstraint(
            "year_played IS NULL OR year_played >= 1970",
            name="ck_user_game_entries_year_played",
        ),
    )

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False, index=True)
    game_id = db.Column(db.Integer, db.ForeignKey("games.id"), nullable=False, index=True)

    status = db.Column(db.String(20), nullable=False, default="backlog")
    rating = db.Column(db.Integer)
    start_date = db.Column(db.Date)
    completion_date = db.Column(db.Date)
    # Coarser, independent alternative to completion_date: lets users log games
    # played before they started using this tracker without needing an exact date.
    year_played = db.Column(db.Integer)
    hours_played = db.Column(db.Float, nullable=False, default=0)
    notes = db.Column(db.Text)
    favorite = db.Column(db.Boolean, nullable=False, default=False)
    replay_count = db.Column(db.Integer, nullable=False, default=0)
    platform_played = db.Column(db.String(100))
    tags = db.Column(ARRAY(db.String), nullable=False, default=list)

    created_at = db.Column(
        db.DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc)
    )
    updated_at = db.Column(
        db.DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    game = db.relationship("Game")

    @property
    def effective_year(self):
        """The year a completion counts toward: year_played (an explicit,
        possibly backdated tag) takes priority over completion_date, since a
        user can set year_played after the fact to correct when they actually
        played something."""
        if self.year_played:
            return self.year_played
        if self.completion_date:
            return self.completion_date.year
        return date.today().year

    def to_dict(self):
        return {
            "id": self.id,
            "game": self.game.to_dict() if self.game else None,
            "status": self.status,
            "rating": self.rating,
            "start_date": self.start_date.isoformat() if self.start_date else None,
            "completion_date": self.completion_date.isoformat() if self.completion_date else None,
            "year_played": self.year_played,
            "hours_played": self.hours_played,
            "notes": self.notes,
            "favorite": self.favorite,
            "replay_count": self.replay_count,
            "platform_played": self.platform_played,
            "tags": self.tags or [],
            "created_at": self.created_at.isoformat(),
            "updated_at": self.updated_at.isoformat(),
        }
