import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { Section } from "../components/Layout";
import { Button, Card, Badge } from "../components/ui";
import BlockchainBackground from "../components/ui/BlockchainBackground";
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
  Globe, Zap, X, ArrowRight, CheckCircle, Circle, Loader, Scale, Link2
} from "lucide-react";

const API_BASE = 'http://localhost:5001/api'; 

export default function ResearchLandingPage() {
  const [topic, setTopic] = useState("");
  const [loading, setLoading] = useState(false);
  const [stage, setStage] = useState("idle"); 
  const navigate = useNavigate();

  const [researchPreview, setResearchPreview] = useState(null);
  const [stepIndex, setStepIndex] = useState(-1);
  const [savedResearch, setSavedResearch] = useState(null);
  const [ipfsHash, setIpfsHash] = useState(null);
  const [txDone, setTxDone] = useState(false);

  const { isConnected, address } = useAccount();
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();

  const currentContractAddress = CONTRACT_ADDRESSES[chainId] || CONTRACT_ADDRESSES[50312];

  const { data: hash, isPending, writeContract, error: writeError } = useWriteContract();
  const {
    data: receipt,
    isLoading: isConfirming,
    isSuccess: isConfirmed,
    isError: isTxError,
    error: txError,
  } = useWaitForTransactionReceipt({ hash });

  const handleResearch = async (e) => {
    e?.preventDefault();
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

  const setSamplePrompt = (prompt) => {
    setTopic(prompt);
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
      setStepIndex(0);
      const res = await axios.post(`${API_BASE}/research/generate`, { action: 'prepare', reportData: researchPreview });
      const dbResearch = res.data.report;
      setSavedResearch(dbResearch);

      setStepIndex(1);
      const ipfsRes = await axios.post(`${API_BASE}/research/upload-ipfs`, { researchId: dbResearch.id });
      const generatedHash = ipfsRes.data.ipfsHash;
      if (!generatedHash) throw new Error("IPFS upload failed");
      setIpfsHash(generatedHash);

      setStepIndex(2);
      const doWrite = () => {
        writeContract({
          address: currentContractAddress,
          abi: WRAPUP_ABI,
          functionName: "submitArticle",
          args: [generatedHash],
        });
      };

      if (!CONTRACT_ADDRESSES[chainId]) {
        switchChain({ chainId: 50312 }, { onSuccess: doWrite, onError: () => { toast.error("Network switch failed"); setLoading(false); setStepIndex(-1); } });
      } else {
        doWrite();
      }
    } catch (err) {
      toast.error(err.response?.data?.error || err.message || "Curation failed");
      if (savedResearch?.id) { await axios.delete(`${API_BASE}/research/${savedResearch.id}`).catch(() => {}); setSavedResearch(null); }
      setStepIndex(-1);
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isPending) toast.loading("Waiting for wallet...", { id: "mintToast" });
    if (isConfirming) { setStepIndex(2); toast.loading("Confirming...", { id: "mintToast" }); }

    if (isConfirmed && receipt && ipfsHash && savedResearch) {
      let onChainId = null;
      try {
        for (const log of receipt.logs) {
          const event = decodeEventLog({ abi: WRAPUP_ABI, data: log.data, topics: log.topics });
          if (event.eventName === "ArticleSubmitted") { onChainId = event.args.articleId.toString(); break; }
        }
      } catch {}

      if (onChainId && address) {
        axios.post(`${API_BASE}/research/mark-onchain`, { researchId: savedResearch.id, blockchainId: onChainId, curator: address, ipfsHash })
        .then(() => {
          setStepIndex(3); setTxDone(true); toast.success("Curated on-chain!", { id: "mintToast" }); setLoading(false);
          setTimeout(() => navigate(`/research/${savedResearch.id}`), 2000);
        }).catch((err) => { toast.error("DB sync failed", { id: "mintToast" }); setLoading(false); });
      } else {
        setStepIndex(3); setTxDone(true); toast.success("Minted!", { id: "mintToast" }); setLoading(false);
        setTimeout(() => navigate(`/research/${savedResearch.id}`), 2000);
      }
    }

    if (isTxError || writeError) {
      toast.error("Transaction failed.", { id: "mintToast" });
      if (savedResearch?.id) { axios.delete(`${API_BASE}/research/${savedResearch.id}`).catch(() => {}); setSavedResearch(null); }
      setStepIndex(-1); setLoading(false);
    }
  }, [isPending, isConfirming, isConfirmed, isTxError, receipt, writeError, txError, savedResearch, ipfsHash, address, navigate]);

  const handleReset = () => {
    setTopic(""); setResearchPreview(null); setSavedResearch(null); setIpfsHash(null); setTxDone(false); setStepIndex(-1); setStage("idle");
  };

  const getStageMessage = () => {
    switch (stage) {
      case "searching": return "Searching across 10+ platforms...";
      case "analyzing": return "Analyzing sources and synthesizing insights...";
      case "complete": return "Preview ready for curation!";
      default: return "";
    }
  };

  const isProcessing = loading || isPending || isConfirming;
  
  const getButtonLabel = () => {
    if (stepIndex === -1 && !loading) return "Curate & Mint Report";
    if (stepIndex === 0) return "Saving Database...";
    if (stepIndex === 1) return "Pinning to IPFS...";
    if (stepIndex === 2 && (isPending || isConfirming)) return "Confirming on Chain...";
    if (txDone) return "Successfully Minted!";
    return "Curate & Mint Report";
  };

  const features = [
    { icon: Globe, title: "10+ Sources", desc: "Web, Twitter, Reddit, News, & Papers.", color: "text-blue-400" },
    { icon: Zap, title: "Extraction", desc: "Clean content filtering & noise removal.", color: "text-yellow-400" },
    { icon: Brain, title: "Analysis", desc: "Deep AI synthesis & consensus mapping.", color: "text-emerald-400" },
    { icon: BarChart3, title: "Visuals", desc: "Sentiment analysis & credibility scoring.", color: "text-purple-400" }
  ];

  return (
    <div className="min-h-screen bg-zinc-950 text-white flex flex-col font-sans">
      <BlockchainBackground />
      <Navbar />

      <main className="flex-grow relative z-10">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
          
          {!researchPreview && (
            <Section className="pt-20 pb-12 animate-fade-in">
              {/* Hero */}
              <div className="text-center mb-12">
                <Badge className="mb-6 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <Sparkles className="w-3.5 h-3.5 mr-1.5 inline-block" />
                  Deep Engine v2.0
                </Badge>
                <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-6">
                  Multi-Source{' '}
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-emerald-600">
                    Research.
                  </span>
                </h1>
                <p className="text-zinc-400 text-lg md:text-xl max-w-2xl mx-auto leading-relaxed">
                  Get comprehensive, AI-synthesized research reports from 10+ authoritative sources. 
                  Identify consensus, contradictions, and insights in seconds.
                </p>
              </div>

              {/* Wallet Connections */}
              <div className="flex items-center justify-center gap-4 mb-10">
                <w3m-button />
                <w3m-network-button />
              </div>

              {/* Search Form */}
              <div className="max-w-3xl mx-auto mb-10">
                <form 
                  onSubmit={handleResearch} 
                  className="bg-zinc-900/50 backdrop-blur-md border border-zinc-800 p-2.5 rounded-2xl flex flex-col sm:flex-row gap-3 shadow-xl transition-all focus-within:border-emerald-500/50 focus-within:shadow-[0_0_20px_rgba(16,185,129,0.1)]"
                >
                  <input
                    type="text"
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    placeholder="Enter your research topic... (e.g., 'Impact of AI on healthcare')"
                    className="flex-1 bg-transparent px-6 py-4 text-white placeholder-zinc-500 focus:outline-none text-lg w-full"
                    disabled={loading}
                  />
                  <Button
                    type="submit"
                    disabled={loading || topic.trim().length < 5}
                    size="lg"
                    className="px-8 whitespace-nowrap shadow-lg shadow-emerald-500/20"
                  >
                    {loading ? (
                      <><Loader className="w-5 h-5 animate-spin mr-2" /> Running...</>
                    ) : (
                      <><Search className="w-5 h-5 mr-2" /> Generate</>
                    )}
                  </Button>
                </form>

                {/* 3 Sample Prompts */}
                {!loading && (
                  <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                    <span className="text-xs text-zinc-500 font-medium uppercase tracking-wider mr-2">Quick Access:</span>
                    {[
                      "Impact of AI in Healthcare",
                      "Zero-Knowledge Proofs in Crypto",
                      "Monad Blockchain Ecosystem"
                    ].map((prompt, idx) => (
                      <button
                        key={idx}
                        onClick={() => setSamplePrompt(prompt)}
                        className="text-xs bg-zinc-900 border border-zinc-800 text-zinc-300 px-3 py-1.5 rounded-full hover:bg-emerald-500/10 hover:border-emerald-500/30 hover:text-emerald-400 transition-colors"
                      >
                        {prompt}
                      </button>
                    ))}
                  </div>
                )}

                {/* Stage Indicator */}
                {loading && (
                  <div className="mt-8 flex justify-center animate-fade-in">
                    <div className="inline-flex items-center gap-3 bg-zinc-900/80 backdrop-blur-sm border border-zinc-800 px-6 py-3 rounded-full shadow-lg">
                      <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse"></div>
                      <span className="text-xs font-mono text-zinc-300 uppercase tracking-widest">
                        {getStageMessage()}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Tool Links */}
              <div className="flex justify-center gap-8 mb-16">
                <button 
                  onClick={() => navigate("/compare")}
                  className="text-xs font-bold uppercase tracking-widest text-zinc-500 hover:text-emerald-400 transition-colors flex items-center gap-2 group"
                >
                  <Scale className="w-4 h-4 group-hover:scale-110 transition-transform" /> 
                  Compare Articles
                </button>
                <button 
                  onClick={() => navigate("/legacy")}
                  className="text-xs font-bold uppercase tracking-widest text-zinc-500 hover:text-zinc-300 transition-colors flex items-center gap-2 group"
                >
                  <Link2 className="w-4 h-4 group-hover:scale-110 transition-transform" /> 
                  Curate URL
                </button>
              </div>
            </Section>
          )}

          {/* Unified Preview Panel */}
          {researchPreview && (
            <Section className="py-16">
              <Card className="max-w-4xl mx-auto overflow-hidden animate-fade-in border border-zinc-800 bg-zinc-900/40 backdrop-blur-md shadow-2xl">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800/50 bg-zinc-950/50">
                  <div className="flex items-center gap-3">
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="font-mono text-xs text-zinc-400 uppercase tracking-widest">
                      Research Ready to Curate
                    </span>
                  </div>
                  <button 
                    onClick={handleReset} 
                    disabled={isProcessing}
                    className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-500 hover:text-white transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="p-8">
                  <div className="mb-10">
                    <h2 className="text-3xl font-extrabold text-white mb-5 leading-tight">
                      {researchPreview.topic}
                    </h2>
                    
                    <div className="bg-zinc-950/50 border border-zinc-800/80 p-5 rounded-2xl mb-6 shadow-inner">
                      <h3 className="text-emerald-400 text-xs font-bold uppercase tracking-widest mb-3 flex items-center gap-2">
                        <Brain className="w-4 h-4" /> Executive Summary (Preview)
                      </h3>
                      <p className="text-zinc-300 text-sm leading-relaxed">
                        {researchPreview.executiveSummary?.substring(0, 300)}... 
                        <span className="text-zinc-500 italic ml-2">
                          (Mint to unlock full synthesis, contradictions & visualization data)
                        </span>
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-3">
                      <Badge className="bg-blue-500/10 text-blue-400 border border-blue-500/20 px-3 py-1.5">
                        <Globe className="w-3.5 h-3.5 mr-1.5 inline-block" />
                        Synthesized from {researchPreview.metadata?.totalSources || 0} Sources
                      </Badge>
                      <Badge className="bg-purple-500/10 text-purple-400 border border-purple-500/20 px-3 py-1.5">
                        <Brain className="w-3.5 h-3.5 mr-1.5 inline-block" />
                        Deep Logic Evaluated
                      </Badge>
                    </div>
                  </div>

                  {/* Unified Status Tracking Rows */}
                  <div className="space-y-3 mb-8">
                    {[
                      { label: "Database Sync", done: stepIndex > 0, active: stepIndex === 0, val: savedResearch ? `ID: ${savedResearch.id?.slice(-8)}` : null },
                      { label: "IPFS Pinning", done: stepIndex > 1, active: stepIndex === 1, val: ipfsHash ? `${ipfsHash.slice(0, 16)}...` : null },
                      { label: "Blockchain Mint", done: txDone, active: stepIndex === 2, val: null },
                    ].map((row, idx) => (
                      <div
                        key={idx}
                        className={`flex items-center justify-between px-5 py-3.5 rounded-xl border text-sm transition-all ${
                          row.done ? "border-emerald-500/30 bg-emerald-500/5" :
                          row.active ? "border-emerald-500/60 bg-emerald-500/10 shadow-[0_0_15px_rgba(16,185,129,0.1)]" :
                          "border-zinc-800/60 bg-zinc-950/30"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          {row.done ? <CheckCircle className="w-4 h-4 text-emerald-400" /> :
                           row.active ? <Loader className="w-4 h-4 text-emerald-400 animate-spin" /> :
                           <Circle className="w-4 h-4 text-zinc-600" />}
                          <span className={row.done ? "text-emerald-400 font-medium" : row.active ? "text-white font-medium" : "text-zinc-500"}>
                            {row.label}
                          </span>
                        </div>
                        {row.val && <span className="font-mono text-[11px] text-zinc-500 bg-zinc-900 px-2 py-1 rounded">{row.val}</span>}
                      </div>
                    ))}
                  </div>

                  {/* Action Button */}
                  <div className="flex justify-end pt-6 border-t border-zinc-800/50">
                    <Button
                      onClick={handleCurate}
                      disabled={isProcessing || txDone || !isConnected}
                      size="lg"
                      className={`px-8 py-3.5 ${txDone ? "bg-emerald-500 hover:bg-emerald-500 text-black shadow-lg shadow-emerald-500/20 cursor-default" : "shadow-lg shadow-emerald-500/20"}`}
                    >
                      {isProcessing && <Loader className="w-4 h-4 animate-spin mr-2" />}
                      {!isConnected ? "Connect Wallet to Mint" : getButtonLabel()}
                      {!isProcessing && !txDone && isConnected && <ArrowRight className="w-4 h-4 ml-2" />}
                    </Button>
                  </div>
                </div>
              </Card>
            </Section>
          )}

          {/* Features - Shown when idle */}
          {!researchPreview && !loading && (
            <Section className="py-16 border-t border-zinc-800/30">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {features.map((feature, idx) => (
                  <Card 
                    key={idx} 
                    className="p-8 bg-zinc-900/30 backdrop-blur-md border border-zinc-800/50 hover:border-emerald-500/30 transition-all group hover:shadow-[0_0_20px_rgba(16,185,129,0.05)]"
                  >
                    <div className={`w-12 h-12 bg-zinc-950 rounded-xl flex items-center justify-center mb-6 border border-zinc-800 group-hover:border-emerald-500/50 transition-colors`}>
                      <feature.icon className={`w-6 h-6 ${feature.color}`} />
                    </div>
                    <h3 className="text-xl font-bold text-white mb-2">{feature.title}</h3>
                    <p className="text-zinc-500 text-sm leading-relaxed">{feature.desc}</p>
                  </Card>
                ))}
              </div>
            </Section>
          )}

        </div>
      </main>
      <Footer />
    </div>
  );
}
