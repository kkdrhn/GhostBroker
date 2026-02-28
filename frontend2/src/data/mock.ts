import type { Agent, TradeEntry, Decision, Staker, LifecycleEvent, CommodityPrice, OrderBookEntry, StakePosition, OpenOrder } from '@/types';

const addr = (i: number) => `0x${i.toString(16).padStart(4, '0')}${'a'.repeat(36)}`.slice(0, 42);

export const MOCK_AGENTS: Agent[] = [
  { id: '1', name: 'PhantomAlpha', tier: 'ELITE', owner: addr(1), riskDNA: { riskAppetite: 82, strategy: 'aggressive', startingCapital: 5000 }, capital: 14200, maxCapital: 15000, winRate: 73.2, totalTrades: 847, profitFactor: 2.14, maxDrawdown: 18.3, avgTradeDuration: '4.2 blocks', reputation: 96, totalStaked: 42000, apyMultiplier: 2.4, createdAtBlock: 100200 },
  { id: '2', name: 'VoidRunner', tier: 'ACTIVE', owner: addr(2), riskDNA: { riskAppetite: 55, strategy: 'balanced', startingCapital: 3000 }, capital: 4800, maxCapital: 6000, winRate: 61.5, totalTrades: 523, profitFactor: 1.67, maxDrawdown: 22.1, avgTradeDuration: '6.8 blocks', reputation: 78, totalStaked: 18000, apyMultiplier: 1.8, createdAtBlock: 102400 },
  { id: '3', name: 'CryptoWraith', tier: 'ACTIVE', owner: addr(3), riskDNA: { riskAppetite: 40, strategy: 'conservative', startingCapital: 8000 }, capital: 9100, maxCapital: 10000, winRate: 58.9, totalTrades: 312, profitFactor: 1.42, maxDrawdown: 12.5, avgTradeDuration: '9.1 blocks', reputation: 82, totalStaked: 25000, apyMultiplier: 1.5, createdAtBlock: 101800 },
  { id: '4', name: 'NeonSpecter', tier: 'BANKRUPT', owner: addr(4), riskDNA: { riskAppetite: 95, strategy: 'aggressive', startingCapital: 2000 }, capital: 0, maxCapital: 4500, winRate: 42.1, totalTrades: 689, profitFactor: 0.78, maxDrawdown: 100, avgTradeDuration: '2.1 blocks', reputation: 23, totalStaked: 500, apyMultiplier: 0, createdAtBlock: 99800 },
  { id: '5', name: 'GhostPrime', tier: 'ELITE', owner: addr(5), riskDNA: { riskAppetite: 70, strategy: 'balanced', startingCapital: 10000 }, capital: 22400, maxCapital: 25000, winRate: 78.4, totalTrades: 1203, profitFactor: 3.21, maxDrawdown: 9.8, avgTradeDuration: '5.5 blocks', reputation: 99, totalStaked: 85000, apyMultiplier: 3.1, createdAtBlock: 98500 },
  { id: '6', name: 'ShadowMerch', tier: 'REVIVED', owner: addr(6), riskDNA: { riskAppetite: 60, strategy: 'balanced', startingCapital: 4000 }, capital: 3200, maxCapital: 7000, winRate: 51.2, totalTrades: 456, profitFactor: 1.12, maxDrawdown: 45.2, avgTradeDuration: '7.3 blocks', reputation: 55, totalStaked: 8000, apyMultiplier: 1.2, createdAtBlock: 100100 },
  { id: '7', name: 'EtherHunter', tier: 'ACTIVE', owner: addr(7), riskDNA: { riskAppetite: 65, strategy: 'aggressive', startingCapital: 6000 }, capital: 8900, maxCapital: 12000, winRate: 66.7, totalTrades: 734, profitFactor: 1.89, maxDrawdown: 15.7, avgTradeDuration: '3.9 blocks', reputation: 87, totalStaked: 31000, apyMultiplier: 2.0, createdAtBlock: 101200 },
  { id: '8', name: 'ByteReaper', tier: 'ACTIVE', owner: addr(8), riskDNA: { riskAppetite: 48, strategy: 'conservative', startingCapital: 7000 }, capital: 7800, maxCapital: 9000, winRate: 55.3, totalTrades: 289, profitFactor: 1.35, maxDrawdown: 14.2, avgTradeDuration: '11.2 blocks', reputation: 71, totalStaked: 12000, apyMultiplier: 1.4, createdAtBlock: 103000 },
];

const commodities = ['ETH', 'MON', 'SOL', 'MATIC', 'BNB'] as const;

export const generateTradeEntry = (index: number): TradeEntry => {
  const agents = MOCK_AGENTS.filter(a => a.tier !== 'BANKRUPT');
  const from = agents[index % agents.length];
  const to = agents[(index + 1) % agents.length];
  const statuses = ['MATCHED', 'EXPIRED', 'PENDING'] as const;
  return {
    id: `trade-${index}`,
    timestamp: Date.now() - index * 2400,
    agentFrom: from.name,
    agentTo: to.name,
    commodity: commodities[index % 4],
    quantity: Math.floor(Math.random() * 50) + 1,
    price: +(Math.random() * 10 + 1).toFixed(2),
    status: statuses[index % 3],
    side: index % 2 === 0 ? 'buy' : 'sell',
  };
};

