import React, { useState, useEffect, useMemo } from 'react';
import { 
  LayoutDashboard, Users, MessageSquare, Bell, LogOut, 
  Search, ShieldCheck, Mail, Zap, Download, Trash2, Database,
  Terminal, ShieldAlert, ChevronRight, User,
  Clock, ArrowLeft, Phone, Calendar, Edit3, Save, X, Info,
  CheckCircle2, XCircle, Package, ExternalLink, MessageCircle,
  Archive, Filter, ListFilter, History, MapPin, Store, Maximize2,
  Coffee, Banknote, Receipt, Globe, MessageSquareQuote, MousePointer2, UserPlus,
  FileText, ClipboardList, MonitorPlay, Star, Building2
} from 'lucide-react';
import { db, ref, onValue, remove, update, push } from '../firebaseConfig';

interface Inquiry {
  id: string;
  name: string;
  email: string;
  phone: string;
  interest: string;
  message?: string;
  timestamp: string;
  status: 'new' | 'processed' | 'closed';
  product?: string;
  source?: string;
  
  // Sales Log Extended Fields
  ownerName?: string;
  address?: string;
  clientFeedback?: string;
  demoSelected?: boolean;
  demoDescription?: string;
  demoOutcome?: string;

  // Metadata from website
  selectedPlan?: string; 
  price?: string | number; 
  city?: string; 
  restaurantName?: string; 
  
  // KhaoJi Specific Extended Data
  plan?: string; 
  whatsapp?: string; 
  branding?: string; 
  taxRate?: number | string;
  subtotal?: number | string;
  totalPayable?: number | string;

  // Admin-managed details
  clientResponse?: string;
  clientRequirements?: string;
  onboardingStatus?: 'onboarded' | 'not_onboarded';
  rejectionReason?: string;
  finalizedPlan?: string; 
}

interface Subscriber {
  id: string;
  email: string;
  subscribedAt: string;
  source: string;
}

interface AdminPanelProps {
  onLogout: () => void;
}

type TabType = 'inquiries' | 'customers' | 'subscribers' | 'history' | 'sales-log';
type RecordFilterType = 'processing' | 'onboarded' | 'lost';

