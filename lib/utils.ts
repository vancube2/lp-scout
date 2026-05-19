export function formatCurrency(value: number, decimals = 2): string {
  if (value >= 1_000_000_000) {
    return '$' + (value / 1_000_000_000).toFixed(decimals) + 'B';
  }
  if (value >= 1_000_000) {
    return '$' + (value / 1_000_000).toFixed(decimals) + 'M';
  }
  if (value >= 1_000) {
    return '$' + (value / 1_000).toFixed(decimals) + 'K';
  }
  return '$' + value.toFixed(decimals);
}

export function formatPercent(value: number, decimals = 2): string {
  const sign = value >= 0 ? '+' : '';
  return sign + value.toFixed(decimals) + '%';
}

export function formatDPR(value: number): string {
  return (value * 100).toFixed(2) + '%';
}

export function truncateAddress(address: string, start = 4, end = 4): string {
  if (!address) return '';
  if (address.length <= start + end) return address;
  return address.slice(0, start) + '...' + address.slice(-end);
}

export function getAgentScoreColor(score: number): string {
  if (score >= 1) return 'text-green-500';
  if (score >= 0.5) return 'text-yellow-500';
  return 'text-red-500';
}

export function getPNLColor(pnl: number): string {
  return pnl >= 0 ? 'text-green-500' : 'text-red-500';
}

export function getSolscanLink(txHash: string): string {
  return 'https://solscan.io/tx/' + txHash;
}

export function formatAge(days: number): string {
  if (days < 1) {
    const hours = Math.round(days * 24);
    return hours + 'h';
  }
  if (days < 30) {
    return Math.round(days) + 'd';
  }
  const months = Math.round(days / 30);
  return months + 'mo';
}

export function formatFeeRate(feeRate: number): string {
  return (feeRate * 100).toFixed(2) + '%';
}

export function getTickRangeLabel(tickLower: number, tickUpper: number): string {
  if (Math.abs(tickUpper - tickLower) > 100000) return 'Full Range';
  if (Math.abs(tickUpper - tickLower) > 20000) return 'Wide';
  if (Math.abs(tickUpper - tickLower) > 5000) return 'Moderate';
  return 'Narrow';
}

export function getOrcaPoolLink(poolAddress: string): string {
  return 'https://orca.so/pools/' + poolAddress;
}

export function getOrcaPositionLink(positionMint: string): string {
  return 'https://solscan.io/account/' + positionMint;
}