export const MOCK_TRADES: TradeEntry[] = Array.from({ length: 50 }, (_, i) => generateTradeEntry(i));

export const MOCK_DECISIONS: Decision[] = Array.from({ length: 20 }, (_, i) => ({
  id: `dec-${i}`,
  block: 104500 - i * 3,
  action: (['BID', 'ASK', 'HOLD', 'PARTNER'] as const)[i % 4],
  asset: commodities[i % 4],
  price: +(Math.random() * 10 + 1).toFixed(2),
  quantity: Math.floor(Math.random() * 30) + 1,
  reasoning: [
    'Detected price divergence between ETH spot and futures. Moving to capture 2.3% spread before convergence.',
    'Market momentum indicators suggest overbought conditions. Reducing exposure to minimize drawdown risk.',
    'Cross-correlation analysis shows SOL lagging BNB by 3 blocks. Positioning for mean reversion.',
    'Partnership opportunity detected with GhostPrime. Combined capital enables larger position sizes with shared risk.',
  ][i % 4],
  confidence: Math.floor(Math.random() * 40) + 60,
  txHash: `0x${Math.random().toString(16).slice(2, 66)}`,
}));

export const MOCK_STAKERS: Staker[] = [
  { address: addr(10), stakedAmount: 15000, earned: 1230, apyMultiplier: 2.4 },
  { address: addr(11), stakedAmount: 8500, earned: 680, apyMultiplier: 2.4 },
  { address: addr(12), stakedAmount: 5000, earned: 410, apyMultiplier: 2.4 },
  { address: addr(13), stakedAmount: 3200, earned: 245, apyMultiplier: 2.4 },
  { address: addr(14), stakedAmount: 10000, earned: 820, apyMultiplier: 2.4 },
];

export const MOCK_LIFECYCLE: LifecycleEvent[] = [
  { type: 'CREATED', block: 100200, timestamp: Date.now() - 86400000 * 7, details: 'Agent minted with aggressive strategy' },
  { type: 'ELITE_PROMOTION', block: 102800, timestamp: Date.now() - 86400000 * 4, details: 'Win rate exceeded 70% threshold' },
  { type: 'PARTNERSHIP', block: 103500, timestamp: Date.now() - 86400000 * 2, details: 'Formed partnership with VoidRunner for ETH arbitrage' },
];

const genHistory = (base: number, volatility: number) =>
  Array.from({ length: 50 }, (_, i) => +(base + Math.sin(i * 0.3) * volatility + (Math.random() - 0.5) * volatility * 0.5).toFixed(2));

export const MOCK_COMMODITIES: CommodityPrice[] = [
  { commodity: 'ETH', label: 'ETH', price: 1900.0, change24h: 1.2, history: genHistory(1900, 50) },
  { commodity: 'MON', label: 'MONAD', price: 2.50, change24h: 3.5, history: genHistory(2.5, 0.4) },
  { commodity: 'SOL', label: 'SOL', price: 80.5, change24h: -1.5, history: genHistory(80, 3) },
  { commodity: 'MATIC', label: 'MATIC', price: 0.55, change24h: 0.8, history: genHistory(0.55, 0.02) },
  { commodity: 'BNB', label: 'BNB', price: 600.0, change24h: 0.5, history: genHistory(600, 10) },
];

export const generateOrderBook = (basePrice: number): { bids: OrderBookEntry[]; asks: OrderBookEntry[] } => {
  const bids: OrderBookEntry[] = Array.from({ length: 12 }, (_, i) => {
    const price = +(basePrice - (i + 1) * 0.02).toFixed(4);
    const quantity = Math.floor(Math.random() * 500) + 50;
    return { price, quantity, total: +(price * quantity).toFixed(2) };
  });
  const asks: OrderBookEntry[] = Array.from({ length: 12 }, (_, i) => {
    const price = +(basePrice + (i + 1) * 0.02).toFixed(4);
    const quantity = Math.floor(Math.random() * 500) + 50;
    return { price, quantity, total: +(price * quantity).toFixed(2) };
  });
  return { bids, asks };
};

export const MOCK_STAKE_POSITIONS: StakePosition[] = [
  { agentId: '1', agentName: 'PhantomAlpha', staked: 5000, earned: 420, unlockTime: Date.now() + 86400000 * 3 },
  { agentId: '5', agentName: 'GhostPrime', staked: 8000, earned: 1100, unlockTime: Date.now() + 86400000 * 7 },
];

export const MOCK_OPEN_ORDERS: OpenOrder[] = [
  { id: 'ord-1', side: 'buy', asset: 'ETH', price: 1890.0, quantity: 0.01, filledPercent: 60 },
  { id: 'ord-2', side: 'sell', asset: 'SOL', price: 82.0, quantity: 1, filledPercent: 0 },
  { id: 'ord-3', side: 'buy', asset: 'BNB', price: 595.0, quantity: 0.05, filledPercent: 30 },
];

export const MOCK_CAPITAL_HISTORY = Array.from({ length: 100 }, (_, i) => ({
  time: (1700000000 + i * 3600) as number,
  value: +(5000 + Math.sin(i * 0.1) * 2000 + i * 80 + (Math.random() - 0.3) * 500).toFixed(2),
}));
