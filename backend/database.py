"""
Database Connection & Query Abstraction Layer
==============================================
Provides a unified interface for executing parameterized queries, fetching dictionary
records, and managing transactions across MySQL and SQLite fallback.
"""

import os
import sqlite3
import pymysql
import pymysql.cursors
from contextlib import contextmanager

# Read config from environment or .env
env_file = os.path.join(os.path.dirname(__file__), '.env')
if os.path.exists(env_file):
    with open(env_file, 'r', encoding='utf-8') as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith('#') and '=' in line:
                k, v = line.split('=', 1)
                os.environ.setdefault(k.strip(), v.strip())

DB_HOST = os.getenv('DB_HOST', '127.0.0.1')
DB_PORT = int(os.getenv('DB_PORT', 3306))
DB_USER = os.getenv('DB_USER', 'root')
DB_PASSWORD = os.getenv('DB_PASSWORD', 'password')
DB_NAME = os.getenv('DB_NAME', 'spams_db')
ENABLE_SQLITE_FALLBACK = os.getenv('ENABLE_SQLITE_FALLBACK', 'true').lower() == 'true'
SQLITE_DB_PATH = os.path.join(os.path.dirname(__file__), os.getenv('SQLITE_DB_PATH', 'spams.db'))


def get_raw_connection():
    """Attempts MySQL connection, falling back to SQLite if unreachable."""
    try:
        conn = pymysql.connect(
            host=DB_HOST,
            port=DB_PORT,
            user=DB_USER,
            password=DB_PASSWORD,
            database=DB_NAME,
            charset='utf8mb4',
            cursorclass=pymysql.cursors.DictCursor,
            connect_timeout=2
        )
        return 'mysql', conn
    except Exception:
        if ENABLE_SQLITE_FALLBACK:
            conn = sqlite3.connect(SQLITE_DB_PATH)
            conn.row_factory = sqlite3.Row
            return 'sqlite', conn
        raise


def get_db_type():
    """Returns current active DB backend ('mysql' or 'sqlite')."""
    db_type, conn = get_raw_connection()
    conn.close()
    return db_type


def _normalize_query(sql: str, db_type: str) -> str:
    """Translates parameter placeholders (%s <-> ?) between MySQL and SQLite."""
    if db_type == 'sqlite':
        return sql.replace('%s', '?')
    else:
        # If sql uses ? replace with %s
        return sql.replace('?', '%s')


def query_all(sql: str, params=None):
    """Executes a SELECT query and returns a list of dictionaries."""
    db_type, conn = get_raw_connection()
    try:
        cursor = conn.cursor()
        norm_sql = _normalize_query(sql, db_type)
        cursor.execute(norm_sql, params or ())
        rows = cursor.fetchall()
        if db_type == 'sqlite':
            return [dict(row) for row in rows]
        return list(rows)
    finally:
        conn.close()


def query_one(sql: str, params=None):
    """Executes a SELECT query and returns a single dictionary or None."""
    db_type, conn = get_raw_connection()
    try:
        cursor = conn.cursor()
        norm_sql = _normalize_query(sql, db_type)
        cursor.execute(norm_sql, params or ())
        row = cursor.fetchone()
        if row is None:
            return None
        if db_type == 'sqlite':
            return dict(row)
        return dict(row)
    finally:
        conn.close()


def execute(sql: str, params=None) -> int:
    """Executes an INSERT, UPDATE, or DELETE query and returns lastrowid."""
    db_type, conn = get_raw_connection()
    try:
        cursor = conn.cursor()
        norm_sql = _normalize_query(sql, db_type)
        cursor.execute(norm_sql, params or ())
        conn.commit()
        return cursor.lastrowid
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def execute_many(sql: str, param_list) -> int:
    """Executes batch statements within a transaction."""
    if not param_list:
        return 0
    db_type, conn = get_raw_connection()
    try:
        cursor = conn.cursor()
        norm_sql = _normalize_query(sql, db_type)
        if db_type == 'mysql':
            cursor.executemany(norm_sql, param_list)
        else:
            cursor.executemany(norm_sql, param_list)
        conn.commit()
        return len(param_list)
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


@contextmanager
def transaction():
    """Transaction context manager ensuring commit on success and rollback on failure."""
    db_type, conn = get_raw_connection()
    cursor = conn.cursor()
    try:
        yield cursor, db_type
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()
