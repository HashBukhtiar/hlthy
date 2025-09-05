#!/usr/bin/env python3
"""
Load environment variables from the main .env file.
This helps the Flask app access Google Cloud credentials.
"""
import os
from pathlib import Path

def load_env_file(env_path=None):
    """Load environment variables from .env file."""
    if env_path is None:
        # Look for .env file in parent directory
        current_dir = Path(__file__).parent
        env_path = current_dir.parent / '.env'
    
    if not os.path.exists(env_path):
        print(f"No .env file found at {env_path}")
        return
    
    print(f"Loading environment variables from {env_path}")
    
    with open(env_path, 'r', encoding='utf-8') as file:
        for line_num, line in enumerate(file, 1):
            line = line.strip()
            
            # Skip empty lines and comments
            if not line or line.startswith('#'):
                continue
            
            # Parse KEY=VALUE format
            if '=' in line:
                key, value = line.split('=', 1)
                key = key.strip()
                value = value.strip()
                
                # Remove surrounding quotes if present
                if (value.startswith('"') and value.endswith('"')) or \
                   (value.startswith("'") and value.endswith("'")):
                    value = value[1:-1]
                
                # Convert escaped newlines to actual newlines for private keys
                if 'PRIVATE_KEY' in key:
                    value = value.replace('\\n', '\n')
                    # Remove any trailing comma and quotes that might be left over
                    if value.endswith(','):
                        value = value[:-1]
                    value = value.strip()
                    # Remove quotes around the private key if present
                    if value.startswith('"') and value.endswith('"'):
                        value = value[1:-1]
                
                # Set environment variable
                os.environ[key] = value
                
                # Don't print sensitive values
                if 'PRIVATE_KEY' in key or 'SECRET' in key:
                    print(f"  {key}=***")
                else:
                    print(f"  {key}={value}")

if __name__ == "__main__":
    load_env_file()
