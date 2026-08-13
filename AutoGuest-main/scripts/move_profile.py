import re
import os

file_path = 'pages/cliente/dashboard_cliente.html'

try:
    with open(file_path, 'r', encoding='latin-1') as f:
        content = f.read()
except Exception as e:
    print(f"Error reading file: {e}")
    exit(1)

# Identifier for the profile card
start_marker = '<div class="dashboard-card" onclick="window.location.href=\'perfil_cliente.html\'"'
# Identifier for what follows it (based on file inspection)
end_marker = '<script src="perfil-link.js"></script>'

start_idx = content.find(start_marker)
end_idx = content.find(end_marker)

if start_idx != -1 and end_idx != -1:
    # Extract the profile card HTML
    profile_html = content[start_idx:end_idx].strip()
    
    # Remove from original location
    # We remove from start_idx to end_idx
    new_content = content[:start_idx] + content[end_idx:]
    
    # Insert at the top of dashboard-content
    insert_marker = '<div class="dashboard-content">'
    if insert_marker in new_content:
        # Add a newline for clean formatting
        replacement = insert_marker + '\n' + '            ' + profile_html + '\n'
        new_content = new_content.replace(insert_marker, replacement)
        
        # Write back to file as UTF-8
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(new_content)
        print("Successfully moved profile card to top.")
    else:
        print("Error: Could not find <div class=\"dashboard-content\">")
else:
    print(f"Error: Could not locate profile card block. Start: {start_idx}, End: {end_idx}")
