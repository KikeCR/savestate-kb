from datetime import datetime, timezone

from app.constants import FEEDBACK_SENTIMENTS
from app.extensions import db

_SENTIMENT_LIST_SQL = ", ".join(f"'{sentiment}'" for sentiment in FEEDBACK_SENTIMENTS)


class GameFeedback(db.Model):
    """A user's thumbs up/down on a game suggestion — current state, not an
    event log: liking then disliking the same game overwrites `sentiment`
    rather than adding a row, matching how UserGameEntry.rating/favorite work."""

    __tablename__ = "game_feedback"
    __table_args__ = (
        db.UniqueConstraint("user_id", "game_id", name="uq_game_feedback_user_game"),
        db.CheckConstraint(
            f"sentiment IN ({_SENTIMENT_LIST_SQL})",
            name="ck_game_feedback_sentiment",
        ),
    )

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False, index=True)
    game_id = db.Column(db.Integer, db.ForeignKey("games.id"), nullable=False, index=True)
    sentiment = db.Column(db.String(10), nullable=False)

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

    def to_dict(self):
        return {
            "id": self.id,
            "game_id": self.game_id,
            "sentiment": self.sentiment,
            "created_at": self.created_at.isoformat(),
            "updated_at": self.updated_at.isoformat(),
        }
