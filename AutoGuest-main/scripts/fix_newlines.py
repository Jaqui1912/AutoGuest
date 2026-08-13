"""
Fix literal \\n characters in pg_migration.sql that are outside SQL string literals.
These cause syntax errors in PostgreSQL/Supabase.
"""

def fix_sql_newlines(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    result = []
    i = 0
    in_string = False
    
    while i < len(content):
        ch = content[i]
        
        if in_string:
            if ch == "'":
                # Check for escaped quote ''
                if i + 1 < len(content) and content[i + 1] == "'":
                    result.append("''")
                    i += 2
                    continue
                else:
                    in_string = False
                    result.append(ch)
                    i += 1
                    continue
            elif ch == '\\' and i + 1 < len(content) and content[i + 1] == "'":
                # Escaped quote with backslash
                result.append(ch)
                i += 1
                continue
            else:
                result.append(ch)
                i += 1
                continue
        else:
            # Not in a string
            if ch == "'":
                in_string = True
                result.append(ch)
                i += 1
                continue
            elif ch == '\\' and i + 1 < len(content) and content[i + 1] == 'n':
                # Literal \n outside of string -> replace with actual newline
                result.append('\n')
                i += 2
                continue
            else:
                result.append(ch)
                i += 1
                continue
    
    new_content = ''.join(result)
    
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(new_content)
    
    replaced = len(content) - len(new_content)
    # Count how many \n we replaced (each replacement removes 1 char: \n -> \n is same length but...)
    count_before = content.count('\\n')
    count_after = new_content.count('\\n')
    print(f"Literal \\n before: {count_before}")
    print(f"Literal \\n after: {count_after}")
    print(f"Replaced {count_before - count_after} occurrences outside SQL strings")

fix_sql_newlines(r'c:\AutoGuest-3.05-master\pg_migration.sql')
