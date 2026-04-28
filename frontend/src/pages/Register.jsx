import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

export default function Register() {
  const [form, setForm] = useState({
    username: '',
    email: '',
    password: '',
    role: 'consumer',
    walletAddress: '',
    privateKey: '',
    organizationName: '',
  });
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await register(form);
      toast.success('Account created successfully!');
      navigate('/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card" style={{ maxWidth: '520px' }}>
        <div className="auth-header">
          <span className="auth-icon">🔗</span>
          <h1>Join PharmaChain</h1>
          <p>Create your account to participate in the supply chain</p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="grid grid-2">
            <div className="form-group">
              <label className="form-label">Username</label>
              <input
                id="register-username"
                name="username"
                type="text"
                className="form-input"
                placeholder="johndoe"
                value={form.username}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Role</label>
              <select
                id="register-role"
                name="role"
                className="form-select"
                value={form.role}
                onChange={handleChange}
              >
                <option value="manufacturer">🏭 Manufacturer</option>
                <option value="distributor">🚚 Distributor</option>
                <option value="pharmacy">💊 Pharmacy</option>
                <option value="consumer">👤 Consumer</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Organization Name</label>
            <input
              name="organizationName"
              type="text"
              className="form-input"
              placeholder="Your company or pharmacy name"
              value={form.organizationName}
              onChange={handleChange}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Email Address</label>
            <input
              id="register-email"
              name="email"
              type="email"
              className="form-input"
              placeholder="you@company.com"
              value={form.email}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <input
              id="register-password"
              name="password"
              type="password"
              className="form-input"
              placeholder="Min 6 characters"
              value={form.password}
              onChange={handleChange}
              required
              minLength={6}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Wallet Address</label>
            <input
              id="register-wallet"
              name="walletAddress"
              type="text"
              className="form-input"
              placeholder="0x... (from Hardhat or MetaMask)"
              value={form.walletAddress}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Private Key <span className="text-muted">(demo only – for signing transactions)</span></label>
            <input
              name="privateKey"
              type="password"
              className="form-input"
              placeholder="0x... (Hardhat account private key)"
              value={form.privateKey}
              onChange={handleChange}
            />
          </div>

          <button id="register-submit" type="submit" className="btn btn-primary w-full btn-lg" disabled={loading}>
            {loading ? '⏳ Creating account...' : '🚀 Create Account'}
          </button>
        </form>

        <div className="auth-footer">
          Already have an account?{' '}
          <Link to="/login">Sign in here</Link>
        </div>
      </div>
    </div>
  );
}
