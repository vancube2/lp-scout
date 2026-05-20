import os
for fname in os.listdir('components'):
    path = os.path.join('components', fname)
    with open(path, 'r', encoding='utf-8') as f:
        lines = f.readlines()
    first = lines[0] if lines else ''
    if first.startswith("use client';\n"):
        lines[0] = "\"use client';\n"
        with open(path, 'w', encoding='utf-8') as f:
            f.writelines(lines)
        print('Fixed', fname)
    else:
        print('OK', fname, repr(first[:40]))
