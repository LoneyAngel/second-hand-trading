import { useState, useEffect } from 'react';
import { productsApi } from '../api';

export default function Products() {
  const [list, setList] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [keyword, setKeyword] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await productsApi.list({ page, limit: pageSize, status, keyword });
      setList(res.data);
      setTotal(res.total);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [page, status]);

  const handleSearch = () => {
    setPage(1);
    loadData();
  };

  const handleUpdateStatus = (id: string, newStatus: string) => {
    const label = newStatus === 'available' ? '上架' : newStatus === 'delist' ? '下架' : newStatus;
    if (!confirm(`确定要${label}该商品吗？`)) return;
    productsApi
      .updateStatus(id, newStatus)
      .then(() => {
        alert('操作成功');
        loadData();
      })
      .catch((err) => {
        alert(err.response?.data?.message || '操作失败');
      });
  };

  const handleDelete = (id: string) => {
    if (!confirm('确定要删除该商品吗？删除后不可恢复！')) return;
    productsApi
      .delete(id)
      .then(() => {
        alert('删除成功');
        loadData();
      })
      .catch((err) => {
        alert(err.response?.data?.message || '删除失败');
      });
  };

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="page-card">
      <div className="page-toolbar">
        <div style={{ display: 'flex', gap: 10 }}>
          <input
            type="text"
            className="search-input"
            placeholder="搜索商品标题..."
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          />
          <select
            className="filter-select"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="">全部状态</option>
            <option value="available">可租赁</option>
            <option value="rented">已租出</option>
            <option value="maintenance">维护中</option>
            <option value="delist">已下架</option>
          </select>
          <button className="primary-btn small" onClick={handleSearch}>
            搜索
          </button>
        </div>
      </div>

      <table className="data-table">
        <thead>
          <tr>
            <th>商品</th>
            <th>分类</th>
            <th>价格</th>
            <th>押金</th>
            <th>状态</th>
            <th>发布者</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          {loading && list.length === 0 ? (
            <tr>
              <td colSpan={7} style={{ textAlign: 'center', padding: 40 }}>
                加载中...
              </td>
            </tr>
          ) : list.length === 0 ? (
            <tr>
              <td colSpan={7} style={{ textAlign: 'center', padding: 40, color: '#9ca3af' }}>
                暂无数据
              </td>
            </tr>
          ) : (
            list.map((item) => (
              <tr key={item.id}>
                <td style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  {item.images?.[0] && (
                    <img src={item.images[0]} alt="" className="product-img" />
                  )}
                  <span style={{ maxWidth: 240 }}>{item.title}</span>
                </td>
                <td>{item.category?.name || '-'}</td>
                <td>¥{item.price}/天</td>
                <td>¥{item.deposit}</td>
                <td>
                  <span className={`status-badge status-${item.status}`}>
                    {item.status === 'available'
                      ? '可租赁'
                      : item.status === 'rented'
                      ? '已租出'
                      : item.status === 'delist'
                      ? '已下架'
                      : '维护中'}
                  </span>
                </td>
                <td>{item.user?.nickname || item.user?.phone || '-'}</td>
                <td>
                  {item.status === 'available' && (
                    <button
                      className="action-btn warning"
                      onClick={() => handleUpdateStatus(item.id, 'delist')}
                    >
                      下架
                    </button>
                  )}
                  {item.status === 'delist' && (
                    <button
                      className="action-btn primary"
                      onClick={() => handleUpdateStatus(item.id, 'available')}
                    >
                      上架
                    </button>
                  )}
                  <button
                    className="action-btn danger"
                    onClick={() => handleDelete(item.id)}
                  >
                    删除
                  </button>
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
