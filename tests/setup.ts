import '@testing-library/jest-dom';
import { vi, beforeAll, afterAll, afterEach } from 'vitest';

// Global mocks
vi.mock('next/headers', () => ({
  cookies: () => ({
    get: vi.fn(),
    set: vi.fn(),
  }),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
  }),
  useSearchParams: () => ({
    get: vi.fn(),
  }),
  usePathname: () => '',
}));

// Setup cleanup
afterEach(() => {
  vi.clearAllMocks();
});

beforeAll(() => {
  console.log('🧪 Test suite başlatılıyor...');
});

afterAll(() => {
  console.log('🧪 Test suite tamamlandı.');
});