export const AdminPanel: React.FC<AdminPanelProps> = ({ onLogout }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [activeTab, setActiveTab] = useState<TabType>('inquiries');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCustomerEmail, setSelectedCustomerEmail] = useState<string | null>(null);
  
  // Manual Form State
  const [newLog, setNewLog] = useState<Partial<Inquiry>>({
    name: '',
    ownerName: '',
    email: '',
    phone: '',
    address: '',
    message: '',
    clientResponse: '',
    clientFeedback: '',
    onboardingStatus: 'not_onboarded',
    demoSelected: false,
    demoDescription: '',
    demoOutcome: '',
    interest: 'Manual Entry'
  });
  const [formLoading, setFormLoading] = useState(false);

  // Modal States
  const [viewingInquiry, setViewingInquiry] = useState<Inquiry | null>(null);
  const [editingInquiry, setEditingInquiry] = useState<Inquiry | null>(null);
  const [showRecordVault, setShowRecordVault] = useState(false);
  const [vaultFilter, setVaultFilter] = useState<RecordFilterType>('processing');

  useEffect(() => {
    if (!isAuthenticated) return;

    const inquiriesRef = ref(db, 'inquiries');
    const subscribersRef = ref(db, 'subscribers');

    const unsubscribeInquiries = onValue(inquiriesRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const list = Object.entries(data).map(([key, value]: [string, any]) => ({
          status: 'new',
          ...value,
          id: key
        })).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        setInquiries(list);
      } else {
        setInquiries([]);
      }
    });

    const unsubscribeSubscribers = onValue(subscribersRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const list = Object.entries(data).map(([key, value]: [string, any]) => ({
          ...value,
          id: key
        })).sort((a, b) => new Date(b.subscribedAt).getTime() - new Date(a.subscribedAt).getTime());
        setSubscribers(list);
      } else {
        setSubscribers([]);
      }
    });

    return () => {
      unsubscribeInquiries();
      unsubscribeSubscribers();
    };
  }, [isAuthenticated]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === 'admin123') {
      setIsAuthenticated(true);
    } else {
      alert('Access Denied: Terminal mismatch.');
    }
  };

  const handleExitTerminal = () => {
    setIsAuthenticated(false);
    setPassword('');
    onLogout();
  };

  const handleSalesLogSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLog.name || !newLog.phone) return alert('Name and Contact Number are mandatory fields.');
    
    setFormLoading(true);
    try {
      const inquiriesRef = ref(db, 'inquiries');
      await push(inquiriesRef, {
        ...newLog,
        timestamp: new Date().toISOString(),
        status: newLog.onboardingStatus === 'onboarded' ? 'processed' : 'new',
        source: 'Command Terminal Sales Log'
      });
      alert('Sales Record Logged Successfully.');
      setNewLog({
        name: '', ownerName: '', email: '', phone: '', address: '',
        message: '', clientResponse: '', clientFeedback: '',
        onboardingStatus: 'not_onboarded', demoSelected: false,
        demoDescription: '', demoOutcome: '', interest: 'Manual Entry'
      });
      setActiveTab('history');
    } catch (err) {
      alert('Failed to log entry.');
    } finally {
      setFormLoading(false);
    }
  };

  const deleteItem = async (type: 'inquiries' | 'subscribers', id: string) => {
    const itemName = type === 'subscribers' ? 'subscriber' : 'record';
    if (confirm(`Permanently purge this ${itemName}?`)) {
      await remove(ref(db, `${type}/${id}`));
      if (type === 'inquiries') setViewingInquiry(null);
    }
  };

  const handleUpdateInquiry = async () => {
    if (!editingInquiry) return;
    try {
      const { id, ...data } = editingInquiry;
      const updateData = { ...data };
      if (activeTab === 'inquiries' || updateData.onboardingStatus) {
        updateData.status = 'processed';
      }
      await update(ref(db, `inquiries/${id}`), updateData);
      setEditingInquiry(null);
      if (viewingInquiry && viewingInquiry.id === id) {
        setViewingInquiry({ ...viewingInquiry, ...updateData });
      }
    } catch (err) {
      alert('Update failed.');
    }
  };

  const getPlanDisplay = (inq: Inquiry) => {
    if (inq.selectedPlan) return inq.selectedPlan;
    if (inq.plan) return `${inq.plan.toUpperCase()} PLAN`;
    const interest = (inq.interest || inq.product || '').toLowerCase();
    if (interest.includes('nexpos')) return 'NEXPOS STANDARD';
    if (inq.restaurantName || interest.includes('khaoji') || !inq.interest) return 'KHAOJI DEMO PLAN';
    return interest ? `${inq.interest.toUpperCase()} INQUIRY` : 'GENERAL INQUIRY';
  };

  const stats = useMemo(() => ({
    total: inquiries.length,
    new: inquiries.filter(i => i.status === 'new' && !i.onboardingStatus).length,
    processed: inquiries.filter(i => i.status !== 'new' || i.onboardingStatus).length,
    onboarded: inquiries.filter(i => i.onboardingStatus === 'onboarded').length,
    lost: inquiries.filter(i => i.onboardingStatus === 'not_onboarded').length,
    subscribers: subscribers.length,
  }), [inquiries, subscribers]);

  const groupedCustomers = useMemo(() => {
    const map = new Map<string, {
      name: string;
      email: string;
      phone: string;
      lastActive: string;
      inquiries: Inquiry[];
    }>();
    inquiries.forEach(inq => {
      const email = inq.email || inq.phone || 'unknown';
      if (!map.has(email)) {
        map.set(email, {
          name: inq.name || 'External User',
          email: inq.email || 'N/A',
          phone: inq.phone || 'N/A',
          lastActive: inq.timestamp,
          inquiries: []
        });
      }
      const data = map.get(email)!;
      data.inquiries.push(inq);
      if (new Date(inq.timestamp) > new Date(data.lastActive)) {
        data.lastActive = inq.timestamp;
      }
    });
    return Array.from(map.values()).sort((a, b) => new Date(b.lastActive).getTime() - new Date(a.lastActive).getTime());
  }, [inquiries]);

  const selectedCustomer = useMemo(() => {
    if (!selectedCustomerEmail) return null;
    return groupedCustomers.find(c => c.email === selectedCustomerEmail || c.phone === selectedCustomerEmail) || null;
  }, [selectedCustomerEmail, groupedCustomers]);

  const filteredData = useMemo(() => {
    if (activeTab === 'inquiries' || activeTab === 'history') {
      let data = inquiries;
      if (activeTab === 'inquiries') {
        data = data.filter(i => i.status === 'new' && !i.onboardingStatus);
      } else {
        data = data.filter(i => i.status !== 'new' || i.onboardingStatus);
      }
      return data.filter(i => 
        i.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
        i.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (i.restaurantName && i.restaurantName.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }
    if (activeTab === 'customers') {
      return groupedCustomers.filter(c => 
        c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        c.email.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    if (activeTab === 'subscribers') {
      return subscribers.filter(s => 
        s.email.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    return [];
  }, [activeTab, inquiries, subscribers, groupedCustomers, searchTerm]);

  const vaultData = useMemo(() => {
    if (vaultFilter === 'onboarded') return inquiries.filter(i => i.onboardingStatus === 'onboarded');
    if (vaultFilter === 'lost') return inquiries.filter(i => i.onboardingStatus === 'not_onboarded');
    return inquiries.filter(i => !i.onboardingStatus);
  }, [inquiries, vaultFilter]);

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center p-6 font-sans">
        <div className="w-full max-w-md animate-fade-in-up">
          <div className="bg-white/5 p-12 rounded-[3.5rem] border border-white/10 shadow-2xl backdrop-blur-3xl text-center">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-600/10 border border-blue-600/20 rounded-full text-[10px] font-black tracking-widest text-blue-500 uppercase mb-8">
               <ShieldAlert size={12} /> Secure Access
            </div>
            <img src="https://res.cloudinary.com/deic5ha4h/image/upload/v1765910261/NVISION.ai_ps2j0v.png" alt="Envision" className="h-8 mx-auto mb-6 invert" />
            <h1 className="text-xl font-black text-white mb-2 uppercase tracking-[0.2em]">CRM Terminal</h1>
            <p className="text-gray-500 text-xs mb-10 leading-relaxed uppercase tracking-wider font-bold">Admin authorization required</p>
            <form onSubmit={handleLogin} className="space-y-6 text-left">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-600 uppercase tracking-widest ml-1">Auth Key</label>
                <div className="relative">
                  <ShieldCheck className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={20} />
                  <input 
                    type="password" 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-black/40 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white outline-none focus:ring-2 focus:ring-blue-500/50 transition-all font-mono"
                  />
                </div>
              </div>
              <button className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black hover:bg-blue-500 transition-all shadow-xl shadow-blue-600/20 active:scale-95 flex items-center justify-center gap-2 uppercase tracking-widest text-xs">
                Open Dashboard
              </button>
            </form>
          </div>
          <p className="text-center text-gray-800 text-[10px] font-black uppercase tracking-widest mt-8">ENVISION Core v1.2</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#080808] text-gray-100 flex font-sans overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 border-r border-white/5 flex flex-col p-6 hidden lg:flex h-screen sticky top-0 bg-[#0a0a0a]">
        <div className="mb-12 flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center font-black text-xs text-white shadow-lg shadow-blue-600/20">E</div>
          <img src="https://res.cloudinary.com/deic5ha4h/image/upload/v1765910261/NVISION.ai_ps2j0v.png" alt="Envision" className="h-4 invert" />
        </div>
        <nav className="space-y-1 flex-grow">
          <p className="text-[10px] font-black text-gray-600 uppercase tracking-widest px-4 mb-4">Core Systems</p>
          <button 
            onClick={() => { setActiveTab('sales-log'); setSelectedCustomerEmail(null); }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'sales-log' ? 'bg-blue-600 text-white shadow-xl shadow-blue-600/20' : 'text-gray-500 hover:bg-white/5'}`}
          >
            <ClipboardList size={18} />
            <span className="font-bold text-sm">Sales Prospector</span>
          </button>
          <button 
            onClick={() => { setActiveTab('inquiries'); setSelectedCustomerEmail(null); }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'inquiries' ? 'bg-blue-600 text-white shadow-xl shadow-blue-600/20' : 'text-gray-500 hover:bg-white/5'}`}
          >
            <MessageSquare size={18} />
            <span className="font-bold text-sm">Leads Pipeline</span>
          </button>
          <button 
            onClick={() => { setActiveTab('customers'); setSelectedCustomerEmail(null); }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'customers' ? 'bg-blue-600 text-white shadow-xl shadow-blue-600/20' : 'text-gray-500 hover:bg-white/5'}`}
          >
            <Users size={18} />
            <span className="font-bold text-sm">Customer CRM</span>
          </button>
          <button 
            onClick={() => { setActiveTab('subscribers'); setSelectedCustomerEmail(null); }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'subscribers' ? 'bg-blue-600 text-white shadow-xl shadow-blue-600/20' : 'text-gray-500 hover:bg-white/5'}`}
          >
            <UserPlus size={18} />
            <span className="font-bold text-sm">Mailing List</span>
          </button>
          <button 
            onClick={() => { setActiveTab('history'); setSelectedCustomerEmail(null); }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'history' ? 'bg-blue-600 text-white shadow-xl shadow-blue-600/20' : 'text-gray-500 hover:bg-white/5'}`}
          >
            <History size={18} />
            <span className="font-bold text-sm">Inquiry History</span>
          </button>
        </nav>
        <button 
          onClick={handleExitTerminal}
          className="flex items-center gap-3 px-4 py-3 rounded-xl text-red-500 hover:bg-red-500/10 transition-all mt-auto border border-red-500/10"
        >
          <LogOut size={18} />
          <span className="font-bold text-sm uppercase tracking-tighter">Exit Terminal</span>
        </button>
      </aside>

      <main className="flex-grow flex flex-col h-screen overflow-hidden">
        <header className="h-20 border-b border-white/5 flex items-center justify-between px-8 bg-black/40 backdrop-blur-md sticky top-0 z-20">
          <div className="flex items-center gap-4 flex-grow max-w-xl">
            {selectedCustomerEmail ? (
              <button 
                onClick={() => setSelectedCustomerEmail(null)}
                className="flex items-center gap-2 text-gray-400 hover:text-white transition-all font-bold text-sm"
              >
                <ArrowLeft size={16} /> Return to CRM List
              </button>
            ) : (
              <div className="relative w-full">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600" size={18} />
                <input 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder={`Search ${activeTab === 'subscribers' ? 'subscribers' : 'leads, emails, or cafe names'}...`}
                  className="w-full bg-white/5 border border-white/10 rounded-full py-2.5 pl-12 pr-4 text-sm focus:ring-1 focus:ring-blue-500 transition-all outline-none"
                />
              </div>
            )}
          </div>
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3 pl-6 border-l border-white/5">
              <div className="text-right">
                <p className="text-xs font-black">Operator: Root</p>
                <p className="text-[10px] text-emerald-500 font-bold uppercase tracking-tighter">Status: Authorized</p>
              </div>
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-600 to-indigo-800 flex items-center justify-center font-black border border-white/10 shadow-lg">OP</div>
            </div>
          </div>
        </header>

        <div className="p-8 overflow-y-auto flex-grow space-y-8 custom-scrollbar">
          {activeTab === 'sales-log' ? (
            /* MANUAL SALES LOG ENTRY FORM */
            <div className="max-w-5xl mx-auto space-y-8 animate-fade-in-up pb-12">
               <div className="bg-[#111] p-10 rounded-[3.5rem] border border-white/5 shadow-2xl relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-blue-600 to-indigo-800"></div>
                  <div className="flex items-center justify-between mb-12">
                    <div>
                      <h2 className="text-3xl font-black tracking-tight text-white uppercase">New Sales Engagement</h2>
                      <p className="text-[10px] text-gray-500 uppercase font-black tracking-widest mt-1">Manual Prospect Entry • Operation Mode: Active</p>
                    </div>
                    <div className="p-4 bg-blue-600/10 text-blue-500 rounded-3xl border border-blue-600/20"><Zap size={32} /></div>
                  </div>

                  <form onSubmit={handleSalesLogSubmit} className="space-y-10">
                    <div className="grid md:grid-cols-2 gap-x-12 gap-y-8">
                      {/* Identity Section */}
                      <div className="space-y-6">
                        <label className="text-[10px] font-black text-blue-500 uppercase tracking-widest flex items-center gap-2"><Building2 size={12}/> Client Identification</label>
                        <div className="space-y-4">
                          <div className="relative">
                            <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
                            <input 
                              placeholder="Client / Company Name" 
                              className="w-full bg-black/40 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-sm text-white focus:border-blue-500 transition-all outline-none"
                              value={newLog.name}
                              onChange={(e) => setNewLog({...newLog, name: e.target.value})}
                            />
                          </div>
                          <div className="relative">
                            <ShieldCheck className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
                            <input 
                              placeholder="Owner Name" 
                              className="w-full bg-black/40 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-sm text-white focus:border-blue-500 transition-all outline-none"
                              value={newLog.ownerName}
                              onChange={(e) => setNewLog({...newLog, ownerName: e.target.value})}
                            />
                          </div>
                          <div className="relative">
                            <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
                            <input 
                              placeholder="Contact Number (WhatsApp)" 
                              className="w-full bg-black/40 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-sm text-white focus:border-blue-500 transition-all outline-none"
                              value={newLog.phone}
                              onChange={(e) => setNewLog({...newLog, phone: e.target.value})}
                            />
                          </div>
                          <div className="relative">
                            <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
                            <input 
                              placeholder="Business Address / City" 
                              className="w-full bg-black/40 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-sm text-white focus:border-blue-500 transition-all outline-none"
                              value={newLog.address}
                              onChange={(e) => setNewLog({...newLog, address: e.target.value})}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Interaction Intelligence Section */}
                      <div className="space-y-6">
                        <label className="text-[10px] font-black text-purple-500 uppercase tracking-widest flex items-center gap-2"><MessageSquareQuote size={12}/> Meeting Intelligence</label>
                        <div className="space-y-4">
                          <textarea 
                            placeholder="Main Meeting Description & Context..." 
                            className="w-full bg-black/40 border border-white/10 rounded-[2rem] py-4 px-6 text-sm text-white focus:border-purple-500 transition-all outline-none h-[120px] resize-none"
                            value={newLog.message}
                            onChange={(e) => setNewLog({...newLog, message: e.target.value})}
                          />
                          <textarea 
                            placeholder="Internal Response / Narrative of Meeting..." 
                            className="w-full bg-black/40 border border-white/10 rounded-[2rem] py-4 px-6 text-sm text-white focus:border-purple-500 transition-all outline-none h-[80px] resize-none"
                            value={newLog.clientResponse}
                            onChange={(e) => setNewLog({...newLog, clientResponse: e.target.value})}
                          />
                          <div className="relative">
                            <Star className="absolute left-4 top-4 text-gray-500" size={16} />
                            <textarea 
                              placeholder="Client Feedback & Sentiment..." 
                              className="w-full bg-black/40 border border-white/10 rounded-[2rem] py-4 pl-12 pr-6 text-sm text-white focus:border-purple-500 transition-all outline-none h-[80px] resize-none"
                              value={newLog.clientFeedback}
                              onChange={(e) => setNewLog({...newLog, clientFeedback: e.target.value})}
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="pt-8 border-t border-white/5 grid md:grid-cols-2 gap-12">
                      {/* Strategic Toggle Section */}
                      <div className="space-y-6">
                         <label className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Deployment Strategy</label>
                         <div className="grid grid-cols-2 gap-4">
                            <button 
                              type="button"
                              onClick={() => setNewLog({...newLog, onboardingStatus: newLog.onboardingStatus === 'onboarded' ? 'not_onboarded' : 'onboarded'})}
                              className={`flex flex-col items-center gap-3 p-6 rounded-[2rem] border transition-all ${newLog.onboardingStatus === 'onboarded' ? 'bg-emerald-600 border-emerald-500 shadow-xl shadow-emerald-500/20' : 'bg-black/20 border-white/5 text-gray-600 hover:border-emerald-500/30'}`}
                            >
                              <CheckCircle2 size={24} className={newLog.onboardingStatus === 'onboarded' ? 'text-white' : 'text-gray-700'} />
                              <span className="text-[9px] font-black uppercase tracking-[0.2em]">{newLog.onboardingStatus === 'onboarded' ? 'Onboarding Ready' : 'Onboarding Pending'}</span>
                            </button>
                            <button 
                              type="button"
                              onClick={() => setNewLog({...newLog, demoSelected: !newLog.demoSelected})}
                              className={`flex flex-col items-center gap-3 p-6 rounded-[2rem] border transition-all ${newLog.demoSelected ? 'bg-indigo-600 border-indigo-500 shadow-xl shadow-indigo-500/20' : 'bg-black/20 border-white/5 text-gray-600 hover:border-indigo-500/30'}`}
                            >
                              <MonitorPlay size={24} className={newLog.demoSelected ? 'text-white' : 'text-gray-700'} />
                              <span className="text-[9px] font-black uppercase tracking-[0.2em]">{newLog.demoSelected ? 'Demo Executed' : 'Demo Not Required'}</span>
                            </button>
                         </div>
                      </div>

                      {/* Dynamic Demo Feedback */}
                      {newLog.demoSelected && (
                        <div className="space-y-6 animate-fade-in">
                          <label className="text-[10px] font-black text-indigo-400 uppercase tracking-widest flex items-center gap-2"><MonitorPlay size={12}/> Demo Record Data</label>
                          <div className="space-y-4">
                             <input 
                              placeholder="Demo Description (What was showcased?)" 
                              className="w-full bg-black/40 border border-indigo-500/20 rounded-2xl py-4 px-6 text-sm text-white outline-none focus:border-indigo-500 transition-all"
                              value={newLog.demoDescription}
                              onChange={(e) => setNewLog({...newLog, demoDescription: e.target.value})}
                             />
                             <textarea 
                              placeholder="Final Outcome of the Demo..." 
                              className="w-full bg-black/40 border border-indigo-500/20 rounded-[2rem] py-4 px-6 text-sm text-white outline-none focus:border-indigo-500 transition-all h-[80px] resize-none"
                              value={newLog.demoOutcome}
                              onChange={(e) => setNewLog({...newLog, demoOutcome: e.target.value})}
                             />
                          </div>
                        </div>
                      )}
                    </div>

                    <button 
                      disabled={formLoading}
                      className="w-full py-6 bg-blue-600 hover:bg-blue-500 rounded-[2.5rem] font-black uppercase text-xs tracking-[0.3em] transition-all flex items-center justify-center gap-4 shadow-2xl shadow-blue-600/20 active:scale-95 disabled:opacity-50"
                    >
                      {formLoading ? 'Syncing with Master Server...' : (
                        <><Save size={18} /> Register Sales Engagement</>
                      )}
                    </button>
                  </form>
               </div>
            </div>
          ) : (
            /* ALL OTHER TABS */
            <>
              {!selectedCustomerEmail && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
                  <div className="bg-[#111] p-6 rounded-[2.5rem] border border-white/5 group hover:border-blue-500/30 transition-all cursor-pointer" onClick={() => setActiveTab('inquiries')}>
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-3 bg-blue-500/10 text-blue-500 rounded-2xl"><MessageSquare size={20} /></div>
                        <span className="text-[10px] font-black text-blue-400 bg-blue-400/10 px-2 py-1 rounded-full uppercase">Pipeline</span>
                    </div>
                    <p className="text-[10px] font-black text-gray-600 uppercase tracking-widest">Active Leads</p>
                    <h3 className="text-2xl font-black mt-1 tracking-tighter text-blue-500">{stats.new}</h3>
                  </div>
                  <div className="bg-[#111] p-6 rounded-[2.5rem] border border-white/5 group hover:border-orange-500/30 transition-all cursor-pointer" onClick={() => setActiveTab('subscribers')}>
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-3 bg-orange-500/10 text-orange-500 rounded-2xl"><Mail size={20} /></div>
                        <span className="text-[10px] font-black text-orange-500 bg-orange-500/10 px-2 py-1 rounded-full uppercase">Mailing</span>
                    </div>
                    <p className="text-[10px] font-black text-gray-600 uppercase tracking-widest">Subscribers</p>
                    <h3 className="text-2xl font-black mt-1 tracking-tighter text-orange-500">{stats.subscribers}</h3>
                  </div>
                  <div className="bg-[#111] p-6 rounded-[2.5rem] border border-white/5 group hover:border-emerald-500/30 transition-all cursor-pointer" onClick={() => setActiveTab('history')}>
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-3 bg-emerald-500/10 text-emerald-500 rounded-2xl"><CheckCircle2 size={20} /></div>
                        <span className="text-[10px] font-black text-emerald-500 bg-emerald-500/10 px-2 py-1 rounded-full uppercase">Success</span>
                    </div>
                    <p className="text-[10px] font-black text-gray-600 uppercase tracking-widest">Onboarded</p>
                    <h3 className="text-2xl font-black mt-1 tracking-tighter text-emerald-500">{stats.onboarded}</h3>
                  </div>
                  <div className="bg-[#111] p-6 rounded-[2.5rem] border border-white/5 group hover:border-red-500/30 transition-all cursor-pointer" onClick={() => setActiveTab('history')}>
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-3 bg-red-500/10 text-red-500 rounded-2xl"><XCircle size={20} /></div>
                        <span className="text-[10px] font-black text-red-500 bg-red-500/10 px-2 py-1 rounded-full uppercase">Lost</span>
                    </div>
                    <p className="text-[10px] font-black text-gray-600 uppercase tracking-widest">Lost Opportunity</p>
                    <h3 className="text-2xl font-black mt-1 tracking-tighter text-red-500">{stats.lost}</h3>
                  </div>
                  <div className="bg-[#111] p-6 rounded-[2.5rem] border border-white/5">
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-3 bg-purple-500/10 text-purple-500 rounded-2xl"><Database size={20} /></div>
                    </div>
                    <p className="text-[10px] font-black text-gray-600 uppercase tracking-widest">Total Logs</p>
                    <h3 className="text-2xl font-black mt-1 tracking-tighter">{stats.total}</h3>
                  </div>
                </div>
              )}

              <div className="flex flex-col gap-8">
                <div className="flex items-center justify-between">
                    <h2 className="text-2xl font-black tracking-tighter uppercase">
                      {selectedCustomerEmail ? 'Lifecycle History' : 
                      activeTab === 'inquiries' ? 'Operational Pipeline' : 
                      activeTab === 'customers' ? 'Customer Intelligence' : 
                      activeTab === 'subscribers' ? 'Global Mailing List' : 'Full Inquiry History'}
                    </h2>
                    {['inquiries', 'history'].includes(activeTab) && !selectedCustomerEmail && (
                      <button 
                        onClick={() => setShowRecordVault(true)}
                        className="px-5 py-2.5 bg-blue-600 border border-blue-500/20 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-500 transition-all flex items-center gap-2 shadow-xl shadow-blue-600/10"
                      >
                        <Archive size={14} className="text-white" /> Access Operational Vault
                      </button>
                    )}
                </div>

                {selectedCustomerEmail && selectedCustomer ? (
                  /* Single Customer CRM View */
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-fade-in-up">
                    <div className="lg:col-span-1 space-y-6">
                      <div className="bg-[#111] p-8 rounded-[3rem] border border-white/5 text-center relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-600 to-indigo-600"></div>
                        <div className="w-24 h-24 mx-auto rounded-[2rem] bg-blue-600/10 border border-blue-600/20 flex items-center justify-center mb-6">
                          <User size={40} className="text-blue-500" />
                        </div>
                        <h3 className="text-xl font-black text-white">{selectedCustomer.name}</h3>
                        <p className="text-sm text-gray-500 font-mono mt-1">{selectedCustomer.email}</p>
                        <div className="mt-8 pt-8 border-t border-white/5 space-y-4 text-left">
                           <div className="flex items-center gap-3"><Phone size={16} className="text-gray-600" /><span className="text-xs font-bold text-gray-400 uppercase tracking-widest">{selectedCustomer.phone}</span></div>
                           <div className="flex items-center gap-3"><Calendar size={16} className="text-gray-600" /><span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Since: {new Date(selectedCustomer.inquiries[selectedCustomer.inquiries.length-1].timestamp).toLocaleDateString()}</span></div>
                           <div className="flex items-center gap-3"><Clock size={16} className="text-gray-600" /><span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Last Activity: {new Date(selectedCustomer.lastActive).toLocaleDateString()}</span></div>
                        </div>
                      </div>
                    </div>

                    <div className="lg:col-span-2 space-y-6">
                       <div className="bg-[#111] rounded-[3rem] border border-white/5 p-8">
                          <h4 className="text-[10px] font-black text-gray-600 uppercase tracking-widest mb-8">Unified Activity Logs</h4>
                          <div className="space-y-10">
                            {selectedCustomer.inquiries.map((inq) => (
                              <div key={inq.id} className="relative pl-8 border-l border-white/5 group">
                                 <div className={`absolute left-[-5px] top-0 w-[9px] h-[9px] rounded-full ${inq.onboardingStatus === 'onboarded' ? 'bg-emerald-500' : inq.onboardingStatus === 'not_onboarded' ? 'bg-red-500' : 'bg-blue-600'} shadow-lg`}></div>
                                 <div className="flex flex-col md:flex-row md:items-center justify-between mb-4">
                                    <div className="flex items-center gap-2">
                                      <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest border border-white/10 bg-white/5 text-white">Target: {inq.interest || inq.product || 'Lead'}</span>
                                      <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest border ${inq.onboardingStatus === 'onboarded' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : inq.onboardingStatus === 'not_onboarded' ? 'bg-red-500/10 border-red-500/20 text-red-400' : 'bg-blue-500/10 border-blue-500/20 text-blue-400'}`}>
                                        {inq.onboardingStatus === 'onboarded' ? 'ONBOARDED' : inq.onboardingStatus === 'not_onboarded' ? 'LOST' : 'PROCESSING'}
                                      </span>
                                    </div>
                                    <span className="text-[10px] text-gray-600 font-mono">{new Date(inq.timestamp).toLocaleString()}</span>
                                 </div>
                                 <div className="space-y-4">
                                   <div className="bg-black/40 p-5 rounded-2xl border border-white/5">
                                      <div className="flex justify-between items-center mb-3">
                                        <p className="text-[10px] font-black text-gray-600 uppercase tracking-widest">Context & Plan</p>
                                        <div className="flex items-center gap-2">
                                          <span className="text-[9px] font-black uppercase bg-blue-600/10 text-blue-500 px-2 py-0.5 rounded border border-blue-600/10">Plan: {getPlanDisplay(inq)}</span>
                                          {(inq.price || inq.totalPayable) && <span className="text-[9px] font-black uppercase bg-emerald-500/10 text-emerald-500 px-2 py-0.5 rounded border border-emerald-500/10 flex items-center gap-1"><Banknote size={10} /> {inq.totalPayable || inq.price}</span>}
                                        </div>
                                      </div>
                                      <p className="text-sm text-gray-300 italic bg-white/5 p-4 rounded-xl border border-white/5 leading-relaxed">
                                        "{inq.message || 'Standard demo request received.'}"
                                      </p>
                                   </div>
                                 </div>
                                 <div className="mt-6 flex gap-3">
                                    <button onClick={() => setViewingInquiry(inq)} className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest text-gray-400 transition-all"><Info size={14} /> Full Record</button>
                                 </div>
                              </div>
                            ))}
                          </div>
                       </div>
                    </div>
                  </div>
                ) : (
                  /* Global Data Table View */
                  <div className="bg-[#111] rounded-[2.5rem] border border-white/5 overflow-hidden shadow-2xl">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left">
                        <thead className="bg-black/40 text-[10px] font-black text-gray-600 uppercase tracking-[0.2em] border-b border-white/5">
                          <tr>
                            {activeTab === 'subscribers' ? (
                              <>
                                <th className="px-8 py-5">Identity (Email)</th>
                                <th className="px-6 py-5">Originating Point</th>
                                <th className="px-6 py-5">Subscription Delta</th>
                                <th className="px-8 py-5 text-right">Actions</th>
                              </>
                            ) : activeTab === 'customers' ? (
                              <>
                                <th className="px-8 py-5">Full Name</th>
                                <th className="px-6 py-5">System Email</th>
                                <th className="px-6 py-5">Log Density</th>
                                <th className="px-8 py-5 text-right">Delta</th>
                              </>
                            ) : (
                              <>
                                <th className="px-8 py-5">Lead Identity</th>
                                <th className="px-6 py-5">Selection / Cafe Profile</th>
                                <th className="px-6 py-5">Lifecycle Status</th>
                                <th className="px-8 py-5 text-right">Outcome</th>
                              </>
                            )}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                          {activeTab === 'subscribers' && (filteredData as Subscriber[]).map((sub) => (
                            <tr key={sub.id} className="group hover:bg-white/[0.02] transition-colors">
                              <td className="px-8 py-6">
                                <div className="flex items-center gap-4">
                                  <div className="w-10 h-10 rounded-xl bg-orange-600/10 flex items-center justify-center font-bold text-orange-500 border border-orange-500/20 group-hover:bg-orange-600 group-hover:text-white transition-all uppercase">{sub.email?.charAt(0)}</div>
                                  <p className="text-sm font-bold text-white tracking-tight">{sub.email}</p>
                                </div>
                              </td>
                              <td className="px-6 py-6"><span className="text-[10px] font-black text-gray-500 uppercase flex items-center gap-2"><Globe size={12}/> {sub.source}</span></td>
                              <td className="px-6 py-6 font-mono text-[10px] text-gray-600">{new Date(sub.subscribedAt).toLocaleString()}</td>
                              <td className="px-8 py-6 text-right">
                                 <button onClick={() => deleteItem('subscribers', sub.id)} className="p-2 text-gray-700 hover:text-red-500 transition-all"><Trash2 size={16} /></button>
                              </td>
                            </tr>
                          ))}

                          {activeTab === 'customers' && (filteredData as any[]).map((customer) => (
                            <tr key={customer.email} className="group hover:bg-white/[0.02] transition-colors cursor-pointer" onClick={() => setSelectedCustomerEmail(customer.email)}>
                              <td className="px-8 py-6">
                                <div className="flex items-center gap-4">
                                  <div className="w-10 h-10 rounded-xl bg-blue-600/10 flex items-center justify-center font-bold text-blue-500 border border-blue-600/20 group-hover:bg-blue-600 group-hover:text-white transition-all uppercase">{customer.name?.charAt(0)}</div>
                                  <p className="text-sm font-bold text-white tracking-tight">{customer.name}</p>
                                </div>
                              </td>
                              <td className="px-6 py-6 font-mono text-[10px] text-gray-600">{customer.email}</td>
                              <td className="px-6 py-6 font-black text-[10px] uppercase text-gray-500">{customer.inquiries.length} Interactions</td>
                              <td className="px-8 py-6 text-right">
                                 <div className="flex items-center justify-end gap-4">
                                   <p className="text-[10px] text-gray-600 font-mono">{new Date(customer.lastActive).toLocaleDateString()}</p>
                                   <ChevronRight size={16} className="text-gray-800 group-hover:text-blue-500 transition-all" />
                                 </div>
                              </td>
                            </tr>
                          ))}

                          {(activeTab === 'inquiries' || activeTab === 'history') && (filteredData as Inquiry[]).map((inquiry) => (
                            <tr key={inquiry.id} className="group hover:bg-white/[0.02] transition-colors cursor-pointer" onClick={() => setViewingInquiry(inquiry)}>
                              <td className="px-8 py-6">
                                  <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-xl bg-blue-600/10 flex items-center justify-center font-bold text-blue-500 border border-blue-600/20 group-hover:bg-blue-600 group-hover:text-white transition-all uppercase">{inquiry.name?.charAt(0)}</div>
                                    <div>
                                      <p className="text-sm font-bold text-white tracking-tight">{inquiry.name}</p>
                                      <p className="text-[10px] text-gray-600 font-mono mt-0.5">{inquiry.email}</p>
                                    </div>
                                  </div>
                              </td>
                              <td className="px-6 py-6">
                                <div className="flex flex-col gap-1.5">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <span className="text-[9px] font-black uppercase text-gray-400 bg-white/5 px-2 py-0.5 rounded border border-white/5">{inquiry.interest || inquiry.product || 'Lead'}</span>
                                    {inquiry.restaurantName && (
                                      <div className="flex items-center gap-1.5 px-2 py-0.5 bg-blue-500/10 border border-blue-500/20 rounded text-[9px] text-blue-400 font-black uppercase">
                                        <Coffee size={10} /> {inquiry.restaurantName}
                                      </div>
                                    )}
                                  </div>
                                  <div className="flex flex-wrap items-center gap-3">
                                    <span className="text-[8px] text-gray-500 font-black uppercase tracking-widest flex items-center gap-1">
                                      <Package size={10} className="text-blue-500" /> {getPlanDisplay(inquiry)}
                                    </span>
                                  </div>
                                </div>
                              </td>
                              <td className="px-6 py-6">
                                 <div className="flex items-center gap-2">
                                   <div className={`w-2 h-2 rounded-full ${inquiry.onboardingStatus === 'not_onboarded' ? 'bg-red-500' : inquiry.onboardingStatus === 'onboarded' ? 'bg-emerald-500' : 'bg-blue-600'}`}></div>
                                   <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                                     {inquiry.onboardingStatus === 'onboarded' ? 'Onboarded' : inquiry.onboardingStatus === 'not_onboarded' ? 'Lost' : 'Pipeline'}
                                   </span>
                                 </div>
                              </td>
                              <td className="px-8 py-6 text-right">
                                 <div className="flex items-center justify-end gap-3">
                                    {inquiry.onboardingStatus === 'onboarded' ? (
                                      <div className="flex items-center gap-2 text-emerald-500">
                                        <CheckCircle2 size={12} />
                                        <span className="text-[9px] font-black uppercase tracking-widest">{inquiry.finalizedPlan || 'SUCCESS'}</span>
                                      </div>
                                    ) : inquiry.onboardingStatus === 'not_onboarded' ? (
                                      <div className="flex items-center gap-2 text-red-500">
                                        <XCircle size={12} />
                                        <span className="text-[9px] font-black uppercase tracking-widest">LOST</span>
                                      </div>
                                    ) : (
                                      <span className="text-[9px] font-black uppercase text-gray-700">IN PIPELINE</span>
                                    )}
                                    <button onClick={(e) => { e.stopPropagation(); deleteItem('inquiries', inquiry.id); }} className="p-2 text-gray-700 hover:text-red-500 transition-all ml-4"><Trash2 size={16} /></button>
                                 </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {filteredData.length === 0 && (
                        <div className="py-20 text-center space-y-4">
                          <Archive size={40} className="mx-auto text-gray-800 opacity-20" />
                          <p className="text-[10px] font-black text-gray-700 uppercase tracking-widest">No matching records found</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </main>

      {/* MODAL: FULL SCREEN OPERATIONAL VAULT */}
      {showRecordVault && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black animate-fade-in">
          <div className="w-full h-full bg-[#0a0a0a] flex flex-col relative overflow-hidden">
            <header className="px-12 py-10 border-b border-white/5 flex items-center justify-between bg-black/40 backdrop-blur-xl">
              <div className="flex items-center gap-6">
                <div className="p-5 bg-blue-600/10 text-blue-500 rounded-[1.8rem] border border-blue-600/20"><Archive size={32} /></div>
                <div>
                  <h3 className="text-3xl font-black uppercase tracking-tight text-white">Master Operational Vault</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <Database size={12} className="text-blue-500" />
                    <p className="text-[11px] text-gray-500 uppercase font-black tracking-widest">Global Interaction DB • Accessing Core Logs</p>
                  </div>
                </div>
              </div>
              <button onClick={() => setShowRecordVault(false)} className="group p-5 bg-white/5 hover:bg-red-600 rounded-full text-gray-400 hover:text-white transition-all flex items-center gap-2 border border-white/5">
                <span className="text-[10px] font-black uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-all">Close Vault</span>
                <X size={28} />
              </button>
            </header>

            <div className="px-12 py-8 border-b border-white/5 bg-black/20 flex gap-6 overflow-x-auto no-scrollbar">
               {[
                 { id: 'processing', label: 'Pipeline / In-Processing', icon: <Clock size={16}/>, color: 'blue' },
                 { id: 'onboarded', label: 'Onboarded Master List', icon: <CheckCircle2 size={16}/>, color: 'emerald' },
                 { id: 'lost', label: 'Lost Opportunity Vault', icon: <XCircle size={16}/>, color: 'red' }
               ].map((cat) => (
                 <button 
                  key={cat.id}
                  onClick={() => setVaultFilter(cat.id as any)}
                  className={`px-8 py-4 rounded-[2rem] text-[11px] font-black uppercase tracking-widest flex items-center gap-3 transition-all border shrink-0 ${
                    vaultFilter === cat.id 
                      ? `bg-${cat.color}-600/10 border-${cat.color}-600/40 text-${cat.color}-500 shadow-2xl shadow-${cat.color}-600/10` 
                      : 'bg-white/5 border-white/10 text-gray-500 hover:bg-white/10'
                  }`}
                 >
                   {cat.icon} {cat.label}
                 </button>
               ))}
            </div>

            <div className="flex-grow overflow-y-auto p-12 custom-scrollbar bg-gradient-to-b from-black/20 to-transparent">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                {vaultData.map((inq) => (
                  <div 
                    key={inq.id} 
                    onClick={() => { setViewingInquiry(inq); setShowRecordVault(false); }}
                    className="group bg-white/[0.03] border border-white/5 rounded-[2.5rem] p-8 hover:border-blue-500/30 hover:bg-white/[0.05] transition-all cursor-pointer relative overflow-hidden shadow-xl"
                  >
                    <div className="flex items-center justify-between mb-6">
                      <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center font-black text-white group-hover:bg-blue-600 group-hover:shadow-lg group-hover:shadow-blue-600/20 transition-all uppercase">{inq.name?.charAt(0)}</div>
                      <span className="text-[10px] text-gray-600 font-mono tracking-tighter">{new Date(inq.timestamp).toLocaleString()}</span>
                    </div>
                    <h4 className="font-black text-white tracking-tight text-lg mb-1">{inq.name}</h4>
                    {inq.restaurantName && <p className="text-[10px] text-blue-500 font-black uppercase mb-1 flex items-center gap-1.5"><Coffee size={12}/> {inq.restaurantName}</p>}
                    <p className="text-[11px] text-gray-500 font-mono mb-6 truncate">{inq.email}</p>
                    <div className="flex flex-wrap gap-2 mb-6">
                      <span className="px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest bg-white/5 border border-white/10 text-gray-400">Target: {inq.interest || inq.product || 'Lead'}</span>
                      <span className="px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest bg-blue-600/10 border border-blue-600/20 text-blue-500">Plan: {getPlanDisplay(inq)}</span>
                    </div>
                    <div className="pt-6 border-t border-white/5 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className={`w-1.5 h-1.5 rounded-full ${
                          inq.onboardingStatus === 'onboarded' ? 'bg-emerald-500' :
                          inq.onboardingStatus === 'not_onboarded' ? 'bg-red-500' :
                          'bg-blue-500'
                        }`}></div>
                        <span className={`text-[10px] font-black uppercase tracking-widest ${
                          inq.onboardingStatus === 'onboarded' ? 'text-emerald-500' :
                          inq.onboardingStatus === 'not_onboarded' ? 'text-red-500' :
                          'text-blue-500'
                        }`}>
                          {inq.onboardingStatus === 'onboarded' ? 'Onboarded' : inq.onboardingStatus === 'not_onboarded' ? 'Lost' : 'Pipeline'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all">
                        <span className="text-[9px] font-black uppercase text-blue-500">View Detail</span>
                        <ChevronRight size={14} className="text-blue-500" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <footer className="p-10 border-t border-white/5 bg-black/40 text-center">
               <div className="flex items-center justify-center gap-4">
                  <span className="h-px w-12 bg-white/5"></span>
                  <p className="text-[11px] font-black text-gray-700 uppercase tracking-[0.4em]">ENVISION Core Database v1.2.0 • Secured Master Node</p>
                  <span className="h-px w-12 bg-white/5"></span>
               </div>
            </footer>
          </div>
        </div>
      )}

      {/* MODAL 1: DETAILED INQUIRY RECORD */}
      {viewingInquiry && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-6 bg-black/90 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-4xl bg-[#0a0a0a] border border-white/10 rounded-[3.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <header className="p-10 border-b border-white/5 flex items-center justify-between bg-black/40">
              <div className="flex items-center gap-6">
                <div className="w-20 h-20 rounded-[1.8rem] bg-gradient-to-br from-blue-600 to-indigo-800 flex items-center justify-center font-black text-2xl text-white shadow-xl shadow-blue-600/20 uppercase">
                  {viewingInquiry.name?.charAt(0)}
                </div>
                <div>
                  <h3 className="text-2xl font-black tracking-tight text-white">{viewingInquiry.name}</h3>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-[10px] text-blue-500 font-black uppercase tracking-widest flex items-center gap-1"><Terminal size={12}/> Detailed Record</span>
                    <span className="w-1 h-1 bg-gray-800 rounded-full"></span>
                    <span className="text-[10px] text-gray-600 font-mono">{new Date(viewingInquiry.timestamp).toLocaleString()}</span>
                  </div>
                </div>
              </div>
              <button onClick={() => setViewingInquiry(null)} className="p-3 bg-white/5 rounded-full text-gray-400 hover:text-white transition-all"><X size={24} /></button>
            </header>

            <div className="p-10 overflow-y-auto space-y-8 custom-scrollbar">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {/* Contact Segment */}
                <div className="space-y-4">
                  <p className="text-[10px] font-black text-gray-600 uppercase tracking-[0.2em] ml-1">Identity & Contact</p>
                  <div className="space-y-3">
                    <div className="flex items-center gap-4 p-4 bg-white/[0.03] border border-white/5 rounded-2xl">
                      <Mail size={18} className="text-blue-500" />
                      <span className="text-sm font-bold text-gray-300 font-mono truncate">{viewingInquiry.email}</span>
                    </div>
                    <div className="flex items-center gap-4 p-4 bg-white/[0.03] border border-white/5 rounded-2xl">
                      <Phone size={18} className="text-emerald-500" />
                      <span className="text-sm font-bold text-gray-300 font-mono">{viewingInquiry.phone}</span>
                    </div>
                    {viewingInquiry.ownerName && (
                      <div className="flex items-center gap-4 p-4 bg-white/[0.03] border border-white/5 rounded-2xl">
                        <ShieldCheck size={18} className="text-blue-500" />
                        <span className="text-sm font-bold text-gray-300 uppercase tracking-tighter">Owner: {viewingInquiry.ownerName}</span>
                      </div>
                    )}
                    {viewingInquiry.address && (
                      <div className="flex items-center gap-4 p-4 bg-white/[0.03] border border-white/5 rounded-2xl">
                        <MapPin size={18} className="text-emerald-500" />
                        <span className="text-xs font-bold text-gray-300 uppercase leading-tight">{viewingInquiry.address}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Engagement Intelligence */}
                <div className="space-y-4">
                  <p className="text-[10px] font-black text-gray-600 uppercase tracking-[0.2em] ml-1">Intelligence</p>
                  <div className="space-y-3">
                    <div className="flex items-center gap-4 p-4 bg-white/[0.03] border border-white/5 rounded-2xl">
                      <Package size={18} className="text-indigo-500" />
                      <span className="text-sm font-bold text-gray-300 uppercase tracking-tighter">Target: {getPlanDisplay(viewingInquiry)}</span>
                    </div>
                    {viewingInquiry.demoSelected && (
                      <div className="flex flex-col gap-2 p-4 bg-indigo-600/10 border border-indigo-600/20 rounded-2xl">
                        <div className="flex items-center gap-2 text-indigo-400 font-black uppercase text-[10px]"><MonitorPlay size={14}/> Demo engaged</div>
                        <p className="text-[10px] text-gray-400 italic">Outcome: {viewingInquiry.demoOutcome || 'Pending'}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Strategy Segment */}
                <div className="space-y-4">
                  <p className="text-[10px] font-black text-gray-600 uppercase tracking-[0.2em] ml-1">Lifecycle Outcome</p>
                  <div className="p-6 rounded-[2rem] border border-emerald-500/20 bg-emerald-500/5">
                    <div className="flex items-center gap-3 mb-4">
                       <div className={`w-3 h-3 rounded-full ${viewingInquiry.onboardingStatus === 'onboarded' ? 'bg-emerald-500' : 'bg-red-500'}`}></div>
                       <span className="text-xs font-black uppercase text-white tracking-widest">{viewingInquiry.onboardingStatus === 'onboarded' ? 'SUCCESS' : 'IN PIPELINE'}</span>
                    </div>
                    <p className="text-[10px] text-gray-500 font-bold uppercase leading-relaxed">System Response: {viewingInquiry.clientResponse || 'N/A'}</p>
                  </div>
                </div>
              </div>

              {/* Narratives */}
              <div className="grid md:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <p className="text-[10px] font-black text-gray-600 uppercase tracking-[0.2em] ml-1 flex items-center gap-2"><FileText size={14}/> Meeting Brief</p>
                  <div className="bg-white/[0.03] border border-white/5 p-6 rounded-[2rem]">
                    <p className="text-sm text-gray-300 leading-relaxed italic">"{viewingInquiry.message || 'No narrative brief.'}"</p>
                  </div>
                </div>
                <div className="space-y-4">
                  <p className="text-[10px] font-black text-gray-600 uppercase tracking-[0.2em] ml-1 flex items-center gap-2"><Star size={14}/> Client Feedback</p>
                  <div className="bg-white/[0.03] border border-white/5 p-6 rounded-[2rem]">
                    <p className="text-sm text-gray-300 leading-relaxed italic">"{viewingInquiry.clientFeedback || 'No feedback logged.'}"</p>
                  </div>
                </div>
              </div>
            </div>

            <footer className="p-10 border-t border-white/5 bg-black/40 flex gap-5">
               <button onClick={() => deleteItem('inquiries', viewingInquiry.id)} className="px-6 py-4 bg-red-600/10 border border-red-600/20 text-red-500 rounded-2xl hover:bg-red-600 hover:text-white transition-all"><Trash2 size={20}/></button>
               <button onClick={() => { setEditingInquiry(viewingInquiry); setViewingInquiry(null); }} className="flex-grow py-4 bg-blue-600 rounded-2xl text-[10px] font-black uppercase tracking-widest text-white hover:bg-blue-500 transition-all flex items-center justify-center gap-2">
                 <Zap size={16} /> Edit Operational State
               </button>
            </footer>
          </div>
        </div>
      )}

      {/* MODAL 2: EDIT/RESOLVE */}
      {editingInquiry && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-black/95 backdrop-blur-xl animate-fade-in">
          <div className="w-full max-w-2xl bg-[#0d0d0d] border border-blue-500/20 rounded-[4rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <header className="p-10 border-b border-white/5 flex items-center justify-between bg-black/40">
              <div className="flex items-center gap-4">
                <div className="p-4 bg-blue-600/10 text-blue-500 rounded-[1.5rem]"><Edit3 size={28} /></div>
                <div>
                  <h3 className="text-2xl font-black uppercase tracking-tight text-white">Lead Finalization</h3>
                  <p className="text-[10px] text-gray-500 uppercase font-black tracking-widest">Update Lifecycle for {editingInquiry.name}</p>
                </div>
              </div>
              <button onClick={() => setEditingInquiry(null)} className="p-2 text-gray-500 hover:text-white transition-all"><X size={28} /></button>
            </header>

            <div className="p-10 overflow-y-auto space-y-12 custom-scrollbar">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                <div className="space-y-4">
                  <label className="text-[10px] font-black text-gray-600 uppercase tracking-[0.2em] ml-1">Lifecycle Stage</label>
                  <div className="flex flex-col gap-2">
                    {['new', 'processed', 'closed'].map(st => (
                      <button 
                        key={st}
                        onClick={() => setEditingInquiry({...editingInquiry, status: st as any})}
                        className={`py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest border transition-all ${editingInquiry.status === st ? 'bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-600/20' : 'bg-black/20 border-white/5 text-gray-500 hover:bg-white/5'}`}
                      >
                        {st === 'new' ? 'Pending' : st === 'processed' ? 'Processing' : 'Closed'}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="space-y-4">
                  <label className="text-[10px] font-black text-gray-600 uppercase tracking-[0.2em] ml-1">Onboarding Outcome</label>
                  <div className="flex flex-col gap-2">
                    <button 
                      onClick={() => setEditingInquiry({...editingInquiry, onboardingStatus: 'onboarded'})}
                      className={`py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest border transition-all flex items-center justify-center gap-2 ${editingInquiry.onboardingStatus === 'onboarded' ? 'bg-emerald-600 border-emerald-500 text-white shadow-xl shadow-emerald-500/20' : 'bg-black/20 border-white/5 text-gray-500 hover:border-emerald-500/50'}`}
                    >
                      <CheckCircle2 size={16} /> Mark Onboarded
                    </button>
                    <button 
                      onClick={() => setEditingInquiry({...editingInquiry, onboardingStatus: 'not_onboarded'})}
                      className={`py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest border transition-all flex items-center justify-center gap-2 ${editingInquiry.onboardingStatus === 'not_onboarded' ? 'bg-red-600 border-red-500 text-white shadow-xl shadow-red-500/20' : 'bg-black/20 border-white/5 text-gray-500 hover:border-red-500/50'}`}
                    >
                      <XCircle size={16} /> Mark Lost
                    </button>
                  </div>
                </div>
              </div>

              <div className="space-y-8 pt-8 border-t border-white/5">
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-blue-500 uppercase tracking-[0.2em] ml-1 flex items-center gap-2"><MessageCircle size={14}/> Interaction Response</label>
                  <textarea 
                    value={editingInquiry.clientResponse || ''}
                    onChange={(e) => setEditingInquiry({...editingInquiry, clientResponse: e.target.value})}
                    placeholder="Describe internal interaction notes..."
                    className="w-full h-28 bg-black/40 border border-white/10 rounded-[2rem] py-5 px-6 text-sm text-white focus:ring-1 focus:ring-blue-500 transition-all outline-none resize-none"
                  />
                </div>
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.2em] ml-1 flex items-center gap-2"><MonitorPlay size={14}/> Demo Narrative</label>
                  <textarea 
                    value={editingInquiry.demoDescription || ''}
                    onChange={(e) => setEditingInquiry({...editingInquiry, demoDescription: e.target.value})}
                    placeholder="Specific convinced features or custom needs..."
                    className="w-full h-28 bg-black/40 border border-white/10 rounded-[2rem] py-5 px-6 text-sm text-white focus:ring-1 focus:ring-emerald-500 transition-all outline-none resize-none"
                  />
                </div>
              </div>
            </div>

            <footer className="p-10 border-t border-white/5 bg-black/40 flex gap-5">
               <button onClick={() => setEditingInquiry(null)} className="flex-1 py-4 border border-white/10 rounded-2xl text-[10px] font-black uppercase tracking-widest text-gray-500 hover:bg-white/5 transition-all">Discard</button>
               <button onClick={handleUpdateInquiry} className="flex-[2] py-5 bg-blue-600 rounded-2xl text-[10px] font-black uppercase tracking-widest text-white shadow-2xl shadow-blue-600/30 hover:bg-blue-500 transition-all flex items-center justify-center gap-2 font-black uppercase"><Save size={18} /> Finalize Lead Outcome</button>
            </footer>
          </div>
        </div>
      )}

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.05); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(255, 255, 255, 0.1); }
        .animate-fade-in { animation: fadeIn 0.3s ease-out; }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
};