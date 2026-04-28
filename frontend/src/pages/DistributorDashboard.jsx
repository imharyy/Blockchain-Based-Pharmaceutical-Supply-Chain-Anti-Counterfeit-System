import { useState, useEffect } from 'react';
import api from '../services/api';
import BatchCard from '../components/BatchCard';
import TransferForm from '../components/TransferForm';

export default function DistributorDashboard() {
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [transferBatch, setTransferBatch] = useState(null);

  const fetchBatches = async () => {
    try {
      const res = await api.get('/batch');
      setBatches(res.data.batches || []);
    } catch (err) {
      console.error('Failed to fetch batches:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchBatches(); }, []);

  return (
    <div className="main-content">
      <div className="page-header">
        <h1>🚚 Distributor Dashboard</h1>
        <p>Manage received batches and transfer to pharmacies</p>
      </div>

      <div className="grid grid-3 mb-lg">
        <div className="stat-card">
          <div className="stat-icon cyan">📦</div>
          <div className="stat-info">
            <h4>Total Batches</h4>
            <div className="stat-value">{batches.length}</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon green">🚚</div>
          <div className="stat-info">
            <h4>In Transit</h4>
            <div className="stat-value">{batches.filter(b => b.status === 'in-transit').length}</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon purple">✅</div>
          <div className="stat-info">
            <h4>Delivered</h4>
            <div className="stat-value">{batches.filter(b => b.status === 'delivered').length}</div>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="loading-overlay"><div className="spinner"></div><p>Loading...</p></div>
      ) : batches.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-icon">📭</div>
            <h3>No Batches Received</h3>
            <p>Wait for manufacturers to transfer batches to you.</p>
          </div>
        </div>
      ) : (
        <div className="grid grid-3">
          {batches.map((batch) => (
            <BatchCard
              key={batch.batchId}
              batch={batch}
              onTransfer={(b) => setTransferBatch(b)}
            />
          ))}
        </div>
      )}

      {transferBatch && (
        <TransferForm batch={transferBatch} onClose={() => setTransferBatch(null)} onSuccess={fetchBatches} />
      )}
    </div>
  );
}
