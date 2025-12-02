#!/usr/bin/env python3
import asyncio
import os
import sys

from hypercorn.asyncio import serve

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from hypercorn_config import create_hypercorn_config
from app.main import app


async def main():
    config = create_hypercorn_config()
    print("Starting ChordAI API with HTTP/2 support")
    print(f"Binding to: {config.bind}")
    if config.certfile:
        print(f"TLS enabled with certificate: {config.certfile}")
        print("HTTP/2 (h2) protocol available over HTTPS")
    else:
        print("Running without TLS - HTTP/2 requires HTTPS in browsers")
        print("For local development with HTTP/2, generate certificates:")
        print(
            "openssl req -x509 -newkey rsa:4096 -keyout key.pem -out cert.pem -days 365 -nodes"
        )

    await serve(app, config)


if __name__ == "__main__":
    asyncio.run(main())
