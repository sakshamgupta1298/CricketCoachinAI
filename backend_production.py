#!/usr/bin/env python3
"""
Production-ready version of CrickCoach Backend
Optimized for server deployment without interactive terminal issues
"""

import os
import sys
import logging
from backend_script import app, init_database, initialize_models

# Configure logging for production
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('/var/log/crickcoach-backend.log'),
        logging.StreamHandler(sys.stdout)
    ]
)

logger = logging.getLogger(__name__)

def main():
    """Main function to start the production server"""
    try:
        logger.info("Starting CrickCoach Backend in production mode...")
        
        # Initialize database
        logger.info("Initializing database...")
        init_database()
        
        # Initialize models
        logger.info("Initializing AI models...")
        initialize_models()
        
        # Get port from environment or use default
        port = int(os.environ.get('FLASK_PORT', 3000))
        
        logger.info(f"Starting Flask server on port {port}...")
        
        # Start the Flask server in production mode
        app.run(
            debug=False,
            host='0.0.0.0',
            port=port,
            use_reloader=False,
            threaded=True
        )
        
    except Exception as e:
        logger.error(f"Failed to start server: {e}")
        sys.exit(1)

if __name__ == '__main__':
    main()
