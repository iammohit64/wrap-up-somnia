import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import toast from "react-hot-toast";
import axios from "axios";
import {
  useAccount,
  useWriteContract,
  useWaitForTransactionReceipt,
  useChainId,
  useSwitchChain,
} from "wagmi";
import { WRAPUP_ABI, CONTRACT_ADDRESSES } from "../wagmiConfig";
import { decodeEventLog } from "viem";
import { 
  Brain, Sparkles, Search, BarChart3, 
  Globe, Zap, Shield, Link2, Scale, X,
  ArrowRight, ArrowLeft, CheckCircle, Circle, Loader
} from "lucide-react";

const API_BASE = '/api';

const STEPS = ["Save to DB", "Upload IPFS", "Sign & Mint"];

function StepIndicator({ steps, currentStep }) {
  return (
    <div className="flex items-center justify-center gap-2 mb-8">
      {steps.map((step, i) => {
        const isDone = i < currentStep;
        const isActive = i === currentStep;
        return (
          <React.Fragment key={i}>
            <div className="flex items-center gap-2">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center border text-xs font-bold transition-all ${
                  isDone
                    ? "bg-[#10b981] border-[#10b981] text-black"
                    : isActive
                    ? "border-[#10b981] text-[#10b981]"
                    : "border-[#27272a] text-zinc-600"
                }`}
              >
                {isDone ? <CheckCircle className="w-4 h-4" /> : i + 1}
              </div>
              <span
                className={`text-xs font-medium hidden sm:block ${
                  isActive ? "text-white" : isDone ? "text-[#10b981]" : "text-zinc-600"
                }`}
              >
                {step}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div
                className={`w-8 h-px transition-all ${
                  i < currentStep ? "bg-[#10b981]" : "bg-[#27272a]"
                }`}
              />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

export default function ResearchLandingPage() {
  const [topic, setTopic] = useState("");
  const [loading, setLoading] = useState(false);
  const [stage, setStage] = useState("idle"); 
  const navigate = useNavigate();

  // Legacy curation flow states
  const [researchPreview, setResearchPreview] = useState(null);
  const [stepIndex, setStepIndex] = useState(-1);
  const [savedResearch, setSavedResearch] = useState(null);
  const [ipfsHash, setIpfsHash] = useState(null);
  const [txDone, setTxDone] = useState(false);

  const { isConnected, address } = useAccount();
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();

  const currentContractAddress = CONTRACT_ADDRESSES[chainId] || CONTRACT_ADDRESSES[421614];

  const { data: hash, isPending, writeContract, error: writeError } = useWriteContract();
  const {
    data: receipt,
    isLoading: isConfirming,
    isSuccess: isConfirmed,
    isError: isTxError,
    error: txError,
  } = useWaitForTransactionReceipt({ hash });

  const handleResearch = async (e) => {
    e.preventDefault();
    if (!topic.trim() || topic.trim().length < 5) {
      toast.error("Please enter a topic (at least 5 characters)");
      return;
    }

    setLoading(true);
    setStage("searching");
    setResearchPreview(null);
    setSavedResearch(null);
    setIpfsHash(null);
    setTxDone(false);
    setStepIndex(-1);
    
    const loadingToast = toast.loading("Initializing AI research engine...");

    try {
      await new Promise(resolve => setTimeout(resolve, 1500));
      setStage("analyzing");
      toast.loading("Analyzing multiple sources...", { id: loadingToast });
      
      const response = await axios.post(`${API_BASE}/research/generate`, {
        topic: topic.trim()
      });

      setStage("complete");
      toast.success("AI Analysis Complete!", { id: loadingToast });

      if (response.data.cached && response.data.previewOnly === false) {
         // Already fully generated and likely minted if legacy caching triggered
         navigate(`/research/${response.data.researchId}`);
      } else {
         setResearchPreview(response.data.report || response.data.preview);
      }
    } catch (error) {
      console.error("Research error:", error);
      toast.error(
        error.response?.data?.error || "Research failed. Please try again.",
        { id: loadingToast }
      );
      setStage("idle");
    } finally {
      setLoading(false);
    }
  };

  const handleCurate = async () => {
    if (!researchPreview) return;
    if (!isConnected) {
      toast.error("Connect wallet to curate");
      return;
    }

    setLoading(true);
    setTxDone(false);

    try {
      // ── STEP 1: Save to Database ───────────────────────────────────────
      setStepIndex(0);
      const tid1 = toast.loading("Step 1/3 — Saving to database...");
      const res = await axios.post(`${API_BASE}/research/generate`, {
        action: 'prepare',
        reportData: researchPreview
      });
      const dbResearch = res.data.report;
      setSavedResearch(dbResearch);
      toast.success("Saved to database!", { id: tid1 });

      // ── STEP 2: Upload to IPFS ─────────────────────────────────────────
      setStepIndex(1);
      const tid2 = toast.loading("Step 2/3 — Uploading to IPFS...");
      const ipfsRes = await axios.post(`${API_BASE}/research/upload-ipfs`, {
        researchId: dbResearch.id,
      });
      const generatedHash = ipfsRes.data.ipfsHash;
      if (!generatedHash) throw new Error("IPFS upload failed — no hash returned");
      setIpfsHash(generatedHash);
      toast.success("Uploaded to IPFS!", { id: tid2 });

      // ── STEP 3: Submit to Blockchain ───────────────────────────────────
      setStepIndex(2);
      toast.loading("Step 3/3 — Sign transaction in wallet...", {
        id: "mintToast",
      });

      const doWrite = () => {
        writeContract({
          address: currentContractAddress,
          abi: WRAPUP_ABI,
          functionName: "submitArticle",
          args: [generatedHash],
        });
      };

      if (!CONTRACT_ADDRESSES[chainId]) {
        switchChain(
          { chainId: 421614 },
          {
            onSuccess: doWrite,
            onError: () => {
              toast.error("Network switch failed", { id: "mintToast" });
              setLoading(false);
              setStepIndex(-1);
            },
          }
        );
      } else {
        doWrite();
      }
    } catch (err) {
      toast.error(err.response?.data?.error || err.message || "Curation failed");
      if (savedResearch?.id) {
        await axios.delete(`${API_BASE}/research/${savedResearch.id}`).catch(()=>{});
        setSavedResearch(null);
      }
      setStepIndex(-1);
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isPending) toast.loading("Waiting for wallet confirmation...", { id: "mintToast" });
    if (isConfirming) { setStepIndex(2); toast.loading("Confirming on blockchain...", { id: "mintToast" }); }

    if (isConfirmed && receipt && ipfsHash && savedResearch) {
      let onChainId = null;
      try {
        for (const log of receipt.logs) {
          const event = decodeEventLog({
            abi: WRAPUP_ABI,
            data: log.data,
            topics: log.topics,
          });
          if (event.eventName === "ArticleSubmitted") {
            onChainId = event.args.articleId.toString();
            break;
          }
        }
      } catch {}

      if (onChainId && address) {
        toast.loading("Finalizing on-chain record...", { id: "mintToast" });
        axios.post(`${API_BASE}/research/mark-onchain`, {
          researchId: savedResearch.id,
          blockchainId: onChainId,
          curator: address,
          ipfsHash
        }).then(() => {
          setStepIndex(3);
          setTxDone(true);
          toast.success("🎉 Research curated on-chain!", { id: "mintToast" });
          setLoading(false);
          setTimeout(() => navigate(`/research/${savedResearch.id}`), 2000);
        }).catch((err) => {
          toast.error("DB sync failed: " + err.message, { id: "mintToast" });
          setLoading(false);
        });
      } else {
        setStepIndex(3);
        setTxDone(true);
        toast.success("Research minted!", { id: "mintToast" });
        setLoading(false);
        setTimeout(() => navigate(`/research/${savedResearch.id}`), 2000);
      }
    }

    if (isTxError || writeError) {
      toast.error("Transaction failed or rejected.", { id: "mintToast" });
      if (savedResearch?.id) {
         axios.delete(`${API_BASE}/research/${savedResearch.id}`).catch(()=>{});
         setSavedResearch(null);
      }
      setStepIndex(-1);
      setLoading(false);
    }
  }, [isPending, isConfirming, isConfirmed, isTxError, receipt, writeError, txError, savedResearch, ipfsHash, address, navigate]);

  const handleReset = () => {
    setTopic("");
    setResearchPreview(null);
    setSavedResearch(null);
    setIpfsHash(null);
    setTxDone(false);
    setStepIndex(-1);
    setStage("idle");
  };

  const getStageMessage = () => {
    switch (stage) {
      case "searching": return "🔍 Searching across 10+ platforms...";
      case "analyzing": return "🧠 Analyzing sources and synthesizing insights...";
      case "complete": return "✅ Preview ready for curation!";
      default: return "";
    }
  };

  const isProcessing = loading || isPending || isConfirming;
  const getButtonLabel = () => {
    if (stepIndex === -1 && !loading) return "Curate & Mint Report";
    if (stepIndex === 0) return "Saving to DB...";
    if (stepIndex === 1) return "Uploading to IPFS...";
    if (stepIndex === 2 && (isPending || isConfirming)) return "Confirming on Chain...";
    if (txDone) return "Done! ✓ Redirecting...";
    return "Curate & Mint Report";
  };

  return (
    <div className="min-h-screen bg-[#09090b] text-white selection:bg-[#10b981] selection:text-black flex flex-col relative overflow-hidden">
      <div 
        className="fixed inset-0 z-0 pointer-events-none opacity-[0.03]"
        style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M30 0l25.98 15v30L30 60 4.02 45V15z' fill-rule='evenodd' stroke='%23ffffff' fill='none'/%3E%3C/svg%3E")` }}
      />
      <Navbar />

      <main className="container mx-auto px-4 pt-24 pb-12 relative z-10 flex-grow flex flex-col justify-center">
        
        {/* Only show the hero and search bar if we are NOT in preview mode */}
        {!researchPreview && (
          <>
            <div className="max-w-5xl mx-auto text-center mb-12">
              <div className="inline-flex items-center gap-2 bg-[#10b981]/10 border border-[#10b981]/30 px-4 py-1.5 rounded-full mb-8">
                <Sparkles className="w-3.5 h-3.5 text-[#10b981]" />
                <span className="text-[10px] font-bold uppercase tracking-widest text-[#10b981]">Deep Engine v2.0</span>
              </div>
              <h1 className="text-5xl md:text-7xl font-bold tracking-tighter mb-6">
                Multi-Source <span className="text-[#10b981]">Research.</span>
              </h1>
              <p className="text-zinc-500 text-xl max-w-2xl mx-auto leading-relaxed">
                Get comprehensive, AI-synthesized research reports from 10+ authoritative sources. 
                Identify consensus, contradictions, and insights in seconds.
              </p>
            </div>

            <div className="flex items-center justify-center gap-4 mb-8">
              <w3m-button />
              <w3m-network-button />
            </div>

            <div className="w-full max-w-3xl mx-auto mb-16">
              <form 
                onSubmit={handleResearch} 
                className="bg-[#121214] border border-[#27272a] p-2 rounded-2xl flex flex-col sm:flex-row gap-3 shadow-2xl shadow-black/50 transition-all hover:border-zinc-500 focus-within:border-[#10b981]"
              >
                <input
                  type="text"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="Enter your research topic... (e.g., 'Impact of AI on healthcare')"
                  className="flex-1 bg-transparent px-6 py-4 text-white placeholder-zinc-600 focus:outline-none text-lg w-full"
                  disabled={loading}
                />
                <button
                  type="submit"
                  disabled={loading || topic.trim().length < 5}
                  className="bg-[#10b981] hover:bg-[#059669] text-black px-8 py-4 rounded-xl font-bold uppercase tracking-wide text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 whitespace-nowrap"
                >
                  {loading ? (
                    <>
                      <div className="animate-spin h-5 w-5 border-2 border-black rounded-full border-t-transparent"></div>
                      <span>Running...</span>
                    </>
                  ) : (
                    <>
                      <Search className="w-5 h-5" />
                      <span>Generate</span>
                    </>
                  )}
                </button>
              </form>

              {loading && (
                <div className="mt-6 flex justify-center animate-fade-in">
                  <div className="inline-flex items-center gap-3 bg-[#18181b] border border-[#27272a] px-6 py-3 rounded-full">
                    <div className="w-2 h-2 bg-[#10b981] rounded-full animate-pulse"></div>
                    <span className="text-xs font-mono text-zinc-400 uppercase tracking-widest">{getStageMessage()}</span>
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-center gap-6 mb-24">
                <button 
                  onClick={() => navigate("/compare")}
                  className="text-xs font-bold uppercase tracking-widest text-zinc-500 hover:text-[#10b981] transition-colors flex items-center gap-2 group"
                >
                  <Scale className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" /> Comparator
                </button>
                <button 
                  onClick={() => navigate("/legacy")}
                  className="text-xs font-bold uppercase tracking-widest text-zinc-500 hover:text-zinc-300 transition-colors flex items-center gap-2 group"
                >
                  <Link2 className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" /> Legacy Mode
                </button>
            </div>
          </>
        )}

        {/* Legacy-style Preview Panel */}
        {researchPreview && (
          <div className="max-w-4xl mx-auto bg-[#121214] border border-[#27272a] rounded-xl overflow-hidden shadow-2xl mb-16 animate-fade-in">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#27272a] bg-[#18181b]">
              <div className="flex items-center gap-3">
                <div className="w-2.5 h-2.5 rounded-full bg-[#10b981]" />
                <span className="font-mono text-xs text-zinc-400 uppercase">
                  Research Ready to Curate
                </span>
              </div>
              <button onClick={handleReset} disabled={isProcessing}>
                <X className="w-5 h-5 text-zinc-500 hover:text-white" />
              </button>
            </div>

            <div className="p-6 md:p-8">
              {stepIndex >= 0 && (
                <StepIndicator steps={STEPS} currentStep={stepIndex} />
              )}

              <div className="mb-8">
                <h2 className="text-3xl font-bold text-white mb-4 leading-tight">
                  {researchPreview.topic}
                </h2>
                
                <div className="bg-[#18181b] border border-[#27272a] p-4 rounded-lg mb-6">
                  <h3 className="text-[#10b981] text-xs font-bold uppercase tracking-widest mb-2">Executive Summary (Preview)</h3>
                  <p className="text-zinc-400 text-sm leading-relaxed">
                    {researchPreview.executiveSummary?.substring(0, 300)}... 
                    <span className="text-zinc-600 italic ml-2">(Mint to unlock full synthesis, contradictions & visualization data)</span>
                  </p>
                </div>

                <div className="flex flex-wrap gap-3">
                  <div className="bg-[#27272a]/50 text-zinc-300 px-3 py-1.5 rounded-lg border border-[#3f3f46] text-xs flex items-center gap-2">
                    <Globe className="w-3.5 h-3.5 text-blue-400" />
                    Synthesized from {researchPreview.metadata?.totalSources || 0} Sources
                  </div>
                  <div className="bg-[#27272a]/50 text-zinc-300 px-3 py-1.5 rounded-lg border border-[#3f3f46] text-xs flex items-center gap-2">
                    <Brain className="w-3.5 h-3.5 text-purple-400" />
                    Deep Logic Evaluated
                  </div>
                </div>
              </div>

              {/* Status rows */}
              <div className="space-y-2 mb-6">
                {[
                  {
                    label: "Database",
                    done: !!savedResearch,
                    active: stepIndex === 0,
                    value: savedResearch ? `ID: ${savedResearch.id?.slice(-8)}` : null,
                  },
                  {
                    label: "IPFS",
                    done: !!ipfsHash,
                    active: stepIndex === 1,
                    value: ipfsHash ? `${ipfsHash.slice(0, 16)}...` : null,
                  },
                  {
                    label: "Blockchain",
                    done: txDone,
                    active: stepIndex === 2,
                    value: null,
                  },
                ].map((row) => (
                  <div
                    key={row.label}
                    className={`flex items-center justify-between px-4 py-2 rounded border text-sm transition-all ${
                      row.done
                        ? "border-[#10b981]/30 bg-[#10b981]/5"
                        : row.active
                        ? "border-[#10b981]/60 bg-[#10b981]/10"
                        : "border-[#27272a] bg-transparent"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {row.done ? <CheckCircle className="w-4 h-4 text-[#10b981]" /> : row.active ? <Loader className="w-4 h-4 text-[#10b981] animate-spin" /> : <Circle className="w-4 h-4 text-zinc-600" />}
                      <span className={row.done ? "text-[#10b981]" : row.active ? "text-white" : "text-zinc-600"}>{row.label}</span>
                    </div>
                    {row.value && <span className="font-mono text-[10px] text-zinc-500">{row.value}</span>}
                  </div>
                ))}
              </div>

              <div className="flex justify-end pt-6 border-t border-[#27272a]">
                <button
                  onClick={handleCurate}
                  disabled={isProcessing || txDone || !isConnected}
                  className={`px-8 py-3 rounded-lg font-bold uppercase text-sm tracking-wide flex items-center gap-2 transition-all ${
                    !isConnected
                      ? "bg-zinc-800 text-zinc-500 cursor-not-allowed"
                      : txDone
                      ? "bg-[#10b981] text-black cursor-default"
                      : isProcessing
                      ? "bg-zinc-800 text-zinc-400 cursor-not-allowed"
                      : "bg-[#10b981] text-black hover:bg-[#059669]"
                  }`}
                >
                  {isProcessing && <Loader className="w-4 h-4 animate-spin" />}
                  {!isConnected ? "Connect Wallet to Mint" : getButtonLabel()}
                  {!isProcessing && !txDone && isConnected && <ArrowRight className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Feature Grid falls back if not previewing */}
        {!researchPreview && !loading && (
          <div className="w-full pt-20 pb-24 border-t border-[#27272a]">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 w-full max-w-7xl mx-auto">
              {[
                { icon: Globe, title: "10+ Sources", desc: "Web, Twitter, Reddit, News, & Papers.", color: "group-hover:text-blue-400" },
                { icon: Zap, title: "Extraction", desc: "Clean content filtering & noise removal.", color: "group-hover:text-yellow-400" },
                { icon: Brain, title: "Analysis", desc: "Deep AI synthesis & consensus mapping.", color: "group-hover:text-[#10b981]" },
                { icon: BarChart3, title: "Visuals", desc: "Sentiment analysis & credibility scoring.", color: "group-hover:text-purple-400" }
              ].map((step, idx) => (
                <div key={idx} className="group p-8 rounded-2xl border border-[#27272a] bg-[#121214]/50 hover:bg-[#121214] hover:border-[#10b981] transition-all duration-300 cursor-default">
                  <div className="w-12 h-12 bg-[#18181b] rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300 border border-[#27272a]">
                    <step.icon className={`w-6 h-6 text-white transition-colors ${step.color}`} />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2">{step.title}</h3>
                  <p className="text-base text-zinc-500 leading-relaxed">{step.desc}</p>
                </div>
              ))}
            </div>
          </div>
        )}

      </main>
      <Footer />
    </div>
  );
}