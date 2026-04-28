import { useNavigate } from 'react-router-dom';
import QRScanner from '../components/QRScanner';

export default function ConsumerDashboard() {
  const navigate = useNavigate();

  const handleScan = (id, type) => {
    if (type === 'unit') {
      navigate(`/verify/unit/${id}`);
    } else {
      navigate(`/verify/${id}`);
    }
  };

  return (
    <div className="main-content">
      <div className="page-header text-center">
        <h1>👤 Consumer Dashboard</h1>
        <p>Scan QR codes on your medicine packaging to verify authenticity</p>
      </div>

      <div className="card" style={{ maxWidth: '600px', margin: '0 auto' }}>
        <div className="card-header">
          <h3 className="card-title">🔍 Verify Your Medicine</h3>
        </div>
        <QRScanner onScan={handleScan} />
      </div>

      <div className="grid grid-3 mt-xl" style={{ maxWidth: '900px', margin: 'var(--space-xl) auto 0' }}>
        <div className="card text-center">
          <div style={{ fontSize: '2.5rem', marginBottom: 'var(--space-md)' }}>📷</div>
          <h4>Scan Unit QR</h4>
          <p className="text-sm">Each medicine packet has a unique QR code. Scan it to verify this specific unit.</p>
        </div>
        <div className="card text-center">
          <div style={{ fontSize: '2.5rem', marginBottom: 'var(--space-md)' }}>🌳</div>
          <h4>Merkle Proof</h4>
          <p className="text-sm">Each unit is cryptographically linked to its batch via a Merkle tree stored on the blockchain.</p>
        </div>
        <div className="card text-center">
          <div style={{ fontSize: '2.5rem', marginBottom: 'var(--space-md)' }}>🛡️</div>
          <h4>Counterfeit Detection</h4>
          <p className="text-sm">Duplicate scans, location mismatches, and anomalies are automatically detected and flagged.</p>
        </div>
      </div>

      <div className="card mt-lg" style={{ maxWidth: '900px', margin: 'var(--space-lg) auto 0' }}>
        <div className="card-header">
          <h3 className="card-title">ℹ️ How Unit Verification Works</h3>
        </div>
        <div className="unit-verify-explainer">
          <div className="explainer-step">
            <div className="explainer-number">1</div>
            <div>
              <strong>Scan the QR code</strong>
              <p className="text-sm text-muted">Each packet has a unique serial number encoded in its QR code</p>
            </div>
          </div>
          <div className="explainer-step">
            <div className="explainer-number">2</div>
            <div>
              <strong>Database check</strong>
              <p className="text-sm text-muted">We verify the serial number exists and hasn't been flagged</p>
            </div>
          </div>
          <div className="explainer-step">
            <div className="explainer-number">3</div>
            <div>
              <strong>Blockchain proof</strong>
              <p className="text-sm text-muted">A cryptographic Merkle proof confirms this unit belongs to a genuine batch</p>
            </div>
          </div>
          <div className="explainer-step">
            <div className="explainer-number">4</div>
            <div>
              <strong>Anomaly check</strong>
              <p className="text-sm text-muted">We check if this unit was already sold or shows suspicious scan patterns</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
