import 'dotenv/config';
import prisma from '../src/lib/prisma';
import bcrypt from 'bcrypt';

async function main() {
  console.log('🌱 Seeding database...');

  // ─── Users ──────────────────────────────────────────────────────────────────
  const SALT_ROUNDS = 10;

  const users = await Promise.all([
    prisma.user.upsert({
      where: { email: 'admin@example.com' },
      update: {},
      create: {
        name: 'Admin User',
        email: 'admin@example.com',
        passwordHash: await bcrypt.hash('admin123', SALT_ROUNDS),
        role: 'ADMIN',
      },
    }),
    prisma.user.upsert({
      where: { email: 'sales@example.com' },
      update: {},
      create: {
        name: 'Sales Rep',
        email: 'sales@example.com',
        passwordHash: await bcrypt.hash('sales123', SALT_ROUNDS),
        role: 'SALES',
      },
    }),
    prisma.user.upsert({
      where: { email: 'warehouse@example.com' },
      update: {},
      create: {
        name: 'Warehouse Manager',
        email: 'warehouse@example.com',
        passwordHash: await bcrypt.hash('warehouse123', SALT_ROUNDS),
        role: 'WAREHOUSE',
      },
    }),
    prisma.user.upsert({
      where: { email: 'accounts@example.com' },
      update: {},
      create: {
        name: 'Accounts Manager',
        email: 'accounts@example.com',
        passwordHash: await bcrypt.hash('accounts123', SALT_ROUNDS),
        role: 'ACCOUNTS',
      },
    }),
  ]);

  console.log(`✅ Created ${users.length} users`);

  // ─── Customers ──────────────────────────────────────────────────────────────
  const customers = await Promise.all([
    prisma.customer.upsert({
      where: { id: 'customer-001' },
      update: {},
      create: {
        id: 'customer-001',
        name: 'Rajesh Kumar',
        mobile: '9876543210',
        email: 'rajesh@example.com',
        businessName: 'Kumar Traders',
        gstNumber: '29ABCDE1234F1Z5',
        customerType: 'WHOLESALE',
        address: '12, MG Road, Bengaluru, Karnataka 560001',
        status: 'ACTIVE',
      },
    }),
    prisma.customer.upsert({
      where: { id: 'customer-002' },
      update: {},
      create: {
        id: 'customer-002',
        name: 'Priya Sharma',
        mobile: '9812345678',
        email: 'priya@example.com',
        businessName: 'Sharma Retail',
        customerType: 'RETAIL',
        address: 'B-45, Sector 14, Gurugram, Haryana 122001',
        status: 'ACTIVE',
      },
    }),
    prisma.customer.upsert({
      where: { id: 'customer-003' },
      update: {},
      create: {
        id: 'customer-003',
        name: 'Mohammed Farouk',
        mobile: '9923456789',
        businessName: 'Farouk Distributors',
        gstNumber: '36PQRST5678G2H6',
        customerType: 'DISTRIBUTOR',
        address: '78, Banjara Hills, Hyderabad, Telangana 500034',
        status: 'LEAD',
        followUpDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    }),
    prisma.customer.upsert({
      where: { id: 'customer-004' },
      update: {},
      create: {
        id: 'customer-004',
        name: 'Sunita Patel',
        mobile: '9734567890',
        email: 'sunita@example.com',
        customerType: 'RETAIL',
        address: 'C-12, Navrangpura, Ahmedabad, Gujarat 380009',
        status: 'INACTIVE',
      },
    }),
  ]);

  console.log(`✅ Created ${customers.length} customers`);

  // ─── Products ────────────────────────────────────────────────────────────────
  const products = await Promise.all([
    prisma.product.upsert({
      where: { sku: 'BOLT-M8-50' },
      update: {},
      create: {
        name: 'Hex Bolt M8×50',
        sku: 'BOLT-M8-50',
        category: 'Fasteners',
        unitPrice: 2.5,
        currentStock: 1500,
        minStockAlert: 200,
        location: 'Rack A-1',
      },
    }),
    prisma.product.upsert({
      where: { sku: 'NUT-M8' },
      update: {},
      create: {
        name: 'Hex Nut M8',
        sku: 'NUT-M8',
        category: 'Fasteners',
        unitPrice: 1.2,
        currentStock: 800,
        minStockAlert: 150,
        location: 'Rack A-2',
      },
    }),
    prisma.product.upsert({
      where: { sku: 'PIPE-GI-25' },
      update: {},
      create: {
        name: 'GI Pipe 25mm (per meter)',
        sku: 'PIPE-GI-25',
        category: 'Pipes',
        unitPrice: 85.0,
        currentStock: 3,
        minStockAlert: 20,
        location: 'Yard B',
      },
    }),
    prisma.product.upsert({
      where: { sku: 'ELBOW-25' },
      update: {},
      create: {
        name: 'GI Elbow 25mm',
        sku: 'ELBOW-25',
        category: 'Fittings',
        unitPrice: 45.0,
        currentStock: 12,
        minStockAlert: 15,
        location: 'Rack C-3',
      },
    }),
    prisma.product.upsert({
      where: { sku: 'VALVE-GATE-25' },
      update: {},
      create: {
        name: 'Gate Valve 25mm',
        sku: 'VALVE-GATE-25',
        category: 'Valves',
        unitPrice: 320.0,
        currentStock: 25,
        minStockAlert: 10,
        location: 'Rack D-1',
      },
    }),
  ]);

  console.log(`✅ Created ${products.length} products`);
  console.log('');
  console.log('📋 Test credentials:');
  console.log('  Admin     → admin@example.com / admin123');
  console.log('  Sales     → sales@example.com / sales123');
  console.log('  Warehouse → warehouse@example.com / warehouse123');
  console.log('  Accounts  → accounts@example.com / accounts123');
  console.log('');
  console.log('⚠️  Note: PIPE-GI-25 and ELBOW-25 are below min stock — good for testing alerts!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
