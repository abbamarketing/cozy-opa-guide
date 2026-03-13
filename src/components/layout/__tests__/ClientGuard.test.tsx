import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import ClientGuard from '../ClientGuard';

// Mocks
const mockUserProject = vi.fn();
const mockProfile = vi.fn();

vi.mock('@/hooks/useUserProject', () => ({
  useUserProject: () => mockUserProject(),
}));

vi.mock('@/hooks/useProfile', () => ({
  useProfile: () => mockProfile(),
}));

// Helper to capture Navigate redirects
let navigatedTo: string | null = null;
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    Navigate: ({ to }: { to: string }) => {
      navigatedTo = to;
      return <div data-testid="navigate">{to}</div>;
    },
  };
});

function renderGuard(requireStep: 'payment' | 'onboarding' | 'dashboard') {
  return render(
    <MemoryRouter>
      <ClientGuard requireStep={requireStep}>
        <div data-testid="children">Protected Content</div>
      </ClientGuard>
    </MemoryRouter>,
  );
}

describe('ClientGuard', () => {
  beforeEach(() => {
    navigatedTo = null;
  });

  // ─── Loading state ───
  it('shows loader while loading', () => {
    mockUserProject.mockReturnValue({ userProject: null, isLoading: true });
    mockProfile.mockReturnValue({ profile: null, isLoading: true });
    renderGuard('dashboard');
    expect(screen.queryByTestId('children')).not.toBeInTheDocument();
  });

  // ─── Dashboard guards ───
  it('redirects /dashboard → /payment when status is pending_payment', () => {
    mockUserProject.mockReturnValue({
      userProject: { status: 'pending_payment' },
      isLoading: false,
    });
    mockProfile.mockReturnValue({
      profile: { onboarding_complete: false },
      isLoading: false,
    });
    renderGuard('dashboard');
    expect(navigatedTo).toBe('/payment');
    expect(screen.queryByTestId('children')).not.toBeInTheDocument();
  });

  it('redirects /dashboard → /onboarding when onboarding not complete', () => {
    mockUserProject.mockReturnValue({
      userProject: { status: 'active' },
      isLoading: false,
    });
    mockProfile.mockReturnValue({
      profile: { onboarding_complete: false },
      isLoading: false,
    });
    renderGuard('dashboard');
    expect(navigatedTo).toBe('/onboarding');
  });

  it('renders dashboard when active + onboarding complete', () => {
    mockUserProject.mockReturnValue({
      userProject: { status: 'active' },
      isLoading: false,
    });
    mockProfile.mockReturnValue({
      profile: { onboarding_complete: true },
      isLoading: false,
    });
    renderGuard('dashboard');
    expect(screen.getByTestId('children')).toBeInTheDocument();
  });

  // ─── Onboarding guards ───
  it('redirects /onboarding → /payment when pending_payment', () => {
    mockUserProject.mockReturnValue({
      userProject: { status: 'pending_payment' },
      isLoading: false,
    });
    mockProfile.mockReturnValue({
      profile: { onboarding_complete: false },
      isLoading: false,
    });
    renderGuard('onboarding');
    expect(navigatedTo).toBe('/payment');
  });

  it('redirects /onboarding → /dashboard when onboarding already done', () => {
    mockUserProject.mockReturnValue({
      userProject: { status: 'active' },
      isLoading: false,
    });
    mockProfile.mockReturnValue({
      profile: { onboarding_complete: true },
      isLoading: false,
    });
    renderGuard('onboarding');
    expect(navigatedTo).toBe('/dashboard');
  });

  // ─── Payment guards ───
  it('redirects /payment → /onboarding when active + onboarding not done', () => {
    mockUserProject.mockReturnValue({
      userProject: { status: 'active' },
      isLoading: false,
    });
    mockProfile.mockReturnValue({
      profile: { onboarding_complete: false },
      isLoading: false,
    });
    renderGuard('payment');
    expect(navigatedTo).toBe('/onboarding');
  });

  it('redirects /payment → /dashboard when active + onboarding done', () => {
    mockUserProject.mockReturnValue({
      userProject: { status: 'active' },
      isLoading: false,
    });
    mockProfile.mockReturnValue({
      profile: { onboarding_complete: true },
      isLoading: false,
    });
    renderGuard('payment');
    expect(navigatedTo).toBe('/dashboard');
  });

  // ─── No project ───
  it('redirects to /waiting when no project and step is dashboard', () => {
    mockUserProject.mockReturnValue({ userProject: null, isLoading: false });
    mockProfile.mockReturnValue({ profile: null, isLoading: false });
    renderGuard('dashboard');
    expect(navigatedTo).toBe('/waiting');
  });
});
