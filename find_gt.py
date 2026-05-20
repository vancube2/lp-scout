with open("components/Governance.tsx", "r", encoding="utf-8") as f:
    lines = f.readlines()
for i, line in enumerate(lines, 1):
    stripped = line.rstrip("\r\n")
    # Find standalone > characters
    for idx, ch in enumerate(stripped):
        if ch == ">":
            # Check context
            before = stripped[max(0,idx-2):idx]
            after = stripped[idx+1:idx+3]
            # Skip if part of known patterns
            if stripped[idx-1:idx+1] in ["=>", ">=", "</", "/>"]:
                continue
            if stripped[idx:idx+2] == ">=":
                continue
            print(f"Line {i}: standalone > at context ...{repr(before)}>{repr(after)}...")
            print(f"  Full line: {repr(stripped)}")
