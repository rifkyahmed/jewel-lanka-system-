import React, { useState } from 'react';
import { TrendingUp, Award, BarChart2, PieChart, Activity, DollarSign, Calendar, Users, AlertTriangle, Package, CreditCard, Clock, Bot } from 'lucide-react';

const Analytics = ({ dashboard, token, API_BASE }) => {
  const [aiInsights, setAiInsights] = useState(null);
  const [isGeneratingInsights, setIsGeneratingInsights] = useState(false);
  const [marketPrediction, setMarketPrediction] = useState(null);
  const [isPredictingMarket, setIsPredictingMarket] = useState(false);

  if (!dashboard || !dashboard.kpis) {
    return <div style={{ padding: 40, textAlign: 'center' }}>Loading analytics data...</div>;
  }

  const generateInsights = async () => {
    setIsGeneratingInsights(true);
    try {
      const res = await fetch(`${API_BASE}/ai/insights`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ dashboardData: dashboard })
      });
      if(res.ok) {
        const data = await res.json();
        setAiInsights(data.insights);
      }
    } catch(err) {
      console.error(err);
      alert('Failed to generate insights');
    }
    setIsGeneratingInsights(false);
  };

  const generateMarketPrediction = async () => {
    setIsPredictingMarket(true);
    try {
      const res = await fetch(`${API_BASE}/ai/predict-market`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      if(res.ok) {
        const data = await res.json();
        setMarketPrediction(data.prediction);
      }
    } catch(err) {
      console.error(err);
      alert('Failed to generate market prediction');
    }
    setIsPredictingMarket(false);
  };

  const {
    yearlySales = [],
    rollingSales = [],
    categorySalesVelocity = [],
    salesByDay = [],
    topProducts = [],
    customerValueReport = [],
    ordersOverview = {},
    deadStockSummary = [],
    attentionNeeded = {},
    kpis = {}
  } = dashboard;

  // Max calculations for charts
  const maxYearly = Math.max(...yearlySales.map(d => d.revenue), 1);
  const maxRolling = Math.max(...rollingSales.map(d => d.revenue), 1);
  const maxCategoryRev = Math.max(...categorySalesVelocity.map(c => c.totalRevenue), 1);
  const maxDaySales = Math.max(...salesByDay.map(d => d.revenue), 1);

  return (
    <div style={{ padding: '24px', animation: 'fadeIn 0.3s ease' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h2 style={{ display: 'flex', alignItems: 'center', gap: '10px', margin: 0, color: 'var(--color-primary)' }}>
          <TrendingUp size={24} /> Overall Analytics & Business Intelligence
        </h2>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button 
            onClick={generateMarketPrediction} 
            disabled={isPredictingMarket}
            style={{
              display: 'flex', alignItems: 'center', gap: '8px', 
              background: '#0f172a', color: '#fff', 
              padding: '10px 16px', borderRadius: '8px', border: 'none', 
              cursor: isPredictingMarket ? 'not-allowed' : 'pointer',
              fontWeight: 600, fontSize: '0.9rem',
              opacity: isPredictingMarket ? 0.7 : 1
            }}
          >
            <TrendingUp size={18} color="var(--color-gold)" />
            {isPredictingMarket ? 'Predicting Market...' : 'AI Market Forecast'}
          </button>
          <button 
            onClick={generateInsights} 
            disabled={isGeneratingInsights}
            style={{
              display: 'flex', alignItems: 'center', gap: '8px', 
              background: 'var(--color-primary)', color: '#fff', 
              padding: '10px 16px', borderRadius: '8px', border: 'none', 
              cursor: isGeneratingInsights ? 'not-allowed' : 'pointer',
              fontWeight: 600, fontSize: '0.9rem',
              opacity: isGeneratingInsights ? 0.7 : 1
            }}
          >
            <Bot size={18} color="var(--color-gold)" />
            {isGeneratingInsights ? 'Analyzing Business...' : 'Generate AI Report'}
          </button>
        </div>
      </div>

      {marketPrediction && (
        <div style={{ background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '12px', padding: '24px', marginBottom: '20px', animation: 'fadeIn 0.5s ease', borderLeft: '4px solid var(--color-success)' }}>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: '0 0 16px 0', color: 'var(--color-primary)' }}>
            <TrendingUp size={20} color="var(--color-success)" /> Global Market Forecast & Strategy
          </h3>
          <div style={{ fontSize: '0.95rem', lineHeight: '1.6', color: '#334155', whiteSpace: 'pre-wrap' }}>
            {marketPrediction}
          </div>
        </div>
      )}

      {aiInsights && (
        <div style={{ background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '12px', padding: '24px', marginBottom: '30px', animation: 'fadeIn 0.5s ease', borderLeft: '4px solid var(--color-gold)' }}>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: '0 0 16px 0', color: 'var(--color-primary)' }}>
            <Bot size={20} color="var(--color-gold)" /> NVIDIA AI Executive Summary
          </h3>
          <div style={{ fontSize: '0.95rem', lineHeight: '1.6', color: '#334155', whiteSpace: 'pre-wrap' }}>
            {aiInsights}
          </div>
        </div>
      )}

      {/* HIGHLIGHT KPIS */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '30px' }}>
        <div style={{ background: '#fff', padding: '20px', borderRadius: '12px', borderLeft: '4px solid var(--color-gold)', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
          <div style={{ fontSize: '0.85rem', color: 'var(--color-muted)', marginBottom: '8px' }}>Total YTD Revenue</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--color-primary)' }}>Rs. {(kpis.totalRevenue || 0).toLocaleString()}</div>
        </div>
        <div style={{ background: '#fff', padding: '20px', borderRadius: '12px', borderLeft: '4px solid var(--color-accent)', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
          <div style={{ fontSize: '0.85rem', color: 'var(--color-muted)', marginBottom: '8px' }}>Avg Order Value</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--color-primary)' }}>Rs. {(kpis.avgOrderValue || 0).toLocaleString()}</div>
        </div>
        <div style={{ background: '#fff', padding: '20px', borderRadius: '12px', borderLeft: '4px solid #3b82f6', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
          <div style={{ fontSize: '0.85rem', color: 'var(--color-muted)', marginBottom: '8px' }}>Customer Retention</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--color-primary)' }}>{dashboard.retention || 0}%</div>
        </div>
        <div style={{ background: '#fff', padding: '20px', borderRadius: '12px', borderLeft: '4px solid #ec4899', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
          <div style={{ fontSize: '0.85rem', color: 'var(--color-muted)', marginBottom: '8px' }}>Total Orders Processed</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--color-primary)' }}>{kpis.totalOrders || 0}</div>
        </div>
        <div style={{ background: '#fff', padding: '20px', borderRadius: '12px', borderLeft: '4px solid #10b981', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
          <div style={{ fontSize: '0.85rem', color: 'var(--color-muted)', marginBottom: '8px' }}>YTD Profit Margin</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--color-primary)' }}>
            {kpis.totalRevenue ? Math.round(((kpis.thisMonthProfits || 0) / kpis.thisMonthSales) * 100) : 0}%
          </div>
        </div>
      </div>

      {/* ACTIONABLE ALERTS & 14-DAY MOMENTUM */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '24px', marginBottom: '24px' }}>
        <div style={{ background: '#fff', borderRadius: '12px', padding: '24px', boxShadow: '0 4px 12px rgba(0,0,0,0.03)', border: '1px solid #fee2e2' }}>
          <h3 style={{ margin: '0 0 20px 0', fontSize: '1.1rem', color: '#ef4444', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertTriangle size={18} /> Actionable Alerts
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ padding: '8px', background: '#fee2e2', color: '#ef4444', borderRadius: '8px' }}><Package size={16} /></div>
              <div>
                <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>Severe Dead Stock</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-muted)' }}>{attentionNeeded.severeDeadStockCount || 0} items aged &gt;60 days</div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ padding: '8px', background: '#fff7ed', color: '#f97316', borderRadius: '8px' }}><Clock size={16} /></div>
              <div>
                <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>Overdue Repairs</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-muted)' }}>{attentionNeeded.overdueRepairsCount || 0} pending repairs over 5 days</div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ padding: '8px', background: '#fef3c7', color: '#f59e0b', borderRadius: '8px' }}><Activity size={16} /></div>
              <div>
                <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>Low Stock Categories</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-muted)' }}>{attentionNeeded.lowStockCategoriesCount || 0} categories running dry</div>
              </div>
            </div>
          </div>
        </div>

        <div style={{ background: '#fff', borderRadius: '12px', padding: '24px', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
          <h3 style={{ margin: '0 0 20px 0', fontSize: '1.1rem', color: 'var(--color-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Activity size={18} /> 14-Day Revenue Momentum
          </h3>
          <div style={{ display: 'flex', alignItems: 'flex-end', height: '140px', gap: '8px', paddingTop: '10px' }}>
            {rollingSales.map((item, idx) => {
              const heightPct = (item.revenue / maxRolling) * 100 || 2;
              return (
                <div key={idx} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', height: '100%' }}>
                  <div style={{ 
                    width: '100%', 
                    height: `${heightPct}%`, 
                    backgroundColor: idx >= 7 ? 'var(--color-gold)' : '#e2e8f0', 
                    borderRadius: '4px 4px 0 0',
                    transition: 'height 0.5s ease'
                  }} title={`Rs. ${item.revenue}`}></div>
                </div>
              );
            })}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '12px', fontSize: '0.75rem', color: 'var(--color-muted)' }}>
            <span>{rollingSales[0]?.date}</span>
            <span style={{ color: 'var(--color-gold)', fontWeight: 600 }}>Last 7 Days vs Prior 7</span>
            <span>{rollingSales[rollingSales.length - 1]?.date}</span>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px', marginBottom: '24px' }}>
        {/* YEARLY REVENUE CHART */}
        <div style={{ background: '#fff', borderRadius: '12px', padding: '24px', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
          <h3 style={{ margin: '0 0 20px 0', fontSize: '1.1rem', color: 'var(--color-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <BarChart2 size={18} /> Yearly Revenue Trajectory (YTD)
          </h3>
          <div style={{ display: 'flex', alignItems: 'flex-end', height: '220px', gap: '12px', paddingTop: '20px' }}>
            {yearlySales.map((item, idx) => {
              const heightPct = (item.revenue / maxYearly) * 100 || 2;
              return (
                <div key={idx} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', height: '100%', group: 'bar' }}>
                  <div style={{ fontSize: '0.7rem', color: 'var(--color-muted)', marginBottom: '8px', opacity: item.revenue > 0 ? 1 : 0, transform: 'rotate(-45deg)', whiteSpace: 'nowrap' }}>
                    Rs. {item.revenue > 1000 ? Math.round(item.revenue/1000)+'k' : item.revenue}
                  </div>
                  <div style={{ 
                    width: '100%', 
                    height: `${heightPct}%`, 
                    backgroundColor: 'var(--color-accent)', 
                    borderRadius: '4px 4px 0 0',
                    transition: 'height 1s ease-out'
                  }}></div>
                  <div style={{ marginTop: '10px', fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-muted)' }}>{item.month}</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* TOP SELLING PRODUCTS */}
        <div style={{ background: '#fff', borderRadius: '12px', padding: '24px', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
          <h3 style={{ margin: '0 0 20px 0', fontSize: '1.1rem', color: 'var(--color-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Award size={18} /> Top Performing Products
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {topProducts.map((p, idx) => (
              <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '12px', borderBottom: idx !== topProducts.length -1 ? '1px solid #f1f5f9' : 'none' }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--color-primary)' }}>{p.name}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-muted)' }}>{p._id} | {p.totalSold} Units Sold</div>
                </div>
                <div style={{ fontWeight: 700, color: 'var(--color-gold)' }}>
                  Rs. {p.totalRevenue.toLocaleString()}
                </div>
              </div>
            ))}
            {topProducts.length === 0 && <div style={{ fontSize: '0.85rem', color: '#94a3b8' }}>No sales data available yet.</div>}
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '24px' }}>
        {/* SALES BY DAY OF WEEK */}
        <div style={{ background: '#fff', borderRadius: '12px', padding: '24px', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
          <h3 style={{ margin: '0 0 20px 0', fontSize: '1.1rem', color: 'var(--color-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Calendar size={18} /> Revenue by Day of Week
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {salesByDay.map((d, idx) => {
              const pct = Math.round((d.revenue / maxDaySales) * 100) || 0;
              return (
                <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '40px', fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-muted)' }}>{d.day.substring(0,3)}</div>
                  <div style={{ flex: 1, height: '8px', background: '#f1f5f9', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{ width: `${pct}%`, height: '100%', background: 'var(--color-gold)', borderRadius: '4px' }}></div>
                  </div>
                  <div style={{ width: '70px', textAlign: 'right', fontSize: '0.8rem', fontWeight: 600 }}>
                    Rs. {d.revenue ? Math.round(d.revenue / 1000) + 'k' : '0'}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* CATEGORY SALES SPLIT */}
        <div style={{ background: '#fff', borderRadius: '12px', padding: '24px', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
          <h3 style={{ margin: '0 0 20px 0', fontSize: '1.1rem', color: 'var(--color-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <PieChart size={18} /> Category Revenue Split
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {categorySalesVelocity.map((cat, idx) => {
              const pct = Math.round((cat.totalRevenue / maxCategoryRev) * 100) || 0;
              return (
                <div key={idx}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>{cat._id}</span>
                    <span style={{ fontSize: '0.8rem', color: 'var(--color-muted)' }}>Rs. {cat.totalRevenue.toLocaleString()}</span>
                  </div>
                  <div style={{ height: '6px', background: '#f1f5f9', borderRadius: '3px' }}>
                    <div style={{ width: `${pct}%`, height: '100%', background: idx % 2 === 0 ? 'var(--color-accent)' : 'var(--color-gold)', borderRadius: '3px' }}></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* VIP CUSTOMERS */}
        <div style={{ background: '#fff', borderRadius: '12px', padding: '24px', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
          <h3 style={{ margin: '0 0 20px 0', fontSize: '1.1rem', color: 'var(--color-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Users size={18} /> Top VIP Clients
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {customerValueReport.map((c, idx) => (
              <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#e0e7ff', color: '#4f46e5', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.9rem' }}>
                  {c.name.charAt(0).toUpperCase()}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{c.name}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-muted)' }}>{c.ordersCount} lifetime orders</div>
                </div>
                <div style={{ fontWeight: 700, color: 'var(--color-primary)' }}>
                  Rs. {c.totalSpent > 1000 ? Math.round(c.totalSpent/1000) + 'k' : c.totalSpent}
                </div>
              </div>
            ))}
            {customerValueReport.length === 0 && <div style={{ fontSize: '0.85rem', color: '#94a3b8' }}>No customer data.</div>}
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginTop: '24px' }}>
        {/* PAYMENT METHODS OVERVIEW */}
        <div style={{ background: '#fff', borderRadius: '12px', padding: '24px', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
          <h3 style={{ margin: '0 0 20px 0', fontSize: '1.1rem', color: 'var(--color-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <CreditCard size={18} /> Payment Methods (All-Time)
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {Object.entries(ordersOverview).map(([method, count], idx) => {
              const totalOrders = kpis.totalOrders || Math.max(Object.values(ordersOverview).reduce((a,b)=>a+b, 0), 1);
              const pct = Math.round((count / totalOrders) * 100) || 0;
              const colors = ['#3b82f6', 'var(--color-gold)', '#10b981'];
              return (
                <div key={idx}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>{method.replace(/([A-Z])/g, ' $1').trim()}</span>
                    <span style={{ fontSize: '0.8rem', color: 'var(--color-muted)' }}>{count} Orders ({pct}%)</span>
                  </div>
                  <div style={{ height: '8px', background: '#f1f5f9', borderRadius: '4px' }}>
                    <div style={{ width: `${pct}%`, height: '100%', background: colors[idx % 3], borderRadius: '4px' }}></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* DEAD STOCK EXPOSURE */}
        <div style={{ background: '#fff', borderRadius: '12px', padding: '24px', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
          <h3 style={{ margin: '0 0 20px 0', fontSize: '1.1rem', color: 'var(--color-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <DollarSign size={18} /> Dead Stock Exposure
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ padding: '16px', background: '#f8fafc', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: '0.85rem', color: 'var(--color-muted)' }}>Total Tied-Up Capital</div>
                <div style={{ fontSize: '1.4rem', fontWeight: 700, color: '#ef4444' }}>Rs. {(kpis.deadStockValue || 0).toLocaleString()}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '0.85rem', color: 'var(--color-muted)' }}>Total Items</div>
                <div style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--color-primary)' }}>{kpis.deadStockCount || 0}</div>
              </div>
            </div>
            
            <div style={{ marginTop: '8px' }}>
              {deadStockSummary.map((group, idx) => (
                <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f1f5f9' }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: 500 }}>{group._id}</span>
                  <span style={{ fontSize: '0.85rem', color: 'var(--color-muted)' }}>{group.items.length} items</span>
                </div>
              ))}
              {deadStockSummary.length === 0 && <div style={{ fontSize: '0.85rem', color: '#94a3b8' }}>No dead stock recorded. Great job!</div>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Analytics;
