import dns from 'dns';

try {
  dns.setDefaultResultOrder('ipv4first');
  dns.setServers(['8.8.8.8', '1.1.1.1']);
  console.log('🌐 Custom DNS resolvers set (8.8.8.8, 1.1.1.1)');
} catch (e) {
  console.warn('⚠️ Could not set custom DNS resolvers:', e.message);
}
