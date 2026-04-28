import { useState, useEffect } from 'react';
import api from '../services/api';
import BatchCard from '../components/BatchCard';
import TransferForm from '../components/TransferForm';
import toast from 'react-hot-toast';

export default function PharmacyDashboard() {
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [transferBatch, setTransferBatch] = useState(null);
  const [scanInput, setScanInput] = useState('');
  const [scanLoading, setScanLoading] = useState(false);
  const [scanResult, setScanResult] = useState(null);
  const [showScanSection, setShowScanSection] = useState(false);
  const [unitStats, setUnitStats] = useState({});

  const fetchBatches = async () => {
    try {
      const res = await api.get('/batch');
      setBatches(res.data.batches || []);
    } catch (err) {
      console.error('Failed:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchUnitStats = async (batchId) => {
    try {
      const res = await api.get(`/unit/batch/${batchId}/stats`);
      setUnitStats(prev => ({ ...prev, [batchId]: res.data.stats }));
    } catch (err) {
      // Silently fail — stats are optional enhancement
    }
  };

  useEffect(() => {
    fetchBatches();
  }, []);

  useEffect(() => {
    // Fetch unit stats for all batches
    batches.forEach(b => fetchUnitStats(b.batchId));
  }, [batches]);

  const handleScanPackaging = async (e) => {
    e.preventDefault();
    if (!scanInput.trim()) return;

    setScanLoading(true);
    setScanResult(null);

    try {
      const res = await api.post('/unit/scan-packaging', {
        levelId: scanInput.trim(),
        newStatus: 'at-pharmacy',
      });
      setScanResult(res.data);
      toast.success(`Shipment received! ${res.data.childrenUpdated} units updated.`);
      // Refresh stats
      if (res.data.level?.batchId) {
        fetchUnitStats(res.data.level.batchId);
      }
    } catch (err) {
      toast.error(err.response?.data?.error || 'Packaging scan failed');
      setScanResult({ error: err.response?.data?.error || 'Scan failed' });
    } finally {
      setScanLoading(false);
    }
  };

  return (
    <div className="main-content">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1>💊 Pharmacy Dashboard</h1>
          <p>Accept medicine shipments and dispense to consumers</p>
        </div>
        <button
          onClick={() => { setShowScanSection(!showScanSection); setScanResult(null); }}
          className="btn btn-primary btn-lg"
        >
          {showScanSection ? '✕ Close' : '📦 Scan Incoming Shipment'}
        </button>
      </div>

      {/* Scan Incoming Shipment Section */}
      {showScanSection && (
        <div className="card mb-lg animate-in" style={{ borderLeft: '4px solid var(--accent-400)' }}>
          <div className="card-header">
            <h3 className="card-title">📦 Scan Incoming Shipment</h3>
          </div>
          <p className="text-sm text-muted mb-md">
            Scan a carton or box QR code to acknowledge receipt. All units inside will be automatically marked as "at pharmacy".
          </p>
          <form onSubmit={handleScanPackaging}>
            <div className="form-group">
              <label className="form-label">Carton / Box ID</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g., BATCH-001-C-01 or BATCH-001-B-001"
                value={scanInput}
                onChange={(e) => setScanInput(e.target.value)}
                autoFocus
              />
              <p className="text-sm text-muted" style={{ marginTop: '4px' }}>
                Enter the carton ID (C) or box ID (B) from the packaging label
              </p>
            </div>
            <button type="submit" className="btn btn-success btn-lg" disabled={scanLoading || !scanInput.trim()}>
              {scanLoading ? '⏳ Processing...' : '✅ Confirm Receipt'}
            </button>
          </form>

          {/* Scan Result */}
          {scanResult && !scanResult.error && (
            <div className="scan-result-card mt-lg">
              <div className="scan-result-header valid">
                <span className="scan-result-icon">✅</span>
                <span>Shipment Received Successfully</span>
              </div>
              <div className="grid grid-3 mt-md">
                <div>
                  <p className="text-sm text-muted">Level ID</p>
                  <p className="text-mono" style={{ fontWeight: 600 }}>{scanResult.level?.levelId}</p>
                </div>
                <div>
                  <p className="text-sm text-muted">Type</p>
                  <p style={{ fontWeight: 600, textTransform: 'capitalize' }}>{scanResult.level?.type}</p>
                </div>
                <div>
                  <p className="text-sm text-muted">Units Updated</p>
                  <p style={{ fontSize: '1.3rem', fontWeight: 700, color: 'var(--success-400)' }}>
                    {scanResult.childrenUpdated}
                  </p>
                </div>
              </div>
            </div>
          )}

          {scanResult?.error && (
            <div className="alert alert-warning mt-lg">
              ⚠️ {scanResult.error}
            </div>
          )}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-3 mb-lg">
        <div className="stat-card">
          <div className="stat-icon green">📦</div>
          <div className="stat-info">
            <h4>Inventory</h4>
            <div className="stat-value">{batches.length}</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon cyan">📋</div>
          <div className="stat-info">
            <h4>Delivered</h4>
            <div className="stat-value">{batches.filter(b => b.status === 'delivered').length}</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon yellow">👤</div>
          <div className="stat-info">
            <h4>Dispensed</h4>
            <div className="stat-value">{batches.filter(b => b.status === 'with-consumer').length}</div>
          </div>
        </div>
      </div>

      {/* Batch List with Unit Stats */}
      {loading ? (
        <div className="loading-overlay"><div className="spinner"></div><p>Loading...</p></div>
      ) : batches.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-icon">💊</div>
            <h3>No Medicine Inventory</h3>
            <p>Batches will appear here once distributors transfer them to you.</p>
          </div>
        </div>
      ) : (
        <div className="grid grid-3">
          {batches.map((batch) => (
            <div key={batch.batchId} className="batch-card-wrapper">
              <BatchCard
                batch={batch}
                onTransfer={(b) => setTransferBatch(b)}
              />
              {/* Unit Stats Mini-Bar */}
              {unitStats[batch.batchId] && (
                <div className="unit-stats-mini">
                  <div className="unit-stats-bar">
                    {unitStats[batch.batchId].dispensed > 0 && (
                      <div
                        className="unit-bar-segment dispensed"
                        style={{ width: `${(unitStats[batch.batchId].dispensed / unitStats[batch.batchId].total) * 100}%` }}
                        title={`${unitStats[batch.batchId].dispensed} dispensed`}
                      />
                    )}
                    {unitStats[batch.batchId].atPharmacy > 0 && (
                      <div
                        className="unit-bar-segment at-pharmacy"
                        style={{ width: `${(unitStats[batch.batchId].atPharmacy / unitStats[batch.batchId].total) * 100}%` }}
                        title={`${unitStats[batch.batchId].atPharmacy} at pharmacy`}
                      />
                    )}
                    {unitStats[batch.batchId].inTransit > 0 && (
                      <div
                        className="unit-bar-segment in-transit"
                        style={{ width: `${(unitStats[batch.batchId].inTransit / unitStats[batch.batchId].total) * 100}%` }}
                        title={`${unitStats[batch.batchId].inTransit} in transit`}
                      />
                    )}
                    {unitStats[batch.batchId].created > 0 && (
                      <div
                        className="unit-bar-segment created"
                        style={{ width: `${(unitStats[batch.batchId].created / unitStats[batch.batchId].total) * 100}%` }}
                        title={`${unitStats[batch.batchId].created} created`}
                      />
                    )}
                  </div>
                  <div className="unit-stats-labels">
                    <span>{unitStats[batch.batchId].total} units</span>
                    <span>{unitStats[batch.batchId].dispensed} sold</span>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {transferBatch && (
        <TransferForm batch={transferBatch} onClose={() => setTransferBatch(null)} onSuccess={fetchBatches} />
      )}
    </div>
  );
}
