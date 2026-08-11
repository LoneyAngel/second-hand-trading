import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authApi } from '../api';

export default function Login() {
  const navigate = useNavigate();
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone || !password) {
      setError('请输入手机号和密码');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await authApi.login({ phone, password });
      localStorage.setItem('admin_token', res.accessToken);
      localStorage.setItem('admin_user', JSON.stringify(res.user));
      navigate('/dashboard');
    } catch (err: any) {
        setError(err.response?.data?.message || '登录失败，请检查账号密码');
      } finally {
        setLoading(false);
      }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <h1>管理后台</h1>
        <p className="subtitle">二手交易平台管理系统</p>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>手机号</label>
            <input
              type="text"
              placeholder="请输入手机号"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label>密码</label>
            <input
              type="password"
              placeholder="请输入密码"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          {error && <p style={{ color: '#dc2626', fontSize: 13, marginBottom: 12 }}>{error}</p>}
          <button type="submit" className="primary-btn" disabled={loading}>
            {loading ? '登录中...' : '登录'}
          </button>
        </form>
      </div>
    </div>
  );
}
