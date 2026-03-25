import React, { useState, useEffect, useRef } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useArticleStore } from "../stores/articleStore";
import { useWeb3Modal } from '@web3modal/wagmi/react';
import { useAccount, useReadContract, useDisconnect, useWriteContract, useWaitForTransactionReceipt, useChainId } from "wagmi";
import { CONTRACT_ADDRESSES, WRAPUP_ABI, WUPToken_ADDRESSES, WUP_TOKEN_ABI } from "../wagmiConfig";
import toast from "react-hot-toast";
import axios from "axios";
import { Menu, X, Star, Award, Check, Brain, FileText, LogOut, Wallet, Link2, Scale, Hexagon, ChevronDown, Zap } from "lucide-react";

const API_BASE = 'https://wrap-up-somnia.onrender.com/api'; 

export default function Navbar() {
  const { userPoints, displayName, setUserPoints, setDisplayName } = useArticleStore();
  const [newName, setNewName] = useState("");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [savingToDb, setSavingToDb] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [isToolsOpen, setIsToolsOpen] = useState(false);
  const [isRewardsOpen, setIsRewardsOpen] = useState(false);

  const toolsCloseTimer = useRef(null);
  const rewardsCloseTimer = useRef(null);
  
  const location = useLocation();
  const navigate = useNavigate();
  const isActive = (path) => location.pathname === path;
   
  const { address, isConnected } = useAccount();
  const { disconnect } = useDisconnect();
  const chainId = useChainId();

  // Fallback to Arbitrum Sepolia if not on Somnia just to avoid crashes, 
  // though you should enforce Somnia in WagmiConfig
  const currentContractAddress = CONTRACT_ADDRESSES[chainId] || CONTRACT_ADDRESSES[50312];
  const currentTokenAddress = WUPToken_ADDRESSES[chainId] || WUPToken_ADDRESSES[50312];
  const { open } = useWeb3Modal();

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const { data: pointsData, refetch: refetchPoints } = useReadContract({
    abi: WRAPUP_ABI,
    address: currentContractAddress,
    functionName: 'getUserPoints',
    args: [address],
    enabled: isConnected && !!address,
  });

  const { data: nameData, refetch: refetchName } = useReadContract({
    abi: WRAPUP_ABI,
    address: currentContractAddress,
    functionName: 'displayNames',
    args: [address],
    enabled: isConnected && !!address,
  });

  const { data: wupBalance, refetch: refetchWupBalance } = useReadContract({
    address: currentTokenAddress,
    abi: WUP_TOKEN_ABI,
    functionName: 'balanceOf',
    args: [address],
    enabled: isConnected && !!address && !!currentTokenAddress,  
  });

  const { data: hash, isPending, writeContract, error: writeError, isError: isWriteError } = useWriteContract();

  const { 
    isLoading: isConfirming, 
    isSuccess: isConfirmed, 
    error: receiptError, 
    isError: isReceiptError 
  } = useWaitForTransactionReceipt({ hash });

  useEffect(() => {
    if (isConnected && address) {
      refetchPoints();
      refetchName();
      refetchWupBalance();
      fetchUserFromDb(address);
    } else {
      setUserPoints(0);
      setDisplayName('');
    }
  }, [isConnected, address, refetchPoints, refetchName, refetchWupBalance, setUserPoints, setDisplayName]);

  useEffect(() => {
    if (pointsData !== undefined) {
      setUserPoints(Number(pointsData));
    }
  }, [pointsData, setUserPoints]);

  useEffect(() => {
    if (nameData) {
      setDisplayName(nameData);
    }
  }, [nameData, setDisplayName]);

  const fetchUserFromDb = async (walletAddress) => {
    try {
      const response = await axios.get(`${API_BASE}/users/${walletAddress}`);
      if (response.data && response.data.displayName) {
        if (!nameData) {
          setDisplayName(response.data.displayName);
        }
      }
    } catch (error) {
      console.log('User not found in DB or error:', error.message);
    }
  };

  const saveDisplayNameToDb = async (name, walletAddress) => {
    try {
      setSavingToDb(true);
      const response = await axios.post(`${API_BASE}/users/set-display-name`, {
        walletAddress,
        displayName: name
      });
      if (response.data.success) return true;
      return false;
    } catch (error) {
      console.error('Failed to save display name to database:', error);
      return false;
    } finally {
      setSavingToDb(false);
    }
  };

  useEffect(() => {
    if (isConfirming) {
      toast.loading("Setting name on blockchain...", { id: "setNameToast" });
    }
    if (isConfirmed) {
      toast.success("Name saved on blockchain successfully!", { id: "setNameToast" });
      setDisplayName(newName);
      setNewName("");
      refetchName();
    }
    if (isWriteError || isReceiptError) {
      const errorMsg = writeError?.shortMessage || receiptError?.shortMessage || "Transaction failed";
      toast.error(`Blockchain Error: ${errorMsg}`, { id: "setNameToast" });
    }
  }, [isConfirming, isConfirmed, isWriteError, writeError, isReceiptError, receiptError]);

  const handleWalletAction = () => {
    if (isConnected) disconnect();
    else open(); 
  };

  const handleSetDisplayName = async () => {
    if (!newName.trim()) {
      toast.error("Name cannot be empty");
      return;
    }
    if (newName.trim().length > 32) {
      toast.error("Name must be 1-32 characters");
      return;
    }

    toast.loading("Saving to database...", { id: "setNameToast" });
    const dbSaved = await saveDisplayNameToDb(newName.trim(), address);

    if (!dbSaved) {
      toast.error("Failed to save to database. Transaction aborted.", { id: "setNameToast" });
      return;
    }

    toast.loading("Database updated! Confirm in wallet...", { id: "setNameToast" });
    writeContract({
      address: currentContractAddress,
      abi: WRAPUP_ABI,
      functionName: 'setDisplayName',
      args: [newName.trim()],
    });
  };

  const toolLinks = [
    { path: '/research', label: 'Research', icon: Brain },
    { path: '/compare', label: 'Compare', icon: Scale },
    { path: '/legacy', label: 'Curate', icon: Link2 },
  ];

  const navLinks = [
    { path: '/curated', label: 'Articles', icon: FileText },
    { path: '/research-list', label: 'Reports', icon: Hexagon },
  ];

  const handleToolsEnter = () => {
    if (toolsCloseTimer.current) clearTimeout(toolsCloseTimer.current);
    setIsToolsOpen(true);
  };
  const handleToolsLeave = () => {
    toolsCloseTimer.current = setTimeout(() => setIsToolsOpen(false), 150);
  };

  const handleRewardsEnter = () => {
    if (rewardsCloseTimer.current) clearTimeout(rewardsCloseTimer.current);
    setIsRewardsOpen(true);
  };
  const handleRewardsLeave = () => {
    rewardsCloseTimer.current = setTimeout(() => setIsRewardsOpen(false), 150);
  };

  return (
    <nav className={`sticky top-0 z-50 transition-all duration-300 ${
      isScrolled 
        ? 'bg-zinc-950/80 backdrop-blur-xl border-b border-zinc-800/50 shadow-xl shadow-black/20' 
        : 'bg-transparent border-b border-transparent'
    }`}>
      <div className="w-full px-18 sm:px-10 lg:px-24 xl:px-28">
        <div className="flex items-center justify-between h-20">

          {/* Logo */}
          <Link to="/" className="flex items-center gap-3 group flex-shrink-0">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-zinc-900 border border-zinc-800 group-hover:border-emerald-500/50 transition-all duration-300 overflow-hidden">
              <img src="/logo.png" alt="logo" className="w-full h-full object-cover" />
            </div>
            <span className="text-xl font-bold text-white tracking-tight whitespace-nowrap">
              Wrap<span className="text-emerald-400">-Up</span>
            </span>
          </Link>
           
          {/* Mobile menu button */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="lg:hidden p-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-700 transition-all"
          >
            {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center gap-2 relative">
            <div className="relative" onMouseEnter={handleToolsEnter} onMouseLeave={handleToolsLeave}>
              <button className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                isToolsOpen ? 'text-white bg-zinc-800/50' : 'text-zinc-400 hover:text-white hover:bg-zinc-800/50'
              }`}>
                <Brain className="w-4 h-4" /> Tools
                <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${isToolsOpen ? 'rotate-180' : ''}`} />
              </button>

              {isToolsOpen && (
                <div className="absolute top-full left-0 w-52 bg-zinc-950 border border-zinc-800 rounded-2xl shadow-xl p-2 z-50"
                  style={{ marginTop: '4px' }}
                  onMouseEnter={handleToolsEnter}
                  onMouseLeave={handleToolsLeave}
                >
                  <div className="absolute -top-1 left-0 right-0 h-2" />
                  {toolLinks.map(({ path, label, icon: Icon }) => (
                    <Link key={path} to={path} onClick={() => setIsToolsOpen(false)}
                      className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm text-zinc-400 hover:bg-zinc-800 hover:text-emerald-400 transition-all">
                      <Icon className="w-4 h-4" /> {label}
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {navLinks.map(({ path, label, icon: Icon }) => (
              <Link key={path} to={path}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
                  isActive(path) ? 'text-emerald-400 bg-emerald-500/10' : 'text-zinc-400 hover:text-white hover:bg-zinc-800/50'
                }`}>
                <Icon className="w-4 h-4" /> {label}
              </Link>
            ))}
          </div>

          {/* Right Section */}
          <div className="hidden lg:flex items-center gap-3">
            {isConnected && (
              <>
                {/* Earnings Dropdown - REDESIGNED FOR SOMNIA */}
                <div className="relative" onMouseEnter={handleRewardsEnter} onMouseLeave={handleRewardsLeave}>
                  <button className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all duration-200 border bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20`}>
                    <Zap className="w-4 h-4 text-emerald-400" />
                    Earnings
                    <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${isRewardsOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {isRewardsOpen && (
                    <div className="absolute top-full right-0 w-60 bg-zinc-950 border border-zinc-800 rounded-2xl shadow-xl z-50 overflow-hidden"
                      style={{ marginTop: '4px' }} onMouseEnter={handleRewardsEnter} onMouseLeave={handleRewardsLeave}>
                      <div className="absolute -top-1 left-0 right-0 h-2" />
                      <div className="p-3 space-y-1">
                        <div className="flex items-center justify-between px-3 py-2.5 rounded-xl bg-zinc-900">
                          <div className="flex items-center gap-2 text-zinc-400 text-xs uppercase tracking-wide">
                            <Star className="w-3.5 h-3.5 text-emerald-500" /> Total Points
                          </div>
                          <span className="text-white font-bold text-sm">{userPoints}</span>
                        </div>

                        <div className="flex items-center justify-between px-3 py-2.5 rounded-xl bg-zinc-900">
                          <div className="flex items-center gap-2 text-zinc-400 text-xs uppercase tracking-wide">
                            <Award className="w-3.5 h-3.5 text-emerald-500" /> $WUP Balance
                          </div>
                          <span className="text-white font-bold text-sm">
                            {wupBalance !== undefined ? (Number(wupBalance) / 1e18).toFixed(2) : '0.00'}
                          </span>
                        </div>

                        {/* REACTIVITY BADGE (Replaces the Claim Button) */}
                        <div className="mt-2 text-[10px] text-center text-emerald-500/80 bg-emerald-500/10 py-1.5 rounded-lg border border-emerald-500/20 font-medium uppercase tracking-wider flex items-center justify-center gap-1.5">
                          <Zap className="w-3 h-3" /> Auto-Airdrops Active
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Display Name */}
                {displayName ? (
                  <div className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 px-4 py-2 rounded-xl">
                    <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                    <span className="text-sm font-medium text-white">{displayName}</span>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <input type="text" placeholder="Name" value={newName} onChange={(e) => setNewName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSetDisplayName()} className="px-4 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-white placeholder-zinc-600 focus:outline-none focus:border-emerald-500/50 text-sm w-28" disabled={isPending || isConfirming || savingToDb} />
                    <button onClick={handleSetDisplayName} disabled={isPending || isConfirming || savingToDb} className="bg-zinc-800 hover:bg-zinc-700 px-3 py-2 rounded-xl text-white transition-colors"><Check className="w-4 h-4" /></button>
                  </div>
                )}
              </>
            )}
            
            {/* Wallet Button */}
            <button onClick={handleWalletAction} className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all duration-200 flex items-center gap-2 ${isConnected ? 'bg-zinc-900 border border-zinc-800 text-white hover:border-red-500/50 hover:text-red-400' : 'bg-white text-black hover:bg-emerald-400'}`}>
              {isConnected ? (<><Wallet className="w-4 h-4" />{`${address.substring(0, 6)}...${address.substring(address.length - 4)}`}</>) : (<><Wallet className="w-4 h-4" />Connect</>)}
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isMobileMenuOpen && (
          <div className="lg:hidden pb-6 pt-4 space-y-2 border-t border-zinc-800 animate-fade-in">
            {toolLinks.map(({ path, label, icon: Icon }) => (
              <Link key={path} to={path} onClick={() => setIsMobileMenuOpen(false)} className={`flex items-center gap-3 px-4 py-3 rounded-xl text-base font-medium transition-all ${isActive(path) ? 'bg-emerald-500/10 text-emerald-400' : 'text-zinc-400 hover:bg-zinc-800 hover:text-white'}`}>
                <Icon className="w-5 h-5" /> {label}
              </Link>
            ))}
            {navLinks.map(({ path, label, icon: Icon }) => (
              <Link key={path} to={path} onClick={() => setIsMobileMenuOpen(false)} className={`flex items-center gap-3 px-4 py-3 rounded-xl text-base font-medium transition-all ${isActive(path) ? 'bg-emerald-500/10 text-emerald-400' : 'text-zinc-400 hover:bg-zinc-800 hover:text-white'}`}>
                <Icon className="w-5 h-5" /> {label}
              </Link>
            ))}
            
            {isConnected && (
              <div className="space-y-3 pt-4 border-t border-zinc-800">
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-zinc-900 p-4 rounded-xl border border-zinc-800 flex items-center justify-between">
                    <span className="text-zinc-500 text-xs uppercase">Points</span>
                    <span className="text-emerald-400 font-bold">{userPoints}</span>
                  </div>
                  <div className="bg-zinc-900 p-4 rounded-xl border border-zinc-800 flex items-center justify-between">
                    <span className="text-zinc-500 text-xs uppercase">$WUP</span>
                    <span className="text-emerald-400 font-bold">
                      {wupBalance !== undefined ? (Number(wupBalance) / 1e18).toFixed(2) : '0.00'}
                    </span>
                  </div>
                </div>

                {/* REACTIVITY BADGE MOBILE */}
                <div className="w-full py-2.5 rounded-xl border border-emerald-500/20 bg-emerald-500/10 text-emerald-500/80 text-xs font-bold uppercase tracking-widest flex items-center justify-center gap-2">
                  <Zap className="w-4 h-4" /> Auto-Airdrops Active
                </div>

                {displayName ? (
                  <div className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 px-4 py-3 rounded-xl">
                    <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                    <span className="text-sm font-medium text-white">{displayName}</span>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <input type="text" placeholder="Set Display Name" value={newName} onChange={(e) => setNewName(e.target.value)} className="flex-1 px-4 py-3 rounded-xl bg-zinc-900 border border-zinc-800 text-white focus:outline-none focus:border-emerald-500/50" disabled={isPending || isConfirming || savingToDb} />
                    <button onClick={handleSetDisplayName} disabled={isPending || isConfirming || savingToDb} className="bg-zinc-800 hover:bg-zinc-700 px-4 rounded-xl text-white">Save</button>
                  </div>
                )}
              </div>
            )}
            
            <button onClick={() => { handleWalletAction(); setIsMobileMenuOpen(false); }} className={`w-full mt-2 px-4 py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 ${isConnected ? 'bg-zinc-900 text-white border border-zinc-800 hover:border-red-500/50 hover:text-red-400' : 'bg-white text-black hover:bg-emerald-400'}`}>
              {isConnected ? (<><LogOut className="w-4 h-4" />Disconnect</>) : (<><Wallet className="w-4 h-4" />Connect Wallet</>)}
            </button>
          </div>
        )}
      </div>
    </nav>
  );
}
