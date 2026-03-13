import ClientGuard from '@/components/layout/ClientGuard';
import DashboardLayout from '@/components/dashboard/DashboardLayout';

const Dashboard = () => {
  return (
    <ClientGuard requireStep="dashboard">
      <DashboardLayout />
    </ClientGuard>
  );
};

export default Dashboard;
