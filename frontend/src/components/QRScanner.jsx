import { useState, useEffect, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';

/**
 * QRScanner — Dual-mode input component for scanning QR codes.
 *
 * Handles three QR URL patterns:
 *   /verify/{batchId}              → batch verification
 *   /verify/unit/{serialNumber}    → unit (packet) verification
 *   /verify/packaging/{levelId}    → packaging level scan
 *
 * Props:
 *   onScan(id, type)  — called with the extracted ID and type ("batch", "unit", or "packaging")
 */
export default function QRScanner({ onScan }) {
  const [mode, setMode] = useState('text'); // 'camera' or 'text'
  const [manualId, setManualId] = useState('');
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState('');
  const scannerRef = useRef(null);
  const html5QrRef = useRef(null);

  useEffect(() => {
    return () => {
      // Cleanup camera on unmount
      if (html5QrRef.current) {
        html5QrRef.current.stop().catch(() => {});
      }
    };
  }, []);

  /**
   * Parse a scanned QR code text and extract the ID + type.
   */
  const parseQRCode = (decodedText) => {
    let id = decodedText;
    let type = 'batch';

    try {
      const url = new URL(decodedText);
      const parts = url.pathname.split('/');

      // Check for /verify/unit/{serialNumber}
      const verifyIdx = parts.indexOf('verify');
      if (verifyIdx !== -1) {
        if (parts[verifyIdx + 1] === 'unit' && parts[verifyIdx + 2]) {
          id = decodeURIComponent(parts[verifyIdx + 2]);
          type = 'unit';
        } else if (parts[verifyIdx + 1] === 'packaging' && parts[verifyIdx + 2]) {
          id = decodeURIComponent(parts[verifyIdx + 2]);
          type = 'packaging';
        } else if (parts[verifyIdx + 1]) {
          id = decodeURIComponent(parts[verifyIdx + 1]);
          type = 'batch';
        }
      }
    } catch {
      // Not a URL — try to detect type from the ID pattern
      if (id.includes('-U-')) {
        type = 'unit';
      } else if (id.includes('-B-') || id.includes('-C-')) {
        type = 'packaging';
      }
    }

    return { id, type };
  };

  const startCamera = async () => {
    setError('');
    setScanning(true);

    try {
      const html5Qr = new Html5Qrcode('qr-reader');
      html5QrRef.current = html5Qr;

      await html5Qr.start(
        { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
        },
        (decodedText) => {
          const { id, type } = parseQRCode(decodedText);

          html5Qr.stop().catch(() => {});
          setScanning(false);
          onScan(id, type);
        },
        () => {} // Ignore scan failures
      );
    } catch (err) {
      setError('Camera access denied or not available. Try the text input method.');
      setScanning(false);
    }
  };

  const stopCamera = async () => {
    if (html5QrRef.current) {
      await html5QrRef.current.stop().catch(() => {});
      setScanning(false);
    }
  };

  const handleManualSubmit = (e) => {
    e.preventDefault();
    if (manualId.trim()) {
      const { id, type } = parseQRCode(manualId.trim());
      onScan(id, type);
    }
  };

  return (
    <div className="qr-scanner-container">
      <div className="scan-mode-toggle">
        <button
          className={mode === 'camera' ? 'active' : ''}
          onClick={() => { setMode('camera'); setError(''); }}
        >
          📷 Camera Scan
        </button>
        <button
          className={mode === 'text' ? 'active' : ''}
          onClick={() => { setMode('text'); stopCamera(); setError(''); }}
        >
          ⌨️ Enter ID
        </button>
      </div>

      {mode === 'camera' && (
        <div>
          <div
            id="qr-reader"
            ref={scannerRef}
            style={{
              width: '100%',
              borderRadius: 'var(--radius-lg)',
              overflow: 'hidden',
              marginBottom: 'var(--space-lg)',
              minHeight: scanning ? '300px' : '0',
            }}
          ></div>

          {!scanning ? (
            <button onClick={startCamera} className="btn btn-primary w-full btn-lg">
              📷 Start Camera Scanner
            </button>
          ) : (
            <button onClick={stopCamera} className="btn btn-danger w-full btn-lg">
              ⏹️ Stop Scanner
            </button>
          )}

          {error && (
            <div className="alert alert-warning mt-lg">
              {error}
            </div>
          )}
        </div>
      )}

      {mode === 'text' && (
        <form onSubmit={handleManualSubmit}>
          <div className="form-group">
            <label className="form-label">Batch ID / Unit Serial Number</label>
            <input
              type="text"
              className="form-input"
              placeholder="e.g., BATCH-001 or BATCH-001-U-00001"
              value={manualId}
              onChange={(e) => setManualId(e.target.value)}
              autoFocus
            />
            <p className="text-sm text-muted" style={{ marginTop: '4px' }}>
              Enter a Batch ID, Unit Serial Number, or paste a verification URL
            </p>
          </div>
          <button type="submit" className="btn btn-primary w-full btn-lg" disabled={!manualId.trim()}>
            🔍 Verify
          </button>
        </form>
      )}
    </div>
  );
}
