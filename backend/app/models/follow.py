from datetime import datetime, timezone

from app.extensions import db


class Follow(db.Model):
    __tablename__ = "follows"
    __table_args__ = (
        db.UniqueConstraint("follower_id", "followed_id", name="uq_follows_follower_followed"),
        db.CheckConstraint("follower_id != followed_id", name="ck_follows_no_self_follow"),
    )

    id = db.Column(db.Integer, primary_key=True)
    follower_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False, index=True)
    followed_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False, index=True)
    created_at = db.Column(
        db.DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc)
    )
