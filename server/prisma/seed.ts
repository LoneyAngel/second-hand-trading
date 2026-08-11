import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import bcrypt from 'bcryptjs';

dotenv.config();

// 1. 创建 pg 数据库连接池
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// 从 DATABASE_URL 中解析 schema，动态设置 search_path
function extractSchema(url: string): string {
  const match = url.match(/schema=([^&]+)/);
  return match ? match[1] : 'trading';
}

const dbSchema = extractSchema(process.env.DATABASE_URL || '');

// 每次建立连接时设置 search_path 到目标 schema
pool.on('connect', async (client) => {
  await client.query(`SET search_path TO ${dbSchema}, public;`);
});

// 2. 将带有“架构锁”的连接池喂给适配器
const adapter = new PrismaPg(pool);

// 3. 传入 7.x 强制要求的非空参数
const prisma = new PrismaClient({ adapter });

async function safeDelete<T>(fn: () => Promise<T>) {
  try {
    return await fn();
  } catch (e: any) {
    // 如果表不存在或其他错误，继续执行
    if (e.code !== 'P2021' && !e.message?.includes('does not exist')) {
      throw e;
    }
    console.log('表不存在，跳过删除');
  }
}

async function main() {
  console.log('开始初始化数据库...');

  // 清空现有数据（按正确顺序避免外键约束问题）
  await safeDelete(() => prisma.review.deleteMany());
  await safeDelete(() => prisma.rentalRecord.deleteMany());
  await safeDelete(() => prisma.refreshToken.deleteMany());
  await safeDelete(() => prisma.favorite.deleteMany());
  await safeDelete(() => prisma.userFootprint.deleteMany());
  await safeDelete(() => prisma.follow.deleteMany());
  await safeDelete(() => prisma.address.deleteMany());
  await safeDelete(() => prisma.product.deleteMany());
  await safeDelete(() => prisma.category.deleteMany());
  await safeDelete(() => prisma.userRole.deleteMany());
  await safeDelete(() => prisma.role.deleteMany());
  await safeDelete(() => prisma.user.deleteMany());

  console.log('已清空现有数据');

  // 1. 创建分类
  const categories = await prisma.category.createManyAndReturn({
    data: [
      { name: '相机', icon: '📷', sort: 1 },
      { name: '数码产品', icon: '💻', sort: 2 },
      { name: '家具', icon: '🛋️', sort: 3 },
      { name: '运动器材', icon: '⚽', sort: 4 },
      { name: '图书', icon: '📚', sort: 5 },
    ],
  });
  console.log(`已创建 ${categories.length} 个分类`);

  // 2. 创建用户
  const hashedPassword = await bcrypt.hash('123456', 10);

  const users = await Promise.all([
    prisma.user.create({
      data: {
        phone: '17602351272',
        nickname: 'angel',
        avatar: 'https://api.dicebear.com/7.x/pixel-art/png?seed=angel',
        password: hashedPassword,
      },
    }),
    prisma.user.create({
      data: {
        phone: '13800138000',
        nickname: '小张',
        avatar: 'https://api.dicebear.com/7.x/pixel-art/png?seed=zhang',
        password: hashedPassword,
      },
    }),
    prisma.user.create({
      data: {
        phone: '13900139000',
        nickname: '老王',
        avatar: 'https://api.dicebear.com/7.x/pixel-art/png?seed=wang',
        password: hashedPassword,
      },
    }),
  ]);
  console.log(`已创建 ${users.length} 个用户`);

  // 2.5 初始化角色
  const roles = await prisma.role.createManyAndReturn({
    data: [
      { name: 'USER', description: '普通用户' },
      { name: 'ADMIN', description: '管理员' },
      { name: 'SUPER_ADMIN', description: '超级管理员' },
    ],
  });
  console.log(`已创建 ${roles.length} 个角色`);

  // 给第一个用户（17602351272）赋予超级管理员 + 普通用户角色
  const superAdminRole = roles.find((r) => r.name === 'SUPER_ADMIN')!;
  const userRole = roles.find((r) => r.name === 'USER')!;
  await prisma.userRole.createMany({
    data: [
      { userId: users[0].id, roleId: superAdminRole.id },
      { userId: users[0].id, roleId: userRole.id },
      // 其他用户默认普通用户角色
      { userId: users[1].id, roleId: userRole.id },
      { userId: users[2].id, roleId: userRole.id },
    ],
  });
  console.log('已分配用户角色');

  // 3. 创建商品
  const cameraCategory = categories.find((c) => c.name === '相机')!;
  const digitalCategory = categories.find((c) => c.name === '数码产品')!;
  const furnitureCategory = categories.find((c) => c.name === '家具')!;

  const products = await Promise.all([
    prisma.product.create({
      data: {
        title: '尼康 Z5',
        description: '完好无损的尼康 Z5 相机，快门次数 2000+，配件齐全',
        price: 50,
        deposit: 2000,
        images: ['https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=400'],
        status: 'available',
        userId: users[0].id,
        categoryId: cameraCategory.id,
      },
    }),
    prisma.product.create({
      data: {
        title: '索尼 A7M4',
        description: '索尼全画幅微单相机，成色95新',
        price: 80,
        deposit: 3000,
        images: ['https://images.unsplash.com/photo-1617005591028-675f866a34c7?w=400'],
        status: 'available',
        userId: users[0].id,
        categoryId: cameraCategory.id,
      },
    }),
    prisma.product.create({
      data: {
        title: 'MacBook Pro 14寸',
        description: 'M1 Pro芯片，16G内存，512G存储',
        price: 100,
        deposit: 5000,
        images: ['https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=400'],
        status: 'available',
        userId: users[1].id,
        categoryId: digitalCategory.id,
      },
    }),
    prisma.product.create({
      data: {
        title: 'iPad Pro 12.9寸',
        description: '2021款，M1芯片，256G存储',
        price: 60,
        deposit: 3000,
        images: ['https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=400'],
        status: 'available',
        userId: users[1].id,
        categoryId: digitalCategory.id,
      },
    }),
    prisma.product.create({
      data: {
        title: '复古沙发',
        description: '舒适的布艺沙发，适合拍照和休息',
        price: 30,
        deposit: 500,
        images: ['https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=400'],
        status: 'available',
        userId: users[2].id,
        categoryId: furnitureCategory.id,
      },
    }),
  ]);
  console.log(`已创建 ${products.length} 个商品`);

  // 4. 创建评论样例
  const reviews = await Promise.all([
    prisma.review.create({
      data: {
        productId: products[0].id,
        userId: users[1].id,
        rating: 5,
        content: '相机很新，配件齐全，老板人也很好，推荐！',
        images: ['https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=200'],
      },
    }),
    prisma.review.create({
      data: {
        productId: products[0].id,
        userId: users[2].id,
        rating: 4,
        content: '整体不错，快门手感很好，就是电池续航一般。',
        images: [],
      },
    }),
    prisma.review.create({
      data: {
        productId: products[0].id,
        userId: users[0].id,
        rating: 5,
        content: '非常棒的体验，下次还会租！',
        images: [],
      },
    }),
    prisma.review.create({
      data: {
        productId: products[2].id,
        userId: users[0].id,
        rating: 5,
        content: 'MacBook 性能强劲，做开发完全没问题，散热也不错。',
        images: [],
      },
    }),
    prisma.review.create({
      data: {
        productId: products[2].id,
        userId: users[2].id,
        rating: 3,
        content: '屏幕有轻微划痕，但不影响使用，性价比还行。',
        images: [],
      },
    }),
  ]);
  console.log(`已创建 ${reviews.length} 条评论`);

  console.log('数据库初始化完成！');
  console.log('测试账号: 17602351272 / 123456');
  console.log('测试账号: 13800138000 / 123456');
  console.log('测试账号: 13900139000 / 123456');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
