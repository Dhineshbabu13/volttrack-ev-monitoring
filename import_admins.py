"""
Import Admin_list.xlsx into the PostgreSQL 'admins' table, with passwords
properly hashed using bcrypt (matching how your login endpoint checks them).

Before running:
1. pip install pandas psycopg2-binary openpyxl bcrypt
2. Put Admin_list.xlsx in the same folder as this script.
3. Update DB_CONFIG below with your real PostgreSQL password.
"""

import pandas as pd
import psycopg2
import bcrypt

DB_CONFIG = {
    "host": "localhost",
    "port": 5432,
    "dbname": "volttrack_db",
    "user": "postgres",
    "password": "Dhi@123",  # <-- change this
}

EXCEL_FILE = "Admin_list.xlsx"

df = pd.read_excel(EXCEL_FILE)
df.columns = [c.strip() for c in df.columns]  # clean up stray spaces in headers

print(f"Found {len(df)} admins in {EXCEL_FILE}")

conn = psycopg2.connect(**DB_CONFIG)
cur = conn.cursor()

for _, row in df.iterrows():
    admin_name = str(row["ADMIN NAME"]).strip()
    admin_id = str(row["ADMIN  ID"]).strip()
    plain_password = str(row["PASSWORD"]).strip()

    hashed = bcrypt.hashpw(plain_password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")

    cur.execute(
        """
        INSERT INTO admins (admin_id, admin_name, password_hash)
        VALUES (%s, %s, %s)
        ON CONFLICT (admin_id) DO UPDATE
        SET admin_name = EXCLUDED.admin_name,
            password_hash = EXCLUDED.password_hash
        """,
        (admin_id, admin_name, hashed),
    )
    print(f"Added/updated: {admin_name} ({admin_id})")

conn.commit()
cur.close()
conn.close()
print("Done! All admins imported with hashed passwords.")
