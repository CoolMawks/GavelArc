import { useState } from "react";
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useReadContract } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { arcTestnet } from "./wagmi";
import { parseEther, formatEther } from "viem";
import { shortAddr, formatDistanceToNow } from "./utils";

const ADDR = (import.meta.env.VITE_CONTRACT_ADDRESS as `0x${string}`) || "0x0000000000000000000000000000000000000000";
const ABI = [
  { name: "create", type: "function", stateMutability: "nonpayable", inputs: [{ name: "item", type: "string" }, { name: "description", type: "string" }, { name: "startPrice", type: "uint256" }, { name: "durationSeconds", type: "uint256" }], outputs: [{ type: "uint256" }] },
  { name: "bid", type: "function", stateMutability: "payable", inputs: [{ name: "id", type: "uint256" }], outputs: [] },
  { name: "finalize", type: "function", stateMutability: "nonpayable", inputs: [{ name: "id", type: "uint256" }], outputs: [] },
  { name: "withdraw", type: "function", stateMutability: "nonpayable", inputs: [{ name: "id", type: "uint256" }], outputs: [] },
  { name: "getAll", type: "function", stateMutability: "view", inputs: [{ name: "count", type: "uint256" }], outputs: [{ type: "tuple[]", components: [{ name: "id", type: "uint256" }, { name: "seller", type: "address" }, { name: "item", type: "string" }, { name: "description", type: "string" }, { name: "startPrice", type: "uint256" }, { name: "currentBid", type: "uint256" }, { name: "highestBidder", type: "address" }, { name: "endTime", type: "uint256" }, { name: "ended", type: "bool" }, { name: "createdAt", type: "uint256" }] }] },
  { name: "total", type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { name: "pendingRefunds", type: "function", stateMutability: "view", inputs: [{ name: "id", type: "uint256" }, { name: "user", type: "address" }], outputs: [{ type: "uint256" }] },
] as const;

const AC = "#a855f7";
const DURATIONS = [{ label: "30 min", secs: 1800 }, { label: "1 hour", secs: 3600 }, { label: "6 hours", secs: 21600 }, { label: "1 day", secs: 86400 }, { label: "3 days", secs: 259200 }];

export default function App() {
  const { isConnected, address } = useAccount();
  const [tab, setTab] = useState<"browse" | "create">("browse");
  const [item, setItem] = useState(""); const [desc, setDesc] = useState(""); const [startPrice, setStartPrice] = useState("1"); const [duration, setDuration] = useState(3600);
  const [bidId, setBidId] = useState(""); const [bidAmt, setBidAmt] = useState(""); const [done, setDone] = useState(false);
  const now = Math.floor(Date.now() / 1000);

  const { data: auctions, refetch } = useReadContract({ address: ADDR, abi: ABI, functionName: "getAll", args: [BigInt(20)], query: { refetchInterval: 8000 } });
  const { data: total } = useReadContract({ address: ADDR, abi: ABI, functionName: "total" });
  const { data: hash, isPending, writeContract, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });
  if (isSuccess && !done) { setDone(true); refetch(); setItem(""); setDesc(""); setBidAmt(""); setTimeout(() => setDone(false), 3000); }
  const isLoading = isPending || isConfirming;

  const list = (auctions as any[]) ?? [];
  const startPriceBig = (() => { try { return parseEther(startPrice); } catch { return 0n; } })();
  const bidBig = (() => { try { return parseEther(bidAmt); } catch { return 0n; } })();

  function timeLeft(endTime: number): string {
    const diff = endTime - now;
    if (diff <= 0) return "Ended";
    if (diff < 60) return `${diff}s`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ${Math.floor((diff % 3600) / 60)}m`;
    return `${Math.floor(diff / 86400)}d`;
  }

  return (
    <div className="min-h-screen bg-[#080b14]">
      <header className="flex items-center justify-between px-6 py-4 border-b border-white/10 sticky top-0 z-50 bg-[#080b14]/80 backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🔨</span>
          <span className="font-bold text-white text-lg">Gavel<span style={{ color: AC }}>Arc</span></span>
          <span className="hidden sm:block text-xs text-slate-500 bg-slate-800/60 px-2 py-0.5 rounded-full border border-slate-700">Arc Testnet</span>
        </div>
        <ConnectButton showBalance={false} chainStatus="icon" accountStatus="avatar" />
      </header>
      <main className="relative z-10 max-w-xl mx-auto px-4 py-8">
        <div className="text-center mb-6">
          <div className="text-6xl mb-4">🔨</div>
          <h1 className="text-4xl font-black text-white mb-3">Gavel<span style={{ color: AC }}>Arc</span></h1>
          <p className="text-slate-400 text-sm">On-chain English auctions. Bid, win, and own forever on Arc.</p>
          <div className="mt-3 inline-flex items-center gap-2 bg-slate-800/60 px-4 py-2 rounded-full border border-slate-700 text-slate-400 text-sm">{total?.toString() ?? "0"} auctions total</div>
        </div>

        <div className="flex bg-slate-900/60 rounded-xl p-1 mb-5 border border-white/8">
          {(["browse", "create"] as const).map(t => (
            <button key={t} onClick={() => setTab(t)} className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${tab === t ? "text-white" : "text-slate-400 hover:text-white"}`} style={tab === t ? { background: AC } : {}}>
              {t === "browse" ? "🔨 Browse Auctions" : "✚ Create Auction"}
            </button>
          ))}
        </div>

        {tab === "create" && (
          !isConnected ? <div className="text-center py-8 text-slate-500">Connect wallet to create an auction</div> : (
            <div className="bg-slate-900/60 border border-white/10 rounded-2xl p-5 mb-5">
              <h2 className="font-bold text-white mb-4">Create Auction</h2>
              <input value={item} onChange={e => setItem(e.target.value)} placeholder="Item name *" className="w-full bg-slate-800/60 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm outline-none mb-2" />
              <textarea value={desc} onChange={e => setDesc(e.target.value)} placeholder="Description (optional)" rows={2} className="w-full bg-slate-800/60 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm outline-none resize-none mb-2" />
              <div className="mb-3">
                <label className="text-xs text-slate-400 block mb-1">Starting Price (USDC)</label>
                <input type="number" value={startPrice} onChange={e => setStartPrice(e.target.value)} step="0.1" min="0" className="w-full bg-slate-800/60 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm outline-none" />
              </div>
              <div className="mb-4">
                <label className="text-xs text-slate-400 block mb-2">Duration</label>
                <div className="flex gap-2 flex-wrap">
                  {DURATIONS.map(d => (
                    <button key={d.secs} onClick={() => setDuration(d.secs)} className="px-3 py-1.5 rounded-lg text-xs font-bold border transition-all" style={duration === d.secs ? { background: `${AC}30`, color: AC, borderColor: `${AC}60` } : { borderColor: "rgba(255,255,255,0.1)", color: "#64748b" }}>{d.label}</button>
                  ))}
                </div>
              </div>
              {done ? <div className="py-3 text-center rounded-xl font-bold text-sm" style={{ background: `${AC}20`, color: AC }}>🔨 Auction created!</div>
                : <button onClick={() => writeContract({ address: ADDR, abi: ABI, functionName: "create", args: [item, desc, startPriceBig, BigInt(duration)] })} disabled={isLoading || !item} className="w-full py-3 rounded-xl font-bold text-sm text-white disabled:opacity-50" style={{ background: AC }}>{isLoading ? (isPending ? "Confirm..." : "Creating...") : "🔨 Create Auction"}</button>}
              {error && <p className="mt-2 text-red-400 text-xs text-center">{error.message?.includes("User rejected") ? "Cancelled" : error.message?.slice(0, 80)}</p>}
            </div>
          )
        )}

        {tab === "browse" && (
          <>
            {isConnected && (
              <div className="bg-slate-900/60 border border-white/10 rounded-2xl p-4 mb-4">
                <h3 className="text-sm font-bold text-white mb-2">Place a Bid</h3>
                <div className="flex gap-2">
                  <input type="number" value={bidId} onChange={e => setBidId(e.target.value)} placeholder="Auction ID" className="w-24 bg-slate-800/60 border border-slate-700 rounded-xl px-3 py-2 text-white text-sm outline-none" />
                  <input type="number" value={bidAmt} onChange={e => setBidAmt(e.target.value)} placeholder="Bid (USDC)" className="flex-1 bg-slate-800/60 border border-slate-700 rounded-xl px-3 py-2 text-white text-sm outline-none" />
                  <button onClick={() => writeContract({ address: ADDR, abi: ABI, functionName: "bid", args: [BigInt(bidId || "0")], value: bidBig })} disabled={isLoading || !bidId || bidBig === 0n} className="px-4 py-2 rounded-xl font-bold text-sm text-white disabled:opacity-50" style={{ background: AC }}>Bid</button>
                </div>
                {done && <p className="mt-2 text-xs text-center" style={{ color: AC }}>🔨 Bid placed!</p>}
                {error && <p className="mt-2 text-red-400 text-xs">{error.message?.includes("User rejected") ? "Cancelled" : error.message?.slice(0, 80)}</p>}
              </div>
            )}
            <div className="space-y-3">
              {list.map((a: any, i: number) => {
                const ended = a.ended || Number(a.endTime) <= now;
                const tl = timeLeft(Number(a.endTime));
                const minNextBid = a.currentBid === 0n ? a.startPrice : a.currentBid * 105n / 100n;
                return (
                  <div key={i} className="bg-slate-900/60 border border-white/8 rounded-2xl p-4">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div>
                        <span className="text-xs px-2 py-0.5 rounded-full mr-2 font-semibold" style={ended ? { background: "#64748b25", color: "#64748b" } : { background: `${AC}25`, color: AC }}>{ended ? "Ended" : "Live"}</span>
                        <span className="text-white font-bold text-sm">{a.item}</span>
                      </div>
                      <span className="text-xs shrink-0 text-slate-400">#{a.id.toString()}</span>
                    </div>
                    {a.description && <p className="text-slate-400 text-xs mb-2 line-clamp-2">{a.description}</p>}
                    <div className="grid grid-cols-3 gap-2 mb-2">
                      <div className="bg-slate-800/40 rounded-lg p-2 text-center">
                        <p className="text-white font-bold text-sm">{parseFloat(formatEther(a.currentBid === 0n ? a.startPrice : a.currentBid)).toFixed(2)}</p>
                        <p className="text-slate-500 text-xs">{a.currentBid === 0n ? "Start" : "Current"} USDC</p>
                      </div>
                      <div className="bg-slate-800/40 rounded-lg p-2 text-center">
                        <p className="text-white font-bold text-sm">{parseFloat(formatEther(minNextBid)).toFixed(2)}</p>
                        <p className="text-slate-500 text-xs">Min bid</p>
                      </div>
                      <div className="bg-slate-800/40 rounded-lg p-2 text-center">
                        <p className="font-bold text-sm" style={{ color: ended ? "#64748b" : "#22c55e" }}>{tl}</p>
                        <p className="text-slate-500 text-xs">Remaining</p>
                      </div>
                    </div>
                    {a.highestBidder !== "0x0000000000000000000000000000000000000000" && (
                      <p className="text-slate-500 text-xs">Top bidder: {shortAddr(a.highestBidder)}</p>
                    )}
                    <div className="flex gap-2 mt-2">
                      {ended && !a.ended && (
                        <button onClick={() => writeContract({ address: ADDR, abi: ABI, functionName: "finalize", args: [a.id] })} disabled={isLoading} className="text-xs px-3 py-1.5 rounded-lg font-bold text-white disabled:opacity-50" style={{ background: AC }}>Finalize</button>
                      )}
                      {isConnected && (
                        <button onClick={() => writeContract({ address: ADDR, abi: ABI, functionName: "withdraw", args: [a.id] })} disabled={isLoading} className="text-xs px-3 py-1.5 rounded-lg font-bold border border-slate-600 text-slate-400 hover:text-white disabled:opacity-50 transition-all">Withdraw Refund</button>
                      )}
                    </div>
                    <p className="text-slate-700 text-xs mt-1">by {shortAddr(a.seller)} · {formatDistanceToNow(Number(a.createdAt))}</p>
                  </div>
                );
              })}
              {list.length === 0 && <div className="text-center py-10 text-slate-500">No auctions yet — be the first to list something!</div>}
            </div>
          </>
        )}
        <footer className="mt-10 text-center text-xs text-slate-600"><p>GavelArc · <a href={`https://testnet.arcscan.app/address/${ADDR}`} target="_blank" rel="noreferrer" className="hover:text-slate-400">{ADDR.slice(0,6)}...{ADDR.slice(-4)}</a> · Chain {arcTestnet.id}</p></footer>
      </main>
    </div>
  );
}
