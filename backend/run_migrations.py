#!/usr/bin/env python3
"""
Script to run database migrations manually
"""
from app.db.migrations import run_migrations

if __name__ == "__main__":
    print("Running database migrations...")
    run_migrations()
    print("Done!") 