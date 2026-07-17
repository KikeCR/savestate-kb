from datetime import datetime, timezone

from flask_login import UserMixin
from werkzeug.security import check_password_hash, generate_password_hash

from app.constants import DEFAULT_PROFILE_VISIBILITY, PROFILE_VISIBILITIES
from app.extensions import db, login_manager

_VISIBILITY_LIST_SQL = ", ".join(f"'{value}'" for value in PROFILE_VISIBILITIES)


class User(UserMixin, db.Model):
    __tablename__ = "users"
    __table_args__ = (
        db.CheckConstraint(
            f"profile_visibility IN ({_VISIBILITY_LIST_SQL})", name="ck_users_profile_visibility"
        ),
    )

    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(255), unique=True, nullable=False, index=True)
    username = db.Column(db.String(50), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(255), nullable=False)
    profile_visibility = db.Column(
        db.String(10), nullable=False, default=DEFAULT_PROFILE_VISIBILITY
    )
    created_at = db.Column(
        db.DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc)
    )

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)

    def to_public_dict(self):
        return {
            "id": self.id,
            "username": self.username,
            "profile_visibility": self.profile_visibility,
            "created_at": self.created_at.isoformat(),
        }

    def to_private_dict(self):
        data = self.to_public_dict()
        data["email"] = self.email
        return data


@login_manager.user_loader
def load_user(user_id):
    return db.session.get(User, int(user_id))
