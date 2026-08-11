import { useState, useEffect } from 'react';
import { statsApi } from '../api';

export default function Dashboard() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const data = await statsApi.overview();
      setStats(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div style={{ textAlign: 'center', padding: 80 }}>加载中...</div>;
  }

  const cards = [
    { label: '用户总数', value: stats?.userCount || 0, icon: '👥' },
    { label: '商品总数', value: stats?.productCount || 0, icon: '📦' },
    { label: '订单总数', value: stats?.orderCount || 0, icon: '📋' },
    { label: '今日订单', value: stats?.todayOrders || 0, icon: '✨' },
  ];

  return (
    <div>
      <div className="stats-grid">
        {cards.map((card, index) => (
          <div key={index} className="stat-card">
            <span className="stat-icon">{card.icon}</span>
            <div className="stat-label">{card.label}</div>
            <div className="stat-value">{card.value}</div>
          </div>
        ))}
      </div>

      <div className="page-card">
        <h3 style={{ marginBottom: 12, fontSize: 16, fontWeight: 600 }}>快速开始</h3>
        <ul style={{ color: '#64748b', paddingLeft: 18, lineHeight: 2, fontSize: 13 }}>
          <li>商品管理：查看、上下架、删除商品</li>
          <li>用户管理：查看平台用户列表</li>
          <li>订单管理：查看、更新订单状态</li>
        </ul>
      </div>
    </div>
  );
}
