import sqlite3
import bcrypt
import os

DATABASE_PATH = 'cricket_coach.db'

def reset_database():
    """Delete existing database and create a fresh one"""
    try:
        print("=== RESETTING DATABASE ===")
        
        # Delete existing database file if it exists
        if os.path.exists(DATABASE_PATH):
            os.remove(DATABASE_PATH)
            print(f"✅ Deleted existing database: {DATABASE_PATH}")
        else:
            print(f"ℹ️  No existing database found: {DATABASE_PATH}")
        
        # Create new database and tables
        conn = sqlite3.connect(DATABASE_PATH)
        cursor = conn.cursor()
        
        # Create users table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT UNIQUE NOT NULL,
                email TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        conn.commit()
        print("✅ Created fresh users table")
        
        # Create a test user
        test_username = "testuser"
        test_email = "test@example.com"
        test_password = "password123"
        
        print(f"📝 Creating test user: {test_username}")
        password_hash = bcrypt.hashpw(test_password.encode('utf-8'), bcrypt.gensalt())
        
        cursor.execute(
            'INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)',
            (test_username, test_email, password_hash.decode('utf-8'))
        )
        
        conn.commit()
        user_id = cursor.lastrowid
        print(f"✅ Test user created with ID: {user_id}")
        
        # Verify the user was created
        cursor.execute('SELECT COUNT(*) FROM users')
        user_count = cursor.fetchone()[0]
        print(f"📊 Total users in database: {user_count}")
        
        conn.close()
        
        print("\n🎉 Database reset completed successfully!")
        print(f"📋 Test user credentials:")
        print(f"   Username: {test_username}")
        print(f"   Email: {test_email}")
        print(f"   Password: {test_password}")
        print(f"\n🔗 Database file: {DATABASE_PATH}")
        
    except Exception as e:
        print(f"❌ Error resetting database: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    reset_database() 