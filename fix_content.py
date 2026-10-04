import os
import re

directory = 'web-dashboard/src'
pattern = re.compile(r'([a-zA-Z0-9_]+)\?\.content')

count = 0
for root, _, files in os.walk(directory):
    for f in files:
        if f.endswith('.tsx') or f.endswith('.ts'):
            filepath = os.path.join(root, f)
            with open(filepath, 'r', encoding='utf-8') as file:
                content = file.read()
            
            new_content = pattern.sub(r'(Array.isArray(\1) ? \1 : (\1?.content))', content)
            
            if new_content != content:
                with open(filepath, 'w', encoding='utf-8') as file:
                    file.write(new_content)
                print(f"Updated {filepath}")
                count += 1
print(f"Total updated files: {count}")
