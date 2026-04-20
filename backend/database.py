from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import os

# Support test database path via environment variable
DATABASE_PATH = os.environ.get(
    "TEST_DB_PATH",
    os.path.join(
        os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
        "data",
        "scenarios.db"
    )
)

db_dir = os.path.dirname(DATABASE_PATH)
if db_dir:
    os.makedirs(db_dir, exist_ok=True)

SQLALCHEMY_DATABASE_URL = f"sqlite:///{DATABASE_PATH}"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False}
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    import backend.models  # noqa
    Base.metadata.create_all(bind=engine)
