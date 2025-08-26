#!/usr/bin/env python3
"""
COMPREHENSIVE FOCUS PLANNER CODE AUDIT
=====================================
This script performs a thorough audit of all Focus Planner modules
to identify and fix any production readiness issues.
"""
import os
import ast
import sys
from pathlib import Path

print("🔍 COMPREHENSIVE FOCUS PLANNER CODE AUDIT")
print("=" * 50)

# List all Focus Planner modules
focus_modules = [
    'focus_rules.py',
    'focus_whitelist.py', 
    'focus_composer.py',
    'focus_rubrics.py',
    'focus_validator.py',
    'focus_rulesets.py',
    'focus_router.py',
    'focus_integration.py'
]

audit_results = {}

for module in focus_modules:
    print(f"\n📄 Auditing {module}...")
    
    try:
        # Read the module
        with open(module, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Parse AST to check for syntax errors
        try:
            tree = ast.parse(content)
            syntax_ok = True
        except SyntaxError as e:
            syntax_ok = False
            syntax_error = str(e)
        
        # Check imports
        imports = []
        relative_imports = []
        
        for line in content.split('\n'):
            line = line.strip()
            if line.startswith('from ') and ' import ' in line:
                imports.append(line)
                if line.startswith('from .') or line.startswith('from ..'):
                    relative_imports.append(line)
            elif line.startswith('import '):
                imports.append(line)
        
        # Check for common issues
        issues = []
        
        # Check for hardcoded paths
        if 'C:\\' in content or '/Users/' in content:
            issues.append("Contains hardcoded paths")
        
        # Check for print statements (should use logging)
        print_statements = content.count('print(')
        if print_statements > 5:
            issues.append(f"Many print statements ({print_statements})")
        
        # Check for TODO/FIXME comments
        todo_count = content.upper().count('TODO') + content.upper().count('FIXME')
        if todo_count > 0:
            issues.append(f"Contains {todo_count} TODO/FIXME comments")
        
        # Check for exception handling
        try_count = content.count('try:')
        except_count = content.count('except')
        if try_count != except_count:
            issues.append("Mismatched try/except blocks")
        
        # Check docstring coverage
        functions = [node for node in ast.walk(tree) if isinstance(node, ast.FunctionDef)]
        classes = [node for node in ast.walk(tree) if isinstance(node, ast.ClassDef)]
        
        undocumented_functions = []
        for func in functions:
            if not ast.get_docstring(func):
                undocumented_functions.append(func.name)
        
        undocumented_classes = []
        for cls in classes:
            if not ast.get_docstring(cls):
                undocumented_classes.append(cls.name)
        
        # Store audit results
        audit_results[module] = {
            'syntax_ok': syntax_ok,
            'syntax_error': syntax_error if not syntax_ok else None,
            'line_count': len(content.split('\n')),
            'imports': len(imports),
            'relative_imports': len(relative_imports),
            'issues': issues,
            'functions': len(functions),
            'classes': len(classes),
            'undocumented_functions': undocumented_functions,
            'undocumented_classes': undocumented_classes,
            'print_statements': print_statements,
            'try_blocks': try_count
        }
        
        # Print summary
        status = "✅ CLEAN" if not issues and syntax_ok else "⚠️  ISSUES FOUND"
        print(f"   Status: {status}")
        print(f"   Lines: {audit_results[module]['line_count']}")
        print(f"   Functions: {len(functions)} (undocumented: {len(undocumented_functions)})")
        print(f"   Classes: {len(classes)} (undocumented: {len(undocumented_classes)})")
        
        if issues:
            for issue in issues:
                print(f"   ⚠️  {issue}")
        
        if relative_imports:
            print(f"   ⚠️  {len(relative_imports)} relative imports")
            
    except FileNotFoundError:
        print(f"   ❌ FILE NOT FOUND")
        audit_results[module] = {'error': 'File not found'}
    except Exception as e:
        print(f"   ❌ ERROR: {e}")
        audit_results[module] = {'error': str(e)}

# Summary report
print(f"\n" + "="*50)
print("📊 AUDIT SUMMARY")
print("="*50)

total_lines = sum(r.get('line_count', 0) for r in audit_results.values())
total_functions = sum(r.get('functions', 0) for r in audit_results.values())
total_classes = sum(r.get('classes', 0) for r in audit_results.values())
total_issues = sum(len(r.get('issues', [])) for r in audit_results.values())

print(f"📈 Total code: {total_lines} lines")
print(f"🔧 Total functions: {total_functions}")
print(f"🏗️  Total classes: {total_classes}")
print(f"⚠️  Total issues: {total_issues}")

if total_issues > 0:
    print(f"\n🚨 PRODUCTION READINESS: NOT READY - {total_issues} issues to fix")
else:
    print(f"\n✅ PRODUCTION READINESS: READY")

print(f"\nNext steps:")
print(f"1. Fix all identified issues")
print(f"2. Add missing docstrings")
print(f"3. Replace print statements with logging")
print(f"4. Run comprehensive tests")
print(f"5. Performance optimization")
