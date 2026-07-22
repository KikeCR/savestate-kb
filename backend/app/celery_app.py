from celery import Celery
from flask import Flask, has_app_context

from app.config import Config
from app.extensions import db

# A minimal Flask app — NOT the full create_app() factory — just enough for
# tasks to use `db.session`/`current_app.config` inside an app context.
# Calling the full factory here would re-run init_redis() a second time in
# the same process, clobbering the shared app.extensions.redis_client global
# with an independent connection (pointed at base Config's REDIS_URL, not
# whichever app is otherwise active) — breaking Redis-backed features for
# any code that runs afterward, including the test suite's ephemeral
# container. No blueprints/CORS/Talisman/rate-limiter needed here either.
flask_app = Flask(__name__)
flask_app.config.from_object(Config)
db.init_app(flask_app)

celery = Celery(flask_app.import_name)
# Namespaced lookup: CELERY_BROKER_URL -> broker_url,
# CELERY_TASK_ALWAYS_EAGER -> task_always_eager, etc.
celery.config_from_object(flask_app.config, namespace="CELERY")
celery.conf.task_ignore_result = True


class ContextTask(celery.Task):
    def __call__(self, *args, **kwargs):
        # In CELERY_TASK_ALWAYS_EAGER tests, .delay() runs the task inline
        # from within a Flask view that's already inside its own (correctly
        # test-configured) app context — reuse that instead of pushing this
        # module's separate, differently-configured app context on top of it.
        if has_app_context():
            return self.run(*args, **kwargs)
        with flask_app.app_context():
            return self.run(*args, **kwargs)


celery.Task = ContextTask

# Imported for its side effect: registers the @celery.task-decorated functions
# in app/tasks.py with this celery instance. Must come after `celery` is
# fully constructed above, since app.tasks imports it back from here.
from app import tasks  # noqa: E402,F401
