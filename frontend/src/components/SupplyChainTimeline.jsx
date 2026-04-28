import { formatAddress, formatTimestamp } from '../services/blockchain';

const roleColors = {
  Manufacturer: 'purple',
  Distributor: 'cyan',
  Pharmacy: 'green',
  Consumer: 'yellow',
  Admin: 'red',
};

const roleEmojis = {
  Manufacturer: '🏭',
  Distributor: '🚚',
  Pharmacy: '💊',
  Consumer: '👤',
  Admin: '🛡️',
};

export default function SupplyChainTimeline({ history, manufacturer, currentOwner }) {
  if (!history || history.length === 0) {
    return (
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">📦 Supply Chain Journey</h3>
        </div>
        <div className="empty-state">
          <div className="empty-icon">🔗</div>
          <p>No transfers recorded yet. This batch is still with the manufacturer.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="card-header">
        <h3 className="card-title">📦 Supply Chain Journey</h3>
        <span className="badge badge-primary">{history.length} transfers</span>
      </div>

      <div className="timeline">
        {/* Origin — Manufacturer creation */}
        <div className="timeline-item" style={{ animationDelay: '0s' }}>
          <div className="timeline-dot" style={{ background: 'linear-gradient(135deg, var(--primary-500), var(--accent-500))' }}></div>
          <div className="timeline-content">
            <div className="flex items-center gap-sm mb-md">
              <span>{roleEmojis.Manufacturer || '🏭'}</span>
              <h4>Batch Created</h4>
              <span className="badge badge-primary">Origin</span>
            </div>
            <p><strong>Manufacturer:</strong> {formatAddress(manufacturer)}</p>
          </div>
        </div>

        {/* Transfer records */}
        {history.map((record, index) => (
          <div
            key={index}
            className="timeline-item"
            style={{ animationDelay: `${(index + 1) * 0.15}s` }}
          >
            <div className="timeline-dot"></div>
            <div className="timeline-content">
              <div className="flex items-center gap-sm mb-md">
                <span>{roleEmojis[record.toRole] || '📦'}</span>
                <h4>{record.fromRole} → {record.toRole}</h4>
                <span className={`badge badge-${roleColors[record.toRole] === 'cyan' ? 'cyan' : roleColors[record.toRole] === 'green' ? 'success' : roleColors[record.toRole] === 'yellow' ? 'warning' : 'primary'}`}>
                  Transfer #{index + 1}
                </span>
              </div>
              <p><strong>From:</strong> {formatAddress(record.from)}</p>
              <p><strong>To:</strong> {formatAddress(record.to)}</p>
              <div className="time">{formatTimestamp(record.timestamp)}</div>
            </div>
          </div>
        ))}

        {/* Current holder */}
        <div
          className="timeline-item"
          style={{ animationDelay: `${(history.length + 1) * 0.15}s` }}
        >
          <div className="timeline-dot" style={{ background: 'var(--success-500)', boxShadow: '0 0 12px rgba(34,197,94,0.5)' }}></div>
          <div className="timeline-content" style={{ borderColor: 'rgba(34,197,94,0.3)' }}>
            <div className="flex items-center gap-sm mb-md">
              <span>📍</span>
              <h4>Current Location</h4>
              <span className="badge badge-success">Active</span>
            </div>
            <p><strong>Holder:</strong> {formatAddress(currentOwner)}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
