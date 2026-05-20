import os
for fname in sorted(os.listdir('components')):
    path = os.path.join('components', fname)
    with open(path, 'r', encoding='utf-8') as f:
        lines = f.readlines()
    for i, line in enumerate(lines):
        stripped = line.strip()
        if stripped == 'className={' or stripped.endswith('className={'):
            # Show next 3 lines
            print(f'=== {fname} line {i+1}: {repr(line.rstrip())} ===')
            for j in range(i+1, min(i+4, len(lines))):
                print(f'  {j+1}: {repr(lines[j].rstrip())}')
