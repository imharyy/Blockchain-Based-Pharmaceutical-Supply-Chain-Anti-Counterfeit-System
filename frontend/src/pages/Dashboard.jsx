import { useAuth } from '../context/AuthContext';
import ManufacturerDashboard from './ManufacturerDashboard';
import DistributorDashboard from './DistributorDashboard';
import PharmacyDashboard from './PharmacyDashboard';
import ConsumerDashboard from './ConsumerDashboard';
import AdminDashboard from './AdminDashboard';

export default function Dashboard() {
  const { user } = useAuth();

  const dashboards = {
    manufacturer: ManufacturerDashboard,
    distributor: DistributorDashboard,
    pharmacy: PharmacyDashboard,
    consumer: ConsumerDashboard,
    admin: AdminDashboard,
  };

  const DashboardComponent = dashboards[user?.role];

  if (!DashboardComponent) {
    return (
      <div className="main-content">
        <div className="empty-state">
          <div className="empty-icon">🚫</div>
          <h3>Unknown Role</h3>
          <p>Your account role "{user?.role}" is not recognized.</p>
        </div>
      </div>
    );
  }

  return <DashboardComponent />;
}
