import uvicorn


def start_app() -> None:
    """Start the Uvicorn server."""
    uvicorn.run("main:app", host="127.0.0.1", port=3003, reload=True)


if __name__ == "__main__":
    start_app()
