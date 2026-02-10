#!/usr/bin/env python3
"""
Script to check the number of users in the database and their analysis counts.
Usage: python check_user_count.py
"""

import sqlite3
import os
import glob
from datetime import datetime

DATABASE_PATH = 'cricket_coach.db'
UPLOAD_FOLDER = 'uploads'

def count_user_analyses(user_id):
    """Count the number of analyses for a specific user"""
    user_folder = os.path.join(UPLOAD_FOLDER, str(user_id))
    if not os.path.exists(user_folder):
        return 0
    
    # Count results_*.json files
    results_pattern = os.path.join(user_folder, 'results_*.json')
    results_files = glob.glob(results_pattern)
    return len(results_files)

def get_user_statistics():
    """Get user statistics from the database including individual user details"""
    if not os.path.exists(DATABASE_PATH):
        print(f"❌ Database file not found: {DATABASE_PATH}")
        return None
    
    try:
        conn = sqlite3.connect(DATABASE_PATH)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        # Get all users with their details
        cursor.execute('''
            SELECT id, username, email, created_at 
            FROM users 
            ORDER BY created_at DESC
        ''')
        all_users = cursor.fetchall()
        
        # Get user statistics
        total_users = len(all_users)
        
        # Users registered today
        cursor.execute('''
            SELECT COUNT(*) as today_count 
            FROM users 
            WHERE DATE(created_at) = DATE('now')
        ''')
        today_users = cursor.fetchone()['today_count']
        
        # Users registered this week
        cursor.execute('''
            SELECT COUNT(*) as week_count 
            FROM users 
            WHERE created_at >= datetime('now', '-7 days')
        ''')
        week_users = cursor.fetchone()['week_count']
        
        # Users registered this month
        cursor.execute('''
            SELECT COUNT(*) as month_count 
            FROM users 
            WHERE created_at >= datetime('now', '-30 days')
        ''')
        month_users = cursor.fetchone()['month_count']
        
        # Get oldest and newest user
        cursor.execute('SELECT MIN(created_at) as oldest, MAX(created_at) as newest FROM users')
        date_range = cursor.fetchone()
        
        # Count analyses for each user
        user_details = []
        total_analyses = 0
        for user in all_users:
            user_id = user['id']
            analysis_count = count_user_analyses(user_id)
            total_analyses += analysis_count
            user_details.append({
                'id': user_id,
                'username': user['username'],
                'email': user['email'],
                'created_at': user['created_at'],
                'analysis_count': analysis_count
            })
        
        conn.close()
        
        return {
            'total_users': total_users,
            'today_users': today_users,
            'week_users': week_users,
            'month_users': month_users,
            'oldest_user': date_range['oldest'],
            'newest_user': date_range['newest'],
            'user_details': user_details,
            'total_analyses': total_analyses
        }
        
    except sqlite3.Error as e:
        print(f"❌ Database error: {e}")
        return None
    except Exception as e:
        print(f"❌ Error: {e}")
        return None

def print_statistics(stats):
    """Print user statistics in a formatted way"""
    if not stats:
        return
    
    print("\n" + "=" * 80)
    print("📊 USER STATISTICS")
    print("=" * 80)
    print(f"\n👥 Total Users: {stats['total_users']}")
    print(f"📊 Total Analyses: {stats['total_analyses']}")
    print(f"📅 Registered Today: {stats['today_users']}")
    print(f"📆 Registered This Week: {stats['week_users']}")
    print(f"📆 Registered This Month: {stats['month_users']}")
    
    if stats['oldest_user']:
        print(f"\n📅 First User Registered: {stats['oldest_user']}")
    if stats['newest_user']:
        print(f"📅 Last User Registered: {stats['newest_user']}")
    
    # Print individual user details
    if stats['user_details']:
        print("\n" + "=" * 80)
        print("👤 USER DETAILS (Username | Analyses | Registered Date)")
        print("=" * 80)
        print(f"{'Username':<30} {'Analyses':<12} {'Registered':<20} {'Email':<30}")
        print("-" * 80)
        
        for user in stats['user_details']:
            username = user['username'][:28] if len(user['username']) > 28 else user['username']
            email = user['email'][:28] if len(user['email']) > 28 else user['email']
            created_date = user['created_at'][:19] if user['created_at'] else 'N/A'
            print(f"{username:<30} {user['analysis_count']:<12} {created_date:<20} {email:<30}")
        
        print("=" * 80)
    
    print("\n")

if __name__ == '__main__':
    print(f"🔍 Checking user statistics from database: {DATABASE_PATH}")
    stats = get_user_statistics()
    print_statistics(stats)

