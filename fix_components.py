import os, re

for fname in sorted(os.listdir('components')):
    path = os.path.join('components', fname)
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Step 1: Replace control characters known to be corruptions
    content = content.replace('\x0c', 'f')
    content = content.replace('\x09', 't')
    
    # Step 2: Fix className expressions missing backticks
    new_lines = []
    for line in content.split('\n'):
        idx = line.find('className={')
        if idx != -1:
            rest = line[idx + len('className={'):]
            brace_depth = 1
            end_idx = -1
            for i, ch in enumerate(rest):
                if ch == '{':
                    brace_depth += 1
                elif ch == '}':
                    brace_depth -= 1
                    if brace_depth == 0:
                        end_idx = i
                        break
            if end_idx != -1:
                inner = rest[:end_idx]
                after = rest[end_idx:]
                if inner and not inner.startswith(("'", '\"', '`')):
                    if ' ' in inner or '-' in inner or '[' in inner or '/' in inner or ':' in inner:
                        if '?' not in inner:
                            # Use string concatenation to avoid f-string issues with backticks
                            replacement = 'className={' + '`' + inner + '`' + '}'
                            line = line[:idx] + replacement + after[1:]
        new_lines.append(line)
    content = '\n'.join(new_lines)
    
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)
    print('Fixed', fname)
