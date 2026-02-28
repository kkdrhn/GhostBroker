/**
 * Ghost Broker — Zustand global store
 * State is populated either from API fetches or live WebSocket events.
 * No mock data dependencies.
 */
import { create } from 'zustand';
import type {
  AgentResponse,
  TradeResponse,
  LeaderboardEntry,
  OracleFeedResponse,
  AgentDecisionResponse,
  EngineStatusResponse,
  WSEvent,
  Commodity,
  OrderBookEntry,
} from '@/types';

interface OrderBookState {
  bids: OrderBookEntry[];
  asks: OrderBookEntry[];
}

interface GhostStore {
  // ── Chain ──────────────────────────────────────────────────────────────────
  blockNumber: number;
  tps: number;

  // ── Wallet ─────────────────────────────────────────────────────────────────
  isConnected: boolean;
  walletAddress: string | null;
  ghostBalance: string; // wei string

  // ── Agent data ─────────────────────────────────────────────────────────────
  agents: AgentResponse[];
  agentsLoading: boolean;

  // ── Trade feed ─────────────────────────────────────────────────────────────
  recentTrades: TradeResponse[];
  feedPaused: boolean;

  // ── Order book per commodity ───────────────────────────────────────────────
  orderBooks: Partial<Record<Commodity, OrderBookState>>;

  // ── Leaderboard ────────────────────────────────────────────────────────────
  leaderboard: LeaderboardEntry[];

  // ── Oracle prices (price + rolling history) ───────────────────────────────
  prices: Partial<Record<Commodity, OracleFeedResponse>>;
  priceHistory: Partial<Record<Commodity, number[]>>;

  // ── Agent decisions feed ───────────────────────────────────────────────────
  decisions: AgentDecisionResponse[];

  // ── Engine stats ──────────────────────────────────────────────────────────
  engineStatus: EngineStatusResponse | null;

  // ── Token burn ────────────────────────────────────────────────────────────
  totalBurned: string; // wei string

  // ── Actions ────────────────────────────────────────────────────────────────
  setAgents: (agents: AgentResponse[]) => void;
  setAgentsLoading: (loading: boolean) => void;
  setLeaderboard: (lb: LeaderboardEntry[]) => void;
  setEngineStatus: (status: EngineStatusResponse) => void;
  setFeedPaused: (paused: boolean) => void;
  setWallet: (address: string | null, balance?: string) => void;
  disconnect: () => void;

  /** Dispatch a raw WebSocket event into the store */
  handleWSEvent: (event: WSEvent) => void;
}

export const useGhostStore = create<GhostStore>((set, get) => ({
  blockNumber: 0,
  tps: 0,
  isConnected: false,
  walletAddress: null,
  ghostBalance: '0',
  agents: [],
  agentsLoading: false,
  recentTrades: [],
  feedPaused: false,
  orderBooks: {},
  leaderboard: [],
  prices: {},
  priceHistory: {},
  decisions: [],
  engineStatus: null,
  totalBurned: '0',

  setAgents: (agents) => set({ agents }),
  setAgentsLoading: (agentsLoading) => set({ agentsLoading }),
  setLeaderboard: (leaderboard) => set({ leaderboard }),
  setEngineStatus: (engineStatus) => set({ engineStatus }),
  setFeedPaused: (feedPaused) => set({ feedPaused }),
  setWallet: (address, balance = '0') =>
    set({ isConnected: !!address, walletAddress: address, ghostBalance: balance }),
  disconnect: () =>
    set({ isConnected: false, walletAddress: null, ghostBalance: '0' }),

  handleWSEvent: (event) => {
    switch (event.type) {
      case 'block':
        set({ blockNumber: event.data.block_number, tps: event.data.tps });
        break;

      case 'trade': {
        if (get().feedPaused) break;
        set((s) => ({ recentTrades: [event.data, ...s.recentTrades].slice(0, 200) }));
        break;
      }

      case 'orderbook': {
        const { commodity, bids, asks } = event.data;
        set((s) => ({
          orderBooks: { ...s.orderBooks, [commodity]: { bids, asks } },
        }));
        break;
      }

      case 'price': {
        const feed = event.data;
        const c = feed.commodity as Commodity;
        const newPrice = Number(feed.price);
        set((s) => {
          const prev = s.priceHistory[c] ?? [];
          const history = [...prev, newPrice].slice(-40); // son 40 nokta
          return {
            prices: { ...s.prices, [c]: feed },
            priceHistory: { ...s.priceHistory, [c]: history },
          };
        });
        break;
      }

      case 'decision':
        set((s) => ({
          decisions: [event.data, ...s.decisions].slice(0, 100),
        }));
        break;

      case 'burn':
        set({ totalBurned: event.data.total_burned });
        break;

      case 'lifecycle':
        // lifecycle event — bileşen ihtiyaç duyarsa re-fetch tetikler
        break;

      default:
        break;
    }
  },
}));
