// AbbaVideo TypeScript definitions

export interface User {
  id: string;
  email: string;
  full_name: string;
  avatar_url?: string;
  role: 'admin' | 'editor' | 'viewer';
  created_at: string;
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  owner_id: string;
  status: 'draft' | 'in_progress' | 'review' | 'completed';
  created_at: string;
  updated_at: string;
}

export interface VideoAsset {
  id: string;
  project_id: string;
  file_name: string;
  file_url: string;
  file_size: number;
  duration: number;
  resolution: string;
  format: string;
  status: 'uploading' | 'processing' | 'ready' | 'error';
  created_at: string;
}

export interface EditTask {
  id: string;
  project_id: string;
  assigned_to: string;
  title: string;
  description?: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'todo' | 'in_progress' | 'review' | 'done';
  due_date?: string;
  created_at: string;
}
