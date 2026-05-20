import os

fixes = {
    "components/Governance.tsx": (91, 92, "rounded-2xl border p-4 "),
    "components/VolumeAlerts.tsx": (84, 85, "rounded-2xl border p-4 "),
}

for path, (className_line, content_line, replacement_text) in fixes.items():
    with open(path, 'r', encoding='utf-8') as f:
        lines = f.readlines()
    idx_class = className_line - 1
    idx_content = content_line - 1
    indent = lines[idx_class][:len(lines[idx_class]) - len(lines[idx_class].lstrip())]
    # Use concatenation to avoid f-string issues with backtick
    fixed = indent + "className={`" + replacement_text + "`}" + "\n"
    new_lines = lines[:idx_class] + [fixed] + lines[idx_content+1:]
    with open(path, 'w', encoding='utf-8') as f:
        f.writelines(new_lines)
    print("Fixed", path)
