import sqlite3
import os
from pathlib import Path

def run_migrations():
    """
    Run all database migrations
    """
    # Get database path
    db_dir = Path(__file__).parent.parent.parent / "data"
    db_path = db_dir / "coinconductor.db"

    # Check if database exists
    if not db_path.exists():
        print("Database does not exist yet. Migrations will be applied when tables are created.")
        return

    # Connect to database
    conn = sqlite3.connect(str(db_path))
    cursor = conn.cursor()

    # Run migrations
    add_external_id_to_transactions(cursor)

    # Commit changes and close connection
    conn.commit()
    conn.close()

    print("Migrations completed successfully.")

def add_external_id_to_transactions(cursor):
    """
    Add external_id column to transactions table
    """
    # Check if column already exists
    cursor.execute("PRAGMA table_info(transactions)")
    columns = [column[1] for column in cursor.fetchall()]

    if "external_id" not in columns:
        print("Adding external_id column to transactions table...")
        cursor.execute("ALTER TABLE transactions ADD COLUMN external_id TEXT")
        print("Column added successfully.")
    else:
        print("external_id column already exists in transactions table.")

if __name__ == "__main__":
    run_migrations()