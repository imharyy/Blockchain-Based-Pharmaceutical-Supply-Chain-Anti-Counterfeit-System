import { useState, useEffect } from 'react';
import api from '../services/api';
import BatchCard from '../components/BatchCard';
import TransferForm from '../components/TransferForm';
import toast from 'react-hot-toast';

export default function ManufacturerDashboard() {
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [transferBatch, setTransferBatch] = useState(null);
  const [creating, setCreating] = useState(false);
  const [lastCreated, setLastCreated] = useState(null); // unit tracking result
  const [form, setForm] = useState({
    batchId: '',
    medicineName: '',
    description: '',
    dosage: '',
    composition: '',
    sideEffects: '',
    expiryDate: '',
    quantity: '',
    unit: 'tablets',
    unitsPerBox: '50',
    boxesPerCarton: '20',
  });

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

  useEffect(() => {
    fetchBatches();
  }, []);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  // Computed packaging summary
  const totalUnits = Number(form.quantity) || 0;
  const unitsPerBox = Number(form.unitsPerBox) || 50;
  const boxesPerCarton = Number(form.boxesPerCarton) || 20;
  const totalBoxes = totalUnits > 0 ? Math.ceil(totalUnits / unitsPerBox) : 0;
  const totalCartons = totalBoxes > 0 ? Math.ceil(totalBoxes / boxesPerCarton) : 0;

  const handleCreate = async (e) => {
    e.preventDefault();
    setCreating(true);
    setLastCreated(null);
    try {
      const res = await api.post('/batch/create', {
        ...form,
        quantity: Number(form.quantity) || 0,
        unitsPerBox: Number(form.unitsPerBox) || 50,
        boxesPerCarton: Number(form.boxesPerCarton) || 20,
      });
      toast.success('Batch created with unit-level tracking!');
      setLastCreated(res.data.unitTracking);
      setShowCreate(false);
      setForm({
        batchId: '', medicineName: '', description: '', dosage: '',
        composition: '', sideEffects: '', expiryDate: '', quantity: '', unit: 'tablets',
        unitsPerBox: '50', boxesPerCarton: '20',
      });
      fetchBatches();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to create batch');
    } finally {
      setCreating(false);
    }
  };

  const viewBatchQR = async (batchId) => {
    try {
      const res = await api.get(`/batch/${batchId}/qr`);
      // Open QR in new window
      const w = window.open('', '_blank', 'width=500,height=500');
      w.document.write(`
        <html><head><title>QR - ${batchId}</title>
        <style>body{display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#0a0a1a;color:#f1f5f9;font-family:Inter,sans-serif;flex-direction:column;gap:16px}img{border-radius:16px}</style>
        </head><body>
        <h2>📦 ${batchId}</h2>
        <img src="${res.data.qrCode}" alt="QR Code" />
        <p>Scan to verify medicine authenticity</p>
        </body></html>
      `);
    } catch {
      toast.error('Failed to load QR code');
    }
  };

  return (
    <div className="main-content">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1>🏭 Manufacturer Dashboard</h1>
          <p>Create medicine batches with unit-level tracking</p>
        </div>
        <button onClick={() => { setShowCreate(!showCreate); setLastCreated(null); }} className="btn btn-primary btn-lg">
          {showCreate ? '✕ Cancel' : '➕ Create Batch'}
        </button>
      </div>

      {/* Unit Tracking Creation Summary */}
      {lastCreated && (
        <div className="card mb-lg animate-in" style={{ borderLeft: '4px solid var(--success-400)' }}>
          <div className="card-header">
            <h3 className="card-title">✅ Batch Created with Unit Tracking</h3>
          </div>
          <div className="grid grid-4">
            <div>
              <p className="text-sm text-muted">Total Units</p>
              <p style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--primary-400)' }}>{lastCreated.totalUnits}</p>
            </div>
            <div>
              <p className="text-sm text-muted">Boxes</p>
              <p style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--accent-400)' }}>{lastCreated.boxCount}</p>
            </div>
            <div>
              <p className="text-sm text-muted">Cartons</p>
              <p style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--success-400)' }}>{lastCreated.cartonCount}</p>
            </div>
            <div>
              <p className="text-sm text-muted">Merkle Root</p>
              <p className="text-mono text-sm" style={{ wordBreak: 'break-all' }}>
                {lastCreated.merkleRoot ? `${lastCreated.merkleRoot.slice(0, 10)}...${lastCreated.merkleRoot.slice(-8)}` : 'N/A'}
              </p>
            </div>
          </div>
          <p className="text-sm text-muted mt-md">
            📦 {lastCreated.unitsPerBox} units/box • 📦 {lastCreated.boxesPerCarton} boxes/carton •
            🌳 Merkle root stored on-chain for unit-level verification
          </p>
        </div>
      )}

      {/* Create Batch Form */}
      {showCreate && (
        <div className="card mb-lg animate-in">
          <div className="card-header">
            <h3 className="card-title">🧪 Create New Medicine Batch</h3>
          </div>
          <form onSubmit={handleCreate}>
            <div className="grid grid-2">
              <div className="form-group">
                <label className="form-label">Batch ID *</label>
                <input name="batchId" className="form-input" placeholder="BATCH-001" value={form.batchId} onChange={handleChange} required />
              </div>
              <div className="form-group">
                <label className="form-label">Medicine Name *</label>
                <input name="medicineName" className="form-input" placeholder="Amoxicillin 500mg" value={form.medicineName} onChange={handleChange} required />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Description</label>
              <textarea name="description" className="form-textarea" placeholder="Brief description of the medicine" value={form.description} onChange={handleChange} />
            </div>

            <div className="grid grid-3">
              <div className="form-group">
                <label className="form-label">Dosage</label>
                <input name="dosage" className="form-input" placeholder="500mg" value={form.dosage} onChange={handleChange} />
              </div>
              <div className="form-group">
                <label className="form-label">Total Units (Quantity) *</label>
                <input name="quantity" type="number" className="form-input" placeholder="1000" value={form.quantity} onChange={handleChange} required min="1" />
              </div>
              <div className="form-group">
                <label className="form-label">Unit Type</label>
                <select name="unit" className="form-select" value={form.unit} onChange={handleChange}>
                  <option value="tablets">Tablets</option>
                  <option value="capsules">Capsules</option>
                  <option value="bottles">Bottles</option>
                  <option value="vials">Vials</option>
                  <option value="boxes">Boxes</option>
                </select>
              </div>
            </div>

            {/* Packaging Configuration */}
            <div className="packaging-config-section">
              <h4 style={{ color: 'var(--text-primary)', marginBottom: 'var(--space-md)' }}>
                📦 Packaging Hierarchy
              </h4>
              <div className="grid grid-2">
                <div className="form-group">
                  <label className="form-label">Units per Box</label>
                  <input name="unitsPerBox" type="number" className="form-input" placeholder="50" value={form.unitsPerBox} onChange={handleChange} min="1" />
                </div>
                <div className="form-group">
                  <label className="form-label">Boxes per Carton</label>
                  <input name="boxesPerCarton" type="number" className="form-input" placeholder="20" value={form.boxesPerCarton} onChange={handleChange} min="1" />
                </div>
              </div>

              {/* Packaging Summary */}
              {totalUnits > 0 && (
                <div className="packaging-summary">
                  <div className="packaging-summary-item">
                    <span className="packaging-summary-count">{totalUnits}</span>
                    <span className="packaging-summary-label">Units</span>
                  </div>
                  <span className="packaging-arrow">→</span>
                  <div className="packaging-summary-item">
                    <span className="packaging-summary-count">{totalBoxes}</span>
                    <span className="packaging-summary-label">Boxes</span>
                  </div>
                  <span className="packaging-arrow">→</span>
                  <div className="packaging-summary-item">
                    <span className="packaging-summary-count">{totalCartons}</span>
                    <span className="packaging-summary-label">Cartons</span>
                  </div>
                </div>
              )}
            </div>

            <div className="grid grid-2">
              <div className="form-group">
                <label className="form-label">Composition</label>
                <input name="composition" className="form-input" placeholder="Active ingredients" value={form.composition} onChange={handleChange} />
              </div>
              <div className="form-group">
                <label className="form-label">Expiry Date *</label>
                <input name="expiryDate" type="date" className="form-input" value={form.expiryDate} onChange={handleChange} required />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Side Effects</label>
              <textarea name="sideEffects" className="form-textarea" placeholder="Known side effects" value={form.sideEffects} onChange={handleChange} style={{ minHeight: '60px' }} />
            </div>

            <button type="submit" className="btn btn-success btn-lg" disabled={creating}>
              {creating ? '⏳ Creating Batch & Generating Units...' : '✅ Create Batch with Unit Tracking'}
            </button>
          </form>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-4 mb-lg">
        <div className="stat-card">
          <div className="stat-icon purple">📦</div>
          <div className="stat-info">
            <h4>Total Batches</h4>
            <div className="stat-value">{batches.length}</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon green">✅</div>
          <div className="stat-info">
            <h4>Created</h4>
            <div className="stat-value">{batches.filter(b => b.status === 'created').length}</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon cyan">🚚</div>
          <div className="stat-info">
            <h4>In Transit</h4>
            <div className="stat-value">{batches.filter(b => b.status === 'in-transit').length}</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon yellow">📋</div>
          <div className="stat-info">
            <h4>Delivered</h4>
            <div className="stat-value">{batches.filter(b => ['delivered', 'with-consumer'].includes(b.status)).length}</div>
          </div>
        </div>
      </div>

      {/* Batch List */}
      {loading ? (
        <div className="loading-overlay">
          <div className="spinner"></div>
          <p>Loading batches...</p>
        </div>
      ) : batches.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-icon">📦</div>
            <h3>No Batches Yet</h3>
            <p>Create your first medicine batch to get started.</p>
          </div>
        </div>
      ) : (
        <div className="grid grid-3">
          {batches.map((batch) => (
            <BatchCard
              key={batch.batchId}
              batch={batch}
              onView={viewBatchQR}
              onTransfer={(b) => setTransferBatch(b)}
            />
          ))}
        </div>
      )}

      {/* Transfer Modal */}
      {transferBatch && (
        <TransferForm
          batch={transferBatch}
          onClose={() => setTransferBatch(null)}
          onSuccess={fetchBatches}
        />
      )}
    </div>
  );
}
