from datetime import datetime, timezone

from app.extensions import db


class Review(db.Model):
    """A user's written review of a game — one per user per game, gated at
    write-time to games they've marked completed and rated (see
    app.routes.reviews). The rating shown alongside a review is always read
    live from the linked UserGameEntry rather than duplicated here, so it
    can never drift out of sync with the user's own library entry."""

    __tablename__ = "reviews"
    __table_args__ = (db.UniqueConstraint("user_id", "game_id", name="uq_reviews_user_game"),)

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False, index=True)
    game_id = db.Column(db.Integer, db.ForeignKey("games.id"), nullable=False, index=True)
    body = db.Column(db.Text, nullable=False)

    created_at = db.Column(
        db.DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc)
    )
    updated_at = db.Column(
        db.DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    user = db.relationship("User")
    game = db.relationship("Game")

    @property
    def entry_rating(self):
        from app.models.user_game_entry import UserGameEntry

        entry = UserGameEntry.query.filter_by(user_id=self.user_id, game_id=self.game_id).first()
        return entry.rating if entry else None

    def to_dict(self):
        return {
            "id": self.id,
            "game_id": self.game_id,
            "body": self.body,
            "rating": self.entry_rating,
            "author": self.user.to_public_dict(),
            "created_at": self.created_at.isoformat(),
            "updated_at": self.updated_at.isoformat(),
        }
