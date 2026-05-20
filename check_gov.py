with open('components/Governance.tsx', 'r', encoding='utf-8') as f:
    content = f.read()
print('Governance.tsx balance:')
print('  braces:', content.count('{'), 'vs', content.count('}'))
print('  parens:', content.count('('), 'vs', content.count(')'))
print('  brackets:', content.count('['), 'vs', content.count(']'))
lines = content.split('\n')
for i, line in enumerate(lines, 1):
    for ch in ['\x0c', '\x0d', '\x09', '\x0b']:
        if ch in line:
            print(f'  Line {i}: control char {repr(ch)} at {repr(line.strip())}')
