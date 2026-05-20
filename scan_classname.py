import os, re
for fname in sorted(os.listdir('components')):
    path = os.path.join('components', fname)
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()
    lines = content.split('\n')
    for i, line in enumerate(lines, 1):
        m = re.search(r"className=\{([^'\"`][A-Za-z0-9\s\-\[\]#/._:=\(\)\?\+\*\|\\\u0026\u003c\u003e%!]*)\}", line)
        if m:
            print(f'{fname}:{i}: {repr(line.strip())}')
