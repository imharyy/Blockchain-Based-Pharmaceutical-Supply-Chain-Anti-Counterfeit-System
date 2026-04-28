import { useState } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';

export default function TransferForm({ batch, onClose, onSuccess }) {
  const [newOwnerAddress, setNewOwnerAddress] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!newOwnerAddress.trim()) return;

    setLoading(true);
    try {
      await api.post('/batch/transfer', {
        batchId: batch.batchId,
        newOwnerAddress: newOwnerAddress.trim(),
      });
      toast.success('Batch transferred successfully!');
      onSuccess?.();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Transfer failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>📤 Transfer Batch</h2>
          <button onClick={onClose} className="btn btn-ghost btn-icon">✕</button>
        </div>

        <div className="alert alert-info">
          Transferring batch <strong>{batch.batchId}</strong> — {batch.medicineName}
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Recipient Wallet Address</label>
            <input
              type="text"
              className="form-input"
              placeholder="0x..."
              value={newOwnerAddress}
              onChange={(e) => setNewOwnerAddress(e.target.value)}
              required
              autoFocus
            />
            <p className="text-sm text-muted mt-sm">
              The recipient must be a registered stakeholder with the next role in the supply chain.
            </p>
          </div>

          <div style={{ display: 'flex', gap: 'var(--space-sm)', justifyContent: 'flex-end' }}>
            <button type="button" onClick={onClose} className="btn btn-secondary">
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading || !newOwnerAddress.trim()}>
              {loading ? '⏳ Transferring...' : '📤 Confirm Transfer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
