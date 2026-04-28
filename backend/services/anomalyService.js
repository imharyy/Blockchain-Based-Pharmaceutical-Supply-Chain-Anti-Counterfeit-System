const ScanLog = require("../models/ScanLog");

/**
 * Anomaly Detection Service
 *
 * Detects suspicious activity patterns:
 * 1. Duplicate scans — same batch scanned too many times in short period
 * 2. Multi-location scanning — same batch scanned from different locations rapidly
 * 3. Rapid successive scans — unusually fast scanning pattern
 */

const THRESHOLDS = {
  MAX_SCANS_PER_HOUR: 10,        // Max scans of same batch in 1 hour
  MAX_LOCATIONS_PER_HOUR: 3,     // Max different locations in 1 hour
  MIN_SCAN_INTERVAL_MS: 5000,    // Minimum 5 seconds between scans
};

/**
 * Analyze a scan event for anomalies.
 * @param {string} batchId
 * @param {string} location
 * @param {string} ipAddress
 * @returns {Object} { isSuspicious: bool, reasons: string[] }
 */
async function analyzeScan(batchId, location = "unknown", ipAddress = "") {
  const reasons = [];
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

  // 1. Check scan frequency (duplicate scan detection)
  const recentScans = await ScanLog.find({
    batchId,
    createdAt: { $gte: oneHourAgo },
  }).sort({ createdAt: -1 });

  if (recentScans.length >= THRESHOLDS.MAX_SCANS_PER_HOUR) {
    reasons.push(
      `High scan frequency: ${recentScans.length} scans in the last hour (threshold: ${THRESHOLDS.MAX_SCANS_PER_HOUR})`
    );
  }

  // 2. Check multi-location scanning
  const uniqueLocations = new Set(recentScans.map((s) => s.location).filter((l) => l !== "unknown"));
  if (location !== "unknown") uniqueLocations.add(location);

  if (uniqueLocations.size >= THRESHOLDS.MAX_LOCATIONS_PER_HOUR) {
    reasons.push(
      `Multiple locations detected: ${uniqueLocations.size} different locations in the last hour (threshold: ${THRESHOLDS.MAX_LOCATIONS_PER_HOUR})`
    );
  }

  // 3. Check rapid successive scans
  if (recentScans.length > 0) {
    const lastScan = recentScans[0];
    const timeSinceLastScan = Date.now() - new Date(lastScan.createdAt).getTime();

    if (timeSinceLastScan < THRESHOLDS.MIN_SCAN_INTERVAL_MS) {
      reasons.push(
        `Rapid scanning: only ${timeSinceLastScan}ms since last scan (threshold: ${THRESHOLDS.MIN_SCAN_INTERVAL_MS}ms)`
      );
    }
  }

  // 4. Check for multiple unique IPs in short period
  const uniqueIPs = new Set(recentScans.map((s) => s.ipAddress).filter((ip) => ip !== ""));
  if (ipAddress) uniqueIPs.add(ipAddress);

  if (uniqueIPs.size >= 5) {
    reasons.push(
      `Multiple IP addresses: ${uniqueIPs.size} unique IPs scanning this batch`
    );
  }

  return {
    isSuspicious: reasons.length > 0,
    reasons,
    scanCount: recentScans.length,
    uniqueLocations: uniqueLocations.size,
  };
}

/**
 * Get anomaly statistics for a batch.
 */
async function getBatchAnomalyStats(batchId) {
  const totalScans = await ScanLog.countDocuments({ batchId });
  const flaggedScans = await ScanLog.countDocuments({ batchId, flagged: true });

  const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const recentScans = await ScanLog.find({
    batchId,
    createdAt: { $gte: last24h },
  });

  const uniqueLocations = new Set(recentScans.map((s) => s.location).filter((l) => l !== "unknown"));

  return {
    totalScans,
    flaggedScans,
    scansLast24h: recentScans.length,
    uniqueLocationsLast24h: uniqueLocations.size,
    suspicionScore: flaggedScans > 0 ? Math.min((flaggedScans / totalScans) * 100, 100) : 0,
  };
}

module.exports = { analyzeScan, getBatchAnomalyStats, THRESHOLDS };
