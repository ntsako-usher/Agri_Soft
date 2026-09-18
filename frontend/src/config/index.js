// Single place where environment variables are read.
export const config = {
  appName: 'Soft-Agri',
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL || '/api',
  // Defaults to mock data unless VITE_USE_MOCK_DATA is explicitly "false".
  useMock: import.meta.env.VITE_USE_MOCK_DATA !== 'false',
};
