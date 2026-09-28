"""FastAPI backend for Ecommerce Operation Assistant."""

from fastapi import FastAPI

app = FastAPI(title="Ecommerce Operation Assistant API")


@app.get("/")
def health() -> dict[str, str]:
    return {"status": "ok"}
