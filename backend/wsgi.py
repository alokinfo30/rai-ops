from backend import create_app
from backend.startup import on_startup

app = create_app()
on_startup(app)