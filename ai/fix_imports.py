"""
Quick script to fix relative imports in Focus Planner modules
"""
import os
import re

def fix_relative_imports(file_path):
    """Fix relative imports in a Python file"""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Replace relative imports with absolute imports
        content = re.sub(r'from \.([a-zA-Z_][a-zA-Z0-9_]*)', r'from \1', content)
        
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(content)
        
        print(f"✅ Fixed imports in {file_path}")
        return True
    except Exception as e:
        print(f"❌ Failed to fix {file_path}: {e}")
        return False

# List of files to fix
focus_files = [
    'focus_rubrics.py',
    'focus_validator.py', 
    'focus_rulesets.py',
    'focus_router.py',
    'focus_integration.py',
    'focus_whitelist.py'
]

fixed_count = 0
for file_name in focus_files:
    if fix_relative_imports(file_name):
        fixed_count += 1

print(f"\n🎯 Fixed relative imports in {fixed_count}/{len(focus_files)} files")
