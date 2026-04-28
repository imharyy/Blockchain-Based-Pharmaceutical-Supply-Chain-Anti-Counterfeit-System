export default function BatchCard({ batch, onView, onTransfer }) {
  const statusColors = {
    created: 'badge-primary',
    'in-transit': 'badge-cyan',
    delivered: 'badge-success',
    'with-consumer': 'badge-success',
    recalled: 'badge-danger',
  };

  const statusEmojis = {
    created: '🆕',
    'in-transit': '🚚',
    delivered: '📦',
    'with-consumer': '✅',
    recalled: '⚠️',
  };

  return (
    <div className="card" style={{ cursor: onView ? 'pointer' : 'default' }}>
      <div className="card-header">
        <div>
          <h3 className="card-title" style={{ fontFamily: 'var(--font-mono)', fontSize: '0.95rem' }}>
            {batch.batchId}
          </h3>
        </div>
        <span className={`badge ${statusColors[batch.status] || 'badge-primary'}`}>
          {statusEmojis[batch.status] || '📦'} {batch.status}
        </span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
        <div>
          <span className="text-sm text-muted">Medicine: </span>
          <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{batch.medicineName}</span>
        </div>

        {batch.dosage && (
          <div>
            <span className="text-sm text-muted">Dosage: </span>
            <span className="text-sm">{batch.dosage}</span>
          </div>
        )}

        <div>
          <span className="text-sm text-muted">Manufacturer: </span>
          <span className="text-sm">{batch.manufacturerName}</span>
        </div>

        <div>
          <span className="text-sm text-muted">Expiry: </span>
          <span className="text-sm" style={{
            color: new Date(batch.expiryDate) < new Date() ? 'var(--danger-400)' : 'var(--text-secondary)'
          }}>
            {new Date(batch.expiryDate).toLocaleDateString()}
          </span>
        </div>

        {batch.quantity > 0 && (
          <div>
            <span className="text-sm text-muted">Quantity: </span>
            <span className="text-sm">{batch.quantity} {batch.unit}</span>
          </div>
        )}
      </div>

      <div style={{ display: 'flex', gap: 'var(--space-sm)', marginTop: 'var(--space-lg)' }}>
        {onView && (
          <button onClick={() => onView(batch.batchId)} className="btn btn-secondary btn-sm" style={{ flex: 1 }}>
            🔍 View Details
          </button>
        )}
        {onTransfer && (
          <button onClick={() => onTransfer(batch)} className="btn btn-primary btn-sm" style={{ flex: 1 }}>
            📤 Transfer
          </button>
        )}
      </div>
    </div>
  );
}
