import { useState, useEffect } from 'react';
import { ordersApi } from '../api';

const STATUS_LABELS: Record<string, string> = {
  pending: '待确认',
  ongoing: '租赁中',
  completed: '已完成',
  cancelled: '已取消',
  disputed: '争议中',
};

export default function Orders() {
  const [list, setList] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await ordersApi.list({ page, limit: pageSize, status });
      setList(res.data);
      setTotal(res.total);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [page, status]);

  const handleUpdateStatus = (id: string, newStatus: string) => {
    if (!confirm(`确定要将订单状态更新为"${STATUS_LABELS[newStatus]}"吗？`))
      return;
    ordersApi
      .updateStatus(id, newStatus)
      .then(() => {
        alert('操作成功');
        loadData();
      })
      .catch((err) => {
        alert(err.response?.data?.message || '操作失败');
      });
  };

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="page-card">
      <div className="page-toolbar">
        <div style={{ display: 'flex', gap: 10 }}>
          <select
            className="filter-select"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="">全部状态</option>
            <option value="pending">待确认</option>
            <option value="ongoing">租赁中</option>
            <option value="completed">已完成</option>
            <option value="cancelled">已取消</option>
            <option value="disputed">争议中</option>
          </select>
        </div>
      </div>

      <table className="data-table">
        <thead>
          <tr>
            <th>订单ID</th>
            <th>商品</th>
            <th>承租方</th>
            <th>出租方</th>
            <th>金额</th>
            <th>租期</th>
            <th>状态</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          {loading && list.length === 0 ? (
            <tr>
              <td colSpan={8} style={{ textAlign: 'center', padding: 40 }}>
                加载中...
              </td>
            </tr>
          ) : list.length === 0 ? (
            <tr>
              <td colSpan={8} style={{ textAlign: 'center', padding: 40, color: '#9ca3af' }}>
                暂无数据
              </td>
            </tr>
          ) : (
            list.map((item) => (
              <tr key={item.id}>
                <td style={{ fontSize: 12, color: '#6b7280' }}>{item.id.slice(0, 8)}...</td>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {item.product?.images?.[0] && (
                      <img src={item.product.images[0]} alt="" className="product-img" />
                    )}
                    <span style={{ maxWidth: 180 }}>{item.product?.title}</span>
                  </div>
                </td>
                <td>{item.renter?.nickname || item.renter?.phone || '-'}</td>
                <td>{item.owner?.nickname || item.owner?.phone || '-'}</td>
                <td>
                  <div>租金 ¥{item.totalAmount}</div>
                  <div style={{ fontSize: 12, color: '#9ca3af' }}>
                    押金 ¥{item.deposit}
                  </div>
                </td>
                <td style={{ fontSize: 13 }}>
                  {new Date(item.startDate).toLocaleDateString()} ~{' '}
                  {new Date(item.endDate).toLocaleDateString()}
                </td>
                <td>
                  <span className={`status-badge status-${item.status}`}>
                    {STATUS_LABELS[item.status]}
                  </span>
                </td>
                <td>
                  {item.status === 'pending' && (
                    <button
                      className="action-btn primary"
                      onClick={() => handleUpdateStatus(item.id, 'ongoing')}
                    >
                      确认
                    </button>
                  )}
                  {item.status === 'ongoing' && (
                    <button
                      className="action-btn primary"
                      onClick={() => handleUpdateStatus(item.id, 'completed')}
                    >
                      完成
                    </button>
                  )}
                  {(item.status === 'pending' || item.status === 'ongoing') && (
                    <button
                      className="action-btn danger"
                      onClick={() => handleUpdateStatus(item.id, 'cancelled')}
                    >
                      取消
                    </button>
                  )}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>

      <div className="pagination">
        <span>共 {total} 条</span>
        <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
          上一页
        </button>
        <button className="active">{page}</button>
        <button disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
          下一页
        </button>
      </div>
    </div>
  );
}
