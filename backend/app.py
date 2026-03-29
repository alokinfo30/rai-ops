from backend import create_app
from backend.migrations import run_migrations
from backend.startup import on_startup

if __name__ == "__main__":
    app = create_app()
    run_migrations(app)
    on_startup(app)
    app.run(host="0.0.0.0", port=5000, debug=True)