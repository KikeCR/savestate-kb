import numpy as np
import pytest
from flask import Flask

from app.constants import EMBEDDING_DIMENSIONS

# Deliberately not using the shared `app` fixture from conftest.py: that
# fixture provisions real Postgres/Redis testcontainers via create_app(), but
# this module only needs a Flask app context for current_app.config lookups —
# using a bare Flask app here keeps these true fast/no-Docker unit tests.


class _FakeTextEmbedding:
    """Stands in for fastembed.TextEmbedding so unit tests don't need to
    download the real ONNX model or hit the network. Returns deterministic,
    correctly-shaped vectors — good enough to test our wrapper's contract
    (lazy singleton, shape/dimension, list-of-texts in/out) without asserting
    anything about real embedding quality."""

    instances = 0

    def __init__(self, model_name):
        self.model_name = model_name
        _FakeTextEmbedding.instances += 1

    def embed(self, texts):
        for i, _ in enumerate(texts):
            yield np.full(EMBEDDING_DIMENSIONS, fill_value=float(i))


@pytest.fixture()
def minimal_app():
    flask_app = Flask(__name__)
    flask_app.config["EMBEDDING_MODEL_NAME"] = "BAAI/bge-small-en-v1.5"
    return flask_app


@pytest.fixture(autouse=True)
def _reset_singleton():
    import app.services.embeddings as embeddings_module

    embeddings_module._model = None
    embeddings_module._model_name = None
    _FakeTextEmbedding.instances = 0
    yield
    embeddings_module._model = None
    embeddings_module._model_name = None


@pytest.fixture(autouse=True)
def _patch_fastembed(monkeypatch):
    import fastembed

    monkeypatch.setattr(fastembed, "TextEmbedding", _FakeTextEmbedding)


def test_embed_text_returns_vector_of_configured_dimension(minimal_app):
    from app.services.embeddings import embed_text

    with minimal_app.app_context():
        vector = embed_text("Hollow Knight — Genres: Metroidvania, Platformer.")

    assert isinstance(vector, list)
    assert len(vector) == EMBEDDING_DIMENSIONS


def test_embed_texts_returns_one_vector_per_input(minimal_app):
    from app.services.embeddings import embed_texts

    with minimal_app.app_context():
        vectors = embed_texts(["Game A", "Game B", "Game C"])

    assert len(vectors) == 3
    assert all(len(v) == EMBEDDING_DIMENSIONS for v in vectors)


def test_embed_texts_handles_empty_list(minimal_app):
    from app.services.embeddings import embed_texts

    with minimal_app.app_context():
        assert embed_texts([]) == []


def test_model_is_loaded_lazily_and_reused_across_calls(minimal_app):
    from app.services.embeddings import embed_text

    with minimal_app.app_context():
        embed_text("first call")
        embed_text("second call")

    assert _FakeTextEmbedding.instances == 1
