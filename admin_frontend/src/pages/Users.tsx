import { useState, useEffect } from 'react';
import { usersApi } from '../api';

export default function Users() {
  const [list, setList] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [keyword, setKeyword] = useState('');
  const [loading, setLoading] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await usersApi.list({ page, limit: pageSize, keyword });
      setList(res.data);
      setTotal(res.total);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [page]);

  const handleSearch = () => {
    setPage(1);
    loadData();
  };

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="page-card">
      <div className="page-toolbar">
        <div style={{ display: 'flex', gap: 10 }}>
          <input
            type="text"
            className="search-input"
            placeholder="搜索手机号/昵称..."
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          />
          <button className="primary-btn small" onClick={handleSearch}>
            搜索
          </button>
        </div>
      </div>

      <table className="data-table">
        <thead>
          <tr>
            <th>用户ID</th>
            <th>昵称</th>
            <th>手机号</th>
            <th>注册时间</th>
          </tr>
        </thead>
        <tbody>
          {loading && list.length === 0 ? (
            <tr>
              <td colSpan={4} style={{ textAlign: 'center', padding: 40 }}>
                加载中...
              </td>
            </tr>
          ) : list.length === 0 ? (
            <tr>
              <td colSpan={4} style={{ textAlign: 'center', padding: 40, color: '#9ca3af' }}>
                暂无数据
              </td>
            </tr>
          ) : (
            list.map((item) => (
              <tr key={item.id}>
                <td style={{ fontSize: 12, color: '#6b7280' }}>{item.id}</td>
                <td>{item.nickname || '-'}</td>
                <td>{item.phone}</td>
                <td>{new Date(item.createdAt).toLocaleString()}</td>
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
