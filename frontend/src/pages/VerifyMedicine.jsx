import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import SupplyChainTimeline from '../components/SupplyChainTimeline';
import QRScanner from '../components/QRScanner';

export default function VerifyMedicine() {
  const { batchId: paramBatchId, serialNumber: paramSerialNumber } = useParams();
  const navigate = useNavigate();
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [verifyMode, setVerifyMode] = useState(null); // 'batch' or 'unit'
  const verifyCalledRef = useRef(false);

  useEffect(() => {
    // Prevent React StrictMode double-invocation from calling the API twice
    if (verifyCalledRef.current) return;

    if (paramSerialNumber) {
      verifyCalledRef.current = true;
      verifyUnit(paramSerialNumber);
    } else if (paramBatchId) {
      verifyCalledRef.current = true;
      verifyBatch(paramBatchId);
    }

    return () => {
      // Reset on unmount so re-navigation works
      verifyCalledRef.current = false;
    };
  }, [paramBatchId, paramSerialNumber]);

  const verifyBatch = async (batchId) => {
    setLoading(true);
    setError('');
    setResult(null);
    setVerifyMode('batch');

    try {
      const res = await api.post('/verify/scan', {
        batchId,
        location: 'web-app',
        scannedBy: 'consumer',
        scannerRole: 'consumer',
      });

      // Handle smart routing redirect
      if (res.data.redirect) {
        if (res.data.serialNumber) {
          navigate(`/verify/unit/${res.data.serialNumber}`);
          return;
        }
      }

      setResult(res.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Verification failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const verifyUnit = async (serialNumber) => {
    setLoading(true);
    setError('');
    setResult(null);
    setVerifyMode('unit');

    try {
      const res = await api.get(`/unit/verify/${encodeURIComponent(serialNumber)}`);
      setResult(res.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Unit verification failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleScan = (id, type) => {
    if (type === 'unit') {
      navigate(`/verify/unit/${id}`);
    } else {
      navigate(`/verify/${id}`);
    }
  };

  const getStatusConfig = (verificationResult) => {
    switch (verificationResult) {
      case 'valid':
        return {
          icon: '✅',
          title: 'Authentic Product',
          description: 'This medicine has been verified on the blockchain. It is a genuine product from an authorized manufacturer.',
          className: 'valid',
        };
      case 'expired':
        return {
          icon: '⏰',
          title: 'Product Expired',
          description: 'This medicine has passed its expiry date. Please do not consume and return to your pharmacy.',
          className: 'expired',
        };
      case 'suspicious':
        return {
          icon: '⚠️',
          title: 'Suspicious Activity Detected',
          description: 'This product shows signs of potential counterfeit activity. Multiple scans or anomalies have been detected.',
          className: 'suspicious',
        };
      case 'already-dispensed':
        return {
          icon: '🔄',
          title: 'Already Verified / Sold',
          description: 'This unit has already been scanned and marked as dispensed. If you just purchased this, it may be a duplicate.',
          className: 'suspicious',
        };
      case 'invalid':
        return {
          icon: '🚫',
          title: 'Counterfeit / Fake Product',
          description: 'This product could NOT be verified on the blockchain. It may be a counterfeit. Do NOT consume this medicine.',
          className: 'invalid',
        };
      default:
        return {
          icon: '❓',
          title: 'Unknown Status',
          description: 'Unable to determine verification status.',
          className: '',
        };
    }
  };

  const resetVerification = () => {
    setResult(null);
    setError('');
    setVerifyMode(null);
    navigate('/verify');
  };

  return (
    <div className="main-content">
      <div className="verify-container">
        <div className="page-header text-center">
          <h1>🔍 Medicine Verification</h1>
          <p>Verify the authenticity of your medicine using blockchain technology</p>
        </div>

        {/* Scanner (shown when no result yet) */}
        {!paramBatchId && !paramSerialNumber && !result && (
          <div className="card mb-lg">
            <div className="card-header">
              <h3 className="card-title">Scan or Enter ID</h3>
            </div>
            <QRScanner onScan={handleScan} />
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="card">
            <div className="loading-overlay">
              <div className="spinner"></div>
              <p>Verifying on blockchain...</p>
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="card">
            <div className="verify-result invalid">
              <div className="verify-icon">❌</div>
              <div className="verify-status">{error}</div>
              <button onClick={resetVerification} className="btn btn-primary mt-lg">
                🔍 Try Again
              </button>
            </div>
          </div>
        )}

        {/* Result */}
        {result && (
          <div className="animate-in">
            {/* Status Banner */}
            {(() => {
              const statusKey = result.verificationResult || result.status;
              const config = getStatusConfig(statusKey);
              return (
                <div className="card mb-lg">
                  <div className={`verify-result ${config.className}`}>
                    <div className="verify-icon">{config.icon}</div>
                    <div className="verify-status">{config.title}</div>
                    <p style={{ maxWidth: '500px', margin: '0 auto' }}>{config.description}</p>
                  </div>
                </div>
              );
            })()}

            {/* Unit-Level Info (only for unit verification) */}
            {verifyMode === 'unit' && result.unitInfo && (
              <div className="card mb-lg">
                <div className="card-header">
                  <h3 className="card-title">📦 Unit Verification Details</h3>
                  {result.merkleProofValid === true && (
                    <span className="badge badge-success">🌳 Merkle Proof Valid</span>
                  )}
                  {result.merkleProofValid === false && (
                    <span className="badge badge-danger">❌ Merkle Proof Failed</span>
                  )}
                </div>
                <div className="grid grid-2">
                  <div>
                    <p className="text-sm text-muted">Serial Number</p>
                    <p className="text-mono" style={{ color: 'var(--text-primary)', fontWeight: 600, fontSize: '1rem' }}>
                      {result.unitInfo.serialNumber}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted">Parent Batch</p>
                    <p className="text-mono" style={{ color: 'var(--text-primary)', fontWeight: 600 }}>
                      {result.unitInfo.batchId}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted">Unit Status</p>
                    <p>
                      <span className={`badge ${
                        result.unitInfo.status === 'dispensed' ? 'badge-warning' :
                        result.unitInfo.status === 'at-pharmacy' ? 'badge-success' :
                        result.unitInfo.status === 'in-transit' ? 'badge-info' :
                        'badge-secondary'
                      }`}>
                        {result.unitInfo.status.toUpperCase()}
                      </span>
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted">Scan Count</p>
                    <p style={{ fontWeight: 600, color: result.unitInfo.scanCount > 3 ? 'var(--danger-400)' : 'var(--text-primary)' }}>
                      {result.unitInfo.scanCount}
                      {result.unitInfo.scanCount > 3 && ' ⚠️'}
                    </p>
                  </div>
                  {result.unitInfo.parentBoxId && (
                    <div>
                      <p className="text-sm text-muted">Box ID</p>
                      <p className="text-mono text-sm">{result.unitInfo.parentBoxId}</p>
                    </div>
                  )}
                  {result.unitInfo.dispensedAt && (
                    <div>
                      <p className="text-sm text-muted">Dispensed At</p>
                      <p className="text-sm">{new Date(result.unitInfo.dispensedAt).toLocaleString()}</p>
                    </div>
                  )}
                </div>

                {/* Merkle Proof Verification Visual */}
                {result.merkleProofValid !== null && (
                  <div className={`merkle-proof-badge ${result.merkleProofValid ? 'valid' : 'invalid'}`}>
                    <div className="merkle-proof-icon">
                      {result.merkleProofValid ? '🌳' : '⚠️'}
                    </div>
                    <div className="merkle-proof-info">
                      <strong>{result.merkleProofValid ? 'Cryptographic Proof Verified' : 'Proof Verification Failed'}</strong>
                      <p className="text-sm text-muted">
                        {result.merkleProofValid
                          ? 'This unit\'s serial number is cryptographically linked to its batch on the blockchain via Merkle tree.'
                          : 'Warning: This unit could not be cryptographically verified against the blockchain Merkle root.'
                        }
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Anomaly Warnings */}
            {((result.isSuspicious && result.anomalyReasons?.length > 0) ||
              (result.suspicionReasons?.length > 0)) && (
              <div className="alert alert-warning mb-lg">
                <strong>⚠️ Anomaly Detection Alerts:</strong>
                <ul style={{ marginTop: '8px', paddingLeft: '20px' }}>
                  {(result.anomalyReasons || result.suspicionReasons || []).map((reason, i) => (
                    <li key={i} style={{ marginBottom: '4px' }}>{reason}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Medicine Info */}
            {result.metadata && (
              <div className="card mb-lg">
                <div className="card-header">
                  <h3 className="card-title">💊 Medicine Information</h3>
                </div>
                <div className="grid grid-2">
                  <div>
                    <p className="text-sm text-muted">Medicine Name</p>
                    <p style={{ color: 'var(--text-primary)', fontWeight: 600, fontSize: '1.1rem' }}>
                      {result.metadata.medicineName}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted">Manufacturer</p>
                    <p style={{ color: 'var(--text-primary)', fontWeight: 600 }}>
                      {result.metadata.manufacturerName}
                    </p>
                  </div>
                  {result.metadata.dosage && (
                    <div>
                      <p className="text-sm text-muted">Dosage</p>
                      <p>{result.metadata.dosage}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-sm text-muted">Expiry Date</p>
                    <p style={{ color: result.blockchain?.isExpired ? 'var(--danger-400)' : 'var(--text-secondary)' }}>
                      {new Date(result.metadata.expiryDate).toLocaleDateString()}
                      {result.blockchain?.isExpired && ' ⚠️ EXPIRED'}
                    </p>
                  </div>
                  {result.metadata.composition && (
                    <div>
                      <p className="text-sm text-muted">Composition</p>
                      <p>{result.metadata.composition}</p>
                    </div>
                  )}
                  {result.metadata.quantity > 0 && (
                    <div>
                      <p className="text-sm text-muted">Batch Quantity</p>
                      <p>{result.metadata.quantity} {result.metadata.unit}</p>
                    </div>
                  )}
                </div>
                {result.metadata.description && (
                  <div className="mt-lg">
                    <p className="text-sm text-muted">Description</p>
                    <p>{result.metadata.description}</p>
                  </div>
                )}
                {result.metadata.sideEffects && (
                  <div className="mt-md">
                    <p className="text-sm text-muted">Side Effects</p>
                    <p>{result.metadata.sideEffects}</p>
                  </div>
                )}
              </div>
            )}

            {/* Blockchain Info */}
            {result.blockchain && (
              <div className="card mb-lg">
                <div className="card-header">
                  <h3 className="card-title">⛓️ Blockchain Verification</h3>
                  <span className={`badge ${result.blockchain.isValid ? 'badge-success' : 'badge-danger'}`}>
                    {result.blockchain.isValid ? '✅ Verified' : '❌ Not Verified'}
                  </span>
                </div>
                <div className="grid grid-2">
                  <div>
                    <p className="text-sm text-muted">Manufacturer Address</p>
                    <p className="text-mono text-sm">{result.blockchain.manufacturer}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted">Current Owner</p>
                    <p className="text-mono text-sm">{result.blockchain.currentOwner}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted">Transfer Count</p>
                    <p style={{ fontWeight: 600 }}>{result.blockchain.transferCount}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted">Scan Count</p>
                    <p style={{ fontWeight: 600 }}>
                      {result.scanInfo?.unitScanCount || result.scanInfo?.scanCount || 1}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Supply Chain History */}
            {result.history && (
              <SupplyChainTimeline
                history={result.history}
                manufacturer={result.blockchain?.manufacturer}
                currentOwner={result.blockchain?.currentOwner}
              />
            )}

            {/* Scan Again */}
            <div className="text-center mt-xl">
              <button onClick={resetVerification} className="btn btn-secondary btn-lg">
                🔍 Scan Another Medicine
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
