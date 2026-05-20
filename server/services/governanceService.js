/**
 * Governance Service - Track Orca governance proposals and their LP impact
 */

class GovernanceService {
  constructor(orcaIndexer) {
    this.indexer = orcaIndexer;
    this.proposals = [];
    this.generateMockProposals();
  }

  generateMockProposals() {
    this.proposals = [
      {
        id: 'ORCA-001',
        title: 'Add 0.02% fee tier for highly correlated pairs',
        status: 'ACTIVE',
        category: 'FEE_TIER',
        description: 'Introduce a 0.02% fee tier between 0.01% and 0.05% for pairs like SOL/stSOL, mSOL/SOL that have extremely tight price correlation.',
        lpImpact: {
          affectedPools: ['mSOL/SOL', 'SOL/stSOL', 'bSOL/SOL'],
          impactDirection: 'positive',
          impactLevel: 'high',
          reasoning: 'New tier would attract more arbitrage volume to correlated pools, increasing fees for existing LPs.',
        },
        voting: { for: 68, against: 12, abstain: 5, quorum: 85 },
        endsAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: 'ORCA-002',
        title: 'Reduce protocol fee from 0.05% to 0.03%',
        status: 'PENDING',
        category: 'PROTOCOL_FEE',
        description: 'Lower the protocol fee taken from each swap to make Orca more competitive with other DEXs.',
        lpImpact: {
          affectedPools: 'ALL',
          impactDirection: 'positive',
          impactLevel: 'medium',
          reasoning: 'Lower protocol fee means more swap volume, which means more fees for LPs despite slightly lower per-swap take.',
        },
        voting: { for: 45, against: 30, abstain: 10, quorum: 85 },
        endsAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: 'ORCA-003',
        title: 'Enable liquidity mining for new JUP-USDC pool',
        status: 'PASSED',
        category: 'INCENTIVES',
        description: 'Allocate ORCA token rewards to bootstrap liquidity in the new JUP-USDC 0.05% pool.',
        lpImpact: {
          affectedPools: ['JUP/USDC'],
          impactDirection: 'positive',
          impactLevel: 'very_high',
          reasoning: 'Liquidity mining rewards + trading fees = exceptional APR for early LPs.',
        },
        voting: { for: 92, against: 3, abstain: 2, quorum: 97 },
        endsAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        implementedAt: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: 'ORCA-004',
        title: 'Adjust tick spacing for 1.00% fee tier from 256 to 128',
        status: 'ACTIVE',
        category: 'TECHNICAL',
        description: 'Finer tick granularity for high-fee volatile pairs to improve capital efficiency.',
        lpImpact: {
          affectedPools: ['BONK/SOL', 'WIF/SOL'],
          impactDirection: 'neutral',
          impactLevel: 'low',
          reasoning: 'Most memecoin LPs already use wide ranges. Smaller tick spacing helps tight-range strategies.',
        },
        voting: { for: 55, against: 20, abstain: 15, quorum: 90 },
        endsAt: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: 'ORCA-005',
        title: 'Treasury diversification into SOL/USDC LP position',
        status: 'PENDING',
        category: 'TREASURY',
        description: 'Use 5% of Orca treasury to provide deep liquidity in SOL/USDC 0.05% pool.',
        lpImpact: {
          affectedPools: ['SOL/USDC'],
          impactDirection: 'positive',
          impactLevel: 'medium',
          reasoning: 'Protocol-owned liquidity reduces slippage, attracts more traders, benefits all LPs in the pool.',
        },
        voting: { for: 62, against: 18, abstain: 8, quorum: 88 },
        endsAt: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(),
      },
    ];
  }

  getProposals(status = null) {
    let result = this.proposals;
    if (status) {
      result = result.filter(p => p.status === status);
    }
    return result.sort((a, b) => new Date(b.endsAt) - new Date(a.endsAt));
  }

  getProposal(id) {
    return this.proposals.find(p => p.id === id);
  }

  getImpactForWallet(walletPositions) {
    const impacts = [];
    
    for (const proposal of this.proposals) {
      const affected = walletPositions.filter(pos => {
        if (proposal.lpImpact.affectedPools === 'ALL') return true;
        const pair = pos.token0_symbol + '/' + pos.token1_symbol;
        return proposal.lpImpact.affectedPools.some(p => pair.includes(p.split('/')[0]) || pair.includes(p.split('/')[1]));
      });
      
      if (affected.length > 0) {
        impacts.push({
          proposalId: proposal.id,
          title: proposal.title,
          status: proposal.status,
          yourPools: affected.map(a => a.token0_symbol + '/' + a.token1_symbol),
          impact: proposal.lpImpact,
          actionNeeded: proposal.status === 'ACTIVE' ? 'Consider voting' : 'Monitor outcome',
        });
      }
    }
    
    return impacts;
  }

  getGovernanceSummary() {
    const active = this.proposals.filter(p => p.status === 'ACTIVE').length;
    const pending = this.proposals.filter(p => p.status === 'PENDING').length;
    const passed = this.proposals.filter(p => p.status === 'PASSED').length;
    
    return {
      totalProposals: this.proposals.length,
      activeVotes: active,
      pending: pending,
      recentlyPassed: passed,
      yourParticipation: 'Connect wallet to see voting power',
      nextDeadline: this.proposals
        .filter(p => p.status === 'ACTIVE')
        .sort((a, b) => new Date(a.endsAt) - new Date(b.endsAt))[0]?.endsAt || null,
    };
  }
}

module.exports = { GovernanceService };
