import { loadEnv } from 'vite';

export default ({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const apiPort = env.GENEVISION_API_PORT || process.env.GENEVISION_API_PORT || '4173';
  return {
    server: {
      host: '127.0.0.1',
      proxy: { '/api': `http://127.0.0.1:${apiPort}` }
    }
  };
};
