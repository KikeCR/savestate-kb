from datetime import datetime, timezone

from app.constants import ACTIVITY_ACTIONS
from app.extensions import db

_ACTION_LIST_SQL = ", ".join(f"'{action}'" for action in ACTIVITY_ACTIONS)


class Activity(db.Model):
    __tablename__ = "activities"
    __table_args__ = (
        db.Index("ix_activities_user_created", "user_id", "created_at"),
        db.CheckConstraint(f"action IN ({_ACTION_LIST_SQL})", name="ck_activities_action"),
    )

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False, index=True)
    game_id = db.Column(db.Integer, db.ForeignKey("games.id"), nullable=False, index=True)
    action = db.Column(db.String(20), nullable=False)
    rating = db.Column(db.Integer)
    year_played = db.Column(db.Integer)
    created_at = db.Column(
        db.DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc)
    )

    user = db.relationship("User")
    game = db.relationship("Game")

    def to_dict(self):
        return {
            "user_id": self.user_id,
            "username": self.user.username,
            "game_id": self.game_id,
            "game_title": self.game.title,
            "game_cover_image_url": self.game.cover_image_url,
            "action": self.action,
            "created_at": self.created_at.isoformat(),
            "rating": self.rating,
            "year_played": self.year_played,
        }
