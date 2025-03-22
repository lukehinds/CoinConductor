import sqlite3
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
    make_category_id_nullable(cursor)
    add_budget_tables(cursor)

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

def make_category_id_nullable(cursor):
    """
    Make category_id column nullable in transactions table

    Note: SQLite doesn't directly support altering column constraints,
    so we need to create a new table, copy the data, drop the old table,
    and rename the new table.
    """
    print("Making category_id nullable in transactions table...")

    # Check if table exists
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='transactions'")
    if not cursor.fetchone():
        print("Transactions table doesn't exist yet. Skipping migration.")
        return

    # Get current table schema
    cursor.execute("PRAGMA table_info(transactions)")
    columns = cursor.fetchall()

    # Check if transactions_new table exists and drop it if it does
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='transactions_new'")
    if cursor.fetchone():
        print("transactions_new table already exists. Dropping it...")
        cursor.execute("DROP TABLE transactions_new")
        print("Dropped transactions_new table.")

    # Create new table with the same schema but with category_id nullable
    create_table_sql = "CREATE TABLE transactions_new ("
    column_defs = []
    for column in columns:
        col_id, col_name, col_type, col_notnull, col_default, col_pk = column

        # Make category_id nullable
        if col_name == "category_id":
            col_notnull = 0  # 0 means nullable

        # Build column definition
        col_def = f"{col_name} {col_type}"
        if col_pk:
            col_def += " PRIMARY KEY"
        if col_notnull:
            col_def += " NOT NULL"
        if col_default is not None:
            col_def += f" DEFAULT {col_default}"

        column_defs.append(col_def)

    create_table_sql += ", ".join(column_defs) + ")"
    cursor.execute(create_table_sql)

    # Copy data from old table to new table
    cursor.execute("INSERT INTO transactions_new SELECT * FROM transactions")

    # Drop old table
    cursor.execute("DROP TABLE transactions")

    # Rename new table to original name
    cursor.execute("ALTER TABLE transactions_new RENAME TO transactions")

    print("Successfully made category_id nullable in transactions table.")

def add_budget_tables(cursor):
    """
    Add budget_periods and envelope_allocations tables, and add budget_period_id column to transactions table
    """
    print("Adding budget tables and columns...")

    # Check if budget_periods table exists
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='budget_periods'")
    if not cursor.fetchone():
        print("Creating budget_periods table...")
        cursor.execute("""
        CREATE TABLE budget_periods (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            start_date TIMESTAMP NOT NULL,
            end_date TIMESTAMP NOT NULL,
            total_income REAL DEFAULT 0.0,
            user_id INTEGER NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users (id)
        )
        """)
        print("budget_periods table created successfully.")
    else:
        print("budget_periods table already exists.")

    # Check if envelope_allocations table exists
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='envelope_allocations'")
    if not cursor.fetchone():
        print("Creating envelope_allocations table...")
        cursor.execute("""
        CREATE TABLE envelope_allocations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            allocated_amount REAL DEFAULT 0.0,
            category_id INTEGER NOT NULL,
            budget_period_id INTEGER NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP,
            FOREIGN KEY (category_id) REFERENCES categories (id),
            FOREIGN KEY (budget_period_id) REFERENCES budget_periods (id)
        )
        """)
        print("envelope_allocations table created successfully.")
    else:
        print("envelope_allocations table already exists.")

    # Check if budget_period_id column exists in transactions table
    cursor.execute("PRAGMA table_info(transactions)")
    columns = [column[1] for column in cursor.fetchall()]

    if "budget_period_id" not in columns:
        print("Adding budget_period_id column to transactions table...")
        cursor.execute("ALTER TABLE transactions ADD COLUMN budget_period_id INTEGER")
        print("Column added successfully.")
    else:
        print("budget_period_id column already exists in transactions table.")

if __name__ == "__main__":
    run_migrations()
