import { Navigate } from 'react-router-dom';
import { useProfile } from '@/hooks/useProfile';
import { Loader2 } from 'lucide-react';
import EditorDashboard from '@/components/editor/EditorDashboard';

const Editor = () => {
  const { primaryRole, isLoading } = useProfile();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (primaryRole !== 'editor') {
    return <Navigate to="/" replace />;
  }

  return <EditorDashboard />;
};

export default Editor;
