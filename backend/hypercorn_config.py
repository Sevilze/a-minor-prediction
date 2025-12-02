import os
from hypercorn.config import Config


def create_hypercorn_config() -> Config:
    config = Config()

    config.bind = [os.environ.get("BIND", "0.0.0.0:8000")]

    config.alpn_protocols = ["h2", "http/1.1"]

    ssl_certfile = os.environ.get("SSL_CERTFILE")
    ssl_keyfile = os.environ.get("SSL_KEYFILE")

    if (
        ssl_certfile
        and ssl_keyfile
        and os.path.exists(ssl_certfile)
        and os.path.exists(ssl_keyfile)
    ):
        config.certfile = ssl_certfile
        config.keyfile = ssl_keyfile
        config.insecure_bind = []

    config.workers = int(os.environ.get("WORKERS", 1))

    config.accesslog = "-"
    config.errorlog = "-"
    config.loglevel = os.environ.get("LOG_LEVEL", "info").lower()

    config.graceful_timeout = 30.0
    config.shutdown_timeout = 30.0

    config.keep_alive_timeout = 65

    config.h2_max_concurrent_streams = 100
    config.h2_max_header_list_size = 16 * 1024
    config.h2_max_inbound_frame_size = 16 * 1024

    return config
