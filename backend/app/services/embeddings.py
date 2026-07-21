from flask import current_app

_model = None
_model_name = None


def _get_model():
    # Lazy singleton: loading the ONNX model takes real time (and, on first
    # run, a HuggingFace download), so it happens on first embed call rather
    # than at import time — app boot and tests that never touch embeddings
    # stay fast.
    global _model, _model_name
    from fastembed import TextEmbedding

    model_name = current_app.config["EMBEDDING_MODEL_NAME"]
    if _model is None or _model_name != model_name:
        _model = TextEmbedding(model_name=model_name)
        _model_name = model_name
    return _model


def embed_texts(texts):
    if not texts:
        return []
    model = _get_model()
    return [vector.tolist() for vector in model.embed(texts)]


def embed_text(text):
    return embed_texts([text])[0]
