import os

# Fix all components by replacing broken URLs with quoted strings
files = [
    'components/TokenLaunch.tsx',
    'components/Migration.tsx',
    'components/VolumeAlerts.tsx',
    'components/Leaderboard.tsx',
    'components/Governance.tsx',
    'components/MultiWallet.tsx'
]

for f in files:
    with open(f, 'r', encoding='utf-8') as fh:
        c = fh.read()
    
    # Fix the common issue: URLs without quotes around them
    # e.g., fetch(http://localhost:4000/...) should be fetch(`http://localhost:4000/...`)
    # But this is complex. Instead, let me identify the pattern.
    
    # The simplest fix: find lines with fetch( followed by http:// without backticks
    import re
    
    # Replace fetch(http://... with fetch(`http://...`) where appropriate
    # Pattern: fetch\((http://[^\s)]+) -> fetch(`$1`)
    c = re.sub(r'fetch\((http://[^\s)]+)\)', r'fetch(`\1`)', c)
    
    # Also fix template literals that lost their backticks
    # Pattern: fetch(`...${...}...) that became fetch(...${...}...)
    # This is harder. Let me look for specific broken patterns.
    
    # Fix: = http://localhost:4000/api/leaderboard?sortBy=&limit=20);
    # Should be = `http://localhost:4000/api/leaderboard?sortBy=${sortBy}&limit=20`);
    c = re.sub(r"= http://localhost:4000/api/leaderboard\?sortBy=&limit=20\);", r"= `http://localhost:4000/api/leaderboard?sortBy=${sortBy}&limit=20`);", c)
    
    # Fix: = http://localhost:4000/api/governance/proposals?status=;
    c = re.sub(r"= http://localhost:4000/api/governance/proposals\?status=;", r"= `http://localhost:4000/api/governance/proposals?status=${filter.toUpperCase()}`;", c)
    
    # Fix: fetch(http://localhost:4000/api/multiwallet/org//wallet
    c = re.sub(r"fetch\(http://localhost:4000/api/multiwallet/org//wallet", r"fetch(`http://localhost:4000/api/multiwallet/org/${org.id}/wallet`", c)
    
    # Fix: fetch(http://localhost:4000/api/volume/alerts
    c = re.sub(r"fetch\(http://localhost:4000/api/volume/alerts\)", r"fetch(`http://localhost:4000/api/volume/alerts`)", c)
    c = re.sub(r"fetch\(http://localhost:4000/api/volume/trends\?limit=10\)", r"fetch(`http://localhost:4000/api/volume/trends?limit=10`)", c)
    
    # Fix: fetch(http://localhost:4000/api/leaderboard/trending/list?limit=5)
    c = re.sub(r"fetch\(http://localhost:4000/api/leaderboard/trending/list\?limit=5\)", r"fetch(`http://localhost:4000/api/leaderboard/trending/list?limit=5`)", c)
    
    # Fix: fetch(http://localhost:4000/api/governance/summary)
    c = re.sub(r"fetch\(http://localhost:4000/api/governance/summary\)", r"fetch(`http://localhost:4000/api/governance/summary`)", c)
    
    # Fix: fetch(http://localhost:4000/api/multiwallet/org/${org.id}/portfolio)
    # This one might already be partially correct but missing backtick
    c = re.sub(r"fetch\(http://localhost:4000/api/multiwallet/org/\$\{org\.id\}/portfolio\)", r"fetch(`http://localhost:4000/api/multiwallet/org/${org.id}/portfolio`)", c)
    c = re.sub(r"fetch\(http://localhost:4000/api/multiwallet/org/\$\{orgId\}/portfolio\)", r"fetch(`http://localhost:4000/api/multiwallet/org/${orgId}/portfolio`)", c)
    c = re.sub(r"fetch\(http://localhost:4000/api/multiwallet/org/\$\{org\.id\}/compare\)", r"fetch(`http://localhost:4000/api/multiwallet/org/${org.id}/compare`)", c)
    c = re.sub(r"fetch\(http://localhost:4000/api/multiwallet/org/\$\{orgId\}/compare\)", r"fetch(`http://localhost:4000/api/multiwallet/org/${orgId}/compare`)", c)
    
    # Fix: `http://localhost:4000/api/volume/alerts/${id}`  might have lost backticks
    c = re.sub(r"fetch\(`http://localhost:4000/api/volume/alerts/\$\{id\}`\)", r"fetch(`http://localhost:4000/api/volume/alerts/${id}`)", c)
    c = re.sub(r"fetch\(http://localhost:4000/api/volume/alerts/\$\{id\}\)", r"fetch(`http://localhost:4000/api/volume/alerts/${id}`)", c)
    
    with open(f, 'w', encoding='utf-8') as fh:
        fh.write(c)
    
    print(f'Fixed {f}')

print('All fixes applied')
