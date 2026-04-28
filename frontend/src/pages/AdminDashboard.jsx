import { useState, useEffect } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [dashRes, usersRes] = await Promise.all([
        api.get('/admin/dashboard'),
        api.get('/auth/users'),
      ]);
      setStats(dashRes.data);
      setUsers(usersRes.data.users || []);
    } catch (err) {
      console.error('Failed:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleBlockchainRegister = async (userId) => {
    try {
      await api.post('/admin/register-stakeholder', { userId });
      toast.success('Stakeholder registered on blockchain!');
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Registration failed');
    }
  };

  if (loading) {
    return (
      <div className="main-content">
        <div className="loading-overlay"><div className="spinner"></div><p>Loading dashboard...</p></div>
      </div>
    );
  }

  return (
    <div className="main-content">
      <div className="page-header">
        <h1>🛡️ Admin Dashboard</h1>
        <p>System overview and stakeholder management</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-4 mb-lg">
        <div className="stat-card">
          <div className="stat-icon purple">👥</div>
          <div className="stat-info">
            <h4>Total Users</h4>
            <div className="stat-value">{stats?.stats?.totalUsers || 0}</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon cyan">📦</div>
          <div className="stat-info">
            <h4>Total Batches</h4>
            <div className="stat-value">{stats?.stats?.totalBatches || 0}</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon green">🔍</div>
          <div className="stat-info">
            <h4>Total Scans</h4>
            <div className="stat-value">{stats?.stats?.totalScans || 0}</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon red">⚠️</div>
          <div className="stat-info">
            <h4>Flagged Scans</h4>
            <div className="stat-value">{stats?.stats?.flaggedScans || 0}</div>
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">👥 Registered Stakeholders</h3>
          <span className="badge badge-primary">{users.length} users</span>
        </div>

        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Username</th>
                <th>Email</th>
                <th>Role</th>
                <th>Wallet</th>
                <th>Blockchain</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user._id}>
                  <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{user.username}</td>
                  <td>{user.email}</td>
                  <td>
                    <span className={`badge badge-${
                      user.role === 'admin' ? 'danger' :
                      user.role === 'manufacturer' ? 'primary' :
                      user.role === 'distributor' ? 'cyan' :
                      user.role === 'pharmacy' ? 'success' : 'warning'
                    }`}>
                      {user.role}
                    </span>
                  </td>
                  <td className="text-mono text-sm" style={{ maxWidth: '120px' }}>
                    <span className="truncate" style={{ display: 'block' }}>
                      {user.walletAddress}
                    </span>
                  </td>
                  <td>
                    {user.isBlockchainRegistered ? (
                      <span className="badge badge-success">✅ Registered</span>
                    ) : (
                      <span className="badge badge-warning">⏳ Pending</span>
                    )}
                  </td>
                  <td>
                    {!user.isBlockchainRegistered && (
                      <button
                        onClick={() => handleBlockchainRegister(user._id)}
                        className="btn btn-primary btn-sm"
                      >
                        ⛓️ Register
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recent Scans */}
      {stats?.recentScans?.length > 0 && (
        <div className="card mt-lg">
          <div className="card-header">
            <h3 className="card-title">🔍 Recent Scan Activity</h3>
          </div>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Batch ID</th>
                  <th>Result</th>
                  <th>Location</th>
                  <th>Time</th>
                  <th>Flagged</th>
                </tr>
              </thead>
              <tbody>
                {stats.recentScans.map((scan) => (
                  <tr key={scan._id}>
                    <td className="text-mono">{scan.batchId}</td>
                    <td>
                      <span className={`badge badge-${
                        scan.verificationResult === 'valid' ? 'success' :
                        scan.verificationResult === 'suspicious' ? 'warning' : 'danger'
                      }`}>
                        {scan.verificationResult}
                      </span>
                    </td>
                    <td>{scan.location}</td>
                    <td className="text-sm">{new Date(scan.createdAt).toLocaleString()}</td>
                    <td>{scan.flagged ? '🚨' : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
